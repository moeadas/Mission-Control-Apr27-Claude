/**
 * office-presence.ts — agent presence + furniture-aware movement logic.
 *
 * Pure functions, no React. Takes the current office layout, the live agent
 * roster, and the in-flight missions, and returns one AgentPresence per agent
 * describing where they are right now, where they're heading, and what they're
 * doing. The rendering layer tweens between waypoints but never decides them.
 */

import {
  OFFICE_ASSETS,
  resolveUse,
  type AssetUseKind,
  type OfficeFurnitureAsset,
} from '@/lib/office-assets'
import { buildWalkGrid, findPath, nearestWalkableTile, type GridPoint, type GridTile, type WalkGrid } from '@/lib/office-pathfinding'
import { useSpots, type OfficeFacing, type OfficeLayout, type PlacedTile } from '@/lib/office-types'

// ─── Tunables ─────────────────────────────────────────────────────────────
export const ROAM_INTERVAL_MS = 8000
export const WALK_MS = 1400
export const PRESENCE_TICK_MS = 600

// ─── Public types ─────────────────────────────────────────────────────────
export type AgentStatus = 'working' | 'idle' | 'walking' | 'offline'
export type AgentPose = 'idle' | 'walking' | 'sitting' | 'performing' | 'celebrating'
export type AgentFacing = OfficeFacing
export type OfficeActivityKind =
  | 'work'
  | 'coffee'
  | 'recharge'
  | 'sync'
  | 'lounge'
  | 'systems'
  | 'focus'
  | 'roam'

export interface AgentActivity {
  kind: OfficeActivityKind
  label: string
  targetTileId?: string
}

export interface AgentPresence {
  agentId: string
  agentName: string
  avatar?: string
  photoUrl?: string
  x: number
  y: number
  targetX: number
  targetY: number
  status: AgentStatus
  deskTileId?: string
  activeMissionId?: string
  message?: string
  color: string
  initial: string
  departmentId?: string
  departmentColor?: string
  activity?: AgentActivity
  /** Path waypoints in grid-center coordinates. */
  path?: Array<{ x: number; y: number }>
  facing: AgentFacing
  pose: AgentPose
  progress?: number
}

interface MissionSnapshot {
  id: string
  status: string
  title?: string | null
  summary?: string | null
  deliverableType?: string | null
  leadAgentId?: string | null
  collaboratorAgentIds?: string[] | null
  liveMessage?: string | null
}

interface AgentSnapshot {
  id: string
  name: string
  avatar?: string | null
  photoUrl?: string | null
  role?: string | null
  specialty?: string | null
  division?: string | null
  color?: string | null
  accentColor?: string | null
  metadata?: any
}

interface RoamState {
  targetX: number
  targetY: number
  nextChangeAt: number
  activity: AgentActivity
  path: Array<{ x: number; y: number }>
  facing: AgentFacing
  pose: AgentPose
  spotKey?: string
}

interface ActivityCandidate {
  tile: PlacedTile
  target: GridPoint
  goalTile: GridTile
  spotKey: string
  useKind: AssetUseKind
  facing: AgentFacing
  pose: AgentPose
  activity: AgentActivity
}

const roamCache = new Map<string, RoamState>()
const assetMap = new Map<string, OfficeFurnitureAsset>(OFFICE_ASSETS.map((asset) => [asset.id, asset]))

const DEFAULT_AGENT_COLORS = [
  '#60a5fa', '#34d399', '#fbbf24', '#f472b6', '#a78bfa',
  '#fb7185', '#22d3ee', '#facc15', '#4ade80', '#c084fc',
]

function defaultAgentColor(agentId: string): string {
  let hash = 0
  for (let i = 0; i < agentId.length; i += 1) hash = (hash * 31 + agentId.charCodeAt(i)) & 0xffff
  return DEFAULT_AGENT_COLORS[hash % DEFAULT_AGENT_COLORS.length]
}

function findAssignedDesk(layout: OfficeLayout, agentId: string): PlacedTile | null {
  return layout.tiles.find((tile) => tile.assignedAgentId === agentId && assetMap.get(tile.assetId)?.category === 'desks') || null
}

