import { getDb } from '@/lib/db/client'
import { verifyToken } from '@/lib/auth/jwt'
import { loadPersistedProviderSettings, mergePersistedProviderSettings, savePersistedProviderSettings } from '@/lib/server/provider-secrets'
import { normalizeProviderSettings } from '@/lib/provider-settings'
import { getTenantIdForUser, createTenant, assignUserToTenant } from '@/lib/server/tenants'
import { seedTenantRequiredAgents } from '@/lib/server/agent-templates'
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

  // Resolve tenantId: prefer JWT claim → profile column → existing-tenant lookup → auto-provision
  // (Batch V: the explicit existing-tenant lookup prevents the bug where a
  // legitimate user with a NULL profile.tenant_id silently gets a brand-new
  // empty tenant created for them — orphaning the agency they should have
  // been attached to.)
  let tenantId: string | null = payload.tenantId ?? profile.tenant_id ?? null

  if (!tenantId) {
    const existingTenantId = await getTenantIdForUser(payload.sub)
    if (existingTenantId) {
      tenantId = existingTenantId
      // Backfill the profile so subsequent requests skip the lookup.
      await db`UPDATE profiles SET tenant_id = ${tenantId}::uuid WHERE id = ${payload.sub}::uuid`
    }
  }

  // Last resort for genuinely new users: auto-provision a tenant. We also use
  // the user's email-derived slug as the agency slug so future lookups don't
  // collide with the legacy 'default-agency' fallback.
  if (!tenantId && role !== 'super_admin') {
    tenantId = await createTenant({
      name: email.split('@')[0],
      ownerUserId: payload.sub,
      planId: 'free',
    })
    await assignUserToTenant(payload.sub, tenantId)
  }

  // Batch S: ensure all template agents are seeded for this tenant. Idempotent —
  // skips templates already present. Unblocks legacy tenants seeded before
  // REQUIRED_TEMPLATE_IDS was expanded to the full 10-agent roster.
  if (tenantId) {
    try {
      await seedTenantRequiredAgents(tenantId)
    } catch (error) {
      console.warn('[auth] template auto-seed failed (non-fatal):', error)
    }
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
