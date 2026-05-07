import { AIProvider, AgentModel, ProviderOption } from './types'

export const PROVIDER_LABELS: Record<AIProvider, string> = {
  ollama: 'Ollama',
  gemini: 'Google Gemini',
  anthropic: 'Anthropic Claude',
  openai: 'OpenAI',
}

export const PROVIDER_OPTIONS: { value: AIProvider; label: string }[] = [
  { value: 'ollama', label: PROVIDER_LABELS.ollama },
  { value: 'gemini', label: PROVIDER_LABELS.gemini },
  { value: 'anthropic', label: PROVIDER_LABELS.anthropic },
  { value: 'openai', label: PROVIDER_LABELS.openai },
]

// Default model options - will be overridden by verified models from the system
export const MODEL_OPTIONS: ProviderOption[] = [
  { id: 'glm-5.1:cloud', label: 'GLM 5.1 Cloud (Ollama)', provider: 'ollama' },
  { id: 'minimax-m2.7:cloud', label: 'MiniMax M2.7 Cloud (Ollama)', provider: 'ollama' },
  { id: 'llama3.2:latest', label: 'Llama 3.2 (Ollama)', provider: 'ollama' },
  { id: 'llama3.1:latest', label: 'Llama 3.1 (Ollama)', provider: 'ollama' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', provider: 'gemini' },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', provider: 'gemini' },
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', provider: 'gemini' },
  { id: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash (Experimental)', provider: 'gemini' },
  { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', provider: 'gemini' },
  { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', provider: 'gemini' },
  { id: 'claude-opus-4-5', label: 'Claude Opus 4.5', provider: 'anthropic' },
  { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5', provider: 'anthropic' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', provider: 'anthropic' },
  { id: 'gpt-4o', label: 'GPT-4o', provider: 'openai' },
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'openai' },
  { id: 'gpt-4-turbo', label: 'GPT-4 Turbo', provider: 'openai' },
]

export function getProviderModels(provider: AIProvider): ProviderOption[] {
  return MODEL_OPTIONS.filter((option) => option.provider === provider)
}

export function getProviderLabel(provider: AIProvider) {
  return PROVIDER_LABELS[provider]
}

export function getModelLabel(model: AgentModel | string) {
  return MODEL_OPTIONS.find((option) => option.id === model)?.label || model
}

export function maskApiKey(value: string) {
  if (!value) return ''
  if (value.length <= 8) return '••••••••'
  return `${value.slice(0, 4)}••••${value.slice(-4)}`
}
