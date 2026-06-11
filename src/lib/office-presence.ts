/**
 * office-presence.ts — agent presence + movement logic (Batch W Phase 1)
 *
 * Pure functions, no React. Takes the current office layout, the live agent
 * roster, and the in-flight missions, and returns one AgentPresence per agent
 * describing where they are right now, where they're heading, and what they're
 * doing. The rendering layer (AgentLayer.tsx) is purely cosmetic — it tweens
 * between positions but never decides them.
 *
 * Movement model:
 *   • Working agents (have an active mission) walk to a usable slot next to
 *     their assigned desk and sit/work there.
 *   • Idle agents choose meaningful activity targets from the actual furniture
 *     in the room: coffee breaks, plant recharges, standups, sofa chats, etc.
 *   • Paths are computed on the grid with A* so agents route around furniture
 *     instead of sliding through desks and walls.
 */

import type { OfficeLayout, PlacedTile } from '@/lib/office-types'
import { OFFICE_ASSETS, type OfficeFurnitureAsset } from '@/lib/office-assets'

// ─── Tunables ─────────────────────────────────────────────────────────────
export const ROAM_INTERVAL_MS = 8000        // pick a new wander target every 8s
export const WALK_MS = 1400                  // ms to traverse one tile-distance unit
export const PRESENCE_TICK_MS = 600          // re-compute presence this often

// ─── Public types ─────────────────────────────────────────────────────────
export type AgentStatus = 'working' | 'idle' | 'walking' | 'offline'
export type AgentPose = 'idle' | 'walking' | 'sitting' | 'performing' | 'celebrating'
export type AgentFacing = 'left' | 'right'
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
  /** Current grid position (fractional during interpolation). */
  x: number
  y: number
  /** Target grid position the agent is walking toward. Equal to x,y when stationary. */
  targetX: number
  targetY: number
  status: AgentStatus
  /** ID of the desk tile this agent is anchored to, if any. */
  deskTileId?: string
  /** Active mission this agent is contributing to, if any. */
  activeMissionId?: string
  /** Live narration message ('Echo is drafting copy options…'). */
  message?: string
  /** Color used for the agent's pixel-art token. Falls back to a deterministic
   *  hash of the agent id when the agent has no explicit color. */
  color: string
  /** Single character displayed inside the token (first letter of name). */
  initial: string
  /** Department the agent belongs to (Batch W Phase 2). */
  departmentId?: string
  /** Department color used as a halo ring around the token. */
  departmentColor?: string
  /** Semantic state for the renderer. */
  activity?: AgentActivity
  /** Path waypoints in grid-center coordinates. */
  path?: Array<{ x: number; y: number }>
  /** Which way the agent should face. */
  facing: AgentFacing
  /** Visual pose requested by the presence engine. */
  pose: AgentPose
  /** Optional work progress, 0..1. Cosmetic fallback when the runner has no step progress. */
  progress?: number
}

interface MissionSnapshot {
  id: string
  status: string
  leadAgentId?: string | null
  collaboratorAgentIds?: string[] | null
  liveMessage?: string | null
}

interface AgentSnapshot {
  id: string
  name: string
  color?: string | null
  accentColor?: string | null
  metadata?: any
}

// ─── Internal cache ───────────────────────────────────────────────────────
// Roam targets persist between presence ticks so agents don't reset on every
// render. Keyed by agentId so per-agent decisions are stable.
interface RoamState {
  targetX: number
  targetY: number
  nextChangeAt: number
  activity: AgentActivity
  path: Array<{ x: number; y: number }>
  facing: AgentFacing
}
const roamCache = new Map<string, RoamState>()

// ─── Helpers ──────────────────────────────────────────────────────────────

const assetMap = new Map<string, OfficeFurnitureAsset>(OFFICE_ASSETS.map((a) => [a.id, a]))

interface GridState {
  openTiles: Array<{ x: number; y: number }>
  blocked: Set<string>
}

interface ActivityCandidate {
  tile: PlacedTile
  target: { x: number; y: number }
  activity: AgentActivity
}

