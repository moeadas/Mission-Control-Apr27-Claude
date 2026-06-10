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
import { basename, extname, join, resolve, sep } from 'path'

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

function isInsideAllowedRoot(absolutePath: string, root: string) {
  const cleanRoot = root.endsWith(sep) ? root : root + sep
  return absolutePath === root || absolutePath.startsWith(cleanRoot)
}

function collectStrings(value: unknown, output: string[] = []) {
  if (!value) return output
  if (typeof value === 'string') {
    output.push(value)
    return output
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, output)
    return output
  }
  if (typeof value === 'object') {
    for (const item of Object.values(value as Record<string, unknown>)) collectStrings(item, output)
  }
  return output
}

function pathnameFromAssetReference(reference: string) {
  const trimmed = reference.trim()
  if (!trimmed) return ''
  try {
    const parsed = trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? new URL(trimmed)
      : new URL(trimmed, 'https://mission-control.local')
    return decodeURIComponent(parsed.pathname)
  } catch {
    return decodeURIComponent(trimmed.split(/[?#]/)[0] || '')
  }
}

function pathForAuthorizedReference(reference: string, safeName: string) {
  const pathname = pathnameFromAssetReference(reference)
  if (!pathname || basename(pathname) !== safeName) return null

  if (pathname.startsWith('/uploads/client-assets/')) {
    const relative = pathname.replace(/^\/uploads\/client-assets\/+/, '')
    const resolved = resolve(join(NEW_CLIENT_ASSETS_DIR, relative))
    return isInsideAllowedRoot(resolved, NEW_CLIENT_ASSETS_DIR) ? resolved : null
  }

  if (pathname.startsWith('/uploads/clients/')) {
    const relative = pathname.replace(/^\/uploads\/clients\/+/, '')
    const resolved = resolve(join(LEGACY_CLIENTS_DIR, relative))
    return isInsideAllowedRoot(resolved, LEGACY_CLIENTS_DIR) ? resolved : null
  }

  return null
}

/**
 * Look up exact asset references owned by the caller's tenant. Avoid substring
 * authorization against JSONB because filename fragments can collide across
 * tenants. New uploads store a protected API URL plus a relative static path;
 * older rows may still contain /uploads/client-assets or /uploads/clients URLs.
 */
async function findTenantAuthorizedPaths(tenantId: string, safeName: string): Promise<string[]> {
  const db = getDb()
  const rows = await db`
    SELECT brief, metadata
    FROM clients
    WHERE agency_id = ${tenantId}::uuid
  `
  const paths = new Set<string>()
  for (const row of rows) {
    const references = [
      ...collectStrings(row.brief),
      ...collectStrings(row.metadata),
    ]
    for (const reference of references) {
      const path = pathForAuthorizedReference(reference, safeName)
      if (path) paths.add(path)
    }
  }
  return [...paths]
}

async function tryReadAuthorizedPath(filePath: string) {
  const resolved = resolve(filePath)
  if (!isInsideAllowedRoot(resolved, LEGACY_CLIENTS_DIR) && !isInsideAllowedRoot(resolved, NEW_CLIENT_ASSETS_DIR)) return null
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
  const token = getBearerToken(request)
  const auth = await resolveAuthContextFromToken(token)
  if (!auth || !auth.tenantId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { filename } = await params
    const safeName = decodeURIComponent(filename).replace(/[^a-zA-Z0-9._-]/g, '')
    if (!safeName) return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })

    const authorizedPaths = await findTenantAuthorizedPaths(auth.tenantId, safeName)
    if (!authorizedPaths.length) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    let buffer: Buffer | null = null
    for (const path of authorizedPaths) {
      buffer = await tryReadAuthorizedPath(path)
      if (buffer) break
    }

    if (!buffer) {
      return NextResponse.json({ error: 'Client asset not found' }, { status: 404 })
    }

    const type = CONTENT_TYPES[extname(safeName).toLowerCase()] || 'application/octet-stream'
    return new NextResponse(new Uint8Array(buffer), {
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
