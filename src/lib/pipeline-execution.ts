// Pipeline Execution Engine
// Handles task routing, pipeline execution, and agent coordination

import { useAgentsStore } from './agents-store'
import type { Pipeline, Phase, Activity } from '@/lib/stores/pipelines-store'
import { pickAgentForRole } from '@/lib/agent-roles'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser'
import { useSkillsStore } from '@/lib/stores/skills-store'
import type { Client } from '@/lib/client-data'

export interface PipelineInstance {
  id: string
  pipelineId: string
  clientId: string
  language: 'en' | 'ar'
  status: 'pending' | 'running' | 'completed' | 'paused' | 'blocked'
  currentPhase: string
  currentActivity: string | null
  tasks: PipelineTask[]
  outputs: Map<string, PipelineOutput>
  clientData: Record<string, string>
  startedAt: number | null
  completedAt: number | null
}

export interface PipelineTask {
  id: string
  phaseId: string
  activityId: string
  title: string
  status: 'pending' | 'in-progress' | 'completed' | 'blocked'
  assignedAgent: string | null
  output: PipelineOutput | null
  checklist: string[]
  completedChecklist: string[]
  startedAt: number | null
  completedAt: number | null
  error: string | null
}

export interface PipelineOutput {
  taskId: string
  content: string
  format: 'text' | 'json' | 'markdown'
  artifacts: string[] // file references
}

export interface PipelineValidationResult {
  ok: boolean
  missingFields: string[]
  missingTemplateVariables: string[]
  message?: string
}

function mapClientToPipelineData(client?: Client | null): Record<string, string> {
  if (!client) return {}

  return {
    brand_name: client.name || '',
    niche: client.industry || '',
    industry: client.industry || '',
    target_audience: client.targetAudiences || '',
    audience_demographics: client.targetAudiences || '',
    audience_psychographics: client.targetAudiences || '',
    product_service: client.productsAndServices || '',
    business_objectives: client.strategicPriorities || '',
    tone: client.toneOfVoice || '',
    brand_voice: client.toneOfVoice || '',
    campaign_theme: client.keyMessages || '',
    visual_direction: client.brandIdentityNotes || '',
    asset_specs: client.brandIdentityNotes || '',
    competitive_landscape: client.competitiveLandscape || '',
    channel_strategy: client.strategicPriorities || '',
    pain_points: client.objectionHandling || '',
    key_dates: client.operationalDetails || '',
    posting_frequency: '3-4 posts per week',
    platforms: 'Instagram, LinkedIn',
    content_goal: 'Awareness and lead generation',
    campaign_duration: '30 days',
  }
}

function extractTemplateVariables(template: string) {
  return Array.from(template.matchAll(/\{\{([^}]+)\}\}/g)).map((match) => match[1].trim())
}

export function validatePipelineClientData(
  pipeline: Pipeline,
  clientData: Record<string, string>
): PipelineValidationResult {
  const missingFields = (pipeline.clientProfileFields || [])
    .filter((field) => field.required && !String(clientData[field.id] || '').trim())
    .map((field) => field.label)

  const templateVariables = new Set<string>()
  for (const phase of pipeline.phases || []) {
    for (const activity of phase.activities || []) {
      for (const template of [activity.prompts?.en, activity.prompts?.ar, activity.description]) {
        if (!template) continue
        for (const variable of extractTemplateVariables(template)) {
          templateVariables.add(variable)
        }
      }
    }
  }

  const missingTemplateVariables = Array.from(templateVariables).filter(
    (variable) => !String(clientData[variable] || '').trim()
  )

  return {
    ok: missingFields.length === 0 && missingTemplateVariables.length === 0,
    missingFields,
    missingTemplateVariables,
    message:
      missingFields.length || missingTemplateVariables.length
        ? 'Pipeline setup is incomplete. Fill the missing client profile fields before running this pipeline.'
        : undefined,
  }
}

function buildKnowledgeAssetsContext(clientId: string) {
  const client = useAgentsStore.getState().clients.find((entry) => entry.id === clientId)
  const assets = Array.isArray(client?.knowledgeAssets) ? client.knowledgeAssets : []
  if (!assets.length) return ''

  return [
    'Client knowledge assets:',
    ...assets.slice(0, 8).map((asset) =>
      `- ${asset.title} (${asset.type}, ${asset.status})${asset.summary ? `: ${asset.summary}` : ''}${asset.extractedInsights ? ` | Insights: ${asset.extractedInsights}` : ''}`
    ),
  ].join('\n')
}

async function getSkillContextForAgent(agentId: string) {
  const skillsStore = useSkillsStore.getState()
  if (!skillsStore.isLoaded) {
    await skillsStore.loadSkills()
  }

  const agent = useAgentsStore.getState().agents.find((entry) => entry.id === agentId)
  const skillDefinitions = (agent?.skills || [])
    .map((skillId) => skillsStore.getSkill(skillId))
    .filter(Boolean)
    .slice(0, 8)

  if (!skillDefinitions.length) return ''

  return [
    'Assigned specialist skills:',
    ...skillDefinitions.map((skill) =>
      [
        `- ${skill!.name}`,
        skill!.description ? `  Description: ${skill!.description}` : '',
        skill!.prompts?.en?.instructions ? `  Instructions: ${skill!.prompts.en.instructions}` : '',
        skill!.prompts?.en?.output_template ? `  Output template: ${skill!.prompts.en.output_template}` : '',
      ]
        .filter(Boolean)
        .join('\n')
    ),
  ].join('\n')
}

