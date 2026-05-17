/**
 * POST /api/billing/portal
 *
 * Creates a Stripe Customer Portal session for the caller's tenant. Returns
 * `{ url }` — the client redirects there for self-serve plan management
 * (update card, cancel subscription, download invoices).
 *
 * Feature-flagged on `STRIPE_ENABLED`. When off, returns 503 with code
 * `BILLING_DISABLED` so the UI can fall back to a contact-support flow.
 *
 * Restricted to tenant admins (admin / super_admin).
 */
import { NextRequest, NextResponse } from 'next/server'

import { resolveAuthContextFromToken } from '@/lib/auth/server'
import {
  getStripe,
  getStripeCustomerIdForTenant,
  hasStripeSecret,
  isStripeEnabled,
} from '@/lib/server/stripe'

export const dynamic = 'force-dynamic'

function getBearerToken(req: NextRequest) {
  const h = req.headers.get('authorization') || ''
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : null
}

export async function POST(request: NextRequest) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!auth.tenantId) return NextResponse.json({ error: 'No tenant on session' }, { status: 400 })
    if (auth.role !== 'super_admin' && auth.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!isStripeEnabled() || !hasStripeSecret()) {
      return NextResponse.json(
        { error: 'Self-serve billing is temporarily unavailable.', code: 'BILLING_DISABLED' },
        { status: 503 }
      )
    }

    const customerId = await getStripeCustomerIdForTenant(auth.tenantId)
    if (!customerId) {
      return NextResponse.json(
        {
          error: 'No Stripe customer on file for this workspace. Upgrade to a paid plan first to set up billing.',
          code: 'NO_STRIPE_CUSTOMER',
        },
        { status: 409 }
      )
    }

    const stripe = await getStripe()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${appUrl}/settings?billing=return`,
    })

    return NextResponse.json({ ok: true, url: session.url })
  } catch (err: any) {
    console.error('POST /api/billing/portal error:', err)
    return NextResponse.json({ error: err.message || 'Failed to open billing portal' }, { status: 500 })
  }
}
