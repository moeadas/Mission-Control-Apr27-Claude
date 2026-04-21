import { getSupabaseServerClient } from '@/lib/supabase/server'
import { normalizeProviderSettings } from '@/lib/provider-settings'
import { loadPersistedProviderSettings, mergePersistedProviderSettings, savePersistedProviderSettings } from '@/lib/server/provider-secrets'
import type { ProviderSettings } from '@/lib/types'

export function getSuperAdminEmail() {
  return (process.env.SUPER_ADMIN_EMAIL || 'moeadas@yahoo.com').trim().toLowerCase()
}

export interface AuthContext {
  userId: string
  email: string
  role: 'super_admin' | 'member'
  providerSettings: ProviderSettings
}

function extractProviderSettings(user: { user_metadata?: Record<string, any> | null }) {
  const providerSettings = user.user_metadata?.mission_control?.providerSettings
  return normalizeProviderSettings(providerSettings || undefined)
}

export async function saveUserProviderSettings(userId: string, providerSettings: ProviderSettings) {
  const supabase = getSupabaseServerClient()
  const normalized = normalizeProviderSettings(providerSettings)

  await savePersistedProviderSettings(userId, normalized)

  if (!supabase) return

  const { data, error } = await supabase.auth.admin.getUserById(userId)
  if (error) throw error

  const currentMetadata = data.user?.user_metadata || {}
  const currentProviderSettings = extractProviderSettings(data.user || {})
  const mergedProviderSettings = mergePersistedProviderSettings(normalized, currentProviderSettings)
  const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...currentMetadata,
      mission_control: {
        ...(currentMetadata.mission_control || {}),
        providerSettings: mergedProviderSettings,
      },
    },
  })

  if (updateError) throw updateError
}

export async function resolveAuthContextFromToken(token: string | null | undefined): Promise<AuthContext | null> {
  if (!token) return null

  const supabase = getSupabaseServerClient()
  if (!supabase) return null

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user?.id || !data.user.email) return null

  const email = data.user.email.toLowerCase()
  const superAdminEmail = getSuperAdminEmail()
  const defaultRole = email === superAdminEmail ? 'super_admin' : 'member'

  const { data: profile, error: profileLookupError } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', data.user.id)
    .maybeSingle()

  if (profileLookupError) {
    throw profileLookupError
  }

  const role = email === superAdminEmail ? 'super_admin' : profile?.role === 'super_admin' ? 'super_admin' : defaultRole
  const isActive = profile?.is_active ?? true

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert(
      {
        id: data.user.id,
        email: data.user.email,
        role,
        is_active: isActive,
      },
      { onConflict: 'id' }
    )

  if (profileError) {
    throw profileError
  }

  if (!isActive) {
    return null
  }

  const metadataProviderSettings = extractProviderSettings(data.user)
  const persistedProviderSettings = await loadPersistedProviderSettings(data.user.id)

  return {
    userId: data.user.id,
    email: data.user.email,
    role,
    providerSettings: mergePersistedProviderSettings(metadataProviderSettings, persistedProviderSettings),
  }
}