// Build execution context from client data
function buildContext(
  promptTemplate: string,
  clientData: Record<string, string>,
  language: 'en' | 'ar',
  extraContext = ''
): string {
  let context = promptTemplate
  
  // Replace all {{variable}} placeholders
  for (const [key, value] of Object.entries(clientData)) {
    const placeholder = `{{${key}}}`
    context = context.split(placeholder).join(value)
  }
  
  // Select language
  if (language === 'ar' && context.includes('{{language}}')) {
    context = context.split('{{language}}').join('Arabic')
  } else if (language === 'en' && context.includes('{{language}}')) {
    context = context.split('{{language}}').join('English')
  }

  return extraContext ? `${extraContext}\n\n${context}` : context
}

// Get agent for a role
function getAgentForRole(
  agents: ReturnType<typeof useAgentsStore.getState>['agents'],
  role: string
): { id: string; name: string } | null {
  const agent = pickAgentForRole(agents, role, 'iris')
  return agent ? { id: agent.id, name: agent.name } : null
}

// Create a new pipeline instance
export function createPipelineInstance(
  pipeline: Pipeline,
  clientId: string,
  clientData: Record<string, string>,
  language: 'en' | 'ar'
): PipelineInstance {
  const client = useAgentsStore.getState().clients.find((entry) => entry.id === clientId)
  const mergedClientData = {
    ...mapClientToPipelineData(client),
    ...(clientData || {}),
  }
  const instance: PipelineInstance = {
    id: `pipeline-${Date.now()}`,
    pipelineId: pipeline.id,
    clientId,
    language,
    status: 'pending',
    currentPhase: pipeline.phases[0]?.id || '',
    currentActivity: null,
    tasks: [],
    outputs: new Map(),
    clientData: mergedClientData,
    startedAt: null,
    completedAt: null,
  }
  
  // Create tasks for each phase/activity
  for (const phase of pipeline.phases) {
    for (const activity of phase.activities) {
      const assignedAgent = getAgentForRole(useAgentsStore.getState().agents, activity.assignedRole)
      instance.tasks.push({
        id: `${phase.id}-${activity.id}`,
        phaseId: phase.id,
        activityId: activity.id,
        title: activity.name,
        status: 'pending',
        assignedAgent: assignedAgent?.id || null,
        output: null,
        checklist: activity.checklist || [],
        completedChecklist: [],
        startedAt: null,
        completedAt: null,
        error: null,
      })
    }
  }
  
  return instance
}

// Execute a single task
export async function executeTask(
  instance: PipelineInstance,
  task: PipelineTask,
  pipeline: Pipeline
): Promise<PipelineOutput> {
  // Find the activity
  const phase = pipeline.phases.find(p => p.id === task.phaseId)
  const activity = phase?.activities.find(a => a.id === task.activityId)
  
  if (!activity) {
    throw new Error(`Activity not found: ${task.activityId}`)
  }
  
  // Get the prompt based on language
  const promptTemplate = activity.prompts?.[instance.language] || activity.prompts?.en || ''
  
  if (!promptTemplate) {
    throw new Error(`No prompt found for activity: ${activity.id}`)
  }
  
  // Build the context
  const agent = getAgentForRole(useAgentsStore.getState().agents, activity.assignedRole)
  const skillContext = await getSkillContextForAgent(agent?.id || 'iris')
  const knowledgeContext = buildKnowledgeAssetsContext(instance.clientId)
  const context = buildContext(
    promptTemplate,
    instance.clientData,
    instance.language,
    [skillContext, knowledgeContext].filter(Boolean).join('\n\n')
  )
  
  // Call the AI agent
  // This would integrate with the actual agent execution system
  const response = await callAgent(agent?.id || 'iris', context)
  
  return {
    taskId: task.id,
    content: response,
    format: 'markdown',
    artifacts: [],
  }
}

export async function executeActivityBatch(
  instance: PipelineInstance,
  phaseId: string,
  activityId: string,
  pipeline: Pipeline
): Promise<PipelineOutput[]> {
  const tasks = instance.tasks.filter(
    (task) => task.phaseId === phaseId && task.activityId === activityId && task.status === 'pending'
  )

  const phase = pipeline.phases.find((entry) => entry.id === phaseId)
  const activity = phase?.activities.find((entry) => entry.id === activityId)
  if (!activity || !tasks.length) return []

  const batchSize = Math.max(1, activity.batching?.batchSize || 1)
  const parallel = activity.batching?.parallel !== false
  const outputs: PipelineOutput[] = []

  for (let index = 0; index < tasks.length; index += batchSize) {
    const slice = tasks.slice(index, index + batchSize)
    const runner = async (task: PipelineTask) => executeTask(instance, task, pipeline)

    if (parallel) {
      outputs.push(...(await Promise.all(slice.map(runner))))
    } else {
      for (const task of slice) {
        outputs.push(await runner(task))
      }
    }
  }

  return outputs
}

