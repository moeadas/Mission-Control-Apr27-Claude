/**
 * DB-config helpers.
 *
 * Mission Control runs on self-hosted PostgreSQL. The `DATABASE_URL` env var
 * is the only external dependency required for persistence. Supabase used to
 * be in the stack but is now fully removed.
 */

export function hasDatabaseConfig() {
  return Boolean(process.env.DATABASE_URL)
}
