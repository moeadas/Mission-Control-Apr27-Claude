import { readFile } from 'fs/promises'
import { extname, join } from 'path'

import { NextRequest, NextResponse } from 'next/server'

const CONTENT_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf',
}

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params
    const safeName = decodeURIComponent(filename).replace(/[^a-zA-Z0-9._-]/g, '')
    const filePath = join(process.cwd(), 'public', 'uploads', 'clients', safeName)
    const buffer = await readFile(filePath)
    const type = CONTENT_TYPES[extname(safeName).toLowerCase()] || 'application/octet-stream'

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': type,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Client asset not found' }, { status: 404 })
  }
}
