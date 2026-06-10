/**
 * GET /api/agent-photos/file/[filename]
 *
 * Serves an agent's uploaded photo. Auth required: the requester must belong
 * to a tenant that owns an agent referencing this photo. Prevents cross-tenant
 * enumeration of uploaded files.
 */
import { readFile } from 'fs/promises'
import { join, extname, resolve, sep } from 'path'

import { NextRequest, NextResponse } from 'next/server'

import { resolveAuthContextFromToken, getAuthTokenFromRequest } from '@/lib/auth/server'
import { getDb } from '@/lib/db/client'

const CONTENT_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

const UPLOADS_DIR = resolve(join(process.cwd(), 'public', 'uploads', 'agents'))

export const dynamic = 'force-dynamic'

function getBearerToken(request: NextRequest) {
  // Batch P.2: cookie OR bearer. Local wrapper kept so call sites don't change.
  return getAuthTokenFromRequest(request)
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const token = getBearerToken(request)
  const auth = await resolveAuthContextFromToken(token)
  if (!auth || !auth.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { filename } = await params
    const safeName = decodeURIComponent(filename).replace(/[^a-zA-Z0-9._-]/g, '')
    if (!safeName) return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })

    const filePath = join(UPLOADS_DIR, safeName)
    const resolved = resolve(filePath)
    // Defense-in-depth: ensure we never read outside the uploads dir.
    if (!resolved.startsWith(UPLOADS_DIR + sep) && resolved !== UPLOADS_DIR) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
    }

    // Verify this photo belongs to an agent in the caller's tenant.
    const db = getDb()
    const photoUrlNeedle = `%/api/agent-photos/file/${safeName}%`
    const ownerRows = await db`
      SELECT id FROM agents
      WHERE agency_id = ${auth.tenantId}::uuid
        AND photo_url LIKE ${photoUrlNeedle}
      LIMIT 1
    `
    if (!ownerRows[0]) {
      // Either the photo doesn't exist or it belongs to another tenant — same response either way.
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const buffer = await readFile(resolved)
    const type = CONTENT_TYPES[extname(safeName).toLowerCase()] || 'application/octet-stream'

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': type,
        // Private cache: don't share between users via shared proxies.
        'Cache-Control': 'private, max-age=300',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Agent photo not found' }, { status: 404 })
  }
}
