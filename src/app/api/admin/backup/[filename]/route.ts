import { unlink } from 'node:fs/promises'
import path from 'node:path'

import { NextRequest, NextResponse } from 'next/server'
import { resolveAuthContextFromToken, getSuperAdminEmail } from '@/lib/auth/server'

export const dynamic = 'force-dynamic'

const BACKUP_DIR = path.join(process.cwd(), 'backups')

function getBearerToken(r: NextRequest) {
  const h = r.headers.get('authorization') || ''
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : null
}

export async function DELETE(
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
    const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '')
    if (!safeName.endsWith('.tar.gz')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
    }

    await unlink(path.join(BACKUP_DIR, safeName))
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    if ((err as any).code === 'ENOENT') {
      return NextResponse.json({ error: 'Backup not found' }, { status: 404 })
    }
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
