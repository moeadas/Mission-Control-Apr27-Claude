import { Agent } from './types'

export interface MemoryNote {
  id: string
  title: string
  summary: string
  createdAt: string
  clientId?: string
  campaignId?: string
  missionId?: string
  conversationId?: string
}

export interface AgentMemory {
  agentId: string
  roleSummary: string
  userPreferences: string[]
  workingMemory: string[]
  recentWork: MemoryNote[]
  lastUpdated: string
}

function inferRoleSummary(agent: Agent) {
  return `${agent.name} is the ${agent.role} for the ${agent.division} division. Primary outputs: ${agent.primaryOutputs.join(
    ', '
  )}. Key skills: ${agent.skills.join(', ') || 'general agency support'}.`
}

export function buildDefaultAgentMemories(agents: Agent[]): Record<string, AgentMemory> {
  const now = new Date().toISOString()

  return Object.fromEntries(
    agents.map((agent) => [
      agent.id,
      {
        agentId: agent.id,
        roleSummary: inferRoleSummary(agent),
        userPreferences:
          agent.id === 'iris' ? ['The user prefers short, precise answers unless they explicitly ask for more detail.'] : [],
        workingMemory: agent.currentTask ? [agent.currentTask] : [],
        recentWork: [],
        lastUpdated: now,
      },
    ])
  )
}

export function mergeAgentMemories(
  persistedMemories: Record<string, Partial<AgentMemory>> | undefined,
  agents: Agent[]
): Record<string, AgentMemory> {
  const defaults = buildDefaultAgentMemories(agents)

  for (const agent of agents) {
    const existing = persistedMemories?.[agent.id]
    if (!existing) continue

    defaults[agent.id] = {
      agentId: agent.id,
      roleSummary: existing.roleSummary || defaults[agent.id].roleSummary,
      userPreferences: Array.isArray(existing.userPreferences) ? existing.userPreferences.filter(Boolean) : defaults[agent.id].userPreferences,
      workingMemory: Array.isArray(existing.workingMemory) ? existing.workingMemory.filter(Boolean).slice(0, 8) : defaults[agent.id].workingMemory,
      recentWork: Array.isArray(existing.recentWork)
        ? existing.recentWork
            .filter(Boolean)
            .map((note) => ({
              id: note.id || `${agent.id}-${note.createdAt || nowIso()}`,
              title: note.title || 'Agency note',
              summary: note.summary || '',
              createdAt: note.createdAt || nowIso(),
              clientId: note.clientId,
              campaignId: note.campaignId,
              missionId: note.missionId,
              conversationId: note.conversationId,
            }))
            .slice(0, 12)
        : defaults[agent.id].recentWork,
      lastUpdated: existing.lastUpdated || defaults[agent.id].lastUpdated,
    }
  }

  return defaults
}

export function appendAgentMemoryNote(
  memories: Record<string, AgentMemory>,
  agentId: string,
  note: Omit<MemoryNote, 'id' | 'createdAt'> & { createdAt?: string }
) {
  const memory = memories[agentId]
  if (!memory) return memories

  const createdAt = note.createdAt || nowIso()
  const nextNote: MemoryNote = {
    id: `${agentId}-${createdAt}`,
    title: note.title,
    summary: note.summary,
    createdAt,
    clientId: note.clientId,
    campaignId: note.campaignId,
    missionId: note.missionId,
    conversationId: note.conversationId,
  }

  return {
    ...memories,
    [agentId]: {
      ...memory,
      workingMemory: [note.summary, ...memory.workingMemory].filter(Boolean).slice(0, 6),
      recentWork: [nextNote, ...memory.recentWork].slice(0, 12),
      lastUpdated: createdAt,
    },
  }
}

export function formatAgentMemoryContext(memory?: AgentMemory) {
  if (!memory) return ''

  const recentWork = memory.recentWork
    .slice(0, 5)
    .map((note) => `- ${note.title}: ${note.summary}`)
    .join('\n')

  return [
    `Memory for ${memory.agentId}:`,
    `Role summary: ${memory.roleSummary}`,
    memory.userPreferences.length ? `User preferences:\n- ${memory.userPreferences.join('\n- ')}` : '',
    memory.workingMemory.length ? `Working memory:\n- ${memory.workingMemory.join('\n- ')}` : '',
    recentWork ? `Recent work:\n${recentWork}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')
}

function nowIso() {
  return new Date().toISOString()
}
