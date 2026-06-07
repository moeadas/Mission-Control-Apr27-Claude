/**
 * GET /api/auth/google/callback?code=…&state=…
 *
 * Google's redirect target after the user grants consent. Exchanges the
 * authorization code for access + refresh tokens, persists them encrypted
 * per-user via `oauth-tokens.ts`, and bounces the browser back to the
 * Settings page with a success / error flag.
 *
 * `state` is the short-lived signed token issued by `/api/auth/google`; we
 * verify it to recover the authenticated user id without trusting any other
 * inbound parameter.
 */
import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

import { verifyToken } from '@/lib/auth/jwt'
import { resolveGoogleOAuthConfig } from '@/lib/google-integrations'
import { deleteOAuthToken, saveOAuthToken } from '@/lib/server/oauth-tokens'
import { loadPersistedProviderSettings } from '@/lib/server/provider-secrets'

function settingsUrl(origin: string, params: Record<string, string>) {
  const url = new URL('/settings', origin)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return url
}

function publicOrigin(request: NextRequest) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (configured) return configured.replace(/\/$/, '')
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || new URL(request.url).host
  return `${proto}://${host}`.replace(/\/$/, '')
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const appOrigin = publicOrigin(request)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const error = url.searchParams.get('error')

  if (error) {
    console.warn('[google-oauth] consent denied:', error)
    return NextResponse.redirect(settingsUrl(appOrigin, { google: 'denied' }))
  }

  if (!code || !state) {
    return NextResponse.redirect(settingsUrl(appOrigin, { google: 'missing_params' }))
  }

  const payload = await verifyToken(state)
  if (!payload?.sub) {
    return NextResponse.redirect(settingsUrl(appOrigin, { google: 'invalid_state' }))
  }

  const providerSettings = await loadPersistedProviderSettings(payload.sub)
  const googleConfig = resolveGoogleOAuthConfig({
    providerSettings,
    origin: appOrigin,
  })

  if (!googleConfig.clientId || !googleConfig.clientSecret) {
    return NextResponse.redirect(settingsUrl(appOrigin, { google: 'misconfigured' }))
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      googleConfig.clientId,
      googleConfig.clientSecret,
      googleConfig.redirectUri
    )
    const { tokens } = await oauth2Client.getToken(code)
    if (!tokens.access_token) {
      console.error('[google-oauth] token exchange returned no access token')
      return NextResponse.redirect(settingsUrl(appOrigin, { google: 'no_access_token' }))
    }
    oauth2Client.setCredentials(tokens)

    // Resolve the Google account email so the user can see which account they connected.
    let accountEmail: string | null = null
    try {
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
      const info = await oauth2.userinfo.get()
      accountEmail = info.data.email || null
    } catch (err) {
      console.warn('[google-oauth] failed to read userinfo:', err)
    }

    // A reconnect is an explicit replacement of the Google grant. If the user
    // changed OAuth Client ID/Secret, preserving an older refresh token can make
    // later GA4 refreshes fail with Google's vague "Bad Request" response.
    await deleteOAuthToken(payload.sub, 'google')
    await saveOAuthToken({
      userId: payload.sub,
      provider: 'google',
      accountEmail,
      scope: tokens.scope ?? null,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    })

    console.log('[google-oauth] connected', {
      userId: payload.sub,
      accountEmail,
      hasRefreshToken: Boolean(tokens.refresh_token),
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
    })

    return NextResponse.redirect(settingsUrl(appOrigin, { google: 'connected' }))
  } catch (err) {
    console.error('[google-oauth] token exchange failed:', err)
    return NextResponse.redirect(settingsUrl(appOrigin, { google: 'exchange_failed' }))
  }
}
