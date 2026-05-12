import { NextRequest, NextResponse } from 'next/server'
import { resolveAuthContextFromToken } from '@/lib/auth/server'
import { normalizeProviderSettings } from '@/lib/provider-settings'

function getBearerToken(r: NextRequest) {
  const h = r.headers.get('authorization') || ''
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : null
}

const META_GRAPH = 'https://graph.facebook.com/v20.0'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const settings = normalizeProviderSettings(auth.providerSettings)
    const token = settings.meta?.accessToken
    const accountId = new URL(request.url).searchParams.get('accountId') || settings.meta?.adAccountId

    if (!token) return NextResponse.json({ error: 'Meta access token not configured' }, { status: 400 })
    if (!accountId) return NextResponse.json({ error: 'Ad account ID required' }, { status: 400 })

    const adAccount = accountId.startsWith('act_') ? accountId : `act_${accountId}`
    const datePreset = new URL(request.url).searchParams.get('datePreset') || 'last_30d'

    const fields = [
      'id', 'name', 'status', 'objective', 'daily_budget', 'lifetime_budget',
      'start_time', 'stop_time', 'created_time', 'updated_time',
    ].join(',')

    const res = await fetch(
      `${META_GRAPH}/${adAccount}/campaigns?fields=${fields}&date_preset=${datePreset}&limit=50&access_token=${token}`
    )
    const data = await res.json()
    if (!res.ok || data.error) {
      return NextResponse.json({ error: data.error?.message || 'Meta API error' }, { status: res.status })
    }

    return NextResponse.json({ campaigns: data.data || [], paging: data.paging })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch campaigns' }, { status: 500 })
  }
}
