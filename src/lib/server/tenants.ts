/**
 * Tenant management helpers
 * A "tenant" is backed by the agencies table (kept for FK compatibility).
 * Each tenant gets a subscription row on creation.
 */
import { getDb } from '@/lib/db/client'
import { seedTenantRequiredAgents } from '@/lib/server/agent-templates'

export type TenantRow = {
  id: string
  slug: string
  name: string
  plan_id: string
  owner_user_id: string | null
  is_active: boolean
  subscription_status: string
  agent_limit: number
  current_agent_count: number
}

/** Slugify a company name for use as a tenant slug */
function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

/**
 * Create a new tenant (agency) and its free subscription.
 * Returns the new tenant id.
 */
export async function createTenant(opts: {
  name: string
  ownerUserId: string
  planId?: string
}): Promise<string> {
  const db = getDb()
  const planId = opts.planId || 'free'
  const baseSlug = slugify(opts.name) || 'tenant'

  // Ensure slug uniqueness by appending a short random suffix if needed
  let slug = baseSlug
  const existing = await db`SELECT slug FROM agencies WHERE slug LIKE ${baseSlug + '%'}`
  if (existing.length > 0) {
    slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`
  }

  const [tenant] = await db`
    INSERT INTO agencies (slug, name, settings, owner_user_id, plan_id)
    VALUES (${slug}, ${opts.name}, '{}', ${opts.ownerUserId}::uuid, ${planId})
    RETURNING id
  `

  // Create matching subscription
  await db`
    INSERT INTO subscriptions (tenant_id, plan_id, agent_limit)
    SELECT ${tenant.id}::uuid, id, max_agents FROM plans WHERE id = ${planId}
    ON CONFLICT (tenant_id) DO NOTHING
  `

  // Auto-seed the complete bundled roster. Pipelines reference these specialists
  // by template identity, so omitting a department would silently route its work
  // back to Iris. Failure remains non-fatal so tenant creation is recoverable.
  try {
    await seedTenantRequiredAgents(tenant.id as string)
    await syncAgentCount(tenant.id as string)
  } catch (err) {
    console.warn('[createTenant] Failed to auto-seed Iris for tenant', tenant.id, err)
  }

  return tenant.id as string
}

/**
 * Get the tenant id for a user from their profile.
 * Returns null if the user has no tenant yet.
 */
export async function getTenantIdForUser(userId: string): Promise<string | null> {
  const db = getDb()
  const rows = await db`SELECT tenant_id FROM profiles WHERE id = ${userId}::uuid LIMIT 1`
  return rows[0]?.tenant_id ?? null
}

/**
 * Assign a user to a tenant (sets profile.tenant_id).
 */
export async function assignUserToTenant(userId: string, tenantId: string) {
  const db = getDb()
  await db`
    UPDATE profiles SET tenant_id = ${tenantId}::uuid, updated_at = now()
    WHERE id = ${userId}::uuid
  `
}

/**
 * Get full tenant details by id.
 */
export async function getTenantById(tenantId: string): Promise<TenantRow | null> {
  const db = getDb()
  const rows = await db`
    SELECT
      a.id, a.slug, a.name, a.plan_id, a.owner_user_id, a.is_active,
      COALESCE(s.status, 'active')  AS subscription_status,
      COALESCE(s.agent_limit, 3)    AS agent_limit,
      COALESCE(s.current_agent_count, 0) AS current_agent_count
    FROM agencies a
    LEFT JOIN subscriptions s ON s.tenant_id = a.id
    WHERE a.id = ${tenantId}::uuid
    LIMIT 1
  `
  return (rows[0] as TenantRow) ?? null
}

/**
 * Get the live agent count for a tenant (counts rows in agents table).
 */
export async function getAgentCountForTenant(tenantId: string): Promise<number> {
  const db = getDb()
  const rows = await db`SELECT COUNT(*)::int AS cnt FROM agents WHERE agency_id = ${tenantId}::uuid`
  return rows[0]?.cnt ?? 0
}

/**
 * Refresh the denormalized current_agent_count in subscriptions.
 */
export async function syncAgentCount(tenantId: string) {
  const db = getDb()
  await db`
    UPDATE subscriptions
    SET current_agent_count = (
      SELECT COUNT(*)::int FROM agents WHERE agency_id = ${tenantId}::uuid
    ),
    updated_at = now()
    WHERE tenant_id = ${tenantId}::uuid
  `
}

/**
 * Check whether a tenant can add another agent given their plan limit.
 * Returns { allowed: true } or { allowed: false, limit, current }.
 */
export async function canAddAgent(tenantId: string): Promise<
  { allowed: true } | { allowed: false; limit: number; current: number }
> {
  const db = getDb()
  const rows = await db`
    SELECT
      COALESCE(s.agent_limit, 3)         AS agent_limit,
      COUNT(a.id)::int                   AS current_count
    FROM subscriptions s
    LEFT JOIN agents a ON a.agency_id = ${tenantId}::uuid
    WHERE s.tenant_id = ${tenantId}::uuid
    GROUP BY s.agent_limit
  `
  const row = rows[0]
  if (!row) return { allowed: true } // no subscription yet — generous fallback

  const limit: number = row.agent_limit
  const current: number = row.current_count

  if (limit === -1) return { allowed: true } // unlimited (enterprise)
  if (current < limit) return { allowed: true }
  return { allowed: false, limit, current }
}
