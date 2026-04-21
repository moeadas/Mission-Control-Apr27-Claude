import { AIProvider, ProviderFallback, ProviderSettings } from '@/lib/types'

export const DEFAULT_PROVIDER_SETTINGS: ProviderSettings = {
  routing: {
    primaryProvider: 'ollama',
    fallbackProvider: 'gemini',
    useGeminiForThinking: true,
    runtimeMode: 'fast',
  },
  ollama: {
    enabled: true,
    verified: false,
    baseUrl: 'http://localhost:11434',
    availableModels: ['glm-5.1:cloud', 'minimax-m2.7:cloud', 'llama3.2:latest'],
  },
  gemini: {
    enabled: false,
    verified: false,
    apiKey: '',
    maskedKey: '',
    availableModels: ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'],
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

export function normalizeProviderSettings(input?: Partial<ProviderSettings> | null): ProviderSettings {
  return {
    routing: {
      ...DEFAULT_PROVIDER_SETTINGS.routing,
      ...(input?.routing || {}),
      fallbackProvider:
        input?.routing?.fallbackProvider === 'ollama' ||
        input?.routing?.fallbackProvider === 'gemini' ||
        input?.routing?.fallbackProvider === 'none'
          ? input.routing.fallbackProvider
          : DEFAULT_PROVIDER_SETTINGS.routing.fallbackProvider,
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
  }
}

export function isThinkingDeliverableType(deliverableType?: string) {
  return deliverableType ? THINKING_DELIVERABLE_TYPES.has(deliverableType) : false
}

export function providerIsConfigured(settings: ProviderSettings, provider: AIProvider) {
  if (provider === 'ollama') {
    return settings.ollama.enabled !== false
  }

  return Boolean(settings.gemini.enabled && settings.gemini.verified && settings.gemini.apiKey)
}

export function resolveProviderModel(
  settings: ProviderSettings,
  provider: AIProvider,
  preferredModel?: string
) {
  if (preferredModel) {
    if (provider === 'gemini' && preferredModel.startsWith('gemini')) return preferredModel
    if (provider === 'ollama' && !preferredModel.startsWith('gemini')) return preferredModel
  }

  if (provider === 'gemini') {
    return (
      settings.gemini.model ||
      settings.gemini.availableModels?.[0] ||
      DEFAULT_PROVIDER_SETTINGS.gemini.availableModels[0]
    )
  }

  return (
    settings.ollama.model ||
    settings.ollama.availableModels?.[0] ||
    DEFAULT_PROVIDER_SETTINGS.ollama.availableModels[0]
  )
}

export function resolveTaskRuntime(input: {
  settings: ProviderSettings
  deliverableType?: string
  requestedProvider?: AIProvider
  requestedModel?: string
}) {
  const settings = normalizeProviderSettings(input.settings)
  const runtimeMode = settings.routing.runtimeMode || 'fast'
  const prefersThinkingModel =
    runtimeMode === 'thinking' ||
    (runtimeMode !== 'compare' && settings.routing.useGeminiForThinking && isThinkingDeliverableType(input.deliverableType))

  let provider: AIProvider =
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
    model: resolveProviderModel(settings, provider, input.requestedModel),
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

  return {
    provider: fallbackProvider,
    model: resolveProviderModel(settings, fallbackProvider, input.requestedModel),
  }
}

export function stripProviderSecrets(settings: ProviderSettings) {
  return {
    ...settings,
    gemini: {
      ...settings.gemini,
      apiKey: '',
    },
    visual: settings.visual,
    mcp: settings.mcp,
  }
}
