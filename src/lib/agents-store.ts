import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import {
  ActivityEntry,
  Artifact,
  ArtifactExecutionStep,
  AgencySettings,
  Agent,
  AIProvider,
  Campaign,
  CreativeArtifactSpec,
  GeminiSettings,
  Mission,
  ProviderSettings,
  ThemeMode,
} from './types'
import { CONFIG_AGENTS } from './agents-from-config'
import { Client, DEFAULT_CLIENTS } from './client-data'
import { maskApiKey } from './providers'
import { DEFAULT_PROVIDER_SETTINGS, normalizeProviderSettings } from './provider-settings'
import { AgentMemory, appendAgentMemoryNote, buildDefaultAgentMemories, mergeAgentMemories } from './agent-memory'
import { buildTaskTitleFromRequest } from './task-output'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  agentId?: string
  meta?: {
    routedAgentId?: string
    leadAgentId?: string
    assignedAgentIds?: string[]
    collaboratorAgentIds?: string[]
    clientId?: string
    campaignId?: string
    missionId?: string
    deliverableType?: string
    artifactId?: string
    executionPrompt?: string
    pipelineId?: string | null
    pipelineName?: string | null
    selectedSkillsByAgent?: Record<string, string[]>
    orchestrationTrace?: string[]
    qualityChecklist?: string[]
    handoffNotes?: string
    executionSteps?: ArtifactExecutionStep[]
    renderedHtml?: string
    creative?: CreativeArtifactSpec
    provider?: AIProvider
    model?: string
    fallbackUsed?: boolean
    quality?: { ok: boolean; score: number; issues: string[] } | null
    compareSummary?: Mission['compareSummary']
    confidence?: Mission['channelingConfidence']
    intakePrompt?: {
      field: IrisBriefField
      question: string
      helperText?: string
      multiSelect?: boolean
      options: Array<{ label: string; value: string }>
    } | null
  }
}

export type IrisBriefField =
  | 'objective'
  | 'platforms'
  | 'format'
  | 'timeframe'
  | 'cadence'
  | 'includeArtwork'

export interface IrisConversationBriefing {
  active: boolean
  originalRequest: string
  deliverableType: Mission['deliverableType']
  fields: {
    objective?: string
    platforms?: string[]
    format?: string
    timeframe?: string
    cadence?: string
    includeArtwork?: boolean
  }
  awaitingField?: IrisBriefField | null
}

export interface Conversation {
  id: string
  ownerUserId?: string
  title: string
  messages: ChatMessage[]
  briefing?: IrisConversationBriefing | null
  createdAt: string
  updatedAt: string
}

export interface AuthenticatedUser {
  id: string
  email: string
  role: 'super_admin' | 'member'
}

export interface AppPersistenceSnapshot {
  agents: Agent[]
  activities: ActivityEntry[]
  campaigns: Campaign[]
  clients: Client[]
  missions: Mission[]
  artifacts: Artifact[]
  conversations: Conversation[]
  agencySettings: AgencySettings
  providerSettings: ProviderSettings
  agentMemories: Record<string, AgentMemory>
}

export type AppPersistencePatch = Partial<AppPersistenceSnapshot>

export type EntityCollectionKey = 'agents' | 'clients' | 'missions' | 'artifacts' | 'conversations'

export type EntityDeltaPatch = {
  [K in EntityCollectionKey]?: {
    upserts: AppPersistenceSnapshot[K]
    deletes: string[]
  }
}

const nowIso = () => new Date().toISOString()
const DEFAULT_PROVIDER_MODEL: Record<AIProvider, Agent['model']> = {
  ollama: 'llama3.2:latest',
  gemini: 'gemini-2.5-flash',
}
const VALID_DIVISIONS = new Set<Agent['division']>([
  'orchestration',
  'client-services',
  'creative',
  'media',
  'research',
  'strategy',
  'analytics',
  'communications',
  'production',
])
const VALID_SPECIALTIES = new Set<Agent['specialty']>([
  'strategy',
  'creative',
  'design',
  'copy',
  'project-management',
  'client-services',
  'media-planning',
  'performance',
  'client',
  'seo',
  'research',
  'data-analytics',
  'communications',
  'content-production',
  'event-management',
  'operations',
  'ux-design',
  'brand',
])
const VALID_STATUSES = new Set<Agent['status']>(['active', 'idle', 'paused'])
const VALID_PROVIDERS = new Set<AIProvider>(['ollama', 'gemini'])
const SEEDED_CAMPAIGN_IDS = new Set(['campaign-1', 'campaign-2'])
const SEEDED_MISSION_IDS = new Set(['mission-1', 'mission-2', 'mission-3'])
const SEEDED_ARTIFACT_IDS = new Set(['artifact-1'])
const VALID_MISSION_STATUSES = new Set<Mission['status']>(['queued', 'in_progress', 'blocked', 'review', 'paused', 'cancelled', 'completed'])
const VALID_MISSION_PRIORITIES = new Set<Mission['priority']>(['low', 'medium', 'high'])

