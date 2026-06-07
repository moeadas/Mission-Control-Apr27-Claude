import { NextRequest, NextResponse } from 'next/server'

import { resolveAuthContextFromToken, getAuthTokenFromRequest } from '@/lib/auth/server'
import { listGa4Properties } from '@/lib/server/google-analytics'
import { getOAuthToken } from '@/lib/server/oauth-tokens'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const auth = await resolveAuthContextFromToken(getAuthTokenFromRequest(request))
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const token = await getOAuthToken(auth.userId, 'google')
    if (!token?.accessToken) {
      return NextResponse.json(
        { error: 'Google Analytics is not connected. Connect Google in Settings.', code: 'GOOGLE_ANALYTICS_NOT_CONNECTED' },
        { status: 400 }
      )
    }

    const properties = await listGa4Properties(auth.userId)
    return NextResponse.json({
      connected: true,
      accountEmail: token.accountEmail,
      scope: token.scope,
      properties: properties || [],
    })
  } catch (err: any) {
    if (/needs to be reconnected|reconnect google|connection expired|invalid_grant|invalid authentication credentials|expected oauth 2 access token/i.test(err.message || '')) {
      return NextResponse.json(
        { error: err.message || 'Reconnect Google in Settings.', code: 'GOOGLE_ANALYTICS_RECONNECT_REQUIRED' },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: err.message || 'Failed to load GA4 properties' }, { status: 500 })
  }
}
