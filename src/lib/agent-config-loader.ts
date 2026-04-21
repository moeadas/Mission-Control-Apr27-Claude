import type { Agent } from './types'
import {
  AGENT_ARCHITECTURE_BUNDLES,
  CONFIG_AGENTS,
  CONFIG_AGENT_IDS,
  getAgentArchitectureBundle,
} from '@/config/agents/generated'

function cloneAgent(agent: Agent): Agent {
  return {
    ...agent,
    tools: [...agent.tools],
    skills: [...agent.skills],
    responsibilities: [...agent.responsibilities],
    primaryOutputs: [...agent.primaryOutputs],
    position: { ...agent.position },
  }
}

export async function loadAgentConfigs(): Promise<Partial<Agent>[]> {
  return CONFIG_AGENTS.map(cloneAgent)
}

export async function loadAgentConfig(agentId: string): Promise<Partial<Agent> | null> {
  const bundle = getAgentArchitectureBundle(agentId)
  return bundle ? cloneAgent(bundle.agent) : null
}

export function getConfiguredAgentIds(): string[] {
  return [...CONFIG_AGENT_IDS]
}

export function getAgentArchitecture(agentId: string) {
  return getAgentArchitectureBundle(agentId)
}

export function getAllAgentArchitectures() {
  return AGENT_ARCHITECTURE_BUNDLES
}
