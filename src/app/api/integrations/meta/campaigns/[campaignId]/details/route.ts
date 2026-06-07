import { NextRequest, NextResponse } from 'next/server'

import { resolveAuthContextFromToken, getAuthTokenFromRequest } from '@/lib/auth/server'
import { normalizeProviderSettings } from '@/lib/provider-settings'
import { buildMetaInsightsParams, enrichInsight, fetchAllMetaPages, metaGraphRequest, resolveMetaToken } from '@/lib/server/meta-ads-api'

function getBearerToken(request: NextRequest) {
  return getAuthTokenFromRequest(request)
}

export const dynamic = 'force-dynamic'

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

    const insightFields = [
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
    ].join(',')

    const insightData = await metaGraphRequest<{ data?: any[] }>(`/${campaignId}/insights`, token, {
      fields: insightFields,
      ...dateConfig.params,
    }).catch(() => ({ data: [] }))

    const adsets = await fetchAllMetaPages(`/${campaignId}/adsets`, token, {
      fields: 'id,name,status,effective_status,daily_budget,lifetime_budget,bid_strategy,optimization_goal,billing_event,targeting,start_time,end_time,created_time,updated_time',
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
      campaign,
      insight: insightData.data?.[0] ? enrichInsight(insightData.data[0]) : null,
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