/** Tile center in grid coords (0,0 = top-left of the tile, +0.5 puts us in the middle). */
function tileCenter(tile: PlacedTile): { x: number; y: number } {
  const asset = assetMap.get(tile.assetId)
  const [w, h] = asset?.size || [1, 1]
  // For rotated furniture, the bounding box's dimensions stay the same in tile
  // count terms — only the visual orientation flips.
  return { x: tile.x + w / 2, y: tile.y + h / 2 }
}

/** Find the desk tile (if any) where the agent has been assigned. */
function findAssignedDesk(layout: OfficeLayout, agentId: string): PlacedTile | null {
  return layout.tiles.find((t) => t.assignedAgentId === agentId && isDeskCategory(t.assetId)) || null
}

function isDeskCategory(assetId: string): boolean {
  return assetMap.get(assetId)?.category === 'desks'
}

/** A deterministic color palette used to differentiate agent tokens. */
const DEFAULT_AGENT_COLORS = [
  '#60a5fa', '#34d399', '#fbbf24', '#f472b6', '#a78bfa',
  '#fb7185', '#22d3ee', '#facc15', '#4ade80', '#c084fc',
]
function defaultAgentColor(agentId: string): string {
  let hash = 0
  for (let i = 0; i < agentId.length; i++) hash = (hash * 31 + agentId.charCodeAt(i)) & 0xffff
  return DEFAULT_AGENT_COLORS[hash % DEFAULT_AGENT_COLORS.length]
}

/**
 * Build a set of "open" tiles — empty floor squares NOT occupied by furniture
 * and within the office grid. We use this to pick roam targets for idle agents
 * so they don't try to walk into a wall or desk.
 */
function blocksMovement(tile: PlacedTile): boolean {
  const asset = assetMap.get(tile.assetId)
  if (!asset) return true
  if (asset.category === 'floors') return false
  if (asset.placement === 'wall' || asset.placement === 'ceiling') return false
  return true
}

function buildGridState(layout: OfficeLayout): GridState {
  const occupied = new Set<string>()
  for (const tile of layout.tiles) {
    if (!blocksMovement(tile)) continue
    const asset = assetMap.get(tile.assetId)
    const [w, h] = asset?.size || [1, 1]
    for (let dx = 0; dx < w; dx++) {
      for (let dy = 0; dy < h; dy++) {
        occupied.add(`${tile.x + dx}:${tile.y + dy}`)
      }
    }
  }
  const open: Array<{ x: number; y: number }> = []
  for (let y = 1; y < layout.gridHeight - 1; y++) {
    for (let x = 1; x < layout.gridWidth - 1; x++) {
      if (!occupied.has(`${x}:${y}`)) open.push({ x, y })
    }
  }
  return { openTiles: open, blocked: occupied }
}

/**
 * For a given agent, return a "near-desk" tile — used when the agent is working
 * but doesn't have a desk assigned. We pick the first open tile near the
 * center of the office so they at least show up somewhere visible.
 */
function fallbackWorkTile(layout: OfficeLayout, agentId: string, openTiles: Array<{ x: number; y: number }>): { x: number; y: number } {
  if (!openTiles.length) return { x: layout.gridWidth / 2, y: layout.gridHeight / 2 }
  // Deterministic by agent id so the same agent always falls back to the same spot.
  let hash = 0
  for (let i = 0; i < agentId.length; i++) hash = (hash * 17 + agentId.charCodeAt(i)) & 0xffff
  return openTiles[hash % openTiles.length]
}

function tileKey(t: { x: number; y: number }): string {
  return `${t.x}:${t.y}`
}

function isOpen(tile: { x: number; y: number }, layout: OfficeLayout, blocked: Set<string>): boolean {
  if (tile.x <= 0 || tile.y <= 0 || tile.x >= layout.gridWidth - 1 || tile.y >= layout.gridHeight - 1) return false
  return !blocked.has(tileKey(tile))
}

function nearestOpenAroundTile(layout: OfficeLayout, source: PlacedTile, blocked: Set<string>): { x: number; y: number } | null {
  const asset = assetMap.get(source.assetId)
  const [w, h] = asset?.size || [1, 1]
  const candidates: Array<{ x: number; y: number }> = []

  for (let x = source.x; x < source.x + w; x++) {
    candidates.push({ x, y: source.y - 1 }, { x, y: source.y + h })
  }
  for (let y = source.y; y < source.y + h; y++) {
    candidates.push({ x: source.x - 1, y }, { x: source.x + w, y })
  }

  return candidates
    .filter((candidate) => isOpen(candidate, layout, blocked))
    .sort((a, b) => {
      const center = tileCenter(source)
      return Math.hypot(a.x + 0.5 - center.x, a.y + 0.5 - center.y) -
        Math.hypot(b.x + 0.5 - center.x, b.y + 0.5 - center.y)
    })[0] || null
}

