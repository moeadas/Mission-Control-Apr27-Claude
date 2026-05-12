import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'

import { NextRequest, NextResponse } from 'next/server'
import { resolveAuthContextFromToken, getSuperAdminEmail } from '@/lib/auth/server'

export const dynamic = 'force-dynamic'

const BACKUP_DIR = path.join(process.cwd(), 'backups')

function getBearerToken(r: NextRequest) {
  const h = r.headers.get('authorization') || ''
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (auth.email?.toLowerCase() !== getSuperAdminEmail()) {
      return NextResponse.json({ error: 'Super-admin only' }, { status: 403 })
    }

    const { filename } = await params
    // Sanitise — only allow safe filenames
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '')
    if (!safeName.endsWith('.tar.gz')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
    }

    const filePath = path.join(BACKUP_DIR, safeName)
    const s = await stat(filePath).catch(() => null)
    if (!s) return NextResponse.json({ error: 'Backup not found' }, { status: 404 })

    const buffer = await readFile(filePath)
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/gzip',
        'Content-Disposition': `attachment; filename="${safeName}"`,
        'Content-Length': String(buffer.length),
        'Cache-Control': 'no-store',
      },
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