export function createAppPersistenceSnapshot(
  state: Pick<
    AgentsState,
    | 'agents'
    | 'activities'
    | 'campaigns'
    | 'clients'
    | 'missions'
    | 'artifacts'
    | 'conversations'
    | 'agencySettings'
    | 'providerSettings'
    | 'agentMemories'
  >
): AppPersistenceSnapshot {
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

export function createRemoteAppPersistenceSnapshot(
  state: Pick<
    AgentsState,
    | 'agents'
    | 'activities'
    | 'campaigns'
    | 'clients'
    | 'missions'
    | 'artifacts'
    | 'conversations'
    | 'agencySettings'
    | 'providerSettings'
    | 'agentMemories'
  >
): AppPersistenceSnapshot {
  return {
    ...createAppPersistenceSnapshot(state),
    conversations: [],
  }
}

function createLocalPersistenceSnapshot(
  state: Pick<
    AgentsState,
    | 'agents'
    | 'activities'
    | 'campaigns'
    | 'clients'
    | 'missions'
    | 'artifacts'
    | 'conversations'
    | 'agencySettings'
    | 'providerSettings'
    | 'agentMemories'
  >
): AppPersistenceSnapshot {
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

function inferMissionDeliverableType(prompt: string): Mission['deliverableType'] {
  const lower = prompt.toLowerCase()
  const wantsImageAsset =
    /\b(image|visual|artwork|design|creative asset|mockup|poster|hero image|ad creative|text over|text overlay|headline on image|post image|generate image|create image)\b/.test(lower)
  const wantsPostCopy =
    /\b(caption|post copy|facebook post|instagram post|linkedin post|social post|single post|cta)\b/.test(lower)
  const wantsShortFormCopy =
    /\b(whatsapp description|whatsapp bio|bio|profile description|short description|company description|brand description|tagline|one-liner)\b/.test(lower)

  if (wantsImageAsset && wantsPostCopy) return 'creative-asset'
  if (wantsShortFormCopy) return 'short-form-copy'
  if (/\b(email campaign|email sequence|email template|newsletter|drip campaign|email marketing|welcome email|onboarding email|email flow|email series|email blast|edm)\b/.test(lower)) return 'email-campaign'
  if (/\b(blog post|blog article|article|thought leadership|op-?ed|long-?form content|guest post|pillar page|how-?to guide|listicle|write an article|write a blog)\b/.test(lower)) return 'blog-article'
  if (/\b(website copy|web copy|landing page|homepage copy|about page|product page|service page|hero copy|website content|web content|page copy|site copy)\b/.test(lower)) return 'website-copy'
  if (/\b(video script|script for|youtube script|reel script|tiktok script|podcast script|voiceover|voice over|screenplay|storyboard script|explainer video|ad script|commercial script)\b/.test(lower)) return 'video-script'
  if (/\b(presentation|slide deck|pitch deck|keynote|powerpoint|pptx|investor deck|sales deck|stakeholder deck|board deck|proposal deck|slides)\b/.test(lower)) return 'presentation'
  if (/\b(brand guidelines|brand book|style guide|brand identity|visual identity|brand manual|brand standards|design system|brand kit)\b/.test(lower)) return 'brand-guidelines'
  if (/\b(data analysis|analytics report|performance report|dashboard|kpi report|metrics|roi analysis|attribution|conversion rate|funnel analysis|analytics audit|data audit|reporting)\b/.test(lower)) return 'data-analysis'
  if (/\b(press release|pr strategy|media release|public relations|media kit|press kit|media pitch|crisis comms|crisis communication|pr plan|media outreach|earned media|spokesperson)\b/.test(lower)) return 'pr-comms'
  if (/\b(event plan|event strategy|conference|webinar|workshop|summit|meetup|event brief|activation|experiential|launch event|virtual event|hybrid event)\b/.test(lower)) return 'event-plan'
  if (
    lower.includes('carousel') ||
    lower.includes('caption') ||
    lower.includes('social post') ||
    lower.includes('facebook post') ||
    lower.includes('instagram post') ||
    lower.includes('linkedin post') ||
    lower.includes('twitter post') ||
    lower.includes('x post') ||
    lower.includes('campaign content') ||
    lower.includes('post copy') ||
    lower.includes('whatsapp description') ||
    lower.includes('short description') ||
    lower.includes('company description')
  ) return 'campaign-copy'
  if (/\b(i need|we need|i want|can you create|can you write|help me create|help me write)\b/.test(lower) && /\b(post|caption|copy)\b/.test(lower)) {
    return 'campaign-copy'
  }
  if (lower.includes('content calendar')) return 'content-calendar'
  if (lower.includes('media plan')) return 'media-plan'
  if (lower.includes('budget')) return 'budget-sheet'
  if (lower.includes('kpi') || lower.includes('forecast')) return 'kpi-forecast'
  if (lower.includes('seo audit')) return 'seo-audit'
  if (lower.includes('ui audit') || lower.includes('ux audit') || lower.includes('website audit') || lower.includes('accessibility audit')) return 'ui-audit'
  const strategySignalCount = [
    'target audience',
    'audience research',
    'market analysis',
    'customer insight',
    'value proposition',
    'what value are they seeking',
    'what do they want',
    'why they are not buying',
    "why they're not buying",
    'strategic messages',
    'message pillars',
    'messaging',
    'positioning',
    'strategic plan',
  ].filter((signal) => lower.includes(signal)).length

  if (strategySignalCount >= 2 && (lower.includes('research') || lower.includes('analysis') || lower.includes('audience'))) return 'research-brief'
  if (lower.includes('research') || lower.includes('competitor') || lower.includes('market analysis') || lower.includes('audience research')) return 'research-brief'
  if (lower.includes('campaign strategy')) return 'campaign-strategy'
  if (strategySignalCount >= 2 || lower.includes('strategy') || lower.includes('positioning') || lower.includes('messaging') || lower.includes('value proposition')) return 'strategy-brief'
  if (lower.includes('visual') || lower.includes('design') || lower.includes('creative asset') || lower.includes('artwork') || lower.includes('illustration') || lower.includes('nano banana') || lower.includes('mockup')) return 'creative-asset'
  if (lower.includes('brief')) return 'client-brief'
  if (/\b(create|draft|write|build|make|generate|prepare|design|plan|develop|analyse|analyze|audit|review|research|outline|summarize|summarise|propose|recommend|evaluate|compare|assess|optimize|optimise|launch|execute|schedule|set up|configure|map out|brainstorm|ideate|produce|compose|compile|format|restructure|rework|revamp|update|refresh|rephrase|rewrite|improve|enhance|craft)\b/.test(lower)) {
    return 'general-task'
  }
  return 'status-report'
}

function inferPipelineMetadata(deliverableType: Mission['deliverableType']) {
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

function inferDivision(agent: Partial<Agent> & Record<string, any>): Agent['division'] {
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

function normalizeAgent(agent: Partial<Agent> & Record<string, any>): Agent {
  const template = ALL_DEFAULT_AGENTS.find((item) => item.id === agent.id)
  const division = inferDivision({ ...template, ...agent })
  const provider = VALID_PROVIDERS.has(agent.provider as AIProvider)
    ? (agent.provider as AIProvider)
    : template?.provider || (String(agent.model || '').startsWith('gemini') ? 'gemini' : 'ollama')
  const model = (agent.model || template?.model || DEFAULT_PROVIDER_MODEL[provider]) as Agent['model']

  return {
    ...(template || {
      id: agent.id || uuidv4(),
      name: 'New Agent',
      role: 'Specialist',
      photoUrl: undefined,
      division,
      specialty: 'creative',
      unit: division,
      color: '#4f8ef7',
      accentColor: 'blue',
      avatar: 'bot-blue',
      systemPrompt: '',
      provider,
      model,
      temperature: 0.7,
      maxTokens: 1024,
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
    primaryOutputs: Array.isArray(agent.primaryOutputs) && agent.primaryOutputs.length
      ? agent.primaryOutputs
      : template?.primaryOutputs || ['status-report'],
    color: agent.color || template?.color || '#4f8ef7',
    photoUrl: typeof agent.photoUrl === 'string' ? agent.photoUrl : template?.photoUrl,
    accentColor: agent.accentColor || template?.accentColor || 'blue',
    avatar: agent.avatar || template?.avatar || 'bot-blue',
    name: agent.name || template?.name || 'New Agent',
    role: agent.role || template?.role || 'Specialist',
    bio: agent.bio || template?.bio || '',
    systemPrompt: agent.systemPrompt || template?.systemPrompt || '',
    methodology: agent.methodology || template?.methodology || '',
    temperature: typeof agent.temperature === 'number' ? agent.temperature : template?.temperature || 0.7,
    maxTokens: typeof agent.maxTokens === 'number' ? agent.maxTokens : template?.maxTokens || 1024,
    workload: typeof agent.workload === 'number' ? agent.workload : template?.workload,
    position: {
      x: typeof agent.position?.x === 'number' ? agent.position.x : template?.position.x || 300,
      y: typeof agent.position?.y === 'number' ? agent.position.y : template?.position.y || 220,
      room: division,
    },
  }
}

const DEFAULT_CLIENT_BRAND_KIT = {
  colors: [],
  fonts: [],
  visualKeywords: '',
  lookAndFeel: '',
  photoStyle: '',
  compositionRules: '',
  negativeRules: '',
  logos: [],
  templates: [],
  referenceImages: [],
  fontFiles: [],
}

function normalizePersistedState(persistedState: any) {
  if (!persistedState) return persistedState
  const agents = Array.isArray(persistedState.agents) ? persistedState.agents.map(normalizeAgent) : ALL_DEFAULT_AGENTS
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
        const leadAgentId = mission.leadAgentId || mission.assignedAgentId || mission.assignedAgentIds?.[0] || 'iris'
        const collaboratorAgentIds = Array.isArray(mission.collaboratorAgentIds) ? mission.collaboratorAgentIds.filter(Boolean) : []
        const assignedAgentIds = Array.isArray(mission.assignedAgentIds) && mission.assignedAgentIds.length
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
          progress: typeof mission.progress === 'number' ? mission.progress : mission.status === 'completed' ? 100 : 0,
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

const ALL_DEFAULT_AGENTS = CONFIG_AGENTS.map((agent) => ({
  ...agent,
  status: agent.id === 'iris' ? 'active' : agent.status,
  currentTask: agent.id === 'iris' ? 'Coordinating active missions across the agency' : agent.currentTask,
  lastActive: agent.lastActive || nowIso(),
  workload: typeof agent.workload === 'number' ? agent.workload : agent.id === 'iris' ? 76 : 0,
  tools: [...agent.tools],
  skills: [...agent.skills],
  responsibilities: [...agent.responsibilities],
  primaryOutputs: [...agent.primaryOutputs],
  position: { ...agent.position },
}))
const IRIS_AGENT = ALL_DEFAULT_AGENTS.find((agent) => agent.id === 'iris') || ALL_DEFAULT_AGENTS[0]

const INITIAL_CAMPAIGNS: Campaign[] = []

const INITIAL_MISSIONS: Mission[] = []

const INITIAL_ACTIVITIES: ActivityEntry[] = [
  {
    id: uuidv4(),
    agentId: 'iris',
    agentName: 'Iris',
    agentColor: '#a78bfa',
    action: 'routed launch narrative mission',
    detail: 'Assigned Sage and Maya to shape Victory Genomics messaging.',
    timestamp: nowIso(),
    type: 'started',
  },
  {
    id: uuidv4(),
    agentId: 'atlas',
    agentName: 'Atlas',
    agentColor: '#38bdf8',
    action: 'surfaced competitor intelligence',
    detail: 'Found recurring weak spots in panel-testing competitors versus whole-genome positioning.',
    timestamp: nowIso(),
    type: 'thinking',
  },
]

const INITIAL_ARTIFACTS: Artifact[] = []

const INITIAL_AGENCY_SETTINGS: AgencySettings = {
  agencyName: "Moe's Mission Control",
  defaultProvider: 'ollama',
  defaultModel: 'minimax-m2.7:cloud',
  themeMode: 'dark',
}

const INITIAL_PROVIDER_SETTINGS: ProviderSettings = DEFAULT_PROVIDER_SETTINGS

interface AgentsState {
  agents: Agent[]
  activities: ActivityEntry[]
  campaigns: Campaign[]
  clients: Client[]
  missions: Mission[]
  artifacts: Artifact[]
  agencySettings: AgencySettings
  providerSettings: ProviderSettings
  agentMemories: Record<string, AgentMemory>
  selectedAgentId: string | null
  editingAgentId: string | null
  isEditorOpen: boolean
  activeMissionId: string | null

  conversations: Conversation[]
  activeConversationId: string | null
  isIrisOpen: boolean
  chatStatus: 'idle' | 'thinking' | 'streaming' | 'error'
  appStateReady: boolean
  currentUser: AuthenticatedUser | null

  selectAgent: (id: string | null) => void
  openEditor: (id: string | null) => void
  closeEditor: () => void
  createAgent: (agent: Omit<Agent, 'id'>) => void
  updateAgent: (id: string, updates: Partial<Agent>) => void
  deleteAgent: (id: string) => void
  cloneAgent: (id: string) => void
  updateAgentStatus: (id: string, status: Agent['status']) => void
  updateAgentTask: (id: string, task: string) => void

  addActivity: (entry: Omit<ActivityEntry, 'id' | 'timestamp'>) => void
  clearActivities: () => void

  addCampaign: (campaign: Omit<Campaign, 'id'>) => void
  updateCampaign: (id: string, updates: Partial<Campaign>) => void
  deleteCampaign: (id: string) => void

  addClient: (client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateClient: (id: string, updates: Partial<Client>) => void
  deleteClient: (id: string) => void

  addMission: (mission: Omit<Mission, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateMission: (id: string, updates: Partial<Mission>) => void
  deleteMission: (id: string) => void
  setActiveMission: (id: string | null) => void
  createMissionFromPrompt: (prompt: string, options?: { clientId?: string; campaignId?: string; assignedAgentIds?: string[] }) => string
  addArtifact: (artifact: Omit<Artifact, 'id' | 'createdAt' | 'updatedAt'>) => string
  updateArtifact: (id: string, updates: Partial<Artifact>) => void

  updateAgencySettings: (updates: Partial<AgencySettings>) => void
  setThemeMode: (themeMode: ThemeMode) => void
  updateProviderSettings: (provider: keyof ProviderSettings, updates: Partial<ProviderSettings[keyof ProviderSettings]>) => void
  saveGeminiKey: (apiKey: string) => void
  hydrateAppState: (
    payload: Partial<Pick<AgentsState, 'agents' | 'campaigns' | 'clients' | 'missions' | 'artifacts' | 'agencySettings' | 'providerSettings' | 'agentMemories'>>
  ) => void
  hydrateAgentPhotos: (photos: Record<string, string>) => void
  rememberAgentWork: (
    agentId: string,
    note: {
      title: string
      summary: string
      clientId?: string
      campaignId?: string
      missionId?: string
      conversationId?: string
    }
  ) => void

  openIris: () => void
  closeIris: () => void
  setChatStatus: (status: AgentsState['chatStatus']) => void
  setAppStateReady: (ready: boolean) => void
  setAuthenticatedUser: (user: AuthenticatedUser | null) => void
  sendMessage: (conversationId: string, content: string, role?: 'user' | 'assistant', agentId?: string, meta?: ChatMessage['meta']) => void
  upsertAssistantDraft: (conversationId: string, content: string, agentId?: string, meta?: ChatMessage['meta']) => void
  createConversation: (title?: string) => string
  deleteConversation: (id: string) => void
  setActiveConversation: (id: string) => void
  updateConversationBriefing: (id: string, briefing: IrisConversationBriefing | null) => void
  addAssistantMessage: (conversationId: string, content: string, agentId?: string, meta?: ChatMessage['meta']) => void
  clearConversation: (id: string) => void
}

export const useAgentsStore = create<AgentsState>()(
  persist(
    (set, get) => ({
      agents: ALL_DEFAULT_AGENTS,
      activities: INITIAL_ACTIVITIES,
      campaigns: INITIAL_CAMPAIGNS,
      clients: DEFAULT_CLIENTS,
      missions: INITIAL_MISSIONS,
      artifacts: INITIAL_ARTIFACTS,
      agencySettings: INITIAL_AGENCY_SETTINGS,
      providerSettings: INITIAL_PROVIDER_SETTINGS,
      agentMemories: buildDefaultAgentMemories(ALL_DEFAULT_AGENTS),

      selectedAgentId: null,
      editingAgentId: null,
      isEditorOpen: false,
      activeMissionId: INITIAL_MISSIONS[0]?.id || null,

      conversations: [],
      activeConversationId: null,
      isIrisOpen: false,
      chatStatus: 'idle',
      appStateReady: false,
      currentUser: null,

      selectAgent: (id) => set({ selectedAgentId: id }),
      openEditor: (id) => set({ editingAgentId: id, isEditorOpen: true }),
      closeEditor: () => set({ isEditorOpen: false, editingAgentId: null }),

      createAgent: (agentData) => {
        const newAgent: Agent = { ...agentData, id: uuidv4(), lastActive: agentData.lastActive || nowIso() }
        set((state) => ({
          agents: [...state.agents, newAgent],
          activities: [
            {
              id: uuidv4(),
              agentId: newAgent.id,
              agentName: newAgent.name,
              agentColor: newAgent.color,
              action: 'joined the agency',
              timestamp: nowIso(),
              type: 'idle',
            },
            ...state.activities,
          ],
        }))
      },

      updateAgent: (id, updates) =>
        set((state) => ({
          agents: state.agents.map((agent) => (agent.id === id ? { ...agent, ...updates } : agent)),
        })),

      deleteAgent: (id) =>
        set((state) => ({
          agents: state.agents.filter((agent) => agent.id !== id),
          selectedAgentId: state.selectedAgentId === id ? null : state.selectedAgentId,
          missions: state.missions.map((mission) => ({
            ...mission,
            assignedAgentIds: mission.assignedAgentIds.filter((agentId) => agentId !== id),
          })),
        })),

      cloneAgent: (id) => {
        const original = get().agents.find((agent) => agent.id === id)
        if (!original) return
        const clone: Agent = {
          ...original,
          id: uuidv4(),
          name: `${original.name} (Copy)`,
          status: 'idle',
          currentTask: undefined,
          lastActive: undefined,
        }
        set((state) => ({ agents: [...state.agents, clone] }))
      },

      updateAgentStatus: (id, status) =>
        set((state) => ({
          agents: state.agents.map((agent) => (agent.id === id ? { ...agent, status } : agent)),
        })),

      updateAgentTask: (id, task) =>
        set((state) => ({
          agents: state.agents.map((agent) =>
            agent.id === id ? { ...agent, currentTask: task, lastActive: nowIso() } : agent
          ),
        })),

      addActivity: (entry) =>
        set((state) => ({
          activities: [{ ...entry, id: uuidv4(), timestamp: nowIso() }, ...state.activities].slice(0, 60),
        })),

      clearActivities: () => set({ activities: [] }),

      addCampaign: (campaign) =>
        set((state) => ({ campaigns: [...state.campaigns, { ...campaign, id: uuidv4() }] })),

      updateCampaign: (id, updates) =>
        set((state) => ({
          campaigns: state.campaigns.map((campaign) => (campaign.id === id ? { ...campaign, ...updates } : campaign)),
        })),

      deleteCampaign: (id) =>
        set((state) => ({
          campaigns: state.campaigns.filter((campaign) => campaign.id !== id),
          missions: state.missions.filter((mission) => mission.campaignId !== id),
        })),

      addClient: (clientData) => {
        const now = nowIso()
        const normalizedBrandKit = Object.assign({}, DEFAULT_CLIENT_BRAND_KIT, clientData.brandKit || {})
        const client: Client = {
          ...clientData,
          brandKit: normalizedBrandKit,
          ownerUserId: clientData.ownerUserId || get().currentUser?.id,
          id: uuidv4(),
          createdAt: now,
          updatedAt: now,
        }
        set((state) => ({ clients: [...state.clients, client] }))
      },

      updateClient: (id, updates) =>
        set((state) => ({
          clients: state.clients.map((client) =>
            client.id === id ? { ...client, ...updates, updatedAt: nowIso() } : client
          ),
        })),

      deleteClient: (id) =>
        set((state) => ({
          clients: state.clients.filter((client) => client.id !== id),
          campaigns: state.campaigns.filter((campaign) => campaign.clientId !== id),
          missions: state.missions.filter((mission) => mission.clientId !== id),
        })),

      addMission: (missionData) => {
        const mission: Mission = {
          ...missionData,
          ownerUserId: missionData.ownerUserId || get().currentUser?.id,
          id: uuidv4(),
          createdAt: nowIso(),
          updatedAt: nowIso(),
        }
        set((state) => ({ missions: [mission, ...state.missions], activeMissionId: mission.id }))
      },

      updateMission: (id, updates) =>
        set((state) => ({
          missions: state.missions.map((mission) =>
            mission.id === id ? { ...mission, ...updates, updatedAt: nowIso() } : mission
          ),
        })),

      deleteMission: (id) =>
        set((state) => ({
          missions: state.missions.filter((mission) => mission.id !== id),
          artifacts: state.artifacts.filter((artifact) => artifact.missionId !== id),
          activeMissionId: state.activeMissionId === id ? null : state.activeMissionId,
        })),

      setActiveMission: (id) => set({ activeMissionId: id }),

      createMissionFromPrompt: (prompt, options) => {
        const deliverableType = inferMissionDeliverableType(prompt)
        const pipeline = inferPipelineMetadata(deliverableType)
        const title = buildTaskTitleFromRequest(prompt, deliverableType)
        const missionId = uuidv4()
        const assignedAgentIds = options?.assignedAgentIds?.length ? options.assignedAgentIds : ['iris']
        const mission: Mission = {
          id: missionId,
          ownerUserId: get().currentUser?.id,
          title,
          summary: prompt,
          deliverableType,
          status: 'queued',
          priority: 'medium',
          campaignId: options?.campaignId,
          clientId: options?.clientId,
          pipelineId: pipeline.pipelineId || undefined,
          pipelineName: pipeline.pipelineName || undefined,
          assignedAgentIds,
          reviewComments: [],
          reviewStatus: 'pending',
          runtimeMode: get().providerSettings.routing.runtimeMode,
          assignedBy: 'iris',
          createdAt: nowIso(),
          updatedAt: nowIso(),
          progress: 0,
        }
        set((state) => ({
          missions: [mission, ...state.missions],
          activeMissionId: missionId,
          activities: [
            {
              id: uuidv4(),
              agentId: 'iris',
              agentName: 'Iris',
              agentColor: IRIS_AGENT.color,
              action: 'opened a new mission',
              detail: title,
              timestamp: nowIso(),
              type: 'started' as const,
            },
            ...state.activities,
          ].slice(0, 60),
        }))
        return missionId
      },

      addArtifact: (artifactData) => {
        const id = uuidv4()
        const now = nowIso()
        const artifact: Artifact = {
          ...artifactData,
          ownerUserId: artifactData.ownerUserId || get().currentUser?.id,
          id,
          createdAt: now,
          updatedAt: now,
        }
        set((state) => ({
          artifacts: [artifact, ...state.artifacts],
          missions: artifact.missionId
            ? state.missions.map((mission) =>
                mission.id === artifact.missionId
                  ? {
                      ...mission,
                      updatedAt: now,
                      progress: Math.max(mission.progress || 0, 88),
                    }
                  : mission
              )
            : state.missions,
        }))
        return id
      },

      updateArtifact: (id, updates) =>
        set((state) => {
          const now = nowIso()
          const existing = state.artifacts.find((artifact) => artifact.id === id)
          const nextArtifacts = state.artifacts.map((artifact) =>
            artifact.id === id ? { ...artifact, ...updates, updatedAt: now } : artifact
          )

          return {
            artifacts: nextArtifacts,
            missions:
              existing?.missionId
                ? state.missions.map((mission) =>
                    mission.id === existing.missionId
                      ? {
                          ...mission,
                          updatedAt: now,
                          progress: Math.max(mission.progress || 0, 88),
                        }
                      : mission
                  )
                : state.missions,
          }
        }),

      updateAgencySettings: (updates) =>
        set((state) => ({ agencySettings: { ...state.agencySettings, ...updates } })),

      setThemeMode: (themeMode) =>
        set((state) => ({ agencySettings: { ...state.agencySettings, themeMode } })),

      updateProviderSettings: (provider, updates) =>
        set((state) => ({
          providerSettings: {
            ...state.providerSettings,
            [provider]: { ...state.providerSettings[provider], ...updates } as ProviderSettings[typeof provider],
          },
        })),

      saveGeminiKey: (apiKey) =>
        set((state) => ({
          providerSettings: {
            ...state.providerSettings,
            gemini: {
              ...(state.providerSettings.gemini as GeminiSettings),
              apiKey,
              maskedKey: maskApiKey(apiKey),
            },
          },
        })),

      hydrateAppState: (payload) =>
        set((state) => {
          const normalized = normalizePersistedState({
            ...createRemoteAppPersistenceSnapshot(state),
            ...payload,
          })

          return {
            agents: normalized.agents || state.agents,
            campaigns: normalized.campaigns || state.campaigns,
            clients: normalized.clients || state.clients,
            missions: normalized.missions || state.missions,
            artifacts: normalized.artifacts || state.artifacts,
            conversations: state.conversations,
            agencySettings: normalized.agencySettings ? { ...state.agencySettings, ...normalized.agencySettings } : state.agencySettings,
            providerSettings: normalized.providerSettings
              ? normalizeProviderSettings({
                  ...state.providerSettings,
                  ...normalized.providerSettings,
                  routing: { ...state.providerSettings.routing, ...normalized.providerSettings.routing },
                  ollama: { ...state.providerSettings.ollama, ...normalized.providerSettings.ollama },
                  gemini: {
                    ...state.providerSettings.gemini,
                    ...normalized.providerSettings.gemini,
                    apiKey: normalized.providerSettings.gemini?.apiKey || state.providerSettings.gemini.apiKey || '',
                    maskedKey:
                      normalized.providerSettings.gemini?.maskedKey || state.providerSettings.gemini.maskedKey || '',
                  },
                  visual: { ...state.providerSettings.visual, ...normalized.providerSettings.visual },
                  mcp: {
                    ...state.providerSettings.mcp,
                    ...normalized.providerSettings.mcp,
                  },
                })
              : state.providerSettings,
            agentMemories: normalized.agentMemories
              ? mergeAgentMemories(normalized.agentMemories, normalized.agents || state.agents)
              : state.agentMemories,
            appStateReady: true,
          }
        }),

      hydrateAgentPhotos: (photos) =>
        set((state) => ({
          agents: state.agents.map((agent) =>
            ({ ...agent, photoUrl: photos[agent.id] || undefined })
          ),
        })),

      rememberAgentWork: (agentId, note) =>
        set((state) => ({
          agentMemories: appendAgentMemoryNote(state.agentMemories, agentId, note),
        })),

      openIris: () => {
        const state = get()
        let convId = state.activeConversationId
        const hasConversation = convId ? state.conversations.some((conversation) => conversation.id === convId) : false
        if (!convId || !hasConversation) convId = get().createConversation('Chat with Iris')
        set({ isIrisOpen: true, activeConversationId: convId })
      },

      closeIris: () => set({ isIrisOpen: false }),
      setChatStatus: (status) => set({ chatStatus: status }),
      setAppStateReady: (ready) => set({ appStateReady: ready }),
      setAuthenticatedUser: (user) => set({ currentUser: user }),

      createConversation: (title = 'New Chat') => {
        const id = uuidv4()
        const conversation: Conversation = {
          id,
          ownerUserId: get().currentUser?.id,
          title,
          messages: [],
          briefing: null,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        }
        set((state) => ({ conversations: [conversation, ...state.conversations], activeConversationId: id }))
        return id
      },

      deleteConversation: (id) =>
        set((state) => {
          const remaining = state.conversations.filter((conversation) => conversation.id !== id)
          return {
            conversations: remaining,
            activeConversationId: state.activeConversationId === id ? remaining[0]?.id || null : state.activeConversationId,
          }
        }),

      setActiveConversation: (id) =>
        set((state) => {
          const hasConversation = state.conversations.some((conversation) => conversation.id === id)
          if (!hasConversation) return state
          return { ...state, activeConversationId: id, isIrisOpen: true }
        }),

      updateConversationBriefing: (id, briefing) =>
        set((state) => ({
          conversations: state.conversations.map((conversation) =>
            conversation.id === id
              ? { ...conversation, briefing, updatedAt: nowIso() }
              : conversation
          ),
        })),

      sendMessage: (conversationId, content, role = 'user', agentId, meta) => {
        const message: ChatMessage = { id: uuidv4(), role, content, timestamp: nowIso(), agentId, meta }
        set((state) => ({
          conversations: state.conversations.map((conversation) => {
            if (conversation.id !== conversationId) return conversation
            const isFirstUserTurn = role === 'user' && !conversation.messages.some((item) => item.role === 'user')
            return {
              ...conversation,
              title:
                isFirstUserTurn && (!conversation.title || conversation.title === 'New Chat' || conversation.title === 'Chat with Iris')
                  ? content.slice(0, 42)
                  : conversation.title,
              messages: [...conversation.messages, message],
              updatedAt: nowIso(),
            }
          }),
        }))
      },

      upsertAssistantDraft: (conversationId, content, agentId, meta) =>
        set((state) => ({
          conversations: state.conversations.map((conversation) => {
            if (conversation.id !== conversationId) return conversation
            const messages = [...conversation.messages]
            const lastMessage = messages[messages.length - 1]
            if (lastMessage?.role === 'assistant' && lastMessage.id === 'draft') {
              messages[messages.length - 1] = { ...lastMessage, content, timestamp: nowIso(), meta }
            } else {
              messages.push({ id: 'draft', role: 'assistant', content, timestamp: nowIso(), agentId, meta })
            }
            return { ...conversation, messages, updatedAt: nowIso() }
          }),
        })),

      addAssistantMessage: (conversationId, content, agentId, meta) =>
        set((state) => ({
          conversations: state.conversations.map((conversation) => {
            if (conversation.id !== conversationId) return conversation
            const messages = conversation.messages
              .filter((message) => message.id !== 'draft')
              .concat({ id: uuidv4(), role: 'assistant', content, timestamp: nowIso(), agentId, meta })
            return { ...conversation, messages, updatedAt: nowIso() }
          }),
        })),

      clearConversation: (id) =>
        set((state) => ({
          conversations: state.conversations.map((conversation) =>
            conversation.id === id ? { ...conversation, messages: [], briefing: null } : conversation
          ),
        })),
    }),
    {
      name: 'moes-mission-control',
      version: 7,
      migrate: (persistedState: any, version) => {
        if (!persistedState) return persistedState
        if (version < 2) {
          return normalizePersistedState({
            ...persistedState,
            clients: DEFAULT_CLIENTS,
            campaigns: INITIAL_CAMPAIGNS,
            missions: INITIAL_MISSIONS,
          })
        }
        if (version < 5) {
          return normalizePersistedState({
            ...persistedState,
            campaigns: Array.isArray(persistedState.campaigns)
              ? persistedState.campaigns.filter((campaign: Campaign) => !SEEDED_CAMPAIGN_IDS.has(campaign.id))
              : INITIAL_CAMPAIGNS,
            missions: Array.isArray(persistedState.missions)
              ? persistedState.missions.filter((mission: Mission) => !SEEDED_MISSION_IDS.has(mission.id))
              : INITIAL_MISSIONS,
            artifacts: Array.isArray(persistedState.artifacts)
              ? persistedState.artifacts.filter((artifact: Artifact) => !SEEDED_ARTIFACT_IDS.has(artifact.id))
              : INITIAL_ARTIFACTS,
          })
        }
        if (version < 7) {
          return normalizePersistedState(persistedState)
        }
        return normalizePersistedState(persistedState)
      },
      partialize: (state) => ({
        ...createLocalPersistenceSnapshot(state),
      }),
    }
  )
)
