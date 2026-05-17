/**
 * POST /api/billing/webhook
 *
 * Stripe webhook handler — signature verification is REQUIRED.
 *
 * Gating:
 *   • STRIPE_ENABLED !== 'true' (default — Stripe deferred): 503, refuse all events.
 *   • STRIPE_ENABLED === 'true' + STRIPE_WEBHOOK_SECRET set: verify signature, then dispatch.
 *
 * Stripe sends events here after: successful payment, subscription changes,
 * cancellations, payment failures, etc.
 */
import { NextRequest, NextResponse } from 'next/server'

import { getDb } from '@/lib/db/client'
import { getStripe, hasStripeSecret, isStripeEnabled } from '@/lib/server/stripe'

export async function POST(request: NextRequest) {
  // Refuse all events while Stripe is in proof-of-concept disabled state.
  if (!isStripeEnabled()) {
    return NextResponse.json(
      { error: 'Billing webhooks are disabled.', code: 'BILLING_DISABLED' },
      { status: 503 }
    )
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const stripeSignature = request.headers.get('stripe-signature')
  const rawBody = await request.text()

  if (!webhookSecret || !hasStripeSecret()) {
    console.error('[billing/webhook] STRIPE_ENABLED is true but webhook/secret env vars missing')
    return NextResponse.json(
      { error: 'Webhook misconfigured', code: 'STRIPE_MISCONFIGURED' },
      { status: 500 }
    )
  }

  if (!stripeSignature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  const stripe = await getStripe()

  let event: import('stripe').Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, stripeSignature, webhookSecret)
  } catch (err) {
    console.error('[billing/webhook] Stripe signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const db = getDb()

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        // Payment successful — activate subscription
        const session = event.data.object as import('stripe').Stripe.Checkout.Session
        const tenantId = session.metadata?.tenant_id
        const planId = session.metadata?.plan_id
        // Stripe may return either an expanded object or just an ID; normalize to string.
        const stripeSubscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id ?? null
        const stripeCustomerId =
          typeof session.customer === 'string'
            ? session.customer
            : session.customer?.id ?? null

        if (tenantId && planId) {
          const planRows = await db`SELECT max_agents FROM plans WHERE id = ${planId} LIMIT 1`
          const maxAgents = planRows[0]?.max_agents ?? 3

          await db`
            UPDATE subscriptions
            SET
              plan_id                = ${planId},
              status                 = 'active',
              agent_limit            = ${maxAgents},
              stripe_subscription_id = ${stripeSubscriptionId},
              stripe_customer_id     = ${stripeCustomerId},
              billing_cycle_start    = now(),
              updated_at             = now()
            WHERE tenant_id = ${tenantId}::uuid
          `
          await db`
            UPDATE agencies SET plan_id = ${planId}, updated_at = now()
            WHERE id = ${tenantId}::uuid
          `
        }
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as import('stripe').Stripe.Subscription
        const stripeSubId = sub.id
        if (stripeSubId) {
          const status = sub.status === 'active' ? 'active'
            : sub.status === 'trialing' ? 'trialing'
            : sub.status === 'past_due' ? 'past_due'
            : 'canceled'
          await db`
            UPDATE subscriptions
            SET status = ${status}, updated_at = now()
            WHERE stripe_subscription_id = ${stripeSubId}
          `
        }
        break
      }

      case 'customer.subscription.deleted': {
        // Subscription canceled — downgrade to free
        const sub = event.data.object as import('stripe').Stripe.Subscription
        const stripeSubId = sub.id
        if (stripeSubId) {
          const freePlan = await db`SELECT max_agents FROM plans WHERE id = 'free' LIMIT 1`
          const freeLimit = freePlan[0]?.max_agents ?? 3
          await db`
            UPDATE subscriptions
            SET
              plan_id     = 'free',
              status      = 'canceled',
              agent_limit = ${freeLimit},
              canceled_at = now(),
              updated_at  = now()
            WHERE stripe_subscription_id = ${stripeSubId}
          `
          await db`
            UPDATE agencies a
            SET plan_id = 'free', updated_at = now()
            FROM subscriptions s
            WHERE s.tenant_id = a.id AND s.stripe_subscription_id = ${stripeSubId}
          `
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as import('stripe').Stripe.Invoice
        // `subscription` on Invoice can be string | Subscription | null
        const rawSub = (invoice as any).subscription
        const stripeSubId: string | null =
          typeof rawSub === 'string' ? rawSub : rawSub?.id ?? null
        if (stripeSubId) {
          await db`
            UPDATE subscriptions
            SET status = 'past_due', updated_at = now()
            WHERE stripe_subscription_id = ${stripeSubId}
          `
        }
        break
      }

      default:
        // Unhandled event — acknowledge receipt so Stripe doesn't retry
        console.log(`[billing/webhook] unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[billing/webhook] handler error:', err)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
