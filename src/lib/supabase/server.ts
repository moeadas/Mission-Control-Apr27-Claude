import { createClient } from '@supabase/supabase-js'

import { hasSupabaseServerConfig, SUPABASE_SECRET_KEY, SUPABASE_URL } from '@/lib/supabase/config'

export function getSupabaseServerClient() {
  if (!hasSupabaseServerConfig()) {
    return null
  }

  return createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
