import { getDb } from '@/lib/db/client'
import { verifyToken } from '@/lib/auth/jwt'
import { loadPersistedProviderSettings, mergePersistedProviderSettings, savePersistedProviderSettings } from '@/lib/server/provider-secrets'
import { normalizeProviderSettings } from '@/lib/provider-settings'
import type { ProviderSettings } from '@/lib/types'

export function getSuperAdminEmail() {
  return (process.env.SUPER_ADMIN_EMAIL || 'moeadas@yahoo.com').trim().toLowerCase()
}

export interface AuthContext {
  userId: string
  email: string
  role: 'super_admin' | 'member'
  providerSettings: ProviderSettings
}

export async function resolveAuthContextFromToken(token: string | null | undefined): Promise<AuthContext | null> {
  if (!token) return null

  const payload = await verifyToken(token)
  if (!payload?.sub || !payload?.email) return null

  const db = getDb()
  const email = payload.email.toLowerCase()
  const superAdminEmail = getSuperAdminEmail()

  const rows = await db`
    INSERT INTO profiles (id, email, role, is_active)
    VALUES (${payload.sub}::uuid, ${email}, ${payload.role}, true)
    ON CONFLICT (id) DO UPDATE
      SET email = EXCLUDED.email,
          role  = EXCLUDED.role,
          updated_at = now()
    RETURNING role, is_active
  `
  const profile = rows[0]
  if (!profile?.is_active) return null

  const role: 'super_admin' | 'member' = email === superAdminEmail
    ? 'super_admin'
    : profile.role === 'super_admin' ? 'super_admin' : 'member'

  const persistedProviderSettings = await loadPersistedProviderSettings(payload.sub)

  return {
    userId: payload.sub,
    email,
    role,
    // Normalize persisted settings against defaults — persisted values (verified, apiKey, etc.)
    // must take priority over defaults so they are never wiped on load.
    providerSettings: normalizeProviderSettings(persistedProviderSettings),
  }
}

export async function saveUserProviderSettings(userId: string, providerSettings: ProviderSettings) {
  const normalized = normalizeProviderSettings(providerSettings)
  await savePersistedProviderSettings(userId, normalized)
}
