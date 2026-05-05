import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuidv4 } from 'uuid'
import {
  ActivityEntry,
  Artifact,
  AgencySettings,
  Agent,
  AIProvider,
  Campaign,
  GeminiSettings,
  Mission,
  ProviderSettings,
  ThemeMode,
} from './types'
import type { Client } from './client-data'
import { maskApiKey } from './providers'
import { normalizeProviderSettings } from './provider-settings'
import { AgentMemory, appendAgentMemoryNote, buildDefaultAgentMemories, mergeAgentMemories } from './agent-memory'
import { buildTaskTitleFromRequest } from './task-output'

// ──────────────────────────────────────────────────────────────────────────
//  Persistence types live in a dedicated module so /api/state and ClientShell
//  don't have to import the entire Zustand store. Re-exported here for
//  back-compat — every existing import of these from '@/lib/agents-store'
//  continues to work.
// ──────────────────────────────────────────────────────────────────────────
export type {
  ChatMessage,
  IrisBriefField,
  IrisConversationBriefing,
  Conversation,
  AuthenticatedUser,
  AppPersistenceSnapshot,
  AppPersistencePatch,
  EntityCollectionKey,
  EntityDeltaPatch,
} from './types/persistence'
import type {
  AppPersistenceSnapshot,
  AuthenticatedUser,
  ChatMessage,
  Conversation,
  IrisBriefField,
  IrisConversationBriefing,
} from './types/persistence'

// ──────────────────────────────────────────────────────────────────────────
//  Defaults + normalizers live in dedicated modules. Re-exported here for
//  back-compat (createAppPersistenceSnapshot, createRemoteAppPersistenceSnapshot
//  are imported by ClientShell and IrisChat).
// ──────────────────────────────────────────────────────────────────────────
export {
  createAppPersistenceSnapshot,
  createRemoteAppPersistenceSnapshot,
} from './agents-store/normalizers'
import {
  createLocalPersistenceSnapshot,
  createRemoteAppPersistenceSnapshot,
  normalizePersistedState,
} from './agents-store/normalizers'
import {
  ALL_DEFAULT_AGENTS,
  IRIS_AGENT,
  INITIAL_ACTIVITIES,
  INITIAL_AGENCY_SETTINGS,
  INITIAL_ARTIFACTS,
  INITIAL_CAMPAIGNS,
  INITIAL_MISSIONS,
  INITIAL_PROVIDER_SETTINGS,
  DEFAULT_CLIENT_BRAND_KIT,
  SEEDED_ARTIFACT_IDS,
  SEEDED_CAMPAIGN_IDS,
  SEEDED_MISSION_IDS,
  nowIso,
} from './agents-store/defaults'
import { DEFAULT_CLIENTS } from './client-data'

// Deliverable + pipeline inference is delegated to the canonical classifier
// so the store, chat route, IrisChat, and the standalone pipeline runner all
// agree on what a request actually is. These thin wrappers keep existing
// call sites unchanged.
import {
  inferDeliverableType as canonicalInferDeliverableType,
  inferPipelineMetadataForDeliverable,
} from '@/lib/intents/intent-classifier'

function inferMissionDeliverableType(prompt: string): Mission['deliverableType'] {
  return canonicalInferDeliverableType(prompt)
}

function inferPipelineMetadata(deliverableType: Mission['deliverableType']) {
  return inferPipelineMetadataForDeliverable(deliverableType)
}

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
