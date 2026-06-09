import { NextRequest, NextResponse } from 'next/server'

import { resolveAuthContextFromToken, getAuthTokenFromRequest } from '@/lib/auth/server'
import { normalizeProviderSettings } from '@/lib/provider-settings'
import { buildMetaInsightsParams, enrichInsight, fetchAllMetaPages, metaGraphRequest, resolveMetaToken } from '@/lib/server/meta-ads-api'

function getBearerToken(request: NextRequest) {
  return getAuthTokenFromRequest(request)
}

export const dynamic = 'force-dynamic'

function pushUnique(target: string[], value: unknown) {
  const normalized = String(value || '').trim()
  if (normalized && !target.includes(normalized)) target.push(normalized)
}

function summarizeAdsetContext(adsets: any[]) {
  const context = {
    destinationTypes: [] as string[],
    optimizationGoals: [] as string[],
    billingEvents: [] as string[],
    promotedObjectEventTypes: [] as string[],
    promotedObjectPixelIds: [] as string[],
    promotedObjectPageIds: [] as string[],
    promotedObjectApplicationIds: [] as string[],
    adsetCount: adsets.length,
  }
  for (const adset of adsets) {
    pushUnique(context.destinationTypes, adset.destination_type)
    pushUnique(context.optimizationGoals, adset.optimization_goal)
    pushUnique(context.billingEvents, adset.billing_event)
    pushUnique(context.promotedObjectEventTypes, adset.promoted_object?.custom_event_type)
    pushUnique(context.promotedObjectPixelIds, adset.promoted_object?.pixel_id)
    pushUnique(context.promotedObjectPageIds, adset.promoted_object?.page_id)
    pushUnique(context.promotedObjectApplicationIds, adset.promoted_object?.application_id)
  }
  return context
}

export async function GET(request: NextRequest, context: { params: Promise<{ campaignId: string }> }) {
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

    const { campaignId } = await context.params
    const datePreset = new URL(request.url).searchParams.get('datePreset') || 'last_30d'
    const dateConfig = buildMetaInsightsParams(datePreset)

    const campaign = await metaGraphRequest(`/${campaignId}`, token, {
      fields: 'id,name,status,effective_status,configured_status,objective,daily_budget,lifetime_budget,start_time,stop_time,created_time,updated_time,buying_type',
    })

    const baseInsightFields = [
      'impressions',
      'clicks',
      'spend',
      'reach',
      'frequency',
      'ctr',
      'cpm',
      'cpp',
      'cpc',
      'actions',
      'cost_per_action_type',
      'action_values',
      'inline_link_clicks',
      'inline_link_click_ctr',
      'cost_per_inline_link_click',
    ]
    const insightFields = [...baseInsightFields, 'purchase_roas', 'website_purchase_roas'].join(',')
    const fallbackInsightFields = [...baseInsightFields, 'purchase_roas'].join(',')

    const insightParams = {
      fields: insightFields,
      ...dateConfig.params,
    }
    const insightData = await metaGraphRequest<{ data?: any[] }>(`/${campaignId}/insights`, token, insightParams).catch(() =>
      metaGraphRequest<{ data?: any[] }>(`/${campaignId}/insights`, token, { ...insightParams, fields: fallbackInsightFields }).catch(() => ({ data: [] }))
    )

    const dailyParams = {
      fields: insightFields,
      time_range: dateConfig.params.time_range,
      time_increment: 1,
      action_report_time: dateConfig.params.action_report_time,
      limit: 100,
    }
    const dailyData = await metaGraphRequest<{ data?: any[] }>(`/${campaignId}/insights`, token, dailyParams).catch(() =>
      metaGraphRequest<{ data?: any[] }>(`/${campaignId}/insights`, token, { ...dailyParams, fields: fallbackInsightFields }).catch(() => ({ data: [] }))
    )
    const dailyBreakdown = (dailyData.data || []).map(enrichInsight)
    const spendDays = dailyBreakdown.filter((row) => Number.parseFloat(String(row.spend || 0)) > 0)
    const activeDelivery = spendDays.length
      ? {
          firstDate: spendDays[0]?.date_start || null,
          lastDate: spendDays[spendDays.length - 1]?.date_stop || spendDays[spendDays.length - 1]?.date_start || null,
          daysWithSpend: spendDays.length,
          spend: spendDays.reduce((total, row) => total + (Number.parseFloat(String(row.spend || 0)) || 0), 0).toFixed(2),
        }
      : null

    const adsets = await fetchAllMetaPages(`/${campaignId}/adsets`, token, {
      fields: 'id,name,status,effective_status,daily_budget,lifetime_budget,bid_strategy,optimization_goal,billing_event,destination_type,promoted_object,targeting,start_time,end_time,created_time,updated_time',
      limit: 100,
    }).catch(() => [])

    const adsByAdset = await Promise.all(
      adsets.slice(0, 20).map(async (adset: any) => {
        const ads = await fetchAllMetaPages(`/${adset.id}/ads`, token, {
          fields: 'id,name,status,effective_status,creative,created_time,updated_time',
          limit: 100,
        }).catch(() => [])
        return { adsetId: adset.id, ads }
      })
    )

    const ads = adsByAdset.flatMap((group) => group.ads.map((ad: any) => ({ ...ad, adset_id: group.adsetId })))
    const creatives = await Promise.all(
      ads.slice(0, 12).map(async (ad: any) => {
        const creativeId = ad?.creative?.id
        if (!creativeId) return null
        const creative = await metaGraphRequest(`/${creativeId}`, token, {
          fields: 'id,name,title,body,image_url,video_id,thumbnail_url,link_url,call_to_action_type,object_story_spec,asset_feed_spec',
        }).catch(() => null)
        return creative ? { adId: ad.id, ...creative } : null
      })
    )

    return NextResponse.json({
      campaign: { ...(campaign as any), conversion_context: summarizeAdsetContext(adsets) },
      insight: insightData.data?.[0] ? enrichInsight(insightData.data[0]) : null,
      dailyBreakdown,
      activeDelivery,
      adsets,
      ads,
      creatives: creatives.filter(Boolean),
      datePreset,
      dateRange: dateConfig.range,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch campaign details' }, { status: 500 })
  }
}
