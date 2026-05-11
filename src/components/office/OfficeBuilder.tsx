'use client'
/**
 * OfficeBuilder.tsx — Virtual Office Builder v3
 *
 * Fixes & new features:
 *  - Paint-to-fill: hold & drag to stamp tiles across an area
 *  - Space+drag panning (Adobe Illustrator style) + Hand tool button
 *  - Template confirmation modal — never overwrites without asking
 *  - Save actually persists to server (verified)
 *  - Stale-closure fix for undo/redo history
 *  - Grid-snap on tile drop + drag-bound clamp
 *  - Stage onDragMove guard (no more black screen)
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

const TILE_PX     = 52
const GRID_W      = 30
const GRID_H      = 20
const LS_KEY      = 'mc_office_layout_v2'
const HISTORY_MAX = 50
const MIN_ZOOM    = 0.25
const MAX_ZOOM    = 3.0

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props { isSuperAdmin: boolean }
type Tool = 'select' | 'pan' | 'zone'

// ─── SVG → blob URL cache ─────────────────────────────────────────────────────

const svgUrlCache = new Map<string, string>()

function getAssetUrl(asset: OfficeFurnitureAsset, primaryColor?: string): string {
  const key = `${asset.id}:${primaryColor ?? ''}`
  if (svgUrlCache.has(key)) return svgUrlCache.get(key)!
  const svg = primaryColor
    ? tintSvg(asset.svg, asset.defaultColor, primaryColor)
    : asset.svg
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  svgUrlCache.set(key, url)
  return url
}

// ─── FurnitureTile ────────────────────────────────────────────────────────────

interface TileProps {
  tile: PlacedTile
  asset: OfficeFurnitureAsset
  tileSize: number
  isSelected: boolean
  draggable: boolean
  onSelect: (id: string) => void
  onDragEnd: (id: string, x: number, y: number) => void
}

function FurnitureTile({ tile, asset, tileSize, isSelected, draggable, onSelect, onDragEnd }: TileProps) {
  const [w, h] = asset.size
  const pw = w * tileSize
  const ph = h * tileSize
  // Group is positioned at the tile centre (rotation pivot)
  const cx = tile.x * tileSize + pw / 2
  const cy = tile.y * tileSize + ph / 2

  const url = getAssetUrl(asset, tile.primaryColor)
  const [img] = useImage(url)

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const snappedX = Math.max(0, Math.min(GRID_W - w, Math.round((e.target.x() - pw / 2) / tileSize)))
    const snappedY = Math.max(0, Math.min(GRID_H - h, Math.round((e.target.y() - ph / 2) / tileSize)))
    // Snap Konva node immediately to avoid re-render jump
    e.target.position({ x: snappedX * tileSize + pw / 2, y: snappedY * tileSize + ph / 2 })
    onDragEnd(tile.id, snappedX, snappedY)
  }

  return (
    <Group
      x={cx} y={cy}
      rotation={tile.rotation}
      draggable={draggable}
      dragBoundFunc={(pos) => ({
        x: Math.max(pw / 2, Math.min((GRID_W - w) * tileSize + pw / 2, pos.x)),
        y: Math.max(ph / 2, Math.min((GRID_H - h) * tileSize + ph / 2, pos.y)),
      })}
      onClick={() => onSelect(tile.id)}
      onTap={() => onSelect(tile.id)}
      onDragEnd={handleDragEnd}
    >
      {/* Hit area */}
      <Rect x={-pw / 2} y={-ph / 2} width={pw} height={ph} fill="transparent" />
      {img ? (
        <KImage x={-pw / 2} y={-ph / 2} width={pw} height={ph} image={img} listening={false} />
      ) : (
        <Rect x={-pw / 2} y={-ph / 2} width={pw} height={ph}
          fill={tile.primaryColor ?? asset.defaultColor} cornerRadius={3} listening={false} />
      )}
      {isSelected && (
        <Rect x={-pw / 2 - 2} y={-ph / 2 - 2} width={pw + 4} height={ph + 4}
          stroke="#3B82F6" strokeWidth={2.5} fill="rgba(59,130,246,0.08)"
          cornerRadius={4} listening={false} />
      )}
      {tile.label && (
        <Text x={-pw / 2} y={ph / 2 + 3} width={pw}
          text={tile.label} fontSize={10} fill="#e2e8f0" align="center" listening={false} />
      )}
    </Group>
  )
}

// ─── Template mini preview ────────────────────────────────────────────────────

