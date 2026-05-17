/**
 * Thin Stripe wrapper (Batch J)
 *
 * Mission Control's billing layer is feature-flagged via `STRIPE_ENABLED`.
 * When the flag is off (POC / dev), every Stripe-touching path returns 503
 * instead of attempting any network call. When the flag is on, this module
 * provides a single source of truth for:
 *   • the Stripe client instance (lazy, dynamic import so the dep stays
 *     `optionalDependencies` and dev installs that skip optional deps still
 *     compile);
 *   • `STRIPE_API_VERSION` (kept in one place so all routes pin the same one);
 *   • helpers to look up the right `stripe_price_id` for a plan;
 *   • a tiny `isStripeEnabled()` check the routes call before doing work.
 *
 * Routes (upgrade, webhook, portal) import from here rather than
 * re-instantiating Stripe everywhere.
 */
import type Stripe from 'stripe'

import { getDb } from '@/lib/db/client'

// Pinned API version — bump explicitly when you intentionally upgrade. The
// `as any` cast is necessary because the dep is optional and the union of
// version literals isn't visible to callers that don't have @types/stripe.
export const STRIPE_API_VERSION = '2024-12-18.acacia' as any

export function isStripeEnabled(): boolean {
  return process.env.STRIPE_ENABLED === 'true'
}

export function hasStripeSecret(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}

let cachedStripe: Stripe | null = null

/**
 * Returns a lazily-instantiated Stripe client. Throws if STRIPE_ENABLED is
 * false OR if the secret env vars are missing — call `isStripeEnabled()` +
 * `hasStripeSecret()` first if you want to surface a 503 instead.
 */
export async function getStripe(): Promise<Stripe> {
  if (!isStripeEnabled()) {
    throw new Error('Stripe is disabled. Set STRIPE_ENABLED=true and configure STRIPE_SECRET_KEY before calling.')
  }
  if (!hasStripeSecret()) {
    throw new Error('STRIPE_SECRET_KEY is not set.')
  }
  if (cachedStripe) return cachedStripe

  const { default: StripeCtor } = await import('stripe')
  cachedStripe = new StripeCtor(process.env.STRIPE_SECRET_KEY!, { apiVersion: STRIPE_API_VERSION })
  return cachedStripe
}

/**
 * Resolve the Stripe price-id configured for a given plan slug. Returns
 * null if the plan doesn't exist or has no price set yet (free plan, or
 * a plan that the admin still needs to wire up).
 */
export async function getStripePriceIdForPlan(planId: string): Promise<string | null> {
  const db = getDb()
  const rows = await db`SELECT stripe_price_id FROM plans WHERE id = ${planId} LIMIT 1`
  const priceId = rows[0]?.stripe_price_id
  return typeof priceId === 'string' && priceId.trim() ? priceId : null
}

/**
 * Resolve the Stripe customer id for a tenant, or null if there isn't one
 * yet. Subscriptions.stripe_customer_id is populated by the
 * `checkout.session.completed` webhook handler.
 */
export async function getStripeCustomerIdForTenant(tenantId: string): Promise<string | null> {
  const db = getDb()
  const rows = await db`
    SELECT stripe_customer_id FROM subscriptions
    WHERE tenant_id = ${tenantId}::uuid LIMIT 1
  `
  const id = rows[0]?.stripe_customer_id
  return typeof id === 'string' && id.trim() ? id : null
}
