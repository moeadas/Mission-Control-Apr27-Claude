import pipelinesConfig from '@/config/pipelines/pipelines.json'
import type { AppPersistenceSnapshot, AppPersistencePatch, Conversation, ChatMessage, EntityDeltaPatch } from '@/lib/agents-store'
import type { Agent, Artifact, Mission, ProviderSettings, AgencySettings, ActivityEntry, Campaign } from '@/lib/types'
import type { Client } from '@/lib/client-data'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { mergeAgentMemories } from '@/lib/agent-memory'
import { normalizeAgentPhotoUrl } from '@/lib/server/agent-photos'
import { loadConfigSkillCategories } from '@/lib/server/skills-catalog'

function inferMissionPipelineMetadata(deliverableType: Mission['deliverableType']) {
  switch (deliverableType) {
    case 'content-calendar':
      return { pipelineId: 'content-calendar', pipelineName: 'Content Calendar' }
    case 'creative-asset':
      return { pipelineId: 'ad-creative', pipelineName: 'Ad Creative' }
    case 'client-brief':
      return { pipelineId: 'client-brief', pipelineName: 'Client Brief' }
    case 'strategy-brief':
      return { pipelineId: 'strategy-brief', pipelineName: 'Strategy Brief' }
    case 'campaign-strategy':
      return { pipelineId: 'campaign-brief', pipelineName: 'Campaign Brief' }
    case 'research-brief':
      return { pipelineId: 'competitor-research', pipelineName: 'Competitor Research' }
    case 'seo-audit':
      return { pipelineId: 'seo-audit', pipelineName: 'SEO Audit' }
    case 'media-plan':
      return { pipelineId: 'media-plan', pipelineName: 'Media Plan' }
    default:
      return { pipelineId: null, pipelineName: null }
  }
}

const DEFAULT_AGENCY_SLUG = 'default-agency'
const DEFAULT_AGENCY_NAME = 'Default Agency'

function dedupeByKey<T>(items: T[], getKey: (item: T) => string) {
  const map = new Map<string, T>()
  for (const item of items) {
    map.set(getKey(item), item)
  }
  return [...map.values()]
}

