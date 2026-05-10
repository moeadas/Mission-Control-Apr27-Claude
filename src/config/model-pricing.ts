/**
 * model-pricing.ts
 *
 * Cost per 1M tokens (USD) for each supported model.
 * Update these figures when providers change their pricing.
 * Ollama models cost $0 (run locally).
 *
 * Source: provider pricing pages (checked May 2026).
 */

export interface ModelPricing {
  provider: string
  label: string
  /** Cost per 1M input tokens in USD */
  inputPer1M: number
  /** Cost per 1M output tokens in USD */
  outputPer1M: number
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  // ── Anthropic ──────────────────────────────────────────────────────────────
  'claude-opus-4-5': {
    provider: 'anthropic',
    label: 'Claude Opus 4.5',
    inputPer1M: 15.0,
    outputPer1M: 75.0,
  },
  'claude-sonnet-4-5': {
    provider: 'anthropic',
    label: 'Claude Sonnet 4.5',
    inputPer1M: 3.0,
    outputPer1M: 15.0,
  },
  'claude-haiku-4-5': {
    provider: 'anthropic',
    label: 'Claude Haiku 4.5',
    inputPer1M: 0.8,
    outputPer1M: 4.0,
  },

  // ── OpenAI ─────────────────────────────────────────────────────────────────
  'gpt-4o': {
    provider: 'openai',
    label: 'GPT-4o',
    inputPer1M: 2.5,
    outputPer1M: 10.0,
  },
  'gpt-4o-mini': {
    provider: 'openai',
    label: 'GPT-4o Mini',
    inputPer1M: 0.15,
    outputPer1M: 0.6,
  },
  'gpt-4-turbo': {
    provider: 'openai',
    label: 'GPT-4 Turbo',
    inputPer1M: 10.0,
    outputPer1M: 30.0,
  },

  // ── Google Gemini ──────────────────────────────────────────────────────────
  'gemini-2.5-pro': {
    provider: 'gemini',
    label: 'Gemini 2.5 Pro',
    inputPer1M: 1.25,
    outputPer1M: 10.0,
  },
  'gemini-2.5-flash': {
    provider: 'gemini',
    label: 'Gemini 2.5 Flash',
    inputPer1M: 0.15,
    outputPer1M: 0.6,
  },
  'gemini-2.0-flash': {
    provider: 'gemini',
    label: 'Gemini 2.0 Flash',
    inputPer1M: 0.1,
    outputPer1M: 0.4,
  },
  'gemini-2.0-flash-exp': {
    provider: 'gemini',
    label: 'Gemini 2.0 Flash Exp',
    inputPer1M: 0.0,
    outputPer1M: 0.0,
  },
  'gemini-1.5-pro': {
    provider: 'gemini',
    label: 'Gemini 1.5 Pro',
    inputPer1M: 1.25,
    outputPer1M: 5.0,
  },
  'gemini-1.5-flash': {
    provider: 'gemini',
    label: 'Gemini 1.5 Flash',
    inputPer1M: 0.075,
    outputPer1M: 0.3,
  },

  // ── Ollama (local — free) ──────────────────────────────────────────────────
  'llama3.2:latest': { provider: 'ollama', label: 'Llama 3.2', inputPer1M: 0, outputPer1M: 0 },
  'llama3.1:latest': { provider: 'ollama', label: 'Llama 3.1', inputPer1M: 0, outputPer1M: 0 },
  'minimax-m2.7:cloud': { provider: 'ollama', label: 'Minimax M2.7', inputPer1M: 0, outputPer1M: 0 },
  'glm-5.1:cloud': { provider: 'ollama', label: 'GLM 5.1', inputPer1M: 0, outputPer1M: 0 },
}

/**
 * Calculate cost in USD for a given model and token counts.
 * Returns 0 for unknown models (Ollama custom models, etc.).
 */
export function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[model]
  if (!pricing) return 0
  return (inputTokens / 1_000_000) * pricing.inputPer1M + (outputTokens / 1_000_000) * pricing.outputPer1M
}

/**
 * Format a cost value for display.
 * < $0.01 → shows as "<$0.01"
 * Otherwise → "$0.0123"
 */
export function formatCost(usd: number): string {
  if (usd === 0) return '$0.00'
  if (usd < 0.01) return '<$0.01'
  return `$${usd.toFixed(4)}`
}

/**
 * Format token count for display.
 * 1200 → "1.2K", 1500000 → "1.5M"
 */
export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

/**
 * Grouped model catalog for UI pickers. Each entry has the model ID,
 * display label, provider, and a brief capability note.
 */
export interface ModelOption {
  id: string
  label: string
  provider: 'anthropic' | 'openai' | 'gemini' | 'ollama'
  tier: 'powerful' | 'balanced' | 'fast' | 'local'
  note: string
}

export const MODEL_CATALOG: ModelOption[] = [
  // Anthropic
  { id: 'claude-opus-4-5', label: 'Claude Opus 4.5', provider: 'anthropic', tier: 'powerful', note: 'Best reasoning & complex tasks. $15/$75 per 1M' },
  { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5', provider: 'anthropic', tier: 'balanced', note: 'Great quality/cost balance. $3/$15 per 1M' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', provider: 'anthropic', tier: 'fast', note: 'Fast & cheap. $0.80/$4 per 1M' },
  // OpenAI
  { id: 'gpt-4o', label: 'GPT-4o', provider: 'openai', tier: 'powerful', note: 'Flagship multimodal. $2.50/$10 per 1M' },
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'openai', tier: 'fast', note: 'Lightweight & cost-efficient. $0.15/$0.60 per 1M' },
  { id: 'gpt-4-turbo', label: 'GPT-4 Turbo', provider: 'openai', tier: 'powerful', note: 'High capability. $10/$30 per 1M' },
  // Gemini
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', provider: 'gemini', tier: 'powerful', note: 'Deep reasoning. $1.25/$10 per 1M' },
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', provider: 'gemini', tier: 'balanced', note: 'Fast & capable. $0.15/$0.60 per 1M' },
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', provider: 'gemini', tier: 'fast', note: 'Speed-optimised. $0.10/$0.40 per 1M' },
  { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', provider: 'gemini', tier: 'powerful', note: 'Long context. $1.25/$5 per 1M' },
  { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', provider: 'gemini', tier: 'fast', note: 'Quick & cheap. $0.075/$0.30 per 1M' },
  // Ollama (local)
  { id: 'minimax-m2.7:cloud', label: 'Minimax M2.7', provider: 'ollama', tier: 'local', note: 'Local / free' },
  { id: 'glm-5.1:cloud', label: 'GLM 5.1', provider: 'ollama', tier: 'local', note: 'Local / free' },
  { id: 'llama3.2:latest', label: 'Llama 3.2', provider: 'ollama', tier: 'local', note: 'Local / free' },
  { id: 'llama3.1:latest', label: 'Llama 3.1', provider: 'ollama', tier: 'local', note: 'Local / free' },
]
