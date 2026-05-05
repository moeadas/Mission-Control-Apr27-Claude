/**
 * Seed constants and validation sets for the persistence layer.
 *
 * Pulled out of `src/lib/agents-store.ts` so the store file stays focused
 * on Zustand state + actions. These are pure data — no React, no Zustand,
 * no IO — and can be reused by tests and migration scripts without
 * dragging in the whole store.
 */

import { v4 as uuidv4 } from 'uuid'

import { CONFIG_AGENTS } from '@/lib/agents-from-config'
import type { ActivityEntry, Agent, Artifact, AgencySettings, AIProvider, Campaign, Mission, ProviderSettings } from '@/lib/types'
import { DEFAULT_PROVIDER_SETTINGS } from '@/lib/provider-settings'

export const nowIso = () => new Date().toISOString()

export const DEFAULT_PROVIDER_MODEL: Record<AIProvider, Agent['model']> = {
  ollama: 'llama3.2:latest',
  gemini: 'gemini-2.5-flash',
}

export const VALID_DIVISIONS = new Set<Agent['division']>([
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

export const VALID_SPECIALTIES = new Set<Agent['specialty']>([
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

export const VALID_STATUSES = new Set<Agent['status']>(['active', 'idle', 'paused'])
export const VALID_PROVIDERS = new Set<AIProvider>(['ollama', 'gemini'])
export const VALID_MISSION_STATUSES = new Set<Mission['status']>([
  'queued',
  'in_progress',
  'blocked',
  'review',
  'paused',
  'cancelled',
  'completed',
])
export const VALID_MISSION_PRIORITIES = new Set<Mission['priority']>(['low', 'medium', 'high'])

/**
 * Migration cleanups — old persisted snapshots may carry these IDs from
 * pre-Supabase seed data; the migration routine in normalizers.ts strips
 * them so they don't drift back in via local persistence.
 */
export const SEEDED_CAMPAIGN_IDS = new Set(['campaign-1', 'campaign-2'])
export const SEEDED_MISSION_IDS = new Set(['mission-1', 'mission-2', 'mission-3'])
export const SEEDED_ARTIFACT_IDS = new Set(['artifact-1'])

export const DEFAULT_CLIENT_BRAND_KIT = {
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

/**
 * Seed every agent with sensible runtime defaults. Iris is special: she
 * starts active with a current task so the office-floor view doesn't show
 * her dormant before any user action.
 */
export const ALL_DEFAULT_AGENTS: Agent[] = CONFIG_AGENTS.map((agent) => ({
  ...agent,
  status: agent.id === 'iris' ? 'active' : agent.status,
  currentTask:
    agent.id === 'iris'
      ? 'Coordinating active missions across the agency'
      : agent.currentTask,
  lastActive: agent.lastActive || nowIso(),
  workload: typeof agent.workload === 'number' ? agent.workload : agent.id === 'iris' ? 76 : 0,
  tools: [...agent.tools],
  skills: [...agent.skills],
  responsibilities: [...agent.responsibilities],
  primaryOutputs: [...agent.primaryOutputs],
  position: { ...agent.position },
}))

export const IRIS_AGENT: Agent =
  ALL_DEFAULT_AGENTS.find((agent) => agent.id === 'iris') || ALL_DEFAULT_AGENTS[0]

export const INITIAL_CAMPAIGNS: Campaign[] = []
export const INITIAL_MISSIONS: Mission[] = []
export const INITIAL_ARTIFACTS: Artifact[] = []

export const INITIAL_ACTIVITIES: ActivityEntry[] = [
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
    detail:
      'Found recurring weak spots in panel-testing competitors versus whole-genome positioning.',
    timestamp: nowIso(),
    type: 'thinking',
  },
]

export const INITIAL_AGENCY_SETTINGS: AgencySettings = {
  agencyName: "Moe's Mission Control",
  defaultProvider: 'ollama',
  defaultModel: 'minimax-m2.7:cloud',
  themeMode: 'dark',
  onboardingComplete: false,
  onboardingStep: 0,
}

export const INITIAL_PROVIDER_SETTINGS: ProviderSettings = DEFAULT_PROVIDER_SETTINGS
