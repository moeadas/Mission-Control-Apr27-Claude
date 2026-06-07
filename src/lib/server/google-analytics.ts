import { getGa4DateRange, type Ga4WidgetConfig } from '@/lib/ga4-presets'
import { getGoogleOAuthTokenForUser, refreshGoogleAccessTokenForUser } from '@/lib/google-integrations'
import { isAccessTokenExpired } from '@/lib/server/oauth-tokens'

type Ga4Row = Record<string, string | number>

const dashboardCache = new Map<string, { expiresAt: number; data: any }>()
const CACHE_TTL_MS = 60 * 60 * 1000

function cacheKey(parts: unknown[]) {
  return JSON.stringify(parts)
}

function readCache(key: string) {
  const item = dashboardCache.get(key)
  if (!item) return null
  if (item.expiresAt < Date.now()) {
    dashboardCache.delete(key)
    return null
  }
  return item.data
}

function writeCache(key: string, data: any) {
  dashboardCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, data })
}

export async function getGa4AccessTokenForUser(userId: string) {
  const token = await getGoogleOAuthTokenForUser(userId)
  if (!token?.accessToken) return null
  if (!isAccessTokenExpired(token)) return token.accessToken

  const refreshed = await refreshGoogleAccessTokenForUser(userId)
  return refreshed?.credentials?.access_token || null
}

function isGoogleAuthError(error: any) {
  const status = error?.code || error?.status || error?.response?.status
  const message = String(error?.message || error?.errors?.[0]?.message || error?.response?.data?.error_description || '')
  return status === 401 || /invalid authentication credentials|invalid credentials|expected oauth 2 access token|unauthorized/i.test(message)
}

async function withGoogleAuthRetry<T>(userId: string, run: (accessToken: string) => Promise<T>): Promise<T> {
  const token = await getGoogleOAuthTokenForUser(userId)
  if (!token?.accessToken) throw new Error('Google Analytics is not connected. Connect Google in Settings.')

  const tokenExpired = isAccessTokenExpired(token)
  const accessToken = tokenExpired ? await getGa4AccessTokenForUser(userId) : token.accessToken
  if (!accessToken) throw new Error('Google Analytics is not connected. Connect Google in Settings.')

  try {
    return await run(accessToken)
  } catch (error) {
    if (!isGoogleAuthError(error)) throw error

    if (!tokenExpired) {
      const status = (error as any)?.status || (error as any)?.response?.status || 'unknown'
      console.warn('[google-analytics] fresh Google access token was rejected by GA API; preserving OAuth grant', {
        userId,
        accountEmail: token.accountEmail,
        status,
        expiresAt: token.expiresAt?.toISOString() || null,
      })
      throw new Error('Google Analytics API rejected the saved Google access token. Reconnect is not required yet; check that the Google account has GA4 access and the Analytics APIs are enabled.')
    }

    const refreshed = await refreshGoogleAccessTokenForUser(userId)
    const refreshedToken = refreshed?.credentials?.access_token
    if (!refreshedToken) {
      throw new Error('Google connection expired. Reconnect Google in Settings, then reload Analytics.')
    }
    return run(refreshedToken)
  }
}

async function googleJson<T>(url: string, accessToken: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers || {}),
    },
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const error: any = new Error(data?.error?.message || data?.error_description || `Google Analytics API returned HTTP ${response.status}.`)
    error.status = response.status
    error.response = { status: response.status, data }
    throw error
  }
  return data as T
}

export async function listGa4Properties(userId: string) {
  return withGoogleAuthRetry(userId, async (accessToken) => {
    const response = await googleJson<{ accountSummaries?: any[] }>(
      'https://analyticsadmin.googleapis.com/v1beta/accountSummaries',
      accessToken
    )
    const accounts = response.accountSummaries || []

    return accounts.flatMap((account) =>
      (account.propertySummaries || []).map((property: any) => ({
        account: account.displayName || account.account || 'Google Analytics',
        accountId: account.account,
        propertyId: String(property.property || '').replace('properties/', ''),
        propertyName: property.displayName || property.property || 'GA4 property',
        propertyResource: property.property,
      }))
    )
  })
}

function normalizeReportRows(response: any): Ga4Row[] {
  const dimensionHeaders = response?.dimensionHeaders || []
  const metricHeaders = response?.metricHeaders || []
  return (response?.rows || []).map((row: any) => {
    const item: Ga4Row = {}
    dimensionHeaders.forEach((header: any, index: number) => {
      item[header.name] = row.dimensionValues?.[index]?.value ?? ''
    })
    metricHeaders.forEach((header: any, index: number) => {
      const raw = row.metricValues?.[index]?.value ?? '0'
      const parsed = Number.parseFloat(raw)
      item[header.name] = Number.isFinite(parsed) ? parsed : raw
    })
    return item
  })
}

function orderBys(widget: Ga4WidgetConfig) {
  return (widget.query.orderBys || []).map((order) => ({
    metric: { metricName: order.metric },
    desc: Boolean(order.desc),
  }))
}

function metricFilterForEvents(events: string[]) {
  return {
    filter: {
      fieldName: 'eventName',
      inListFilter: { values: events },
    },
  }
}

