/**
 * Pure normalization helpers for the persistence layer.
 *
 * These run on:
 *   - persisted state when Zustand rehydrates from localStorage
 *   - shared state when ClientShell pulls from /api/state
 *   - new state when the store builds a snapshot for sync
 *
 * Lifted out of `src/lib/agents-store.ts` so the logic can be unit-tested
 * in isolation and so the store file isn't 1000+ lines anymore.
 */

import { v4 as uuidv4 } from 'uuid'

import type { Agent, AgentDepartment, AIProvider, Artifact, Mission } from '@/lib/types'
import type { Client } from '@/lib/client-data'
import { DEFAULT_CLIENTS } from '@/lib/client-data'
import { mergeAgentMemories } from '@/lib/agent-memory'
import { normalizeProviderSettings } from '@/lib/provider-settings'

import {
  ALL_DEFAULT_AGENTS,
  DEFAULT_CLIENT_BRAND_KIT,
  DEFAULT_PROVIDER_MODEL,
  INITIAL_AGENCY_SETTINGS,
  INITIAL_ARTIFACTS,
  INITIAL_MISSIONS,
  VALID_DIVISIONS,
  VALID_MISSION_PRIORITIES,
  VALID_MISSION_STATUSES,
  VALID_PROVIDERS,
  VALID_SPECIALTIES,
  VALID_STATUSES,
  nowIso,
} from './defaults'
import type { AppPersistenceSnapshot } from '@/lib/types/persistence'

/**
 * Resolve an agent's division from any combination of explicit division,
 * legacy `unit`, position room, or specialty fallback. Used during
 * normalization so older persisted records pick up the canonical division.
 */
export function inferDivision(agent: Partial<Agent> & Record<string, any>): Agent['division'] {
  if (VALID_DIVISIONS.has(agent.division as Agent['division'])) return agent.division as Agent['division']
  if (VALID_DIVISIONS.has(agent.unit as Agent['division'])) return agent.unit as Agent['division']
  const positionRoom = agent.position?.room as Agent['division'] | undefined
  if (positionRoom && VALID_DIVISIONS.has(positionRoom)) return positionRoom

  switch (agent.specialty) {
    case 'strategy':
    case 'project-management':
    case 'client-services':
    case 'client':
      return 'client-services'
    case 'media-planning':
    case 'performance':
      return 'media'
    case 'seo':
    case 'research':
      return 'research'
    case 'data-analytics':
      return 'analytics'
    case 'communications':
      return 'communications'
    case 'content-production':
      return 'production'
    default:
      return 'creative'
  }
}

// Versioned bundled prompts let us improve the specialists we ship without
// overwriting a workspace owner's own prompt edits. Only the exact v1 prompt
// is migrated; any custom prompt remains the workspace's source of truth.
const LEGACY_DEPARTMENT_SYSTEM_PROMPTS: Record<string, string> = {
  ledger: 'You are Ledger, the Financial Controller. Turn financial inputs into accurate, decision-ready reporting. State assumptions, reconcile totals, flag missing evidence, and never invent accounting entries, statutory advice, tax treatment, or compliance confirmation. Present reconciliations, variance explanations, controls, and follow-up actions in a form a finance leader can review.',
  nora: 'You are Nora, FP&A Lead. Build transparent financial plans from supplied business drivers. Separate facts, assumptions, forecasts, and sensitivity ranges. Explain the trade-offs behind every recommendation. Never imply that an estimate is an audited result, and ask for critical missing drivers when they materially affect a forecast.',
  aria: 'You are Aria, Accounting Operations Specialist. Create practical accounting operations documents: invoice trackers, AP and AR workflows, close checklists, and exception logs. Be precise about ownership, due dates, approval points, evidence, and reconciliations. Do not create ledger entries or give tax or legal advice without source data and human approval.',
  cash: 'You are Cash, Treasury and Cash Flow Analyst. Produce a clear short- and medium-term cash view using supplied balances, inflows, outflows, terms, and timing assumptions. Flag liquidity gaps early, quantify the timing risk, and recommend practical operating actions. Do not provide investment, banking, or legal advice.',
  vera: 'You are Vera, Financial Controls and Compliance Specialist. Build practical control matrices, evidence checklists, segregation-of-duty reviews, and compliance-readiness plans. Clearly distinguish operational guidance from legal, tax, audit, or regulatory advice and require qualified human review for the latter.',
  harper: 'You are Harper, People Operations Lead. Design practical people operations across onboarding, policy, engagement, performance cadence, and offboarding. Use inclusive language, protect sensitive information, and identify where local employment law, benefits, or HR counsel must review the work. Never make employment decisions or legal determinations.',
  remy: 'You are Remy, Talent Acquisition Specialist. Create job briefs, scorecards, interview plans, candidate communication, and recruitment funnels. Focus on job-relevant evidence and inclusive hiring. Do not make final hiring decisions, infer protected characteristics, or provide legal employment advice.',
  devon: 'You are Devon, Learning and Development Specialist. Design role-relevant learning paths, workshops, manager toolkits, and evaluation plans. Start with the desired behaviour and business outcome, then define practical practice and measurement. Avoid unsupported claims about learner performance or compliance completion.',
  ellis: 'You are Ellis, Employee Relations and Performance Specialist. Draft fair performance frameworks, manager conversation guides, documentation templates, and issue-triage plans. Be neutral, confidential, and evidence-based. Do not investigate allegations, make disciplinary decisions, or provide legal advice; clearly identify when qualified HR or legal review is required.',
  orion: 'You are Orion, Business Development Lead. Build commercially grounded opportunity plans: ideal customer profiles, account prioritisation, outreach sequences, qualification criteria, pipeline stages, and forecast assumptions. Tie recommendations to the client\'s actual offer and market context. Do not invent prospect relationships, revenue, or deal outcomes.',
  mira: 'You are Mira, Partnerships and Growth Specialist. Create partner landscapes, qualification frameworks, partnership propositions, co-marketing plans, governance models, and success metrics. Make the value exchange concrete for both parties. Do not claim a partnership exists or provide legal contract advice.',
}

