import { promises as fs } from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'

import { generateGeminiImage } from '@/lib/server/ai'

const APP_ROOT = process.cwd()
const CLIENT_UPLOADS_DIR = path.join(APP_ROOT, 'public', 'uploads', 'clients')
const GENERATED_UPLOADS_DIR = path.join(APP_ROOT, 'public', 'uploads', 'generated')

function inferMimeType(filePath: string) {
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.png') return 'image/png'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.gif') return 'image/gif'
  return 'image/jpeg'
}

function splitAssetField(value?: string) {
  return (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

/**
 * Resolve an asset reference (URL-style path or absolute) to a real filesystem path.
 *
 * SECURITY: After resolving, every returned path is verified to live INSIDE one of
 * the allowed upload directories. Any path-traversal attempt (e.g. "../../../etc/passwd")
 * returns null. This is critical because asset references can come from client briefs
 * editable by tenant admins — without this check, a tenant admin could read any file
 * the app process can access, including /proc/self/environ which contains JWT_SECRET.
 */
const ALLOWED_UPLOAD_ROOTS = [
  path.resolve(CLIENT_UPLOADS_DIR),
  path.resolve(GENERATED_UPLOADS_DIR),
]

function isPathInsideAllowedRoot(absolutePath: string): boolean {
  const resolved = path.resolve(absolutePath)
  return ALLOWED_UPLOAD_ROOTS.some((root) => {
    const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep
    return resolved === root || resolved.startsWith(rootWithSep)
  })
}

function safeJoin(root: string, relative: string): string | null {
  // Strip any leading slashes / drive letters from the relative portion so
  // path.join doesn't interpret it as absolute.
  const cleaned = relative.replace(/^[/\\]+/, '')
  const joined = path.join(root, cleaned)
  return isPathInsideAllowedRoot(joined) ? joined : null
}

function resolveAssetPath(candidate: string) {
  if (!candidate) return null
  if (candidate.startsWith('http://') || candidate.startsWith('https://')) return null

  // Absolute path candidates: must already live inside an allowed root.
  if (path.isAbsolute(candidate)) {
    return isPathInsideAllowedRoot(candidate) ? candidate : null
  }

  if (candidate.startsWith('/uploads/clients/')) {
    return safeJoin(CLIENT_UPLOADS_DIR, candidate.replace('/uploads/clients/', ''))
  }
  if (candidate.startsWith('/uploads/generated/')) {
    return safeJoin(GENERATED_UPLOADS_DIR, candidate.replace('/uploads/generated/', ''))
  }
  if (candidate.startsWith('/api/client-assets/file/')) {
    const fileName = candidate.split('/').pop()
    return fileName ? safeJoin(CLIENT_UPLOADS_DIR, fileName) : null
  }
  if (candidate.startsWith('public/uploads/clients/')) {
    return safeJoin(CLIENT_UPLOADS_DIR, candidate.replace('public/uploads/clients/', ''))
  }
  if (candidate.startsWith('public/uploads/generated/')) {
    return safeJoin(GENERATED_UPLOADS_DIR, candidate.replace('public/uploads/generated/', ''))
  }
  return null
}

async function loadReferenceImages(fields: string[]) {
  const references: Array<{ mimeType: string; data: string }> = []
  for (const field of fields) {
    const filePath = resolveAssetPath(field)
    if (!filePath) continue
    try {
      const stat = await fs.stat(/* turbopackIgnore: true */ filePath)
      if (!stat.isFile()) continue
      const buffer = await fs.readFile(/* turbopackIgnore: true */ filePath)
      references.push({
        mimeType: inferMimeType(filePath),
        data: buffer.toString('base64'),
      })
      if (references.length >= 4) break
    } catch {
      // Ignore missing/unreadable assets.
    }
  }
  return references
}

export function inferCreativeAspectRatio(request: string): '1:1' | '4:5' | '16:9' | '9:16' {
  const lower = request.toLowerCase()
  if (lower.includes('story') || lower.includes('reel')) return '9:16'
  if (lower.includes('landscape') || lower.includes('hero image') || lower.includes('banner')) return '16:9'
  if (lower.includes('instagram') || lower.includes('facebook')) return '4:5'
  return '1:1'
}

export async function generateBrandedCreativeAsset(input: {
  apiKey: string
  model: string
  prompt: string
  referenceFields: string[]
  title: string
  request: string
}) {
  const references = await loadReferenceImages(input.referenceFields)
  const aspectRatio = inferCreativeAspectRatio(input.request)
  const image = await generateGeminiImage({
    apiKey: input.apiKey,
    model: input.model,
    prompt: input.prompt,
    aspectRatio,
    referenceImages: references,
  })
  if (!image) {
    throw new Error('Image provider did not return image data.')
  }

  const ext = image.mimeType.includes('png') ? 'png' : image.mimeType.includes('webp') ? 'webp' : 'jpg'
  const fileName = `${input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'creative-asset'}-${uuidv4().slice(0, 8)}.${ext}`
  const relativePath = path.join('public', 'uploads', 'generated', fileName)
  const absolutePath = path.join(APP_ROOT, relativePath)

  await fs.mkdir(path.dirname(absolutePath), { recursive: true })
  await fs.writeFile(absolutePath, Buffer.from(image.data, 'base64'))

  return {
    assetUrl: `/uploads/generated/${fileName}`,
    assetPath: relativePath,
    aspectRatio,
    usedReferenceImages: references.length,
  }
}