function fallbackWorkTile(layout: OfficeLayout, agentId: string, openTiles: GridTile[]): GridTile {
  if (!openTiles.length) return { x: Math.floor(layout.gridWidth / 2), y: Math.floor(layout.gridHeight / 2) }
  let hash = 0
  for (let i = 0; i < agentId.length; i += 1) hash = (hash * 17 + agentId.charCodeAt(i)) & 0xffff
  return openTiles[hash % openTiles.length]
}

function tileCenter(tile: GridTile): GridPoint {
  return { x: tile.x + 0.5, y: tile.y + 0.5 }
}

function spotKey(tileId: string, target: GridPoint): string {
  return `${tileId}:${target.x.toFixed(2)}:${target.y.toFixed(2)}`
}

function reservedSpotKeys(now: number): Set<string> {
  const keys = new Set<string>()
  for (const state of roamCache.values()) {
    if (state.nextChangeAt < now && state.activity.kind !== 'work') continue
    if (state.spotKey) keys.add(state.spotKey)
  }
  return keys
}

function activityForAsset(tile: PlacedTile, asset: OfficeFurnitureAsset, useKind: AssetUseKind): AgentActivity | null {
  const id = asset.id.toLowerCase()
  const name = asset.name.toLowerCase()

  if (asset.category === 'kitchen' || id.includes('coffee') || name.includes('coffee')) {
    return { kind: 'coffee', label: 'Drinking tea', targetTileId: tile.id }
  }
  if (asset.category === 'wellness' || id.includes('plant') || id.includes('beanbag') || id.includes('yoga')) {
    return { kind: 'recharge', label: id.includes('plant') ? 'Watering plants' : 'Taking a breather', targetTileId: tile.id }
  }
  if (asset.category === 'tables' || id.includes('meeting') || id.includes('huddle')) {
    return { kind: 'sync', label: 'Chatting strategy', targetTileId: tile.id }
  }
  if (asset.category === 'seating' || useKind === 'lounge' || useKind === 'sit') {
    return { kind: 'lounge', label: 'Calling friends', targetTileId: tile.id }
  }
  if (asset.category === 'it' || id.includes('printer') || id.includes('server') || id.includes('switch')) {
    return { kind: 'systems', label: 'Replying to messages', targetTileId: tile.id }
  }
  if (asset.category === 'decor' || id.includes('window') || id.includes('art')) {
    return { kind: 'focus', label: 'Daydreaming', targetTileId: tile.id }
  }
  return null
}

function poseForUse(kind: AssetUseKind, activity: AgentActivity): AgentPose {
  if (kind === 'sit' || kind === 'lounge' || activity.kind === 'coffee' || activity.kind === 'lounge') return 'sitting'
  if (activity.kind === 'recharge' || activity.kind === 'systems' || activity.kind === 'sync') return 'performing'
  return 'idle'
}

function routeToCandidate(grid: WalkGrid, from: GridPoint, candidate: ActivityCandidate): Array<{ x: number; y: number }> | null {
  const start = nearestWalkableTile(grid, from)
  if (!start) return null
  const route = findPath(grid, start, candidate.goalTile)
  if (!route) return null
  if (candidate.useKind === 'sit' || candidate.useKind === 'lounge') {
    const last = route[route.length - 1]
    if (!last || Math.hypot(last.x - candidate.target.x, last.y - candidate.target.y) > 0.05) {
      return [...route, candidate.target]
    }
  }
  return route
}

