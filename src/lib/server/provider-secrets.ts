import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { normalizeProviderSettings } from '@/lib/provider-settings'
import type { ProviderSettings } from '@/lib/types'

const DATA_DIR = path.join(process.cwd(), 'data')
const SECRETS_FILE = path.join(DATA_DIR, 'provider-secrets.json')
const ENV_FILE = path.join(process.cwd(), '.env.local')

type ProviderSecretsStore = Record<
  string,
  {
    providerSettings: ProviderSettings
    updatedAt: string
  }
>

function mergeProviderSettings(primary?: Partial<ProviderSettings> | null, fallback?: Partial<ProviderSettings> | null) {
  return normalizeProviderSettings({
    ...(fallback || {}),
    ...(primary || {}),
    routing: { ...(fallback?.routing || {}), ...(primary?.routing || {}) },
    ollama: {
      ...(fallback?.ollama || {}),
      ...(primary?.ollama || {}),
      apiKey: primary?.ollama?.apiKey || fallback?.ollama?.apiKey || '',
      maskedKey: primary?.ollama?.maskedKey || fallback?.ollama?.maskedKey || '',
    },
    gemini: {
      ...(fallback?.gemini || {}),
      ...(primary?.gemini || {}),
      apiKey: primary?.gemini?.apiKey || fallback?.gemini?.apiKey || '',
      maskedKey: primary?.gemini?.maskedKey || fallback?.gemini?.maskedKey || '',
    },
    anthropic: {
      ...(fallback?.anthropic || {}),
      ...(primary?.anthropic || {}),
      apiKey: primary?.anthropic?.apiKey || fallback?.anthropic?.apiKey || '',
      maskedKey: primary?.anthropic?.maskedKey || fallback?.anthropic?.maskedKey || '',
    },
    openai: {
      ...(fallback?.openai || {}),
      ...(primary?.openai || {}),
      apiKey: primary?.openai?.apiKey || fallback?.openai?.apiKey || '',
      maskedKey: primary?.openai?.maskedKey || fallback?.openai?.maskedKey || '',
    },
    visual: { ...(fallback?.visual || {}), ...(primary?.visual || {}) },
    mcp: {
      ...(fallback?.mcp || {}),
      ...(primary?.mcp || {}),
    },
  } as Partial<ProviderSettings>)
}

async function readSecretsStore(): Promise<ProviderSecretsStore> {
  try {
    const raw = await readFile(SECRETS_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

async function writeSecretsStore(store: ProviderSecretsStore) {
  await mkdir(DATA_DIR, { recursive: true })
  await writeFile(SECRETS_FILE, JSON.stringify(store, null, 2), 'utf8')
}

async function readLocalEnvGeminiKey() {
  try {
    const raw = await readFile(ENV_FILE, 'utf8')
    const match = raw.match(/^GEMINI_API_KEY=(.*)$/m)
    return match?.[1]?.trim() || ''
  } catch {
    return ''
  }
}

async function writeLocalEnvGeminiKey(apiKey: string) {
  let raw = ''
  try {
    raw = await readFile(ENV_FILE, 'utf8')
  } catch {
    raw = ''
  }

  const nextLine = `GEMINI_API_KEY=${apiKey}`
  const hasKey = /^GEMINI_API_KEY=.*$/m.test(raw)
  const nextRaw = hasKey
    ? raw.replace(/^GEMINI_API_KEY=.*$/m, nextLine)
    : `${raw.trimEnd()}\n${raw.trim() ? '\n' : ''}${nextLine}\n`

  await writeFile(ENV_FILE, nextRaw, 'utf8')
}

export async function loadPersistedProviderSettings(userId: string): Promise<ProviderSettings | null> {
  const store = await readSecretsStore()
  const record = store[userId]
  const envGeminiKey = await readLocalEnvGeminiKey()
  if (!record?.providerSettings && !envGeminiKey) return null

  return mergeProviderSettings(
    record?.providerSettings,
    envGeminiKey
      ? {
          gemini: {
            apiKey: envGeminiKey,
            maskedKey: `${envGeminiKey.slice(0, 4)}...${envGeminiKey.slice(-4)}`,
            enabled: true,
          },
        } as Partial<ProviderSettings>
      : null
  )
}

export async function savePersistedProviderSettings(userId: string, providerSettings: ProviderSettings) {
  const store = await readSecretsStore()
  const existing = store[userId]?.providerSettings
  const merged = mergeProviderSettings(providerSettings, existing)
  store[userId] = {
    providerSettings: merged,
    updatedAt: new Date().toISOString(),
  }
  await writeSecretsStore(store)
  // Best-effort: write the Gemini key to .env.local for local dev convenience.
  // In Docker the app directory is read-only, so we silently skip on EACCES.
  if (merged.gemini.apiKey) {
    try {
      await writeLocalEnvGeminiKey(merged.gemini.apiKey)
    } catch {
      // read-only filesystem in production — ignore, key is already in the JSON store
    }
  }
}

export function mergePersistedProviderSettings(primary?: Partial<ProviderSettings> | null, fallback?: Partial<ProviderSettings> | null) {
  return mergeProviderSettings(primary, fallback)
}