// Call an AI agent
async function callAgent(agentId: string, prompt: string): Promise<string> {
  const supabase = getSupabaseBrowserClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error('You need to sign in before running pipeline tasks.')
  }

  const state = useAgentsStore.getState()
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: prompt }],
      providerSettings: state.providerSettings,
      agentMemories: state.agentMemories,
      artifacts: state.artifacts,
      agents: state.agents,
      clients: state.clients,
      missions: state.missions,
      systemPrompt: `Execute this pipeline activity as agent ${agentId}. Produce only the actual activity output with no routing or management boilerplate.`,
      provider: state.agents.find((agent) => agent.id === agentId)?.provider || state.providerSettings.routing.primaryProvider,
      model: state.agents.find((agent) => agent.id === agentId)?.model || undefined,
    }),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.error || 'Pipeline agent execution failed.')
  }

  return payload.response || ''
}

// Get next pending task
export function getNextTask(instance: PipelineInstance, pipeline: Pipeline): PipelineTask | null {
  // Find first pending task
  return instance.tasks.find(t => t.status === 'pending') || null
}

// Check if phase is complete
export function isPhaseComplete(instance: PipelineInstance, phaseId: string): boolean {
  const phaseTasks = instance.tasks.filter(t => t.phaseId === phaseId)
  return phaseTasks.every(t => t.status === 'completed')
}

// Route a task request to the correct pipeline
export interface TaskRequest {
  description: string
  clientId: string
  language?: 'en' | 'ar'
}

export interface TaskResponse {
  success: boolean
  pipelineId?: string
  pipelineName?: string
  instanceId?: string
  taskId?: string
  message: string
  availablePipelines?: Array<{
    id: string
    name: string
    description: string
    version: string
    phases: Array<{ id: string; name: string }>
  }>
}

export async function routeTask(
  request: TaskRequest,
  availablePipelines: Pipeline[]
): Promise<TaskResponse> {
  const { description, clientId, language = 'en' } = request
  
  // Analyze the task description to find matching pipeline
  const lowerDesc = description.toLowerCase()
  
  // Pipeline matching keywords
  const pipelineKeywords: Record<string, string[]> = {
    'content-calendar': [
      'content calendar', 'social media content', 'content ideas', 'post copy',
      '30 day content', 'content plan', 'hashtags', 'visual brief', 'hooks',
      'instagram', 'linkedin', 'tiktok', 'facebook', 'twitter', 'social posts'
    ],
    'campaign-brief': [
      'campaign brief', 'campaign strategy', 'marketing campaign', 'campaign plan',
      'campaign concept', 'positioning', 'messaging'
    ],
    'ad-creative': [
      'ad creative', 'advertising creative', 'ad copy', 'ad assets', 'banner ads',
      'facebook ads', 'google ads', 'instagram ads', 'ad campaign'
    ],
    'seo-audit': [
      'seo audit', 'seo analysis', 'search engine optimization', 'keyword research',
      'technical seo', 'seo report'
    ],
    'competitor-research': [
      'competitor research', 'competitive analysis', 'competitor report',
      'market research', 'competitor intelligence'
    ],
    'media-plan': [
      'media plan', 'media strategy', 'channel strategy', 'budget allocation',
      'media buying', 'ad spend'
    ],
    'strategy-brief': [
      'strategy brief', 'brand strategy', 'messaging strategy', 'positioning',
      'strategic brief', 'brand platform'
    ],
    'client-brief': [
      'client brief', 'briefing document', 'intake brief', 'onboarding brief',
      'client onboarding'
    ],
  }
  
  // Find matching pipeline
  let matchedPipelineId: string | null = null
  let highestMatchCount = 0
  
  for (const [pipelineId, keywords] of Object.entries(pipelineKeywords)) {
    const matchCount = keywords.filter(kw => lowerDesc.includes(kw)).length
    if (matchCount > highestMatchCount) {
      highestMatchCount = matchCount
      matchedPipelineId = pipelineId
    }
  }
  
  if (!matchedPipelineId) {
    return {
      success: false,
      message: `No matching pipeline found for: "${description.slice(0, 50)}..."`,
      availablePipelines: availablePipelines.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        version: p.version,
        phases: p.phases.map(ph => ({ id: ph.id, name: ph.name })),
      })),
    }
  }
  
  const matchedPipeline = availablePipelines.find(p => p.id === matchedPipelineId)
  
  if (!matchedPipeline) {
    return {
      success: false,
      message: `Pipeline found but not loaded: ${matchedPipelineId}`,
      availablePipelines: availablePipelines.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        version: p.version,
        phases: p.phases.map(ph => ({ id: ph.id, name: ph.name })),
      })),
    }
  }
  
  return {
    success: true,
    pipelineId: matchedPipeline.id,
    pipelineName: matchedPipeline.name,
    message: `Found pipeline: ${matchedPipeline.name}`,
  }
}