function buildActivityCandidates(layout: OfficeLayout, grid: WalkGrid, reserved: Set<string>): ActivityCandidate[] {
  const candidates: ActivityCandidate[] = []
  for (const tile of layout.tiles) {
    const asset = assetMap.get(tile.assetId)
    if (!asset) continue
    const usage = resolveUse(asset)
    if (!usage) continue
    const activityBase = activityForAsset(tile, asset, usage.kind)
    if (!activityBase) continue

    for (const spot of useSpots(tile, asset)) {
      const target = { x: spot.x, y: spot.y }
      const key = spotKey(tile.id, target)
      if (reserved.has(key)) continue
      const goalTile = spot.kind === 'stand'
        ? { x: spot.tileX, y: spot.tileY }
        : nearestWalkableTile(grid, target, 4)
      if (!goalTile || !grid.isWalkable(goalTile.x, goalTile.y)) continue
      candidates.push({
        tile,
        target,
        goalTile,
        spotKey: key,
        useKind: spot.kind,
        facing: spot.facing,
        pose: poseForUse(spot.kind, activityBase),
        activity: activityBase,
      })
    }
  }
  return candidates
}

function chooseActivityCandidate(
  agentId: string,
  layout: OfficeLayout,
  grid: WalkGrid,
  reserved: Set<string>,
  from: GridPoint,
  anchor?: GridTile,
): { candidate: ActivityCandidate; path: Array<{ x: number; y: number }> } | null {
  const candidates = buildActivityCandidates(layout, grid, reserved)
  if (!candidates.length) return null

  const anchored = anchor
    ? candidates.filter((candidate) => Math.abs(candidate.goalTile.x - anchor.x) + Math.abs(candidate.goalTile.y - anchor.y) <= 8)
    : []
  const pool = (anchored.length ? anchored : candidates)
    .map((candidate) => ({ candidate, path: routeToCandidate(grid, from, candidate) }))
    .filter((entry): entry is { candidate: ActivityCandidate; path: Array<{ x: number; y: number }> } => Boolean(entry.path?.length))

  if (!pool.length) return null
  let hash = 0
  for (let i = 0; i < agentId.length; i += 1) hash = (hash * 23 + agentId.charCodeAt(i)) & 0xffff
  const offset = Math.floor(Date.now() / ROAM_INTERVAL_MS)
  return pool[(hash + offset) % pool.length]
}

function chooseRoamTarget(agentId: string, openTiles: GridTile[], anchor?: GridTile): GridTile {
  if (!openTiles.length) return { x: 0, y: 0 }
  const nearby = anchor
    ? openTiles.filter((tile) => Math.abs(tile.x - anchor.x) + Math.abs(tile.y - anchor.y) <= 5)
    : []
  const pool = nearby.length > 0 ? nearby : openTiles
  let hash = 0
  for (let i = 0; i < agentId.length; i += 1) hash = (hash * 19 + agentId.charCodeAt(i)) & 0xffff
  const offset = Math.floor(Date.now() / ROAM_INTERVAL_MS)
  return pool[(hash + offset) % pool.length]
}

function routeToTile(grid: WalkGrid, from: GridPoint, target: GridTile): Array<{ x: number; y: number }> {
  const start = nearestWalkableTile(grid, from)
  if (!start || !grid.isWalkable(target.x, target.y)) return [tileCenter(target)]
  return findPath(grid, start, target) || [tileCenter(start)]
}

function workLabelForMission(agent: AgentSnapshot, mission: MissionSnapshot): string {
  const haystack = [
    mission.deliverableType,
    mission.title,
    mission.summary,
    agent.role,
    agent.specialty,
    agent.division,
  ].filter(Boolean).join(' ').toLowerCase()

  if (/\b(blog|article|copy|content|caption|calendar|email|script|website)\b/.test(haystack)) {
    if (agent.specialty === 'strategy' || agent.specialty === 'brand') return 'Studying audience'
    if (agent.specialty === 'research') return 'Researching'
    if (agent.specialty === 'data-analytics' || agent.specialty === 'seo') return 'Analyzing data'
    if (agent.specialty === 'media-planning' || agent.specialty === 'performance') return 'Planning distribution'
    if (agent.specialty === 'creative' || agent.specialty === 'design' || agent.specialty === 'ux-design') return 'Shaping creative'
    return 'Drafting content'
  }
  if (/\b(seo|audit|analytics|analysis|kpi|forecast|report|data)\b/.test(haystack)) return 'Analyzing data'
  if (/\b(research|brief|market|competitor|insight)\b/.test(haystack)) return 'Researching'
  if (/\b(strategy|campaign|plan|media|ads|performance)\b/.test(haystack)) {
    return agent.specialty === 'media-planning' || agent.specialty === 'performance' ? 'Optimizing campaigns' : 'Planning strategy'
  }
  if (/\b(creative|design|brand|ui|ux|visual)\b/.test(haystack)) return 'Shaping creative'
  if (/\b(client|onboard|profile)\b/.test(haystack)) return 'Reading client context'

  switch (agent.specialty) {
    case 'copy':
    case 'content-production':
      return 'Drafting content'
    case 'research':
      return 'Researching'
    case 'data-analytics':
    case 'seo':
      return 'Analyzing data'
    case 'strategy':
    case 'brand':
      return 'Studying audience'
    case 'media-planning':
    case 'performance':
      return 'Optimizing campaigns'
    case 'creative':
    case 'design':
    case 'ux-design':
      return 'Shaping creative'
    case 'client-services':
    case 'client':
      return 'Reading client context'
    default:
      return 'Working on the task'
  }
}

