// Replacement for src/lib/supabase/config.ts
// Auth is now JWT-based; the only external dependency is DATABASE_URL

export function hasDatabaseConfig() {
  return Boolean(process.env.DATABASE_URL)
}

// Keep these names so state/route.ts compiles without further changes
export function hasSupabaseServerConfig() {
  return hasDatabaseConfig()
}

export function hasSupabaseBrowserConfig() {
  // Browser auth is now JWT stored in localStorage — always available
  return true
}
