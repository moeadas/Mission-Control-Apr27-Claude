import pipelinesConfig from '@/config/pipelines/pipelines.json'
import type { AppPersistenceSnapshot, AppPersistencePatch, Conversation, ChatMessage, EntityDeltaPatch } from '@/lib/agents-store'
import type { Agent, Artifact, Mission, ProviderSettings, AgencySettings, ActivityEntry, Campaign } from '@/lib/types'
import type { Client } from '@/lib/client-data'
import { getDb } from '@/lib/db/client'
import { mergeAgentMemories } from '@/lib/agent-memory'
import { normalizeAgentPhotoUrl } from '@/lib/server/agent-photos'
import { loadConfigSkillCategories } from '@/lib/server/skills-catalog'
import { normalizeAgent } from '@/lib/agents-store/normalizers'

// ─── Helpers ────────────────────────────────────────────────────────────────

function inferMissionPipelineMetadata(deliverableType: Mission['deliverableType']) {
  switch (deliverableType) {
    case 'content-calendar': return { pipelineId: 'content-calendar', pipelineName: 'Content Calendar' }
    case 'blog-article':     return { pipelineId: 'blog-post-writing', pipelineName: 'Blog Post Writing' }
    case 'creative-asset':   return { pipelineId: 'ad-creative',      pipelineName: 'Ad Creative' }
    case 'client-brief':     return { pipelineId: 'client-brief',     pipelineName: 'Client Brief' }
    case 'strategy-brief':   return { pipelineId: 'strategy-brief',   pipelineName: 'Strategy Brief' }
    case 'campaign-strategy':return { pipelineId: 'campaign-brief',   pipelineName: 'Campaign Brief' }
    case 'research-brief':   return { pipelineId: 'competitor-research', pipelineName: 'Competitor Research' }
    case 'seo-audit':        return { pipelineId: 'seo-audit',        pipelineName: 'SEO Audit' }
    case 'media-plan':       return { pipelineId: 'media-plan',       pipelineName: 'Media Plan' }
    default:                 return { pipelineId: null, pipelineName: null }
  }
}

const DEFAULT_AGENCY_SLUG = 'default-agency'
const DEFAULT_AGENCY_NAME = 'Default Agency'

// ─── Tenant-aware agency resolver ───────────────────────────────────────────

/**
 * Resolve the agency/tenant id to use for DB queries.
 * In the strict multi-tenant model (Batch C), tenantId is REQUIRED. Returning
 * null causes callers to bail out rather than silently leak data into the
 * legacy `default-agency` singleton. The `getDefaultAgency()` helper below
 * still exists for one-off bootstrap scripts but is never used in request
 * handlers.
 */
async function resolveAgencyId(tenantId?: string | null): Promise<string | null> {
  return tenantId || null
}

function dedupeByKey<T>(items: T[], getKey: (item: T) => string) {
  const map = new Map<string, T>()
  for (const item of items) map.set(getKey(item), item)
  return [...map.values()]
}

