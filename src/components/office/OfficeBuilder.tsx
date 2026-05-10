'use client'
/**
 * OfficeBuilder.tsx — Virtual Office Builder powered by Konva.js
 * 
 * Features:
 *  - Konva Stage with 3 layers: floor/zones, furniture, UI overlay
 *  - Drag-to-move placed items with grid snapping
 *  - Scroll-wheel zoom toward cursor (Figma-style)
 *  - Rotation via R key or toolbar buttons
 *  - Color picker per item (primaryColor on PlacedTile)
 *  - Agent assignment to specific item via panel
 *  - 6 starter office templates
 *  - 50-step undo/redo history
 *  - Delete key to remove selected item
 *  - Arrow key nudging (1 tile at a time)
 *  - LocalStorage auto-save + export/import JSON
 *  - Save to server (PUT /api/office-layout)
 */

import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react'
import { Stage, Layer, Rect, Group, Image as KImage, Text, Line } from 'react-konva'
import useImage from 'use-image'
import { v4 as uuidv4 } from 'uuid'
import Konva from 'konva'
import {
  OFFICE_ASSETS, ASSET_CATEGORIES, tintSvg, OfficeFurnitureAsset,
} from '@/lib/office-assets'
import { OFFICE_TEMPLATES, getTemplateLayout } from '@/lib/office-templates'
import { OfficeLayout, PlacedTile, OfficeZone, DEFAULT_LAYOUT } from '@/lib/office-types'
import { getStoredToken } from '@/lib/auth/browser'
import { useAgentsStore } from '@/lib/agents-store'

// ─── Constants ────────────────────────────────────────────────────────────────

const TILE_PX = 52          // pixels per grid tile (base, before zoom)
const GRID_W  = 30
const GRID_H  = 20
const LS_KEY  = 'mc_office_layout_v2'
const HISTORY_MAX = 50
const MIN_ZOOM = 0.3
const MAX_ZOOM = 2.5

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  isSuperAdmin: boolean
}

type Tool = 'select' | 'zone'

// ─── SVG → Konva Image helper ─────────────────────────────────────────────────

function svgToBlobUrl(svg: string): string {
  const blob = new Blob([svg], { type: 'image/svg+xml' })
  return URL.createObjectURL(blob)
}

// Cache blob URLs keyed by "assetId:primaryColor"
const svgUrlCache = new Map<string, string>()

function getAssetUrl(asset: OfficeFurnitureAsset, primaryColor?: string): string {
  const key = `${asset.id}:${primaryColor ?? ''}`
  if (svgUrlCache.has(key)) return svgUrlCache.get(key)!
  const svg = primaryColor
    ? tintSvg(asset.svg, asset.defaultColor, primaryColor)
    : asset.svg
  const url = svgToBlobUrl(svg)
  svgUrlCache.set(key, url)
  return url
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface FurnitureTileProps {
  tile: PlacedTile
  asset: OfficeFurnitureAsset
  tileSize: number
  isSelected: boolean
  onSelect: (id: string) => void
  onDragEnd: (id: string, x: number, y: number) => void
}

function FurnitureTile({ tile, asset, tileSize, isSelected, onSelect, onDragEnd }: FurnitureTileProps) {
  const url = getAssetUrl(asset, tile.primaryColor)
  const [img] = useImage(url)

  const [w, h] = asset.size
  const px = tile.x * tileSize
  const py = tile.y * tileSize
  const pw = w * tileSize
  const ph = h * tileSize

  // Rotation pivot = centre of bounding box
  const cx = px + pw / 2
  const cy = py + ph / 2

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const newX = Math.round(e.target.x() / tileSize)
    const newY = Math.round(e.target.y() / tileSize)
    onDragEnd(tile.id, newX, newY)
    // Reset drag position to snapped grid (tile manages true position)
    e.target.position({ x: newX * tileSize, y: newY * tileSize })
  }

  return (
    <Group
      x={px}
      y={py}
      width={pw}
      height={ph}
      rotation={tile.rotation}
      offsetX={pw / 2}
      offsetY={ph / 2}
      draggable
      onClick={() => onSelect(tile.id)}
      onTap={() => onSelect(tile.id)}
      onDragEnd={handleDragEnd}
      // Move group to centre for rotation origin, then offset back
      // We manually set x/y to the centre coords
    >
      {/* Invisible hit area */}
      <Rect
        x={-pw / 2}
        y={-ph / 2}
        width={pw}
        height={ph}
        fill="transparent"
      />
      {img && (
        <KImage
          x={-pw / 2}
          y={-ph / 2}
          width={pw}
          height={ph}
          image={img}
          listening={false}
        />
      )}
      {/* Placeholder while image loads */}
      {!img && (
        <Rect
          x={-pw / 2}
          y={-ph / 2}
          width={pw}
          height={ph}
          fill={tile.primaryColor ?? asset.defaultColor}
          cornerRadius={3}
          listening={false}
        />
      )}
      {/* Selection border */}
      {isSelected && (
        <Rect
          x={-pw / 2 - 2}
          y={-ph / 2 - 2}
          width={pw + 4}
          height={ph + 4}
          stroke="#3B82F6"
          strokeWidth={2}
          fill="transparent"
          cornerRadius={4}
          listening={false}
        />
      )}
      {/* Label */}
      {tile.label && (
        <Text
          x={-pw / 2}
          y={ph / 2 + 2}
          width={pw}
          text={tile.label}
          fontSize={9}
          fill="#fff"
          align="center"
          listening={false}
        />
      )}
    </Group>
  )
}

