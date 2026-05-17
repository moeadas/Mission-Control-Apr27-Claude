/**
 * Tenant-configurable content defaults (Batch H)
 *
 * Replaces the hardcoded `Instagram, LinkedIn`, `30 days`, `3-4 posts per
 * week`, etc. defaults that lived inside autonomous-task.ts and
 * content-calendar-engine.ts. Each tenant can override these via
 * `agencies.settings.contentDefaults`, which the dashboard / settings UI
 * will surface later. Tenants without an override fall back to a sensible
 * universal default (no behaviour change for existing data).
 */
import { getDb } from '@/lib/db/client'

export interface TenantContentDefaults {
  platforms: string
  postingFrequency: string
  campaignDuration: string
  contentGoal: string
  budgetRange: string
  timeline: string
  /** Used by the calendar engine to estimate window when "week" / "month" cues are missing. */
  defaultCalendarDays: number
}

// Universal fallback — generic enough to apply to any company, not just
// agencies. Tenants override per-business in Settings.
export const FALLBACK_CONTENT_DEFAULTS: TenantContentDefaults = {
  platforms: 'Choose the channels most relevant to this client',
  postingFrequency: 'Choose a cadence that fits the client\'s channel mix',
  campaignDuration: '30 days',
  contentGoal: 'Awareness and engagement',
  budgetRange: 'TBD — confirm with the client',
  timeline: 'TBD',
  defaultCalendarDays: 30,
}

const memoryCache = new Map<string, { defaults: TenantContentDefaults; cachedAt: number }>()
const CACHE_TTL_MS = 60 * 1000   // 60s

function normalise(raw: unknown): TenantContentDefaults {
  const partial = (raw && typeof raw === 'object') ? (raw as Partial<TenantContentDefaults>) : {}
  return {
    platforms: typeof partial.platforms === 'string' && partial.platforms.trim()
      ? partial.platforms.trim()
      : FALLBACK_CONTENT_DEFAULTS.platforms,
    postingFrequency: typeof partial.postingFrequency === 'string' && partial.postingFrequency.trim()
      ? partial.postingFrequency.trim()
      : FALLBACK_CONTENT_DEFAULTS.postingFrequency,
    campaignDuration: typeof partial.campaignDuration === 'string' && partial.campaignDuration.trim()
      ? partial.campaignDuration.trim()
      : FALLBACK_CONTENT_DEFAULTS.campaignDuration,
    contentGoal: typeof partial.contentGoal === 'string' && partial.contentGoal.trim()
      ? partial.contentGoal.trim()
      : FALLBACK_CONTENT_DEFAULTS.contentGoal,
    budgetRange: typeof partial.budgetRange === 'string' && partial.budgetRange.trim()
      ? partial.budgetRange.trim()
      : FALLBACK_CONTENT_DEFAULTS.budgetRange,
    timeline: typeof partial.timeline === 'string' && partial.timeline.trim()
      ? partial.timeline.trim()
      : FALLBACK_CONTENT_DEFAULTS.timeline,
    defaultCalendarDays:
      typeof partial.defaultCalendarDays === 'number' && partial.defaultCalendarDays > 0 && partial.defaultCalendarDays <= 365
        ? Math.floor(partial.defaultCalendarDays)
        : FALLBACK_CONTENT_DEFAULTS.defaultCalendarDays,
  }
}

/**
 * Resolve a tenant's content defaults, falling back to the universal set
 * when nothing is configured. Cached in-memory for 60s to avoid repeated
 * DB hits on the hot path.
 */
export async function getTenantContentDefaults(tenantId: string | null | undefined): Promise<TenantContentDefaults> {
  if (!tenantId) return FALLBACK_CONTENT_DEFAULTS

  const cached = memoryCache.get(tenantId)
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.defaults
  }

  try {
    const db = getDb()
    const rows = await db`
      SELECT settings->'contentDefaults' AS content_defaults
      FROM agencies WHERE id = ${tenantId}::uuid LIMIT 1
    `
    const defaults = normalise(rows[0]?.content_defaults)
    memoryCache.set(tenantId, { defaults, cachedAt: Date.now() })
    return defaults
  } catch (err) {
    console.warn('[content-defaults] failed to load tenant defaults, using fallback', err)
    return FALLBACK_CONTENT_DEFAULTS
  }
}

/** Clear the cache (call after updating tenant settings). */
export function invalidateTenantContentDefaults(tenantId?: string) {
  if (tenantId) memoryCache.delete(tenantId)
  else memoryCache.clear()
}
