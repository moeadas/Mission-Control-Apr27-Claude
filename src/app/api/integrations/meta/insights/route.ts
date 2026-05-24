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
import { getOAuthToken } from '@/lib/server/oauth-tokens'

function getBearerToken(r: NextRequest) {
  // Batch P.2: cookie OR bearer. Local wrapper kept so call sites don't change.
  return getAuthTokenFromRequest(r)
}

const META_GRAPH_VERSION = process.env.META_GRAPH_API_VERSION || 'v20.0'
const META_GRAPH = `https://graph.facebook.com/${META_GRAPH_VERSION}`

export const dynamic = 'force-dynamic'

async function resolveMetaAccessToken(userId: string, settingsToken?: string | null): Promise<string | null> {
  // 1. Stored OAuth token (encrypted at rest).
  const oauth = await getOAuthToken(userId, 'meta')
  if (oauth?.accessToken) return oauth.accessToken
  // 2. Legacy: provider-settings access token from the Settings UI.
  return settingsToken && settingsToken.length > 0 ? settingsToken : null
}

export async function GET(request: NextRequest) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const settings = normalizeProviderSettings(auth.providerSettings)
    const token = await resolveMetaAccessToken(auth.userId, settings.meta?.accessToken)
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

    const adAccount = accountId.startsWith('act_') ? accountId : `act_${accountId}`

    const fields = [
      'campaign_name', 'campaign_id',
      'impressions', 'clicks', 'reach',
      'spend', 'cpm', 'cpc', 'ctr',
      'conversions', 'cost_per_conversion',
      'frequency', 'unique_clicks',
      'actions', 'action_values',
    ].join(',')

    // Token in header (not URL query) so it doesn't end up in access logs.
    const headers = { Authorization: `Bearer ${token}` }
    const qs = new URLSearchParams({ fields, date_preset: datePreset, level, limit: '50' })

    const res = await fetch(`${META_GRAPH}/${adAccount}/insights?${qs.toString()}`, { headers })
    const data = await res.json()
    if (!res.ok || data.error) {
      return NextResponse.json({ error: data.error?.message || 'Meta API error' }, { status: res.status })
    }

    // Account-level summary
    const summaryQs = new URLSearchParams({ fields, date_preset: datePreset, level: 'account' })
    const summaryRes = await fetch(`${META_GRAPH}/${adAccount}/insights?${summaryQs.toString()}`, { headers })
    const summaryData = await summaryRes.json()

    return NextResponse.json({
      insights: data.data || [],
      summary: summaryData.data?.[0] || null,
      paging: data.paging,
      datePreset,
      level,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch insights' }, { status: 500 })
  }
}
