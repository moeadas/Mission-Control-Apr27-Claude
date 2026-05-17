/**
 * Rate limiting (Batch E)
 *
 * Two-tier limiter: an in-memory token bucket per Next.js process is the
 * primary path (fast, no DB round-trip on the hot path). The `rate_limit_buckets`
 * table is the durable fallback for hot routes and survives server restarts;
 * the auth endpoints opt into it so a brute-forcer can't bypass the limit by
 * crashing/restarting the server.
 *
 * Limits are returned as `{ allowed, remaining, retryAfterSeconds }` so the
 * caller can decide whether to throw 429 or just attach headers.
 *
 * Bucket-key convention: "<route>:<ip-or-userId>". The same key reused with
 * different windows / limits is fine — each call passes its own config.
 */
import { getDb } from '@/lib/db/client'

type BucketState = { count: number; windowStartMs: number }

const memoryBuckets = new Map<string, BucketState>()

export interface RateLimitConfig {
  /** Max requests allowed within `windowSeconds`. */
  limit: number
  /** Sliding window size. */
  windowSeconds: number
  /** If true, also writes to rate_limit_buckets so restarts don't reset the
   *  counter. Use for auth endpoints (login, register, reset). */
  durable?: boolean
}

export interface RateLimitVerdict {
  allowed: boolean
  remaining: number
  retryAfterSeconds: number
}

function pruneMemory(now: number) {
  // O(buckets) every 1000 calls. Cheap.
  if (memoryBuckets.size < 1000) return
  for (const [key, state] of memoryBuckets) {
    if (now - state.windowStartMs > 60 * 60 * 1000) memoryBuckets.delete(key)
  }
}

/**
 * Extract a client IP from common proxy headers. Falls back to "unknown" when
 * neither x-forwarded-for nor x-real-ip is present (rate-limit per IP becomes
 * less precise but never crashes).
 */
export function getClientIp(headers: Headers): string {
  const xff = headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  const real = headers.get('x-real-ip')
  if (real) return real.trim()
  return 'unknown'
}

export async function checkRateLimit(
  bucketKey: string,
  config: RateLimitConfig
): Promise<RateLimitVerdict> {
  const now = Date.now()
  pruneMemory(now)
  const windowMs = config.windowSeconds * 1000

  // ── In-memory check ────────────────────────────────────────────────────
  const state = memoryBuckets.get(bucketKey)
  if (!state || now - state.windowStartMs >= windowMs) {
    memoryBuckets.set(bucketKey, { count: 1, windowStartMs: now })
  } else {
    state.count += 1
    if (state.count > config.limit) {
      const retryAfter = Math.max(1, Math.ceil((state.windowStartMs + windowMs - now) / 1000))
      return { allowed: false, remaining: 0, retryAfterSeconds: retryAfter }
    }
  }

  // ── Durable check (auth endpoints) ─────────────────────────────────────
  if (config.durable) {
    try {
      const db = getDb()
      const rows = await db`
        INSERT INTO rate_limit_buckets (bucket_key, count, window_start, updated_at)
        VALUES (${bucketKey}, 1, to_timestamp(${now / 1000}), now())
        ON CONFLICT (bucket_key) DO UPDATE
          SET count = CASE
                        WHEN now() - rate_limit_buckets.window_start >= make_interval(secs => ${config.windowSeconds}::int)
                          THEN 1
                          ELSE rate_limit_buckets.count + 1
                      END,
              window_start = CASE
                               WHEN now() - rate_limit_buckets.window_start >= make_interval(secs => ${config.windowSeconds}::int)
                                 THEN now()
                                 ELSE rate_limit_buckets.window_start
                             END,
              updated_at = now()
        RETURNING count, window_start
      `
      const row = rows[0]
      if (row && row.count > config.limit) {
        const elapsedMs = now - new Date(row.window_start).getTime()
        const retryAfter = Math.max(1, Math.ceil((windowMs - elapsedMs) / 1000))
        return { allowed: false, remaining: 0, retryAfterSeconds: retryAfter }
      }
    } catch (err) {
      // DB error → fall back to memory-only verdict. We already passed the
      // memory check above so allow the request through.
      console.warn('[rate-limit] durable check failed; falling back to memory-only', err)
    }
  }

  const stateAfter = memoryBuckets.get(bucketKey)!
  return {
    allowed: true,
    remaining: Math.max(0, config.limit - stateAfter.count),
    retryAfterSeconds: 0,
  }
}

/**
 * Convenience wrapper that returns a NextResponse 429 with proper headers if
 * the limit is exceeded, otherwise resolves to null (caller continues).
 */
export async function enforceRateLimit(
  bucketKey: string,
  config: RateLimitConfig
): Promise<{ blocked: true; verdict: RateLimitVerdict } | { blocked: false; verdict: RateLimitVerdict }> {
  const verdict = await checkRateLimit(bucketKey, config)
  return verdict.allowed ? { blocked: false, verdict } : { blocked: true, verdict }
}
