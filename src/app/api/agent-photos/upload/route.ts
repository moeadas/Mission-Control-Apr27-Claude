import { randomUUID } from 'crypto'
import { writeFile } from 'fs/promises'
import { extname } from 'path'

import { NextRequest, NextResponse } from 'next/server'

import { buildAgentPhotoUrl, getUploadsDir, setAgentPhoto, syncAgentPhotoToDatabase } from '@/lib/server/agent-photos'
import { resolveAuthContextFromToken } from '@/lib/supabase/auth'

const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
}

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || ''
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null
  return authHeader.slice(7).trim()
}

export async function POST(request: NextRequest) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file')
    const agentId = String(formData.get('agentId') || 'agent')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image uploads are allowed' }, { status: 400 })
    }

    const extension = EXT_BY_TYPE[file.type] || extname(file.name) || '.png'
    const safeAgentId = agentId.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '') || 'agent'
    const fileName = `${safeAgentId}-${Date.now()}-${randomUUID().slice(0, 8)}${extension}`
    const uploadDir = await getUploadsDir()
    const destination = `${uploadDir}/${fileName}`
    const bytes = Buffer.from(await file.arrayBuffer())

    await writeFile(destination, bytes)

    const photoUrl = buildAgentPhotoUrl(fileName)

    if (safeAgentId) {
      await setAgentPhoto(safeAgentId, photoUrl)
      await syncAgentPhotoToDatabase(safeAgentId, photoUrl)
    }

    return NextResponse.json({
      photoUrl,
      fileName,
    })
  } catch (error) {
    console.error('Failed to upload agent photo:', error)
    return NextResponse.json({ error: 'Failed to upload agent photo' }, { status: 500 })
  }
}