// Render group with corrected x/y at centre
function FurnitureTileWrapper(props: FurnitureTileProps) {
  const { tile, asset, tileSize } = props
  const [w, h] = asset.size
  const cx = tile.x * tileSize + (w * tileSize) / 2
  const cy = tile.y * tileSize + (h * tileSize) / 2

  const url = getAssetUrl(asset, tile.primaryColor)
  const [img] = useImage(url)
  const pw = w * tileSize
  const ph = h * tileSize

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    // Position is the centre; convert back to grid top-left
    const newCX = e.target.x()
    const newCY = e.target.y()
    const newX = Math.round((newCX - pw / 2) / tileSize)
    const newY = Math.round((newCY - ph / 2) / tileSize)
    props.onDragEnd(tile.id, Math.max(0, newX), Math.max(0, newY))
  }

  return (
    <Group
      x={cx}
      y={cy}
      offsetX={0}
      offsetY={0}
      rotation={tile.rotation}
      draggable
      onClick={() => props.onSelect(tile.id)}
      onTap={() => props.onSelect(tile.id)}
      onDragEnd={handleDragEnd}
    >
      <Rect
        x={-pw / 2}
        y={-ph / 2}
        width={pw}
        height={ph}
        fill="transparent"
      />
      {img ? (
        <KImage
          x={-pw / 2}
          y={-ph / 2}
          width={pw}
          height={ph}
          image={img}
          listening={false}
        />
      ) : (
        <Rect
          x={-pw / 2}
          y={-ph / 2}
          width={pw}
          height={ph}
          fill={tile.primaryColor ?? asset.defaultColor}
          cornerRadius={3}
          listening={false}
        />
      )}
      {props.isSelected && (
        <Rect
          x={-pw / 2 - 2}
          y={-ph / 2 - 2}
          width={pw + 4}
          height={ph + 4}
          stroke="#3B82F6"
          strokeWidth={2.5}
          fill="rgba(59,130,246,0.08)"
          cornerRadius={4}
          listening={false}
        />
      )}
      {tile.label && (
        <Text
          x={-pw / 2}
          y={ph / 2 + 3}
          width={pw}
          text={tile.label}
          fontSize={10}
          fill="#e2e8f0"
          align="center"
          listening={false}
        />
      )}
    </Group>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function OfficeBuilder({ isSuperAdmin }: Props) {
  const agents = useAgentsStore(s => s.agents)

  // ── Layout state ─────────────────────────────────────────────────────────
  const [layout, setLayout] = useState<OfficeLayout>(DEFAULT_LAYOUT)
  const [history, setHistory] = useState<OfficeLayout[]>([DEFAULT_LAYOUT])
  const [historyIdx, setHistoryIdx] = useState(0)

  // ── Viewport ─────────────────────────────────────────────────────────────
  const stageRef = useRef<Konva.Stage>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [stageSize, setStageSize] = useState({ w: 800, h: 600 })
  const [scale, setScale] = useState(0.9)
  const [offset, setOffset] = useState({ x: 20, y: 20 })

  // ── Interaction state ─────────────────────────────────────────────────────
  const [tool, setTool] = useState<Tool>('select')
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null)
  const [activeCategoryId, setActiveCategoryId] = useState<string>('desks')
  const [searchQuery, setSearchQuery] = useState('')

  // ── Panel state ───────────────────────────────────────────────────────────
  const [showTemplates, setShowTemplates] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showAgentPicker, setShowAgentPicker] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  // ── Zone painting ─────────────────────────────────────────────────────────
  const [zoneColor, setZoneColor] = useState('#3B82F6')
  const [zoneName, setZoneName] = useState('New Zone')
  const [isPainting, setIsPainting] = useState(false)
  const paintedTilesRef = useRef<Set<string>>(new Set())

  // ─── Resize observer ────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      setStageSize({ w: el.clientWidth, h: el.clientHeight })
    })
    ro.observe(el)
    setStageSize({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  // ─── Load from localStorage / server ─────────────────────────────────────
  useEffect(() => {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as OfficeLayout
        if (parsed?.version === 2) {
          setLayout(parsed)
          setHistory([parsed])
          return
        }
      } catch { /* ignore */ }
    }
    // Fall back to server
    const token = getStoredToken()
    if (!token) return
    fetch('/api/office-layout', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.layout?.version === 2) {
          setLayout(data.layout)
          setHistory([data.layout])
        }
      })
      .catch(() => {})
  }, [])

  // ─── History helpers ──────────────────────────────────────────────────────
  const pushHistory = useCallback((newLayout: OfficeLayout) => {
    setHistory(prev => {
      const truncated = prev.slice(0, historyIdx + 1)
      const next = [...truncated, newLayout].slice(-HISTORY_MAX)
      return next
    })
    setHistoryIdx(prev => Math.min(prev + 1, HISTORY_MAX - 1))
    setLayout(newLayout)
    localStorage.setItem(LS_KEY, JSON.stringify(newLayout))
  }, [historyIdx])

  const undo = useCallback(() => {
    if (historyIdx <= 0) return
    const newIdx = historyIdx - 1
    setHistoryIdx(newIdx)
    const prev = history[newIdx]
    setLayout(prev)
    localStorage.setItem(LS_KEY, JSON.stringify(prev))
  }, [history, historyIdx])

  const redo = useCallback(() => {
    if (historyIdx >= history.length - 1) return
    const newIdx = historyIdx + 1
    setHistoryIdx(newIdx)
    const next = history[newIdx]
    setLayout(next)
    localStorage.setItem(LS_KEY, JSON.stringify(next))
  }, [history, historyIdx])

  // ─── Asset lookup map ─────────────────────────────────────────────────────
  const assetMap = useMemo(() => {
    const m = new Map<string, OfficeFurnitureAsset>()
    OFFICE_ASSETS.forEach(a => m.set(a.id, a))
    return m
  }, [])

  const selectedTile = layout.tiles.find(t => t.id === selectedTileId) ?? null
  const selectedAsset = selectedTile ? assetMap.get(selectedTile.assetId) ?? null : null

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      if (e.key === 'z' && (e.metaKey || e.ctrlKey) && !e.shiftKey) { e.preventDefault(); undo(); return }
      if ((e.key === 'z' && (e.metaKey || e.ctrlKey) && e.shiftKey) ||
          (e.key === 'y' && (e.metaKey || e.ctrlKey))) { e.preventDefault(); redo(); return }

      if (!selectedTileId) return

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        pushHistory({ ...layout, tiles: layout.tiles.filter(t => t.id !== selectedTileId) })
        setSelectedTileId(null)
        return
      }
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        pushHistory({
          ...layout,
          tiles: layout.tiles.map(t =>
            t.id === selectedTileId ? { ...t, rotation: (t.rotation + 90) % 360 } : t
          ),
        })
        return
      }
      const ARROW_KEYS: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
      }
      if (ARROW_KEYS[e.key]) {
        e.preventDefault()
        const [dx, dy] = ARROW_KEYS[e.key]
        pushHistory({
          ...layout,
          tiles: layout.tiles.map(t =>
            t.id === selectedTileId
              ? { ...t, x: Math.max(0, t.x + dx), y: Math.max(0, t.y + dy) }
              : t
          ),
        })
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedTileId, layout, undo, redo, pushHistory])

  // ─── Zoom toward cursor (Figma-style) ────────────────────────────────────
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const stage = stageRef.current
    if (!stage) return
    const pointer = stage.getPointerPosition()
    if (!pointer) return
    const direction = e.evt.deltaY > 0 ? -1 : 1
    const factor = 1.08
    const newScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale * (direction > 0 ? factor : 1 / factor)))
    const mousePointTo = {
      x: (pointer.x - offset.x) / scale,
      y: (pointer.y - offset.y) / scale,
    }
    setOffset({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    })
    setScale(newScale)
  }, [scale, offset])

  // ─── Place asset on grid click ────────────────────────────────────────────
  const [placingAsset, setPlacingAsset] = useState<OfficeFurnitureAsset | null>(null)

  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (tool !== 'select' || !placingAsset) return
    const stage = stageRef.current
    if (!stage) return
    const pointer = stage.getPointerPosition()
    if (!pointer) return
    // Convert pointer to grid coords
    const gridX = Math.floor((pointer.x - offset.x) / (TILE_PX * scale))
    const gridY = Math.floor((pointer.y - offset.y) / (TILE_PX * scale))
    if (gridX < 0 || gridY < 0 || gridX >= GRID_W || gridY >= GRID_H) return

    const newTile: PlacedTile = {
      id: uuidv4(),
      assetId: placingAsset.id,
      x: gridX,
      y: gridY,
      rotation: 0,
    }
    pushHistory({ ...layout, tiles: [...layout.tiles, newTile] })
    setSelectedTileId(newTile.id)
    // Keep placing same asset on repeat clicks; press Esc to cancel
  }, [tool, placingAsset, layout, offset, scale, pushHistory])

  // Cancel placing on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPlacingAsset(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Deselect on clicking background
  const handleStageBackgroundClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target === e.currentTarget) setSelectedTileId(null)
  }, [])

  // ─── Tile callbacks ───────────────────────────────────────────────────────
  const handleTileSelect = useCallback((id: string) => {
    setSelectedTileId(id)
    setPlacingAsset(null)
  }, [])

  const handleTileDragEnd = useCallback((id: string, x: number, y: number) => {
    pushHistory({
      ...layout,
      tiles: layout.tiles.map(t => t.id === id ? { ...t, x, y } : t),
    })
  }, [layout, pushHistory])

  // ─── Tile property updates ────────────────────────────────────────────────
  const updateSelectedTile = useCallback((patch: Partial<PlacedTile>) => {
    if (!selectedTileId) return
    pushHistory({
      ...layout,
      tiles: layout.tiles.map(t => t.id === selectedTileId ? { ...t, ...patch } : t),
    })
  }, [selectedTileId, layout, pushHistory])

  const rotateSelected = useCallback(() => {
    if (!selectedTile) return
    updateSelectedTile({ rotation: (selectedTile.rotation + 90) % 360 })
  }, [selectedTile, updateSelectedTile])

  const deleteSelected = useCallback(() => {
    if (!selectedTileId) return
    pushHistory({ ...layout, tiles: layout.tiles.filter(t => t.id !== selectedTileId) })
    setSelectedTileId(null)
  }, [selectedTileId, layout, pushHistory])

  // ─── Save to server ───────────────────────────────────────────────────────
  const saveToServer = useCallback(async () => {
    setSaving(true)
    setSaveMsg('')
    try {
      const token = getStoredToken()
      const res = await fetch('/api/office-layout', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ layout }),
      })
      setSaveMsg(res.ok ? '✓ Saved' : '✗ Error')
    } catch {
      setSaveMsg('✗ Error')
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(''), 2500)
    }
  }, [layout])

  // ─── Export / Import ──────────────────────────────────────────────────────
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(layout, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'office-layout.json'
    a.click()
  }

  const importJSON = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result as string) as OfficeLayout
          if (parsed.version === 2) {
            pushHistory(parsed)
          }
        } catch { /* ignore */ }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  // ─── Templates ────────────────────────────────────────────────────────────
  const applyTemplate = (id: string) => {
    const tplLayout = getTemplateLayout(id)
    if (tplLayout) {
      pushHistory(tplLayout)
      setShowTemplates(false)
    }
  }

  // ─── Filtered assets ──────────────────────────────────────────────────────
  const filteredAssets = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return OFFICE_ASSETS.filter(a => {
      const catMatch = !searchQuery && a.category === activeCategoryId
      const searchMatch = searchQuery && (
        a.name.toLowerCase().includes(q) || a.category.includes(q)
      )
      return catMatch || searchMatch
    })
  }, [activeCategoryId, searchQuery])

  // ─── Grid lines ───────────────────────────────────────────────────────────
  const gridLines = useMemo(() => {
    const lines: React.ReactNode[] = []
    const ts = TILE_PX
    for (let x = 0; x <= GRID_W; x++) {
      lines.push(
        <Line
          key={`v${x}`}
          points={[x * ts, 0, x * ts, GRID_H * ts]}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={1}
          listening={false}
        />
      )
    }
    for (let y = 0; y <= GRID_H; y++) {
      lines.push(
        <Line
          key={`h${y}`}
          points={[0, y * ts, GRID_W * ts, y * ts]}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={1}
          listening={false}
        />
      )
    }
    return lines
  }, [])

  // ─── Zone rendering ───────────────────────────────────────────────────────
  const zoneRects = useMemo(() => {
    return layout.zones.map(zone => {
      if (!zone.tiles.length) return null
      // Render each tile individually as a coloured rect
      return zone.tiles.map(t => (
        <Rect
          key={`${zone.id}-${t.x}-${t.y}`}
          x={t.x * TILE_PX}
          y={t.y * TILE_PX}
          width={TILE_PX}
          height={TILE_PX}
          fill={zone.color + '33'}  // 20% opacity
          listening={false}
        />
      ))
    })
  }, [layout.zones])

  // ─── Color presets ────────────────────────────────────────────────────────
  const COLOR_PRESETS = [
    '#d4a96a', '#8B4513', '#e8e0d0', '#334155',
    '#c8a97a', '#6B7280', '#F5F5DC', '#1E293B',
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
    '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
  ]

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full bg-[#0f1117] text-white overflow-hidden" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Left Sidebar: Asset Palette ──────────────────────────────────── */}
      <div className="w-64 flex flex-col border-r border-white/10 bg-[#151922] overflow-hidden shrink-0">
        {/* Header */}
        <div className="px-3 py-3 border-b border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Assets</span>
            <button
              onClick={() => setShowTemplates(true)}
              className="text-xs px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
            >
              Templates
            </button>
          </div>
          <input
            type="text"
            placeholder="Search…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30"
          />
        </div>

        {/* Category tabs */}
        {!searchQuery && (
          <div className="flex flex-col gap-0.5 px-2 py-2 border-b border-white/10 overflow-y-auto max-h-40">
            {ASSET_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategoryId(cat.id)}
                className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left transition-colors ${
                  activeCategoryId === cat.id
                    ? 'bg-white/10 text-white'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                }`}
              >
                <span className="text-base">{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Asset list */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
          {filteredAssets.map(asset => (
            <button
              key={asset.id}
              onClick={() => {
                setPlacingAsset(asset)
                setTool('select')
              }}
              className={`w-full flex items-center gap-2 px-2 py-2 rounded text-left text-sm transition-colors ${
                placingAsset?.id === asset.id
                  ? 'bg-indigo-600/40 border border-indigo-500/50 text-white'
                  : 'hover:bg-white/5 text-white/70 hover:text-white'
              }`}
              title={`${asset.size[0]}×${asset.size[1]} tiles (${asset.size[0] * 0.5}×${asset.size[1] * 0.5}m)`}
            >
              {/* Colour swatch */}
              <span
                className="w-4 h-4 rounded shrink-0 border border-white/20"
                style={{ background: asset.defaultColor }}
              />
              <span className="flex-1 truncate">{asset.name}</span>
              {asset.tier === 'premium' && (
                <span className="text-xs text-yellow-400 shrink-0">★</span>
              )}
            </button>
          ))}
          {filteredAssets.length === 0 && (
            <p className="text-white/30 text-xs text-center py-4">No assets found</p>
          )}
        </div>

        {/* Placing indicator */}
        {placingAsset && (
          <div className="px-3 py-2 bg-indigo-900/40 border-t border-indigo-500/30 text-xs text-indigo-300">
            Placing: <strong>{placingAsset.name}</strong>
            <br />
            <span className="text-indigo-400">Click on grid • Esc to cancel</span>
          </div>
        )}
      </div>

      {/* ── Canvas area ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10 bg-[#151922] shrink-0 flex-wrap">
          {/* Tool toggles */}
          <div className="flex items-center gap-1 mr-2">
            <button
              onClick={() => { setTool('select'); setPlacingAsset(null) }}
              title="Select / Move (V)"
              className={`px-2 py-1 rounded text-sm transition-colors ${tool === 'select' ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
            >
              ↖ Select
            </button>
            <button
              onClick={() => setTool('zone')}
              title="Paint zone"
              className={`px-2 py-1 rounded text-sm transition-colors ${tool === 'zone' ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
            >
              🎨 Zone
            </button>
          </div>

          <div className="h-4 w-px bg-white/10" />

          {/* Undo / Redo */}
          <button onClick={undo} disabled={historyIdx <= 0} title="Undo (⌘Z)" className="px-2 py-1 rounded text-sm text-white/50 hover:text-white hover:bg-white/5 disabled:opacity-30">↩ Undo</button>
          <button onClick={redo} disabled={historyIdx >= history.length - 1} title="Redo (⌘⇧Z)" className="px-2 py-1 rounded text-sm text-white/50 hover:text-white hover:bg-white/5 disabled:opacity-30">↪ Redo</button>

          <div className="h-4 w-px bg-white/10" />

          {/* Selection actions */}
          {selectedTile && (
            <>
              <button onClick={rotateSelected} title="Rotate 90° (R)" className="px-2 py-1 rounded text-sm text-white/70 hover:text-white hover:bg-white/5">⟳ Rotate</button>
              <button onClick={() => setShowColorPicker(p => !p)} title="Change color" className="flex items-center gap-1 px-2 py-1 rounded text-sm text-white/70 hover:text-white hover:bg-white/5">
                <span className="w-3 h-3 rounded-full border border-white/30" style={{ background: selectedTile.primaryColor ?? selectedAsset?.defaultColor ?? '#888' }} />
                Color
              </button>
              {selectedAsset?.assignable && (
                <button onClick={() => setShowAgentPicker(p => !p)} className="px-2 py-1 rounded text-sm text-white/70 hover:text-white hover:bg-white/5">👤 Agent</button>
              )}
              <button onClick={deleteSelected} title="Delete (Del)" className="px-2 py-1 rounded text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20">✕ Delete</button>
              <div className="h-4 w-px bg-white/10" />
            </>
          )}

          {/* Zoom */}
          <span className="text-xs text-white/40">{Math.round(scale * 100)}%</span>
          <button onClick={() => { setScale(0.9); setOffset({ x: 20, y: 20 }) }} className="text-xs text-white/40 hover:text-white/70 px-1">Reset</button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Save / Export */}
          <button onClick={exportJSON} className="px-2 py-1 rounded text-xs text-white/50 hover:text-white hover:bg-white/5">⬇ Export</button>
          <button onClick={importJSON} className="px-2 py-1 rounded text-xs text-white/50 hover:text-white hover:bg-white/5">⬆ Import</button>
          <button
            onClick={saveToServer}
            disabled={saving}
            className="px-3 py-1 rounded text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition-colors"
          >
            {saving ? 'Saving…' : saveMsg || 'Save'}
          </button>
        </div>

        {/* Zone toolbar (visible when zone tool active) */}
        {tool === 'zone' && (
          <div className="flex items-center gap-3 px-4 py-1.5 bg-[#1a1f2e] border-b border-white/10 text-sm">
            <span className="text-white/50 text-xs">Zone name:</span>
            <input
              value={zoneName}
              onChange={e => setZoneName(e.target.value)}
              className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-sm text-white w-36 focus:outline-none"
            />
            <span className="text-white/50 text-xs">Color:</span>
            {['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6'].map(c => (
              <button
                key={c}
                onClick={() => setZoneColor(c)}
                className={`w-5 h-5 rounded-full border-2 transition-all ${zoneColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                style={{ background: c }}
              />
            ))}
            <span className="text-white/40 text-xs ml-2">Click & drag on grid to paint</span>
          </div>
        )}

        {/* Konva Stage */}
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden cursor-crosshair"
          style={{ cursor: placingAsset ? 'copy' : tool === 'zone' ? 'crosshair' : 'default' }}
        >
          <Stage
            ref={stageRef}
            width={stageSize.w}
            height={stageSize.h}
            scaleX={scale}
            scaleY={scale}
            x={offset.x}
            y={offset.y}
            onWheel={handleWheel}
            draggable={tool === 'select' && !placingAsset}
            onDragMove={(e: Konva.KonvaEventObject<DragEvent>) => setOffset({ x: e.target.x(), y: e.target.y() })}
            onClick={handleStageClick}
          >
            {/* Layer 1: Floor + Zones + Grid */}
            <Layer>
              {/* Floor background */}
              <Rect
                x={0} y={0}
                width={GRID_W * TILE_PX}
                height={GRID_H * TILE_PX}
                fill="#1e2435"
                listening={false}
              />
              {/* Zone paint */}
              {zoneRects}
              {/* Grid lines */}
              {gridLines}
            </Layer>

            {/* Layer 2: Furniture */}
            <Layer onClick={handleStageBackgroundClick}>
              {layout.tiles.map(t => {
                const asset = assetMap.get(t.assetId)
                if (!asset) return null
                return (
                  <FurnitureTileWrapper
                    key={t.id}
                    tile={t}
                    asset={asset}
                    tileSize={TILE_PX}
                    isSelected={t.id === selectedTileId}
                    onSelect={handleTileSelect}
                    onDragEnd={handleTileDragEnd}
                  />
                )
              })}
            </Layer>
          </Stage>
        </div>
      </div>

      {/* ── Right Panel: Selection Inspector ─────────────────────────────── */}
      {selectedTile && selectedAsset && (
        <div className="w-60 border-l border-white/10 bg-[#151922] flex flex-col overflow-y-auto shrink-0">
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-xs text-white/40 uppercase tracking-wider">Selected</p>
            <p className="text-sm font-medium text-white mt-0.5 truncate">{selectedAsset.name}</p>
            <p className="text-xs text-white/40">{selectedAsset.size[0] * 0.5}m × {selectedAsset.size[1] * 0.5}m</p>
          </div>

          {/* Label */}
          <div className="px-4 py-3 border-b border-white/10">
            <label className="text-xs text-white/40 block mb-1">Label</label>
            <input
              type="text"
              value={selectedTile.label ?? ''}
              onChange={e => updateSelectedTile({ label: e.target.value || undefined })}
              placeholder="e.g. Moe's Desk"
              className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30"
            />
          </div>

          {/* Rotation */}
          <div className="px-4 py-3 border-b border-white/10">
            <label className="text-xs text-white/40 block mb-2">Rotation</label>
            <div className="flex gap-1">
              {[0, 90, 180, 270].map(r => (
                <button
                  key={r}
                  onClick={() => updateSelectedTile({ rotation: r })}
                  className={`flex-1 py-1 rounded text-xs transition-colors ${selectedTile.rotation === r ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}
                >
                  {r}°
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div className="px-4 py-3 border-b border-white/10">
            <label className="text-xs text-white/40 block mb-2">Color</label>
            <div className="grid grid-cols-4 gap-1.5 mb-2">
              {COLOR_PRESETS.map(c => (
                <button
                  key={c}
                  onClick={() => updateSelectedTile({ primaryColor: c })}
                  className={`w-full aspect-square rounded border-2 transition-all ${
                    (selectedTile.primaryColor ?? selectedAsset.defaultColor) === c
                      ? 'border-white scale-110'
                      : 'border-transparent hover:border-white/40'
                  }`}
                  style={{ background: c }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-white/40">Custom:</label>
              <input
                type="color"
                value={selectedTile.primaryColor ?? selectedAsset.defaultColor}
                onChange={e => updateSelectedTile({ primaryColor: e.target.value })}
                className="h-7 w-full rounded cursor-pointer"
              />
            </div>
            <button
              onClick={() => updateSelectedTile({ primaryColor: undefined })}
              className="mt-1 text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              ↺ Reset to default
            </button>
          </div>

          {/* Agent assignment */}
          {selectedAsset.assignable && (
            <div className="px-4 py-3 border-b border-white/10">
              <label className="text-xs text-white/40 block mb-2">Assigned Agent</label>
              <select
                value={selectedTile.assignedAgentId ?? ''}
                onChange={e => updateSelectedTile({ assignedAgentId: e.target.value || undefined })}
                className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-white/30"
              >
                <option value="">— None —</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              {selectedTile.assignedAgentId && (
                <p className="mt-1 text-xs text-indigo-400">
                  {agents.find(a => a.id === selectedTile.assignedAgentId)?.name ?? 'Unknown'}
                </p>
              )}
            </div>
          )}

          {/* Quick actions */}
          <div className="px-4 py-3">
            <button
              onClick={rotateSelected}
              className="w-full py-1.5 rounded bg-white/5 hover:bg-white/10 text-sm text-white/70 hover:text-white transition-colors mb-2"
            >
              ⟳ Rotate 90°
            </button>
            <button
              onClick={deleteSelected}
              className="w-full py-1.5 rounded bg-red-900/20 hover:bg-red-900/40 text-sm text-red-400 hover:text-red-300 transition-colors"
            >
              ✕ Remove
            </button>
          </div>
        </div>
      )}

      {/* ── Templates Modal ───────────────────────────────────────────────── */}
      {showTemplates && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setShowTemplates(false)}>
          <div className="bg-[#1a2035] border border-white/10 rounded-xl p-6 w-[640px] max-h-[80vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Starter Templates</h2>
              <button onClick={() => setShowTemplates(false)} className="text-white/40 hover:text-white text-lg">✕</button>
            </div>
            <p className="text-sm text-white/50 mb-5">Choose a layout to start from. You can customise everything after loading.</p>
            <div className="grid grid-cols-2 gap-3">
              {OFFICE_TEMPLATES.map(tpl => (
                <button
                  key={tpl.id}
                  onClick={() => applyTemplate(tpl.id)}
                  className="text-left p-4 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all"
                >
                  <div className="text-2xl mb-2">{tpl.emoji}</div>
                  <div className="font-medium text-white text-sm">{tpl.name}</div>
                  <div className="text-xs text-white/40 mt-1">{tpl.description}</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-900/50 text-indigo-300">
                      ~{tpl.capacity} people
                    </span>
                    {tpl.tags.slice(0, 2).map(tag => (
                      <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-white/5 text-white/40">{tag}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
            <p className="mt-4 text-xs text-white/30 text-center">⚠ Loading a template will replace your current layout (undo available)</p>
          </div>
        </div>
      )}
    </div>
  )
}
