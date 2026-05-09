/**
 * POST /api/auth/register
 *
 * Self-serve signup. Creates:
 *   1. user row (users table)
 *   2. profile row (profiles table)
 *   3. tenant (agencies) row with a free subscription
 *   4. links profile → tenant
 *
 * Returns a JWT with tenantId embedded so the client can start using the app immediately.
 */
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

import { getDb } from '@/lib/db/client'
import { signToken } from '@/lib/auth/jwt'
import { createTenant, assignUserToTenant } from '@/lib/server/tenants'
import { getSuperAdminEmail } from '@/lib/auth/server'

export async function POST(request: NextRequest) {
  try {
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

    // ── Issue JWT ───────────────────────────────────────────────────────────
    const token = await signToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId,
    })

    return NextResponse.json({
      token,
      user: { id: user.id, email: user.email, role: user.role, tenantId },
    }, { status: 201 })

  } catch (error) {
    console.error('Registration failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Registration failed' },
      { status: 500 }
    )
  }
}
