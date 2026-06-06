import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { normalizeProviderSettings } from '@/lib/provider-settings'
import type { ProviderSettings } from '@/lib/types'
import {
  decryptString,
  encryptString,
  isCryptoConfigured,
  isEncryptedEnvelope,
} from '@/lib/server/secret-crypto'

const DATA_DIR = path.join(process.cwd(), 'data')
const SECRETS_FILE = path.join(DATA_DIR, 'provider-secrets.json')

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
    meta: {
      ...(fallback?.meta || {}),
      ...(primary?.meta || {}),
      accessToken: primary?.meta?.accessToken || fallback?.meta?.accessToken || '',
      maskedToken: primary?.meta?.maskedToken || fallback?.meta?.maskedToken || '',
    },
    higgsfield: {
      ...(fallback?.higgsfield || {}),
      ...(primary?.higgsfield || {}),
      apiKey: primary?.higgsfield?.apiKey || fallback?.higgsfield?.apiKey || '',
      maskedKey: primary?.higgsfield?.maskedKey || fallback?.higgsfield?.maskedKey || '',
    },
    serper: {
      ...(fallback?.serper || {}),
      ...(primary?.serper || {}),
      apiKey: primary?.serper?.apiKey || fallback?.serper?.apiKey || '',
      maskedKey: primary?.serper?.maskedKey || fallback?.serper?.maskedKey || '',
    },
    google: {
      ...(fallback?.google || {}),
      ...(primary?.google || {}),
      clientSecret: primary?.google?.clientSecret || fallback?.google?.clientSecret || '',
      maskedClientSecret: primary?.google?.maskedClientSecret || fallback?.google?.maskedClientSecret || '',
    },
  } as Partial<ProviderSettings>)
}

async function readSecretsStore(): Promise<ProviderSecretsStore> {
  try {
    const raw = await readFile(SECRETS_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}

    // Encrypted-envelope path: the entire file is one wrapped blob.
    if (isEncryptedEnvelope(parsed)) {
      try {
        const plaintext = decryptString(parsed)
        const inner = JSON.parse(plaintext)
        return inner && typeof inner === 'object' ? inner : {}
      } catch (err) {
        // Tampered file or wrong master key. Returning {} would silently wipe
        // the store on next save — that's destructive. Throw instead so the
        // caller / API route can surface a 500 to the operator.
        throw new Error(`Failed to decrypt provider secrets — check ${'PROVIDER_SECRETS_MASTER_KEY'}: ${(err as Error).message}`)
      }
    }

    // Legacy plaintext path. We keep reading it as-is; the next save will
    // upgrade the file to an encrypted envelope if the master key is set.
    return parsed as ProviderSecretsStore
  } catch (err) {
    // Empty file / missing file is fine.
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return {}
    if (err instanceof SyntaxError) return {}
    throw err
  }
}

async function writeSecretsStore(store: ProviderSecretsStore) {
  await mkdir(DATA_DIR, { recursive: true })
  const json = JSON.stringify(store, null, 2)

  if (isCryptoConfigured()) {
    const envelope = encryptString(json)
    if (envelope) {
      await writeFile(SECRETS_FILE, JSON.stringify(envelope, null, 2), 'utf8')
      return
    }
  }

  // Master key unset → keep plaintext for POC / dev. Helpers in
  // secret-crypto.ts log a one-time warning so this isn't silent.
  await writeFile(SECRETS_FILE, json, 'utf8')
}

export async function loadPersistedProviderSettings(userId: string): Promise<ProviderSettings | null> {
  const store = await readSecretsStore()
  const record = store[userId]
  if (!record?.providerSettings) return null

  // No more env-level fallback (the old code merged process.env.GEMINI_API_KEY
  // into every user's settings, which leaked the dev key. Each tenant manages
  // their own keys via Settings → AI Providers.)
  return mergeProviderSettings(record.providerSettings, null)
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
  // (The legacy .env.local writeback for Gemini keys has been removed —
  // it didn't work in Docker and leaked dev keys to every user. The
  // encrypted JSON store at `data/provider-secrets.json` is now the single
  // source of truth.)
}

export function mergePersistedProviderSettings(primary?: Partial<ProviderSettings> | null, fallback?: Partial<ProviderSettings> | null) {
  return mergeProviderSettings(primary, fallback)
}
