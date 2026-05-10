/**
 * office-types.ts — TypeScript interfaces for the Virtual Office Builder
 */

export interface PlacedTile {
  id: string          // unique instance UUID
  assetId: string     // references OfficeFurnitureAsset.id
  x: number           // grid column (0-indexed, leftmost)
  y: number           // grid row (0-indexed, topmost)
  rotation: number    // 0 | 90 | 180 | 270
}

export interface OfficeZone {
  id: string
  name: string
  color: string       // hex
  /** Tile coordinates this zone covers — used for visual painting */
  tiles: Array<{ x: number; y: number }>
  /** Agent IDs assigned to work in this zone */
  agentIds: string[]
}

export interface OfficeLayout {
  version: 1
  gridWidth: number    // default 26
  gridHeight: number   // default 18
  floorAssetId: string // tile used for empty cells, default 'floor-hardwood'
  tiles: PlacedTile[]
  zones: OfficeZone[]
  /** MC Credits balance — stored separately in DB but included in GET response */
  mcCredits?: number
  /** Asset IDs the tenant has purchased */
  ownedAssets?: string[]
}

export const DEFAULT_LAYOUT: OfficeLayout = {
  version: 1,
  gridWidth: 26,
  gridHeight: 18,
  floorAssetId: 'floor-hardwood',
  tiles: [],
  zones: [],
  mcCredits: 0,
  ownedAssets: [],
}
