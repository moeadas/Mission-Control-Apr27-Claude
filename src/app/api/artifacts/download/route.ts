import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { resolveAuthContextFromToken } from '@/lib/auth/server'

export const runtime = 'nodejs'

const GENERATED_ROOT = path.join(process.cwd(), 'public', 'generated', 'artifacts')

const CONTENT_TYPES: Record<string, string> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  pdf: 'application/pdf',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || ''
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null
  return authHeader.slice(7).trim()
}

export async function GET(request: NextRequest) {
  const auth = await resolveAuthContextFromToken(getBearerToken(request))
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rawFileName = request.nextUrl.searchParams.get('fileName')

  // Reject path traversal and header-injection characters
  if (
    !rawFileName ||
    rawFileName.includes('/') ||
    rawFileName.includes('\\') ||
    /[\r\n\0]/.test(rawFileName)
  ) {
    return NextResponse.json({ error: 'A valid fileName is required.' }, { status: 400 })
  }

  // Strip any remaining characters that could escape the Content-Disposition header
  const safeFileName = rawFileName.replace(/[^\w.\-_ ]/g, '_')
  // RFC 5987 percent-encode for the filename* parameter (handles unicode + special chars safely)
  const encodedFileName = encodeURIComponent(safeFileName)

  try {
    const filePath = path.join(GENERATED_ROOT, safeFileName)
    const buffer = await readFile(filePath)
    const ext = safeFileName.split('.').pop() || ''

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': CONTENT_TYPES[ext] || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${safeFileName}"; filename*=UTF-8''${encodedFileName}`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Artifact download error', error)
    return NextResponse.json({ error: 'Generated file not found.' }, { status: 404 })
  }
}