export function normalizeAgent(agent: Partial<Agent> & Record<string, any>): Agent {
  const template = ALL_DEFAULT_AGENTS.find((item) => item.id === agent.id)
  const storedMetadata = agent.metadata && typeof agent.metadata === 'object' ? agent.metadata as Record<string, unknown> : {}
  const templatePromptVersion = Number(template?.metadata?.systemPromptTemplateVersion || 0)
  const storedPromptVersion = Number(storedMetadata.systemPromptTemplateVersion || 0)
  const legacyPrompt = agent.id ? LEGACY_DEPARTMENT_SYSTEM_PROMPTS[agent.id] : undefined
  const legacyPromptVariants = legacyPrompt
    ? [
        legacyPrompt,
        ...(template ? [`You are ${template.name}, ${template.role}.\n\n${legacyPrompt}`] : []),
      ]
    : []
  const shouldRefreshBundledPrompt = Boolean(
    templatePromptVersion > storedPromptVersion &&
      legacyPromptVariants.includes(agent.systemPrompt || '')
  )
  const division = inferDivision({ ...template, ...agent })
  const provider = VALID_PROVIDERS.has(agent.provider as AIProvider)
    ? (agent.provider as AIProvider)
    : template?.provider || (String(agent.model || '').startsWith('gemini') ? 'gemini' : 'ollama')
  const model = (agent.model || template?.model || DEFAULT_PROVIDER_MODEL[provider]) as Agent['model']
  const department = (['marketing', 'accounting-finance', 'human-resources', 'business-development'] as AgentDepartment[]).includes(
    agent.department as AgentDepartment
  )
    ? (agent.department as AgentDepartment)
    : template?.department || 'marketing'

  return {
    ...(template || {
      id: agent.id || uuidv4(),
      name: 'New Agent',
      role: 'Specialist',
      photoUrl: undefined,
      division,
      department,
      specialty: 'creative',
      unit: division,
      color: '#4f8ef7',
      accentColor: 'blue',
      avatar: 'bot-blue',
      systemPrompt: '',
      provider,
      model,
      temperature: 0.7,
      maxTokens: 4096,
      tools: [],
      skills: [],
      responsibilities: [],
      primaryOutputs: ['status-report'],
      status: 'idle',
      bio: '',
      methodology: '',
      position: { x: 300, y: 220, room: division },
    }),
    ...agent,
    department,
    division,
    unit: division,
    specialty: VALID_SPECIALTIES.has(agent.specialty as Agent['specialty'])
      ? (agent.specialty as Agent['specialty'])
      : template?.specialty || 'creative',
    provider,
    model,
    status: VALID_STATUSES.has(agent.status as Agent['status']) ? (agent.status as Agent['status']) : template?.status || 'idle',
    tools: Array.isArray(agent.tools) ? agent.tools.filter(Boolean) : template?.tools || [],
    skills: Array.isArray(agent.skills) ? agent.skills.filter(Boolean) : template?.skills || [],
    responsibilities: Array.isArray(agent.responsibilities)
      ? agent.responsibilities.filter(Boolean)
      : template?.responsibilities || [],
    primaryOutputs:
      Array.isArray(agent.primaryOutputs) && agent.primaryOutputs.length
        ? agent.primaryOutputs
        : template?.primaryOutputs || ['status-report'],
    color: agent.color || template?.color || '#4f8ef7',
    photoUrl: typeof agent.photoUrl === 'string' ? agent.photoUrl : template?.photoUrl,
    accentColor: agent.accentColor || template?.accentColor || 'blue',
    avatar: agent.avatar || template?.avatar || 'bot-blue',
    name: agent.name || template?.name || 'New Agent',
    role: agent.role || template?.role || 'Specialist',
    bio: agent.bio || template?.bio || '',
    systemPrompt: shouldRefreshBundledPrompt ? template?.systemPrompt || '' : agent.systemPrompt || template?.systemPrompt || '',
    methodology: agent.methodology || template?.methodology || '',
    temperature: typeof agent.temperature === 'number' ? agent.temperature : template?.temperature || 0.7,
    maxTokens: typeof agent.maxTokens === 'number' ? agent.maxTokens : template?.maxTokens || 4096,
    workload: typeof agent.workload === 'number' ? agent.workload : template?.workload,
    position: {
      x: typeof agent.position?.x === 'number' ? agent.position.x : template?.position.x || 300,
      y: typeof agent.position?.y === 'number' ? agent.position.y : template?.position.y || 220,
      room: division,
    },
    metadata: {
      ...storedMetadata,
      ...(shouldRefreshBundledPrompt ? { systemPromptTemplateVersion: templatePromptVersion } : {}),
    },
  }
}

