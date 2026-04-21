import { createClient } from '@supabase/supabase-js'

import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/lib/supabase/config'

let browserClient: ReturnType<typeof createClient> | null = null

export function getSupabaseBrowserClient() {
  if (browserClient) return browserClient

  browserClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })

  return browserClient
}

export async function getSupabaseAccessToken() {
  const {
    data: { session },
  } = await getSupabaseBrowserClient().auth.getSession()

  return session?.access_token || null
}
