/**
 * GET  /api/admin/tenants  — list all tenants (super_admin only)
 * POST /api/admin/tenants  — manually provision a tenant for a user
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveAuthContextFromToken, getAuthTokenFromRequest } from '@/lib/auth/server'
import { getDb } from '@/lib/db/client'
import { createTenant, assignUserToTenant } from '@/lib/server/tenants'

function getBearerToken(req: NextRequest) {
  // Batch P.2: cookie OR bearer. Local wrapper kept so call sites don't change.
  return getAuthTokenFromRequest(req)
}

async function requireSuperAdmin(req: NextRequest) {
  const auth = await resolveAuthContextFromToken(getBearerToken(req))
  if (!auth || auth.role !== 'super_admin') return null
  return auth
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request)
    if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const db = getDb()
    const tenants = await db`
      SELECT
        a.id,
        a.slug,
        a.name,
        a.plan_id,
        a.is_active,
        a.created_at,
        a.updated_at,
        u.email         AS owner_email,
        s.status        AS subscription_status,
        s.agent_limit,
        s.current_agent_count,
        s.stripe_customer_id,
        (SELECT COUNT(*)::int FROM agents ag WHERE ag.agency_id = a.id) AS agent_count,
        (SELECT COUNT(*)::int FROM profiles p WHERE p.tenant_id = a.id) AS member_count
      FROM agencies a
      LEFT JOIN users u ON u.id = a.owner_user_id
      LEFT JOIN subscriptions s ON s.tenant_id = a.id
      ORDER BY a.created_at DESC
    `

    return NextResponse.json({ tenants })
  } catch (err) {
    console.error('GET /api/admin/tenants error:', err)
    return NextResponse.json({ error: 'Failed to load tenants' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request)
    if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json()
    const ownerEmail = String(body.ownerEmail || '').trim().toLowerCase()
    const companyName = String(body.companyName || '').trim()
    const planId = body.planId || 'free'

    if (!ownerEmail || !companyName) {
      return NextResponse.json({ error: 'ownerEmail and companyName are required' }, { status: 400 })
    }

    const db = getDb()
    const userRows = await db`SELECT id FROM users WHERE email = ${ownerEmail} LIMIT 1`
    if (!userRows[0]) {
      return NextResponse.json({ error: `No user found with email: ${ownerEmail}` }, { status: 404 })
    }
    const userId = userRows[0].id

    const tenantId = await createTenant({ name: companyName, ownerUserId: userId, planId })
    await assignUserToTenant(userId, tenantId)

    return NextResponse.json({ ok: true, tenantId }, { status: 201 })
  } catch (err) {
    console.error('POST /api/admin/tenants error:', err)
    return NextResponse.json({ error: 'Failed to create tenant' }, { status: 500 })
  }
}
