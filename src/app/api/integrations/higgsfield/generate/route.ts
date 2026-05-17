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
 * POST /api/integrations/higgsfield/generate
 * Body: {
 *   prompt: string
 *   model?: string           — default: "higgsfield-1"
 *   aspectRatio?: string     — "16:9" | "9:16" | "1:1" (default: "16:9")
 *   duration?: number        — seconds (default: 5)
 *   referenceImageUrl?: string
 *   clientId?: string        — used to inject brand context
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const settings = normalizeProviderSettings(auth.providerSettings)
    const apiKey = settings.higgsfield?.apiKey
    if (!apiKey) return NextResponse.json({ error: 'Higgsfield API key not configured' }, { status: 400 })

    const body = await request.json()
    const {
      prompt,
      model = 'higgsfield-1',
      aspectRatio = '16:9',
      duration = 5,
      referenceImageUrl,
    } = body

    if (!prompt?.trim()) return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })

    const payload: Record<string, any> = {
      prompt: prompt.trim(),
      model,
      aspect_ratio: aspectRatio,
      duration,
    }
    if (referenceImageUrl) payload.reference_image_url = referenceImageUrl

    const res = await fetch(`${HIGGSFIELD_API}/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    })

    const data = await res.json()
    if (!res.ok) {
      return NextResponse.json({ error: data.error || data.message || 'Higgsfield API error' }, { status: res.status })
    }

    return NextResponse.json({
      ok: true,
      jobId: data.id || data.job_id,
      status: data.status || 'queued',
      estimatedSeconds: data.estimated_seconds,
      ...data,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Video generation failed' }, { status: 500 })
  }
}
