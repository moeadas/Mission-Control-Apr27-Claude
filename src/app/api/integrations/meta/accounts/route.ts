import { NextRequest, NextResponse } from 'next/server'

import { resolveAuthContextFromToken, getAuthTokenFromRequest } from '@/lib/auth/server'
import { normalizeProviderSettings } from '@/lib/provider-settings'
import { fetchAllMetaPages, resolveMetaToken } from '@/lib/server/meta-ads-api'

function getBearerToken(r: NextRequest) {
  // Batch P.2: cookie OR bearer. Local wrapper kept so call sites don't change.
  return getAuthTokenFromRequest(r)
}

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const settings = normalizeProviderSettings(auth.providerSettings)
    const token = await resolveMetaToken(auth.userId, settings)
    if (!token) {
      return NextResponse.json(
        { error: 'Meta access token not configured. Connect Meta in Settings.', code: 'META_NOT_CONNECTED' },
        { status: 400 }
      )
    }

    const accounts = await fetchAllMetaPages('/me/adaccounts', token, {
      fields: 'id,name,account_id,account_status,currency,timezone_name,business',
      limit: 100,
    })

    return NextResponse.json({
      accounts,
      count: accounts.length,
      defaultAccountId: settings.meta?.adAccountId || accounts[0]?.id || '',
      primaryMarket: settings.meta?.primaryMarket || 'JO',
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch Meta accounts' }, { status: 500 })
  }
}
