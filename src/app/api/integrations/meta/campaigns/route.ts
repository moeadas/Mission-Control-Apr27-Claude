import { NextRequest, NextResponse } from 'next/server'

import { resolveAuthContextFromToken, getAuthTokenFromRequest } from '@/lib/auth/server'
import { normalizeProviderSettings } from '@/lib/provider-settings'
import { getOAuthToken } from '@/lib/server/oauth-tokens'

function getBearerToken(r: NextRequest) {
  // Batch P.2: cookie OR bearer. Local wrapper kept so call sites don't change.
  return getAuthTokenFromRequest(r)
}

const META_GRAPH_VERSION = process.env.META_GRAPH_API_VERSION || 'v20.0'
const META_GRAPH = `https://graph.facebook.com/${META_GRAPH_VERSION}`

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const settings = normalizeProviderSettings(auth.providerSettings)
    const oauth = await getOAuthToken(auth.userId, 'meta')
    const token = oauth?.accessToken || settings.meta?.accessToken
    const accountId = new URL(request.url).searchParams.get('accountId') || settings.meta?.adAccountId

    if (!token) {
      return NextResponse.json(
        { error: 'Meta access token not configured. Connect Meta in Settings.', code: 'META_NOT_CONNECTED' },
        { status: 400 }
      )
    }
    if (!accountId) return NextResponse.json({ error: 'Ad account ID required' }, { status: 400 })

    const adAccount = accountId.startsWith('act_') ? accountId : `act_${accountId}`
    const datePreset = new URL(request.url).searchParams.get('datePreset') || 'last_30d'

    const fields = [
      'id', 'name', 'status', 'objective', 'daily_budget', 'lifetime_budget',
      'start_time', 'stop_time', 'created_time', 'updated_time',
    ].join(',')

    const qs = new URLSearchParams({ fields, date_preset: datePreset, limit: '50' })
    const res = await fetch(`${META_GRAPH}/${adAccount}/campaigns?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (!res.ok || data.error) {
      return NextResponse.json({ error: data.error?.message || 'Meta API error' }, { status: res.status })
    }

    return NextResponse.json({ campaigns: data.data || [], paging: data.paging })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch campaigns' }, { status: 500 })
  }
}
