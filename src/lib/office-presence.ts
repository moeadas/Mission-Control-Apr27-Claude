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
 *   • Working agents (have an active mission) anchor to their assigned desk
 *     tile. If no desk is assigned, they pick a temporary slot near the
 *     center of the office.
 *   • Idle agents roam between "roam slots" — open floor tiles not currently
 *     occupied by furniture. A new target is chosen every ROAM_INTERVAL_MS,
 *     so agents drift around the office naturally.
 *   • The grid is the source of truth. Animation interpolates between (x,y)
 *     waypoints over WALK_MS; the renderer never invents intermediate tiles.
 */

import type { OfficeLayout, PlacedTile } from '@/lib/office-types'
import { OFFICE_ASSETS, type OfficeFurnitureAsset } from '@/lib/office-assets'

// ─── Tunables ─────────────────────────────────────────────────────────────
export const ROAM_INTERVAL_MS = 8000        // pick a new wander target every 8s
export const WALK_MS = 1400                  // ms to traverse one tile-distance unit
export const PRESENCE_TICK_MS = 600          // re-compute presence this often

// ─── Public types ─────────────────────────────────────────────────────────
export type AgentStatus = 'working' | 'idle' | 'walking' | 'offline'

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
}
const roamCache = new Map<string, RoamState>()

// ─── Helpers ──────────────────────────────────────────────────────────────

const assetMap = new Map<string, OfficeFurnitureAsset>(OFFICE_ASSETS.map((a) => [a.id, a]))

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
function buildOpenTiles(layout: OfficeLayout): Array<{ x: number; y: number }> {
  const occupied = new Set<string>()
  for (const tile of layout.tiles) {
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
  return open
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
  const openTiles = buildOpenTiles(input.layout)

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

    let targetX: number, targetY: number, status: AgentStatus, deskTileId: string | undefined

    if (activeMission) {
      // Working: anchor to assigned desk if any, else fallback.
      const desk = findAssignedDesk(input.layout, agent.id)
      if (desk) {
        const c = tileCenter(desk)
        targetX = c.x
        targetY = c.y
        deskTileId = desk.id
      } else {
        const f = fallbackWorkTile(input.layout, agent.id, openTiles)
        targetX = f.x + 0.5
        targetY = f.y + 0.5
      }
      status = 'working'
    } else {
      // Idle: pick or refresh a roam target.
      let roam = roamCache.get(agent.id)
      if (!roam || now >= roam.nextChangeAt) {
        const target = chooseRoamTarget(agent.id, openTiles, dept?.anchor)
        roam = {
          targetX: target.x + 0.5,
          targetY: target.y + 0.5,
          // Add a small random jitter so all agents don't reroll at the same instant.
          nextChangeAt: now + ROAM_INTERVAL_MS + Math.floor(Math.random() * 2000),
        }
        roamCache.set(agent.id, roam)
      }
      targetX = roam.targetX
      targetY = roam.targetY
      status = 'idle'
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
