/**
 * POST /api/billing/webhook
 *
 * Stripe webhook handler — skeleton ready for integration.
 *
 * When Stripe is integrated:
 * 1. Set STRIPE_WEBHOOK_SECRET env var
 * 2. Uncomment the stripe.webhooks.constructEvent() verification block
 * 3. Fill in the event handlers below
 *
 * Stripe sends events here after: successful payment, subscription changes,
 * cancellations, payment failures, etc.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db/client'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const stripeSignature = request.headers.get('stripe-signature')

  // ── Stripe signature verification ────────────────────────────────────────
  // Uncomment when STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET are configured:
  //
  // const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  // if (!webhookSecret || !stripeSignature) {
  //   return NextResponse.json({ error: 'Missing webhook secret or signature' }, { status: 400 })
  // }
  // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' })
  // let event: Stripe.Event
  // try {
  //   event = stripe.webhooks.constructEvent(rawBody, stripeSignature, webhookSecret)
  // } catch (err) {
  //   console.error('Stripe webhook signature verification failed:', err)
  //   return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  // }
  // ─────────────────────────────────────────────────────────────────────────

  // Stub: parse body without verification for local dev / testing
  let event: any
  try {
    event = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const db = getDb()

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        // Payment successful — activate subscription
        const session = event.data?.object
        const tenantId = session?.metadata?.tenant_id
        const planId = session?.metadata?.plan_id
        const stripeSubscriptionId = session?.subscription
        const stripeCustomerId = session?.customer

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
        const sub = event.data?.object
        const stripeSubId = sub?.id
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
        const sub = event.data?.object
        const stripeSubId = sub?.id
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
        const invoice = event.data?.object
        const stripeSubId = invoice?.subscription
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
