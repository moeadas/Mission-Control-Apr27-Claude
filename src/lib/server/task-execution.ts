import { v4 as uuidv4 } from 'uuid'

import { buildArtifactHtml } from '@/lib/output-html'
import { buildTaskExecutionPlan } from '@/lib/task-output'
import { buildTaskChannelingPlan } from '@/lib/server/task-channeling'
import { executeAutonomousTask } from '@/lib/server/autonomous-task'
import { getFriendlyProviderError, inferPipeline, getServerDeliverableSpec } from '@/lib/server/ai'
import { normalizeProviderSettings, resolveFallbackRuntime, resolveTaskRuntime, shouldRunCompareMode } from '@/lib/provider-settings'
import { sanitizePromptProfile, sanitizePromptValue } from '@/lib/server/prompt-safety'
import { getDb } from '@/lib/db/client'
import type { AuthContext } from '@/lib/auth/server'
import { loadConfigSkillCategories, mergeDbSkillsWithConfig } from '@/lib/server/skills-catalog'
import {
  buildExecutionPlan as buildProgressPlan,
  startActivity,
  completeActivity,
  failActivity,
  computeProgress,
  phaseLabel,
  type ExecutionPlan as ProgressExecutionPlan,
} from '@/lib/server/task-progress'
import { emitTaskEvent, emitActivityMessage, emitQualityIssues } from '@/lib/server/task-events'