/**
 * Normalize a possibly-stale persisted snapshot back to the current schema.
 * Returns an object compatible with `AppPersistenceSnapshot` plus any
 * incidental keys that were already present (passes them through unchanged).
 */
export function normalizePersistedState(persistedState: any) {
  if (!persistedState) return persistedState
  const persistedAgents = Array.isArray(persistedState.agents) ? persistedState.agents : []
  const persistedAgentIds = new Set(persistedAgents.map((agent: Partial<Agent>) => agent.id).filter(Boolean))
  // New bundled specialists must appear for established workspaces too. Preserve
  // any tenant edits first, then append only templates the workspace does not own.
  const agents = [
    ...persistedAgents.map(normalizeAgent),
    ...ALL_DEFAULT_AGENTS.filter((agent) => !persistedAgentIds.has(agent.id)).map(normalizeAgent),
  ]
  const clients = Array.isArray(persistedState.clients)
    ? persistedState.clients.map((client: Client) => ({
        ...client,
        brandKit: {
          ...DEFAULT_CLIENT_BRAND_KIT,
          ...(client.brandKit || {}),
          logos: Array.isArray(client.brandKit?.logos) ? client.brandKit.logos : [],
          templates: Array.isArray(client.brandKit?.templates) ? client.brandKit.templates : [],
          referenceImages: Array.isArray(client.brandKit?.referenceImages) ? client.brandKit.referenceImages : [],
          fontFiles: Array.isArray(client.brandKit?.fontFiles) ? client.brandKit.fontFiles : [],
        },
      }))
    : DEFAULT_CLIENTS
  const missions = Array.isArray(persistedState.missions)
    ? persistedState.missions.map((mission: Mission & { assignedAgentId?: string }) => {
        const leadAgentId =
          mission.leadAgentId || mission.assignedAgentId || mission.assignedAgentIds?.[0] || 'iris'
        const collaboratorAgentIds = Array.isArray(mission.collaboratorAgentIds)
          ? mission.collaboratorAgentIds.filter(Boolean)
          : []
        const assignedAgentIds =
          Array.isArray(mission.assignedAgentIds) && mission.assignedAgentIds.length
            ? mission.assignedAgentIds.filter(Boolean)
            : [leadAgentId, ...collaboratorAgentIds].filter(Boolean)

        return {
          ...mission,
          title: mission.title || 'Untitled Task',
          summary: mission.summary || '',
          deliverableType: mission.deliverableType || 'status-report',
          status: VALID_MISSION_STATUSES.has(mission.status as Mission['status']) ? mission.status : 'queued',
          priority: VALID_MISSION_PRIORITIES.has(mission.priority as Mission['priority']) ? mission.priority : 'medium',
          assignedAgentIds,
          leadAgentId,
          collaboratorAgentIds,
          assignedBy: mission.assignedBy || 'iris',
          progress:
            typeof mission.progress === 'number' ? mission.progress : mission.status === 'completed' ? 100 : 0,
          createdAt: mission.createdAt || nowIso(),
          updatedAt: mission.updatedAt || mission.createdAt || nowIso(),
        }
      })
    : INITIAL_MISSIONS
  const artifacts = Array.isArray(persistedState.artifacts)
    ? persistedState.artifacts.map((artifact: Artifact) => ({
        ...artifact,
        title: artifact.title || 'Untitled Output',
        deliverableType: artifact.deliverableType || 'client-brief',
        status: artifact.status || 'draft',
        format: artifact.format || 'html',
        sourcePrompt:
          typeof artifact.sourcePrompt === 'string'
            ? artifact.sourcePrompt
            : typeof (artifact as Artifact & { executionPrompt?: string }).executionPrompt === 'string'
              ? (artifact as Artifact & { executionPrompt?: string }).executionPrompt
              : undefined,
        exports: Array.isArray(artifact.exports) ? artifact.exports : [],
        executionSteps: Array.isArray(artifact.executionSteps) ? artifact.executionSteps : [],
        renderedHtml: typeof artifact.renderedHtml === 'string' ? artifact.renderedHtml : undefined,
        createdAt: artifact.createdAt || nowIso(),
        updatedAt: artifact.updatedAt || artifact.createdAt || nowIso(),
      }))
    : INITIAL_ARTIFACTS

  return {
    ...persistedState,
    agents,
    clients,
    missions,
    artifacts,
    conversations: Array.isArray(persistedState.conversations) ? persistedState.conversations : [],
    agencySettings: {
      ...INITIAL_AGENCY_SETTINGS,
      ...persistedState.agencySettings,
    },
    providerSettings: normalizeProviderSettings(persistedState.providerSettings),
    agentMemories: mergeAgentMemories(persistedState.agentMemories, agents),
  }
}

