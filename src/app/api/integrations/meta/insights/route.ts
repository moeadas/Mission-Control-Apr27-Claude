import { NextRequest, NextResponse } from 'next/server'
import { resolveAuthContextFromToken } from '@/lib/auth/server'
import { normalizeProviderSettings } from '@/lib/provider-settings'

function getBearerToken(r: NextRequest) {
  const h = r.headers.get('authorization') || ''
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : null
}

const META_GRAPH = 'https://graph.facebook.com/v20.0'

export const dynamic = 'force-dynamic'

/**
 * GET /api/integrations/meta/insights
 * Query params:
 *   accountId  — ad account (falls back to stored default)
 *   datePreset — last_7d | last_14d | last_30d | last_90d | this_month (default: last_30d)
 *   level      — campaign | adset | ad (default: campaign)
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const settings = normalizeProviderSettings(auth.providerSettings)
    const token = settings.meta?.accessToken
    const url = new URL(request.url)
    const accountId = url.searchParams.get('accountId') || settings.meta?.adAccountId
    const datePreset = url.searchParams.get('datePreset') || 'last_30d'
    const level = url.searchParams.get('level') || 'campaign'

    if (!token) return NextResponse.json({ error: 'Meta access token not configured' }, { status: 400 })
    if (!accountId) return NextResponse.json({ error: 'Ad account ID required' }, { status: 400 })

    const adAccount = accountId.startsWith('act_') ? accountId : `act_${accountId}`

    const fields = [
      'campaign_name', 'campaign_id',
      'impressions', 'clicks', 'reach',
      'spend', 'cpm', 'cpc', 'ctr',
      'conversions', 'cost_per_conversion',
      'frequency', 'unique_clicks',
      'actions', 'action_values',
    ].join(',')

    const res = await fetch(
      `${META_GRAPH}/${adAccount}/insights?fields=${fields}&date_preset=${datePreset}&level=${level}&limit=50&access_token=${token}`
    )
    const data = await res.json()
    if (!res.ok || data.error) {
      return NextResponse.json({ error: data.error?.message || 'Meta API error' }, { status: res.status })
    }

    // Also fetch account-level summary
    const summaryRes = await fetch(
      `${META_GRAPH}/${adAccount}/insights?fields=${fields}&date_preset=${datePreset}&level=account&access_token=${token}`
    )
    const summaryData = await summaryRes.json()

    return NextResponse.json({
      insights: data.data || [],
      summary: summaryData.data?.[0] || null,
      paging: data.paging,
      datePreset,
      level,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch insights' }, { status: 500 })
  }
}
