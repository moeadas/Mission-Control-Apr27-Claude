import { NextRequest, NextResponse } from 'next/server'

import { resolveAuthContextFromToken, getAuthTokenFromRequest } from '@/lib/auth/server'
import { GA4_PRESETS, getGa4DateRange, getGa4Preset } from '@/lib/ga4-presets'
import { buildGa4RuleInsights, runGa4Dashboard } from '@/lib/server/google-analytics'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const auth = await resolveAuthContextFromToken(getAuthTokenFromRequest(request))
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = new URL(request.url)
    const propertyId = url.searchParams.get('propertyId')
    const presetId = url.searchParams.get('preset') || 'executive_overview'
    const preset = getGa4Preset(presetId)
    const dateRangeId = url.searchParams.get('dateRange') || preset.dateRange.default
    const dateRange = getGa4DateRange(dateRangeId)

    if (!propertyId) return NextResponse.json({ error: 'GA4 property ID is required' }, { status: 400 })

    const widgets = await runGa4Dashboard({
      userId: auth.userId,
      propertyId,
      preset,
      dateRangeId,
    })

    return NextResponse.json({
      propertyId,
      preset,
      presets: GA4_PRESETS.map(({ presetId, label, description, audience, cadence, storyQuestion }) => ({
        presetId,
        label,
        description,
        audience,
        cadence,
        storyQuestion,
      })),
      dateRange,
      widgets,
      insights: buildGa4RuleInsights(widgets),
      freshness: {
        label: dateRange.endDate === 'today' ? 'Recent GA4 data can still be processing' : 'Settled through yesterday',
        generatedAt: new Date().toISOString(),
      },
    })
  } catch (err: any) {
    if (/needs to be reconnected|reconnect google|connection expired|invalid_grant|invalid authentication credentials|expected oauth 2 access token/i.test(err.message || '')) {
      return NextResponse.json(
        { error: err.message || 'Reconnect Google in Settings.', code: 'GOOGLE_ANALYTICS_RECONNECT_REQUIRED' },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: err.message || 'Failed to load GA4 dashboard' }, { status: 500 })
  }
}
