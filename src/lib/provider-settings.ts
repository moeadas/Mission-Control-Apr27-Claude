import { AIProvider, ProviderFallback, ProviderSettings, AnthropicSettings, OpenAISettings, MetaAdsSettings, HiggsFieldSettings } from '@/lib/types'

/**
 * Default per-provider model used for content-generation deliverables when
 * the user hasn't overridden it via `providerSettings.routing.contentModels`.
 *
 * These are the strings that used to be hardcoded inside resolveTaskRuntime,
 * resolveFallbackRuntime, and (worst of all) generateContentFirstText in
 * autonomous-task.ts. Centralized here so the Settings UI can override them
 * without touching code, and so a single edit changes every site.
 */
export const DEFAULT_CONTENT_TASK_MODELS: Record<AIProvider, string> = {
  ollama: 'minimax-m2.7:cloud',
  gemini: 'gemini-2.5-pro',
  anthropic: 'claude-sonnet-4-5',
  openai: 'gpt-4o',
}

/**
 * Resolve the user-preferred content-generation model for a given provider.
 * Priority:
 *   1. `providerSettings.routing.contentModels[provider]` if set and non-empty
 *   2. `providerSettings.<provider>.model` if set (the user's last-verified pick)
 *   3. The DEFAULT_CONTENT_TASK_MODELS constant for that provider
 */
export function resolveContentTaskModel(settings: ProviderSettings | undefined, provider: AIProvider): string {
  const normalized = normalizeProviderSettings(settings)
  const overrides = normalized.routing.contentModels || {}
  const override = (overrides as Record<string, string | undefined>)[provider]?.trim()
  if (override) return override
  if (provider === 'ollama' && normalized.ollama.model) return normalized.ollama.model
  if (provider === 'gemini' && normalized.gemini.model) return normalized.gemini.model
  if (provider === 'anthropic' && normalized.anthropic.model) return normalized.anthropic.model
  if (provider === 'openai' && normalized.openai.model) return normalized.openai.model
  return DEFAULT_CONTENT_TASK_MODELS[provider]
}

export const DEFAULT_PROVIDER_SETTINGS: ProviderSettings = {
  routing: {
    primaryProvider: 'ollama',
    fallbackProvider: 'gemini',
    useGeminiForThinking: true,
    runtimeMode: 'fast',
    contentModels: {
      ollama: 'minimax-m2.7:cloud',
      gemini: 'gemini-2.5-pro',
      anthropic: 'claude-sonnet-4-5',
      openai: 'gpt-4o',
    },
  },
  ollama: {
    enabled: true,
    verified: false,
    baseUrl: 'http://localhost:11434',
    apiKey: '',
    maskedKey: '',
    availableModels: ['glm-5.1:cloud', 'minimax-m2.7:cloud', 'llama3.2:latest'],
  },
  gemini: {
    enabled: false,
    verified: false,
    apiKey: '',
    maskedKey: '',
    availableModels: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'],
  },
  anthropic: {
    enabled: false,
    verified: false,
    apiKey: '',
    maskedKey: '',
    model: 'claude-sonnet-4-5',
    availableModels: ['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-haiku-4-5'],
  },
  openai: {
    enabled: false,
    verified: false,
    apiKey: '',
    maskedKey: '',
    model: 'gpt-4o',
    availableModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
    baseUrl: 'https://api.openai.com',
  },
  visual: {
    enabled: false,
    verified: false,
    provider: 'gemini',
    model: 'gemini-3-pro-image-preview',
    availableModels: ['gemini-3-pro-image-preview', 'gemini-3.1-flash-image-preview'],
    strictBrandMode: true,
    useReferenceImages: true,
    saveGeneratedAssets: true,
  },
  mcp: {
    browserInspector: {
      enabled: false,
      endpoint: '',
    },
    seoCrawler: {
      enabled: false,
      endpoint: '',
    },
    searchConsole: {
      enabled: false,
      endpoint: '',
    },
    accessibilityProbe: {
      enabled: false,
      endpoint: '',
    },
  },
  meta: {
    enabled: false,
    verified: false,
    accessToken: '',
    maskedToken: '',
    adAccountId: '',
    businessId: '',
  },
  higgsfield: {
    enabled: false,
    verified: false,
    apiKey: '',
    maskedKey: '',
    workspaceId: '',
  },
}