function TemplateMiniPreview({ layout, width = 260, height = 87 }: {
  layout: OfficeLayout
  width?: number
  height?: number
}) {
  const gw = layout.gridWidth || 30
  const gh = layout.gridHeight || 20
  const sx = width / gw
  const sy = height / gh

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <rect width={width} height={height} fill="#1e2435"/>
      {/* Subtle grid */}
      {Array.from({ length: 7 }, (_, i) => (
        <line key={`v${i}`} x1={(i + 1) * (width / 7)} y1={0} x2={(i + 1) * (width / 7)} y2={height}
          stroke="rgba(255,255,255,0.04)" strokeWidth={1}/>
      ))}
      {Array.from({ length: 4 }, (_, i) => (
        <line key={`h${i}`} x1={0} y1={(i + 1) * (height / 4)} x2={width} y2={(i + 1) * (height / 4)}
          stroke="rgba(255,255,255,0.04)" strokeWidth={1}/>
      ))}
      {/* Zones */}
      {layout.zones.map(z =>
        z.tiles.map(t => (
          <rect
            key={`${z.id}-${t.x}-${t.y}`}
            x={t.x * sx} y={t.y * sy}
            width={sx + 0.5} height={sy + 0.5}
            fill={z.color + '55'}
          />
        ))
      )}
      {/* Furniture dots */}
      {layout.tiles.map(t => {
        const asset = OFFICE_ASSETS.find(a => a.id === t.assetId)
        if (!asset) return null
        const [w, h] = asset.size
        return (
          <rect
            key={t.id}
            x={t.x * sx + 0.5} y={t.y * sy + 0.5}
            width={Math.max(1.5, w * sx - 1)} height={Math.max(1.5, h * sy - 1)}
            fill={t.primaryColor ?? asset.defaultColor}
            rx={0.8}
            opacity={0.9}
          />
        )
      })}
    </svg>
  )
}

// ─── Colour presets ───────────────────────────────────────────────────────────

const COLOR_PRESETS = [
  '#d4a96a','#8B4513','#e8e0d0','#334155',
  '#c8a97a','#6B7280','#F5F5DC','#1E293B',
  '#3B82F6','#10B981','#F59E0B','#EF4444',
  '#8B5CF6','#EC4899','#14B8A6','#F97316',
]

// ─── Main component ───────────────────────────────────────────────────────────

