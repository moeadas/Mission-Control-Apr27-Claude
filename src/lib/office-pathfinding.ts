import { OFFICE_ASSETS, resolveTraversal, type OfficeFurnitureAsset } from '@/lib/office-assets'
import { footprintTiles, type OfficeLayout } from '@/lib/office-types'

export interface GridTile {
  x: number
  y: number
}

export interface GridPoint {
  x: number
  y: number
}

export interface WalkGrid {
  width: number
  height: number
  blocked: Set<string>
  openTiles: GridTile[]
  isWalkable: (x: number, y: number) => boolean
}

const assetMap = new Map<string, OfficeFurnitureAsset>(OFFICE_ASSETS.map((asset) => [asset.id, asset]))

function key(tile: GridTile): string {
  return `${tile.x}:${tile.y}`
}

function center(tile: GridTile): GridPoint {
  return { x: tile.x + 0.5, y: tile.y + 0.5 }
}

function normalizeTile(point: GridPoint): GridTile {
  return { x: Math.floor(point.x), y: Math.floor(point.y) }
}

function inside(grid: Pick<WalkGrid, 'width' | 'height'>, tile: GridTile): boolean {
  return tile.x >= 0 && tile.y >= 0 && tile.x < grid.width && tile.y < grid.height
}

export function buildWalkGrid(layout: OfficeLayout): WalkGrid {
  const blocked = new Set<string>()

  for (const tile of layout.tiles) {
    const asset = assetMap.get(tile.assetId)
    if (!asset || resolveTraversal(asset) === 'walkable') continue
    for (const cell of footprintTiles(tile, asset)) {
      if (cell.x >= 0 && cell.y >= 0 && cell.x < layout.gridWidth && cell.y < layout.gridHeight) {
        blocked.add(key(cell))
      }
    }
  }

  const grid: WalkGrid = {
    width: layout.gridWidth,
    height: layout.gridHeight,
    blocked,
    openTiles: [],
    isWalkable(x: number, y: number) {
      const tile = { x, y }
      return inside(grid, tile) && !blocked.has(key(tile))
    },
  }

  for (let y = 0; y < layout.gridHeight; y += 1) {
    for (let x = 0; x < layout.gridWidth; x += 1) {
      if (grid.isWalkable(x, y)) grid.openTiles.push({ x, y })
    }
  }

  return grid
}

export function nearestWalkableTile(grid: WalkGrid, point: GridPoint, maxRadius = 8): GridTile | null {
  const origin = normalizeTile(point)
  if (grid.isWalkable(origin.x, origin.y)) return origin

  let best: GridTile | null = null
  let bestDistance = Number.POSITIVE_INFINITY
  for (let radius = 1; radius <= maxRadius; radius += 1) {
    for (let y = origin.y - radius; y <= origin.y + radius; y += 1) {
      for (let x = origin.x - radius; x <= origin.x + radius; x += 1) {
        if (Math.abs(x - origin.x) !== radius && Math.abs(y - origin.y) !== radius) continue
        if (!grid.isWalkable(x, y)) continue
        const distance = Math.abs(x - origin.x) + Math.abs(y - origin.y)
        if (distance < bestDistance) {
          best = { x, y }
          bestDistance = distance
        }
      }
    }
    if (best) return best
  }

  return null
}

export function findPath(grid: WalkGrid, from: GridTile, to: GridTile): GridPoint[] | null {
  if (!grid.isWalkable(from.x, from.y) || !grid.isWalkable(to.x, to.y)) return null

  const startKey = key(from)
  const goalKey = key(to)
  if (startKey === goalKey) return [center(from)]

  const open = new Set<string>([startKey])
  const cameFrom = new Map<string, string>()
  const gScore = new Map<string, number>([[startKey, 0]])
  const fScore = new Map<string, number>([[startKey, Math.abs(from.x - to.x) + Math.abs(from.y - to.y)]])

  const lookup = new Map<string, GridTile>([[startKey, from], [goalKey, to]])
  const neighbors = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ]

  while (open.size) {
    let currentKey = ''
    let currentScore = Number.POSITIVE_INFINITY
    for (const candidate of open) {
      const score = fScore.get(candidate) ?? Number.POSITIVE_INFINITY
      if (score < currentScore) {
        currentKey = candidate
        currentScore = score
      }
    }

    if (currentKey === goalKey) {
      const route: GridTile[] = []
      let cursor = currentKey
      while (cursor) {
        const tile = lookup.get(cursor)
        if (tile) route.unshift(tile)
        const previous = cameFrom.get(cursor)
        if (!previous) break
        cursor = previous
      }
      return route.map(center)
    }

    open.delete(currentKey)
    const current = lookup.get(currentKey)
    if (!current) continue

    for (const offset of neighbors) {
      const next = { x: current.x + offset.x, y: current.y + offset.y }
      if (!grid.isWalkable(next.x, next.y)) continue
      const nextKey = key(next)
      lookup.set(nextKey, next)
      const tentative = (gScore.get(currentKey) ?? Number.POSITIVE_INFINITY) + 1
      if (tentative >= (gScore.get(nextKey) ?? Number.POSITIVE_INFINITY)) continue
      cameFrom.set(nextKey, currentKey)
      gScore.set(nextKey, tentative)
      fScore.set(nextKey, tentative + Math.abs(next.x - to.x) + Math.abs(next.y - to.y))
      open.add(nextKey)
    }
  }

  return null
}
