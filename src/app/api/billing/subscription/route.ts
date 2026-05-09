/**
 * GET /api/billing/subscription
 * Returns the current tenant's plan and subscription status.
 * Used by the UI to show plan details and enforce limits.
 */
import { NextRequest, NextResponse } from 'next/server'
import { resolveAuthContextFromToken } from '@/lib/auth/server'
import { getDb } from '@/lib/db/client'

function getBearerToken(req: NextRequest) {
  const h = req.headers.get('authorization') || ''
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : null
}

export async function GET(request: NextRequest) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!auth.tenantId) {
      return NextResponse.json({ error: 'No tenant associated with this account' }, { status: 404 })
    }

    const db = getDb()
    const rows = await db`
      SELECT
        s.id,
        s.plan_id,
        s.status,
        s.agent_limit,
        s.current_agent_count,
        s.billing_cycle_start,
        s.billing_cycle_end,
        s.trial_ends_at,
        s.stripe_subscription_id,
        s.stripe_customer_id,
        p.name          AS plan_name,
        p.max_agents,
        p.price_monthly_usd
      FROM subscriptions s
      JOIN plans p ON p.id = s.plan_id
      WHERE s.tenant_id = ${auth.tenantId}::uuid
      LIMIT 1
    `
    const sub = rows[0]
    if (!sub) return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })

    return NextResponse.json({
      subscription: {
        id: sub.id,
        planId: sub.plan_id,
        planName: sub.plan_name,
        status: sub.status,
        agentLimit: sub.agent_limit,
        currentAgentCount: sub.current_agent_count,
        maxAgents: sub.max_agents,
        priceMonthlyUsd: Number(sub.price_monthly_usd),
        billingCycleStart: sub.billing_cycle_start,
        billingCycleEnd: sub.billing_cycle_end,
        trialEndsAt: sub.trial_ends_at,
        // Stripe fields — null until Stripe integration is complete
        stripeSubscriptionId: sub.stripe_subscription_id,
        stripeCustomerId: sub.stripe_customer_id,
        // Convenience flags
        isUnlimited: sub.agent_limit === -1,
        canAddAgent: sub.agent_limit === -1 || sub.current_agent_count < sub.agent_limit,
      },
    })
  } catch (err) {
    console.error('GET /api/billing/subscription error:', err)
    return NextResponse.json({ error: 'Failed to load subscription' }, { status: 500 })
  }
}
