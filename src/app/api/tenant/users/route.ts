/**
 * /api/tenant/users — Tenant-scoped user management
 *
 * Accessible by: super_admin (any tenant) and admin (own tenant only)
 *
 * GET    — list all users in the requester's tenant
 * POST   — create a new user and add them to the requester's tenant (no new tenant created)
 * PATCH  — update role / active status of a user within the same tenant
 * DELETE — remove a user from the tenant (profile.tenant_id → null)
 */
import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

import { getDb } from '@/lib/db/client'
import { resolveAuthContextFromToken } from '@/lib/auth/server'
import { assignUserToTenant } from '@/lib/server/tenants'

function getBearerToken(req: NextRequest) {
  const h = req.headers.get('authorization') || ''
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : null
}

async function requireTenantAdmin(req: NextRequest) {
  const auth = await resolveAuthContextFromToken(getBearerToken(req))
  if (!auth) return null
  if (auth.role !== 'super_admin' && auth.role !== 'admin') return null
  return auth
}

// ─── GET /api/tenant/users ────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const auth = await requireTenantAdmin(request)
    if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    if (!auth.tenantId) {
      return NextResponse.json({ error: 'No tenant associated with your account' }, { status: 400 })
    }

    const db = getDb()
    const users = await db`
      SELECT
        u.id,
        u.email,
        u.role,
        u.is_active,
        u.created_at,
        p.full_name,
        p.tenant_id
      FROM users u
      JOIN profiles p ON p.id = u.id
      WHERE p.tenant_id = ${auth.tenantId}::uuid
      ORDER BY u.created_at ASC
    `

    return NextResponse.json({
      users: users.map((u: any) => ({
        id: u.id,
        email: u.email,
        fullName: u.full_name || '',
        role: u.role as 'super_admin' | 'admin' | 'member',
        isActive: u.is_active,
        createdAt: u.created_at,
      })),
    })
  } catch (err) {
    console.error('GET /api/tenant/users error:', err)
    return NextResponse.json({ error: 'Failed to load team members' }, { status: 500 })
  }
}

// ─── POST /api/tenant/users ───────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const auth = await requireTenantAdmin(request)
    if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    if (!auth.tenantId) {
      return NextResponse.json({ error: 'No tenant associated with your account' }, { status: 400 })
    }

    const body = await request.json() as {
      email?: string
      fullName?: string
      password?: string
      role?: 'admin' | 'member'
    }

    const email = body.email?.trim().toLowerCase()
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

    const db = getDb()

    // Check if user already exists
    const existing = await db`SELECT id, role FROM users WHERE email = ${email} LIMIT 1`
    if (existing.length > 0) {
      // User exists — just add them to this tenant if not already assigned
      const existingUser = existing[0]
      const profileRows = await db`SELECT tenant_id FROM profiles WHERE id = ${existingUser.id}::uuid LIMIT 1`
      if (profileRows[0]?.tenant_id) {
        return NextResponse.json({ error: 'This user already belongs to a workspace' }, { status: 409 })
      }
      // Assign to this tenant
      await assignUserToTenant(existingUser.id, auth.tenantId)
      return NextResponse.json({
        ok: true,
        user: { id: existingUser.id, email, role: existingUser.role },
        message: 'Existing user added to your workspace',
      })
    }

    // Create new user — do NOT create a new tenant for them
    const role: 'admin' | 'member' = body.role === 'admin' ? 'admin' : 'member'
    const temporaryPassword = body.password?.trim() ||
      crypto.randomBytes(12).toString('base64url').slice(0, 14) + 'A!9'
    const passwordHash = await bcrypt.hash(temporaryPassword, 12)
    const fullName = body.fullName?.trim() || ''

    const userRows = await db`
      INSERT INTO users (email, password_hash, role, is_active)
      VALUES (${email}, ${passwordHash}, ${role}, true)
      RETURNING id, email, role
    `
    const user = userRows[0]

    // Create profile WITHOUT creating a new tenant
    await db`
      INSERT INTO profiles (id, email, role, is_active, full_name, tenant_id)
      VALUES (
        ${user.id}::uuid,
        ${email},
        ${role},
        true,
        ${fullName || null},
        ${auth.tenantId}::uuid
      )
      ON CONFLICT (id) DO UPDATE
        SET email      = EXCLUDED.email,
            role       = EXCLUDED.role,
            full_name  = EXCLUDED.full_name,
            tenant_id  = EXCLUDED.tenant_id,
            updated_at = now()
    `

    return NextResponse.json(
      {
        ok: true,
        user: { id: user.id, email: user.email, role: user.role },
        temporaryPassword,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('POST /api/tenant/users error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to create user' }, { status: 500 })
  }
}

// ─── PATCH /api/tenant/users ──────────────────────────────────────────────────
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireTenantAdmin(request)
    if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    if (!auth.tenantId) {
      return NextResponse.json({ error: 'No tenant associated with your account' }, { status: 400 })
    }

    const body = await request.json() as {
      userId?: string
      role?: 'admin' | 'member'
      isActive?: boolean
    }

    if (!body.userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })

    const db = getDb()

    // Verify this user belongs to the same tenant
    const profileRows = await db`
      SELECT u.email, p.tenant_id FROM profiles p
      JOIN users u ON u.id = p.id
      WHERE p.id = ${body.userId}::uuid
      LIMIT 1
    `
    if (!profileRows[0]) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    if (
      auth.role !== 'super_admin' &&
      profileRows[0].tenant_id !== auth.tenantId
    ) {
      return NextResponse.json({ error: 'Forbidden — user belongs to a different workspace' }, { status: 403 })
    }

    const nextRole: 'admin' | 'member' = body.role === 'admin' ? 'admin' : 'member'
    const nextIsActive: boolean = body.isActive ?? true

    await db`UPDATE users SET role = ${nextRole}, is_active = ${nextIsActive} WHERE id = ${body.userId}::uuid`
    await db`UPDATE profiles SET role = ${nextRole}, is_active = ${nextIsActive} WHERE id = ${body.userId}::uuid`

    return NextResponse.json({
      ok: true,
      user: { id: body.userId, email: profileRows[0].email, role: nextRole, isActive: nextIsActive },
    })
  } catch (err) {
    console.error('PATCH /api/tenant/users error:', err)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

// ─── DELETE /api/tenant/users ─────────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireTenantAdmin(request)
    if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    if (!userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 })

    const db = getDb()
    const profileRows = await db`SELECT tenant_id FROM profiles WHERE id = ${userId}::uuid LIMIT 1`
    if (!profileRows[0]) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    if (
      auth.role !== 'super_admin' &&
      profileRows[0].tenant_id !== auth.tenantId
    ) {
      return NextResponse.json({ error: 'Forbidden — user belongs to a different workspace' }, { status: 403 })
    }

    // Remove from tenant (don't delete the user account)
    await db`UPDATE profiles SET tenant_id = null, updated_at = now() WHERE id = ${userId}::uuid`

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/tenant/users error:', err)
    return NextResponse.json({ error: 'Failed to remove user' }, { status: 500 })
  }
}
