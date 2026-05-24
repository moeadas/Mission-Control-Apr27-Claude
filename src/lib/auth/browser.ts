/**
 * Batch P.3: cookie-only sessions.
 *
 * The JWT now lives ONLY in the httpOnly `mc_session` cookie (set by the
 * server on login). JS code cannot read it — that's the XSS hardening.
 *
 * These helpers exist for backwards compatibility with ~50 call sites that
 * still do `if (!token) return` guards or `headers: { Authorization: ... }`
 * conditionals. They return a sentinel (`COOKIE_SESSION_SENTINEL`) that:
 *   - Lets `if (!token) return` checks proceed (it's truthy).
 *   - Lets `Authorization: Bearer <sentinel>` headers be added without
 *     leaking anything secret — the server-side `getAuthTokenFromRequest`
 *     short-circuits this sentinel and reads the real JWT from the cookie.
 *
 * A legacy localStorage entry (`mc_auth_token`) is honored during the
 * transition so existing logged-in tabs don't get bounced — but new
 * logins never write the JWT to localStorage.
 */
const LEGACY_TOKEN_KEY = 'mc_auth_token'
const SESSION_MARKER_KEY = 'mc_cookie_session'
const COOKIE_SESSION_SENTINEL = 'cookie-session'

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null
  // 1. Legacy JWT in localStorage (pre-P.3 sessions). Kept readable so
  //    a user with an existing logged-in tab doesn't get force-logged-out
  //    on deploy. Will be scrubbed on next setStoredToken / clearStoredToken.
  const legacy = localStorage.getItem(LEGACY_TOKEN_KEY)
  if (legacy) return legacy
  // 2. Cookie-session marker (set on every new login, value is non-secret).
  if (localStorage.getItem(SESSION_MARKER_KEY)) return COOKIE_SESSION_SENTINEL
  return null
}

export function setStoredToken(_token: string) {
  if (typeof window === 'undefined') return
  // The server already set the mc_session cookie. We deliberately do NOT
  // persist the JWT to localStorage — that's the whole point of P.3.
  // We do persist a non-secret marker so `getStoredToken()` returns a
  // truthy sentinel for the legacy call sites that gate on it.
  localStorage.removeItem(LEGACY_TOKEN_KEY)
  localStorage.setItem(SESSION_MARKER_KEY, '1')
}

export function clearStoredToken() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(LEGACY_TOKEN_KEY)
  localStorage.removeItem(SESSION_MARKER_KEY)
  // Best-effort server-side cookie clear. Fire-and-forget; errors are
  // expected here if the network is down or the user has already
  // navigated away.
  try {
    void fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
  } catch { /* swallow */ }
}

/** Returns the current session token, or null if not logged in.
 *  Post-P.3 this is either the legacy JWT (transitional) or the cookie
 *  sentinel — the actual JWT lives in the httpOnly cookie. */
export async function getAuthToken(): Promise<string | null> {
  return getStoredToken()
}
