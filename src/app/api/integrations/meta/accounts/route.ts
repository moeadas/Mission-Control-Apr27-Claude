import { NextRequest, NextResponse } from 'next/server'
import { resolveAuthContextFromToken } from '@/lib/auth/server'
import { normalizeProviderSettings } from '@/lib/provider-settings'

function getBearerToken(r: NextRequest) {
  const h = r.headers.get('authorization') || ''
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : null
}

const META_GRAPH = 'https://graph.facebook.com/v20.0'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const settings = normalizeProviderSettings(auth.providerSettings)
    const token = settings.meta?.accessToken
    if (!token) return NextResponse.json({ error: 'Meta access token not configured' }, { status: 400 })

    // Fetch ad accounts accessible to this token
    const res = await fetch(
      `${META_GRAPH}/me/adaccounts?fields=id,name,account_status,currency,timezone_name,business&limit=50&access_token=${token}`
    )
    const data = await res.json()
    if (!res.ok || data.error) {
      return NextResponse.json({ error: data.error?.message || 'Meta API error' }, { status: res.status })
    }

    return NextResponse.json({ accounts: data.data || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch Meta accounts' }, { status: 500 })
  }
}