export async function runGa4WidgetReport({
  userId,
  propertyId,
  widget,
  dateRangeId,
  previous = false,
}: {
  userId: string
  propertyId: string
  widget: Ga4WidgetConfig
  dateRangeId: string
  previous?: boolean
}) {
  const key = cacheKey(['ga4-widget', userId, propertyId, widget.id, dateRangeId, previous])
  const cached = readCache(key)
  if (cached) return cached

  const dateRange = getGa4DateRange(dateRangeId)
  const startDate = previous ? dateRange.previousStartDate : dateRange.startDate
  const endDate = previous ? dateRange.previousEndDate : dateRange.endDate

  const funnelEvents = widget.query.funnelEvents || []
  if (funnelEvents.length) {
    const response: any = await withGoogleAuthRetry(userId, async (accessToken) =>
      googleJson(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, accessToken, {
        method: 'POST',
        body: JSON.stringify({
        dateRanges: [{ startDate, endDate }],
        dimensions: [{ name: 'eventName' }],
        metrics: [{ name: 'eventCount' }],
        dimensionFilter: metricFilterForEvents(funnelEvents),
        limit: String(funnelEvents.length),
        returnPropertyQuota: true,
      }),
    }))
    const rows = normalizeReportRows(response)
    const indexed = new Map(rows.map((row) => [String(row.eventName), Number(row.eventCount || 0)]))
    const result = {
      rows: funnelEvents.map((eventName, index) => {
        const value = indexed.get(eventName) || 0
        const previousValue = index > 0 ? indexed.get(funnelEvents[index - 1]) || 0 : value
        return {
          eventName,
          eventCount: value,
          stepConversionRate: index === 0 || previousValue === 0 ? 100 : (value / previousValue) * 100,
        }
      }),
      quota: response.propertyQuota || null,
    }
    writeCache(key, result)
    return result
  }

  const response: any = await withGoogleAuthRetry(userId, async (accessToken) =>
    googleJson(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, accessToken, {
      method: 'POST',
      body: JSON.stringify({
      dateRanges: [{ startDate, endDate }],
      dimensions: (widget.query.dimensions || []).map((name) => ({ name })),
      metrics: (widget.query.metrics || []).map((name) => ({ name })),
      orderBys: orderBys(widget),
      limit: String(widget.query.limit || 25),
      returnPropertyQuota: true,
    }),
  }))
  const result = {
    rows: normalizeReportRows(response),
    totals: normalizeReportRows({
      dimensionHeaders: [],
      metricHeaders: response.metricHeaders,
      rows: response.totals || [],
    })[0] || null,
    rowCount: response.rowCount || 0,
    quota: response.propertyQuota || null,
  }
  writeCache(key, result)
  return result
}

export async function runGa4Dashboard({
  userId,
  propertyId,
  preset,
  dateRangeId,
}: {
  userId: string
  propertyId: string
  preset: { widgets: Ga4WidgetConfig[] }
  dateRangeId: string
}) {
  const widgets: Record<string, any> = {}
  for (const widget of preset.widgets) {
    const current = await runGa4WidgetReport({ userId, propertyId, widget, dateRangeId })
    let previous: any = null
    if (widget.viz?.compareToPrevious) {
      previous = await runGa4WidgetReport({ userId, propertyId, widget, dateRangeId, previous: true }).catch(() => null)
    }
    widgets[widget.id] = { config: widget, current, previous }
  }
  return widgets
}

function firstMetric(widget: any) {
  const metric = widget?.config?.query?.metrics?.[0]
  return metric ? Number(widget?.current?.totals?.[metric] ?? widget?.current?.rows?.[0]?.[metric] ?? 0) : 0
}

function previousFirstMetric(widget: any) {
  const metric = widget?.config?.query?.metrics?.[0]
  return metric ? Number(widget?.previous?.totals?.[metric] ?? widget?.previous?.rows?.[0]?.[metric] ?? 0) : 0
}

export function buildGa4RuleInsights(widgets: Record<string, any>) {
  const insights: Array<{ type: 'opportunity' | 'risk' | 'optimization'; title: string; evidence: string; severity: 'low' | 'medium' | 'high'; action: string }> = []

  for (const widget of Object.values(widgets)) {
    if (!widget?.config?.viz?.compareToPrevious) continue
    const current = firstMetric(widget)
    const previous = previousFirstMetric(widget)
    if (!previous || !Number.isFinite(current) || !Number.isFinite(previous)) continue
    const change = ((current - previous) / previous) * 100
    if (change <= -15) {
      insights.push({
        type: 'risk',
        severity: change <= -30 ? 'high' : 'medium',
        title: `${widget.config.title} dropped ${Math.abs(change).toFixed(1)}%`,
        evidence: `Current period: ${current.toLocaleString()}; previous comparable period: ${previous.toLocaleString()}.`,
        action: 'Inspect channel, landing page, and campaign widgets for the source of the decline.',
      })
    } else if (change >= 20) {
      insights.push({
        type: 'opportunity',
        severity: 'medium',
        title: `${widget.config.title} increased ${change.toFixed(1)}%`,
        evidence: `Current period: ${current.toLocaleString()}; previous comparable period: ${previous.toLocaleString()}.`,
        action: 'Identify the strongest channel/page/source and consider scaling the same pattern.',
      })
    }
  }

  const engagementWidgets = Object.values(widgets).filter((widget: any) => widget?.current?.totals?.engagementRate !== undefined)
  for (const widget of engagementWidgets) {
    const rate = Number(widget.current.totals.engagementRate || 0)
    if (rate > 0 && rate < 0.45) {
      insights.push({
        type: 'optimization',
        severity: 'medium',
        title: 'Engagement rate is weak',
        evidence: `${widget.config.title} engagement rate is ${(rate * 100).toFixed(1)}%.`,
        action: 'Review landing-page intent match, page load speed, above-the-fold clarity, and CTA relevance.',
      })
      break
    }
  }

  return insights.slice(0, 8)
}
