/**
 * POST /api/auth/register
 *
 * Self-serve signup. Creates:
 *   1. user row (users table) — email_verified_at is null until they click the link
 *   2. profile row (profiles table)
 *   3. tenant (agencies) row with a free subscription
 *   4. links profile → tenant
 *   5. sends email-verification link via the configured email dispatcher
 *
 * Returns a JWT with tenantId embedded so the client can start using the app immediately.
 * Users with unverified email can still use the app, but certain operations
 * (e.g. inviting other users, upgrading plans) may require verification — these
 * gates are added as the features are wired up.
 *
 * Rate-limited per IP to prevent signup spam.
 */
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

import { getDb } from '@/lib/db/client'
import { signToken } from '@/lib/auth/jwt'
import { createTenant, assignUserToTenant } from '@/lib/server/tenants'
import { getSuperAdminEmail, setSessionCookie } from '@/lib/auth/server'
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit'
import { createEmailVerificationToken } from '@/lib/server/email-tokens'
import { buildVerificationEmail, sendEmail } from '@/lib/server/email'

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 signups per hour per IP.
    const ip = getClientIp(request.headers)
    const rl = await checkRateLimit(`auth:register:${ip}`, { limit: 5, windowSeconds: 60 * 60, durable: true })
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many signups from this IP. Try again later.', retryAfterSeconds: rl.retryAfterSeconds },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
      )
    }

    const body = await request.json()
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')
    const fullName = String(body.fullName || body.full_name || '').trim()
    const companyName = String(body.companyName || body.company_name || fullName || email.split('@')[0]).trim()

    // ── Validation ─────────────────────────────────────────────────────────
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    const db = getDb()

    // ── Duplicate check ─────────────────────────────────────────────────────
    const existing = await db`SELECT id FROM users WHERE email = ${email} LIMIT 1`
    if (existing.length > 0) {
      return NextResponse.json({ error: 'An account with that email already exists' }, { status: 409 })
    }

    // ── Determine role ──────────────────────────────────────────────────────
    const superAdminEmail = getSuperAdminEmail()
    const role = email === superAdminEmail ? 'super_admin' : 'member'

    // ── Create user ─────────────────────────────────────────────────────────
    const passwordHash = await bcrypt.hash(password, 12)
    const userRows = await db`
      INSERT INTO users (email, password_hash, role, is_active)
      VALUES (${email}, ${passwordHash}, ${role}, true)
      RETURNING id, email, role
    `
    const user = userRows[0]

    // ── Create profile ──────────────────────────────────────────────────────
    await db`
      INSERT INTO profiles (id, email, role, is_active, full_name)
      VALUES (${user.id}::uuid, ${email}, ${role}, true, ${fullName || null})
      ON CONFLICT (id) DO UPDATE
        SET email = EXCLUDED.email,
            role  = EXCLUDED.role,
            full_name = EXCLUDED.full_name,
            updated_at = now()
    `

    // ── Create tenant + subscription ────────────────────────────────────────
    const tenantId = await createTenant({
      name: companyName,
      ownerUserId: user.id,
      planId: 'free',
    })

    // ── Link profile → tenant ───────────────────────────────────────────────
    await assignUserToTenant(user.id, tenantId)

    // ── Send email-verification link ────────────────────────────────────────
    // Failures here are non-fatal — the user can request a new link from the
    // /verify-email page if needed.
    try {
      const { token: verifyToken } = await createEmailVerificationToken(user.id, email)
      await sendEmail(buildVerificationEmail(email, verifyToken))
    } catch (err) {
      console.warn('[register] verification email dispatch failed', err)
    }

    // Batch DD: do NOT auto-login. Previously this returned a session JWT
    // immediately, making the verification email functionally decorative — an
    // attacker could register with someone else's address and skip
    // verification by simply not clicking the link. Now the user must
    // verify their email before /api/auth/session POST will issue a token.
    //
    // Exception: super-admin (matched by env var) is auto-logged in so platform
    // owners can't lock themselves out during initial setup.
    const isSuperAdmin = email === superAdminEmail
    if (isSuperAdmin) {
      const token = await signToken({
        sub: user.id,
        email: user.email,
        role: user.role,
        tenantId,
      })
      // Mark super-admin email as verified so the verification gate doesn't
      // bounce them on the next login.
      await db`UPDATE users SET email_verified_at = now() WHERE id = ${user.id}::uuid`
      // Batch P.1: set the JWT as an httpOnly cookie alongside the JSON
      // `token`. Same dual-write strategy as /api/auth/session POST.
      const response = NextResponse.json({
        token,
        user: { id: user.id, email: user.email, role: user.role, tenantId, emailVerified: true },
        emailVerificationSent: false,
      }, { status: 201 })
      setSessionCookie(response, token, request)
      return response
    }

    return NextResponse.json({
      // No token — the user must verify their email and then call /api/auth/session POST.
      user: { id: user.id, email: user.email, role: user.role, tenantId, emailVerified: false },
      emailVerificationSent: true,
      message: 'Account created. Check your email for the verification link before signing in.',
    }, { status: 201 })

  } catch (error) {
    console.error('Registration failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Registration failed' },
      { status: 500 }
    )
  }
}