export const THINKING_DELIVERABLE_TYPES = new Set([
  'strategy-brief',
  'campaign-strategy',
  'research-brief',
  'seo-audit',
  'ui-audit',
  'client-brief',
  'presentation',
  'brand-guidelines',
  'data-analysis',
  'pr-comms',
  'event-plan',
  'kpi-forecast',
])

export const CONTENT_GENERATION_DELIVERABLE_TYPES = new Set([
  'content-calendar',
  'campaign-copy',
  'short-form-copy',
  'email-campaign',
  'blog-article',
  'website-copy',
  'video-script',
  'presentation',
  'pr-comms',
  'brand-guidelines',
])

const VALID_PROVIDERS = new Set<AIProvider>(['ollama', 'gemini', 'anthropic', 'openai'])

export function normalizeProviderSettings(input?: Partial<ProviderSettings> | null): ProviderSettings {
  const fallback = input?.routing?.fallbackProvider
  return {
    routing: {
      ...DEFAULT_PROVIDER_SETTINGS.routing,
      ...(input?.routing || {}),
      fallbackProvider:
        fallback && (VALID_PROVIDERS.has(fallback as AIProvider) || fallback === 'none')
          ? (fallback as ProviderFallback)
          : DEFAULT_PROVIDER_SETTINGS.routing.fallbackProvider,
      contentModels: {
        ...(DEFAULT_PROVIDER_SETTINGS.routing.contentModels || {}),
        ...(input?.routing?.contentModels || {}),
      },
    },
    ollama: {
      ...DEFAULT_PROVIDER_SETTINGS.ollama,
      ...(input?.ollama || {}),
      availableModels:
        Array.isArray(input?.ollama?.availableModels) && input?.ollama?.availableModels.length
          ? input!.ollama!.availableModels
          : DEFAULT_PROVIDER_SETTINGS.ollama.availableModels,
    },
    gemini: {
      ...DEFAULT_PROVIDER_SETTINGS.gemini,
      ...(input?.gemini || {}),
      availableModels:
        Array.isArray(input?.gemini?.availableModels) && input?.gemini?.availableModels.length
          ? input!.gemini!.availableModels
          : DEFAULT_PROVIDER_SETTINGS.gemini.availableModels,
    },
    anthropic: {
      ...DEFAULT_PROVIDER_SETTINGS.anthropic,
      ...(input?.anthropic || {}),
      availableModels:
        Array.isArray(input?.anthropic?.availableModels) && input?.anthropic?.availableModels.length
          ? input!.anthropic!.availableModels
          : DEFAULT_PROVIDER_SETTINGS.anthropic.availableModels,
    },
    openai: {
      ...DEFAULT_PROVIDER_SETTINGS.openai,
      ...(input?.openai || {}),
      availableModels:
        Array.isArray(input?.openai?.availableModels) && input?.openai?.availableModels.length
          ? input!.openai!.availableModels
          : DEFAULT_PROVIDER_SETTINGS.openai.availableModels,
    },
    visual: {
      ...DEFAULT_PROVIDER_SETTINGS.visual,
      ...(input?.visual || {}),
      availableModels:
        Array.isArray(input?.visual?.availableModels) && input?.visual?.availableModels.length
          ? input!.visual!.availableModels
          : DEFAULT_PROVIDER_SETTINGS.visual.availableModels,
    },
    mcp: {
      browserInspector: {
        ...DEFAULT_PROVIDER_SETTINGS.mcp.browserInspector,
        ...(input?.mcp?.browserInspector || {}),
      },
      seoCrawler: {
        ...DEFAULT_PROVIDER_SETTINGS.mcp.seoCrawler,
        ...(input?.mcp?.seoCrawler || {}),
      },
      searchConsole: {
        ...DEFAULT_PROVIDER_SETTINGS.mcp.searchConsole,
        ...(input?.mcp?.searchConsole || {}),
      },
      accessibilityProbe: {
        ...DEFAULT_PROVIDER_SETTINGS.mcp.accessibilityProbe,
        ...(input?.mcp?.accessibilityProbe || {}),
      },
    },
    meta: {
      ...DEFAULT_PROVIDER_SETTINGS.meta!,
      ...(input?.meta || {}),
    },
    higgsfield: {
      ...DEFAULT_PROVIDER_SETTINGS.higgsfield!,
      ...(input?.higgsfield || {}),
    },
  }
}

