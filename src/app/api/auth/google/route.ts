/**
 * GET /api/auth/google
 *
 * Initiator route — redirects the caller to Google's OAuth consent screen.
 * The real callback is handled by `/api/auth/google/callback` so the env-
 * configured redirect URI matches a real Next route.
 *
 * State token: a short-lived signed JWT containing the authenticated user's
 * id, so the callback can attribute the returned tokens to the right user.
 */
import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

import { resolveAuthContextFromToken, getAuthTokenFromRequest } from '@/lib/auth/server'
import { signToken, verifyToken } from '@/lib/auth/jwt'

const DEFAULT_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
]

function getBearerToken(request: NextRequest) {
  // Batch P.2: cookie OR bearer. Local wrapper kept so call sites don't change.
  return getAuthTokenFromRequest(request)
}

export async function GET(request: NextRequest) {
  // Accept the JWT either as a Bearer header or as `?session=…` so the user
  // can simply click an `<a href>` from the Settings page.
  const url = new URL(request.url)
  const inlineToken = url.searchParams.get('session')
  const auth = await resolveAuthContextFromToken(getBearerToken(request) ?? inlineToken)
  if (!auth) {
    return NextResponse.redirect(new URL('/login?next=' + encodeURIComponent('/settings?integrations=google'), url.origin))
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    `${process.env.NEXT_PUBLIC_APP_URL || url.origin}/api/auth/google/callback`

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL('/settings?google=misconfigured', url.origin))
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)

  // Sign a short-lived state token (5 min) so the callback can recover the
  // user id. Anything an attacker could replay is bound to a real account.
  const state = await signToken({
    sub: auth.userId,
    email: auth.email,
    role: auth.role,
    tenantId: auth.tenantId ?? undefined,
  })

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: DEFAULT_SCOPES,
    prompt: 'consent',          // ensures a refresh token is returned even after re-auth
    state,
    include_granted_scopes: true,
  })

  return NextResponse.redirect(authUrl)
}
