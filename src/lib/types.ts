export type ThemeMode = 'dark' | 'light'
export type AgentStatus = 'active' | 'idle' | 'paused'
export type BotAnimation = 'idle' | 'working' | 'thinking' | 'resting' | 'alert'

export type AgencyDivision =
  | 'orchestration'
  | 'client-services'
  | 'creative'
  | 'media'
  | 'research'
  | 'strategy'
  | 'analytics'
  | 'communications'
  | 'production'

export type AgentSpecialty =
  | 'strategy'
  | 'creative'
  | 'design'
  | 'copy'
  | 'project-management'
  | 'client-services'
  | 'media-planning'
  | 'performance'
  | 'client'
  | 'seo'
  | 'research'
  | 'data-analytics'
  | 'communications'
  | 'content-production'
  | 'event-management'
  | 'operations'
  | 'ux-design'
  | 'brand'

export type AIProvider = 'ollama' | 'gemini' | 'anthropic' | 'openai'
export type ProviderFallback = AIProvider | 'none'
export type ProviderRuntimeMode = 'fast' | 'thinking' | 'compare'
export type ImageProvider = 'gemini'

export type AgentModel =
  | 'llama3.2:latest'
  | 'llama3.1:latest'
  | 'glm-5.1:cloud'
  | 'minimax-m2.7:cloud'
  | 'gemini-2.5-flash'
  | 'gemini-2.5-pro'
  | 'gemini-2.0-flash'
  | 'gemini-2.0-flash-exp'
  | 'gemini-1.5-flash'
  | 'gemini-1.5-pro'
  | 'gemini-1.0-pro'
  | 'claude-opus-4-5'
  | 'claude-sonnet-4-5'
  | 'claude-haiku-4-5'
  | 'gpt-4o'
  | 'gpt-4o-mini'
  | 'gpt-4-turbo'
  | (string & {})

export interface ProviderOption {
  id: AgentModel
  label: string
  provider: AIProvider
}

export type DeliverableType =
  | 'content-calendar'
  | 'campaign-copy'
  | 'short-form-copy'
  | 'email-campaign'
  | 'blog-article'
  | 'website-copy'
  | 'video-script'
  | 'presentation'
  | 'client-brief'
  | 'strategy-brief'
  | 'campaign-strategy'
  | 'brand-guidelines'
  | 'research-brief'
  | 'seo-audit'
  | 'data-analysis'
  | 'creative-asset'
  | 'ui-audit'
  | 'pr-comms'
  | 'event-plan'
  | 'media-plan'
  | 'budget-sheet'
  | 'kpi-forecast'
  | 'general-task'
  | 'status-report'

export type DeliverableCategory =
  | 'content'
  | 'strategy'
  | 'research'
  | 'creative'
  | 'technical'
  | 'operations'
  | 'communications'
  | 'analytics'

export type DeliverableComplexity = 'low' | 'medium' | 'high'
export type ChannelingConfidence = 'high' | 'medium' | 'low'

export interface Agent {
  id: string
  name: string
  role: string
  photoUrl?: string
  division: AgencyDivision
  specialty: AgentSpecialty
  unit: AgencyDivision
  color: string
  accentColor: string
  avatar: string
  systemPrompt: string
  provider: AIProvider
  model: AgentModel
  temperature: number
  maxTokens: number
  tools: string[]
  skills: string[]
  responsibilities: string[]
  handoffs?: {
    receivesFrom: string[]
    sendsTo: string[]
  }
  primaryOutputs: DeliverableType[]
  qualityCheckpoints?: string[]
  status: AgentStatus
  currentTask?: string
  lastActive?: string
  workload?: number
  position: {
    x: number
    y: number
    room: string
  }
  bio: string
  methodology: string
}

export interface ActivityEntry {
  id: string
  agentId: string
  agentName: string
  agentColor: string
  action: string
  detail?: string
  timestamp: string
  type: 'started' | 'completed' | 'thinking' | 'error' | 'idle'
}

export interface Campaign {
  id: string
  name: string
  clientId: string
  status: 'draft' | 'planning' | 'active' | 'review' | 'completed' | 'paused' | 'archived'
  agents: string[]
  progress: number
  dueDate?: string
  description?: string
}