function findPath(
  layout: OfficeLayout,
  blocked: Set<string>,
  start: { x: number; y: number },
  goal: { x: number; y: number }
): Array<{ x: number; y: number }> {
  const s = {
    x: Math.max(1, Math.min(layout.gridWidth - 2, Math.round(start.x))),
    y: Math.max(1, Math.min(layout.gridHeight - 2, Math.round(start.y))),
  }
  const g = {
    x: Math.max(1, Math.min(layout.gridWidth - 2, Math.round(goal.x))),
    y: Math.max(1, Math.min(layout.gridHeight - 2, Math.round(goal.y))),
  }

  if (!isOpen(s, layout, blocked) || !isOpen(g, layout, blocked)) {
    return [{ x: goal.x + 0.5, y: goal.y + 0.5 }]
  }

  const open = new Set<string>([tileKey(s)])
  const cameFrom = new Map<string, string>()
  const gScore = new Map<string, number>([[tileKey(s), 0]])
  const fScore = new Map<string, number>([[tileKey(s), heuristic(s, g)]])

  while (open.size > 0) {
    let currentKey = ''
    let currentScore = Infinity
    for (const key of open) {
      const score = fScore.get(key) ?? Infinity
      if (score < currentScore) {
        currentScore = score
        currentKey = key
      }
    }

    const current = parseKey(currentKey)
    if (current.x === g.x && current.y === g.y) {
      return reconstructPath(cameFrom, currentKey)
    }

    open.delete(currentKey)
    for (const neighbor of neighbors(current, layout, blocked)) {
      const nKey = tileKey(neighbor)
      const tentative = (gScore.get(currentKey) ?? Infinity) + 1
      if (tentative >= (gScore.get(nKey) ?? Infinity)) continue
      cameFrom.set(nKey, currentKey)
      gScore.set(nKey, tentative)
      fScore.set(nKey, tentative + heuristic(neighbor, g))
      open.add(nKey)
    }
  }

  return [{ x: goal.x + 0.5, y: goal.y + 0.5 }]
}

function neighbors(tile: { x: number; y: number }, layout: OfficeLayout, blocked: Set<string>): Array<{ x: number; y: number }> {
  return [
    { x: tile.x + 1, y: tile.y },
    { x: tile.x - 1, y: tile.y },
    { x: tile.x, y: tile.y + 1 },
    { x: tile.x, y: tile.y - 1 },
  ].filter((candidate) => isOpen(candidate, layout, blocked))
}

function parseKey(key: string): { x: number; y: number } {
  const [x, y] = key.split(':').map(Number)
  return { x, y }
}