function toStableUuid(value: string) {
  const hex = Buffer.from(value).toString('hex').padEnd(32, '0').slice(0, 32)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

async function getDefaultAgencyId() {
  const supabase = getSupabaseServerClient()
  if (!supabase) return null

  const { data: existing, error: existingError } = await supabase
    .from('agencies')
    .select('id')
    .eq('slug', DEFAULT_AGENCY_SLUG)
    .maybeSingle()

  if (existingError) throw existingError
  if (existing?.id) return existing.id as string

  const { data: created, error: createError } = await supabase
    .from('agencies')
    .insert({ slug: DEFAULT_AGENCY_SLUG, name: DEFAULT_AGENCY_NAME })
    .select('id')
    .single()

  if (createError) throw createError
  return created.id as string
}

async function tableHasRows(table: 'skills' | 'pipelines', agencyId: string) {
  const supabase = getSupabaseServerClient()
  if (!supabase) return false

  const { count, error } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('agency_id', agencyId)

  if (error) throw error
  return (count || 0) > 0
}

export async function getDefaultAgency() {
  const supabase = getSupabaseServerClient()
  if (!supabase) return null

  const { data: existing, error: existingError } = await supabase
    .from('agencies')
    .select('id, slug, name, settings')
    .eq('slug', DEFAULT_AGENCY_SLUG)
    .maybeSingle()

  if (existingError) throw existingError
  if (existing) return existing

  const { data: created, error: createError } = await supabase
    .from('agencies')
    .insert({ slug: DEFAULT_AGENCY_SLUG, name: DEFAULT_AGENCY_NAME })
    .select('id, slug, name, settings')
    .single()

  if (createError) throw createError
  return created
}

function toAgentRow(agent: Agent, agencyId: string) {
  return {
    id: agent.id,
    agency_id: agencyId,
    name: agent.name,
    role: agent.role,
    division: agent.division,
    specialty: agent.specialty,
    unit: agent.unit,
    status: agent.status,
    bio: agent.bio || '',
    methodology: agent.methodology || '',
    system_prompt: agent.systemPrompt || '',
    provider: agent.provider,
    model: agent.model,
    temperature: agent.temperature,
    max_tokens: agent.maxTokens,
    color: agent.color,
    accent_color: agent.accentColor,
    avatar: agent.avatar,
    photo_url: normalizeAgentPhotoUrl(agent.photoUrl) || null,
    current_task: agent.currentTask || null,
    workload: typeof agent.workload === 'number' ? agent.workload : null,
    last_active: agent.lastActive || null,
    tools: agent.tools || [],
    skills: agent.skills || [],
    responsibilities: agent.responsibilities || [],
    primary_outputs: agent.primaryOutputs || [],
    position: agent.position || {},
    metadata: {},
  }
}

function toClientRow(client: AppPersistenceSnapshot['clients'][number], agencyId: string) {
  return {
    id: client.id,
    agency_id: agencyId,
    name: client.name,
    industry: client.industry || null,
    website: client.website || null,
    status: 'active',
    owner_user_id: client.ownerUserId || null,
    brief: {
      description: client.description,
      missionStatement: client.missionStatement,
      brandPromise: client.brandPromise,
      targetAudiences: client.targetAudiences,
      productsAndServices: client.productsAndServices,
      usp: client.usp,
      competitiveLandscape: client.competitiveLandscape,
      keyMessages: client.keyMessages,
      toneOfVoice: client.toneOfVoice,
      operationalDetails: client.operationalDetails,
      objectionHandling: client.objectionHandling,
      brandIdentityNotes: client.brandIdentityNotes,
      strategicPriorities: client.strategicPriorities,
      brandKit: client.brandKit || null,
      competitors: client.competitors,
      notes: client.notes,
    },
    knowledge_summary: client.notes || null,
    metadata: {
      knowledgeAssets: client.knowledgeAssets || [],
      createdAt: client.createdAt,
      updatedAt: client.updatedAt,
    },
    created_at: client.createdAt,
    updated_at: client.updatedAt,
  }
}

function toTaskRow(mission: Mission, agencyId: string) {
  const pipeline = inferMissionPipelineMetadata(mission.deliverableType)
  return {
    id: mission.id,
    agency_id: agencyId,
    client_id: mission.clientId || null,
    title: mission.title,
    summary: mission.summary || '',
    deliverable_type: mission.deliverableType,
    status: mission.status,
    priority: mission.priority,
    owner_user_id: mission.ownerUserId || null,
    assigned_by: mission.assignedBy || null,
    lead_agent_id: mission.leadAgentId || mission.assignedAgentIds?.[0] || null,
    pipeline_id: mission.pipelineId || pipeline.pipelineId || null,
    progress: mission.progress,
    due_date: mission.dueDate || null,
    started_at: null,
    completed_at: mission.status === 'completed' ? mission.updatedAt : null,
    execution_plan: {
      assignedAgentIds: mission.assignedAgentIds || [],
      collaboratorAgentIds: mission.collaboratorAgentIds || [],
      pipelineName: mission.pipelineName || pipeline.pipelineName || null,
      skillAssignments: mission.skillAssignments || {},
      orchestrationTrace: mission.orchestrationTrace || [],
      qualityChecklist: mission.qualityChecklist || [],
      handoffNotes: mission.handoffNotes || null,
      reviewComments: mission.reviewComments || [],
      reviewStatus: mission.reviewStatus || 'pending',
      runtimeMode: mission.runtimeMode || null,
      compareSummary: mission.compareSummary || null,
    },
    metadata: {
      campaignId: mission.campaignId || null,
      createdAt: mission.createdAt,
      updatedAt: mission.updatedAt,
    },
    created_at: mission.createdAt,
    updated_at: mission.updatedAt,
  }
}

function buildTaskAssignmentRows(missions: Mission[], agencyId: string) {
  return missions.flatMap((mission) => {
    const assignedAgentIds = Array.isArray(mission.assignedAgentIds) ? mission.assignedAgentIds : []
    return assignedAgentIds.map((agentId) => ({
      agency_id: agencyId,
      task_id: mission.id,
      agent_id: agentId,
      role: mission.leadAgentId === agentId ? 'lead' : 'support',
      status: mission.status,
      handoff_notes: mission.handoffNotes || null,
    }))
  })
}

function toOutputRow(artifact: Artifact, agencyId: string) {
  return {
    id: artifact.id,
    agency_id: agencyId,
    task_id: artifact.missionId || null,
    client_id: artifact.clientId || null,
    agent_id: artifact.agentId || null,
    title: artifact.title,
    deliverable_type: artifact.deliverableType,
    status: artifact.status,
    owner_user_id: artifact.ownerUserId || null,
    format: artifact.format,
    content: artifact.content || null,
    rendered_html: artifact.renderedHtml || null,
    source_prompt: artifact.sourcePrompt || null,
    notes: artifact.notes || null,
    storage_path: artifact.path || null,
    public_url: artifact.link || null,
    creative: artifact.creative || {},
    exports: artifact.exports || [],
    execution_steps: artifact.executionSteps || [],
    metadata: {
      campaignId: artifact.campaignId || null,
    },
    created_at: artifact.createdAt,
    updated_at: artifact.updatedAt,
  }
}

function toConversationRow(conversation: Conversation, agencyId: string) {
  return {
    id: conversation.id,
    agency_id: agencyId,
    client_id: null,
    task_id: null,
    title: conversation.title,
    preview: conversation.messages.at(-1)?.content?.slice(0, 180) || null,
    agent_id: conversation.messages.at(-1)?.agentId || null,
    owner_user_id: conversation.ownerUserId || null,
    metadata: {
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
    },
    created_at: conversation.createdAt,
    updated_at: conversation.updatedAt,
  }
}

function buildMessageRows(conversations: Conversation[]) {
  return conversations.flatMap((conversation) =>
    conversation.messages.map((message) => ({
      id: message.id,
      conversation_id: conversation.id,
      role: message.role,
      agent_id: message.agentId || null,
      content: message.content,
      metadata: message.meta || {},
      created_at: message.timestamp,
    }))
  )
}

async function buildSkillRows(agencyId: string) {
  const categories = await loadConfigSkillCategories()
  return categories.flatMap((category) =>
    category.skills.map((skill) => ({
      id: skill.id,
      agency_id: agencyId,
      name: skill.name,
      category: category.id,
      description: skill.description || '',
      prompts: skill.prompts || {},
      checklist: skill.checklist || [],
      examples: skill.examples || [],
      metadata: {
        ...(skill.metadata || {}),
        difficulty: skill.difficulty || 'intermediate',
        freedom: skill.freedom || 'medium',
        variables: skill.variables || [],
        inputs: skill.inputs || [],
        outputs: skill.outputs || [],
        workflow: skill.workflow || { steps: [] },
        tools: skill.tools || [],
        agents: skill.agents || [],
        pipelines: skill.pipelines || [],
        sourceCategoryName: category.name,
      },
      source: 'config',
    }))
  )
}

function buildPipelineRows(agencyId: string) {
  const pipelines = Array.isArray(pipelinesConfig.pipelines) ? pipelinesConfig.pipelines : []
  return pipelines.map((pipeline: any) => ({
    id: pipeline.id,
    agency_id: agencyId,
    name: pipeline.name,
    description: pipeline.description || '',
    version: pipeline.version || '1.0',
    is_default: Boolean(pipeline.isDefault),
    estimated_duration: pipeline.estimatedDuration || null,
    definition: pipeline,
    source: 'config',
  }))
}

function buildKnowledgeAssetRows(clients: AppPersistenceSnapshot['clients'], agencyId: string) {
  return clients.flatMap((client) =>
    (Array.isArray(client.knowledgeAssets) ? client.knowledgeAssets : []).map((asset) => ({
      id: toStableUuid(`${client.id}:${asset.id}`),
      agency_id: agencyId,
      client_id: client.id,
      title: asset.title,
      asset_type: asset.type,
      storage_bucket: null,
      storage_path: asset.path || null,
      public_url: null,
      extracted_text: asset.extractedInsights || null,
      summary: asset.summary || null,
      metadata: {
        status: asset.status,
        lastReviewedAt: asset.lastReviewedAt || null,
      },
      created_at: client.createdAt,
      updated_at: client.updatedAt,
    }))
  )
}

export async function syncSnapshotToRelationalTables(state: AppPersistenceSnapshot) {
  const supabase = getSupabaseServerClient()
  if (!supabase) return

  const agencyId = await getDefaultAgencyId()
  if (!agencyId) return

  const { error: agencyUpdateError } = await supabase
    .from('agencies')
    .update({
      settings: {
        agencySettings: state.agencySettings,
        providerSettings: state.providerSettings,
        campaigns: state.campaigns,
        activities: state.activities,
        agentMemories: state.agentMemories,
      },
    })
    .eq('id', agencyId)

  if (agencyUpdateError) throw agencyUpdateError

  const agents = state.agents.map((agent) => toAgentRow(agent, agencyId))
  const clients = state.clients.map((client) => toClientRow(client, agencyId))
  const tasks = state.missions.map((mission) => toTaskRow(mission, agencyId))
  const taskAssignments = buildTaskAssignmentRows(state.missions, agencyId)
  const outputs = state.artifacts.map((artifact) => toOutputRow(artifact, agencyId))
  const conversations = state.conversations.map((conversation) => toConversationRow(conversation, agencyId))
  const messages = buildMessageRows(state.conversations)
  const knowledgeAssets = buildKnowledgeAssetRows(state.clients, agencyId)

  const dedupedAgents = dedupeByKey(agents, (item) => item.id)
  const dedupedClients = dedupeByKey(clients, (item) => item.id)
  const dedupedTasks = dedupeByKey(tasks, (item) => item.id)
  const dedupedTaskAssignments = dedupeByKey(taskAssignments, (item) => `${item.task_id}:${item.agent_id}:${item.role}`)
  const dedupedOutputs = dedupeByKey(outputs, (item) => item.id)
  const dedupedConversations = dedupeByKey(conversations, (item) => item.id)
  const dedupedMessages = dedupeByKey(messages, (item) => item.id)
  const dedupedKnowledgeAssets = dedupeByKey(knowledgeAssets, (item) => item.id)

  if (dedupedAgents.length) {
    const { error } = await supabase.from('agents').upsert(dedupedAgents, { onConflict: 'id' })
    if (error) throw error
  }
  if (dedupedClients.length) {
    const { error } = await supabase.from('clients').upsert(dedupedClients, { onConflict: 'id' })
    if (error) throw error
  }
  {
    const dedupedSkills = dedupeByKey(await buildSkillRows(agencyId), (item) => item.id)
    if (dedupedSkills.length) {
      const { data: existingSkills, error: existingSkillsError } = await supabase
        .from('skills')
        .select('id')
        .eq('agency_id', agencyId)
      if (existingSkillsError) throw existingSkillsError

      const existingIds = new Set((existingSkills || []).map((item: any) => item.id))
      const missingSkills = dedupedSkills.filter((skill) => !existingIds.has(skill.id))

      if (missingSkills.length) {
        const { error } = await supabase.from('skills').upsert(missingSkills, { onConflict: 'id' })
        if (error) throw error
      }
    }
  }
  if (!(await tableHasRows('pipelines', agencyId))) {
    const dedupedPipelines = dedupeByKey(buildPipelineRows(agencyId), (item) => item.id)
    if (dedupedPipelines.length) {
      const { error } = await supabase.from('pipelines').upsert(dedupedPipelines, { onConflict: 'id' })
      if (error) throw error
    }
  }
  if (dedupedTasks.length) {
    const { error } = await supabase.from('tasks').upsert(dedupedTasks, { onConflict: 'id' })
    if (error) throw error
  }

  const { error: deleteAssignmentsError } = await supabase.from('task_assignments').delete().eq('agency_id', agencyId)
  if (deleteAssignmentsError) throw deleteAssignmentsError
  if (dedupedTaskAssignments.length) {
    const { error } = await supabase.from('task_assignments').insert(dedupedTaskAssignments)
    if (error) throw error
  }

  if (dedupedOutputs.length) {
    const { error } = await supabase.from('outputs').upsert(dedupedOutputs, { onConflict: 'id' })
    if (error) throw error
  }
  if (dedupedConversations.length) {
    const { error } = await supabase.from('conversations').upsert(dedupedConversations, { onConflict: 'id' })
    if (error) throw error
  }
  if (dedupedKnowledgeAssets.length) {
    const { error } = await supabase.from('knowledge_assets').upsert(dedupedKnowledgeAssets, { onConflict: 'id' })
    if (error) throw error
  }

  const conversationIds = state.conversations.map((conversation) => conversation.id)
  if (conversationIds.length) {
    const { error: deleteMessagesError } = await supabase.from('messages').delete().in('conversation_id', conversationIds)
    if (deleteMessagesError) throw deleteMessagesError
  }
  if (dedupedMessages.length) {
    const { error } = await supabase.from('messages').insert(dedupedMessages)
    if (error) throw error
  }
}

export async function syncEntityDeltaToRelationalTables(
  input: {
    statePatch?: AppPersistencePatch
    entityPatch?: EntityDeltaPatch
  },
  fullState: AppPersistenceSnapshot
) {
  const supabase = getSupabaseServerClient()
  if (!supabase) return

  const agencyId = await getDefaultAgencyId()
  if (!agencyId) return

  const statePatch = input.statePatch || {}
  const entityPatch = input.entityPatch || {}

  if (
    statePatch.agencySettings ||
    statePatch.providerSettings ||
    statePatch.campaigns ||
    statePatch.activities ||
    statePatch.agentMemories
  ) {
    const { error: agencyUpdateError } = await supabase
      .from('agencies')
      .update({
        settings: {
          agencySettings: fullState.agencySettings,
          providerSettings: fullState.providerSettings,
          campaigns: fullState.campaigns,
          activities: fullState.activities,
          agentMemories: fullState.agentMemories,
        },
      })
      .eq('id', agencyId)

    if (agencyUpdateError) throw agencyUpdateError
  }

  if (entityPatch.agents) {
    const upserts = dedupeByKey(entityPatch.agents.upserts.map((agent) => toAgentRow(agent, agencyId)), (item) => item.id)
    if (upserts.length) {
      const { error } = await supabase.from('agents').upsert(upserts, { onConflict: 'id' })
      if (error) throw error
    }
    if (entityPatch.agents.deletes.length) {
      const { error } = await supabase.from('agents').delete().in('id', entityPatch.agents.deletes).eq('agency_id', agencyId)
      if (error) throw error
    }
  }

  if (entityPatch.clients) {
    const upserts = dedupeByKey(entityPatch.clients.upserts.map((client) => toClientRow(client, agencyId)), (item) => item.id)
    if (upserts.length) {
      const { error } = await supabase.from('clients').upsert(upserts, { onConflict: 'id' })
      if (error) throw error
    }
    for (const client of entityPatch.clients.upserts) {
      const { error: deleteKnowledgeError } = await supabase.from('knowledge_assets').delete().eq('agency_id', agencyId).eq('client_id', client.id)
      if (deleteKnowledgeError) throw deleteKnowledgeError
      const knowledgeRows = buildKnowledgeAssetRows([client], agencyId)
      if (knowledgeRows.length) {
        const { error } = await supabase.from('knowledge_assets').insert(knowledgeRows)
        if (error) throw error
      }
    }
    if (entityPatch.clients.deletes.length) {
      const { error } = await supabase.from('clients').delete().in('id', entityPatch.clients.deletes).eq('agency_id', agencyId)
      if (error) throw error
    }
  }

  if (entityPatch.missions) {
    const upserts = dedupeByKey(entityPatch.missions.upserts.map((mission) => toTaskRow(mission, agencyId)), (item) => item.id)
    if (upserts.length) {
      const { error } = await supabase.from('tasks').upsert(upserts, { onConflict: 'id' })
      if (error) throw error
    }
    const touchedTaskIds = entityPatch.missions.upserts.map((mission) => mission.id)
    if (touchedTaskIds.length) {
      const { error: deleteAssignmentsError } = await supabase.from('task_assignments').delete().in('task_id', touchedTaskIds).eq('agency_id', agencyId)
      if (deleteAssignmentsError) throw deleteAssignmentsError
      const assignmentRows = buildTaskAssignmentRows(entityPatch.missions.upserts, agencyId)
      if (assignmentRows.length) {
        const { error } = await supabase.from('task_assignments').insert(assignmentRows)
        if (error) throw error
      }
    }
    if (entityPatch.missions.deletes.length) {
      const { error } = await supabase.from('tasks').delete().in('id', entityPatch.missions.deletes).eq('agency_id', agencyId)
      if (error) throw error
    }
  }

  if (entityPatch.artifacts) {
    const upserts = dedupeByKey(entityPatch.artifacts.upserts.map((artifact) => toOutputRow(artifact, agencyId)), (item) => item.id)
    if (upserts.length) {
      const { error } = await supabase.from('outputs').upsert(upserts, { onConflict: 'id' })
      if (error) throw error
    }
    if (entityPatch.artifacts.deletes.length) {
      const { error } = await supabase.from('outputs').delete().in('id', entityPatch.artifacts.deletes).eq('agency_id', agencyId)
      if (error) throw error
    }
  }

  if (entityPatch.conversations) {
    const upserts = dedupeByKey(entityPatch.conversations.upserts.map((conversation) => toConversationRow(conversation, agencyId)), (item) => item.id)
    if (upserts.length) {
      const { error } = await supabase.from('conversations').upsert(upserts, { onConflict: 'id' })
      if (error) throw error
    }
    const touchedConversationIds = entityPatch.conversations.upserts.map((conversation) => conversation.id)
    if (touchedConversationIds.length) {
      const { error: deleteMessagesError } = await supabase.from('messages').delete().in('conversation_id', touchedConversationIds)
      if (deleteMessagesError) throw deleteMessagesError
      const messageRows = buildMessageRows(entityPatch.conversations.upserts)
      if (messageRows.length) {
        const { error } = await supabase.from('messages').insert(messageRows)
        if (error) throw error
      }
    }
    if (entityPatch.conversations.deletes.length) {
      const { error } = await supabase.from('conversations').delete().in('id', entityPatch.conversations.deletes).eq('agency_id', agencyId)
      if (error) throw error
    }
  }
}

function mapAgentRow(row: any): Agent {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    photoUrl: normalizeAgentPhotoUrl(row.photo_url) || undefined,
    division: row.division,
    specialty: row.specialty,
    unit: row.unit,
    color: row.color,
    accentColor: row.accent_color,
    avatar: row.avatar,
    systemPrompt: row.system_prompt || '',
    provider: row.provider,
    model: row.model,
    temperature: Number(row.temperature ?? 0.7),
    maxTokens: row.max_tokens ?? 1024,
    tools: Array.isArray(row.tools) ? row.tools : [],
    skills: Array.isArray(row.skills) ? row.skills : [],
    responsibilities: Array.isArray(row.responsibilities) ? row.responsibilities : [],
    primaryOutputs: Array.isArray(row.primary_outputs) ? row.primary_outputs : [],
    status: row.status,
    currentTask: row.current_task || undefined,
    lastActive: row.last_active || undefined,
    workload: typeof row.workload === 'number' ? row.workload : undefined,
    position: row.position || { x: 300, y: 220, room: row.division },
    bio: row.bio || '',
    methodology: row.methodology || '',
  }
}

