import { NextRequest, NextResponse } from 'next/server'
import { verifyProvider } from '@/lib/server/ai'
import { resolveAuthContextFromToken } from '@/lib/auth/server'

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || ''
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null
  return authHeader.slice(7).trim()
}

export async function POST(req: NextRequest) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(req))
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    if (body?.provider === 'gemini-image') {
      const { verifyVisualProvider } = await import('@/lib/server/ai')
      const result = await verifyVisualProvider({
        apiKey: body.apiKey,
        model: body.model || 'gemini-3-pro-image-preview',
      })
      return NextResponse.json(result)
    }
    const result = await verifyProvider(body)
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Verification failed.' }, { status: 400 })
  }
}
