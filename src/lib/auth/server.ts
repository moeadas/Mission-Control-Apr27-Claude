import { getDb } from '@/lib/db/client'
import { verifyToken } from '@/lib/auth/jwt'
import { loadPersistedProviderSettings, mergePersistedProviderSettings, savePersistedProviderSettings } from '@/lib/server/provider-secrets'
import { normalizeProviderSettings } from '@/lib/provider-settings'
import { getTenantIdForUser, createTenant, assignUserToTenant } from '@/lib/server/tenants'
import type { ProviderSettings } from '@/lib/types'

export function getSuperAdminEmail() {
  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase()
  if (!email) {
    throw new Error('SUPER_ADMIN_EMAIL env var is not set. Configure it before starting the server.')
  }
  return email
}

export interface AuthContext {
  userId: string
  email: string
  role: 'super_admin' | 'admin' | 'member'
  providerSettings: ProviderSettings
  /** UUID of the tenant (agencies row) this user belongs to. null for super_admin with no tenant. */
  tenantId: string | null
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
    RETURNING role, is_active, tenant_id
  `
  const profile = rows[0]
  if (!profile?.is_active) return null

  const role: 'super_admin' | 'admin' | 'member' = email === superAdminEmail
    ? 'super_admin'
    : profile.role === 'super_admin' ? 'super_admin'
    : profile.role === 'admin' ? 'admin'
    : 'member'

  // Resolve tenantId: prefer JWT claim → profile column → auto-provision
  let tenantId: string | null = payload.tenantId ?? profile.tenant_id ?? null

  if (!tenantId && role !== 'super_admin') {
    // Legacy user with no tenant: auto-provision a free tenant for them
    tenantId = await createTenant({
      name: email.split('@')[0],
      ownerUserId: payload.sub,
      planId: 'free',
    })
    await assignUserToTenant(payload.sub, tenantId)
  }

  const persistedProviderSettings = await loadPersistedProviderSettings(payload.sub)

  return {
    userId: payload.sub,
    email,
    role,
    tenantId,
    // Normalize persisted settings against defaults — persisted values (verified, apiKey, etc.)
    // must take priority over defaults so they are never wiped on load.
    providerSettings: normalizeProviderSettings(persistedProviderSettings),
  }
}

export async function saveUserProviderSettings(userId: string, providerSettings: ProviderSettings) {
  const normalized = normalizeProviderSettings(providerSettings)
  await savePersistedProviderSettings(userId, normalized)
}
