/**
 * Meta (Facebook) OAuth — initiator + callback in one route (Meta's docs
 * recommend a single redirect URI per app, so we keep the callback at the
 * same path the user originally hit).
 *
 *   GET  /api/auth/meta                 → 302 to Facebook consent screen
 *   GET  /api/auth/meta?code=…&state=…  → token exchange + persist
 *
 * State token: short-lived signed JWT carrying the authenticated user id so
 * the callback can attribute the token. Same pattern as the Google flow.
 */
import { NextRequest, NextResponse } from 'next/server'

import { resolveAuthContextFromToken, getAuthTokenFromRequest } from '@/lib/auth/server'
import { signToken, verifyToken } from '@/lib/auth/jwt'
import { saveOAuthToken } from '@/lib/server/oauth-tokens'

const META_GRAPH_VERSION = process.env.META_GRAPH_API_VERSION || 'v20.0'

const DEFAULT_SCOPES = [
  'ads_read',
  'pages_read_engagement',
  'business_management',
  'public_profile',
  'email',
]

function getBearerToken(request: NextRequest) {
  // Batch P.2: cookie OR bearer. Local wrapper kept so call sites don't change.
  return getAuthTokenFromRequest(request)
}

function settingsUrl(origin: string, params: Record<string, string>) {
  const url = new URL('/settings', origin)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return url
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')

  const clientId = process.env.META_APP_ID
  const clientSecret = process.env.META_APP_SECRET
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || url.origin}/api/auth/meta`

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(settingsUrl(url.origin, { meta: 'misconfigured' }))
  }

  // ── Callback leg ──────────────────────────────────────────────────────────
  if (code) {
    if (error) {
      console.warn('[meta-oauth] consent denied:', error)
      return NextResponse.redirect(settingsUrl(url.origin, { meta: 'denied' }))
    }
    if (!state) return NextResponse.redirect(settingsUrl(url.origin, { meta: 'missing_state' }))

    const payload = await verifyToken(state)
    if (!payload?.sub) return NextResponse.redirect(settingsUrl(url.origin, { meta: 'invalid_state' }))

    try {
      const exchange = await fetch(
        `https://graph.facebook.com/${META_GRAPH_VERSION}/oauth/access_token?` +
        new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          code,
        }).toString()
      )
      const data = await exchange.json()
      if (!exchange.ok || !data.access_token) {
        console.error('[meta-oauth] token exchange failed:', data)
        return NextResponse.redirect(settingsUrl(url.origin, { meta: 'exchange_failed' }))
      }

      // Optional: upgrade short-lived token to a long-lived one (~60 days).
      let accessToken: string = data.access_token
      let expiresIn: number | undefined = data.expires_in
      try {
        const longLived = await fetch(
          `https://graph.facebook.com/${META_GRAPH_VERSION}/oauth/access_token?` +
          new URLSearchParams({
            grant_type: 'fb_exchange_token',
            client_id: clientId,
            client_secret: clientSecret,
            fb_exchange_token: accessToken,
          }).toString()
        )
        const ll = await longLived.json()
        if (longLived.ok && ll.access_token) {
          accessToken = ll.access_token
          expiresIn = ll.expires_in ?? expiresIn
        }
      } catch (err) {
        console.warn('[meta-oauth] long-lived upgrade failed:', err)
      }

      // Resolve the connected account email (best-effort).
      let accountEmail: string | null = null
      try {
        const me = await fetch(
          `https://graph.facebook.com/${META_GRAPH_VERSION}/me?fields=email,name`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        )
        const info = await me.json()
        accountEmail = info?.email ?? info?.name ?? null
      } catch (err) {
        console.warn('[meta-oauth] failed to read me:', err)
      }

      await saveOAuthToken({
        userId: payload.sub,
        provider: 'meta',
        accountEmail,
        scope: data.scope ?? null,
        accessToken,
        // Meta doesn't return a refresh token; the long-lived access token
        // is the "refresh-equivalent" — re-auth is required when it expires.
        refreshToken: null,
        expiresAt: expiresIn ? new Date(Date.now() + expiresIn * 1000) : null,
      })

      return NextResponse.redirect(settingsUrl(url.origin, { meta: 'connected' }))
    } catch (err) {
      console.error('[meta-oauth] callback error:', err)
      return NextResponse.redirect(settingsUrl(url.origin, { meta: 'error' }))
    }
  }

  // ── Initiator leg ─────────────────────────────────────────────────────────
  const inlineToken = url.searchParams.get('session')
  const auth = await resolveAuthContextFromToken(getBearerToken(request) ?? inlineToken)
  if (!auth) {
    return NextResponse.redirect(new URL('/login?next=' + encodeURIComponent('/settings?integrations=meta'), url.origin))
  }

  const stateToken = await signToken({
    sub: auth.userId,
    email: auth.email,
    role: auth.role,
    tenantId: auth.tenantId ?? undefined,
  })

  const authUrl = new URL(`https://www.facebook.com/${META_GRAPH_VERSION}/dialog/oauth`)
  authUrl.searchParams.set('client_id', clientId)
  authUrl.searchParams.set('redirect_uri', redirectUri)
  authUrl.searchParams.set('scope', DEFAULT_SCOPES.join(','))
  authUrl.searchParams.set('state', stateToken)

  return NextResponse.redirect(authUrl.toString())
}