function toStableUuid(value: string) {
  const hex = Buffer.from(value).toString('hex').padEnd(32, '0').slice(0, 32)
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`
}

function parseJsonMaybe<T = any>(value: any, fallback: T): T {
  if (!value) return fallback
  if (typeof value === 'object') return value as T
  if (typeof value !== 'string') return fallback
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' ? parsed : fallback
  } catch {
    return fallback
  }
}

// ─── Agency helpers ─────────────────────────────────────────────────────────

async function getDefaultAgencyId(): Promise<string | null> {
  const db = getDb()
  const existing = await db`SELECT id FROM agencies WHERE slug = ${DEFAULT_AGENCY_SLUG} LIMIT 1`
  if (existing[0]?.id) return existing[0].id as string

  const created = await db`
    INSERT INTO agencies (slug, name, settings) VALUES (${DEFAULT_AGENCY_SLUG}, ${DEFAULT_AGENCY_NAME}, '{}')
    RETURNING id
  `
  return created[0]?.id as string ?? null
}

export async function getDefaultAgency() {
  const db = getDb()
  const existing = await db`SELECT id, slug, name, settings FROM agencies WHERE slug = ${DEFAULT_AGENCY_SLUG} LIMIT 1`
  if (existing[0]) return existing[0]

  const created = await db`
    INSERT INTO agencies (slug, name, settings) VALUES (${DEFAULT_AGENCY_SLUG}, ${DEFAULT_AGENCY_NAME}, '{}')
    RETURNING id, slug, name, settings
  `
  return created[0] ?? null
}

// ─── Row builders ───────────────────────────────────────────────────────────

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
    metadata: {
      ...(agent.metadata || {}),
      department: agent.department || 'marketing',
    },
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
    metadata: { campaignId: artifact.campaignId || null },
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

// ─── Generic upsert helper ───────────────────────────────────────────────────

/**
 * Batch Z fix: every entity upsert in the relational sync has been silently
 * failing with "syntax error at or near 'Object'" since the original
 * implementation mixed `db.unsafe(...)` (raw string) with `${db(rows).toString()}`
 * (which produces "[object Object]" because postgres.js helpers don't
 * stringify to SQL). Result: agent.model / agent.provider / agent.systemPrompt
 * edits never landed in the DB, and the next /api/state GET re-read stale
 * relational rows and overwrote the user's changes.
 *
 * The fix uses proper postgres.js tagged template idiom:
 *   await sql`INSERT INTO ${sql(table)} ${sql(rows, ...cols)} ON CONFLICT ...`
 * The library handles parameterisation, jsonb coercion, and quoting safely.
 */
async function upsert(table: string, rows: Record<string, any>[], conflictCol = 'id') {
  if (!rows.length) return
  const db = getDb()
  const cols = Object.keys(rows[0])
  const setCols = cols.filter((c) => c !== conflictCol)

  // Per-row insert keeps the SQL identical to the postgres.js multi-row form
  // but sidesteps the unsafe-stringification bug. The performance hit is
  // negligible because tenant-scoped batches are ≤ a few dozen rows.
  for (const row of rows) {
    // Build the SET clause as raw SQL fragments — column identifiers are
    // hardcoded from Object.keys(rows[0]) so there's no injection surface.
    const setFragments = setCols.map((c) => `"${c}" = EXCLUDED."${c}"`).join(', ')
    await db.unsafe(
      `INSERT INTO "${table}" (${cols.map((c) => `"${c}"`).join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) ON CONFLICT ("${conflictCol}") DO UPDATE SET ${setFragments}`,
      cols.map((c) => {
        const val = (row as any)[c]
        // postgres.js + .unsafe needs jsonb values as JSON strings; otherwise
        // an object is sent as "[object Object]" via toString().
        if (val !== null && typeof val === 'object') return JSON.stringify(val)
        return val
      })
    )
  }
}

// ─── Sync snapshot ───────────────────────────────────────────────────────────

export async function syncSnapshotToRelationalTables(state: AppPersistenceSnapshot, tenantId?: string | null) {
  const db = getDb()
  const agencyId = await resolveAgencyId(tenantId)
  if (!agencyId) return

  // Update agency settings blob
  await db`
    UPDATE agencies
    SET settings = ${db.json({
      agencySettings: state.agencySettings,
      providerSettings: state.providerSettings,
      campaigns: state.campaigns,
      activities: state.activities,
      agentMemories: state.agentMemories,
    } as any)}
    WHERE id = ${agencyId}::uuid
  `

  const agents      = dedupeByKey(state.agents.map((a) => toAgentRow(a, agencyId)), (r) => r.id)
  const clients     = dedupeByKey(state.clients.map((c) => toClientRow(c, agencyId)), (r) => r.id)
  const tasks       = dedupeByKey(state.missions.map((m) => toTaskRow(m, agencyId)), (r) => r.id)
  const outputs     = dedupeByKey(state.artifacts.map((a) => toOutputRow(a, agencyId)), (r) => r.id)
  const convos      = dedupeByKey(state.conversations.map((c) => toConversationRow(c, agencyId)), (r) => r.id)
  const msgs        = dedupeByKey(buildMessageRows(state.conversations), (r) => r.id)
  const knowledge   = dedupeByKey(buildKnowledgeAssetRows(state.clients, agencyId), (r) => r.id)
  const assignments = dedupeByKey(buildTaskAssignmentRows(state.missions, agencyId), (r) => `${r.task_id}:${r.agent_id}:${r.role}`)

  if (agents.length)  await upsert('agents',  agents)
  if (clients.length) await upsert('clients', clients)

  // Skills — only insert missing
  const skillRows = dedupeByKey(await buildSkillRows(agencyId), (r) => r.id)
  if (skillRows.length) {
    const existing = await db`SELECT id FROM skills WHERE agency_id = ${agencyId}::uuid`
    const existingIds = new Set(existing.map((r: any) => r.id))
    const missing = skillRows.filter((r) => !existingIds.has(r.id))
    if (missing.length) await upsert('skills', missing)
  }

  // Pipelines — seed every missing bundled definition, not just a brand-new
  // workspace. Tasks carry a pipeline_id foreign key, so an older tenant that
  // predates a newly bundled pipeline must receive that row before task sync.
  // Existing tenant/app pipeline edits remain untouched.
  const pipelineRows = dedupeByKey(buildPipelineRows(agencyId), (r) => r.id)
  if (pipelineRows.length) {
    const existing = await db`SELECT id FROM pipelines WHERE agency_id = ${agencyId}::uuid`
    const existingIds = new Set(existing.map((row: any) => row.id))
    const missing = pipelineRows.filter((row) => !existingIds.has(row.id))
    if (missing.length) await upsert('pipelines', missing)
  }

  if (tasks.length)   await upsert('tasks', tasks)
  if (outputs.length) await upsert('outputs', outputs)
  if (convos.length)  await upsert('conversations', convos)
  if (knowledge.length) await upsert('knowledge_assets', knowledge, 'id')

  // Task assignments — delete and re-insert
  await db`DELETE FROM task_assignments WHERE agency_id = ${agencyId}::uuid`
  if (assignments.length) {
    await db`INSERT INTO task_assignments ${db(assignments)}`
  }

  // Messages — delete touched convos and re-insert
  const convIds = state.conversations.map((c) => c.id)
  if (convIds.length) {
    await db`DELETE FROM messages WHERE conversation_id = ANY(${convIds})`
  }
  if (msgs.length) {
    await db`INSERT INTO messages ${db(msgs as any[])}`
  }
}

// ─── Sync delta ──────────────────────────────────────────────────────────────

export async function syncEntityDeltaToRelationalTables(
  input: { statePatch?: AppPersistencePatch; entityPatch?: EntityDeltaPatch },
  fullState: AppPersistenceSnapshot,
  tenantId?: string | null
) {
  const db = getDb()
  const agencyId = await resolveAgencyId(tenantId)
  if (!agencyId) return

  const statePatch = input.statePatch || {}
  const entityPatch = input.entityPatch || {}

  if (statePatch.agencySettings || statePatch.providerSettings || statePatch.campaigns || statePatch.activities || statePatch.agentMemories) {
    await db`
      UPDATE agencies
      SET settings = ${db.json({
        agencySettings: fullState.agencySettings,
        providerSettings: fullState.providerSettings,
        campaigns: fullState.campaigns,
        activities: fullState.activities,
        agentMemories: fullState.agentMemories,
      } as any)}
      WHERE id = ${agencyId}::uuid
    `
  }

  if (entityPatch.agents) {
    const upserts = dedupeByKey(entityPatch.agents.upserts.map((a) => toAgentRow(a, agencyId)), (r) => r.id)
    if (upserts.length) await upsert('agents', upserts)
    if (entityPatch.agents.deletes.length) {
      await db`DELETE FROM agents WHERE id = ANY(${entityPatch.agents.deletes}) AND agency_id = ${agencyId}::uuid`
    }
  }

  if (entityPatch.clients) {
    const upserts = dedupeByKey(entityPatch.clients.upserts.map((c) => toClientRow(c, agencyId)), (r) => r.id)
    if (upserts.length) await upsert('clients', upserts)
    for (const client of entityPatch.clients.upserts) {
      await db`DELETE FROM knowledge_assets WHERE agency_id = ${agencyId}::uuid AND client_id = ${client.id}`
      const kRows = buildKnowledgeAssetRows([client], agencyId)
      if (kRows.length) await db`INSERT INTO knowledge_assets ${db(kRows)}`
    }
    if (entityPatch.clients.deletes.length) {
      await db`DELETE FROM clients WHERE id = ANY(${entityPatch.clients.deletes}) AND agency_id = ${agencyId}::uuid`
    }
  }

  if (entityPatch.missions) {
    const upserts = dedupeByKey(entityPatch.missions.upserts.map((m) => toTaskRow(m, agencyId)), (r) => r.id)
    if (upserts.length) await upsert('tasks', upserts)
    const touchedIds = entityPatch.missions.upserts.map((m) => m.id)
    if (touchedIds.length) {
      await db`DELETE FROM task_assignments WHERE task_id = ANY(${touchedIds}) AND agency_id = ${agencyId}::uuid`
      const aRows = buildTaskAssignmentRows(entityPatch.missions.upserts, agencyId)
      if (aRows.length) await db`INSERT INTO task_assignments ${db(aRows)}`
    }
    if (entityPatch.missions.deletes.length) {
      await db`DELETE FROM tasks WHERE id = ANY(${entityPatch.missions.deletes}) AND agency_id = ${agencyId}::uuid`
    }
  }

  if (entityPatch.artifacts) {
    const upserts = dedupeByKey(entityPatch.artifacts.upserts.map((a) => toOutputRow(a, agencyId)), (r) => r.id)
    if (upserts.length) await upsert('outputs', upserts)
    if (entityPatch.artifacts.deletes.length) {
      await db`DELETE FROM outputs WHERE id = ANY(${entityPatch.artifacts.deletes}) AND agency_id = ${agencyId}::uuid`
    }
  }

  if (entityPatch.conversations) {
    const upserts = dedupeByKey(entityPatch.conversations.upserts.map((c) => toConversationRow(c, agencyId)), (r) => r.id)
    if (upserts.length) await upsert('conversations', upserts)
    const touchedConvoIds = entityPatch.conversations.upserts.map((c) => c.id)
    if (touchedConvoIds.length) {
      await db`DELETE FROM messages WHERE conversation_id = ANY(${touchedConvoIds})`
      const mRows = buildMessageRows(entityPatch.conversations.upserts)
      if (mRows.length) await db`INSERT INTO messages ${db(mRows as any[])}`
    }
    if (entityPatch.conversations.deletes.length) {
      await db`DELETE FROM conversations WHERE id = ANY(${entityPatch.conversations.deletes}) AND agency_id = ${agencyId}::uuid`
    }
  }
}

// ─── Map helpers (DB rows → domain types) ───────────────────────────────────

function mapAgentRow(row: any): Agent {
  const metadata = parseJsonMaybe<Record<string, unknown>>(row.metadata, {})
  // Keep server execution in step with the browser's bundled-agent migrations.
  // Otherwise the editor could show an upgraded prompt while a task uses the
  // older database prompt in the background.
  return normalizeAgent({
    id: row.id,
    name: row.name,
    role: row.role,
    photoUrl: normalizeAgentPhotoUrl(row.photo_url) || undefined,
    division: row.division,
    department: (metadata.department as Agent['department']) || 'marketing',
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
    metadata,
  })
}

function mapClientRows(rows: any[], knowledgeRows: any[]): Client[] {
  const knowledgeByClient = new Map<string, any[]>()
  for (const row of knowledgeRows) {
    const list = knowledgeByClient.get(row.client_id) || []
    list.push(row)
    knowledgeByClient.set(row.client_id, list)
  }

  return rows.map((row) => {
    const brief = parseJsonMaybe<Record<string, any>>(row.brief, {})
    const metadata = parseJsonMaybe<Record<string, any>>(row.metadata, {})
    const knowledgeAssets = (knowledgeByClient.get(row.id) || []).map((asset) => ({
      id: asset.id,
      title: asset.title,
      type: asset.asset_type,
      path: asset.storage_path || undefined,
      summary: asset.summary || '',
      extractedInsights: asset.extracted_text || undefined,
      status: parseJsonMaybe<Record<string, any>>(asset.metadata, {}).status || 'reference',
      lastReviewedAt: parseJsonMaybe<Record<string, any>>(asset.metadata, {}).lastReviewedAt || undefined,
    }))
    const metadataAssets = Array.isArray(metadata.knowledgeAssets) ? metadata.knowledgeAssets : []

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
      knowledgeAssets: knowledgeAssets.length ? knowledgeAssets : metadataAssets,
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
    messages: (messagesByConversation.get(row.id) || []).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    ),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

// ─── Load relational state ───────────────────────────────────────────────────

export async function loadRelationalAppState(userId?: string, isSuperAdmin = false, tenantId?: string | null): Promise<Partial<AppPersistenceSnapshot> | null> {
  // Strict tenant-scoped load. Without a tenantId we return null — there is no
  // shared default-agency fallback. The caller (api/state) handles the empty
  // case. Visibility filtering for tenant members happens AFTER load, via
  // filterStateForCaller in /api/state. This means tenant members see ALL
  // tenant data by default, with per-resource ACL (assignedUserIds) applied
  // later. Tenant-shared model, not user-siloed.
  if (!tenantId) return null

  const db = getDb()
  const rows = await db`SELECT id, slug, name, settings FROM agencies WHERE id = ${tenantId}::uuid LIMIT 1`
  const agency = rows[0] ?? null
  if (!agency?.id) return null

  const agencyId = agency.id

  const [agentsRows, clientsRows, tasksRows, outputsRows, conversationsRows, messagesRows, knowledgeRows] = await Promise.all([
    db`SELECT * FROM agents WHERE agency_id = ${agencyId}::uuid ORDER BY name ASC`,
    db`SELECT * FROM clients WHERE agency_id = ${agencyId}::uuid ORDER BY name ASC`,
    db`SELECT * FROM tasks WHERE agency_id = ${agencyId}::uuid ORDER BY updated_at DESC`,
    db`SELECT * FROM outputs WHERE agency_id = ${agencyId}::uuid ORDER BY updated_at DESC`,
    db`SELECT * FROM conversations WHERE agency_id = ${agencyId}::uuid ORDER BY updated_at DESC`,
    db`SELECT m.* FROM messages m
       JOIN conversations c ON c.id = m.conversation_id
       WHERE c.agency_id = ${agencyId}::uuid
       ORDER BY m.created_at ASC`,
    db`SELECT * FROM knowledge_assets WHERE agency_id = ${agencyId}::uuid`,
  ])
  // `userId` and `isSuperAdmin` params are kept for backward-compat with
  // existing call signatures, but no longer drive row visibility — ACL is
  // applied at the api/state layer via filterStateForCaller.

  const allowedConversationIds = new Set(conversationsRows.map((r: any) => r.id))
  const filteredMessages = messagesRows.filter((r: any) => allowedConversationIds.has(r.conversation_id))
  const allowedClientIds = new Set(clientsRows.map((r: any) => r.id))
  const filteredKnowledge = knowledgeRows.filter((r: any) => allowedClientIds.has(r.client_id))

  const settings = ((agency.settings || {}) as {
    agencySettings?: AgencySettings
    providerSettings?: ProviderSettings
    agentMemories?: AppPersistenceSnapshot['agentMemories']
    campaigns?: Campaign[]
    activities?: ActivityEntry[]
  })

  const agents = agentsRows.map(mapAgentRow)

  return {
    agents,
    clients: mapClientRows(clientsRows, filteredKnowledge),
    missions: mapTaskRows(tasksRows),
    artifacts: mapOutputRows(outputsRows),
    conversations: mapConversationRows(conversationsRows, filteredMessages),
    campaigns: Array.isArray(settings.campaigns) ? settings.campaigns : [],
    activities: Array.isArray(settings.activities) ? settings.activities : [],
    agencySettings: settings.agencySettings,
    providerSettings: settings.providerSettings,
    agentMemories: mergeAgentMemories(settings.agentMemories, agents),
  }
}
