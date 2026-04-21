import { readFile } from 'fs/promises'
import { join, extname } from 'path'

import { NextRequest, NextResponse } from 'next/server'

const CONTENT_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params
    const safeName = decodeURIComponent(filename).replace(/[^a-zA-Z0-9._-]/g, '')
    const filePath = join(process.cwd(), 'public', 'uploads', 'agents', safeName)
    const buffer = await readFile(filePath)
    const type = CONTENT_TYPES[extname(safeName).toLowerCase()] || 'application/octet-stream'

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': type,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Agent photo not found' }, { status: 404 })
  }
}
