import { v4 as uuidv4 } from 'uuid'

import { buildArtifactHtml } from '@/lib/output-html'
import { buildTaskExecutionPlan } from '@/lib/task-output'
import { buildTaskChannelingPlan } from '@/lib/server/task-channeling'
import { executeAutonomousTask } from '@/lib/server/autonomous-task'
import { inferPipeline, getServerDeliverableSpec } from '@/lib/server/ai'
import { normalizeProviderSettings, resolveFallbackRuntime, resolveTaskRuntime, shouldRunCompareMode } from '@/lib/provider-settings'
import { sanitizePromptProfile, sanitizePromptValue } from '@/lib/server/prompt-safety'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import type { AuthContext } from '@/lib/supabase/auth'
import { loadConfigSkillCategories, mergeDbSkillsWithConfig } from '@/lib/server/skills-catalog'

function toStableUuid(value: string) {
  const hex = Buffer.from(value).toString('hex').padEnd(32, '0').slice(0, 32)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

async function getDefaultAgencyId() {
  const supabase = getSupabaseServerClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('agencies')
    .select('id')
    .eq('slug', 'default-agency')
    .maybeSingle()

  if (error) throw error
  return data?.id || null
}

export async function loadTaskExecutionState(taskId: string, auth: AuthContext) {
  const supabase = getSupabaseServerClient()
  const agencyId = await getDefaultAgencyId()
  if (!supabase || !agencyId) return null

  const taskQuery = supabase
    .from('tasks')
    .select('id, owner_user_id')
    .eq('agency_id', agencyId)
    .eq('id', taskId)
    .maybeSingle()

  const { data: task, error: taskError } = await taskQuery
  if (taskError) throw taskError
  if (!task) return null
  if (auth.role !== 'super_admin' && task.owner_user_id && task.owner_user_id !== auth.userId) {
    return null
  }

  const [{ data: workflow, error: workflowError }, { data: runs, error: runsError }] = await Promise.all([
    supabase
      .from('workflow_instances')
      .select('*')
      .eq('agency_id', agencyId)
      .eq('task_id', taskId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('task_runs')
      .select('*')
      .eq('agency_id', agencyId)
      .eq('task_id', taskId)
      .order('created_at', { ascending: false }),
  ])

  if (workflowError) throw workflowError
  if (runsError) throw runsError

  return {
    workflow,
    runs: runs || [],
  }
}

export async function upsertWorkflowExecutionState(input: {
  taskId: string
  pipelineId?: string | null
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled'
  currentPhase?: string | null
  progress: number
  context?: Record<string, any>
}) {
  const supabase = getSupabaseServerClient()
  const agencyId = await getDefaultAgencyId()
  if (!supabase || !agencyId) return null

  const id = toStableUuid(`workflow:${input.taskId}`)
  const { data, error } = await supabase
    .from('workflow_instances')
    .upsert(
      {
        id,
        agency_id: agencyId,
        pipeline_id: input.pipelineId || null,
        task_id: input.taskId,
        status: input.status,
        current_phase: input.currentPhase || null,
        progress: input.progress,
        context: input.context || {},
      },
      { onConflict: 'id' }
    )
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function insertTaskRun(input: {
  taskId: string
  agentId?: string | null
  stage: string
  status: 'queued' | 'in_progress' | 'completed' | 'failed' | 'blocked' | 'cancelled'
  inputPayload?: Record<string, any>
  outputPayload?: Record<string, any>
  errorMessage?: string | null
  startedAt?: string | null
  completedAt?: string | null
}) {
  const supabase = getSupabaseServerClient()
  const agencyId = await getDefaultAgencyId()
  if (!supabase || !agencyId) return null

  const { data, error } = await supabase
    .from('task_runs')
    .insert({
      agency_id: agencyId,
      task_id: input.taskId,
      agent_id: input.agentId || null,
      stage: input.stage,
      status: input.status,
      input_payload: input.inputPayload || {},
      output_payload: input.outputPayload || {},
      error_message: input.errorMessage || null,
      started_at: input.startedAt || null,
      completed_at: input.completedAt || null,
    })
    .select('*')
    .single()

  if (error) throw error
  return data
}

async function loadPipelines(agencyId: string) {
  const supabase = getSupabaseServerClient()
  if (!supabase) return []

  const { data, error } = await supabase
    .from('pipelines')
    .select('definition')
    .eq('agency_id', agencyId)
    .order('name', { ascending: true })

  if (error) throw error
  return (data || []).map((row: any) => row.definition || {}).filter(Boolean)
}

async function loadSkills(agencyId: string) {
  const supabase = getSupabaseServerClient()
  if (!supabase) return loadConfigSkillCategories()

  const { data, error } = await supabase
    .from('skills')
    .select('*')
    .eq('agency_id', agencyId)
    .order('category', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw error
  return mergeDbSkillsWithConfig(data || [])
}

function buildClientContext(client: any, knowledgeAssets: any[]) {
  if (!client) return ''

  return [
    `Name: ${sanitizePromptValue(client.name)}`,
    `Industry: ${sanitizePromptValue(client.industry || '')}`,
    client.brief?.description ? `Overview: ${sanitizePromptValue(client.brief.description)}` : '',
    client.brief?.missionStatement ? `Mission: ${sanitizePromptValue(client.brief.missionStatement)}` : '',
    client.brief?.brandPromise ? `Brand promise: ${sanitizePromptValue(client.brief.brandPromise)}` : '',
    client.brief?.targetAudiences ? `Audience: ${sanitizePromptValue(client.brief.targetAudiences)}` : '',
    client.brief?.productsAndServices ? `Products: ${sanitizePromptValue(client.brief.productsAndServices)}` : '',
    client.brief?.usp ? `USP: ${sanitizePromptValue(client.brief.usp)}` : '',
    client.brief?.keyMessages ? `Key messages: ${sanitizePromptValue(client.brief.keyMessages)}` : '',
    client.brief?.toneOfVoice ? `Tone of voice: ${sanitizePromptValue(client.brief.toneOfVoice)}` : '',
    client.brief?.strategicPriorities ? `Strategic priorities: ${sanitizePromptValue(client.brief.strategicPriorities)}` : '',
    knowledgeAssets.length
      ? `Knowledge assets:\n${knowledgeAssets
          .slice(0, 8)
          .map(
            (asset) =>
              `- ${sanitizePromptValue(asset.title)} (${sanitizePromptValue(asset.asset_type)})` +
              `${asset.summary ? `: ${sanitizePromptValue(asset.summary)}` : ''}` +
              `${asset.extracted_text ? ` | Insights: ${sanitizePromptValue(asset.extracted_text)}` : ''}`
          )
          .join('\n')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n')
}

function buildClientProfile(client: any) {
  if (!client) return undefined

  return sanitizePromptProfile({
    brand_name: client.name,
    niche: client.industry,
    industry: client.industry,
    target_audience: client.brief?.targetAudiences,
    audience_demographics: client.brief?.targetAudiences,
    audience_psychographics: client.brief?.targetAudiences,
    product_service: client.brief?.productsAndServices,
    business_objectives: client.brief?.strategicPriorities,
    tone: client.brief?.toneOfVoice,
    brand_voice: client.brief?.toneOfVoice,
    campaign_theme: client.brief?.keyMessages,
    visual_direction: client.brief?.brandIdentityNotes,
    asset_specs: client.brief?.brandIdentityNotes,
    brand_colors: Array.isArray(client.brief?.brandKit?.colors) ? client.brief.brandKit.colors.join(', ') : '',
    brand_fonts: Array.isArray(client.brief?.brandKit?.fonts) ? client.brief.brandKit.fonts.join(', ') : '',
    visual_keywords: client.brief?.brandKit?.visualKeywords,
    look_and_feel: client.brief?.brandKit?.lookAndFeel,
    photo_style: client.brief?.brandKit?.photoStyle,
    composition_rules: client.brief?.brandKit?.compositionRules,
    negative_rules: client.brief?.brandKit?.negativeRules,
    logo_assets: Array.isArray(client.brief?.brandKit?.logos) ? client.brief.brandKit.logos.map((asset: any) => asset.url).join(', ') : '',
    logo_asset_paths: Array.isArray(client.brief?.brandKit?.logos) ? client.brief.brandKit.logos.map((asset: any) => asset.path || asset.url).join(', ') : '',
    template_assets: Array.isArray(client.brief?.brandKit?.templates) ? client.brief.brandKit.templates.map((asset: any) => asset.url).join(', ') : '',
    template_asset_paths: Array.isArray(client.brief?.brandKit?.templates) ? client.brief.brandKit.templates.map((asset: any) => asset.path || asset.url).join(', ') : '',
    reference_assets: Array.isArray(client.brief?.brandKit?.referenceImages) ? client.brief.brandKit.referenceImages.map((asset: any) => asset.url).join(', ') : '',
    reference_asset_paths: Array.isArray(client.brief?.brandKit?.referenceImages) ? client.brief.brandKit.referenceImages.map((asset: any) => asset.path || asset.url).join(', ') : '',
    competitive_landscape: client.brief?.competitiveLandscape,
    channel_strategy: client.brief?.strategicPriorities,
    pain_points: client.brief?.objectionHandling,
    key_dates: client.brief?.operationalDetails,
    posting_frequency: '3-4 posts per week',
    platforms: 'Instagram, LinkedIn',
    content_goal: 'Awareness and lead generation',
    campaign_duration: '30 days',
  })
}

export async function runTaskExecution(
  taskId: string,
  auth: AuthContext,
  action: 'retry' | 'resume' = 'retry',
  options?: { comment?: string; runtimeMode?: 'fast' | 'thinking' | 'compare' }
) {
  const supabase = getSupabaseServerClient()
  const agencyId = await getDefaultAgencyId()
  if (!supabase || !agencyId) throw new Error('Execution service unavailable.')

  const [{ data: task, error: taskError }, { data: agents, error: agentsError }, { data: agency, error: agencyError }, pipelines, skillCategories] =
    await Promise.all([
      supabase.from('tasks').select('*').eq('agency_id', agencyId).eq('id', taskId).maybeSingle(),
      supabase.from('agents').select('*').eq('agency_id', agencyId).order('name', { ascending: true }),
      supabase.from('agencies').select('settings').eq('id', agencyId).single(),
      loadPipelines(agencyId),
      loadSkills(agencyId),
    ])

  if (taskError) throw taskError
  if (agentsError) throw agentsError
  if (agencyError) throw agencyError
  if (!task) throw new Error('Task not found.')
  if (auth.role !== 'super_admin' && task.owner_user_id && task.owner_user_id !== auth.userId) {
    throw new Error('Unauthorized')
  }

  const [{ data: client }, { data: knowledgeAssets }, { data: outputs }] = await Promise.all([
    task.client_id
      ? supabase.from('clients').select('*').eq('agency_id', agencyId).eq('id', task.client_id).maybeSingle()
      : Promise.resolve({ data: null } as any),
    task.client_id
      ? supabase.from('knowledge_assets').select('*').eq('agency_id', agencyId).eq('client_id', task.client_id)
      : Promise.resolve({ data: [] } as any),
    supabase.from('outputs').select('*').eq('agency_id', agencyId).eq('task_id', taskId).order('updated_at', { ascending: false }),
  ])

  const clientContext = buildClientContext(client, knowledgeAssets || [])
  const clientProfile = buildClientProfile(client)
  const fallbackPipelineId =
    task.pipeline_id ||
    inferPipeline(task.summary || task.title, pipelines)?.id ||
    getServerDeliverableSpec(task.deliverable_type).pipelineId ||
    null
  const pipeline = fallbackPipelineId ? pipelines.find((entry: any) => entry.id === fallbackPipelineId) || null : null
  const executionPlan = buildTaskExecutionPlan({
    deliverableType: task.deliverable_type,
    request: task.summary || task.title,
    routedAgentId: task.lead_agent_id || undefined,
    pipelinePhases: pipeline?.phases?.map((phase: any) => phase.name),
  })
  const runtimeAgents = (agents || []).map((agent: any) => ({
    id: agent.id,
    name: agent.name,
    role: agent.role,
    specialty: agent.specialty,
    skills: Array.isArray(agent.skills) ? agent.skills : [],
    tools: Array.isArray(agent.tools) ? agent.tools : [],
    provider: agent.provider,
    model: agent.model,
    systemPrompt: agent.system_prompt || '',
  }))
  const channelingPlan = buildTaskChannelingPlan({
    request: task.summary || task.title,
    deliverableType: task.deliverable_type,
    routedAgentId: executionPlan.leadAgentId || task.lead_agent_id || undefined,
    agents: runtimeAgents,
    skillCategories,
    pipeline,
  })

  const providerSettings = normalizeProviderSettings({
    ...(auth.providerSettings || agency?.settings?.providerSettings || {}),
    routing: {
      ...(auth.providerSettings?.routing || agency?.settings?.providerSettings?.routing || {}),
      ...(options?.runtimeMode ? { runtimeMode: options.runtimeMode } : {}),
    },
  })
  const effectiveRequest = options?.comment?.trim()
    ? `${task.summary || task.title}\n\nReviewer requested these changes:\n${options.comment.trim()}`
    : task.summary || task.title
  const selectedRuntime = resolveTaskRuntime({
    settings: providerSettings,
    deliverableType: task.deliverable_type,
    requestedProvider: task.lead_agent_id ? undefined : 'ollama',
  })

  await upsertWorkflowExecutionState({
    taskId,
    pipelineId: pipeline?.id || task.pipeline_id,
    status: 'active',
    currentPhase: pipeline?.phases?.[0]?.name || 'Execution',
    progress: 8,
    context: { action, startedBy: auth.userId, startedAt: new Date().toISOString(), reviewComment: options?.comment || null, runtimeMode: providerSettings.routing.runtimeMode },
  })

  await insertTaskRun({
    taskId,
    agentId: channelingPlan.leadAgentId || task.lead_agent_id || null,
    stage: 'task-execution',
    status: 'in_progress',
    inputPayload: {
      action,
      deliverableType: task.deliverable_type,
      summary: task.summary || task.title,
      reviewComment: options?.comment || null,
      runtimeMode: providerSettings.routing.runtimeMode,
    },
    startedAt: new Date().toISOString(),
  })

  try {
    let result = await executeAutonomousTask({
      request: effectiveRequest,
      provider: selectedRuntime.provider,
      model: selectedRuntime.model,
      temperature: 0.7,
      maxTokens: 4096,
      ollamaBaseUrl: providerSettings.ollama.baseUrl,
      ollamaContextWindow: providerSettings.ollama.contextWindow,
      geminiApiKey: providerSettings.gemini.apiKey,
      providerSettings,
      deliverableType: task.deliverable_type,
      executionPrompt: `Lead specialist: ${task.lead_agent_id || 'assigned specialist'}\nClient: ${client?.name || 'not specified'}\nDeliverable type: ${task.deliverable_type}\n${clientContext ? `Client context:\n${clientContext}\n` : ''}${options?.comment ? `Revision note:\n${options.comment}\n` : ''}Deliver the actual output now.`,
      clientContext,
      clientProfile,
      agents: runtimeAgents,
      leadAgentId: channelingPlan.leadAgentId || task.lead_agent_id || 'iris',
      collaboratorAgentIds: channelingPlan.collaboratorAgentIds,
      selectedSkillsByAgent: channelingPlan.selectedSkillsByAgent,
      qualityChecklist: executionPlan.qualityChecklist,
      pipeline,
      skillCategories,
      hooks: {
        onPhaseStart: async ({ phase, progress }) => {
          await upsertWorkflowExecutionState({
            taskId,
            pipelineId: pipeline?.id || task.pipeline_id,
            status: 'active',
            currentPhase: phase.name,
            progress,
            context: { action, activePhaseId: phase.id },
          })
        },
        onActivityStart: async ({ phase, activity, agent, runtime, progress }) => {
          await insertTaskRun({
            taskId,
            agentId: agent.id,
            stage: `${phase.id}:${activity.id}`,
            status: 'in_progress',
            inputPayload: { phaseId: phase.id, activityId: activity.id },
            outputPayload: { provider: runtime.provider, model: runtime.model, started: true },
            startedAt: new Date().toISOString(),
          })
          await upsertWorkflowExecutionState({
            taskId,
            pipelineId: pipeline?.id || task.pipeline_id,
            status: 'active',
            currentPhase: phase.name,
            progress,
            context: {
              action,
              activePhaseId: phase.id,
              activeActivityId: activity.id,
              activeActivityName: activity.name,
              activeAgentId: agent.id,
              activeAgentName: agent.name,
            },
          })
        },
        onActivityComplete: async ({ phase, activity, agent, runtime, summary, outputIds, progress }) => {
          await insertTaskRun({
            taskId,
            agentId: agent.id,
            stage: `${phase.id}:${activity.id}`,
            status: 'completed',
            inputPayload: { phaseId: phase.id, activityId: activity.id, outputIds },
            outputPayload: { summary, provider: runtime.provider, model: runtime.model },
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
          })
          await upsertWorkflowExecutionState({
            taskId,
            pipelineId: pipeline?.id || task.pipeline_id,
            status: 'active',
            currentPhase: phase.name,
            progress,
            context: { action, activePhaseId: phase.id, lastActivityId: activity.id },
          })
        },
      },
    })
    let compareSummary: any = undefined
    if (shouldRunCompareMode(providerSettings, task.deliverable_type)) {
      const alternateRuntime = resolveFallbackRuntime({
        settings: providerSettings,
        currentProvider: selectedRuntime.provider,
      })

      if (alternateRuntime) {
        const alternate = await executeAutonomousTask({
          request: effectiveRequest,
          provider: alternateRuntime.provider,
          model: alternateRuntime.model,
          temperature: 0.7,
          maxTokens: 4096,
          ollamaBaseUrl: providerSettings.ollama.baseUrl,
          ollamaContextWindow: providerSettings.ollama.contextWindow,
          geminiApiKey: providerSettings.gemini.apiKey,
          providerSettings,
          deliverableType: task.deliverable_type,
          executionPrompt: `Lead specialist: ${task.lead_agent_id || 'assigned specialist'}\nClient: ${client?.name || 'not specified'}\nDeliverable type: ${task.deliverable_type}\n${clientContext ? `Client context:\n${clientContext}\n` : ''}${options?.comment ? `Revision note:\n${options.comment}\n` : ''}Deliver the actual output now.`,
          clientContext,
          clientProfile,
          agents: runtimeAgents,
          leadAgentId: channelingPlan.leadAgentId || task.lead_agent_id || 'iris',
          collaboratorAgentIds: channelingPlan.collaboratorAgentIds,
          selectedSkillsByAgent: channelingPlan.selectedSkillsByAgent,
          qualityChecklist: executionPlan.qualityChecklist,
          pipeline,
          skillCategories,
        })

        const primaryScore = result.qualityResult?.score ?? 0
        const alternateScore = alternate.qualityResult?.score ?? 0
        const pickAlternate = alternateScore > primaryScore
        compareSummary = {
          enabled: true,
          selectedProvider: pickAlternate ? alternateRuntime.provider : selectedRuntime.provider,
          selectedModel: pickAlternate ? alternateRuntime.model : selectedRuntime.model,
          alternateProvider: pickAlternate ? selectedRuntime.provider : alternateRuntime.provider,
          alternateModel: pickAlternate ? selectedRuntime.model : alternateRuntime.model,
          selectedScore: pickAlternate ? alternateScore : primaryScore,
          alternateScore: pickAlternate ? primaryScore : alternateScore,
        }
        if (pickAlternate) {
          result = alternate
        }
      }
    }

    const artifactId = outputs?.[0]?.id || `artifact-${uuidv4()}`
    const now = new Date().toISOString()
    const renderedHtml = result.renderedHtml || buildArtifactHtml(result.response)

    await supabase.from('outputs').upsert(
      {
        id: artifactId,
        agency_id: agencyId,
        task_id: taskId,
        client_id: task.client_id || null,
        agent_id: channelingPlan.leadAgentId || task.lead_agent_id || null,
        title: task.title,
        deliverable_type: task.deliverable_type,
        status: result.qualityResult?.ok ? 'draft' : 'draft',
        owner_user_id: task.owner_user_id || null,
        format: result.creative?.assetUrl || result.creative?.assetPath ? 'image' : 'html',
        content: result.response,
        rendered_html: renderedHtml,
        public_url: result.creative?.assetUrl || null,
        storage_path: result.creative?.assetPath || null,
        creative: result.creative || null,
        source_prompt: task.summary || task.title,
        notes: result.qualityResult?.ok ? 'Generated via task execution runner.' : `Quality issues: ${(result.qualityResult?.issues || []).join(' | ')}`,
        execution_steps: result.executionSteps,
        created_at: outputs?.[0]?.created_at || now,
        updated_at: now,
      },
      { onConflict: 'id' }
    )

    await supabase
      .from('tasks')
      .update({
        status: result.qualityResult?.ok ? 'review' : 'blocked',
        progress: result.qualityResult?.ok ? 80 : 20,
        execution_plan: {
          ...(task.execution_plan || {}),
          assignedAgentIds: channelingPlan.assignedAgentIds,
          collaboratorAgentIds: channelingPlan.collaboratorAgentIds,
          skillAssignments: channelingPlan.selectedSkillsByAgent,
          orchestrationTrace: channelingPlan.orchestrationTrace,
          qualityChecklist: executionPlan.qualityChecklist,
          reviewComments: Array.isArray(task.execution_plan?.reviewComments)
            ? task.execution_plan.reviewComments.map((entry: any) =>
                entry.status === 'open' ? { ...entry, status: 'addressed' } : entry
              )
            : [],
          reviewStatus: result.qualityResult?.ok ? 'pending' : 'changes_requested',
          runtimeMode: providerSettings.routing.runtimeMode,
          compareSummary: compareSummary || null,
          handoffNotes: result.qualityResult?.ok
            ? executionPlan.handoffNotes
            : `Quality gate failed: ${(result.qualityResult?.issues || []).join(' | ')}`,
          lastRunAt: now,
        },
      })
      .eq('agency_id', agencyId)
      .eq('id', taskId)

    await insertTaskRun({
      taskId,
      agentId: channelingPlan.leadAgentId || task.lead_agent_id || null,
      stage: 'final-assembly',
      status: result.qualityResult?.ok ? 'completed' : 'blocked',
      outputPayload: {
        artifactId,
        qualityScore: result.qualityResult?.score,
        qualityIssues: result.qualityResult?.issues || [],
        compareSummary: compareSummary || null,
      },
      startedAt: now,
      completedAt: now,
    })

    await upsertWorkflowExecutionState({
      taskId,
      pipelineId: pipeline?.id || task.pipeline_id,
      status: result.qualityResult?.ok ? 'paused' : 'paused',
      currentPhase: result.qualityResult?.ok ? 'Review' : (pipeline?.phases?.at(-1)?.name || 'Quality Control'),
      progress: result.qualityResult?.ok ? 88 : 82,
      context: {
        action,
        quality: result.qualityResult,
        artifactId,
      },
    })

    return {
      ok: true,
      artifactId,
      response: result.response,
      quality: result.qualityResult,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Task execution failed.'
    const now = new Date().toISOString()

    await insertTaskRun({
      taskId,
      agentId: task.lead_agent_id || null,
      stage: 'task-execution',
      status: 'failed',
      errorMessage: message,
      startedAt: now,
      completedAt: now,
    })
    await upsertWorkflowExecutionState({
      taskId,
      pipelineId: pipeline?.id || task.pipeline_id,
      status: 'paused',
      currentPhase: pipeline?.phases?.[0]?.name || 'Execution',
      progress: 10,
      context: { action, error: message, failedAt: now },
    })
    await supabase
      .from('tasks')
      .update({ status: 'blocked', progress: 0 })
      .eq('agency_id', agencyId)
      .eq('id', taskId)

    throw error
  }
}
