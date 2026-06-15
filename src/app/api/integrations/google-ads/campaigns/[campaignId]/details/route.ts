import { NextRequest, NextResponse } from 'next/server'

import { getAuthTokenFromRequest, resolveAuthContextFromToken } from '@/lib/auth/server'
import {
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

function pctMetric(value: unknown) {
  const parsed = numeric(value)
  return parsed <= 1 ? parsed * 100 : parsed
}

function normalizeMetrics(metrics: any = {}) {
  return {
    cost: microsToCurrency(metrics.costMicros),
    impressions: numeric(metrics.impressions),
    clicks: numeric(metrics.clicks),
    conversions: numeric(metrics.conversions),
    allConversions: numeric(metrics.allConversions),
    conversionValue: numeric(metrics.conversionsValue),
    allConversionValue: numeric(metrics.allConversionsValue),
    ctr: pctMetric(metrics.ctr),
    averageCpc: microsToCurrency(metrics.averageCpc),
    averageCpm: microsToCurrency(metrics.averageCpm),
    costPerConversion: microsToCurrency(metrics.costPerConversion),
    interactions: numeric(metrics.interactions),
    interactionRate: pctMetric(metrics.interactionRate),
    videoViews: numeric(metrics.videoViews),
    averageCpv: microsToCurrency(metrics.averageCpv),
    videoViewRate: pctMetric(metrics.videoViewRate),
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ campaignId: string }> }) {
  try {
    const authContext = await resolveAuthContextFromToken(getBearerToken(request))
    if (!authContext) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = new URL(request.url)
    const customerId = url.searchParams.get('customerId') || ''
    const datePreset = url.searchParams.get('datePreset') || 'last_30d'
    if (!customerId) return NextResponse.json({ error: 'Google Ads customer ID required' }, { status: 400 })

    const { campaignId } = await context.params
    const adsAuth = await resolveGoogleAdsAuth(authContext.userId, authContext.providerSettings)
    const dateRange = resolveGoogleAdsDateRange(datePreset)

    const campaignRows = await googleAdsSearchStream<any>(
      customerId,
      adsAuth,
      `
        SELECT
          campaign.id,
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
        WHERE campaign.id = ${campaignId}
          AND segments.date BETWEEN '${dateRange.since}' AND '${dateRange.until}'
        LIMIT 1
      `
    )

    const adGroupRows = await googleAdsSearchStream<any>(
      customerId,
      adsAuth,
      `
        SELECT
          ad_group.id,
          ad_group.name,
          ad_group.status,
          ad_group.type,
          metrics.cost_micros,
          metrics.impressions,
          metrics.clicks,
          metrics.conversions,
          metrics.conversions_value,
          metrics.ctr,
          metrics.average_cpc,
          metrics.cost_per_conversion
        FROM ad_group
        WHERE campaign.id = ${campaignId}
          AND segments.date BETWEEN '${dateRange.since}' AND '${dateRange.until}'
          AND ad_group.status != 'REMOVED'
        ORDER BY metrics.cost_micros DESC
        LIMIT 20
      `
    ).catch(() => [])

    const searchTermRows = await googleAdsSearchStream<any>(
      customerId,
      adsAuth,
      `
        SELECT
          search_term_view.search_term,
          ad_group.name,
          metrics.cost_micros,
          metrics.impressions,
          metrics.clicks,
          metrics.conversions,
          metrics.ctr,
          metrics.average_cpc
        FROM search_term_view
        WHERE campaign.id = ${campaignId}
          AND segments.date BETWEEN '${dateRange.since}' AND '${dateRange.until}'
        ORDER BY metrics.cost_micros DESC
        LIMIT 25
      `
    ).catch(() => [])

    const assetRows = await googleAdsSearchStream<any>(
      customerId,
      adsAuth,
      `
        SELECT
          asset_group.id,
          asset_group.name,
          metrics.cost_micros,
          metrics.impressions,
          metrics.clicks,
          metrics.conversions,
          metrics.conversions_value
        FROM asset_group
        WHERE campaign.id = ${campaignId}
          AND segments.date BETWEEN '${dateRange.since}' AND '${dateRange.until}'
        ORDER BY metrics.cost_micros DESC
        LIMIT 20
      `
    ).catch(() => [])

    const campaignRow = campaignRows[0] || {}
    const campaign = campaignRow.campaign || {}
    const budget = campaignRow.campaignBudget || {}

    return NextResponse.json({
      campaign: {
        id: String(campaign.id || campaignId),
        name: campaign.name || 'Untitled campaign',
        status: campaign.status || '',
        advertisingChannelType: campaign.advertisingChannelType || '',
        advertisingChannelSubType: campaign.advertisingChannelSubType || '',
        biddingStrategyType: campaign.biddingStrategyType || '',
        startDate: campaign.startDate || '',
        endDate: campaign.endDate || '',
        budgetAmount: microsToCurrency(budget.amountMicros),
      },
      metrics: normalizeMetrics(campaignRow.metrics),
      adGroups: adGroupRows.map((row) => ({
        id: String(row.adGroup?.id || ''),
        name: row.adGroup?.name || 'Ad group',
        status: row.adGroup?.status || '',
        type: row.adGroup?.type || '',
        metrics: normalizeMetrics(row.metrics),
      })),
      searchTerms: searchTermRows.map((row) => ({
        term: row.searchTermView?.searchTerm || '',
        adGroup: row.adGroup?.name || '',
        metrics: normalizeMetrics(row.metrics),
      })),
      assetGroups: assetRows.map((row) => ({
        id: String(row.assetGroup?.id || ''),
        name: row.assetGroup?.name || 'Asset group',
        metrics: normalizeMetrics(row.metrics),
      })),
      datePreset,
      dateRange,
      primaryMarket: adsAuth.primaryMarket,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to load Google Ads campaign details' }, { status: 500 })
  }
}
