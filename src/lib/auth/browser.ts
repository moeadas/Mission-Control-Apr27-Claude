const TOKEN_KEY = 'mc_auth_token'

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setStoredToken(token: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearStoredToken() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TOKEN_KEY)
}

// Drop-in replacement used by ClientShell and other components
export async function getSupabaseAccessToken(): Promise<string | null> {
  return getStoredToken()
}

// Compatibility shim — callers that previously used the Supabase browser client
// can still import this without breaking. It returns null since there is no
// Supabase client; those callers should use getStoredToken() / fetch() instead.
export function getSupabaseBrowserClient(): null {
  return null
}
