import type { NextRequest, NextResponse } from 'next/server'

import { getDb } from '@/lib/db/client'
import { verifyToken } from '@/lib/auth/jwt'
import { loadPersistedProviderSettings, mergePersistedProviderSettings, savePersistedProviderSettings } from '@/lib/server/provider-secrets'
import { normalizeProviderSettings } from '@/lib/provider-settings'
import { getTenantIdForUser, createTenant, assignUserToTenant, syncAgentCount } from '@/lib/server/tenants'
import { seedTenantRequiredAgents } from '@/lib/server/agent-templates'
import type { ProviderSettings } from '@/lib/types'

// Batch P.1: httpOnly session cookie.
// The bearer-in-JS scheme that's used today is XSS-exposed; any injected
// script can read the token from JS storage and exfiltrate it. The cookie
// is httpOnly + SameSite=Lax so it travels with same-site requests and is
// invisible to client JS. We keep returning the JSON `token` field for
// backwards compat — P.2/P.3 will migrate routes and client to cookie-only.
export const SESSION_COOKIE_NAME = 'mc_session'
const SESSION_COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60 // matches JWT_EXPIRY in jwt.ts

function isHttpsRequest(request: NextRequest): boolean {
  // Prefer the proxy-set header (nginx terminates TLS) and fall back to the
  // direct URL protocol so this also works in non-proxied dev environments.
  const xfwd = request.headers.get('x-forwarded-proto')
  if (xfwd) return xfwd.toLowerCase() === 'https'
  try {
    return request.nextUrl.protocol === 'https:'
  } catch {
    return false
  }
}

/** Attach the session cookie to an outgoing response. Idempotent — safe to
 *  call on the same response twice. */
export function setSessionCookie(
  response: NextResponse,
  token: string,
  request: NextRequest
) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: isHttpsRequest(request),
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
  })
}

/** Clear the session cookie (logout). Sets an immediately-expiring cookie
 *  with the same attributes so the browser overwrites the existing one. */
export function clearSessionCookie(response: NextResponse, request: NextRequest) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: isHttpsRequest(request),
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}

/** Extract the JWT from either the session cookie or an Authorization bearer
 *  header. Cookie wins on conflict. Returns null when neither is present.
 *
 *  Batch P.3: the client-side helpers now send a literal sentinel string
 *  (`cookie-session`) in the Authorization header to keep their legacy
 *  `if (!token) return` guards working without storing the real JWT in
 *  JS-accessible storage. The sentinel carries no auth value — we
 *  short-circuit it here so verifyToken() isn't invoked on garbage. */
const BEARER_SENTINEL = 'cookie-session'
export function getAuthTokenFromRequest(request: NextRequest): string | null {
  const cookieToken = request.cookies.get(SESSION_COOKIE_NAME)?.value
  if (cookieToken) return cookieToken
  const auth = request.headers.get('authorization') || ''
  if (auth.toLowerCase().startsWith('bearer ')) {
    const tok = auth.slice(7).trim()
    if (tok === BEARER_SENTINEL) return null
    return tok
  }
  return null
}

/** Convenience: extract + resolve in one call. Returns null when the request
 *  has no token or the token doesn't resolve to an active profile. */
export async function getAuthFromRequest(request: NextRequest): Promise<AuthContext | null> {
  return resolveAuthContextFromToken(getAuthTokenFromRequest(request))
}

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

  // Ensure the complete cross-department roster exists for legacy and new
  // tenants. Cloning is idempotent and subscription usage is synchronized.
  if (tenantId) {
    try {
      const seeded = await seedTenantRequiredAgents(tenantId)
      if (seeded.insertedIds.length) await syncAgentCount(tenantId)
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
