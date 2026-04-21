import { NextRequest, NextResponse } from 'next/server'

import { normalizeAgentPhotoUrl, setAgentPhoto, syncAgentPhotoToDatabase } from '@/lib/server/agent-photos'
import { resolveAuthContextFromToken } from '@/lib/supabase/auth'

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || ''
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null
  return authHeader.slice(7).trim()
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const photoUrl = typeof body.photoUrl === 'string' && body.photoUrl.trim()
      ? normalizeAgentPhotoUrl(body.photoUrl.trim())
      : undefined

    await setAgentPhoto(id, photoUrl)
    await syncAgentPhotoToDatabase(id, photoUrl)

    return NextResponse.json({ success: true, photoUrl: photoUrl || null })
  } catch (error) {
    console.error('Failed to save agent photo reference:', error)
    return NextResponse.json({ error: 'Failed to save agent photo reference' }, { status: 500 })
  }
}
