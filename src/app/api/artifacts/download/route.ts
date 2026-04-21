import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { resolveAuthContextFromToken } from '@/lib/supabase/auth'

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

  const fileName = request.nextUrl.searchParams.get('fileName')

  if (!fileName || fileName.includes('/') || fileName.includes('\\')) {
    return NextResponse.json({ error: 'A valid fileName is required.' }, { status: 400 })
  }

  try {
    const filePath = path.join(GENERATED_ROOT, fileName)
    const buffer = await readFile(filePath)
    const ext = fileName.split('.').pop() || ''

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': CONTENT_TYPES[ext] || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Artifact download error', error)
    return NextResponse.json({ error: 'Generated file not found.' }, { status: 404 })
  }
}
