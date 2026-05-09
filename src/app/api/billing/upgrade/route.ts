/**
 * POST /api/billing/upgrade
 *
 * Stripe-ready upgrade endpoint.
 * Phase 1 (now): updates the plan in the DB directly — no payment required.
 * Phase 2 (Stripe integration): create a Stripe Checkout session and return
 * the checkout URL; the webhook will update the DB on payment success.
 *
 * Body: { planId: 'starter' | 'growth' | 'enterprise' }
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveAuthContextFromToken } from '@/lib/auth/server'
import { getDb } from '@/lib/db/client'

function getBearerToken(req: NextRequest) {
  const h = req.headers.get('authorization') || ''
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : null
}

const VALID_PLANS = ['free', 'starter', 'growth', 'enterprise'] as const
type PlanId = (typeof VALID_PLANS)[number]

export async function POST(request: NextRequest) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!auth.tenantId) {
      return NextResponse.json({ error: 'No tenant associated with this account' }, { status: 404 })
    }

    const body = await request.json()
    const planId = body.planId as PlanId
    if (!VALID_PLANS.includes(planId)) {
      return NextResponse.json({ error: `Invalid plan. Must be one of: ${VALID_PLANS.join(', ')}` }, { status: 400 })
    }

    const db = getDb()

    // Fetch plan details
    const planRows = await db`SELECT id, name, max_agents, price_monthly_usd, stripe_price_id FROM plans WHERE id = ${planId} LIMIT 1`
    const plan = planRows[0]
    if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

    // ── Stripe integration hook ─────────────────────────────────────────────
    // TODO: When STRIPE_SECRET_KEY is set, create a Checkout session instead
    // of updating directly. Return { checkoutUrl } and let the webhook handle
    // the DB update after payment confirmation.
    //
    // const stripeEnabled = !!process.env.STRIPE_SECRET_KEY
    // if (stripeEnabled && planId !== 'free') {
    //   const session = await stripe.checkout.sessions.create({ ... })
    //   return NextResponse.json({ checkoutUrl: session.url })
    // }
    // ────────────────────────────────────────────────────────────────────────

    // Direct update (pre-Stripe / dev mode)
    await db`
      UPDATE subscriptions
      SET
        plan_id     = ${planId},
        agent_limit = ${plan.max_agents},
        status      = 'active',
        updated_at  = now()
      WHERE tenant_id = ${auth.tenantId}::uuid
    `
    await db`
      UPDATE agencies
      SET plan_id = ${planId}, updated_at = now()
      WHERE id = ${auth.tenantId}::uuid
    `

    return NextResponse.json({
      ok: true,
      plan: {
        id: plan.id,
        name: plan.name,
        maxAgents: plan.max_agents,
        priceMonthlyUsd: Number(plan.price_monthly_usd),
      },
      // checkoutUrl: null — will be a Stripe URL once integrated
    })
  } catch (err) {
    console.error('POST /api/billing/upgrade error:', err)
    return NextResponse.json({ error: 'Failed to upgrade plan' }, { status: 500 })
  }
}