function mapClientRows(rows: any[], knowledgeRows: any[]): Client[] {
  const knowledgeByClient = new Map<string, any[]>()
  for (const row of knowledgeRows) {
    const list = knowledgeByClient.get(row.client_id) || []
    list.push(row)
    knowledgeByClient.set(row.client_id, list)
  }

  return rows.map((row) => {
    const brief = row.brief || {}
    const knowledgeAssets = (knowledgeByClient.get(row.id) || []).map((asset) => ({
      id: asset.id,
      title: asset.title,
      type: asset.asset_type,
      path: asset.storage_path || undefined,
      summary: asset.summary || '',
      extractedInsights: asset.extracted_text || undefined,
      status: asset.metadata?.status || 'reference',
      lastReviewedAt: asset.metadata?.lastReviewedAt || undefined,
    }))

    return {
      id: row.id,
      ownerUserId: row.owner_user_id || undefined,
      name: row.name,
      industry: row.industry || '',
      website: row.website || undefined,
      description: brief.description || '',
      missionStatement: brief.missionStatement || '',
      brandPromise: brief.brandPromise || '',
      targetAudiences: brief.targetAudiences || '',
      productsAndServices: brief.productsAndServices || '',
      usp: brief.usp || '',
      competitiveLandscape: brief.competitiveLandscape || '',
      keyMessages: brief.keyMessages || '',
      toneOfVoice: brief.toneOfVoice || '',
      operationalDetails: brief.operationalDetails || '',
      objectionHandling: brief.objectionHandling || '',
      brandIdentityNotes: brief.brandIdentityNotes || '',
      strategicPriorities: brief.strategicPriorities || '',
      brandKit: {
        colors: Array.isArray(brief.brandKit?.colors) ? brief.brandKit.colors : [],
        fonts: Array.isArray(brief.brandKit?.fonts) ? brief.brandKit.fonts : [],
        visualKeywords: brief.brandKit?.visualKeywords || '',
        lookAndFeel: brief.brandKit?.lookAndFeel || '',
        photoStyle: brief.brandKit?.photoStyle || '',
        compositionRules: brief.brandKit?.compositionRules || '',
        negativeRules: brief.brandKit?.negativeRules || '',
        logos: Array.isArray(brief.brandKit?.logos) ? brief.brandKit.logos : [],
        templates: Array.isArray(brief.brandKit?.templates) ? brief.brandKit.templates : [],
        referenceImages: Array.isArray(brief.brandKit?.referenceImages) ? brief.brandKit.referenceImages : [],
        fontFiles: Array.isArray(brief.brandKit?.fontFiles) ? brief.brandKit.fontFiles : [],
      },
      competitors: Array.isArray(brief.competitors) ? brief.competitors : [],
      knowledgeAssets,
      notes: brief.notes || row.knowledge_summary || '',
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  })
}

function mapTaskRows(rows: any[]): Mission[] {
  return rows.map((row) => ({
    id: row.id,
    ownerUserId: row.owner_user_id || undefined,
    title: row.title,
    summary: row.summary || '',
    deliverableType: row.deliverable_type,
    status: row.status,
    priority: row.priority,
    campaignId: row.metadata?.campaignId || undefined,
    clientId: row.client_id || undefined,
    assignedAgentIds: Array.isArray(row.execution_plan?.assignedAgentIds) ? row.execution_plan.assignedAgentIds : [],
    leadAgentId: row.lead_agent_id || undefined,
    collaboratorAgentIds: Array.isArray(row.execution_plan?.collaboratorAgentIds) ? row.execution_plan.collaboratorAgentIds : [],
    pipelineId: row.pipeline_id || undefined,
    pipelineName: row.execution_plan?.pipelineName || undefined,
    skillAssignments: row.execution_plan?.skillAssignments || {},
    orchestrationTrace: Array.isArray(row.execution_plan?.orchestrationTrace) ? row.execution_plan.orchestrationTrace : [],
    qualityChecklist: Array.isArray(row.execution_plan?.qualityChecklist) ? row.execution_plan.qualityChecklist : [],
    handoffNotes: row.execution_plan?.handoffNotes || undefined,
    reviewComments: Array.isArray(row.execution_plan?.reviewComments) ? row.execution_plan.reviewComments : [],
    reviewStatus: row.execution_plan?.reviewStatus || 'pending',
    runtimeMode: row.execution_plan?.runtimeMode || undefined,
    compareSummary: row.execution_plan?.compareSummary || undefined,
    assignedBy: row.assigned_by || 'iris',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    dueDate: row.due_date || undefined,
    progress: typeof row.progress === 'number' ? row.progress : 0,
  }))
}

function mapOutputRows(rows: any[]): Artifact[] {
  return rows.map((row) => ({
    id: row.id,
    ownerUserId: row.owner_user_id || undefined,
    title: row.title,
    deliverableType: row.deliverable_type,
    status: row.status,
    format: row.format,
    content: row.content || undefined,
    renderedHtml: row.rendered_html || undefined,
    sourcePrompt: row.source_prompt || undefined,
    path: row.storage_path || undefined,
    link: row.public_url || undefined,
    notes: row.notes || undefined,
    clientId: row.client_id || undefined,
    campaignId: row.metadata?.campaignId || undefined,
    missionId: row.task_id || undefined,
    agentId: row.agent_id || undefined,
    exports: Array.isArray(row.exports) ? row.exports : [],
    creative: row.creative || undefined,
    executionSteps: Array.isArray(row.execution_steps) ? row.execution_steps : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

function mapConversationRows(conversationRows: any[], messageRows: any[]): Conversation[] {
  const messagesByConversation = new Map<string, ChatMessage[]>()
  for (const row of messageRows) {
    const list = messagesByConversation.get(row.conversation_id) || []
    list.push({
      id: row.id,
      role: row.role,
      content: row.content,
      timestamp: row.created_at,
      agentId: row.agent_id || undefined,
      meta: row.metadata || undefined,
    })
    messagesByConversation.set(row.conversation_id, list)
  }

  return conversationRows.map((row) => ({
    id: row.id,
    ownerUserId: row.owner_user_id || undefined,
    title: row.title,
    messages: (messagesByConversation.get(row.id) || []).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

export async function loadRelationalAppState(userId?: string, isSuperAdmin = false): Promise<Partial<AppPersistenceSnapshot> | null> {
  const supabase = getSupabaseServerClient()
  if (!supabase) return null

  const agency = await getDefaultAgency()
  if (!agency?.id) return null

  const [agentsRes, clientsRes, tasksRes, outputsRes, conversationsRes, messagesRes, knowledgeRes] = await Promise.all([
    supabase.from('agents').select('*').eq('agency_id', agency.id).order('name', { ascending: true }),
    isSuperAdmin || !userId
      ? supabase.from('clients').select('*').eq('agency_id', agency.id).order('name', { ascending: true })
      : supabase.from('clients').select('*').eq('agency_id', agency.id).eq('owner_user_id', userId).order('name', { ascending: true }),
    isSuperAdmin || !userId
      ? supabase.from('tasks').select('*').eq('agency_id', agency.id).order('updated_at', { ascending: false })
      : supabase.from('tasks').select('*').eq('agency_id', agency.id).eq('owner_user_id', userId).order('updated_at', { ascending: false }),
    isSuperAdmin || !userId
      ? supabase.from('outputs').select('*').eq('agency_id', agency.id).order('updated_at', { ascending: false })
      : supabase.from('outputs').select('*').eq('agency_id', agency.id).eq('owner_user_id', userId).order('updated_at', { ascending: false }),
    isSuperAdmin || !userId
      ? supabase.from('conversations').select('*').eq('agency_id', agency.id).order('updated_at', { ascending: false })
      : supabase.from('conversations').select('*').eq('agency_id', agency.id).eq('owner_user_id', userId).order('updated_at', { ascending: false }),
    supabase.from('messages').select('*').order('created_at', { ascending: true }),
    isSuperAdmin || !userId
      ? supabase.from('knowledge_assets').select('*').eq('agency_id', agency.id)
      : supabase.from('knowledge_assets').select('*').eq('agency_id', agency.id),
  ])

  for (const response of [agentsRes, clientsRes, tasksRes, outputsRes, conversationsRes, messagesRes, knowledgeRes]) {
    if (response.error) throw response.error
  }

  const allowedConversationIds = new Set((conversationsRes.data || []).map((row) => row.id))
  const filteredMessages = (messagesRes.data || []).filter((row) => allowedConversationIds.has(row.conversation_id))
  const allowedClientIds = new Set((clientsRes.data || []).map((row) => row.id))
  const filteredKnowledge = (knowledgeRes.data || []).filter((row) => allowedClientIds.has(row.client_id))

  const settings = (agency.settings || {}) as {
    agencySettings?: AgencySettings
    providerSettings?: ProviderSettings
    agentMemories?: AppPersistenceSnapshot['agentMemories']
    campaigns?: Campaign[]
    activities?: ActivityEntry[]
  }

  const agents = (agentsRes.data || []).map(mapAgentRow)

  return {
    agents,
    clients: mapClientRows(clientsRes.data || [], filteredKnowledge),
    missions: mapTaskRows(tasksRes.data || []),
    artifacts: mapOutputRows(outputsRes.data || []),
    conversations: mapConversationRows(conversationsRes.data || [], filteredMessages),
    campaigns: Array.isArray(settings.campaigns) ? settings.campaigns : [],
    activities: Array.isArray(settings.activities) ? settings.activities : [],
    agencySettings: settings.agencySettings,
    providerSettings: settings.providerSettings,
    agentMemories: mergeAgentMemories(settings.agentMemories, agents),
  }
}
