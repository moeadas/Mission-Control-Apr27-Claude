/**
 * office-types.ts — TypeScript interfaces for the Virtual Office
 * Scale: 1 tile = 50 cm real-world
 *
 * Batch W: extended with organizational structure + gamification + presence
 * persistence. All new fields are optional so legacy layouts continue to load.
 */

import { resolveUse, type AssetFacing, type AssetUseKind, type OfficeFurnitureAsset } from '@/lib/office-assets'

export type OfficeFacing = AssetFacing

export interface PlacedTile {
  id: string               // unique instance UUID
  assetId: string          // references OfficeFurnitureAsset.id
  x: number                // grid column (0-indexed, top-left of bounding box)
  y: number                // grid row (0-indexed, top-left of bounding box)
  rotation: number         // 0 | 90 | 180 | 270
  primaryColor?: string    // overrides asset defaultColor (hex)
  accentColor?: string     // secondary color override (hex)
  assignedAgentId?: string // agent assigned to this specific item (desk, chair, etc.)
  label?: string           // optional custom label e.g. "Moe's Desk"
}

export interface OfficeZone {
  id: string
  name: string
  color: string  // hex
  /** Tile coordinates this zone covers — visual area labeling only */
  tiles: Array<{ x: number; y: number }>
}

// ─── Org structure (Batch W Phase 2) ─────────────────────────────────────
export interface OfficeDepartment {
  id: string
  name: string
  color: string      // tint for the department's UI badge
  leadAgentId?: string // department lead (manager)
  agentIds: string[]   // members
  /** Optional anchor tile — used to bias roam slots into the department's zone */
  anchorTile?: { x: number; y: number }
}

export interface ReportingLine {
  agentId: string
  managerId: string
}

export interface OfficeOrgStructure {
  departments: OfficeDepartment[]
  reportingLines: ReportingLine[]
  /** Free-form notes shown in the org tab */
  notes?: string
}

// ─── Gamification (Batch W Phase 3) ──────────────────────────────────────
export interface OfficeQuest {
  id: string
  title: string
  description: string
  /** Reward in MC credits when completed */
  reward: number
  /** Quest type drives evaluation: 'tasks' counts completed tasks; 'place'
   *  triggers when a tile with a matching assetId or category is placed;
   *  'org' triggers when an org structure field is filled. */
  type: 'tasks' | 'place' | 'org' | 'aesthetic' | 'capacity'
  /** Target value the user must reach */
  target: number
  /** Optional filter (e.g. assetId='plant' or category='wellness') */
  filter?: string
  /** Current progress (0–target) */
  progress?: number
  /** When the user completes the quest. ISO string. */
  completedAt?: string
}

export interface OfficeGamification {
  /** Office level — derived from total XP. */
  level: number
  /** Cumulative XP earned from completing tasks + quests. */
  xp: number
  /** Daily quests (refresh every 24h via DAILY_QUEST_REFRESH_MS). */
  dailyQuests: OfficeQuest[]
  /** Long-running achievements that don't refresh. */
  achievements: OfficeQuest[]
  /** Last time daily quests were rolled. ISO string. */
  questsRefreshedAt?: string
}

export interface OfficeLayout {
  version: 2
  gridWidth: number     // default 30
  gridHeight: number    // default 20
  floorAssetId: string  // asset id for floor tile
  tiles: PlacedTile[]
  zones: OfficeZone[]
  mcCredits?: number
  ownedAssets?: string[]
  // Batch W extensions — all optional so legacy layouts keep loading.
  org?: OfficeOrgStructure
  gamification?: OfficeGamification
}

export const DEFAULT_LAYOUT: OfficeLayout = {
  version: 2,
  gridWidth: 30,
  gridHeight: 20,
  floorAssetId: 'floor-hardwood',
  tiles: [],
  zones: [],
  mcCredits: 0,
  ownedAssets: [],
  org: {
    departments: [],
    reportingLines: [],
  },
  gamification: {
    level: 1,
    xp: 0,
    dailyQuests: [],
    achievements: [],
  },
}

// ─── Helpers ─────────────────────────────────────────────────────────────

/** XP needed to reach a given level. Quadratic curve so early levels feel quick. */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0
  return Math.round(50 * (level - 1) ** 1.6)
}

/** Compute current level + progress toward next from total XP. */
export function levelFromXp(xp: number): { level: number; nextLevelXp: number; intoLevelXp: number } {
  let lvl = 1
  while (xpForLevel(lvl + 1) <= xp) lvl += 1
  const base = xpForLevel(lvl)
  const next = xpForLevel(lvl + 1)
  return { level: lvl, nextLevelXp: next - base, intoLevelXp: xp - base }
}

export const DAILY_QUEST_REFRESH_MS = 24 * 60 * 60 * 1000

export function normalizeRotation(rotation = 0): 0 | 90 | 180 | 270 {
  const normalized = ((Math.round(rotation / 90) * 90) % 360 + 360) % 360
  return (normalized === 90 || normalized === 180 || normalized === 270 ? normalized : 0) as 0 | 90 | 180 | 270
}

export function rotatedSize(asset: Pick<OfficeFurnitureAsset, 'size'>, rotation = 0): [number, number] {
  const [width, height] = asset.size
  const normalized = normalizeRotation(rotation)
  return normalized === 90 || normalized === 270 ? [height, width] : [width, height]
}

export function footprintTiles(tile: PlacedTile, asset?: Pick<OfficeFurnitureAsset, 'size'>): Array<{ x: number; y: number }> {
  const [width, height] = asset ? rotatedSize(asset, tile.rotation) : [1, 1]
  const cells: Array<{ x: number; y: number }> = []
  for (let dy = 0; dy < height; dy += 1) {
    for (let dx = 0; dx < width; dx += 1) {
      cells.push({ x: tile.x + dx, y: tile.y + dy })
    }
  }
  return cells
}

function rotateLocalPoint(dx: number, dy: number, width: number, height: number, rotation = 0): { x: number; y: number } {
  switch (normalizeRotation(rotation)) {
    case 90:
      return { x: height - dy, y: dx }
    case 180:
      return { x: width - dx, y: height - dy }
    case 270:
      return { x: dy, y: width - dx }
    default:
      return { x: dx, y: dy }
  }
}

export function rotateFacing(facing: OfficeFacing, rotation = 0): OfficeFacing {
  const order: OfficeFacing[] = ['up', 'right', 'down', 'left']
  const turns = normalizeRotation(rotation) / 90
  const index = order.indexOf(facing)
  return order[(index + turns + order.length) % order.length]
}

export interface OfficeUseSpot {
  x: number
  y: number
  tileX: number
  tileY: number
  facing: OfficeFacing
  kind: AssetUseKind
  capacity: number
}

export function useSpots(tile: PlacedTile, asset: OfficeFurnitureAsset): OfficeUseSpot[] {
  const usage = resolveUse(asset)
  if (!usage) return []
  const [width, height] = asset.size
  return usage.spots.map((spot) => {
    const rotated = rotateLocalPoint(spot.dx, spot.dy, width, height, tile.rotation)
    const x = tile.x + rotated.x
    const y = tile.y + rotated.y
    return {
      x,
      y,
      tileX: Math.floor(x),
      tileY: Math.floor(y),
      facing: rotateFacing(spot.facing, tile.rotation),
      kind: usage.kind,
      capacity: usage.capacity || usage.spots.length,
    }
  })
}
