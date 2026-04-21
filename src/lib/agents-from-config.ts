import type { Agent } from './types'
import { CONFIG_AGENTS as GENERATED_CONFIG_AGENTS } from '@/config/agents/generated'

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

export function buildAgentsFromConfigs(): Agent[] {
  return GENERATED_CONFIG_AGENTS.map(cloneAgent)
}

export const CONFIG_AGENTS = buildAgentsFromConfigs()
