/**
 * office-types.ts — TypeScript interfaces for the Virtual Office Builder
 * Scale: 1 tile = 50 cm real-world
 */

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

export interface OfficeLayout {
  version: 2
  gridWidth: number     // default 30
  gridHeight: number    // default 20
  floorAssetId: string  // asset id for floor tile
  tiles: PlacedTile[]
  zones: OfficeZone[]
  mcCredits?: number
  ownedAssets?: string[]
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
}
