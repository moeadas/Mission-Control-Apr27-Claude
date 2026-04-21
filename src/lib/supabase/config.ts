export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
export const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || ''
export const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || ''

export function hasSupabaseBrowserConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY)
}

export function hasSupabaseServerConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_SECRET_KEY)
}
