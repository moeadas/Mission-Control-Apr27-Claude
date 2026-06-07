import { normalizeProviderSettings } from '@/lib/provider-settings'
import type { ProviderSettings } from '@/lib/types'
import { getOAuthToken } from '@/lib/server/oauth-tokens'

const META_GRAPH_VERSION = process.env.META_GRAPH_API_VERSION || 'v20.0'
const META_GRAPH = `https://graph.facebook.com/${META_GRAPH_VERSION}`

export function normalizeAdAccountId(accountId: string) {
  return accountId.startsWith('act_') ? accountId : `act_${accountId}`
}

export async function resolveMetaToken(userId: string, providerSettings?: ProviderSettings | null) {
  const settings = normalizeProviderSettings(providerSettings)
  const oauth = await getOAuthToken(userId, 'meta')
  return oauth?.accessToken || settings.meta?.accessToken || null
}

export async function metaGraphRequest<T = any>(
  pathOrUrl: string,
  accessToken: string,
  params?: Record<string, string | number | undefined | null>
): Promise<T> {
  const url = pathOrUrl.startsWith('http')
    ? new URL(pathOrUrl)
    : new URL(`${META_GRAPH}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`)

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
    })
  }

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data?.error) {
    throw new Error(data?.error?.message || `Meta API request failed (${response.status})`)
  }
  return data
}

export async function fetchAllMetaPages<T = any>(
  path: string,
  accessToken: string,
  params: Record<string, string | number | undefined | null>
) {
  const rows: T[] = []
  let response = await metaGraphRequest<{ data?: T[]; paging?: { next?: string } }>(path, accessToken, params)
  rows.push(...(response.data || []))

  let next = response.paging?.next
  let guard = 0
  while (next && guard < 20) {
    response = await metaGraphRequest<{ data?: T[]; paging?: { next?: string } }>(next, accessToken)
    rows.push(...(response.data || []))
    next = response.paging?.next
    guard += 1
  }

  return rows
}

export function extractMetaActionMetrics(row: any) {
  const actions = Array.isArray(row?.actions) ? row.actions : []
  const costPerActions = Array.isArray(row?.cost_per_action_type) ? row.cost_per_action_type : []
  const metric = {
    conversions: 0,
    purchases: 0,
    leads: 0,
    add_to_cart: 0,
    page_views: 0,
    post_engagements: 0,
    video_views: 0,
    link_clicks_action: 0,
    cost_per_lead: '0.00',
    meta_reported_cost_per_lead: '0.00',
    cost_per_conversion: row?.cost_per_conversion || '0.00',
    meta_reported_cost_per_conversion: row?.cost_per_conversion || '0.00',
  }

  for (const action of actions) {
    const actionType = String(action.action_type || '')
    const value = Number.parseInt(String(action.value || 0), 10) || 0
    if (actionType.includes('purchase') || actionType.includes('complete_registration')) {
      metric.purchases += value
      metric.conversions += value
    } else if (actionType.includes('lead')) {
      metric.leads += value
      metric.conversions += value
    } else if (actionType.includes('add_to_cart') || actionType.includes('initiate_checkout')) {
      metric.add_to_cart += value
    } else if (actionType === 'landing_page_view') {
      metric.page_views += value
    } else if (actionType === 'link_click') {
      metric.link_clicks_action += value
    } else if (
      actionType === 'post' ||
      actionType === 'post_engagement' ||
      actionType === 'like' ||
      actionType === 'post_reaction' ||
      actionType === 'comment' ||
      actionType === 'share' ||
      actionType === 'page_engagement' ||
      actionType === 'onsite_conversion.post_save'
    ) {
      metric.post_engagements += value
    } else if (actionType.includes('video_view')) {
      metric.video_views += value
    }
  }

  const spend = Number.parseFloat(String(row?.spend || 0)) || 0
  const clicks = Number.parseInt(String(row?.clicks || 0), 10) || 0
  const impressions = Number.parseInt(String(row?.impressions || 0), 10) || 0

  const costPerLead = costPerActions.find((item: any) => String(item.action_type || '').includes('lead'))?.value
  if (costPerLead) metric.meta_reported_cost_per_lead = String(Number.parseFloat(String(costPerLead)).toFixed(2))
  if (metric.leads > 0) metric.cost_per_lead = (spend / metric.leads).toFixed(2)

  if (metric.conversions > 0) metric.cost_per_conversion = (spend / metric.conversions).toFixed(2)

  return {
    ...metric,
    conversion_rate: clicks > 0 ? ((metric.conversions / clicks) * 100).toFixed(2) : '0.00',
    engagement_rate: impressions > 0 ? ((metric.post_engagements / impressions) * 100).toFixed(2) : '0.00',
    cost_per_engagement: metric.post_engagements > 0 ? (spend / metric.post_engagements).toFixed(2) : '0.00',
    cost_per_video_view: metric.video_views > 0 ? (spend / metric.video_views).toFixed(2) : '0.00',
  }
}

export function enrichInsight(row: any) {
  return {
    ...row,
    ...extractMetaActionMetrics(row),
  }
}