export function isThinkingDeliverableType(deliverableType?: string) {
  return deliverableType ? THINKING_DELIVERABLE_TYPES.has(deliverableType) : false
}

export function providerIsConfigured(settings: ProviderSettings, provider: AIProvider) {
  if (provider === 'ollama') return settings.ollama.enabled !== false
  if (provider === 'gemini') return Boolean(settings.gemini.enabled && settings.gemini.verified && settings.gemini.apiKey)
  if (provider === 'anthropic') return Boolean(settings.anthropic.enabled && settings.anthropic.verified && settings.anthropic.apiKey)
  if (provider === 'openai') return Boolean(settings.openai.enabled && settings.openai.verified && settings.openai.apiKey)
  return false
}

export function resolveProviderModel(
  settings: ProviderSettings,
  provider: AIProvider,
  preferredModel?: string
) {
  if (preferredModel) {
    if (provider === 'gemini' && preferredModel.startsWith('gemini')) return preferredModel
    if (provider === 'anthropic' && preferredModel.startsWith('claude')) return preferredModel
    if (provider === 'openai' && preferredModel.startsWith('gpt')) return preferredModel
    if (provider === 'ollama' && !preferredModel.startsWith('gemini') && !preferredModel.startsWith('claude') && !preferredModel.startsWith('gpt')) return preferredModel
  }

  if (provider === 'gemini') return settings.gemini.model || settings.gemini.availableModels?.[0] || DEFAULT_PROVIDER_SETTINGS.gemini.availableModels[0]
  if (provider === 'anthropic') return settings.anthropic.model || settings.anthropic.availableModels?.[0] || DEFAULT_PROVIDER_SETTINGS.anthropic.availableModels[0]
  if (provider === 'openai') return settings.openai.model || settings.openai.availableModels?.[0] || DEFAULT_PROVIDER_SETTINGS.openai.availableModels[0]
  return settings.ollama.model || settings.ollama.availableModels?.[0] || DEFAULT_PROVIDER_SETTINGS.ollama.availableModels[0]
}