function progressForMission(missionId: string, now: number): number {
  let hash = 0
  for (let i = 0; i < missionId.length; i += 1) hash = (hash * 31 + missionId.charCodeAt(i)) & 0xffff
  return (((Math.floor(now / 1200) + hash) % 100) + 1) / 100
}

function facingFromPath(path: Array<{ x: number; y: number }>, fallback: AgentFacing = 'right'): AgentFacing {
  if (path.length < 2) return fallback
  const a = path[path.length - 2]
  const b = path[path.length - 1]
  const dx = b.x - a.x
  const dy = b.y - a.y
  if (Math.abs(dx) > Math.abs(dy)) return dx >= 0 ? 'right' : 'left'
  if (Math.abs(dy) > 0.05) return dy >= 0 ? 'down' : 'up'
  return fallback
}

export function computeAgentPresence(input: {
  layout: OfficeLayout
  agents: AgentSnapshot[]
  missions: MissionSnapshot[]
  now?: number
}): AgentPresence[] {
  const now = input.now ?? Date.now()
  const grid = buildWalkGrid(input.layout)

  const activeMissionByAgent = new Map<string, MissionSnapshot>()
  for (const mission of input.missions) {
    if (mission.status !== 'in_progress') continue
    if (mission.leadAgentId) activeMissionByAgent.set(mission.leadAgentId, mission)
    for (const collaboratorId of mission.collaboratorAgentIds || []) {
      if (!activeMissionByAgent.has(collaboratorId)) activeMissionByAgent.set(collaboratorId, mission)
    }
  }

  const departmentByAgent = new Map<string, { id: string; color: string; anchor?: GridTile }>()
  for (const dept of input.layout.org?.departments || []) {
    for (const agentId of dept.agentIds) {
      departmentByAgent.set(agentId, { id: dept.id, color: dept.color, anchor: dept.anchorTile })
    }
  }

  const reserved = reservedSpotKeys(now)
  const result: AgentPresence[] = []

  for (const agent of input.agents) {
    const dept = departmentByAgent.get(agent.id)
    const activeMission = activeMissionByAgent.get(agent.id)
    const color = agent.color || defaultAgentColor(agent.id)
    const initial = (agent.name || agent.id).slice(0, 1).toUpperCase()
    const previous = roamCache.get(agent.id)
    const from = previous ? { x: previous.targetX, y: previous.targetY } : tileCenter(fallbackWorkTile(input.layout, agent.id, grid.openTiles))

    let targetX = from.x
    let targetY = from.y
    let status: AgentStatus = 'idle'
    let deskTileId: string | undefined
    let activity: AgentActivity | undefined
    let path: Array<{ x: number; y: number }> = []
    let facing: AgentFacing = previous?.facing || 'right'
    let pose: AgentPose = 'idle'
    let progress: number | undefined
    let spotReservation: string | undefined

    if (activeMission) {
      const desk = findAssignedDesk(input.layout, agent.id)
      const deskAsset = desk ? assetMap.get(desk.assetId) : undefined
      const label = workLabelForMission(agent, activeMission)
      activity = { kind: 'work', label, targetTileId: desk?.id }
      status = 'working'
      pose = 'sitting'
      progress = progressForMission(activeMission.id, now)
      deskTileId = desk?.id

      let workRoute: Array<{ x: number; y: number }> | null = null
      if (desk && deskAsset) {
        const candidates = useSpots(desk, deskAsset)
          .filter((spot) => spot.kind === 'stand')
          .map((spot) => ({
            tile: desk,
            target: { x: spot.x, y: spot.y },
            goalTile: { x: spot.tileX, y: spot.tileY },
            spotKey: spotKey(desk.id, { x: spot.x, y: spot.y }),
            useKind: spot.kind,
            facing: spot.facing,
            pose: 'sitting' as AgentPose,
            activity: { ...activity!, targetTileId: desk.id },
          }))
          .filter((candidate) => grid.isWalkable(candidate.goalTile.x, candidate.goalTile.y))

        for (const candidate of candidates) {
          workRoute = routeToCandidate(grid, from, candidate)
          if (workRoute) {
            targetX = candidate.target.x
            targetY = candidate.target.y
            facing = candidate.facing
            spotReservation = candidate.spotKey
            break
          }
        }
      }

      if (!workRoute) {
        const fallback = fallbackWorkTile(input.layout, agent.id, grid.openTiles)
        targetX = fallback.x + 0.5
        targetY = fallback.y + 0.5
        workRoute = routeToTile(grid, from, fallback)
        facing = facingFromPath(workRoute, facing)
      }

      path = workRoute
      roamCache.set(agent.id, {
        targetX,
        targetY,
        nextChangeAt: now + ROAM_INTERVAL_MS,
        activity,
        path,
        facing,
        pose,
        spotKey: spotReservation,
      })
      if (spotReservation) reserved.add(spotReservation)
    } else {
      let roam = previous
      if (!roam || now >= roam.nextChangeAt || (roam.spotKey && reserved.has(roam.spotKey) && roam.spotKey !== previous?.spotKey)) {
        if (previous?.spotKey) reserved.delete(previous.spotKey)
        const selected = chooseActivityCandidate(agent.id, input.layout, grid, reserved, from, dept?.anchor)
        if (selected) {
          const { candidate, path: nextPath } = selected
          roam = {
            targetX: candidate.target.x,
            targetY: candidate.target.y,
            activity: candidate.activity,
            path: nextPath,
            facing: candidate.facing,
            pose: candidate.pose,
            spotKey: candidate.spotKey,
            nextChangeAt: now + ROAM_INTERVAL_MS + Math.floor(Math.random() * 5000),
          }
          reserved.add(candidate.spotKey)
        } else {
          const target = chooseRoamTarget(agent.id, grid.openTiles, dept?.anchor)
          const nextPath = routeToTile(grid, from, target)
          roam = {
            targetX: target.x + 0.5,
            targetY: target.y + 0.5,
            activity: { kind: 'roam', label: 'Stretching legs' },
            path: nextPath,
            facing: facingFromPath(nextPath, previous?.facing),
            pose: 'walking',
            nextChangeAt: now + ROAM_INTERVAL_MS + Math.floor(Math.random() * 5000),
          }
        }
        roamCache.set(agent.id, roam)
      }

      targetX = roam.targetX
      targetY = roam.targetY
      activity = roam.activity
      path = roam.path
      facing = roam.facing
      pose = roam.pose
      status = 'idle'
    }

    result.push({
      agentId: agent.id,
      agentName: agent.name,
      avatar: agent.avatar || undefined,
      photoUrl: agent.photoUrl || undefined,
      x: targetX,
      y: targetY,
      targetX,
      targetY,
      status,
      deskTileId,
      activeMissionId: activeMission?.id,
      message: activity?.label,
      color,
      initial,
      departmentId: dept?.id,
      departmentColor: dept?.color,
      activity,
      path,
      facing,
      pose,
      progress,
    })
  }

  return result
}

export function resetPresenceCache(): void {
  roamCache.clear()
}
