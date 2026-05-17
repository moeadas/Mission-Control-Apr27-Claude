/**
 * POST /api/billing/upgrade
 *
 * Stripe-ready upgrade endpoint with feature-flag gating.
 *
 * Modes (controlled by env `STRIPE_ENABLED`):
 *   • STRIPE_ENABLED !== 'true' (default — Stripe deferred):
 *       - Tenant members + admins:  503 — Billing temporarily unavailable
 *       - Super-admins: direct DB update (lets the platform owner change a tenant's
 *         plan for testing/comping/migration without going through Stripe)
 *   • STRIPE_ENABLED === 'true' (post-launch):
 *       - For paid plans, return a Stripe Checkout session URL.
 *       - The webhook (POST /api/billing/webhook) commits the DB change after payment.
 *       - Free-plan downgrade still updates the DB directly.
 *
 * Body: { planId: 'free' | 'starter' | 'growth' | 'enterprise' }
 */
import { NextRequest, NextResponse } from 'next/server'

import { resolveAuthContextFromToken } from '@/lib/auth/server'
import { getDb } from '@/lib/db/client'
import { getStripe, hasStripeSecret, isStripeEnabled } from '@/lib/server/stripe'

function getBearerToken(req: NextRequest) {
  const h = req.headers.get('authorization') || ''
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : null
}

const VALID_PLANS = ['free', 'starter', 'growth', 'enterprise'] as const
type PlanId = (typeof VALID_PLANS)[number]

async function applyDirectPlanChange(
  db: ReturnType<typeof getDb>,
  tenantId: string,
  planId: PlanId,
  maxAgents: number
) {
  await db`
    UPDATE subscriptions
    SET
      plan_id     = ${planId},
      agent_limit = ${maxAgents},
      status      = 'active',
      updated_at  = now()
    WHERE tenant_id = ${tenantId}::uuid
  `
  await db`
    UPDATE agencies
    SET plan_id = ${planId}, updated_at = now()
    WHERE id = ${tenantId}::uuid
  `
}

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
    const planRows = await db`SELECT id, name, max_agents, price_monthly_usd, stripe_price_id FROM plans WHERE id = ${planId} LIMIT 1`
    const plan = planRows[0]
    if (!plan) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

    // ── Stripe disabled (default during proof-of-concept) ───────────────────
    if (!isStripeEnabled()) {
      // Allow super-admin to change plans directly (for testing, comping, manual ops).
      // Reject regular tenant users so they cannot self-upgrade for free.
      if (auth.role !== 'super_admin') {
        return NextResponse.json(
          {
            error: 'Billing is temporarily unavailable while we finalize payment integration.',
            code: 'BILLING_DISABLED',
          },
          { status: 503 }
        )
      }

      await applyDirectPlanChange(db, auth.tenantId, planId, plan.max_agents)
      return NextResponse.json({
        ok: true,
        mode: 'direct-admin',
        plan: {
          id: plan.id,
          name: plan.name,
          maxAgents: plan.max_agents,
          priceMonthlyUsd: Number(plan.price_monthly_usd),
        },
      })
    }

    // ── Stripe enabled path ─────────────────────────────────────────────────
    // Free-plan downgrade is a direct DB change (no charge); paid plans require Checkout.
    if (planId === 'free') {
      await applyDirectPlanChange(db, auth.tenantId, planId, plan.max_agents)
      return NextResponse.json({
        ok: true,
        mode: 'downgrade-free',
        plan: {
          id: plan.id,
          name: plan.name,
          maxAgents: plan.max_agents,
          priceMonthlyUsd: 0,
        },
      })
    }

    if (!plan.stripe_price_id) {
      return NextResponse.json(
        {
          error: `Plan "${planId}" has no Stripe price configured. Configure it under Admin → Plans before upgrading.`,
          code: 'STRIPE_PRICE_MISSING',
        },
        { status: 500 }
      )
    }

    if (!hasStripeSecret()) {
      return NextResponse.json(
        { error: 'STRIPE_ENABLED is true but STRIPE_SECRET_KEY is not set.', code: 'STRIPE_MISCONFIGURED' },
        { status: 500 }
      )
    }

    const stripe = await getStripe()

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: plan.stripe_price_id, quantity: 1 }],
      success_url: `${appUrl}/settings?billing=success`,
      cancel_url: `${appUrl}/settings?billing=cancelled`,
      metadata: {
        tenant_id: auth.tenantId,
        plan_id: planId,
      },
      customer_email: auth.email,
    })

    return NextResponse.json({
      ok: true,
      mode: 'stripe-checkout',
      checkoutUrl: session.url,
    })
  } catch (err) {
    console.error('POST /api/billing/upgrade error:', err)
    return NextResponse.json({ error: 'Failed to upgrade plan' }, { status: 500 })
  }
}
