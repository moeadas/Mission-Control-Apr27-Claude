import { randomUUID } from 'crypto'
import { mkdir, writeFile } from 'fs/promises'
import { extname, join } from 'path'

import { NextRequest, NextResponse } from 'next/server'

import { resolveAuthContextFromToken, getAuthTokenFromRequest } from '@/lib/auth/server'

const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
  'font/ttf': '.ttf',
  'font/otf': '.otf',
  'font/woff': '.woff',
  'font/woff2': '.woff2',
  'application/pdf': '.pdf',
  'text/plain': '.txt',
  'text/markdown': '.md',
  'text/csv': '.csv',
  'application/json': '.json',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
}

const DOCUMENT_TYPES = new Set(['documents', 'briefs', 'knowledge'])
const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024 // 20MB
const MAX_ASSET_SIZE = 10 * 1024 * 1024    // 10MB
const MAX_TEXT_CHARS = 50_000

function getBearerToken(request: NextRequest) {
  // Batch P.2: cookie OR bearer. Local wrapper kept so call sites don't change.
  return getAuthTokenFromRequest(request)
}

/**
 * Basic PDF text extraction — pulls text from BT...ET blocks without any native library.
 * Good enough for briefs and catalogues; does not handle scanned/image-only PDFs.
 */
function extractTextFromPdf(buffer: Buffer): string {
  try {
    const raw = buffer.toString('latin1')
    const blocks: string[] = []

    // Extract text from BT (Begin Text)…ET (End Text) blocks
    const btEtRegex = /BT([\s\S]*?)ET/g
    let match: RegExpExecArray | null
    while ((match = btEtRegex.exec(raw)) !== null) {
      const block = match[1]
      // Pull string literals: (text) and hex strings <hex>
      const strRegex = /\(([^)\\]*(?:\\.[^)\\]*)*)\)|<([0-9a-fA-F]+)>/g
      let strMatch: RegExpExecArray | null
      while ((strMatch = strRegex.exec(block)) !== null) {
        if (strMatch[1] !== undefined) {
          // Literal string — unescape PDF escape sequences
          const text = strMatch[1]
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/\\t/g, '\t')
            .replace(/\\\(/g, '(')
            .replace(/\\\)/g, ')')
            .replace(/\\\\/g, '\\')
          blocks.push(text)
        } else if (strMatch[2] !== undefined) {
          // Hex string — decode pairs of hex digits to chars
          const hex = strMatch[2]
          let decoded = ''
          for (let i = 0; i < hex.length - 1; i += 2) {
            const code = parseInt(hex.slice(i, i + 2), 16)
            if (code > 31) decoded += String.fromCharCode(code)
          }
          if (decoded.trim()) blocks.push(decoded)
        }
      }
    }

    return blocks.join(' ').replace(/\s+/g, ' ').trim()
  } catch {
    return ''
  }
}

/**
 * Extract readable text from an uploaded document buffer based on mime type / extension.
 */
function extractText(buffer: Buffer, mimeType: string, fileName: string): string {
  const ext = extname(fileName).toLowerCase()

  if (mimeType === 'application/pdf' || ext === '.pdf') {
    return extractTextFromPdf(buffer)
  }

  // Plain text variants — utf-8 safe
  if (
    mimeType.startsWith('text/') ||
    ['.txt', '.md', '.csv', '.json', '.xml', '.html'].includes(ext)
  ) {
    return buffer.toString('utf-8')
  }

  // DOCX: very minimal — pull plain text runs from word/document.xml inside the ZIP
  // We do this without unzip libs by scanning for XML text content
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === '.docx'
  ) {
    try {
      const raw = buffer.toString('latin1')
      // DOCX is a ZIP — find the word/document.xml part by looking for <w:t> tags
      const matches = [...raw.matchAll(/<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/g)]
      return matches.map(m => m[1]).join(' ').replace(/\s+/g, ' ').trim()
    } catch {
      return ''
    }
  }

  return ''
}

export async function POST(request: NextRequest) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await request.formData()
    const file = formData.get('file')
    const clientId = String(formData.get('clientId') || 'client')
    const assetType = String(formData.get('assetType') || 'asset')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const isDocument = DOCUMENT_TYPES.has(assetType)
    const maxSize = isDocument ? MAX_DOCUMENT_SIZE : MAX_ASSET_SIZE

    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Max size is ${maxSize / (1024 * 1024)}MB.` },
        { status: 413 }
      )
    }

    const extension = EXT_BY_TYPE[file.type] || extname(file.name) || '.bin'
    const safeClientId = clientId.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '') || 'client'
    const safeType = assetType.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '') || 'asset'
    const uniquePart = `${Date.now()}-${randomUUID().slice(0, 8)}`
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)
    const fileName = `${uniquePart}-${safeFileName}${safeFileName.includes('.') ? '' : extension}`

    // Organised folder structure: public/uploads/client-assets/[clientId]/[assetType]/
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'client-assets', safeClientId, safeType)
    await mkdir(uploadDir, { recursive: true })

    const destination = join(uploadDir, fileName)
    const bytes = Buffer.from(await file.arrayBuffer())
    await writeFile(destination, bytes)

    const storagePath = `/uploads/client-assets/${safeClientId}/${safeType}/${fileName}`
    const url = `/api/client-assets/file/${encodeURIComponent(fileName)}`

    // For documents: extract text so the AI can use it
    let extractedText: string | undefined
    let extractedPreview: string | undefined

    if (isDocument) {
      const raw = extractText(bytes, file.type, file.name)
      if (raw) {
        extractedText = raw.slice(0, MAX_TEXT_CHARS)
        extractedPreview = extractedText.slice(0, 300).trim()
      }
    }

    return NextResponse.json({
      fileName,
      url,
      path: storagePath,
      contentType: file.type,
      size: file.size,
      ...(isDocument && {
        extractedText,
        extractedPreview,
        textLength: extractedText?.length ?? 0,
      }),
    })
  } catch (error) {
    console.error('Failed to upload client asset:', error)
    return NextResponse.json({ error: 'Failed to upload client asset' }, { status: 500 })
  }
}
