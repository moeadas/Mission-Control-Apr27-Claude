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
import { saveOAuthToken } from '@/lib/server/oauth-tokens'

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

  if (error) {
    console.warn('[google-oauth] consent denied:', error)
    return NextResponse.redirect(settingsUrl(url.origin, { google: 'denied' }))
  }

  if (!code || !state) {
    return NextResponse.redirect(settingsUrl(url.origin, { google: 'missing_params' }))
  }

  const payload = await verifyToken(state)
  if (!payload?.sub) {
    return NextResponse.redirect(settingsUrl(url.origin, { google: 'invalid_state' }))
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    `${process.env.NEXT_PUBLIC_APP_URL || url.origin}/api/auth/google/callback`

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(settingsUrl(url.origin, { google: 'misconfigured' }))
  }

  try {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)
    const { tokens } = await oauth2Client.getToken(code)
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

    await saveOAuthToken({
      userId: payload.sub,
      provider: 'google',
      accountEmail,
      scope: tokens.scope ?? null,
      accessToken: tokens.access_token || '',
      refreshToken: tokens.refresh_token ?? null,
      expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    })

    return NextResponse.redirect(settingsUrl(url.origin, { google: 'connected' }))
  } catch (err) {
    console.error('[google-oauth] token exchange failed:', err)
    return NextResponse.redirect(settingsUrl(url.origin, { google: 'exchange_failed' }))
  }
}
