import { NextRequest, NextResponse } from 'next/server'
import { resolveAuthContextFromToken } from '@/lib/auth/server'
import { normalizeProviderSettings } from '@/lib/provider-settings'

function getBearerToken(r: NextRequest) {
  const h = r.headers.get('authorization') || ''
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : null
}

const HIGGSFIELD_API = (process.env.HIGGSFIELD_BASE_URL || 'https://api.higgsfield.ai/v1').replace(/\/+$/, '')

export const dynamic = 'force-dynamic'

/**
 * GET /api/integrations/higgsfield/status?jobId=<id>
 * Poll generation status. Returns { status, videoUrl, thumbnailUrl, progress } when done.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const settings = normalizeProviderSettings(auth.providerSettings)
    const apiKey = settings.higgsfield?.apiKey
    if (!apiKey) return NextResponse.json({ error: 'Higgsfield API key not configured' }, { status: 400 })

    const jobId = new URL(request.url).searchParams.get('jobId')
    if (!jobId) return NextResponse.json({ error: 'jobId is required' }, { status: 400 })

    const res = await fetch(`${HIGGSFIELD_API}/generations/${jobId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    const data = await res.json()
    if (!res.ok) {
      return NextResponse.json({ error: data.error || data.message || 'Higgsfield API error' }, { status: res.status })
    }

    return NextResponse.json({
      ok: true,
      jobId,
      status: data.status,
      progress: data.progress ?? null,
      videoUrl: data.video_url || data.url || null,
      thumbnailUrl: data.thumbnail_url || null,
      ...data,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to check generation status' }, { status: 500 })
  }
}
