/**
 * Tenant invitation API (Batch E)
 *
 *   GET    /api/tenant/invitations               — list pending invites for the caller's tenant
 *   POST   /api/tenant/invitations               — invite a new email; emails them a link with a token
 *   DELETE /api/tenant/invitations?token=...     — revoke a pending invite
 *
 * The invitee accepts via POST /api/tenant/invitations/accept (see sibling
 * route). This replaces the legacy `POST /api/tenant/users` flow that
 * returned a temp password in the API JSON — no plaintext passwords ever
 * cross the wire anymore.
 */
import { NextRequest, NextResponse } from 'next/server'

import { resolveAuthContextFromToken, getAuthTokenFromRequest } from '@/lib/auth/server'
import { getDb } from '@/lib/db/client'
import { createTenantInvitation } from '@/lib/server/email-tokens'
import { buildTenantInviteEmail, sendEmail } from '@/lib/server/email'

export const dynamic = 'force-dynamic'

function getBearerToken(req: NextRequest) {
  // Batch P.2: cookie OR bearer. Local wrapper kept so call sites don't change.
  return getAuthTokenFromRequest(req)
}

async function requireTenantAdmin(req: NextRequest) {
  const auth = await resolveAuthContextFromToken(getBearerToken(req))
  if (!auth) return { auth: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (auth.role !== 'super_admin' && auth.role !== 'admin') {
    return { auth: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  if (!auth.tenantId) {
    return { auth: null, error: NextResponse.json({ error: 'No tenant on session' }, { status: 400 }) }
  }
  return { auth, error: null as null | NextResponse }
}

// ─── GET — list pending invitations for caller's tenant ────────────────────
export async function GET(request: NextRequest) {
  const { auth, error } = await requireTenantAdmin(request)
  if (!auth) return error!

  try {
    const db = getDb()
    const rows = await db`
      SELECT i.token, i.email, i.role, i.expires_at, i.created_at, u.email AS invited_by_email
      FROM tenant_invitations i
      LEFT JOIN users u ON u.id = i.invited_by
      WHERE i.tenant_id = ${auth.tenantId}::uuid
        AND i.consumed_at IS NULL
        AND i.expires_at > now()
      ORDER BY i.created_at DESC
    `
    return NextResponse.json({ ok: true, invitations: rows })
  } catch (err: any) {
    console.error('GET /api/tenant/invitations error:', err)
    return NextResponse.json({ error: 'Failed to load invitations' }, { status: 500 })
  }
}

// ─── POST — create + email a new invitation ────────────────────────────────
export async function POST(request: NextRequest) {
  const { auth, error } = await requireTenantAdmin(request)
  if (!auth) return error!

  try {
    const body = await request.json().catch(() => ({}))
    const email = String(body?.email || '').trim().toLowerCase()
    const role: 'admin' | 'member' = body?.role === 'admin' ? 'admin' : 'member'

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
    }

    const db = getDb()

    // Refuse if the email is already a member of THIS tenant.
    const existingMember = await db`
      SELECT u.id FROM users u
      JOIN profiles p ON p.id = u.id
      WHERE u.email = ${email} AND p.tenant_id = ${auth.tenantId}::uuid
      LIMIT 1
    `
    if (existingMember[0]) {
      return NextResponse.json({ error: 'That email already belongs to a member of your workspace' }, { status: 409 })
    }

    // Refuse if there's already an outstanding invite for this email + tenant.
    const pending = await db`
      SELECT token FROM tenant_invitations
      WHERE tenant_id = ${auth.tenantId}::uuid
        AND lower(email) = ${email}
        AND consumed_at IS NULL
        AND expires_at > now()
      LIMIT 1
    `
    if (pending[0]) {
      return NextResponse.json(
        { error: 'An invitation for that email is already pending. Revoke it first or wait for it to expire.' },
        { status: 409 }
      )
    }

    // requireTenantAdmin already returned 400 if tenantId is null, so the !
    // assertion is safe here.
    const { token, expiresAt } = await createTenantInvitation({
      tenantId: auth.tenantId!,
      email,
      role,
      invitedBy: auth.userId,
    })

    // Look up tenant name for the email body.
    const tenant = await db`SELECT name FROM agencies WHERE id = ${auth.tenantId}::uuid LIMIT 1`
    const tenantName = tenant[0]?.name || 'a Mission Control workspace'

    try {
      await sendEmail(buildTenantInviteEmail(email, auth.email, tenantName, token))
    } catch (err) {
      console.warn('[invitations] dispatch failed', err)
    }

    return NextResponse.json({
      ok: true,
      invitation: {
        email,
        role,
        expiresAt: expiresAt.toISOString(),
        token,           // returned so the admin can copy the link manually if needed
      },
    }, { status: 201 })
  } catch (err: any) {
    console.error('POST /api/tenant/invitations error:', err)
    return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
  }
}

// ─── DELETE — revoke a pending invitation ──────────────────────────────────
export async function DELETE(request: NextRequest) {
  const { auth, error } = await requireTenantAdmin(request)
  if (!auth) return error!

  const url = new URL(request.url)
  const token = url.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'token is required' }, { status: 400 })

  try {
    const db = getDb()
    const rows = await db`
      UPDATE tenant_invitations
      SET consumed_at = now()
      WHERE token = ${token}
        AND tenant_id = ${auth.tenantId}::uuid
        AND consumed_at IS NULL
      RETURNING email
    `
    if (!rows[0]) return NextResponse.json({ error: 'Invitation not found or already consumed' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('DELETE /api/tenant/invitations error:', err)
    return NextResponse.json({ error: 'Failed to revoke invitation' }, { status: 500 })
  }
}