export interface AgentTemplate {
  id: string
  name: string
  role: string
  photoUrl?: string
  division: AgencyDivision
  specialty: AgentSpecialty
  unit: AgencyDivision
  color: string
  accentColor: string
  avatar: string
  bio: string
  methodology: string
  systemPrompt: string
  provider: AIProvider
  model: AgentModel
  temperature: number
  maxTokens: number
  tools: string[]
  skills: string[]
  responsibilities: string[]
  handoffs?: {
    receivesFrom: string[]
    sendsTo: string[]
  }
  primaryOutputs: DeliverableType[]
  qualityCheckpoints?: string[]
}

export interface OfficeRoom {
  id: string
  name: string
  color: string
  agents: string[]
}

export type MissionStatus = 'queued' | 'in_progress' | 'blocked' | 'review' | 'paused' | 'cancelled' | 'completed'
export type MissionPriority = 'low' | 'medium' | 'high'

export interface MissionReviewComment {
  id: string
  comment: string
  author: string
  createdAt: string
  status: 'open' | 'addressed'
}

export interface Mission {
  id: string
  ownerUserId?: string
  title: string
  summary: string
  deliverableType: DeliverableType
  status: MissionStatus
  priority: MissionPriority
  complexity?: DeliverableComplexity
  channelingConfidence?: ChannelingConfidence
  campaignId?: string
  clientId?: string
  assignedAgentIds: string[]
  leadAgentId?: string
  collaboratorAgentIds?: string[]
  pipelineId?: string
  pipelineName?: string
  skillAssignments?: Record<string, string[]>
  orchestrationTrace?: string[]
  qualityChecklist?: string[]
  handoffNotes?: string
  reviewComments?: MissionReviewComment[]
  reviewStatus?: 'pending' | 'changes_requested' | 'approved'
  runtimeMode?: ProviderRuntimeMode
  compareSummary?: {
    enabled: boolean
    selectedProvider?: AIProvider
    selectedModel?: string
    alternateProvider?: AIProvider
    alternateModel?: string
    selectedScore?: number
    alternateScore?: number
  }
  assignedBy: string
  createdAt: string
  updatedAt: string
  dueDate?: string
  progress: number
}

export type ArtifactStatus = 'draft' | 'ready' | 'delivered'
export type ArtifactFormat =
  | 'html'
  | 'markdown'
  | 'docx'
  | 'pdf'
  | 'pptx'
  | 'xlsx'
  | 'csv'
  | 'json'
  | 'text'
  | 'image'
  | 'link'

export interface ArtifactExport {
  id: string
  format: Extract<ArtifactFormat, 'docx' | 'pdf' | 'pptx' | 'xlsx' | 'csv' | 'image'>
  fileName: string
  path: string
  publicUrl: string
  createdAt: string
  notes?: string
}

export interface CreativeArtifactSpec {
  assetType:
    | 'social-post'
    | 'carousel'
    | 'story'
    | 'ad-creative'
    | 'hero-image'
    | 'deck-visual'
    | 'infographic'
    | 'banner'
    | 'display-ad'
    | 'video-thumbnail'
    | 'email-header'
    | 'logo-mark'
    | 'illustration'
    | 'other'
  visualDirection: string
  imagePrompt: string
  aspectRatio: '1:1' | '4:5' | '16:9' | '9:16' | 'custom'
  referenceNotes?: string
  deliverableSpecs: string[]
  assetUrl?: string
  assetPath?: string
}

export interface ArtifactExecutionStep {
  id: string
  agentId: string
  agentName: string
  role: 'support' | 'lead' | 'quality'
  title: string
  summary: string
  status?: 'completed' | 'warning' | 'failed'
  createdAt?: string
  skillsUsed?: string[]
  phaseId?: string
  phaseName?: string
  activityId?: string
  outputIds?: string[]
  provider?: AIProvider
  model?: string
  qualityIssues?: string[]
}

