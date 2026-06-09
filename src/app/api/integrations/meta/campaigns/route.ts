import { NextRequest, NextResponse } from 'next/server'

import { resolveAuthContextFromToken, getAuthTokenFromRequest } from '@/lib/auth/server'
import { normalizeProviderSettings } from '@/lib/provider-settings'
import { fetchAllMetaPages, normalizeAdAccountId, resolveMetaToken } from '@/lib/server/meta-ads-api'

function getBearerToken(r: NextRequest) {
  // Batch P.2: cookie OR bearer. Local wrapper kept so call sites don't change.
  return getAuthTokenFromRequest(r)
}

export const dynamic = 'force-dynamic'

function pushUnique(target: string[], value: unknown) {
  const normalized = String(value || '').trim()
  if (normalized && !target.includes(normalized)) target.push(normalized)
}

function summarizeCampaignAdsetContext(adsets: any[]) {
  const byCampaign = new Map<string, {
    destinationTypes: string[]
    optimizationGoals: string[]
    billingEvents: string[]
    promotedObjectEventTypes: string[]
    promotedObjectPixelIds: string[]
    promotedObjectPageIds: string[]
    promotedObjectApplicationIds: string[]
    adsetCount: number
  }>()

  for (const adset of adsets) {
    const campaignId = String(adset?.campaign_id || '')
    if (!campaignId) continue
    const current = byCampaign.get(campaignId) || {
      destinationTypes: [],
      optimizationGoals: [],
      billingEvents: [],
      promotedObjectEventTypes: [],
      promotedObjectPixelIds: [],
      promotedObjectPageIds: [],
      promotedObjectApplicationIds: [],
      adsetCount: 0,
    }
    current.adsetCount += 1
    pushUnique(current.destinationTypes, adset.destination_type)
    pushUnique(current.optimizationGoals, adset.optimization_goal)
    pushUnique(current.billingEvents, adset.billing_event)
    pushUnique(current.promotedObjectEventTypes, adset.promoted_object?.custom_event_type)
    pushUnique(current.promotedObjectPixelIds, adset.promoted_object?.pixel_id)
    pushUnique(current.promotedObjectPageIds, adset.promoted_object?.page_id)
    pushUnique(current.promotedObjectApplicationIds, adset.promoted_object?.application_id)
    byCampaign.set(campaignId, current)
  }

  return byCampaign
}

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
    const fields = [
      'id', 'name', 'status', 'effective_status', 'configured_status', 'objective', 'daily_budget', 'lifetime_budget',
      'start_time', 'stop_time', 'created_time', 'updated_time',
    ].join(',')

    const campaigns = await fetchAllMetaPages(`/${adAccount}/campaigns`, token, {
      fields,
      limit: 100,
    })
    const adsets = await fetchAllMetaPages(`/${adAccount}/adsets`, token, {
      fields: 'id,campaign_id,destination_type,optimization_goal,billing_event,promoted_object,status,effective_status',
      limit: 500,
    }, { maxPages: 250 }).catch(() => [])
    const adsetContextByCampaign = summarizeCampaignAdsetContext(adsets)
    const campaignsWithContext = campaigns.map((campaign: any) => ({
      ...campaign,
      conversion_context: adsetContextByCampaign.get(String(campaign.id)) || null,
    }))

    return NextResponse.json({ campaigns: campaignsWithContext, count: campaignsWithContext.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch campaigns' }, { status: 500 })
  }
}
