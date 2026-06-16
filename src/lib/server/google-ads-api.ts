import { getGoogleAccessTokenForUser, getGoogleOAuthTokenForUser } from '@/lib/google-integrations'
import { normalizeProviderSettings } from '@/lib/provider-settings'
import type { ProviderSettings } from '@/lib/types'

const GOOGLE_ADS_VERSION = process.env.GOOGLE_ADS_API_VERSION || 'v24'
const GOOGLE_ADS_BASE = `https://googleads.googleapis.com/${GOOGLE_ADS_VERSION}`
const MADRID_TIME_ZONE = 'Europe/Madrid'

export type GoogleAdsDateRange = { since: string; until: string }

export class GoogleAdsApiError extends Error {
  status: number
  googleStatus?: string
  googleCode?: string
  requestId?: string | null
  details?: unknown
  rawBody?: string

  constructor(message: string, options: {
    status: number
    googleStatus?: string
    googleCode?: string
    requestId?: string | null
    details?: unknown
    rawBody?: string
  }) {
    super(message)
    this.name = 'GoogleAdsApiError'
    this.status = options.status
    this.googleStatus = options.googleStatus
    this.googleCode = options.googleCode
    this.requestId = options.requestId
    this.details = options.details
    this.rawBody = options.rawBody
  }
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

export function normalizeCustomerId(customerId?: string | null) {
  return String(customerId || '').replace(/\D/g, '')
}

export function resolveGoogleAdsDateRange(datePreset = 'last_30d'): GoogleAdsDateRange {
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

export async function resolveGoogleAdsAuth(userId: string, providerSettings?: ProviderSettings | null) {
  const settings = normalizeProviderSettings(providerSettings)
  const developerToken = settings.googleAds?.developerToken?.trim()
  if (!developerToken) {
    throw new Error('Google Ads developer token is not configured. Add it in Settings.')
  }

  const oauthRecord = await getGoogleOAuthTokenForUser(userId)
  if (!oauthRecord?.accessToken) {
    throw new Error('Google is not connected. Connect Google in Settings.')
  }
  if (!String(oauthRecord.scope || '').includes('https://www.googleapis.com/auth/adwords')) {
    throw new Error('Google is connected without the Google Ads scope. Reconnect Google in Settings.')
  }

  const accessToken = await getGoogleAccessTokenForUser(userId)
  if (!accessToken) throw new Error('Google connection expired. Reconnect Google in Settings.')

  return {
    accessToken,
    developerToken,
    managerCustomerId: normalizeCustomerId(settings.googleAds?.managerCustomerId),
    defaultCustomerId: normalizeCustomerId(settings.googleAds?.defaultCustomerId),
    primaryMarket: settings.googleAds?.primaryMarket || 'JO',
  }
}

function googleAdsHeaders(input: {
  accessToken: string
  developerToken: string
  managerCustomerId?: string | null
  includeLoginCustomerId?: boolean
}) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${input.accessToken}`,
    'developer-token': input.developerToken,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
  const managerCustomerId = normalizeCustomerId(input.managerCustomerId)
  if (input.includeLoginCustomerId !== false && managerCustomerId) headers['login-customer-id'] = managerCustomerId
  return headers
}

function extractGoogleAdsErrorCode(errorPayload: any) {
  const detailErrors = Array.isArray(errorPayload?.details)
    ? errorPayload.details.flatMap((detail: any) => Array.isArray(detail?.errors) ? detail.errors : [])
    : []
  for (const detailError of detailErrors) {
    const errorCode = detailError?.errorCode || detailError?.error_code || {}
    const [family, code] = Object.entries(errorCode).find(([, value]) => Boolean(value)) || []
    if (family && code) return `${family}.${String(code)}`
  }
  return errorPayload?.status || ''
}

function googleAdsActionableMessage(payload: any, status: number, rawBody = '') {
  const trimmedBody = rawBody.trim()
  const baseMessage = payload?.message || (
    trimmedBody
      ? `Google Ads API returned HTTP ${status}: ${trimmedBody.slice(0, 500)}`
      : `Google Ads API returned HTTP ${status}. Google did not return a JSON error body, so check that the Google Ads API is enabled in the OAuth project, the developer token is approved for the account type, and the connected Google account has access to at least one Google Ads customer.`
  )
  const code = extractGoogleAdsErrorCode(payload)

  if (code.includes('DEVELOPER_TOKEN_NOT_APPROVED')) {
    return `${baseMessage} Your Google Ads developer token is not approved for this account type yet. Apply for Basic or Standard access in the Google Ads API Center, or use a test account with a test developer token.`
  }
  if (code.includes('DEVELOPER_TOKEN_PROHIBITED') || code.includes('DEVELOPER_TOKEN_INVALID')) {
    return `${baseMessage} The saved Google Ads developer token is invalid or not allowed. Check the token in Settings.`
  }
  if (code.includes('USER_PERMISSION_DENIED')) {
    return `${baseMessage} The connected Google account does not have access to this Google Ads customer, or the Manager Customer ID in Settings is not linked to it.`
  }
  if (code.includes('CUSTOMER_NOT_ENABLED') || code.includes('CUSTOMER_NOT_FOUND')) {
    return `${baseMessage} The selected Google Ads customer is unavailable. Check the account ID and manager access.`
  }
  if (code.includes('ACCESS_TOKEN_SCOPE_INSUFFICIENT') || code.includes('PERMISSION_DENIED')) {
    return `${baseMessage} Reconnect Google in Settings and make sure the Google Ads permission is granted.`
  }

  return baseMessage
}

export function googleAdsErrorResponse(error: unknown) {
  if (error instanceof GoogleAdsApiError) {
    return {
      status: error.status,
      body: {
        error: error.message,
        googleStatus: error.googleStatus,
        googleCode: error.googleCode,
        requestId: error.requestId,
        rawBody: error.rawBody?.slice(0, 500),
      },
    }
  }
  return {
    status: 500,
    body: { error: error instanceof Error ? error.message : 'Google Ads request failed' },
  }
}

export async function googleAdsRequest<T = any>(
  path: string,
  auth: { accessToken: string; developerToken: string; managerCustomerId?: string | null },
  init?: RequestInit & { includeLoginCustomerId?: boolean }
): Promise<T> {
  const { includeLoginCustomerId, ...requestInit } = init || {}
  const response = await fetch(`${GOOGLE_ADS_BASE}${path}`, {
    ...requestInit,
    headers: {
      ...googleAdsHeaders({ ...auth, includeLoginCustomerId }),
      ...(init?.headers || {}),
    },
    cache: 'no-store',
  })
  const rawBody = await response.text().catch(() => '')
  let data: any = null
  try {
    data = rawBody ? JSON.parse(rawBody) : null
  } catch {
    data = null
  }
  if (!response.ok) {
    const googleError = data?.error || {}
    const googleCode = extractGoogleAdsErrorCode(googleError)
    const message = googleAdsActionableMessage(googleError, response.status, rawBody)
    console.warn('[google-ads] API request failed', {
      path,
      status: response.status,
      googleStatus: googleError.status,
      googleCode,
      requestId: response.headers.get('request-id') || response.headers.get('x-request-id'),
      message,
      rawBody: rawBody.slice(0, 500),
    })
    throw new GoogleAdsApiError(message, {
      status: response.status,
      googleStatus: googleError.status,
      googleCode,
      requestId: response.headers.get('request-id') || response.headers.get('x-request-id'),
      details: googleError.details,
      rawBody,
    })
  }
  return data as T
}

export async function googleAdsSearchStream<T = any>(
  customerId: string,
  auth: { accessToken: string; developerToken: string; managerCustomerId?: string | null },
  query: string
): Promise<T[]> {
  const normalizedCustomerId = normalizeCustomerId(customerId)
  if (!normalizedCustomerId) throw new Error('Google Ads customer ID is required.')

  const batches = await googleAdsRequest<any[]>(`/customers/${normalizedCustomerId}/googleAds:searchStream`, auth, {
    method: 'POST',
    body: JSON.stringify({ query }),
  })
  return (Array.isArray(batches) ? batches : []).flatMap((batch) => batch?.results || []) as T[]
}

export async function listAccessibleGoogleAdsCustomers(
  auth: { accessToken: string; developerToken: string; managerCustomerId?: string | null }
) {
  const data = await googleAdsRequest<{ resourceNames?: string[] }>('/customers:listAccessibleCustomers', auth, {
    includeLoginCustomerId: false,
  })
  return (data.resourceNames || [])
    .map((resourceName) => normalizeCustomerId(resourceName))
    .filter(Boolean)
}

export async function describeGoogleAdsCustomer(
  customerId: string,
  auth: { accessToken: string; developerToken: string; managerCustomerId?: string | null }
) {
  const rows = await googleAdsSearchStream<any>(
    customerId,
    auth,
    `
      SELECT
        customer.id,
        customer.descriptive_name,
        customer.currency_code,
        customer.time_zone,
        customer.manager,
        customer.status
      FROM customer
      LIMIT 1
    `
  ).catch(() => [])
  const customer = rows[0]?.customer || {}
  return {
    id: normalizeCustomerId(customer.id || customerId),
    resourceName: `customers/${normalizeCustomerId(customer.id || customerId)}`,
    name: customer.descriptiveName || customer.descriptive_name || `Customer ${customerId}`,
    currencyCode: customer.currencyCode || customer.currency_code || 'USD',
    timeZone: customer.timeZone || customer.time_zone || '',
    manager: Boolean(customer.manager),
    status: customer.status || '',
  }
}

export function microsToCurrency(value: unknown) {
  const parsed = Number.parseFloat(String(value ?? 0))
  return Number.isFinite(parsed) ? parsed / 1_000_000 : 0
}

export function numeric(value: unknown) {
  const parsed = Number.parseFloat(String(value ?? 0))
  return Number.isFinite(parsed) ? parsed : 0
}
