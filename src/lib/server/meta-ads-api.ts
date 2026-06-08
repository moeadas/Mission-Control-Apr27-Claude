import { normalizeProviderSettings } from '@/lib/provider-settings'
import type { ProviderSettings } from '@/lib/types'
import { getOAuthToken } from '@/lib/server/oauth-tokens'

const META_GRAPH_VERSION = process.env.META_GRAPH_API_VERSION || 'v20.0'
const META_GRAPH = `https://graph.facebook.com/${META_GRAPH_VERSION}`
const MADRID_TIME_ZONE = 'Europe/Madrid'

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

const madridDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: MADRID_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

function madridDate(offsetDays = 0) {
  return madridDateFormatter.format(new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000))
}

function madridParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: MADRID_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date)
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value || 0)
  return { year: get('year'), month: get('month'), day: get('day') }
}

function ymd(year: number, month: number, day: number) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function resolveMetaInsightDateRange(datePreset = 'last_30d') {
  const today = madridDate(0)
  const yesterday = madridDate(-1)

  if (datePreset === 'today') return { since: today, until: today }
  if (datePreset === 'yesterday') return { since: yesterday, until: yesterday }
  if (datePreset === 'last_7d') return { since: madridDate(-6), until: today }
  if (datePreset === 'last_14d') return { since: madridDate(-13), until: today }
  if (datePreset === 'last_30d') return { since: madridDate(-29), until: today }
  if (datePreset === 'last_90d') return { since: madridDate(-89), until: today }

  const { year, month } = madridParts()
  if (datePreset === 'this_month') return { since: ymd(year, month, 1), until: today }

  if (datePreset === 'last_month') {
    const lastMonth = month === 1 ? 12 : month - 1
    const lastMonthYear = month === 1 ? year - 1 : year
    const lastDay = new Date(Date.UTC(lastMonthYear, lastMonth, 0)).getUTCDate()
    return { since: ymd(lastMonthYear, lastMonth, 1), until: ymd(lastMonthYear, lastMonth, lastDay) }
  }

  return { since: madridDate(-29), until: today }
}

export function buildMetaInsightsParams(datePreset = 'last_30d') {
  const range = resolveMetaInsightDateRange(datePreset)
  return {
    params: {
      time_range: JSON.stringify(range),
      time_increment: 'all_days',
      action_report_time: 'impression',
    },
    range,
  }
}

export function extractMetaActionMetrics(row: any) {
  const actions = Array.isArray(row?.actions) ? row.actions : []
  const actionValues = Array.isArray(row?.action_values) ? row.action_values : []
  const costPerActions = Array.isArray(row?.cost_per_action_type) ? row.cost_per_action_type : []
  const purchaseRoasRows = [
    ...(Array.isArray(row?.purchase_roas) ? row.purchase_roas : []),
    ...(Array.isArray(row?.website_purchase_roas) ? row.website_purchase_roas : []),
  ]
  const actionMap = new Map<string, number>()
  for (const action of actions) {
    const actionType = String(action.action_type || '')
    const value = Number.parseInt(String(action.value || 0), 10) || 0
    actionMap.set(actionType, (actionMap.get(actionType) || 0) + value)
  }
  const actionValueMap = new Map<string, number>()
  for (const action of actionValues) {
    const actionType = String(action.action_type || '')
    const value = Number.parseFloat(String(action.value || 0)) || 0
    actionValueMap.set(actionType, (actionValueMap.get(actionType) || 0) + value)
  }
  const pickActionValue = (candidates: string[]) => {
    for (const candidate of candidates) {
      const value = actionMap.get(candidate)
      if (value && value > 0) return { actionType: candidate, value }
    }
    return { actionType: null as string | null, value: 0 }
  }
  const pickMoneyValue = (candidates: string[]) => {
    for (const candidate of candidates) {
      const value = actionValueMap.get(candidate)
      if (value && value > 0) return { actionType: candidate, value }
    }
    return { actionType: null as string | null, value: 0 }
  }
  const leadResult = pickActionValue([
    'lead',
    'onsite_web_lead',
    'offsite_conversion.fb_pixel_lead',
    'offsite_lead_add_20_s_calls',
  ])
  const purchaseResult = pickActionValue([
    'purchase',
    'omni_purchase',
    'offsite_conversion.fb_pixel_purchase',
    'onsite_conversion.purchase',
  ])
  const purchaseValueResult = pickMoneyValue([
    'purchase',
    'omni_purchase',
    'offsite_conversion.fb_pixel_purchase',
    'onsite_conversion.purchase',
  ])
  const roasValue = purchaseRoasRows.reduce((best, item: any) => {
    const value = Number.parseFloat(String(item?.value || 0)) || 0
    return value > best ? value : best
  }, 0)
  const metric = {
    conversions: 0,
    purchases: purchaseResult.value,
    purchase_action_type: purchaseResult.actionType,
    purchase_value: purchaseValueResult.value,
    purchase_value_action_type: purchaseValueResult.actionType,
    roas: roasValue,
    checkout_initiations: 0,
    app_installs: 0,
    messages: 0,
    leads: leadResult.value,
    lead_action_type: leadResult.actionType,
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
      if (!purchaseResult.value) metric.purchases += value
      metric.conversions += value
    } else if (actionType.includes('add_to_cart')) {
      metric.add_to_cart += value
    } else if (actionType.includes('initiate_checkout') || actionType.includes('checkout')) {
      metric.checkout_initiations += value
    } else if (actionType === 'landing_page_view') {
      metric.page_views += value
    } else if (actionType.includes('mobile_app_install') || actionType === 'app_install') {
      metric.app_installs += value
      metric.conversions += value
    } else if (actionType.includes('messaging_conversation') || actionType.includes('onsite_conversion.messaging')) {
      metric.messages += value
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
  metric.conversions += metric.leads

  const spend = Number.parseFloat(String(row?.spend || 0)) || 0
  const clicks = Number.parseInt(String(row?.clicks || 0), 10) || 0
  const impressions = Number.parseInt(String(row?.impressions || 0), 10) || 0
  if (!metric.roas && metric.purchase_value > 0 && spend > 0) metric.roas = metric.purchase_value / spend

  const costPerLead = costPerActions.find((item: any) => String(item.action_type || '') === leadResult.actionType)?.value
    || costPerActions.find((item: any) => String(item.action_type || '') === 'lead')?.value
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