function toStableUuid(value: string) {
  const hex = Buffer.from(value).toString('hex').padEnd(32, '0').slice(0, 32)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

async function getDefaultAgencyId(): Promise<string | null> {
  try {
    const db = getDb()
    const rows = await db`SELECT id FROM agencies WHERE slug = 'default-agency' LIMIT 1`
    return rows[0]?.id ?? null
  } catch {
    return null
  }
}

/**
 * Batch R — self-bootstrap missing task rows.
 *
 * The async execution path (queueMissionExecution → /api/tasks/:id/execution)
 * fires before /api/state PUT has persisted the mission, leaving the `tasks`
 * row absent. Without this helper, `runTaskExecution` threw "Task not found"
 * and the client fell through to the legacy 290s-timeout chat path.
 *
 * This upsert is idempotent (ON CONFLICT DO NOTHING) and only writes the
 * minimum needed for downstream FKs (task_runs, task_events, workflow_instances,
 * outputs). All other fields are filled in by the runner.
 */
export interface TaskBootstrap {
  prompt?: string
  title?: string
  deliverableType?: string | null
  leadAgentId?: string | null
  collaboratorAgentIds?: string[] | null
  pipelineId?: string | null
  clientId?: string | null
}

/**
 * Resolve a template-id agent reference (e.g. "echo") to the actual row id in
 * this tenant's agents table (e.g. "echo-abc12345"). Returns null if no match.
 */
async function resolveAgentRowId(
  agencyId: string,
  templateOrRowId: string | null | undefined
): Promise<string | null> {
  if (!templateOrRowId) return null
  const db = getDb()
  // Try exact row-id match (covers both legacy literal IDs and pre-resolved IDs).
  const direct = await db`
    SELECT id FROM agents WHERE agency_id = ${agencyId}::uuid AND id = ${templateOrRowId} LIMIT 1
  `
  if (direct[0]) return direct[0].id as string
  // Try metadata.templateId match (canonical for new clones).
  const byTemplate = await db`
    SELECT id FROM agents
    WHERE agency_id = ${agencyId}::uuid
      AND metadata->>'templateId' = ${templateOrRowId}
    LIMIT 1
  `
  if (byTemplate[0]) return byTemplate[0].id as string
  // Try id-prefix match (clones without metadata).
  const byPrefix = await db`
    SELECT id FROM agents
    WHERE agency_id = ${agencyId}::uuid
      AND id LIKE ${templateOrRowId + '-%'}
    LIMIT 1
  `
  if (byPrefix[0]) return byPrefix[0].id as string
  return null
}

export async function ensureTaskExists(
  taskId: string,
  auth: AuthContext,
  bootstrap?: TaskBootstrap
): Promise<boolean> {
  const agencyId = auth.tenantId || (await getDefaultAgencyId())
  if (!agencyId) return false

  const db = getDb()
  const existing = await db`SELECT id FROM tasks WHERE id = ${taskId} LIMIT 1`
  if (existing[0]) return true

  const title = (bootstrap?.title || bootstrap?.prompt || 'New chat task').slice(0, 280)
  const summary = (bootstrap?.prompt || bootstrap?.title || '').slice(0, 4000)
  const deliverableType = bootstrap?.deliverableType || 'general-task'

  // Resolve FK targets to existing rows, null-out if they don't exist.
  // Without this, an FK violation aborts the INSERT and the task stays stuck.
  const resolvedLeadAgentId = await resolveAgentRowId(agencyId, bootstrap?.leadAgentId)

  let resolvedPipelineId: string | null = null
  if (bootstrap?.pipelineId) {
    const pipeline = await db`SELECT id FROM pipelines WHERE id = ${bootstrap.pipelineId} LIMIT 1`
    resolvedPipelineId = pipeline[0]?.id || null
  }

  let resolvedClientId: string | null = null
  if (bootstrap?.clientId) {
    const client = await db`
      SELECT id FROM clients WHERE agency_id = ${agencyId}::uuid AND id = ${bootstrap.clientId} LIMIT 1
    `
    resolvedClientId = client[0]?.id || null
  }

  // Resolve collaborator agent template-IDs → row IDs for metadata.
  const collaboratorTemplateIds = bootstrap?.collaboratorAgentIds || []
  const resolvedCollaboratorIds: string[] = []
  for (const tid of collaboratorTemplateIds) {
    const rowId = await resolveAgentRowId(agencyId, tid)
    if (rowId) resolvedCollaboratorIds.push(rowId)
  }

  const metadata = {
    bootstrappedAt: new Date().toISOString(),
    bootstrappedBy: auth.userId,
    collaboratorAgentIds: resolvedCollaboratorIds,
    // Keep the original template-IDs too — useful for debugging / future routing.
    collaboratorTemplateIds,
    leadAgentTemplate: bootstrap?.leadAgentId || null,
  }

  try {
    await db`
      INSERT INTO tasks (
        id, agency_id, title, summary, deliverable_type, status, priority,
        owner_user_id, lead_agent_id, pipeline_id, client_id, progress,
        execution_plan, metadata
      ) VALUES (
        ${taskId}, ${agencyId}, ${title}, ${summary}, ${deliverableType},
        ${'in_progress'}, ${'normal'}, ${auth.userId}::uuid,
        ${resolvedLeadAgentId}, ${resolvedPipelineId}, ${resolvedClientId}, ${0},
        ${db.json({})}, ${db.json(metadata)}
      )
      ON CONFLICT (id) DO NOTHING
    `
    return true
  } catch (error) {
    console.error('[ensureTaskExists] failed:', error)
    return false
  }
}

export async function loadTaskExecutionState(taskId: string, auth: AuthContext) {
  const agencyId = await getDefaultAgencyId()
  if (!agencyId) return null

  const db = getDb()
  const taskRows = await db`
    SELECT id, owner_user_id FROM tasks
    WHERE agency_id = ${agencyId} AND id = ${taskId}
    LIMIT 1
  `
  const task = taskRows[0]
  if (!task) return null
  if (auth.role !== 'super_admin' && task.owner_user_id && task.owner_user_id !== auth.userId) {
    return null
  }

  const [workflowRows, runs] = await Promise.all([
    db`
      SELECT * FROM workflow_instances
      WHERE agency_id = ${agencyId} AND task_id = ${taskId}
      ORDER BY updated_at DESC
      LIMIT 1
    `,
    db`
      SELECT * FROM task_runs
      WHERE agency_id = ${agencyId} AND task_id = ${taskId}
      ORDER BY created_at DESC
    `,
  ])

  return {
    workflow: workflowRows[0] || null,
    runs: runs || [],
  }
}

export async function upsertWorkflowExecutionState(input: {
  taskId: string
  pipelineId?: string | null
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled' | 'failed'
  currentPhase?: string | null
  progress: number
  context?: Record<string, any>
}) {
  const agencyId = await getDefaultAgencyId()
  if (!agencyId) return null

  const id = toStableUuid(`workflow:${input.taskId}`)
  const db = getDb()
  const rows = await db`
    INSERT INTO workflow_instances (id, agency_id, pipeline_id, task_id, status, current_phase, progress, context)
    VALUES (
      ${id},
      ${agencyId},
      ${input.pipelineId || null},
      ${input.taskId},
      ${input.status},
      ${input.currentPhase || null},
      ${input.progress},
      ${db.json(input.context || {})}
    )
    ON CONFLICT (id) DO UPDATE SET
      status = EXCLUDED.status,
      current_phase = EXCLUDED.current_phase,
      progress = EXCLUDED.progress,
      context = EXCLUDED.context,
      updated_at = NOW()
    RETURNING *
  `
  return rows[0] || null
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
  const agencyId = await getDefaultAgencyId()
  if (!agencyId) return null

  const db = getDb()
  const rows = await db`
    INSERT INTO task_runs (agency_id, task_id, agent_id, stage, status, input_payload, output_payload, error_message, started_at, completed_at)
    VALUES (
      ${agencyId},
      ${input.taskId},
      ${input.agentId || null},
      ${input.stage},
      ${input.status},
      ${db.json(input.inputPayload || {})},
      ${db.json(input.outputPayload || {})},
      ${input.errorMessage || null},
      ${input.startedAt || null},
      ${input.completedAt || null}
    )
    RETURNING *
  `
  return rows[0] || null
}

async function loadPipelines(agencyId: string) {
  try {
    const db = getDb()
    const rows = await db`
      SELECT definition FROM pipelines
      WHERE agency_id = ${agencyId}
      ORDER BY name ASC
    `
    return rows.map((row: any) => row.definition || {}).filter(Boolean)
  } catch {
    return []
  }
}

async function loadSkills(agencyId: string) {
  try {
    const db = getDb()
    const rows = await db`
      SELECT * FROM skills
      WHERE agency_id = ${agencyId}
      ORDER BY category ASC, name ASC
    `
    if (rows.length) return mergeDbSkillsWithConfig(rows)
  } catch {
    // fall through
  }
  return loadConfigSkillCategories()
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

function sanitizeExecutionRequestText(value: string) {
  return value
    .replace(/^- Timeframe:\s*content calendar\s*$/gim, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Batch U: human-readable verb describing what an agent is doing right now.
 * Used to narrate the live activity message ("Echo is drafting copy options…").
 * The verb depends on the agent's specialty + the deliverable type.
 */
function describeAgentVerb(agent: { id?: string | null; role?: string | null }, deliverableType: string | null): string {
  const id = (agent.id || '').toLowerCase()
  // Per-agent specialty narration. Falls back to a generic "working on it"
  // when the agent id is unfamiliar (custom user-created agents).
  if (id.startsWith('atlas')) return 'pulling research and brand context'
  if (id.startsWith('maya')) return 'sharpening the strategic angle'
  if (id.startsWith('echo')) {
    if (deliverableType === 'campaign-copy' || deliverableType === 'short-form-copy') {
      return 'drafting copy options and hooks'
    }
    if (deliverableType === 'email-campaign') return 'shaping subject lines and email body'
    return 'writing the content'
  }
  if (id.startsWith('lyra')) return 'preparing visual direction'
  if (id.startsWith('nova')) return 'mapping channel mix and cadence'
  if (id.startsWith('dex')) return 'modelling KPIs and forecasts'
  if (id.startsWith('finn')) return 'developing creative concepts'
  if (id.startsWith('piper')) return 'mapping the timeline and handoffs'
  if (id.startsWith('sage')) return 'framing the client narrative'
  if (id.startsWith('iris')) return 'orchestrating the run'
  // Custom agent — best we can do is use their role if known.
  if (agent.role) return `working on the ${agent.role.toLowerCase()} portion`
  return 'working on it'
}

function describeAgentDeliverable(agent: { id?: string | null }, deliverableType: string | null): string {
  const id = (agent.id || '').toLowerCase()
  if (id.startsWith('atlas')) return 'their research summary'
  if (id.startsWith('maya')) return 'their strategy notes'
  if (id.startsWith('echo')) return 'their copy draft'
  if (id.startsWith('lyra')) return 'their visual brief'
  if (id.startsWith('nova')) return 'their channel plan'
  if (id.startsWith('dex')) return 'their KPI model'
  if (id.startsWith('finn')) return 'their creative concept'
  if (id.startsWith('piper')) return 'their timeline'
  if (id.startsWith('sage')) return 'their client narrative'
  if (id.startsWith('iris')) return 'the orchestration result'
  return 'their contribution'
}

export async function runTaskExecution(
  taskId: string,
  auth: AuthContext,
  action: 'retry' | 'resume' = 'retry',
  options?: {
    comment?: string
    runtimeMode?: 'fast' | 'thinking' | 'compare'
    bootstrap?: TaskBootstrap
  }
) {
  const agencyId = await getDefaultAgencyId()
  if (!agencyId) throw new Error('Execution service unavailable.')

  // Batch R: bootstrap a stub row if the task hasn't been persisted yet.
  // No-op when the row already exists (ON CONFLICT DO NOTHING inside).
  if (options?.bootstrap) {
    await ensureTaskExists(taskId, auth, options.bootstrap)
  }

  const db = getDb()

  const [taskRows, agentRows, agencyRows, pipelines, skillCategories] = await Promise.all([
    db`SELECT * FROM tasks WHERE agency_id = ${agencyId} AND id = ${taskId} LIMIT 1`,
    db`SELECT * FROM agents WHERE agency_id = ${agencyId} ORDER BY name ASC`,
    db`SELECT settings FROM agencies WHERE id = ${agencyId} LIMIT 1`,
    loadPipelines(agencyId),
    loadSkills(agencyId),
  ])

  const task = taskRows[0]
  const agents = agentRows
  const agency = agencyRows[0]

  if (!task) throw new Error('Task not found.')
  if (auth.role !== 'super_admin' && task.owner_user_id && task.owner_user_id !== auth.userId) {
    throw new Error('Unauthorized')
  }

  const [clientRows, knowledgeRows, outputRows] = await Promise.all([
    task.client_id
      ? db`SELECT * FROM clients WHERE agency_id = ${agencyId} AND id = ${task.client_id} LIMIT 1`
      : Promise.resolve([]),
    task.client_id
      ? db`SELECT * FROM knowledge_assets WHERE agency_id = ${agencyId} AND client_id = ${task.client_id}`
      : Promise.resolve([]),
    db`SELECT * FROM outputs WHERE agency_id = ${agencyId} AND task_id = ${taskId} ORDER BY updated_at DESC`,
  ])

  const client = clientRows[0] || null
  const knowledgeAssets = knowledgeRows || []
  const outputs = outputRows || []

  const clientContext = buildClientContext(client, knowledgeAssets)
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
  const effectiveRequest = sanitizeExecutionRequestText(task.summary || task.title)
  const selectedRuntime = resolveTaskRuntime({
    settings: providerSettings,
    deliverableType: task.deliverable_type,
    requestedProvider: task.lead_agent_id ? undefined : 'ollama',
  })

  // Batch U: build the activity-driven progress plan up front. Every progress
  // update from this point on is computed from the plan, not hardcoded.
  const collaboratorNameMap: Record<string, string> = {}
  for (const a of runtimeAgents) collaboratorNameMap[a.id] = a.name
  const progressPlan: ProgressExecutionPlan = buildProgressPlan({
    deliverableType: task.deliverable_type,
    pipelinePhases: pipeline?.phases?.map((p: any) => ({ id: p.id, name: p.name })) || null,
    collaboratorAgentIds: channelingPlan.collaboratorAgentIds,
    leadAgentId: channelingPlan.leadAgentId || task.lead_agent_id || 'iris',
    leadAgentName:
      collaboratorNameMap[channelingPlan.leadAgentId || task.lead_agent_id || ''] ||
      channelingPlan.leadAgentId ||
      task.lead_agent_id ||
      'the lead specialist',
    collaboratorNames: collaboratorNameMap,
  })
  // Start the routing activity immediately.
  const tenantUuid = auth.tenantId || agencyId
  let progress = startActivity(progressPlan, 'routing', 'Iris analysing the request')
  await emitTaskEvent({
    taskId,
    tenantId: tenantUuid,
    type: 'running',
    progress,
    message: 'Routing the request to specialists',
  })

  await upsertWorkflowExecutionState({
    taskId,
    pipelineId: pipeline?.id || task.pipeline_id,
    status: 'active',
    currentPhase: pipeline?.phases?.[0]?.name || phaseLabel('routing'),
    progress,
    context: {
      action,
      startedBy: auth.userId,
      startedAt: new Date().toISOString(),
      reviewComment: options?.comment || null,
      runtimeMode: providerSettings.routing.runtimeMode,
      activityPlan: progressPlan.activities.map((a) => ({
        id: a.id,
        name: a.name,
        phase: a.phase,
        weight: a.weight,
      })),
    },
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

  // Complete routing — the analysis is essentially done by the time we've built
  // the channeling plan + execution plan above.
  progress = completeActivity(progressPlan, 'routing', 'Specialists assigned')

  try {
    let result = await executeAutonomousTask({
      request: effectiveRequest,
      provider: selectedRuntime.provider,
      model: selectedRuntime.model,
      temperature: 0.7,
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
        onPhaseStart: async ({ phase }) => {
          await emitTaskEvent({
            taskId,
            tenantId: tenantUuid,
            type: 'phase_start',
            phase: phase.name,
            progress: computeProgress(progressPlan),
            message: `Phase started: ${phase.name}`,
          })
          await upsertWorkflowExecutionState({
            taskId,
            pipelineId: pipeline?.id || task.pipeline_id,
            status: 'active',
            currentPhase: phase.name,
            progress: computeProgress(progressPlan),
            context: { action, activePhaseId: phase.id },
          })
        },
        onActivityStart: async ({ phase, activity, agent, runtime }) => {
          // Find the matching activity in our progress plan. Pipeline activities
          // use their declared id; no-pipeline collaborator activities use the
          // `collab-<agentId>` id convention we built into buildProgressPlan.
          const planActivityId =
            progressPlan.activities.find((a) => a.id === activity.id)?.id ||
            progressPlan.activities.find((a) => a.agentId === agent.id && a.status === 'pending')?.id ||
            'lead-draft'
          const liveProgress = startActivity(
            progressPlan,
            planActivityId,
            `${agent.name} ${describeAgentVerb(agent, task.deliverable_type)}`
          )
          await insertTaskRun({
            taskId,
            agentId: agent.id,
            stage: `${phase.id}:${activity.id}`,
            status: 'in_progress',
            inputPayload: { phaseId: phase.id, activityId: activity.id },
            outputPayload: { provider: runtime.provider, model: runtime.model, started: true },
            startedAt: new Date().toISOString(),
          })
          await emitTaskEvent({
            taskId,
            tenantId: tenantUuid,
            type: 'activity_start',
            phase: phase.name,
            activity: activity.name,
            agentId: agent.id,
            progress: liveProgress,
            message: `${agent.name}: ${describeAgentVerb(agent, task.deliverable_type)}`,
          })
          await emitActivityMessage(
            taskId,
            tenantUuid,
            `${agent.name} is ${describeAgentVerb(agent, task.deliverable_type)}…`,
            { activityId: planActivityId, phase: phase.name, agentId: agent.id, progress: liveProgress }
          )
          await upsertWorkflowExecutionState({
            taskId,
            pipelineId: pipeline?.id || task.pipeline_id,
            status: 'active',
            currentPhase: phase.name,
            progress: liveProgress,
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
        onActivityComplete: async ({ phase, activity, agent, runtime, summary, outputIds }) => {
          const planActivityId =
            progressPlan.activities.find((a) => a.id === activity.id)?.id ||
            progressPlan.activities.find((a) => a.agentId === agent.id && a.status === 'running')?.id ||
            'lead-draft'
          const liveProgress = completeActivity(progressPlan, planActivityId, `${agent.name} finished`)
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
          await emitTaskEvent({
            taskId,
            tenantId: tenantUuid,
            type: 'activity_complete',
            phase: phase.name,
            activity: activity.name,
            agentId: agent.id,
            progress: liveProgress,
            message: `${agent.name} delivered ${describeAgentDeliverable(agent, task.deliverable_type)}`,
          })
          await upsertWorkflowExecutionState({
            taskId,
            pipelineId: pipeline?.id || task.pipeline_id,
            status: 'active',
            currentPhase: phase.name,
            progress: liveProgress,
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

    await db`
      INSERT INTO outputs (
        id, agency_id, task_id, client_id, agent_id, title, deliverable_type, status,
        owner_user_id, format, content, rendered_html, public_url, storage_path,
        creative, exports, metadata, source_prompt, notes, execution_steps,
        created_at, updated_at
      ) VALUES (
        ${artifactId},
        ${agencyId},
        ${taskId},
        ${task.client_id || null},
        ${channelingPlan.leadAgentId || task.lead_agent_id || null},
        ${task.title},
        ${task.deliverable_type},
        'draft',
        ${task.owner_user_id || null},
        ${result.creative?.assetUrl || result.creative?.assetPath ? 'image' : 'html'},
        ${result.response},
        ${renderedHtml},
        ${result.creative?.assetUrl || null},
        ${result.creative?.assetPath || null},
        ${db.json((result.creative || {}) as any)},
        ${db.json({})},
        ${db.json({})},
        ${task.summary || task.title},
        ${result.qualityResult?.ok ? 'Generated via task execution runner.' : `Quality issues: ${(result.qualityResult?.issues || []).join(' | ')}`},
        ${db.json((result.executionSteps || []) as any)},
        ${outputs?.[0]?.created_at || now},
        ${now}
      )
      ON CONFLICT (id) DO UPDATE SET
        content = EXCLUDED.content,
        rendered_html = EXCLUDED.rendered_html,
        public_url = EXCLUDED.public_url,
        storage_path = EXCLUDED.storage_path,
        creative = EXCLUDED.creative,
        notes = EXCLUDED.notes,
        execution_steps = EXCLUDED.execution_steps,
        updated_at = EXCLUDED.updated_at
    `

    const executionPlanUpdate = {
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
      reviewStatus: result.qualityResult?.ok ? 'approved' : 'changes_requested',
      runtimeMode: providerSettings.routing.runtimeMode,
      compareSummary: compareSummary || null,
      handoffNotes: result.qualityResult?.ok
        ? executionPlan.handoffNotes
        : `Quality gate failed: ${(result.qualityResult?.issues || []).join(' | ')}`,
      lastRunAt: now,
    }

    // Batch U: complete the remaining activities so progress climbs to 100.
    // Quality issues become non-blocking warnings rather than progress downgrades.
    const qualityIssues = result.qualityResult?.issues || []
    const qualityOk = result.qualityResult?.ok !== false
    if (!qualityOk) {
      // Emit quality issues separately so the UI can surface them as warnings.
      await emitQualityIssues(taskId, tenantUuid, qualityIssues, {
        score: result.qualityResult?.score,
        progress: computeProgress(progressPlan),
      })
    }
    completeActivity(progressPlan, 'quality-check', qualityOk ? 'Quality check passed' : 'Quality check completed with warnings')
    const finalProgress = completeActivity(progressPlan, 'final-assembly', 'Deliverable ready')

    // The artifact was created successfully regardless of validator opinion.
    // Status reflects that — `completed` when validator passes, `completed_with_warnings`
    // when it doesn't. We no longer downgrade to "blocked" for warnings; the user
    // still gets their output and the issues are visible in the UI.
    const finalStatus = qualityOk ? 'completed' : 'completed_with_warnings'

    await db`
      UPDATE tasks
      SET
        status = ${finalStatus},
        progress = ${finalProgress},
        execution_plan = ${db.json(executionPlanUpdate)}
      WHERE agency_id = ${agencyId} AND id = ${taskId}
    `

    await insertTaskRun({
      taskId,
      agentId: channelingPlan.leadAgentId || task.lead_agent_id || null,
      stage: 'final-assembly',
      status: qualityOk ? 'completed' : 'completed',
      outputPayload: {
        artifactId,
        qualityScore: result.qualityResult?.score,
        qualityIssues,
        compareSummary: compareSummary || null,
      },
      startedAt: now,
      completedAt: now,
    })

    await upsertWorkflowExecutionState({
      taskId,
      pipelineId: pipeline?.id || task.pipeline_id,
      status: 'completed',
      currentPhase: 'Completed',
      progress: finalProgress,
      context: {
        action,
        quality: result.qualityResult,
        artifactId,
        warnings: qualityOk ? [] : qualityIssues,
      },
    })

    await emitTaskEvent({
      taskId,
      tenantId: tenantUuid,
      type: 'done',
      progress: finalProgress,
      message: qualityOk
        ? 'Task complete'
        : `Task complete with ${qualityIssues.length} quality warning${qualityIssues.length === 1 ? '' : 's'}`,
      payload: { artifactId, qualityScore: result.qualityResult?.score, qualityIssues },
    })

    return {
      ok: true,
      artifactId,
      response: result.response,
      quality: result.qualityResult,
    }
  } catch (error) {
    const message = getFriendlyProviderError(error)
    const now = new Date().toISOString()
    const errorProgress = failActivity(progressPlan, 'lead-draft', message)

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
      status: 'failed',
      currentPhase: pipeline?.phases?.[0]?.name || 'Execution',
      progress: errorProgress,
      context: { action, error: message, failedAt: now },
    })
    await db`
      UPDATE tasks SET status = 'failed', progress = ${errorProgress}
      WHERE agency_id = ${agencyId} AND id = ${taskId}
    `

    // Batch U: emit an explicit error event so the UI shows the actual reason
    // instead of leaving the user staring at an unexplained stuck progress bar.
    await emitTaskEvent({
      taskId,
      tenantId: tenantUuid,
      type: 'error',
      progress: errorProgress,
      message,
      payload: { phase: 'execution', failedAt: now },
    })

    throw error
  }
}