/**
 * Build a full snapshot from a state slice. The `state` shape mirrors the
 * Zustand store's `Pick<AgentsState, ...>` selection but typed against the
 * persistence snapshot directly so this module doesn't need to know about
 * the store at all.
 */
type SnapshotInputState = AppPersistenceSnapshot

export function createAppPersistenceSnapshot(state: SnapshotInputState): AppPersistenceSnapshot {
  return {
    agents: state.agents,
    activities: state.activities,
    campaigns: state.campaigns,
    clients: state.clients,
    missions: state.missions,
    artifacts: state.artifacts,
    conversations: state.conversations,
    agencySettings: state.agencySettings,
    providerSettings: state.providerSettings,
    agentMemories: state.agentMemories,
  }
}

/**
 * Snapshot for cross-device sync — strips local-only conversation state so
 * remote consumers (other browsers, the relational sync) only see
 * server-of-record data.
 */
export function createRemoteAppPersistenceSnapshot(state: SnapshotInputState): AppPersistenceSnapshot {
  return {
    ...createAppPersistenceSnapshot(state),
    conversations: [],
  }
}

/**
 * Snapshot for local persistence — the local store keeps a *light* copy
 * (no big artifact bodies, no rendered HTML, no source prompts; only the
 * last 6 trimmed messages per conversation) so the localStorage budget
 * doesn't get blown out by a few large outputs.
 */
export function createLocalPersistenceSnapshot(state: SnapshotInputState): AppPersistenceSnapshot {
  return {
    ...createAppPersistenceSnapshot(state),
    artifacts: state.artifacts.map((artifact) => ({
      ...artifact,
      content: undefined,
      renderedHtml: undefined,
      sourcePrompt: undefined,
      executionSteps: Array.isArray(artifact.executionSteps)
        ? artifact.executionSteps.map((step) => ({ ...step, summary: step.summary.slice(0, 240) }))
        : [],
    })),
    conversations: state.conversations.map((conversation) => ({
      ...conversation,
      messages: conversation.messages.slice(-6).map((message) => ({
        ...message,
        content: message.content.length > 500 ? `${message.content.slice(0, 497)}...` : message.content,
      })),
    })),
    // Keep Gemini locally on the current machine so provider access survives
    // refreshes even if remote auth metadata hydration lags for a moment.
    providerSettings: normalizeProviderSettings(state.providerSettings),
  }
}
