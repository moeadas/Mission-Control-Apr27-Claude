import { randomUUID } from 'crypto'
import { mkdir, writeFile } from 'fs/promises'
import { extname, join } from 'path'

import { NextRequest, NextResponse } from 'next/server'

import { resolveAuthContextFromToken } from '@/lib/supabase/auth'

const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
  'font/ttf': '.ttf',
  'font/otf': '.otf',
  'font/woff': '.woff',
  'font/woff2': '.woff2',
  'application/pdf': '.pdf',
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
    const clientId = String(formData.get('clientId') || 'client')
    const assetType = String(formData.get('assetType') || 'asset')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const extension = EXT_BY_TYPE[file.type] || extname(file.name) || '.bin'
    const safeClientId = clientId.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '') || 'client'
    const safeType = assetType.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '') || 'asset'
    const fileName = `${safeClientId}-${safeType}-${Date.now()}-${randomUUID().slice(0, 8)}${extension}`
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'clients')
    await mkdir(uploadDir, { recursive: true })

    const destination = join(uploadDir, fileName)
    const bytes = Buffer.from(await file.arrayBuffer())
    await writeFile(destination, bytes)

    return NextResponse.json({
      fileName,
      url: `/api/client-assets/file/${fileName}`,
      path: destination,
      contentType: file.type,
    })
  } catch (error) {
    console.error('Failed to upload client asset:', error)
    return NextResponse.json({ error: 'Failed to upload client asset' }, { status: 500 })
  }
}