export interface Artifact {
  id: string
  ownerUserId?: string
  title: string
  deliverableType: DeliverableType
  status: ArtifactStatus
  format: ArtifactFormat
  content?: string
  renderedHtml?: string
  sourcePrompt?: string
  path?: string
  link?: string
  notes?: string
  clientId?: string
  campaignId?: string
  missionId?: string
  agentId?: string
  exports?: ArtifactExport[]
  creative?: CreativeArtifactSpec
  executionSteps?: ArtifactExecutionStep[]
  createdAt: string
  updatedAt: string
}

export type TaskRunStatus = 'queued' | 'in_progress' | 'completed' | 'failed' | 'blocked' | 'cancelled'

export interface TaskRunRecord {
  id: string
  taskId: string
  agentId?: string
  stage: string
  status: TaskRunStatus
  inputPayload?: Record<string, any>
  outputPayload?: Record<string, any>
  errorMessage?: string
  startedAt?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
}

export interface WorkflowExecutionRecord {
  id: string
  taskId: string
  pipelineId?: string
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled'
  currentPhase?: string
  progress: number
  context?: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface ProviderSetting {
  enabled: boolean
  verified: boolean
  verifiedAt?: string
  model?: string
}

export interface ProviderRoutingSettings {
  primaryProvider: AIProvider
  fallbackProvider: ProviderFallback
  useGeminiForThinking: boolean
  runtimeMode: ProviderRuntimeMode
  /**
   * Per-provider override for content-task generation (calendars, posts,
   * captions, blog articles, etc.). When unset, the runtime falls back to
   * the global defaults defined in `provider-settings.ts`. The Settings UI
   * exposes these as advanced fields so super-admins can pick a different
   * model without editing code.
   */
  contentModels?: {
    ollama?: string
    gemini?: string
    anthropic?: string
    openai?: string
  }
}

export interface OllamaSettings extends ProviderSetting {
  baseUrl: string
  apiKey?: string       // for Ollama Cloud authenticated access
  maskedKey?: string
  availableModels: string[]
  contextWindow?: number
}

export interface GeminiSettings extends ProviderSetting {
  apiKey: string
  maskedKey: string
  availableModels: string[]
}

export interface AnthropicSettings extends ProviderSetting {
  apiKey: string
  maskedKey: string
  model?: string
  availableModels: string[]
}

export interface OpenAISettings extends ProviderSetting {
  apiKey: string
  maskedKey: string
  model?: string
  availableModels: string[]
  baseUrl?: string  // for OpenAI-compatible endpoints (Groq, Together, etc.)
}

export interface VisualGenerationSettings extends ProviderSetting {
  provider: ImageProvider
  model: string
  availableModels: string[]
  strictBrandMode: boolean
  useReferenceImages: boolean
  saveGeneratedAssets: boolean
}

export interface MCPConnectorSettings {
  enabled: boolean
  endpoint: string
  verifiedAt?: string
}

export interface MCPSettings {
  browserInspector: MCPConnectorSettings
  seoCrawler: MCPConnectorSettings
  searchConsole: MCPConnectorSettings
  accessibilityProbe: MCPConnectorSettings
}

export interface MetaAdsSettings {
  enabled: boolean
  verified: boolean
  verifiedAt?: string
  accessToken: string
  maskedToken?: string
  adAccountId: string   // e.g. "act_123456789"
  businessId?: string
  primaryMarket?: string
}

export interface HiggsFieldSettings {
  enabled: boolean
  verified: boolean
  verifiedAt?: string
  apiKey: string
  maskedKey?: string
  workspaceId?: string  // optional — defaults to first available workspace
}

export interface SerperSearchSettings {
  enabled: boolean
  verified: boolean
  verifiedAt?: string
  apiKey: string
  maskedKey?: string
  country: string
  language: string
  resultCount: number
  testQuery?: string
}

export interface ProviderSettings {
  routing: ProviderRoutingSettings
  ollama: OllamaSettings
  gemini: GeminiSettings
  anthropic: AnthropicSettings
  openai: OpenAISettings
  visual: VisualGenerationSettings
  mcp: MCPSettings
  meta?: MetaAdsSettings
  higgsfield?: HiggsFieldSettings
  serper?: SerperSearchSettings
}

export interface AgencySettings {
  agencyName: string
  defaultProvider: AIProvider
  defaultModel: AgentModel
  themeMode: ThemeMode
  onboardingComplete?: boolean
  onboardingStep?: number
}
