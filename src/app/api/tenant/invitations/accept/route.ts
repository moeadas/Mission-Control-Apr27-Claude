/**
 * POST /api/tenant/invitations/accept
 *   body: { token: string, password?: string, fullName?: string }
 *
 * Three flows depending on caller state:
 *   1. Authenticated user (Bearer token): joins the invited tenant if email matches.
 *   2. Unauthenticated + invited email already exists: returns 401 with
 *      `code: 'SIGN_IN_REQUIRED'` so the UI prompts the user to log in first.
 *   3. Unauthenticated + new user: creates the account (requires password),
 *      auto-verifies email (the invite token already proved control), joins
 *      the tenant, and returns a JWT.
 *
 * Tokens are single-use. Failed attempts return 410 Gone.
 */
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

import { getDb } from '@/lib/db/client'
import { signToken } from '@/lib/auth/jwt'
import { resolveAuthContextFromToken } from '@/lib/auth/server'
import { assignUserToTenant } from '@/lib/server/tenants'
import { consumeTenantInvitation, getActiveInvitation } from '@/lib/server/email-tokens'
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit'

export const dynamic = 'force-dynamic'

function getBearerToken(req: NextRequest) {
  const h = req.headers.get('authorization') || ''
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : null
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request.headers)
    const rl = await checkRateLimit(`invite:accept:${ip}`, { limit: 15, windowSeconds: 60 * 10, durable: true })
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts.', retryAfterSeconds: rl.retryAfterSeconds },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
      )
    }

    const body = await request.json().catch(() => ({}))
    const token = String(body?.token || '').trim()
    const password = String(body?.password || '')
    const fullName = String(body?.fullName || '').trim()
    if (!token) return NextResponse.json({ error: 'Invitation token is required' }, { status: 400 })

    // Peek at the invitation first so we can validate the caller before consuming it.
    const invitation = await getActiveInvitation(token)
    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation link is invalid or has expired.', code: 'TOKEN_INVALID' },
        { status: 410 }
      )
    }

    const db = getDb()
    const invitedEmail = String(invitation.email).toLowerCase()
    const auth = await resolveAuthContextFromToken(getBearerToken(request))

    // ── Flow 1: caller is already authenticated ─────────────────────────────
    if (auth) {
      if (auth.email.toLowerCase() !== invitedEmail) {
        return NextResponse.json(
          {
            error: 'This invitation is for a different email address. Sign out and accept it from the right account.',
            code: 'EMAIL_MISMATCH',
          },
          { status: 403 }
        )
      }
      const consumed = await consumeTenantInvitation(token, auth.userId)
      if (!consumed) {
        return NextResponse.json({ error: 'Invitation was just consumed by someone else.', code: 'TOKEN_INVALID' }, { status: 410 })
      }
      await assignUserToTenant(auth.userId, consumed.tenantId)
      // Honour the invited role
      await db`UPDATE users SET role = ${consumed.role}, updated_at = now() WHERE id = ${auth.userId}::uuid`
      await db`UPDATE profiles SET role = ${consumed.role}, tenant_id = ${consumed.tenantId}::uuid, updated_at = now() WHERE id = ${auth.userId}::uuid`
      return NextResponse.json({
        ok: true,
        action: 'joined-existing-user',
        tenantId: consumed.tenantId,
      })
    }

    // ── Flow 2: unauthenticated + email already has an account ──────────────
    const existing = await db`SELECT id FROM users WHERE email = ${invitedEmail} LIMIT 1`
    if (existing[0]) {
      return NextResponse.json(
        {
          error: 'An account already exists for that email. Sign in first, then re-open the invitation link.',
          code: 'SIGN_IN_REQUIRED',
        },
        { status: 401 }
      )
    }

    // ── Flow 3: unauthenticated + new user — create the account ─────────────
    if (!password) return NextResponse.json({ error: 'Password is required to create your account' }, { status: 400 })
    if (password.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })

    const passwordHash = await bcrypt.hash(password, 12)
    const role = invitation.role === 'admin' ? 'admin' : 'member'
    const userRows = await db`
      INSERT INTO users (email, password_hash, role, is_active, email_verified_at)
      VALUES (${invitedEmail}, ${passwordHash}, ${role}, true, now())
      RETURNING id, email, role
    `
    const user = userRows[0]

    await db`
      INSERT INTO profiles (id, email, role, is_active, full_name, tenant_id)
      VALUES (${user.id}::uuid, ${invitedEmail}, ${role}, true, ${fullName || null}, ${invitation.tenant_id}::uuid)
      ON CONFLICT (id) DO UPDATE
        SET email = EXCLUDED.email,
            role  = EXCLUDED.role,
            full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
            tenant_id = EXCLUDED.tenant_id,
            updated_at = now()
    `

    const consumed = await consumeTenantInvitation(token, user.id)
    if (!consumed) {
      // Unlikely: another accept call won the race. The user account is fine
      // but they're not in the tenant — fail loud.
      return NextResponse.json(
        { error: 'Invitation was just consumed by someone else.', code: 'TOKEN_INVALID' },
        { status: 410 }
      )
    }

    const jwt = await signToken({ sub: user.id, email: invitedEmail, role, tenantId: consumed.tenantId })

    return NextResponse.json(
      {
        ok: true,
        action: 'created-new-user',
        token: jwt,
        user: { id: user.id, email: invitedEmail, role, tenantId: consumed.tenantId, emailVerified: true },
      },
      { status: 201 }
    )
  } catch (err: any) {
    console.error('POST /api/tenant/invitations/accept error:', err)
    return NextResponse.json({ error: err.message || 'Failed to accept invitation' }, { status: 500 })
  }
}
