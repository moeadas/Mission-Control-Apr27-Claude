/**
 * GET /api/client-assets/file/[filename]
 *
 * Serves a client-asset file. Auth required, tenant-scoped: the caller must
 * belong to a tenant that owns a client whose brief references this file
 * (either by filename or by URL). Prevents cross-tenant enumeration.
 *
 * Files may live under:
 *   public/uploads/clients/<filename>                (legacy flat layout)
 *   public/uploads/client-assets/<clientId>/<type>/<filename>
 *
 * The route walks both layouts.
 */
import { readFile, stat } from 'fs/promises'
import { extname, join, resolve, sep } from 'path'

import { NextRequest, NextResponse } from 'next/server'

import { resolveAuthContextFromToken, getAuthTokenFromRequest } from '@/lib/auth/server'
import { getDb } from '@/lib/db/client'

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

const LEGACY_CLIENTS_DIR = resolve(join(process.cwd(), 'public', 'uploads', 'clients'))
const NEW_CLIENT_ASSETS_DIR = resolve(join(process.cwd(), 'public', 'uploads', 'client-assets'))

export const dynamic = 'force-dynamic'

function getBearerToken(request: NextRequest) {
  // Batch P.2: cookie OR bearer. Local wrapper kept so call sites don't change.
  return getAuthTokenFromRequest(request)
}

function getQueryToken(request: NextRequest) {
  const t = new URL(request.url).searchParams.get('token')
  return t ? t.trim() : null
}

function isInsideAllowedRoot(absolutePath: string, root: string) {
  const cleanRoot = root.endsWith(sep) ? root : root + sep
  return absolutePath === root || absolutePath.startsWith(cleanRoot)
}

/**
 * Look up whether this filename is referenced by a client owned by the caller's tenant.
 * Checks both the legacy flat layout and the per-client subdir layout via LIKE match
 * on the client's brief/metadata JSONB serialized form.
 */
async function isTenantAuthorizedForFile(tenantId: string, safeName: string): Promise<boolean> {
  const db = getDb()
  const filenamePattern = `%${safeName}%`
  const rows = await db`
    SELECT 1
    FROM clients
    WHERE agency_id = ${tenantId}::uuid
      AND (
        brief::text LIKE ${filenamePattern}
        OR metadata::text LIKE ${filenamePattern}
        OR knowledge_summary LIKE ${filenamePattern}
      )
    LIMIT 1
  `
  return rows.length > 0
}

async function tryReadFromRoot(root: string, safeName: string) {
  const filePath = join(root, safeName)
  const resolved = resolve(filePath)
  if (!isInsideAllowedRoot(resolved, root)) return null
  try {
    const s = await stat(resolved)
    if (!s.isFile()) return null
    return await readFile(resolved)
  } catch {
    return null
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const token = getBearerToken(request) || getQueryToken(request)
  const auth = await resolveAuthContextFromToken(token)
  if (!auth || !auth.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { filename } = await params
    const safeName = decodeURIComponent(filename).replace(/[^a-zA-Z0-9._-]/g, '')
    if (!safeName) return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })

    // Verify the caller's tenant has at least one client that references this filename.
    const authorized = await isTenantAuthorizedForFile(auth.tenantId, safeName)
    if (!authorized) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Try legacy location first, then the per-client subdir layout. We walk the
    // subdir tree only one level deep because we don't have the clientId here.
    let buffer = await tryReadFromRoot(LEGACY_CLIENTS_DIR, safeName)

    if (!buffer) {
      // Search the per-client subdir tree for the file under NEW_CLIENT_ASSETS_DIR.
      try {
        const { readdir } = await import('fs/promises')
        const clientDirs = await readdir(NEW_CLIENT_ASSETS_DIR).catch(() => [] as string[])
        outer: for (const clientId of clientDirs) {
          const typeDirs = await readdir(join(NEW_CLIENT_ASSETS_DIR, clientId)).catch(() => [] as string[])
          for (const type of typeDirs) {
            const candidate = await tryReadFromRoot(
              resolve(join(NEW_CLIENT_ASSETS_DIR, clientId, type)),
              safeName
            )
            if (candidate) {
              buffer = candidate
              break outer
            }
          }
        }
      } catch {
        // ignore — fall through to 404 below
      }
    }

    if (!buffer) {
      return NextResponse.json({ error: 'Client asset not found' }, { status: 404 })
    }

    const type = CONTENT_TYPES[extname(safeName).toLowerCase()] || 'application/octet-stream'
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': type,
        // Private cache: per-user only.
        'Cache-Control': 'private, max-age=300',
        // SVG can contain scripts — set strict CSP to prevent inline execution.
        ...(extname(safeName).toLowerCase() === '.svg'
          ? { 'Content-Security-Policy': "script-src 'none'; object-src 'none'" }
          : {}),
      },
    })
  } catch {
    return NextResponse.json({ error: 'Client asset not found' }, { status: 404 })
  }
}
