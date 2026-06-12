import { describe, expect, it } from 'vitest'

import { getAssetById } from '@/lib/office-assets'
import { buildWalkGrid, findPath } from '@/lib/office-pathfinding'
import { footprintTiles, rotatedSize, type OfficeLayout, type PlacedTile } from '@/lib/office-types'

function layoutWith(tiles: PlacedTile[]): OfficeLayout {
  return {
    version: 2,
    gridWidth: 8,
    gridHeight: 6,
    floorAssetId: 'floor-hardwood',
    tiles,
    zones: [],
  }
}

describe('office furniture-aware movement', () => {
  it('treats rotated furniture as a rotated footprint', () => {
    const desk = getAssetById('desk-standard')!
    const tile: PlacedTile = { id: 'desk-1', assetId: desk.id, x: 2, y: 1, rotation: 90 }

    expect(rotatedSize(desk, tile.rotation)).toEqual([2, 3])
    expect(footprintTiles(tile, desk)).toEqual([
      { x: 2, y: 1 },
      { x: 3, y: 1 },
      { x: 2, y: 2 },
      { x: 3, y: 2 },
      { x: 2, y: 3 },
      { x: 3, y: 3 },
    ])
  })

  it('routes around blocked furniture instead of returning a direct fallback', () => {
    const layout = layoutWith([
      { id: 'desk-1', assetId: 'desk-standard', x: 2, y: 1, rotation: 0 },
    ])
    const grid = buildWalkGrid(layout)
    const route = findPath(grid, { x: 1, y: 2 }, { x: 6, y: 2 })

    expect(route).toBeTruthy()
    const blockedCenters = new Set(['2.5:1.5', '3.5:1.5', '4.5:1.5', '2.5:2.5', '3.5:2.5', '4.5:2.5'])
    expect(route!.some((point) => blockedCenters.has(`${point.x}:${point.y}`))).toBe(false)
  })
})
