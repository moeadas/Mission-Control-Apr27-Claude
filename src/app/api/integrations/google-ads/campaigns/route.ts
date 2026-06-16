import { NextRequest, NextResponse } from 'next/server'

import { getAuthTokenFromRequest, resolveAuthContextFromToken } from '@/lib/auth/server'
import {
  googleAdsErrorResponse,
  googleAdsSearchStream,
  microsToCurrency,
  numeric,
  resolveGoogleAdsAuth,
  resolveGoogleAdsDateRange,
} from '@/lib/server/google-ads-api'

function getBearerToken(request: NextRequest) {
  return getAuthTokenFromRequest(request)
}

export const dynamic = 'force-dynamic'

function moneyMetric(value: unknown) {
  return microsToCurrency(value)
}

function pctMetric(value: unknown) {
  const parsed = numeric(value)
  return parsed <= 1 ? parsed * 100 : parsed
}

function normalizeCampaignRow(row: any, dateRange: { since: string; until: string }) {
  const campaign = row.campaign || {}
  const metrics = row.metrics || {}
  const budget = row.campaignBudget || {}
  return {
    campaign: {
      id: String(campaign.id || ''),
      resourceName: campaign.resourceName || '',
      name: campaign.name || 'Untitled campaign',
      status: campaign.status || '',
      advertisingChannelType: campaign.advertisingChannelType || '',
      advertisingChannelSubType: campaign.advertisingChannelSubType || '',
      biddingStrategyType: campaign.biddingStrategyType || '',
      startDate: campaign.startDate || '',
      endDate: campaign.endDate || '',
      budgetAmount: moneyMetric(budget.amountMicros),
    },
    metrics: {
      cost: moneyMetric(metrics.costMicros),
      impressions: numeric(metrics.impressions),
      clicks: numeric(metrics.clicks),
      conversions: numeric(metrics.conversions),
      allConversions: numeric(metrics.allConversions),
      conversionValue: numeric(metrics.conversionsValue),
      allConversionValue: numeric(metrics.allConversionsValue),
      ctr: pctMetric(metrics.ctr),
      averageCpc: moneyMetric(metrics.averageCpc),
      averageCpm: moneyMetric(metrics.averageCpm),
      costPerConversion: moneyMetric(metrics.costPerConversion),
      interactions: numeric(metrics.interactions),
      interactionRate: pctMetric(metrics.interactionRate),
      videoViews: numeric(metrics.videoViews),
      averageCpv: moneyMetric(metrics.averageCpv),
      videoViewRate: pctMetric(metrics.videoViewRate),
      searchImpressionShare: pctMetric(metrics.searchImpressionShare),
      searchBudgetLostImpressionShare: pctMetric(metrics.searchBudgetLostImpressionShare),
      searchRankLostImpressionShare: pctMetric(metrics.searchRankLostImpressionShare),
    },
    dateRange,
  }
}

function summarize(rows: Array<{ metrics: Record<string, number> }>) {
  const total = rows.reduce((acc, row) => {
    acc.cost += numeric(row.metrics.cost)
    acc.impressions += numeric(row.metrics.impressions)
    acc.clicks += numeric(row.metrics.clicks)
    acc.conversions += numeric(row.metrics.conversions)
    acc.conversionValue += numeric(row.metrics.conversionValue)
    acc.videoViews += numeric(row.metrics.videoViews)
    acc.interactions += numeric(row.metrics.interactions)
    return acc
  }, {
    cost: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    conversionValue: 0,
    videoViews: 0,
    interactions: 0,
  })
  return {
    ...total,
    ctr: total.impressions > 0 ? (total.clicks / total.impressions) * 100 : 0,
    averageCpc: total.clicks > 0 ? total.cost / total.clicks : 0,
    averageCpm: total.impressions > 0 ? (total.cost / total.impressions) * 1000 : 0,
    costPerConversion: total.conversions > 0 ? total.cost / total.conversions : 0,
    roas: total.cost > 0 && total.conversionValue > 0 ? total.conversionValue / total.cost : 0,
  }
}

export async function GET(request: NextRequest) {
  try {
    const authContext = await resolveAuthContextFromToken(getBearerToken(request))
    if (!authContext) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = new URL(request.url)
    const customerId = url.searchParams.get('customerId') || ''
    const datePreset = url.searchParams.get('datePreset') || 'last_30d'
    if (!customerId) return NextResponse.json({ error: 'Google Ads customer ID required' }, { status: 400 })

    const adsAuth = await resolveGoogleAdsAuth(authContext.userId, authContext.providerSettings)
    const dateRange = resolveGoogleAdsDateRange(datePreset)
    const query = `
      SELECT
        campaign.id,
        campaign.resource_name,
        campaign.name,
        campaign.status,
        campaign.advertising_channel_type,
        campaign.advertising_channel_sub_type,
        campaign.bidding_strategy_type,
        campaign.start_date,
        campaign.end_date,
        campaign_budget.amount_micros,
        metrics.cost_micros,
        metrics.impressions,
        metrics.clicks,
        metrics.conversions,
        metrics.all_conversions,
        metrics.conversions_value,
        metrics.all_conversions_value,
        metrics.ctr,
        metrics.average_cpc,
        metrics.average_cpm,
        metrics.cost_per_conversion,
        metrics.interactions,
        metrics.interaction_rate,
        metrics.video_views,
        metrics.average_cpv,
        metrics.video_view_rate,
        metrics.search_impression_share,
        metrics.search_budget_lost_impression_share,
        metrics.search_rank_lost_impression_share
      FROM campaign
      WHERE segments.date BETWEEN '${dateRange.since}' AND '${dateRange.until}'
        AND campaign.status != 'REMOVED'
      ORDER BY metrics.cost_micros DESC
    `
    const rows = await googleAdsSearchStream<any>(customerId, adsAuth, query)
    const campaigns = rows.map((row) => normalizeCampaignRow(row, dateRange))

    return NextResponse.json({
      campaigns,
      summary: summarize(campaigns),
      count: campaigns.length,
      datePreset,
      dateRange,
      primaryMarket: adsAuth.primaryMarket,
    })
  } catch (error: any) {
    const response = googleAdsErrorResponse(error)
    return NextResponse.json(response.body, { status: response.status })
  }
}
