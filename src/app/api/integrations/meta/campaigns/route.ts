import { NextRequest, NextResponse } from 'next/server'

import { resolveAuthContextFromToken, getAuthTokenFromRequest } from '@/lib/auth/server'
import { normalizeProviderSettings } from '@/lib/provider-settings'
import { fetchAllMetaPages, normalizeAdAccountId, resolveMetaToken } from '@/lib/server/meta-ads-api'

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
    const accountId = new URL(request.url).searchParams.get('accountId') || settings.meta?.adAccountId

    if (!token) {
      return NextResponse.json(
        { error: 'Meta access token not configured. Connect Meta in Settings.', code: 'META_NOT_CONNECTED' },
        { status: 400 }
      )
    }
    if (!accountId) return NextResponse.json({ error: 'Ad account ID required' }, { status: 400 })

    const adAccount = normalizeAdAccountId(accountId)
    const datePreset = new URL(request.url).searchParams.get('datePreset') || 'last_30d'

    const fields = [
      'id', 'name', 'status', 'effective_status', 'configured_status', 'objective', 'daily_budget', 'lifetime_budget',
      'start_time', 'stop_time', 'created_time', 'updated_time',
    ].join(',')

    const campaigns = await fetchAllMetaPages(`/${adAccount}/campaigns`, token, {
      fields,
      date_preset: datePreset,
      limit: 100,
    })

    return NextResponse.json({ campaigns, count: campaigns.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch campaigns' }, { status: 500 })
  }
}
