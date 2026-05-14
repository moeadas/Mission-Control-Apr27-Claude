/**
 * Persistence-layer type definitions.
 *
 * Lifted out of `src/lib/agents-store.ts` so consumers that only need the
 * types (e.g. `/api/state` route, ClientShell sync logic) don't have to
 * import the entire Zustand store. The store re-exports these for
 * back-compat so existing call sites continue to work unchanged.
 */

import type {
  ActivityEntry,
  Agent,
  Artifact,
  AgencySettings,
  AIProvider,
  ArtifactExecutionStep,
  Campaign,
  CreativeArtifactSpec,
  Mission,
  ProviderSettings,
} from '@/lib/types'
import type { Client } from '@/lib/client-data'
import type { AgentMemory } from '@/lib/agent-memory'

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
    action?: {
      type: 'CREATE_CLIENT'
      draft: Record<string, any>
      missingFields: string[]
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

/**
 * The shape that ClientShell sends to `/api/state` and that the store
 * hydrates from on startup. Every field corresponds to one Zustand slice.
 */
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