function heuristic(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

function reconstructPath(cameFrom: Map<string, string>, currentKey: string): Array<{ x: number; y: number }> {
  const path: Array<{ x: number; y: number }> = [parseKey(currentKey)]
  while (cameFrom.has(currentKey)) {
    currentKey = cameFrom.get(currentKey)!
    path.unshift(parseKey(currentKey))
  }
  return path.map((tile) => ({ x: tile.x + 0.5, y: tile.y + 0.5 }))
}

/** Pick a new roam target for an idle agent, biased toward the agent's department anchor. */
function chooseRoamTarget(
  agentId: string,
  openTiles: Array<{ x: number; y: number }>,
  anchor?: { x: number; y: number }
): { x: number; y: number } {
  if (!openTiles.length) return { x: 0, y: 0 }
  if (!anchor) return openTiles[Math.floor(Math.random() * openTiles.length)]
  // Department-anchored agents prefer tiles within ~5 tiles of their anchor.
  const nearby = openTiles.filter((t) => Math.abs(t.x - anchor.x) + Math.abs(t.y - anchor.y) <= 5)
  const pool = nearby.length > 0 ? nearby : openTiles
  return pool[Math.floor(Math.random() * pool.length)]
}

function activityForAsset(tile: PlacedTile): AgentActivity | null {
  const asset = assetMap.get(tile.assetId)
  if (!asset) return null
  const id = asset.id.toLowerCase()
  const name = asset.name.toLowerCase()

  if (asset.category === 'kitchen' || id.includes('coffee') || name.includes('coffee')) {
    return { kind: 'coffee', label: 'Coffee break', targetTileId: tile.id }
  }
  if (asset.category === 'wellness' || id.includes('plant') || id.includes('beanbag') || id.includes('yoga')) {
    return { kind: 'recharge', label: id.includes('plant') ? 'Plant recharge' : 'Resetting energy', targetTileId: tile.id }
  }
  if (asset.category === 'tables' || id.includes('meeting') || id.includes('huddle')) {
    return { kind: 'sync', label: 'Quick sync', targetTileId: tile.id }
  }
  if (asset.category === 'seating' || id.includes('sofa') || id.includes('chair')) {
    return { kind: 'lounge', label: 'Team chat', targetTileId: tile.id }
  }
  if (asset.category === 'it' || id.includes('printer') || id.includes('server') || id.includes('switch')) {
    return { kind: 'systems', label: 'Checking systems', targetTileId: tile.id }
  }
  if (asset.category === 'decor' || id.includes('window') || id.includes('art')) {
    return { kind: 'focus', label: 'Thinking', targetTileId: tile.id }
  }
  return null
}

function buildActivityCandidates(layout: OfficeLayout, blocked: Set<string>): ActivityCandidate[] {
  const candidates: ActivityCandidate[] = []
  for (const tile of layout.tiles) {
    const activity = activityForAsset(tile)
    if (!activity) continue
    const target = nearestOpenAroundTile(layout, tile, blocked)
    if (!target) continue
    candidates.push({ tile, target, activity })
  }
  return candidates
}

function chooseActivityTarget(
  agentId: string,
  layout: OfficeLayout,
  openTiles: Array<{ x: number; y: number }>,
  blocked: Set<string>,
  anchor?: { x: number; y: number }
): { target: { x: number; y: number }; activity: AgentActivity } {
  const candidates = buildActivityCandidates(layout, blocked)
  if (candidates.length > 0) {
    const anchored = anchor
      ? candidates.filter((candidate) => Math.abs(candidate.target.x - anchor.x) + Math.abs(candidate.target.y - anchor.y) <= 8)
      : []
    const pool = anchored.length > 0 ? anchored : candidates
    const picked = pool[Math.floor(Math.random() * pool.length)]
    return { target: picked.target, activity: picked.activity }
  }

  const target = chooseRoamTarget(agentId, openTiles, anchor)
  return { target, activity: { kind: 'roam', label: 'Walking the floor' } }
}

function progressForMission(missionId: string, now: number): number {
  let hash = 0
  for (let i = 0; i < missionId.length; i++) hash = (hash * 31 + missionId.charCodeAt(i)) & 0xffff
  return (((Math.floor(now / 1200) + hash) % 100) + 1) / 100
}

function facingFromPath(path: Array<{ x: number; y: number }>, fallback: AgentFacing = 'right'): AgentFacing {
  if (path.length < 2) return fallback
  const a = path[path.length - 2]
  const b = path[path.length - 1]
  if (Math.abs(b.x - a.x) < 0.05) return fallback
  return b.x >= a.x ? 'right' : 'left'
}

/**
 * Compute the desired presence state for every agent. Pure: same input →
 * same output (modulo roam target reseeding which uses the cache).
 */
export function computeAgentPresence(input: {
  layout: OfficeLayout
  agents: AgentSnapshot[]
  missions: MissionSnapshot[]
  now?: number
}): AgentPresence[] {
  const now = input.now ?? Date.now()
  const { openTiles, blocked } = buildGridState(input.layout)

  // Build a quick lookup of which agents are actively working on which mission.
  const activeMissionByAgent = new Map<string, MissionSnapshot>()
  for (const mission of input.missions) {
    if (mission.status !== 'in_progress') continue
    if (mission.leadAgentId) activeMissionByAgent.set(mission.leadAgentId, mission)
    for (const cid of mission.collaboratorAgentIds || []) {
      if (!activeMissionByAgent.has(cid)) activeMissionByAgent.set(cid, mission)
    }
  }

  // Build a per-agent department lookup (Phase 2).
  const departmentByAgent = new Map<string, { id: string; color: string; anchor?: { x: number; y: number } }>()
  for (const dept of input.layout.org?.departments || []) {
    for (const aid of dept.agentIds) {
      departmentByAgent.set(aid, { id: dept.id, color: dept.color, anchor: dept.anchorTile })
    }
  }

  const result: AgentPresence[] = []
  for (const agent of input.agents) {
    const dept = departmentByAgent.get(agent.id)
    const activeMission = activeMissionByAgent.get(agent.id)
    const color = agent.color || defaultAgentColor(agent.id)
    const initial = (agent.name || agent.id).slice(0, 1).toUpperCase()

    let targetX: number
    let targetY: number
    let status: AgentStatus
    let deskTileId: string | undefined
    let activity: AgentActivity | undefined
    let path: Array<{ x: number; y: number }> = []
    let facing: AgentFacing = 'right'
    let pose: AgentPose = 'idle'
    let progress: number | undefined

    if (activeMission) {
      // Working: anchor to assigned desk if any, else fallback.
      const desk = findAssignedDesk(input.layout, agent.id)
      if (desk) {
        const seat = nearestOpenAroundTile(input.layout, desk, blocked) || fallbackWorkTile(input.layout, agent.id, openTiles)
        targetX = seat.x + 0.5
        targetY = seat.y + 0.5
        deskTileId = desk.id
      } else {
        const f = fallbackWorkTile(input.layout, agent.id, openTiles)
        targetX = f.x + 0.5
        targetY = f.y + 0.5
      }
      status = 'working'
      activity = { kind: 'work', label: activeMission.liveMessage || 'Working on a task', targetTileId: deskTileId }
      const previous = roamCache.get(agent.id)
      const start = previous ? { x: previous.targetX - 0.5, y: previous.targetY - 0.5 } : { x: targetX - 0.5, y: targetY - 0.5 }
      path = findPath(input.layout, blocked, start, { x: targetX - 0.5, y: targetY - 0.5 })
      facing = facingFromPath(path, previous?.facing)
      pose = 'sitting'
      progress = progressForMission(activeMission.id, now)
      roamCache.set(agent.id, {
        targetX,
        targetY,
        nextChangeAt: now + ROAM_INTERVAL_MS,
        activity,
        path,
        facing,
      })
    } else {
      // Idle: pick or refresh a roam target.
      let roam = roamCache.get(agent.id)
      if (!roam || now >= roam.nextChangeAt) {
        const previous = roam ? { x: roam.targetX - 0.5, y: roam.targetY - 0.5 } : undefined
        const { target, activity: nextActivity } = chooseActivityTarget(agent.id, input.layout, openTiles, blocked, dept?.anchor)
        const start = previous || target
        const nextPath = findPath(input.layout, blocked, start, target)
        const nextFacing = facingFromPath(nextPath, roam?.facing)
        roam = {
          targetX: target.x + 0.5,
          targetY: target.y + 0.5,
          activity: nextActivity,
          path: nextPath,
          facing: nextFacing,
          // Add a small random jitter so all agents don't reroll at the same instant.
          nextChangeAt: now + ROAM_INTERVAL_MS + Math.floor(Math.random() * 5000),
        }
        roamCache.set(agent.id, roam)
      }
      targetX = roam.targetX
      targetY = roam.targetY
      status = 'idle'
      activity = roam.activity
      path = roam.path
      facing = roam.facing
      pose = activity.kind === 'lounge' || activity.kind === 'coffee' ? 'sitting' :
        activity.kind === 'recharge' || activity.kind === 'systems' || activity.kind === 'sync' ? 'performing' :
        activity.kind === 'roam' ? 'walking' : 'idle'
    }

    result.push({
      agentId: agent.id,
      agentName: agent.name,
      x: targetX, // initial = target; the renderer tweens visually
      y: targetY,
      targetX,
      targetY,
      status,
      deskTileId,
      activeMissionId: activeMission?.id,
      message: activeMission?.liveMessage || undefined,
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

/**
 * Reset the roam cache. Used in tests + when the layout changes drastically
 * (e.g. user resets the office) so stale targets don't linger.
 */
export function resetPresenceCache(): void {
  roamCache.clear()
}