export function resolveTaskRuntime(input: {
  settings: ProviderSettings
  deliverableType?: string
  requestedProvider?: AIProvider
  requestedModel?: string
  /** Agent's explicitly assigned provider — takes priority over all routing logic */
  agentProvider?: AIProvider | null
  /** Agent's explicitly assigned model — used when agentProvider is set */
  agentModel?: string | null
}) {
  const settings = normalizeProviderSettings(input.settings)

  // Priority 0: agent has an explicit provider assigned and it's configured
  if (input.agentProvider && input.agentProvider !== 'ollama' && providerIsConfigured(settings, input.agentProvider)) {
    return {
      provider: input.agentProvider,
      model: input.agentModel || resolveProviderModel(settings, input.agentProvider),
    }
  }
  // Ollama is always "configured" (no API key needed), so handle separately
  if (input.agentProvider === 'ollama') {
    return {
      provider: 'ollama' as AIProvider,
      model: input.agentModel || resolveProviderModel(settings, 'ollama'),
    }
  }

  const runtimeMode = settings.routing.runtimeMode || 'fast'
  const contentFirst =
    input.deliverableType && CONTENT_GENERATION_DELIVERABLE_TYPES.has(input.deliverableType)
  const prefersThinkingModel =
    runtimeMode === 'thinking' ||
    (runtimeMode !== 'compare' && settings.routing.useGeminiForThinking && isThinkingDeliverableType(input.deliverableType))

  let provider: AIProvider =
    contentFirst && providerIsConfigured(settings, 'ollama')
      ? 'ollama'
      : contentFirst && providerIsConfigured(settings, 'gemini')
        ? 'gemini'
      :
    runtimeMode === 'compare' && providerIsConfigured(settings, settings.routing.primaryProvider)
      ? settings.routing.primaryProvider
      : prefersThinkingModel && providerIsConfigured(settings, 'gemini')
      ? 'gemini'
      : providerIsConfigured(settings, settings.routing.primaryProvider)
        ? settings.routing.primaryProvider
        : providerIsConfigured(settings, input.requestedProvider || 'ollama')
          ? (input.requestedProvider || 'ollama')
          : providerIsConfigured(settings, 'ollama')
            ? 'ollama'
            : 'gemini'

  if (!providerIsConfigured(settings, provider)) {
    provider = provider === 'ollama' ? 'gemini' : 'ollama'
  }

  return {
    provider,
    model: contentFirst
      ? resolveContentTaskModel(settings, provider)
      : resolveProviderModel(settings, provider, input.requestedModel),
  }
}

export function shouldRunCompareMode(settings: ProviderSettings, deliverableType?: string) {
  const normalized = normalizeProviderSettings(settings)
  if (normalized.routing.runtimeMode !== 'compare') return false
  if (deliverableType === 'status-report') return false
  return providerIsConfigured(normalized, 'gemini') && providerIsConfigured(normalized, 'ollama')
}

export function resolveFallbackRuntime(input: {
  settings: ProviderSettings
  currentProvider: AIProvider
  requestedModel?: string
}) {
  const settings = normalizeProviderSettings(input.settings)
  const configuredFallback = settings.routing.fallbackProvider
  const fallbackProvider: AIProvider | null =
    configuredFallback !== 'none' && configuredFallback !== input.currentProvider
      ? configuredFallback
      : input.currentProvider === 'ollama'
        ? 'gemini'
        : 'ollama'

  if (!fallbackProvider || !providerIsConfigured(settings, fallbackProvider)) {
    return null
  }

  // The fallback path is used by content-task generation, so default to the
  // user-preferred content-task model for the fallback provider rather than
  // hardcoded strings. The caller can still pass `requestedModel` for a
  // non-content fallback (e.g. retrying a strategy brief) and we'll honor it.
  const fallbackModel = input.requestedModel
    ? resolveProviderModel(settings, fallbackProvider, input.requestedModel)
    : resolveContentTaskModel(settings, fallbackProvider)

  return {
    provider: fallbackProvider,
    model: fallbackModel,
  }
}

export function stripProviderSecrets(settings: ProviderSettings) {
  return {
    ...settings,
    ollama: { ...settings.ollama, apiKey: '', maskedKey: settings.ollama.maskedKey || '' },
    gemini: { ...settings.gemini, apiKey: '' },
    anthropic: { ...settings.anthropic, apiKey: '' },
    openai: { ...settings.openai, apiKey: '' },
    meta: settings.meta
      ? { ...settings.meta, accessToken: '', maskedToken: settings.meta.maskedToken || '' }
      : undefined,
    higgsfield: settings.higgsfield
      ? { ...settings.higgsfield, apiKey: '', maskedKey: settings.higgsfield.maskedKey || '' }
      : undefined,
  }
}
