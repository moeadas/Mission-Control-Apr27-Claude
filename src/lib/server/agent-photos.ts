import { mkdir, readFile, writeFile } from 'fs/promises'
import { basename, join } from 'path'
import { getSupabaseServerClient } from '@/lib/supabase/server'

const DATA_DIR = join(process.cwd(), 'data')
const UPLOADS_DIR = join(process.cwd(), 'public', 'uploads', 'agents')
const PHOTO_MAP_PATH = join(DATA_DIR, 'agent-photos.json')

export type AgentPhotoMap = Record<string, string>

export function buildAgentPhotoUrl(fileName: string) {
  return `/api/agent-photos/file/${encodeURIComponent(fileName)}`
}

export function normalizeAgentPhotoUrl(photoUrl?: string | null) {
  if (!photoUrl) return undefined
  if (photoUrl.startsWith('/api/agent-photos/file/')) return photoUrl
  if (photoUrl.startsWith('/uploads/agents/')) {
    const fileName = basename(photoUrl)
    return buildAgentPhotoUrl(fileName)
  }
  return photoUrl
}

async function ensurePaths() {
  await mkdir(DATA_DIR, { recursive: true })
  await mkdir(UPLOADS_DIR, { recursive: true })
}

export async function readAgentPhotoMap(): Promise<AgentPhotoMap> {
  await ensurePaths()

  try {
    const raw = await readFile(PHOTO_MAP_PATH, 'utf-8')
    const parsed = JSON.parse(raw)
    if (typeof parsed === 'object' && parsed) {
      const normalized = Object.fromEntries(
        Object.entries(parsed).map(([agentId, photoUrl]) => [agentId, normalizeAgentPhotoUrl(String(photoUrl)) || ''])
      )
      return normalized as AgentPhotoMap
    }
    return {}
  } catch {
    return {}
  }
}

export async function writeAgentPhotoMap(photoMap: AgentPhotoMap) {
  await ensurePaths()
  await writeFile(PHOTO_MAP_PATH, JSON.stringify(photoMap, null, 2), 'utf-8')
}

export async function setAgentPhoto(agentId: string, photoUrl?: string) {
  const current = await readAgentPhotoMap()
  const normalizedPhotoUrl = normalizeAgentPhotoUrl(photoUrl)

  if (!normalizedPhotoUrl) {
    delete current[agentId]
  } else {
    current[agentId] = normalizedPhotoUrl
  }

  await writeAgentPhotoMap(current)
  return current
}

export async function getUploadsDir() {
  await ensurePaths()
  return UPLOADS_DIR
}

export async function syncAgentPhotoToDatabase(agentId: string, photoUrl?: string) {
  const supabase = getSupabaseServerClient()
  if (!supabase) return

  try {
    await supabase
      .from('agents')
      .update({ photo_url: photoUrl || null })
      .eq('id', agentId)
  } catch (error) {
    console.error('Failed to sync agent photo to database:', error)
  }
}