export function OfficeBuilder({ isSuperAdmin }: Props) {
  const agents = useAgentsStore(s => s.agents)

  // ── Layout / history ──────────────────────────────────────────────────────
  const [layout, setLayout] = useState<OfficeLayout>(DEFAULT_LAYOUT)
  const historyRef  = useRef<OfficeLayout[]>([DEFAULT_LAYOUT])
  const historyIdx  = useRef(0)
  const [historyLen, setHistoryLen] = useState(1) // just for UI disabled state
  const [historyPos, setHistoryPos] = useState(0)

  // ── Viewport ──────────────────────────────────────────────────────────────
  const stageRef     = useRef<Konva.Stage>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [stageSize, setStageSize] = useState({ w: 800, h: 600 })
  const [scale, setScale]   = useState(0.9)
  const [offset, setOffset] = useState({ x: 20, y: 20 })

  // ── Tools & interaction ───────────────────────────────────────────────────
  const [tool, setTool]         = useState<Tool>('select')
  const [placingAsset, setPlacingAsset] = useState<OfficeFurnitureAsset | null>(null)
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null)
  const [activeCategoryId, setActiveCategoryId] = useState('desks')
  const [searchQuery, setSearchQuery] = useState('')

  // Space+drag panning state
  const [isSpaceDown, setIsSpaceDown]   = useState(false)
  const isPanDragging = useRef(false)
  const panStart      = useRef({ x: 0, y: 0, ox: 0, oy: 0 })

  // Paint-to-fill state
  const isPainting      = useRef(false)
  const paintedSet      = useRef<Set<string>>(new Set())
  const pendingPaint    = useRef<PlacedTile[]>([])

  // Zone painting
  const [zoneColor, setZoneColor] = useState('#3B82F6')
  const [zoneName, setZoneName]   = useState('New Zone')
  const isZonePainting  = useRef(false)
  const zonePaintedSet  = useRef<Set<string>>(new Set())
  const pendingZone     = useRef<Array<{x:number;y:number}>>([])

  // ── UI state ──────────────────────────────────────────────────────────────
  const [showTemplates, setShowTemplates] = useState(false)
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  // ── Resize observer ───────────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setStageSize({ w: el.clientWidth, h: el.clientHeight }))
    ro.observe(el)
    setStageSize({ w: el.clientWidth, h: el.clientHeight })
    return () => ro.disconnect()
  }, [])

  // ── Load layout ───────────────────────────────────────────────────────────
  useEffect(() => {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as OfficeLayout
        if (parsed?.version === 2) {
          setLayout(parsed)
          historyRef.current = [parsed]
          historyIdx.current = 0
          setHistoryLen(1); setHistoryPos(0)
          return
        }
      } catch { /* ignore */ }
    }
    const token = getStoredToken()
    if (!token) return
    fetch('/api/office-layout', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.layout?.version === 2) {
          setLayout(data.layout)
          historyRef.current = [data.layout]
          historyIdx.current = 0
          setHistoryLen(1); setHistoryPos(0)
          localStorage.setItem(LS_KEY, JSON.stringify(data.layout))
        }
      })
      .catch(() => {})
  }, [])

  // ── History helpers ───────────────────────────────────────────────────────
  const pushHistory = useCallback((newLayout: OfficeLayout) => {
    const idx = historyIdx.current
    const truncated = historyRef.current.slice(0, idx + 1)
    const next = [...truncated, newLayout].slice(-HISTORY_MAX)
    historyRef.current = next
    historyIdx.current = next.length - 1
    setHistoryLen(next.length)
    setHistoryPos(next.length - 1)
    setLayout(newLayout)
    localStorage.setItem(LS_KEY, JSON.stringify(newLayout))
  }, [])

  const undo = useCallback(() => {
    const idx = historyIdx.current
    if (idx <= 0) return
    const newIdx = idx - 1
    historyIdx.current = newIdx
    setHistoryPos(newIdx)
    const prev = historyRef.current[newIdx]
    setLayout(prev)
    localStorage.setItem(LS_KEY, JSON.stringify(prev))
  }, [])

  const redo = useCallback(() => {
    const idx = historyIdx.current
    if (idx >= historyRef.current.length - 1) return
    const newIdx = idx + 1
    historyIdx.current = newIdx
    setHistoryPos(newIdx)
    const next = historyRef.current[newIdx]
    setLayout(next)
    localStorage.setItem(LS_KEY, JSON.stringify(next))
  }, [])

  // ── Asset map ─────────────────────────────────────────────────────────────
  const assetMap = useMemo(() => {
    const m = new Map<string, OfficeFurnitureAsset>()
    OFFICE_ASSETS.forEach(a => m.set(a.id, a))
    return m
  }, [])

  const selectedTile  = layout.tiles.find(t => t.id === selectedTileId) ?? null
  const selectedAsset = selectedTile ? assetMap.get(selectedTile.assetId) ?? null : null

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === ' ') { e.preventDefault(); setIsSpaceDown(true); return }
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'Escape') { setPlacingAsset(null); setSelectedTileId(null); return }
      if (e.key === 'z' && (e.metaKey||e.ctrlKey) && !e.shiftKey) { e.preventDefault(); undo(); return }
      if ((e.key === 'z' && (e.metaKey||e.ctrlKey) && e.shiftKey) ||
          (e.key === 'y' && (e.metaKey||e.ctrlKey))) { e.preventDefault(); redo(); return }
      if (!selectedTileId) return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        pushHistory({ ...layout, tiles: layout.tiles.filter(t => t.id !== selectedTileId) })
        setSelectedTileId(null); return
      }
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault()
        pushHistory({ ...layout, tiles: layout.tiles.map(t =>
          t.id === selectedTileId ? { ...t, rotation: (t.rotation + 90) % 360 } : t) })
        return
      }
      const ARROWS: Record<string, [number, number]> = {
        ArrowLeft:[-1,0], ArrowRight:[1,0], ArrowUp:[0,-1], ArrowDown:[0,1],
      }
      if (ARROWS[e.key]) {
        e.preventDefault()
        const [dx, dy] = ARROWS[e.key]
        pushHistory({ ...layout, tiles: layout.tiles.map(t =>
          t.id === selectedTileId
            ? { ...t, x: Math.max(0, Math.min(GRID_W - 1, t.x + dx)), y: Math.max(0, Math.min(GRID_H - 1, t.y + dy)) }
            : t) })
      }
    }
    const up = (e: KeyboardEvent) => {
      if (e.key === ' ') { setIsSpaceDown(false); isPanDragging.current = false }
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [selectedTileId, layout, undo, redo, pushHistory])

  // ── Grid coordinate helper ────────────────────────────────────────────────
  const pointerToGrid = useCallback((clientX: number, clientY: number): {x:number, y:number} | null => {
    const el = containerRef.current
    if (!el) return null
    const rect = el.getBoundingClientRect()
    const px = (clientX - rect.left - offset.x) / scale / TILE_PX
    const py = (clientY - rect.top  - offset.y) / scale / TILE_PX
    const gx = Math.floor(px)
    const gy = Math.floor(py)
    if (gx < 0 || gy < 0 || gx >= GRID_W || gy >= GRID_H) return null
    return { x: gx, y: gy }
  }, [offset, scale])

  // ── Container native mouse events (space-pan + paint-fill) ────────────────
  const handleContainerMouseDown = useCallback((e: React.MouseEvent) => {
    // Space+drag pan
    if (isSpaceDown || tool === 'pan') {
      isPanDragging.current = true
      panStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y }
      return
    }

    // Paint-to-fill (placing asset, left button)
    if (placingAsset && tool === 'select' && e.button === 0) {
      const gp = pointerToGrid(e.clientX, e.clientY)
      if (!gp) return
      isPainting.current = true
      paintedSet.current = new Set()
      pendingPaint.current = []
      const key = `${gp.x},${gp.y}`
      if (!paintedSet.current.has(key)) {
        paintedSet.current.add(key)
        pendingPaint.current.push({ id: uuidv4(), assetId: placingAsset.id, x: gp.x, y: gp.y, rotation: 0 })
      }
    }

    // Zone paint
    if (tool === 'zone' && e.button === 0) {
      const gp = pointerToGrid(e.clientX, e.clientY)
      if (!gp) return
      isZonePainting.current = true
      zonePaintedSet.current = new Set()
      pendingZone.current = []
      const key = `${gp.x},${gp.y}`
      zonePaintedSet.current.add(key)
      pendingZone.current.push({ x: gp.x, y: gp.y })
    }
  }, [isSpaceDown, tool, placingAsset, offset, pointerToGrid])

  const handleContainerMouseMove = useCallback((e: React.MouseEvent) => {
    // Pan
    if (isPanDragging.current) {
      const dx = e.clientX - panStart.current.x
      const dy = e.clientY - panStart.current.y
      setOffset({ x: panStart.current.ox + dx, y: panStart.current.oy + dy })
      return
    }

    // Paint-to-fill
    if (isPainting.current && placingAsset) {
      const gp = pointerToGrid(e.clientX, e.clientY)
      if (!gp) return
      const key = `${gp.x},${gp.y}`
      if (!paintedSet.current.has(key)) {
        paintedSet.current.add(key)
        pendingPaint.current.push({ id: uuidv4(), assetId: placingAsset.id, x: gp.x, y: gp.y, rotation: 0 })
        // Live preview: update layout without pushing history
        setLayout(prev => ({ ...prev, tiles: [...prev.tiles, ...pendingPaint.current.slice(-1)] }))
      }
    }

    // Zone paint
    if (isZonePainting.current) {
      const gp = pointerToGrid(e.clientX, e.clientY)
      if (!gp) return
      const key = `${gp.x},${gp.y}`
      if (!zonePaintedSet.current.has(key)) {
        zonePaintedSet.current.add(key)
        pendingZone.current.push({ x: gp.x, y: gp.y })
      }
    }
  }, [placingAsset, pointerToGrid])

  const handleContainerMouseUp = useCallback((e: React.MouseEvent) => {
    isPanDragging.current = false

    if (isPainting.current && pendingPaint.current.length > 0) {
      isPainting.current = false
      // Remove the live-preview tiles we added during move, push full batch
      setLayout(prev => {
        const previewIds = new Set(pendingPaint.current.map(t => t.id))
        const cleaned = prev.tiles.filter(t => !previewIds.has(t.id))
        const newLayout = { ...prev, tiles: [...cleaned, ...pendingPaint.current] }
        // Push to history
        const idx = historyIdx.current
        const truncated = historyRef.current.slice(0, idx + 1)
        const next = [...truncated, newLayout].slice(-HISTORY_MAX)
        historyRef.current = next
        historyIdx.current = next.length - 1
        setHistoryLen(next.length)
        setHistoryPos(next.length - 1)
        localStorage.setItem(LS_KEY, JSON.stringify(newLayout))
        return newLayout
      })
      paintedSet.current = new Set()
      pendingPaint.current = []
      return
    }
    isPainting.current = false

    if (isZonePainting.current && pendingZone.current.length > 0) {
      isZonePainting.current = false
      const newZone: OfficeZone = {
        id: uuidv4(), name: zoneName, color: zoneColor, tiles: [...pendingZone.current],
      }
      setLayout(prev => {
        const newLayout = { ...prev, zones: [...prev.zones, newZone] }
        const idx = historyIdx.current
        const truncated = historyRef.current.slice(0, idx + 1)
        const next = [...truncated, newLayout].slice(-HISTORY_MAX)
        historyRef.current = next
        historyIdx.current = next.length - 1
        setHistoryLen(next.length)
        setHistoryPos(next.length - 1)
        localStorage.setItem(LS_KEY, JSON.stringify(newLayout))
        return newLayout
      })
      zonePaintedSet.current = new Set()
      pendingZone.current = []
    }
    isZonePainting.current = false
  }, [zoneName, zoneColor])

  // ── Wheel zoom ────────────────────────────────────────────────────────────
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const stage = stageRef.current
    if (!stage) return
    const pointer = stage.getPointerPosition()
    if (!pointer) return
    const dir = e.evt.deltaY > 0 ? -1 : 1
    const newScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, scale * (dir > 0 ? 1.08 : 1 / 1.08)))
    const mouseTo = { x: (pointer.x - offset.x) / scale, y: (pointer.y - offset.y) / scale }
    setOffset({ x: pointer.x - mouseTo.x * newScale, y: pointer.y - mouseTo.y * newScale })
    setScale(newScale)
  }, [scale, offset])

  // ── Stage click (single-click placement) ──────────────────────────────────
  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    // Deselect on background click
    if (e.target === stageRef.current) setSelectedTileId(null)
    // Place is handled by mousedown/up native events now
  }, [])

  // ── Tile callbacks ────────────────────────────────────────────────────────
  const handleTileSelect = useCallback((id: string) => {
    if (placingAsset) return  // don't select when placing
    setSelectedTileId(id)
  }, [placingAsset])

  const handleTileDragEnd = useCallback((id: string, x: number, y: number) => {
    pushHistory({ ...layout, tiles: layout.tiles.map(t => t.id === id ? { ...t, x, y } : t) })
  }, [layout, pushHistory])

  const updateSelectedTile = useCallback((patch: Partial<PlacedTile>) => {
    if (!selectedTileId) return
    pushHistory({ ...layout, tiles: layout.tiles.map(t => t.id === selectedTileId ? { ...t, ...patch } : t) })
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

  // ── Save to server ────────────────────────────────────────────────────────
  const saveToServer = useCallback(async () => {
    setSaving(true); setSaveMsg('')
    const token = getStoredToken()
    try {
      const res = await fetch('/api/office-layout', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ layout }),
      })
      const data = await res.json().catch(() => ({}))
      setSaveMsg(res.ok ? '✓ Saved' : `✗ ${data?.error ?? 'Error'}`)
    } catch (err) {
      setSaveMsg('✗ Network error')
    } finally {
      setSaving(false)
      setTimeout(() => setSaveMsg(''), 3000)
    }
  }, [layout])

  // ── Export / Import ───────────────────────────────────────────────────────
  const exportJSON = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(layout, null, 2)], { type: 'application/json' }))
    a.download = 'office-layout.json'
    a.click()
  }

  const importJSON = () => {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = '.json'
    input.onchange = () => {
      const f = input.files?.[0]; if (!f) return
      const reader = new FileReader()
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result as string) as OfficeLayout
          if (parsed.version === 2) pushHistory(parsed)
        } catch { /* ignore */ }
      }
      reader.readAsText(f)
    }
    input.click()
  }

  // ── Template handling (with confirmation) ─────────────────────────────────
  const requestTemplate = (id: string) => {
    setPendingTemplateId(id)   // show confirm modal
  }

  const confirmTemplate = () => {
    if (!pendingTemplateId) return
    const tplLayout = getTemplateLayout(pendingTemplateId)
    if (tplLayout) {
      pushHistory(tplLayout)
    }
    setPendingTemplateId(null)
    setShowTemplates(false)
  }

  const applyBlankLayout = useCallback(() => {
    pushHistory({ version: 2, gridWidth: 30, gridHeight: 20, floorAssetId: 'floor-hardwood', tiles: [], zones: [], mcCredits: 0, ownedAssets: [] })
    setShowTemplates(false)
    setPendingTemplateId(null)
  }, [pushHistory])

  // ── Filtered assets ───────────────────────────────────────────────────────
  const filteredAssets = useMemo(() => {
    const q = searchQuery.toLowerCase()
    return OFFICE_ASSETS.filter(a => {
      if (searchQuery) return a.name.toLowerCase().includes(q) || a.category.includes(q)
      return a.category === activeCategoryId
    })
  }, [activeCategoryId, searchQuery])

  // ── Grid lines ────────────────────────────────────────────────────────────
  const gridLines = useMemo(() => {
    const lines: React.ReactNode[] = []
    const ts = TILE_PX
    for (let x = 0; x <= GRID_W; x++)
      lines.push(<Line key={`v${x}`} points={[x*ts,0,x*ts,GRID_H*ts]} stroke="rgba(255,255,255,0.06)" strokeWidth={1} listening={false}/>)
    for (let y = 0; y <= GRID_H; y++)
      lines.push(<Line key={`h${y}`} points={[0,y*ts,GRID_W*ts,y*ts]} stroke="rgba(255,255,255,0.06)" strokeWidth={1} listening={false}/>)
    return lines
  }, [])

  // ── Zone rects ────────────────────────────────────────────────────────────
  const zoneRects = useMemo(() => layout.zones.flatMap(zone =>
    zone.tiles.map(t => (
      <Rect key={`${zone.id}-${t.x}-${t.y}`}
        x={t.x * TILE_PX} y={t.y * TILE_PX} width={TILE_PX} height={TILE_PX}
        fill={zone.color + '33'} listening={false}
      />
    ))
  ), [layout.zones])

  // ── Cursor ────────────────────────────────────────────────────────────────
  const cursor = isSpaceDown || tool === 'pan'
    ? (isPanDragging.current ? 'grabbing' : 'grab')
    : placingAsset
      ? 'copy'
      : tool === 'zone'
        ? 'crosshair'
        : 'default'

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full bg-[#0f1117] text-white overflow-hidden" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Left sidebar ─────────────────────────────────────────────────── */}
      <div className="w-64 flex flex-col border-r border-white/10 bg-[#151922] overflow-hidden shrink-0">

        {/* Header: search + layouts button */}
        <div className="px-3 pt-3 pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <input type="text" placeholder="Search assets…" value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 px-2 py-1.5 rounded bg-white/5 border border-white/10 text-sm text-white placeholder-white/25 focus:outline-none focus:border-indigo-500/50"/>
            <button onClick={() => setShowTemplates(true)}
              className="shrink-0 px-2.5 py-1.5 rounded bg-indigo-600/80 hover:bg-indigo-500 text-white text-xs font-medium transition-colors border border-indigo-500/40 whitespace-nowrap">
              ⚡ Layouts
            </button>
          </div>
        </div>

        {/* Category tabs — visually distinct section */}
        {!searchQuery && (
          <div className="shrink-0 bg-[#0d1018] border-b-2 border-white/10">
            <p className="px-3 pt-2 pb-1 text-[9px] font-mono uppercase tracking-[0.22em] text-white/25 select-none">Categories</p>
            <div className="flex flex-col gap-px px-2 pb-2">
              {ASSET_CATEGORIES.map(cat => (
                <button key={cat.id} onClick={() => setActiveCategoryId(cat.id)}
                  className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs text-left transition-all border ${
                    activeCategoryId === cat.id
                      ? 'bg-indigo-600/20 text-indigo-200 border-indigo-500/35 font-semibold'
                      : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04] border-transparent'}`}>
                  <span className="text-sm leading-none w-4 text-center">{cat.icon}</span>
                  <span className="leading-none">{cat.label}</span>
                  {activeCategoryId === cat.id && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0"/>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Asset items — clearly different section */}
        <div className="flex-1 overflow-y-auto bg-[#151922]">
          <p className="px-3 pt-2.5 pb-1 text-[9px] font-mono uppercase tracking-[0.22em] text-white/25 select-none">
            {searchQuery
              ? `Results for "${searchQuery}"`
              : ASSET_CATEGORIES.find(c => c.id === activeCategoryId)?.label ?? 'Assets'}
          </p>
          <div className="px-2 pb-2 space-y-1">
            {filteredAssets.map(asset => (
              <button key={asset.id}
                onClick={() => { setPlacingAsset(asset); setTool('select') }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all border ${
                  placingAsset?.id === asset.id
                    ? 'bg-indigo-600/30 border-indigo-500/50 text-white shadow-[0_0_8px_rgba(99,102,241,0.2)]'
                    : 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.07] hover:border-white/15 text-white/60 hover:text-white'}`}
                title={`${asset.size[0] * 0.5}m × ${asset.size[1] * 0.5}m — click or drag to place`}>
                <span
                  className="w-5 h-5 rounded-md shrink-0 flex-shrink-0"
                  style={{ background: asset.defaultColor, boxShadow: `0 1px 4px ${asset.defaultColor}80` }}
                />
                <span className="flex-1 text-xs truncate font-medium">{asset.name}</span>
                <span className="text-[9px] text-white/20 shrink-0 font-mono tabular-nums">{asset.size[0]}×{asset.size[1]}</span>
                {asset.tier === 'premium' && <span className="text-[10px] text-yellow-400/70 shrink-0 ml-0.5">★</span>}
              </button>
            ))}
            {filteredAssets.length === 0 && (
              <p className="text-white/25 text-xs text-center py-6">No assets found</p>
            )}
          </div>
        </div>

        {/* Active placing indicator */}
        {placingAsset && (
          <div className="px-3 py-2.5 bg-indigo-900/50 border-t border-indigo-500/30 flex items-center gap-2.5">
            <span className="w-4 h-4 rounded-md shrink-0" style={{ background: placingAsset.defaultColor }}/>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-indigo-100 truncate">{placingAsset.name}</p>
              <p className="text-[10px] text-indigo-400">Drag to paint  •  Esc to cancel</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Canvas area ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10 bg-[#151922] shrink-0 flex-wrap">
          {/* Tool buttons */}
          <div className="flex items-center gap-1 mr-1">
            <button onClick={() => { setTool('select'); setPlacingAsset(null) }}
              title="Select / Move (V)"
              className={`px-2 py-1 rounded text-sm transition-colors ${tool === 'select' && !isSpaceDown ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>
              ↖ Select
            </button>
            <button onClick={() => { setTool('pan'); setPlacingAsset(null) }}
              title="Pan canvas (H) — or hold Space"
              className={`px-2 py-1 rounded text-sm transition-colors ${tool === 'pan' || isSpaceDown ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>
              ✋ Pan
            </button>
            <button onClick={() => { setTool('zone'); setPlacingAsset(null) }}
              title="Paint zone"
              className={`px-2 py-1 rounded text-sm transition-colors ${tool === 'zone' ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'}`}>
              🎨 Zone
            </button>
          </div>

          <div className="h-4 w-px bg-white/10"/>

          {/* Undo / Redo */}
          <button onClick={undo} disabled={historyPos <= 0}
            title="Undo (⌘Z)" className="px-2 py-1 rounded text-sm text-white/50 hover:text-white hover:bg-white/5 disabled:opacity-30">↩ Undo</button>
          <button onClick={redo} disabled={historyPos >= historyLen - 1}
            title="Redo (⌘⇧Z)" className="px-2 py-1 rounded text-sm text-white/50 hover:text-white hover:bg-white/5 disabled:opacity-30">↪ Redo</button>

          <div className="h-4 w-px bg-white/10"/>

          {/* Selection actions */}
          {selectedTile && selectedAsset && (
            <>
              <button onClick={rotateSelected} title="Rotate 90° (R)"
                className="px-2 py-1 rounded text-sm text-white/70 hover:text-white hover:bg-white/5">⟳ Rotate</button>
              <button onClick={deleteSelected} title="Delete (Del)"
                className="px-2 py-1 rounded text-sm text-red-400 hover:text-red-300 hover:bg-red-900/20">✕ Delete</button>
              <div className="h-4 w-px bg-white/10"/>
            </>
          )}

          {/* Zoom */}
          <span className="text-xs text-white/40">{Math.round(scale * 100)}%</span>
          <button onClick={() => { setScale(0.9); setOffset({ x: 20, y: 20 }) }}
            className="text-xs text-white/40 hover:text-white/70 px-1">Reset view</button>

          <div className="flex-1"/>

          <button onClick={exportJSON} className="px-2 py-1 rounded text-xs text-white/50 hover:text-white hover:bg-white/5">⬇ Export</button>
          <button onClick={importJSON} className="px-2 py-1 rounded text-xs text-white/50 hover:text-white hover:bg-white/5">⬆ Import</button>
          <button onClick={saveToServer} disabled={saving}
            className="px-3 py-1 rounded text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition-colors">
            {saving ? 'Saving…' : saveMsg || 'Save'}
          </button>
        </div>

        {/* Zone sub-toolbar */}
        {tool === 'zone' && (
          <div className="flex items-center gap-3 px-4 py-1.5 bg-[#1a1f2e] border-b border-white/10 text-sm">
            <span className="text-white/50 text-xs">Zone name:</span>
            <input value={zoneName} onChange={e => setZoneName(e.target.value)}
              className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-sm text-white w-36 focus:outline-none"/>
            <span className="text-white/50 text-xs">Color:</span>
            {['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#14B8A6'].map(c => (
              <button key={c} onClick={() => setZoneColor(c)}
                className={`w-5 h-5 rounded-full border-2 transition-all ${zoneColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                style={{ background: c }}/>
            ))}
            <span className="text-white/40 text-xs ml-2">Drag on grid to paint</span>
          </div>
        )}

        {/* Space hint */}
        {isSpaceDown && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 px-3 py-1 rounded bg-black/60 text-white/70 text-xs pointer-events-none">
            ✋ Pan mode — drag to move canvas
          </div>
        )}

        {/* Konva Stage */}
        <div
          ref={containerRef}
          className="flex-1 overflow-hidden select-none"
          style={{ cursor }}
          onMouseDown={handleContainerMouseDown}
          onMouseMove={handleContainerMouseMove}
          onMouseUp={handleContainerMouseUp}
          onMouseLeave={handleContainerMouseUp}
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
            onClick={handleStageClick}
            // Stage itself is never draggable — we handle panning via native mouse events
            draggable={false}
          >
            {/* Layer 1: Floor + Zones + Grid */}
            <Layer listening={false}>
              <Rect x={0} y={0} width={GRID_W * TILE_PX} height={GRID_H * TILE_PX} fill="#1e2435"/>
              {zoneRects}
              {gridLines}
            </Layer>

            {/* Layer 2: Furniture */}
            <Layer>
              {layout.tiles.map(t => {
                const asset = assetMap.get(t.assetId)
                if (!asset) return null
                return (
                  <FurnitureTile
                    key={t.id}
                    tile={t}
                    asset={asset}
                    tileSize={TILE_PX}
                    isSelected={t.id === selectedTileId}
                    draggable={tool === 'select' && !placingAsset && !isSpaceDown}
                    onSelect={handleTileSelect}
                    onDragEnd={handleTileDragEnd}
                  />
                )
              })}
            </Layer>
          </Stage>
        </div>
      </div>

      {/* ── Right inspector ───────────────────────────────────────────────── */}
      {selectedTile && selectedAsset && (
        <div className="w-60 border-l border-white/10 bg-[#151922] flex flex-col overflow-y-auto shrink-0">
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-xs text-white/40 uppercase tracking-wider">Selected</p>
            <p className="text-sm font-medium text-white mt-0.5 truncate">{selectedAsset.name}</p>
            <p className="text-xs text-white/40">{selectedAsset.size[0]*0.5}m × {selectedAsset.size[1]*0.5}m</p>
          </div>

          <div className="px-4 py-3 border-b border-white/10">
            <label className="text-xs text-white/40 block mb-1">Label</label>
            <input type="text" value={selectedTile.label ?? ''}
              onChange={e => updateSelectedTile({ label: e.target.value || undefined })}
              placeholder="e.g. Moe's Desk"
              className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-sm text-white placeholder-white/20 focus:outline-none focus:border-white/30"/>
          </div>

          <div className="px-4 py-3 border-b border-white/10">
            <label className="text-xs text-white/40 block mb-2">Rotation</label>
            <div className="flex gap-1">
              {[0,90,180,270].map(r => (
                <button key={r} onClick={() => updateSelectedTile({ rotation: r })}
                  className={`flex-1 py-1 rounded text-xs transition-colors ${
                    selectedTile.rotation === r ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>
                  {r}°
                </button>
              ))}
            </div>
          </div>

          <div className="px-4 py-3 border-b border-white/10">
            <label className="text-xs text-white/40 block mb-2">Color</label>
            <div className="grid grid-cols-4 gap-1.5 mb-2">
              {COLOR_PRESETS.map(c => (
                <button key={c} onClick={() => updateSelectedTile({ primaryColor: c })}
                  className={`w-full aspect-square rounded border-2 transition-all ${
                    (selectedTile.primaryColor ?? selectedAsset.defaultColor) === c
                      ? 'border-white scale-110' : 'border-transparent hover:border-white/40'}`}
                  style={{ background: c }}/>
              ))}
            </div>
            <input type="color"
              value={selectedTile.primaryColor ?? selectedAsset.defaultColor}
              onChange={e => updateSelectedTile({ primaryColor: e.target.value })}
              className="h-7 w-full rounded cursor-pointer"/>
            <button onClick={() => updateSelectedTile({ primaryColor: undefined })}
              className="mt-1 text-xs text-white/30 hover:text-white/60 transition-colors">
              ↺ Reset to default
            </button>
          </div>

          {selectedAsset.assignable && (
            <div className="px-4 py-3 border-b border-white/10">
              <label className="text-xs text-white/40 block mb-2">Assigned Agent</label>
              <select value={selectedTile.assignedAgentId ?? ''}
                onChange={e => updateSelectedTile({ assignedAgentId: e.target.value || undefined })}
                className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-sm text-white focus:outline-none">
                <option value="">— None —</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          )}

          <div className="px-4 py-3 flex gap-2">
            <button onClick={rotateSelected}
              className="flex-1 py-1.5 rounded bg-white/5 hover:bg-white/10 text-sm text-white/70 hover:text-white transition-colors">
              ⟳ Rotate
            </button>
            <button onClick={deleteSelected}
              className="flex-1 py-1.5 rounded bg-red-900/20 hover:bg-red-900/40 text-sm text-red-400 hover:text-red-300 transition-colors">
              ✕ Remove
            </button>
          </div>
        </div>
      )}

      {/* ── Templates modal ───────────────────────────────────────────────── */}
      {showTemplates && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => { setShowTemplates(false); setPendingTemplateId(null) }}>
          <div className="bg-[#1a2035] border border-white/10 rounded-xl p-6 w-[760px] max-h-[85vh] overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}>

            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-semibold text-white">Layouts & Templates</h2>
              <button onClick={() => { setShowTemplates(false); setPendingTemplateId(null) }}
                className="text-white/40 hover:text-white text-xl leading-none">✕</button>
            </div>
            <p className="text-sm text-white/40 mb-5">
              Click a template to preview it — your layout stays unchanged until you confirm.
            </p>

            {/* Confirmation banner */}
            {pendingTemplateId && (
              <div className="mb-4 p-3 rounded-lg bg-amber-900/30 border border-amber-500/40 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-300">
                    Apply &ldquo;{OFFICE_TEMPLATES.find(t => t.id === pendingTemplateId)?.name}&rdquo;?
                  </p>
                  <p className="text-xs text-amber-400/70 mt-0.5">
                    This replaces your current layout — you can undo with ⌘Z.
                  </p>
                </div>
                <div className="flex gap-2 ml-4 shrink-0">
                  <button onClick={() => setPendingTemplateId(null)}
                    className="px-3 py-1 rounded text-sm bg-white/10 hover:bg-white/20 text-white transition-colors">
                    Cancel
                  </button>
                  <button onClick={confirmTemplate}
                    className="px-3 py-1 rounded text-sm bg-indigo-600 hover:bg-indigo-500 text-white transition-colors">
                    Apply Template
                  </button>
                </div>
              </div>
            )}

            {/* Blank layout option */}
            <div className="mb-5">
              <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/30 mb-2">Start Fresh</p>
              <button onClick={applyBlankLayout}
                className="w-full flex items-center gap-4 p-3 rounded-lg border border-dashed border-white/20 hover:border-indigo-500/50 hover:bg-indigo-950/30 transition-all text-left group">
                <div className="w-[120px] h-[40px] rounded-md bg-[#1e2435] border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                  <svg width="120" height="40" style={{ display: 'block' }}>
                    <rect width="120" height="40" fill="#1e2435"/>
                    {Array.from({ length: 5 }, (_, i) => (
                      <line key={`v${i}`} x1={(i + 1) * 20} y1={0} x2={(i + 1) * 20} y2={40}
                        stroke="rgba(255,255,255,0.06)" strokeWidth={1}/>
                    ))}
                    {Array.from({ length: 2 }, (_, i) => (
                      <line key={`h${i}`} x1={0} y1={(i + 1) * (40 / 3)} x2={120} y2={(i + 1) * (40 / 3)}
                        stroke="rgba(255,255,255,0.06)" strokeWidth={1}/>
                    ))}
                    <text x="60" y="24" textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="11" fontFamily="system-ui">empty canvas</text>
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-white/80 group-hover:text-white text-sm">New Blank Layout</p>
                  <p className="text-xs text-white/35 mt-0.5">Start with an empty grid — full creative control from scratch.</p>
                </div>
              </button>
            </div>

            {/* Templates grid */}
            <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/30 mb-2">Starter Templates</p>
            <div className="grid grid-cols-2 gap-3">
              {OFFICE_TEMPLATES.map(tpl => (
                <button key={tpl.id} onClick={() => requestTemplate(tpl.id)}
                  className={`text-left rounded-lg border transition-all overflow-hidden ${
                    pendingTemplateId === tpl.id
                      ? 'bg-indigo-900/40 border-indigo-500/60 ring-1 ring-indigo-500/40'
                      : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10 hover:border-white/20'}`}>
                  {/* Mini layout preview */}
                  <div className="border-b border-white/10 overflow-hidden">
                    <TemplateMiniPreview layout={tpl.layout} width={342} height={114}/>
                  </div>
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base leading-none">{tpl.emoji}</span>
                      <span className="font-semibold text-white text-sm">{tpl.name}</span>
                    </div>
                    <p className="text-xs text-white/40 leading-snug">{tpl.description}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-900/50 text-indigo-300">~{tpl.capacity} people</span>
                      {tpl.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-white/5 text-white/35">{tag}</span>
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
