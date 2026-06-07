/**
 * GET /api/integrations/meta/insights
 *
 * Fetches campaign / adset / ad insights from the Meta Graph API on behalf
 * of the authenticated user. Auth source priority:
 *   1. The user's stored OAuth token (preferred — Batch G OAuth flow).
 *   2. Legacy `providerSettings.meta.accessToken` from the Settings UI.
 *
 * Query params:
 *   accountId   — ad account (falls back to providerSettings or first business account)
 *   datePreset  — last_7d | last_14d | last_30d | last_90d | this_month (default: last_30d)
 *   level       — campaign | adset | ad (default: campaign)
 */
import { NextRequest, NextResponse } from 'next/server'

import { resolveAuthContextFromToken, getAuthTokenFromRequest } from '@/lib/auth/server'
import { normalizeProviderSettings } from '@/lib/provider-settings'
import { buildMetaInsightsParams, enrichInsight, fetchAllMetaPages, metaGraphRequest, normalizeAdAccountId, resolveMetaToken } from '@/lib/server/meta-ads-api'

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
    const url = new URL(request.url)
    const accountId = url.searchParams.get('accountId') || settings.meta?.adAccountId
    const datePreset = url.searchParams.get('datePreset') || 'last_30d'
    const level = url.searchParams.get('level') || 'campaign'

    if (!token) {
      return NextResponse.json(
        { error: 'Meta access token not configured. Connect Meta in Settings.', code: 'META_NOT_CONNECTED' },
        { status: 400 }
      )
    }
    if (!accountId) return NextResponse.json({ error: 'Ad account ID required' }, { status: 400 })

    const adAccount = normalizeAdAccountId(accountId)
    const dateConfig = buildMetaInsightsParams(datePreset)

    const fields = [
      'campaign_name', 'campaign_id',
      'impressions', 'clicks', 'reach',
      'spend', 'cpm', 'cpc', 'ctr',
      'conversions', 'cost_per_conversion',
      'frequency', 'unique_clicks',
      'actions', 'action_values', 'cost_per_action_type',
      'inline_link_clicks', 'inline_link_click_ctr', 'cost_per_inline_link_click',
    ].join(',')

    const insights = await fetchAllMetaPages(`/${adAccount}/insights`, token, {
      fields,
      ...dateConfig.params,
      level,
      limit: 100,
    })

    // Account-level summary
    const summaryData = await metaGraphRequest<{ data?: any[] }>(`/${adAccount}/insights`, token, {
      fields,
      ...dateConfig.params,
      level: 'account',
    })

    return NextResponse.json({
      insights: insights.map(enrichInsight),
      summary: summaryData.data?.[0] ? enrichInsight(summaryData.data[0]) : null,
      datePreset,
      dateRange: dateConfig.range,
      level,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch insights' }, { status: 500 })
  }
}
