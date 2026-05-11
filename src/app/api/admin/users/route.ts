import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

import { getDb } from '@/lib/db/client'
import { getSuperAdminEmail, resolveAuthContextFromToken } from '@/lib/auth/server'

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || ''
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null
  return authHeader.slice(7).trim()
}

async function requireSuperAdmin(request: NextRequest) {
  const auth = await resolveAuthContextFromToken(getBearerToken(request))
  if (!auth || auth.role !== 'super_admin') return null
  return auth
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request)
    if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const db = getDb()
    const [users, clients, tasks] = await Promise.all([
      db`SELECT id, email, role, is_active, created_at FROM users ORDER BY email ASC`,
      db`SELECT id, name, owner_user_id FROM clients ORDER BY name ASC`,
      db`SELECT id, title, owner_user_id, status FROM tasks ORDER BY updated_at DESC`,
    ])

    const superAdminEmail = getSuperAdminEmail()
    const formattedUsers = users.map((user: any) => ({
      id: user.id,
      email: user.email,
      fullName: '',
      role: user.email.toLowerCase() === superAdminEmail ? 'super_admin' : user.role,
      isActive: user.is_active,
      confirmed: true,
      createdAt: user.created_at,
      lastSignInAt: null,
    }))

    return NextResponse.json({ users: formattedUsers, clients, tasks })
  } catch (error) {
    console.error('Failed to load admin users:', error)
    return NextResponse.json({ error: 'Failed to load admin users' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request)
    if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json() as {
      email?: string
      password?: string
      role?: 'super_admin' | 'member'
    }

    const email = body.email?.trim().toLowerCase()
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

    const superAdminEmail = getSuperAdminEmail()
    const role = email === superAdminEmail ? 'super_admin' : body.role === 'super_admin' ? 'super_admin' : 'member'
    const temporaryPassword = body.password?.trim() ||
      crypto.randomBytes(12).toString('base64url').slice(0, 14) + 'A!9'

    const passwordHash = await bcrypt.hash(temporaryPassword, 12)
    const db = getDb()
    const rows = await db`
      INSERT INTO users (email, password_hash, role, is_active)
      VALUES (${email}, ${passwordHash}, ${role}, true)
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role
      RETURNING id, email, role
    `
    const user = rows[0]

    return NextResponse.json({ ok: true, user: { id: user.id, email: user.email, role: user.role }, temporaryPassword })
  } catch (error) {
    console.error('Failed to create user:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create user' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request)
    if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json() as {
      userId?: string
      role?: 'super_admin' | 'member'
      isActive?: boolean
    }

    if (!body.userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })

    const db = getDb()
    const existing = await db`SELECT email FROM users WHERE id = ${body.userId}::uuid LIMIT 1`
    if (!existing[0]) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const email = existing[0].email.toLowerCase()
    const lockedSuperAdmin = email === getSuperAdminEmail()
    const nextRole = lockedSuperAdmin ? 'super_admin' : body.role === 'super_admin' ? 'super_admin' : 'member'
    const nextIsActive = lockedSuperAdmin ? true : body.isActive ?? true

    await db`
      UPDATE users SET role = ${nextRole}, is_active = ${nextIsActive}
      WHERE id = ${body.userId}::uuid
    `
    await db`
      UPDATE profiles SET role = ${nextRole}, is_active = ${nextIsActive}
      WHERE id = ${body.userId}::uuid
    `

    return NextResponse.json({ ok: true, user: { id: body.userId, email, role: nextRole, isActive: nextIsActive } })
  } catch (error) {
    console.error('Failed to update user:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to update user' }, { status: 500 })
  }
}
