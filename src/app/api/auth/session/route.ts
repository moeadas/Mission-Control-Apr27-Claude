import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

import { resolveAuthContextFromToken } from '@/lib/auth/server'
import { getDb } from '@/lib/db/client'
import { signToken } from '@/lib/auth/jwt'
import { getTenantIdForUser } from '@/lib/server/tenants'
import { checkRateLimit, getClientIp } from '@/lib/server/rate-limit'

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || ''
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null
  return authHeader.slice(7).trim()
}

// GET — verify existing JWT
export async function GET(request: NextRequest) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: auth.userId,
        email: auth.email,
        role: auth.role,
      },
    })
  } catch (error) {
    console.error('Failed to resolve auth session:', error)
    return NextResponse.json({ authenticated: false, error: 'Failed to resolve auth session' }, { status: 500 })
  }
}

// POST — login with email + password, returns JWT
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    // Two-axis rate limit: per IP (slow blanket cap) and per email (foil
    // distributed brute-force against a specific account). Both must allow
    // the request to proceed. Durable=true so the counter survives restarts.
    const ip = getClientIp(request.headers)
    const ipRl = await checkRateLimit(`auth:login:ip:${ip}`, { limit: 30, windowSeconds: 60 * 10, durable: true })
    const emailRl = await checkRateLimit(`auth:login:email:${email}`, { limit: 10, windowSeconds: 60 * 10, durable: true })
    if (!ipRl.allowed || !emailRl.allowed) {
      const retryAfter = Math.max(ipRl.retryAfterSeconds, emailRl.retryAfterSeconds, 1)
      return NextResponse.json(
        { error: 'Too many login attempts. Please slow down.', retryAfterSeconds: retryAfter },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      )
    }

    const db = getDb()
    const rows = await db`
      SELECT id, email, role, password_hash, is_active, email_verified_at
      FROM users
      WHERE email = ${email}
      LIMIT 1
    `
    const user = rows[0]

    if (!user || !user.is_active) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Batch DD: gate login on verified email. Without this, the verification
    // link is decorative — an attacker who registers with an address they
    // don't control gets full session access immediately.
    //
    // Super-admin and accounts created before this code shipped (where
    // email_verified_at would always be null) get a grace window: if the
    // SUPER_ADMIN_EMAIL env var matches, skip the gate so platform owners
    // can never lock themselves out.
    const superAdminEmail = (process.env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase()
    const isSuperAdmin = user.email === superAdminEmail
    if (!user.email_verified_at && !isSuperAdmin) {
      return NextResponse.json(
        {
          error: 'Please verify your email before signing in. Check your inbox for the verification link, or request a new one.',
          code: 'EMAIL_NOT_VERIFIED',
          email: user.email,
        },
        { status: 403 }
      )
    }

    const tenantId = await getTenantIdForUser(user.id) ?? undefined
    const token = await signToken({ sub: user.id, email: user.email, role: user.role, tenantId })
    return NextResponse.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        tenantId,
        emailVerified: !!user.email_verified_at,
      },
    })
  } catch (error) {
    console.error('Login failed:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
