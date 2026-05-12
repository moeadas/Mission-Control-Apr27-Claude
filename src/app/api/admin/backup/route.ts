/**
 * GET  /api/admin/backup  — list all backup archives
 * POST /api/admin/backup  — create a new backup (DB dump + uploads zip)
 */
import { mkdir, readdir, stat, writeFile, readFile, readdir as fsReaddir } from 'node:fs/promises'
import path from 'node:path'
import { createGzip } from 'node:zlib'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'

import { NextRequest, NextResponse } from 'next/server'
import { resolveAuthContextFromToken, getSuperAdminEmail } from '@/lib/auth/server'
import { getDb } from '@/lib/db/client'

export const dynamic = 'force-dynamic'

const BACKUP_DIR = path.join(process.cwd(), 'backups')
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads')

// Tables to export (in dependency order)
const TABLES = [
  'users', 'profiles', 'plans', 'agencies', 'subscriptions',
  'agents', 'clients', 'skills', 'pipelines',
  'tasks', 'task_assignments', 'outputs',
  'conversations', 'messages', 'knowledge_assets',
  'mission_control_state', 'scheduled_tasks', 'token_usage',
]

function getBearerToken(r: NextRequest) {
  const h = r.headers.get('authorization') || ''
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : null
}

async function assertSuperAdmin(request: NextRequest) {
  const auth = await resolveAuthContextFromToken(getBearerToken(request))
  if (!auth) throw new Error('Unauthorized')
  const superEmail = getSuperAdminEmail()
  if (auth.email?.toLowerCase() !== superEmail) throw new Error('Super-admin only')
  return auth
}

// ── Walk a directory and collect all file paths ──────────────────────────────
async function walkDir(dir: string, base = dir): Promise<{ rel: string; abs: string }[]> {
  const results: { rel: string; abs: string }[] = []
  let entries: string[]
  try {
    entries = await fsReaddir(dir)
  } catch {
    return results
  }
  for (const entry of entries) {
    const abs = path.join(dir, entry)
    const s = await stat(abs).catch(() => null)
    if (!s) continue
    if (s.isDirectory()) {
      results.push(...await walkDir(abs, base))
    } else {
      results.push({ rel: path.relative(base, abs), abs })
    }
  }
  return results
}

// ── Minimal TAR builder (ustar format) ──────────────────────────────────────
function padEnd(s: string, len: number) { return s.padEnd(len, '\0') }
function pad0(n: number, len: number) { return n.toString(8).padStart(len - 1, '0') + '\0' }

function tarHeader(name: string, size: number, mtime: number): Buffer {
  const h = Buffer.alloc(512, 0)
  const safeName = name.slice(0, 99)
  h.write(safeName, 0, 'utf8')
  h.write(pad0(0o644, 8), 100, 'utf8')   // mode
  h.write(pad0(0, 8), 108, 'utf8')        // uid
  h.write(pad0(0, 8), 116, 'utf8')        // gid
  h.write(pad0(size, 12), 124, 'utf8')    // size
  h.write(pad0(Math.floor(mtime / 1000), 12), 136, 'utf8') // mtime
  h.write(' '.repeat(8), 148, 'utf8')     // checksum placeholder
  h.write('0', 156, 'utf8')              // type: regular
  h.write('ustar  \0', 257, 'utf8')      // magic
  // compute checksum
  let sum = 0
  for (let i = 0; i < 512; i++) sum += h[i]
  h.write(pad0(sum, 8), 148, 'utf8')
  return h
}

async function buildTarGz(files: { name: string; content: Buffer; mtime?: number }[]): Promise<Buffer> {
  const parts: Buffer[] = []
  for (const f of files) {
    const content = f.content
    const mtime = f.mtime ?? Date.now()
    parts.push(tarHeader(f.name, content.length, mtime))
    parts.push(content)
    // Pad to 512-byte boundary
    const rem = content.length % 512
    if (rem > 0) parts.push(Buffer.alloc(512 - rem, 0))
  }
  parts.push(Buffer.alloc(1024, 0)) // EOF

  const raw = Buffer.concat(parts)

  // Gzip
  const chunks: Buffer[] = []
  await pipeline(
    Readable.from(raw),
    createGzip(),
    async function* (source) { for await (const chunk of source) chunks.push(Buffer.from(chunk)) }
  )
  return Buffer.concat(chunks)
}

// ── GET — list backups ───────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    await assertSuperAdmin(request)
    await mkdir(BACKUP_DIR, { recursive: true })
    const entries = await readdir(BACKUP_DIR).catch(() => [] as string[])
    const backups = await Promise.all(
      entries
        .filter(f => f.endsWith('.tar.gz'))
        .map(async (f) => {
          const s = await stat(path.join(BACKUP_DIR, f)).catch(() => null)
          return {
            filename: f,
            size: s?.size ?? 0,
            createdAt: s?.mtime?.toISOString() ?? new Date().toISOString(),
          }
        })
    )
    backups.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    return NextResponse.json({ backups })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: err.message === 'Unauthorized' ? 401 : 403 })
  }
}

// ── POST — create backup ─────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    await assertSuperAdmin(request)
    await mkdir(BACKUP_DIR, { recursive: true })
    const db = getDb()
    const now = new Date()
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const archiveName = `backup-${timestamp}.tar.gz`

    const files: { name: string; content: Buffer; mtime?: number }[] = []

    // 1. Dump each DB table as NDJSON
    const dbDump: Record<string, any[]> = {}
    for (const table of TABLES) {
      try {
        const rows = await db`SELECT * FROM ${db(table)}`
        dbDump[table] = rows as any[]
      } catch {
        dbDump[table] = [] // table may not exist in all migrations
      }
    }
    const dbJson = JSON.stringify(dbDump, null, 2)
    files.push({
      name: 'database/dump.json',
      content: Buffer.from(dbJson, 'utf8'),
      mtime: Date.now(),
    })

    // 2. Metadata file
    const meta = {
      createdAt: now.toISOString(),
      tables: Object.fromEntries(TABLES.map(t => [t, dbDump[t]?.length ?? 0])),
      totalRows: Object.values(dbDump).reduce((s, r) => s + r.length, 0),
      version: process.env.NEXT_PUBLIC_BUILD_ID || 'unknown',
    }
    files.push({
      name: 'metadata.json',
      content: Buffer.from(JSON.stringify(meta, null, 2), 'utf8'),
    })

    // 3. Include uploads directory (file paths as manifest + actual files if small enough)
    const uploadFiles = await walkDir(UPLOADS_DIR)
    const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB per file limit
    let uploadedCount = 0
    for (const { rel, abs } of uploadFiles) {
      const s = await stat(abs).catch(() => null)
      if (!s || s.size > MAX_FILE_SIZE) continue
      const content = await readFile(abs).catch(() => null)
      if (!content) continue
      files.push({ name: `uploads/${rel}`, content, mtime: s.mtime.getTime() })
      uploadedCount++
    }

    // 4. Build archive
    const archive = await buildTarGz(files)
    const dest = path.join(BACKUP_DIR, archiveName)
    await writeFile(dest, archive)

    return NextResponse.json({
      ok: true,
      filename: archiveName,
      size: archive.length,
      tables: meta.tables,
      totalRows: meta.totalRows,
      uploadedFiles: uploadedCount,
      createdAt: now.toISOString(),
    })
  } catch (err: any) {
    console.error('[backup] create failed:', err)
    return NextResponse.json({ error: err.message || 'Backup failed' }, { status: 500 })
  }
}
