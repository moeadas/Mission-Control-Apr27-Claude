import {
  AGENT_ARCHITECTURE_BUNDLES,
  getAgentArchitectureBundle,
  getAgentArchitectureText,
} from '@/config/agents/generated'

export { AGENT_ARCHITECTURE_BUNDLES, getAgentArchitectureBundle, getAgentArchitectureText }

export function getAgentSourceOfTruthPath(agentId: string) {
  return `src/config/agents/${agentId}/`
}

export function getAgentMemoryNote() {
  return 'Memory files define structure and retention intent. Runtime memory is populated by the app as agents complete work; it is not pre-seeded in config.'
}

export function getProviderRoutingNote(provider: string, model: string) {
  if (provider !== 'ollama') return `${provider} provider`
  if (model === 'minimax-m2.7:cloud') {
    return 'Runs through the app’s Ollama-compatible chat endpoint. Despite the cloud model name, the runtime adapter is the Ollama provider path in this app.'
  }
  return 'Runs through the local Ollama-compatible runtime path.'
}
