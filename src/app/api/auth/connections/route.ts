import { NextRequest, NextResponse } from 'next/server'

import { resolveAuthContextFromToken, getAuthTokenFromRequest } from '@/lib/auth/server'
import { getGoogleOAuthTokenForUser } from '@/lib/google-integrations'
import { getOAuthToken, isAccessTokenExpired } from '@/lib/server/oauth-tokens'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const auth = await resolveAuthContextFromToken(getAuthTokenFromRequest(request))
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [google, meta] = await Promise.all([
      getGoogleOAuthTokenForUser(auth.userId),
      getOAuthToken(auth.userId, 'meta'),
    ])

    return NextResponse.json({
      google: google?.accessToken
        ? {
            connected: true,
            accountEmail: google.accountEmail,
            scope: google.scope,
            expiresAt: google.expiresAt?.toISOString() || null,
            expired: isAccessTokenExpired(google, 0),
            hasRefreshToken: Boolean(google.refreshToken),
          }
        : { connected: false },
      meta: meta?.accessToken
        ? {
            connected: true,
            accountEmail: meta.accountEmail,
            scope: meta.scope,
            expiresAt: meta.expiresAt?.toISOString() || null,
            expired: meta.expiresAt ? isAccessTokenExpired(meta, 0) : false,
            hasRefreshToken: Boolean(meta.refreshToken),
          }
        : { connected: false },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load OAuth connections' }, { status: 500 })
  }
}
