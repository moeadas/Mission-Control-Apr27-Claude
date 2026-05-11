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
        <div className="px-3 py-3 border-b border-white/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-white/60 uppercase tracking-wider">Assets</span>
            <button onClick={() => setShowTemplates(true)}
              className="text-xs px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white transition-colors">
              Templates
            </button>
          </div>
          <input type="text" placeholder="Search assets…" value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/30"/>
        </div>

        {!searchQuery && (
          <div className="flex flex-col gap-0.5 px-2 py-2 border-b border-white/10 overflow-y-auto max-h-40">
            {ASSET_CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => setActiveCategoryId(cat.id)}
                className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left transition-colors ${
                  activeCategoryId === cat.id ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}>
                <span className="text-base">{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
          {filteredAssets.map(asset => (
            <button key={asset.id}
              onClick={() => { setPlacingAsset(asset); setTool('select') }}
              className={`w-full flex items-center gap-2 px-2 py-2 rounded text-left text-sm transition-colors ${
                placingAsset?.id === asset.id
                  ? 'bg-indigo-600/40 border border-indigo-500/50 text-white'
                  : 'hover:bg-white/5 text-white/70 hover:text-white'}`}
              title={`${asset.size[0] * 0.5}m × ${asset.size[1] * 0.5}m — click or drag to place`}>
              <span className="w-4 h-4 rounded shrink-0 border border-white/20" style={{ background: asset.defaultColor }}/>
              <span className="flex-1 truncate">{asset.name}</span>
              {asset.tier === 'premium' && <span className="text-xs text-yellow-400 shrink-0">★</span>}
            </button>
          ))}
          {filteredAssets.length === 0 && (
            <p className="text-white/30 text-xs text-center py-4">No assets found</p>
          )}
        </div>

        {placingAsset && (
          <div className="px-3 py-2 bg-indigo-900/40 border-t border-indigo-500/30 text-xs text-indigo-300">
            Placing: <strong>{placingAsset.name}</strong>
            <br/><span className="text-indigo-400">Click or drag to fill • Esc to cancel</span>
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
          <div className="bg-[#1a2035] border border-white/10 rounded-xl p-6 w-[680px] max-h-[80vh] overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-semibold text-white">Starter Templates</h2>
              <button onClick={() => { setShowTemplates(false); setPendingTemplateId(null) }}
                className="text-white/40 hover:text-white text-lg">✕</button>
            </div>
            <p className="text-sm text-white/40 mb-5">
              Choose a layout to preview. Your current layout won't be replaced until you confirm.
            </p>

            {/* Confirmation banner */}
            {pendingTemplateId && (
              <div className="mb-4 p-3 rounded-lg bg-amber-900/30 border border-amber-500/40 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-300">
                    Apply "{OFFICE_TEMPLATES.find(t => t.id === pendingTemplateId)?.name}"?
                  </p>
                  <p className="text-xs text-amber-400/70 mt-0.5">
                    This will replace your current layout (undo available).
                  </p>
                </div>
                <div className="flex gap-2 ml-4">
                  <button onClick={() => setPendingTemplateId(null)}
                    className="px-3 py-1 rounded text-sm bg-white/10 hover:bg-white/20 text-white transition-colors">
                    Cancel
                  </button>
                  <button onClick={confirmTemplate}
                    className="px-3 py-1 rounded text-sm bg-indigo-600 hover:bg-indigo-500 text-white transition-colors">
                    Apply
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {OFFICE_TEMPLATES.map(tpl => (
                <button key={tpl.id} onClick={() => requestTemplate(tpl.id)}
                  className={`text-left p-4 rounded-lg border transition-all ${
                    pendingTemplateId === tpl.id
                      ? 'bg-indigo-900/40 border-indigo-500/60'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 hover:border-white/20'}`}>
                  <div className="text-2xl mb-2">{tpl.emoji}</div>
                  <div className="font-medium text-white text-sm">{tpl.name}</div>
                  <div className="text-xs text-white/40 mt-1 leading-snug">{tpl.description}</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-900/50 text-indigo-300">~{tpl.capacity} people</span>
                    {tpl.tags.slice(0,2).map(tag =>
                      <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-white/5 text-white/40">{tag}</span>)}
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
