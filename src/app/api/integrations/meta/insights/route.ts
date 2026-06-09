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

type InsightRange = { since: string; until: string }

const ADDITIVE_KEYS = [
  'impressions',
  'clicks',
  'unique_clicks',
  'spend',
  'inline_link_clicks',
  'conversions',
  'leads',
  'purchases',
  'purchase_value',
  'add_to_cart',
  'checkout_initiations',
  'app_installs',
  'messages',
  'page_views',
  'post_engagements',
  'video_views',
  'link_clicks_action',
]

function numberValue(value: unknown) {
  const parsed = Number.parseFloat(String(value ?? 0))
  return Number.isFinite(parsed) ? parsed : 0
}

function dateInRange(value: unknown, range: InsightRange) {
  const date = String(value || '')
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= range.since && date <= range.until
}

function fixedMoney(value: number) {
  return value.toFixed(2)
}

function fixedRate(value: number) {
  return value.toFixed(2)
}

function rebuildDerivedMetrics(row: Record<string, any>) {
  const spend = numberValue(row.spend)
  const impressions = numberValue(row.impressions)
  const clicks = numberValue(row.clicks)
  const inlineLinkClicks = numberValue(row.inline_link_clicks)
  const leads = numberValue(row.leads)
  const conversions = numberValue(row.conversions)
  const purchases = numberValue(row.purchases)
  const purchaseValue = numberValue(row.purchase_value)
  const postEngagements = numberValue(row.post_engagements)
  const videoViews = numberValue(row.video_views)

  return {
    ...row,
    cpc: clicks > 0 ? fixedMoney(spend / clicks) : '0.00',
    cpm: impressions > 0 ? fixedMoney((spend / impressions) * 1000) : '0.00',
    ctr: impressions > 0 ? fixedRate((clicks / impressions) * 100) : '0.00',
    inline_link_click_ctr: impressions > 0 ? fixedRate((inlineLinkClicks / impressions) * 100) : '0.00',
    cost_per_inline_link_click: inlineLinkClicks > 0 ? fixedMoney(spend / inlineLinkClicks) : '0.00',
    cost_per_lead: leads > 0 ? fixedMoney(spend / leads) : '0.00',
    cost_per_conversion: conversions > 0 ? fixedMoney(spend / conversions) : '0.00',
    conversion_rate: clicks > 0 ? fixedRate((conversions / clicks) * 100) : '0.00',
    engagement_rate: impressions > 0 ? fixedRate((postEngagements / impressions) * 100) : '0.00',
    cost_per_engagement: postEngagements > 0 ? fixedMoney(spend / postEngagements) : '0.00',
    cost_per_video_view: videoViews > 0 ? fixedMoney(spend / videoViews) : '0.00',
    roas: numberValue(row.roas) || (purchaseValue > 0 && spend > 0 ? purchaseValue / spend : 0),
    daily_verified: true,
  }
}

function aggregateDailyCampaignInsights(rows: any[], range: InsightRange) {
  const byCampaign = new Map<string, Record<string, any>>()

  for (const sourceRow of rows) {
    const row = enrichInsight(sourceRow)
    const campaignId = String(row.campaign_id || '')
    if (!campaignId || !dateInRange(row.date_start, range)) continue

    const current = byCampaign.get(campaignId) || {
      campaign_id: campaignId,
      campaign_name: row.campaign_name || '',
      date_start: range.since,
      date_stop: range.until,
      active_first_date: null,
      active_last_date: null,
      active_spend_days: 0,
    }

    for (const key of ADDITIVE_KEYS) {
      current[key] = numberValue(current[key]) + numberValue(row[key])
    }

    const dailySpend = numberValue(row.spend)
    if (dailySpend > 0) {
      const day = String(row.date_start)
      current.active_spend_days = numberValue(current.active_spend_days) + 1
      current.active_first_date = !current.active_first_date || day < current.active_first_date ? day : current.active_first_date
      current.active_last_date = !current.active_last_date || day > current.active_last_date ? day : current.active_last_date
    }

    byCampaign.set(campaignId, current)
  }

  return new Map(
    Array.from(byCampaign.entries()).map(([campaignId, row]) => [campaignId, rebuildDerivedMetrics(row)])
  )
}

