/**
 * /api/admin/plans — Subscription plan management (super_admin only)
 *
 * GET    — list all plans
 * POST   — create a new custom plan
 * PATCH  — update a plan's name, price, max_agents, or active status
 * DELETE — soft-delete (deactivate) a custom plan
 */
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db/client'
import { resolveAuthContextFromToken } from '@/lib/auth/server'

function getBearerToken(req: NextRequest) {
  const h = req.headers.get('authorization') || ''
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : null
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
    const plans = await db`
      SELECT
        p.id,
        p.name,
        p.max_agents,
        p.price_monthly_usd,
        p.stripe_price_id,
        p.is_active,
        p.created_at,
        (SELECT COUNT(*)::int FROM subscriptions s WHERE s.plan_id = p.id) AS subscriber_count
      FROM plans p
      ORDER BY p.price_monthly_usd ASC
    `

    return NextResponse.json({
      plans: plans.map((p: any) => ({
        id: p.id,
        name: p.name,
        maxAgents: p.max_agents,
        priceMonthlyUsd: Number(p.price_monthly_usd),
        stripePriceId: p.stripe_price_id || '',
        isActive: p.is_active,
        createdAt: p.created_at,
        subscriberCount: p.subscriber_count,
      })),
    })
  } catch (err) {
    console.error('GET /api/admin/plans error:', err)
    return NextResponse.json({ error: 'Failed to load plans' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request)
    if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json() as {
      id?: string
      name?: string
      maxAgents?: number
      priceMonthlyUsd?: number
      stripePriceId?: string
      isActive?: boolean
    }

    if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const db = getDb()
    const existing = await db`SELECT id FROM plans WHERE id = ${body.id} LIMIT 1`
    if (!existing[0]) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

    // Build update fields dynamically
    const updates: Record<string, unknown> = {}
    if (body.name !== undefined) updates.name = body.name.trim()
    if (body.maxAgents !== undefined) updates.max_agents = body.maxAgents
    if (body.priceMonthlyUsd !== undefined) updates.price_monthly_usd = body.priceMonthlyUsd
    if (body.stripePriceId !== undefined) updates.stripe_price_id = body.stripePriceId.trim() || null
    if (body.isActive !== undefined) updates.is_active = body.isActive

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    // Build dynamic SET clause
    const setClause = Object.entries(updates)
      .map(([k]) => `${k} = $${k}`)
      .join(', ')

    // Use tagged template approach — update each field explicitly
    const {
      name,
      max_agents,
      price_monthly_usd,
      stripe_price_id,
      is_active,
    } = {
      name: updates.name as string | undefined,
      max_agents: updates.max_agents as number | undefined,
      price_monthly_usd: updates.price_monthly_usd as number | undefined,
      stripe_price_id: updates.stripe_price_id as string | null | undefined,
      is_active: updates.is_active as boolean | undefined,
    }

    await db`
      UPDATE plans SET
        name               = COALESCE(${name ?? null}, name),
        max_agents         = COALESCE(${max_agents ?? null}::int, max_agents),
        price_monthly_usd  = COALESCE(${price_monthly_usd ?? null}::numeric, price_monthly_usd),
        stripe_price_id    = CASE WHEN ${stripe_price_id !== undefined}::boolean THEN ${stripe_price_id ?? null} ELSE stripe_price_id END,
        is_active          = COALESCE(${is_active ?? null}::boolean, is_active)
      WHERE id = ${body.id}
    `

    // Return updated plan
    const rows = await db`
      SELECT id, name, max_agents, price_monthly_usd, stripe_price_id, is_active
      FROM plans WHERE id = ${body.id} LIMIT 1
    `
    const p = rows[0]

    return NextResponse.json({
      ok: true,
      plan: {
        id: p.id,
        name: p.name,
        maxAgents: p.max_agents,
        priceMonthlyUsd: Number(p.price_monthly_usd),
        stripePriceId: p.stripe_price_id || '',
        isActive: p.is_active,
      },
    })
  } catch (err) {
    console.error('PATCH /api/admin/plans error:', err)
    return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 })
  }
}

// ─── POST /api/admin/plans ─────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request)
    if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const body = await request.json() as {
      id?: string
      name?: string
      maxAgents?: number
      priceMonthlyUsd?: number
      stripePriceId?: string
    }

    const name = body.name?.trim()
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 })

    // Generate slug-style ID from name if not provided
    const rawId = body.id?.trim() ||
      name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 30)

    const maxAgents = typeof body.maxAgents === 'number' ? body.maxAgents : 10
    const priceMonthlyUsd = typeof body.priceMonthlyUsd === 'number' ? body.priceMonthlyUsd : 0
    const stripePriceId = body.stripePriceId?.trim() || null

    const db = getDb()

    // Ensure ID uniqueness
    const existing = await db`SELECT id FROM plans WHERE id = ${rawId} LIMIT 1`
    const planId = existing.length > 0 ? `${rawId}_${Date.now().toString(36)}` : rawId

    const rows = await db`
      INSERT INTO plans (id, name, max_agents, price_monthly_usd, stripe_price_id, is_active)
      VALUES (${planId}, ${name}, ${maxAgents}, ${priceMonthlyUsd}, ${stripePriceId}, true)
      RETURNING id, name, max_agents, price_monthly_usd, stripe_price_id, is_active
    `
    const p = rows[0]

    return NextResponse.json({
      ok: true,
      plan: {
        id: p.id,
        name: p.name,
        maxAgents: p.max_agents,
        priceMonthlyUsd: Number(p.price_monthly_usd),
        stripePriceId: p.stripe_price_id || '',
        isActive: p.is_active,
        subscriberCount: 0,
      },
    }, { status: 201 })
  } catch (err) {
    console.error('POST /api/admin/plans error:', err)
    return NextResponse.json({ error: 'Failed to create plan' }, { status: 500 })
  }
}

// ─── DELETE /api/admin/plans ───────────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request)
    if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    // Prevent deleting built-in plans
    const builtIn = new Set(['free', 'starter', 'growth', 'enterprise'])
    if (builtIn.has(id)) {
      return NextResponse.json({ error: 'Cannot delete built-in plans — deactivate them instead' }, { status: 400 })
    }

    // Check for active subscribers
    const db = getDb()
    const subs = await db`SELECT COUNT(*)::int AS cnt FROM subscriptions WHERE plan_id = ${id}`
    if (subs[0]?.cnt > 0) {
      return NextResponse.json({
        error: `Cannot delete plan with ${subs[0].cnt} active subscriber(s) — deactivate it instead`,
      }, { status: 409 })
    }

    await db`DELETE FROM plans WHERE id = ${id}`
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('DELETE /api/admin/plans error:', err)
    return NextResponse.json({ error: 'Failed to delete plan' }, { status: 500 })
  }
}