function mergeDailyVerifiedCampaignRows(aggregateRows: any[], dailyRows: any[], range: InsightRange) {
  if (!dailyRows.length) return { rows: aggregateRows.map(enrichInsight), verifiedCampaigns: 0 }

  const dailyByCampaign = aggregateDailyCampaignInsights(dailyRows, range)
  const mergedRows: any[] = []
  const seen = new Set<string>()

  for (const aggregateRow of aggregateRows.map(enrichInsight)) {
    const campaignId = String(aggregateRow.campaign_id || '')
    const dailyRow = dailyByCampaign.get(campaignId)
    if (!campaignId || !dailyRow) {
      mergedRows.push(aggregateRow)
      continue
    }

    seen.add(campaignId)
    mergedRows.push({
      ...aggregateRow,
      ...dailyRow,
      // Reach and frequency are de-duplicated by Meta at the aggregate level; daily rows are only used
      // for additive metrics so we do not overstate unique reach.
      reach: aggregateRow.reach,
      frequency: aggregateRow.frequency,
    })
  }

  for (const [campaignId, dailyRow] of dailyByCampaign.entries()) {
    if (!seen.has(campaignId)) mergedRows.push(dailyRow)
  }

  return { rows: mergedRows, verifiedCampaigns: dailyByCampaign.size }
}

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

    const baseFields = [
      'campaign_name', 'campaign_id',
      'impressions', 'clicks', 'reach',
      'spend', 'cpm', 'cpc', 'ctr',
      'conversions', 'cost_per_conversion',
      'frequency', 'unique_clicks',
      'actions', 'action_values', 'cost_per_action_type',
      'inline_link_clicks', 'inline_link_click_ctr', 'cost_per_inline_link_click',
    ]
    const fields = [...baseFields, 'purchase_roas', 'website_purchase_roas'].join(',')
    const fallbackFields = [...baseFields, 'purchase_roas'].join(',')

    const insightParams = {
      fields,
      ...dateConfig.params,
      level,
      limit: 100,
    }
    const insights = await fetchAllMetaPages(`/${adAccount}/insights`, token, insightParams).catch(() =>
      fetchAllMetaPages(`/${adAccount}/insights`, token, { ...insightParams, fields: fallbackFields })
    )
    const dailyInsights = level === 'campaign'
      ? await fetchAllMetaPages(
          `/${adAccount}/insights`,
          token,
          {
            fields,
            ...dateConfig.params,
            level,
            time_increment: 1,
            limit: 500,
          },
          { maxPages: 250 }
        ).catch(() =>
          fetchAllMetaPages(
            `/${adAccount}/insights`,
            token,
            {
              fields: fallbackFields,
              ...dateConfig.params,
              level,
              time_increment: 1,
              limit: 500,
            },
            { maxPages: 250 }
          ).catch(() => [])
        )
      : []
    const campaignRows = level === 'campaign'
      ? mergeDailyVerifiedCampaignRows(insights, dailyInsights, dateConfig.range)
      : { rows: insights.map(enrichInsight), verifiedCampaigns: 0 }

    // Account-level summary
    const summaryParams = {
      fields,
      ...dateConfig.params,
      level: 'account',
    }
    const summaryData = await metaGraphRequest<{ data?: any[] }>(`/${adAccount}/insights`, token, summaryParams).catch(() =>
      metaGraphRequest<{ data?: any[] }>(`/${adAccount}/insights`, token, { ...summaryParams, fields: fallbackFields })
    )

    return NextResponse.json({
      insights: campaignRows.rows,
      summary: summaryData.data?.[0] ? enrichInsight(summaryData.data[0]) : null,
      datePreset,
      dateRange: dateConfig.range,
      level,
      verification: {
        mode: level === 'campaign' ? 'daily_campaign_rows' : 'aggregate_rows',
        verifiedCampaigns: campaignRows.verifiedCampaigns,
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch insights' }, { status: 500 })
  }
}
