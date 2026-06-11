'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { OFFICE_ASSETS, ASSET_CATEGORIES, tintSvg, OfficeFurnitureAsset } from '@/lib/office-assets'
import { OFFICE_TEMPLATES, getTemplateLayout } from '@/lib/office-templates'
import { OfficeLayout, PlacedTile, DEFAULT_LAYOUT, OfficeOrgStructure, levelFromXp } from '@/lib/office-types'
import { getStoredToken } from '@/lib/auth/browser'
import { useAgentsStore } from '@/lib/agents-store'
// Batch W: presence + org + gamification
import { AgentLayer } from '@/components/office/AgentLayer'
import { OrgChart } from '@/components/office/OrgChart'
import { QuestsPanel } from '@/components/office/QuestsPanel'
import { computeAgentPresence, PRESENCE_TICK_MS, type AgentPresence } from '@/lib/office-presence'
import { refreshDailyQuests, evaluateQuests, computeOfficeScore } from '@/lib/office-gamification'

type OfficeMode = 'edit' | 'live' | 'org' | 'quests'

// ─── Constants ────────────────────────────────────────────────────────────────
const TILE_PX      = 52
const GRID_W       = 30
const GRID_H       = 20
const LS_KEY       = 'mc_office_layout_v2'
const HISTORY_MAX  = 50
const MIN_ZOOM     = 0.2
const MAX_ZOOM     = 3.0
const INIT_ZOOM    = 0.88

// ─── SVG → data-URL cache ─────────────────────────────────────────────────────
const svgCache = new Map<string, string>()
function assetDataUrl(asset: OfficeFurnitureAsset, color?: string): string {
  const key = `${asset.id}:${color ?? ''}`
  if (svgCache.has(key)) return svgCache.get(key)!
  const svg = color ? tintSvg(asset.svg, asset.defaultColor, color) : asset.svg
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  svgCache.set(key, url)
  return url
}

const COLOR_PRESETS = [
  '#d4a96a','#8B4513','#e8e0d0','#334155',
  '#c8a97a','#6B7280','#F5F5DC','#1E293B',
  '#3B82F6','#10B981','#F59E0B','#EF4444',
  '#8B5CF6','#EC4899','#14B8A6','#F97316',
]

// ─── Mini template preview ────────────────────────────────────────────────────
function TemplateMiniPreview({ layout, width = 260, height = 87 }: { layout: OfficeLayout; width?: number; height?: number }) {
  const sx = width / (layout.gridWidth || 30)
  const sy = height / (layout.gridHeight || 20)
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      <rect width={width} height={height} fill="#1e2435" />
      {Array.from({ length: 7 }, (_, i) => <line key={`v${i}`} x1={(i+1)*(width/7)} y1={0} x2={(i+1)*(width/7)} y2={height} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />)}
      {Array.from({ length: 4 }, (_, i) => <line key={`h${i}`} x1={0} y1={(i+1)*(height/4)} x2={width} y2={(i+1)*(height/4)} stroke="rgba(255,255,255,0.04)" strokeWidth={1} />)}
      {layout.zones.map(z => z.tiles.map(t => <rect key={`${z.id}-${t.x}-${t.y}`} x={t.x*sx} y={t.y*sy} width={sx+0.5} height={sy+0.5} fill={z.color+'55'} />))}
      {layout.tiles.map(t => {
        const a = OFFICE_ASSETS.find(a => a.id === t.assetId)
        if (!a) return null
        return <rect key={t.id} x={t.x*sx+0.5} y={t.y*sy+0.5} width={Math.max(1.5,a.size[0]*sx-1)} height={Math.max(1.5,a.size[1]*sy-1)} fill={t.primaryColor ?? a.defaultColor} rx={0.8} opacity={0.9} />
      })}
    </svg>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Props { isSuperAdmin: boolean }
type DragMode = 'none' | 'pan' | 'move' | 'band'
interface DragState {
  mode: DragMode
  pointerId: number
  startPx: number; startPy: number
  // pan
  panOx: number; panOy: number
  // move
  moveTiles: Array<{ id: string; ox: number; oy: number }>
  // rubber band
  bandWx: number; bandWy: number
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function OfficeBuilder({ isSuperAdmin }: Props) {
  const agents = useAgentsStore(s => s.agents)
  const missions = useAgentsStore(s => s.missions)

  // Batch W: top-level mode (Edit / Live / Org / Quests).
  const [mode, setMode] = useState<OfficeMode>('edit')

  // Batch W: agent presence — recomputed on every PRESENCE_TICK_MS for roam target rolls.
  const [presences, setPresences] = useState<AgentPresence[]>([])
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)

  // Layout + history
  const [layout, setLayout] = useState<OfficeLayout>(DEFAULT_LAYOUT)
  const histRef    = useRef<OfficeLayout[]>([DEFAULT_LAYOUT])
  const histIdx    = useRef(0)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  // Viewport
  const vpRef  = useRef<HTMLDivElement>(null)
  const [zoom, setZoom]   = useState(INIT_ZOOM)
  const [pan, setPan]     = useState({ x: 20, y: 20 })
  const zoomRef = useRef(zoom)
  const panRef  = useRef(pan)
  useEffect(() => { zoomRef.current = zoom }, [zoom])
  useEffect(() => { panRef.current = pan }, [pan])

  // Selection
  const [sel, setSel] = useState<Set<string>>(new Set())
  const selRef = useRef(sel)
  useEffect(() => { selRef.current = sel }, [sel])

  // Placing
  const [placing, setPlacing] = useState<OfficeFurnitureAsset | null>(null)
  const [ghost, setGhost]     = useState<{ x: number; y: number } | null>(null)

  // Live drag positions (world px, fractional) — ref to avoid re-render on every mousemove
  const livePosRef = useRef<Map<string, { x: number; y: number }>>(new Map())
  const [livePosVersion, setLivePosVersion] = useState(0) // bump to trigger re-render

  // Rubber band
  const [band, setBand] = useState<{ x: number; y: number; w: number; h: number } | null>(null)

  // Drag state (ref only — no re-renders during drag)
  const drag = useRef<DragState>({
    mode: 'none', pointerId: -1,
    startPx: 0, startPy: 0,
    panOx: 0, panOy: 0,
    moveTiles: [],
    bandWx: 0, bandWy: 0,
  })

  // Space key
  const spaceRef = useRef(false)
  const [spaceDown, setSpaceDown] = useState(false)

  // UI
  const [activeCategory, setActiveCategory] = useState('desks')
  const [search, setSearch] = useState('')
  const [showTpl, setShowTpl] = useState(false)
  const [pendingTpl, setPendingTpl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')

  // Layout ref (always current in event handlers)
  const layoutRef = useRef(layout)
  useEffect(() => { layoutRef.current = layout }, [layout])

  // Batch W: presence ticking. Build agent + mission snapshots from the store,
  // pass into computeAgentPresence, refresh every PRESENCE_TICK_MS. Cheap because
  // the function is pure JS and the agent count stays small (typically ≤10).
  useEffect(() => {
    const tick = () => {
      const agentSnapshots = agents.map((a: any) => ({
        id: a.id,
        name: a.name,
        color: a.color,
        metadata: a.metadata,
      }))
      const missionSnapshots = missions.map((m: any) => ({
        id: m.id,
        status: m.status,
        leadAgentId: m.leadAgentId,
        collaboratorAgentIds: m.collaboratorAgentIds,
        liveMessage: m.handoffNotes || null,
      }))
      const next = computeAgentPresence({
        layout: layoutRef.current,
        agents: agentSnapshots,
        missions: missionSnapshots,
      })
      setPresences(next)
    }
    tick() // immediate first pass
    const id = window.setInterval(tick, PRESENCE_TICK_MS)
    return () => window.clearInterval(id)
  }, [agents, missions])

  // Batch W: refresh daily quests + evaluate progress whenever the layout
  // changes. This keeps quest progress live as the user builds out the office.
  useEffect(() => {
    const refreshed = refreshDailyQuests(layout.gamification)
    const completedToday = missions.filter(
      (m: any) => m.status === 'completed' || m.status === 'completed_with_warnings'
    ).length
    const evaluated = evaluateQuests(refreshed, layout, completedToday)
    if (
      JSON.stringify(evaluated) !== JSON.stringify(layout.gamification)
    ) {
      setLayout((prev) => ({ ...prev, gamification: evaluated }))
    }
    // We intentionally do NOT push history here — quest progress is not user
    // action.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout.tiles.length, layout.zones.length, layout.org, missions.length])

  // Helper used by OrgChart to persist org structure changes.
  const updateOrg = useCallback((next: OfficeOrgStructure) => {
    setLayout((prev) => ({ ...prev, org: next }))
  }, [])

  // Asset map
  const assetMap = useMemo(() => {
    const m = new Map<string, OfficeFurnitureAsset>()
    OFFICE_ASSETS.forEach(a => m.set(a.id, a))
    return m
  }, [])

  // Derived: single selected tile
  const singleId    = sel.size === 1 ? [...sel][0] : null
  const selTile     = singleId ? layout.tiles.find(t => t.id === singleId) ?? null : null
  const selAsset    = selTile  ? assetMap.get(selTile.assetId) ?? null : null

  // ── History ───────────────────────────────────────────────────────────────
  const pushHistory = useCallback((nl: OfficeLayout) => {
    const idx  = histIdx.current
    const next = [...histRef.current.slice(0, idx + 1), nl].slice(-HISTORY_MAX)
    histRef.current = next
    histIdx.current = next.length - 1
    setCanUndo(next.length > 1)
    setCanRedo(false)
    setLayout(nl)
    localStorage.setItem(LS_KEY, JSON.stringify(nl))
  }, [])

  const undo = useCallback(() => {
    if (histIdx.current <= 0) return
    const ni = histIdx.current - 1
    histIdx.current = ni
    const prev = histRef.current[ni]
    setLayout(prev)
    setCanUndo(ni > 0)
    setCanRedo(true)
    setSel(new Set())
    localStorage.setItem(LS_KEY, JSON.stringify(prev))
  }, [])

  const redo = useCallback(() => {
    if (histIdx.current >= histRef.current.length - 1) return
    const ni = histIdx.current + 1
    histIdx.current = ni
    const next = histRef.current[ni]
    setLayout(next)
    setCanUndo(true)
    setCanRedo(ni < histRef.current.length - 1)
    setSel(new Set())
    localStorage.setItem(LS_KEY, JSON.stringify(next))
  }, [])

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      try {
        const p = JSON.parse(raw) as OfficeLayout
        if (p?.version === 2) { setLayout(p); histRef.current = [p]; histIdx.current = 0; return }
      } catch {}
    }
    const token = getStoredToken()
    if (!token) return
    fetch('/api/office-layout', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.layout?.version === 2) {
          setLayout(d.layout); histRef.current = [d.layout]; histIdx.current = 0
          localStorage.setItem(LS_KEY, JSON.stringify(d.layout))
        }
      }).catch(() => {})
  }, [])

  // ── Coordinate helpers ────────────────────────────────────────────────────
  const toWorld = useCallback((clientX: number, clientY: number) => {
    const rect = vpRef.current!.getBoundingClientRect()
    return {
      x: (clientX - rect.left - panRef.current.x) / zoomRef.current,
      y: (clientY - rect.top  - panRef.current.y) / zoomRef.current,
    }
  }, [])

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const kd = (e: KeyboardEvent) => {
      if (e.key === ' ') { e.preventDefault(); spaceRef.current = true; setSpaceDown(true); return }
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      if ((e.key === 'z' || e.key === 'Z') && (e.metaKey || e.ctrlKey) && !e.shiftKey) { e.preventDefault(); undo(); return }
      if (((e.key === 'z' || e.key === 'Z') && (e.metaKey || e.ctrlKey) && e.shiftKey) ||
          ((e.key === 'y' || e.key === 'Y') && (e.metaKey || e.ctrlKey))) { e.preventDefault(); redo(); return }
      if (e.key === 'Escape') { setPlacing(null); setSel(new Set()); return }
      if ((e.key === 'a' || e.key === 'A') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setSel(new Set(layoutRef.current.tiles.map(t => t.id)))
        return
      }
      const curSel = selRef.current
      if (curSel.size > 0 && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault()
        pushHistory({ ...layoutRef.current, tiles: layoutRef.current.tiles.filter(t => !curSel.has(t.id)) })
        setSel(new Set())
        return
      }
      if (curSel.size === 1 && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault()
        const id = [...curSel][0]
        pushHistory({ ...layoutRef.current, tiles: layoutRef.current.tiles.map(t =>
          t.id === id ? { ...t, rotation: (t.rotation + 90) % 360 } : t) })
        return
      }
      if (curSel.size > 0 && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) {
        e.preventDefault()
        const dx = e.key === 'ArrowLeft' ? -1 : e.key === 'ArrowRight' ? 1 : 0
        const dy = e.key === 'ArrowUp'   ? -1 : e.key === 'ArrowDown'  ? 1 : 0
        pushHistory({ ...layoutRef.current, tiles: layoutRef.current.tiles.map(t =>
          curSel.has(t.id)
            ? { ...t, x: Math.max(0, Math.min(GRID_W-1, t.x+dx)), y: Math.max(0, Math.min(GRID_H-1, t.y+dy)) }
            : t
        )})
      }
    }
    const ku = (e: KeyboardEvent) => {
      if (e.key === ' ') { spaceRef.current = false; setSpaceDown(false) }
    }
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)
    return () => { window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku) }
  }, [undo, redo, pushHistory])

  // ── Pointer down ──────────────────────────────────────────────────────────
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Middle mouse or space+left → pan
    if (e.button === 1 || (e.button === 0 && spaceRef.current)) {
      e.preventDefault()
      vpRef.current?.setPointerCapture(e.pointerId)
      drag.current = { ...drag.current, mode: 'pan', pointerId: e.pointerId, startPx: e.clientX, startPy: e.clientY, panOx: panRef.current.x, panOy: panRef.current.y }
      return
    }
    if (e.button !== 0) return

    // Placing mode: click to place
    if (placing) {
      const wp = toWorld(e.clientX, e.clientY)
      const [aw, ah] = placing.size
      const gx = Math.max(0, Math.min(GRID_W - aw, Math.floor(wp.x / TILE_PX)))
      const gy = Math.max(0, Math.min(GRID_H - ah, Math.floor(wp.y / TILE_PX)))
      const newTile: PlacedTile = { id: uuidv4(), assetId: placing.id, x: gx, y: gy, rotation: 0 }
      pushHistory({ ...layoutRef.current, tiles: [...layoutRef.current.tiles, newTile] })
      return
    }

    // Hit test: did we click a tile?
    const tileEl = (e.target as HTMLElement).closest('[data-tile-id]') as HTMLElement | null
    if (tileEl) {
      const id = tileEl.dataset.tileId!
      vpRef.current?.setPointerCapture(e.pointerId)

      // Shift-click: toggle selection
      if (e.shiftKey) {
        setSel(prev => {
          const n = new Set(prev)
          n.has(id) ? n.delete(id) : n.add(id)
          return n
        })
        drag.current = { ...drag.current, mode: 'none' }
        return
      }

      // If not yet selected, select it (replacing selection)
      if (!selRef.current.has(id)) {
        setSel(new Set([id]))
      }

      // Start move drag — capture start positions of all selected tiles
      const curSel = selRef.current.has(id) ? selRef.current : new Set([id])
      const moveTiles = layoutRef.current.tiles
        .filter(t => curSel.has(t.id))
        .map(t => ({ id: t.id, ox: t.x * TILE_PX, oy: t.y * TILE_PX }))

      drag.current = {
        mode: 'move', pointerId: e.pointerId,
        startPx: e.clientX, startPy: e.clientY,
        panOx: 0, panOy: 0,
        moveTiles,
        bandWx: 0, bandWy: 0,
      }
      livePosRef.current = new Map()
      return
    }

    // Empty canvas → rubber-band selection
    vpRef.current?.setPointerCapture(e.pointerId)
    if (!e.shiftKey) setSel(new Set())
    const wp = toWorld(e.clientX, e.clientY)
    drag.current = {
      mode: 'band', pointerId: e.pointerId,
      startPx: e.clientX, startPy: e.clientY,
      panOx: 0, panOy: 0, moveTiles: [],
      bandWx: wp.x, bandWy: wp.y,
    }
    setBand(null)
  }, [placing, toWorld, pushHistory])

  // ── Pointer move ──────────────────────────────────────────────────────────
  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current

    // Ghost preview for placing
    if (placing) {
      const wp = toWorld(e.clientX, e.clientY)
      const [aw, ah] = placing.size
      setGhost({
        x: Math.max(0, Math.min(GRID_W - aw, Math.floor(wp.x / TILE_PX))),
        y: Math.max(0, Math.min(GRID_H - ah, Math.floor(wp.y / TILE_PX))),
      })
    } else {
      setGhost(null)
    }

    if (d.mode === 'pan') {
      const dx = e.clientX - d.startPx
      const dy = e.clientY - d.startPy
      const np = { x: d.panOx + dx, y: d.panOy + dy }
      panRef.current = np
      setPan(np)
      return
    }

    if (d.mode === 'move' && d.moveTiles.length > 0) {
      const dx = (e.clientX - d.startPx) / zoomRef.current
      const dy = (e.clientY - d.startPy) / zoomRef.current
      const newMap = new Map<string, { x: number; y: number }>()
      d.moveTiles.forEach(mt => {
        newMap.set(mt.id, { x: mt.ox + dx, y: mt.oy + dy })
      })
      livePosRef.current = newMap
      setLivePosVersion(v => v + 1)
      return
    }

    if (d.mode === 'band') {
      const wp = toWorld(e.clientX, e.clientY)
      const x1 = Math.min(d.bandWx, wp.x), y1 = Math.min(d.bandWy, wp.y)
      const x2 = Math.max(d.bandWx, wp.x), y2 = Math.max(d.bandWy, wp.y)
      const bw = x2 - x1, bh = y2 - y1
      setBand({ x: x1, y: y1, w: bw, h: bh })

      // Live selection
      if (bw > 4 || bh > 4) {
        const newSel = new Set<string>()
        layoutRef.current.tiles.forEach(t => {
          const a = assetMap.get(t.assetId)
          const [aw, ah] = a?.size ?? [1, 1]
          const tx = t.x * TILE_PX, ty = t.y * TILE_PX
          if (tx < x2 && tx + aw * TILE_PX > x1 && ty < y2 && ty + ah * TILE_PX > y1) newSel.add(t.id)
        })
        setSel(newSel)
      }
    }
  }, [placing, toWorld, assetMap])

  // ── Pointer up ────────────────────────────────────────────────────────────
  const onPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    vpRef.current?.releasePointerCapture(e.pointerId)

    if (d.mode === 'move' && livePosRef.current.size > 0) {
      // Snap to grid
      const newTiles = layoutRef.current.tiles.map(t => {
        const live = livePosRef.current.get(t.id)
        if (!live) return t
        const a = assetMap.get(t.assetId)
        const [aw, ah] = a?.size ?? [1, 1]
        return {
          ...t,
          x: Math.max(0, Math.min(GRID_W - aw, Math.round(live.x / TILE_PX))),
          y: Math.max(0, Math.min(GRID_H - ah, Math.round(live.y / TILE_PX))),
        }
      })
      livePosRef.current = new Map()
      setLivePosVersion(v => v + 1)
      pushHistory({ ...layoutRef.current, tiles: newTiles })
    } else if (d.mode === 'move') {
      livePosRef.current = new Map()
    }

    if (d.mode === 'band') setBand(null)
    drag.current = { ...drag.current, mode: 'none' }
  }, [assetMap, pushHistory])

  // ── Wheel zoom ────────────────────────────────────────────────────────────
  const onWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault()
    const rect = vpRef.current!.getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoomRef.current * factor))
    const wx = (px - panRef.current.x) / zoomRef.current
    const wy = (py - panRef.current.y) / zoomRef.current
    const np = { x: px - wx * newZoom, y: py - wy * newZoom }
    panRef.current = np
    zoomRef.current = newZoom
    setPan(np)
    setZoom(newZoom)
  }, [])

  // ── Tile updates ──────────────────────────────────────────────────────────
  const updateTile = useCallback((id: string, patch: Partial<PlacedTile>) => {
    pushHistory({ ...layoutRef.current, tiles: layoutRef.current.tiles.map(t => t.id === id ? { ...t, ...patch } : t) })
  }, [pushHistory])

  const deleteSelected = useCallback(() => {
    const curSel = selRef.current
    if (curSel.size === 0) return
    pushHistory({ ...layoutRef.current, tiles: layoutRef.current.tiles.filter(t => !curSel.has(t.id)) })
    setSel(new Set())
  }, [pushHistory])

  // ── Save ─────────────────────────────────────────────────────────────────
  const save = useCallback(async () => {
    setSaving(true); setSaveMsg('')
    const token = getStoredToken()
    try {
      const res = await fetch('/api/office-layout', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ layout }),
      })
      const d = await res.json().catch(() => ({}))
      setSaveMsg(res.ok ? '✓ Saved' : `✗ ${d?.error ?? 'Error'}`)
    } catch { setSaveMsg('✗ Network error') }
    finally { setSaving(false); setTimeout(() => setSaveMsg(''), 3000) }
  }, [layout])

  // ── Templates ────────────────────────────────────────────────────────────
  const confirmTemplate = useCallback(() => {
    if (!pendingTpl) return
    const tl = getTemplateLayout(pendingTpl)
    if (tl) { pushHistory(tl); setSel(new Set()) }
    setPendingTpl(null); setShowTpl(false)
  }, [pendingTpl, pushHistory])

  // ── Filtered assets ───────────────────────────────────────────────────────
  const filteredAssets = useMemo(() => {
    const q = search.toLowerCase()
    return OFFICE_ASSETS.filter(a =>
      search ? (a.name.toLowerCase().includes(q) || a.category.includes(q)) : a.category === activeCategory
    )
  }, [activeCategory, search])

  // ── Export / Import ───────────────────────────────────────────────────────
  const exportJSON = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(layout, null, 2)], { type: 'application/json' }))
    a.download = 'office-layout.json'; a.click()
  }
  const importJSON = () => {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = '.json'
    input.onchange = () => {
      const f = input.files?.[0]; if (!f) return
      const r = new FileReader()
      r.onload = () => {
        try { const p = JSON.parse(r.result as string) as OfficeLayout; if (p.version === 2) { pushHistory(p); setSel(new Set()) } } catch {}
      }
      r.readAsText(f)
    }
    input.click()
  }

  const cursor = spaceDown ? (drag.current.mode === 'pan' ? 'grabbing' : 'grab')
    : placing ? 'copy'
    : drag.current.mode === 'move' ? 'grabbing'
    : 'default'

  const WW = GRID_W * TILE_PX
  const WH = GRID_H * TILE_PX

  // Batch W: derive header stats so the tab bar can show the office vitals
  // without forcing every tab to recompute.
  const agentCount = agents.length
  const completedToday = missions.filter(
    (m: any) => m.status === 'completed' || m.status === 'completed_with_warnings'
  ).length
  const officeScore = useMemo(
    () => computeOfficeScore({ layout, agentCount, completedTasksLast24h: completedToday }),
    [layout, agentCount, completedToday]
  )
  const xpInfo = useMemo(() => levelFromXp(layout.gamification?.xp || 0), [layout.gamification?.xp])
  const xpProgress = Math.min(100, Math.round(((xpInfo.intoLevelXp || 0) / Math.max(1, xpInfo.nextLevelXp || 1)) * 100))
  const dayPhase = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 6 || hour >= 21) return { label: 'Night shift', tint: 'rgba(30, 41, 59, 0.20)' }
    if (hour >= 17) return { label: 'Evening focus', tint: 'rgba(245, 158, 11, 0.10)' }
    if (hour < 10) return { label: 'Morning setup', tint: 'rgba(56, 189, 248, 0.08)' }
    return { label: 'Workday flow', tint: 'rgba(255, 255, 255, 0.00)' }
  }, [])

  const tabs: Array<{ id: OfficeMode; label: string; icon: string }> = [
    { id: 'edit',   label: 'Edit',         icon: '✎' },
    { id: 'live',   label: 'Live Office',  icon: '◉' },
    { id: 'org',    label: 'Organization', icon: '⊞' },
    { id: 'quests', label: 'Quests',       icon: '★' },
  ]

  return (
    <div className="flex flex-col h-full bg-[#0f1117] text-white overflow-hidden" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Batch W: top tab bar + stats */}
      <div className="flex items-center gap-2 border-b border-white/10 bg-[#0d1018] px-4 py-2 shrink-0">
        <div className="flex items-center gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setMode(t.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                mode === t.id
                  ? 'bg-white/10 text-white'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="mr-1.5 opacity-70">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <div className="hidden md:flex items-center gap-4 text-[11px] font-mono uppercase tracking-wider">
          <span className="text-white/40">
            Score <span className="text-white">{officeScore.total}</span><span className="text-white/30">/100</span>
          </span>
          <span className="text-white/40">
            Level <span className="text-white">{xpInfo.level}</span>
          </span>
          <span className="text-white/40">
            XP <span className="text-white">{xpProgress}</span><span className="text-white/30">%</span>
          </span>
          <span className="text-white/40">
            MC <span className="text-white">{layout.mcCredits || 0}</span>
          </span>
          <span className="text-white/40">
            Agents <span className="text-white">{agentCount}</span>
          </span>
          <span className="text-white/40">
            Tasks today <span className="text-white">{completedToday}</span>
          </span>
        </div>
      </div>

      {/* Batch W: tab content */}
      {mode === 'org' ? (
        <OrgChart org={layout.org} agents={agents.map((a: any) => ({ id: a.id, name: a.name, role: a.role, color: a.color }))} onChange={updateOrg} />
      ) : mode === 'quests' ? (
        <QuestsPanel layout={layout} agentCount={agentCount} completedTasksLast24h={completedToday} />
      ) : (
    // Batch N: CSS-grid shell so the three columns adapt to viewport width
    // instead of clipping under each other. Canvas keeps its minimum width;
    // left + right panels never overflow the visible area.
    <div
      className="grid flex-1 min-h-0 overflow-hidden"
      style={{
        gridTemplateColumns: mode === 'live'
          ? 'minmax(0, 1fr) minmax(280px, 340px)'  // Live: hide asset sidebar
          : 'minmax(220px, 260px) minmax(320px, 1fr) minmax(280px, 320px)',
      }}
    >

      {/* ── Left sidebar ──────────────────────────────────────────────────── */}
      {mode !== 'live' && (
      <div className="flex flex-col border-r border-white/10 bg-[#151922] overflow-hidden min-w-0">

        {/* Search + Layouts button */}
        <div className="px-3 pt-3 pb-2 border-b border-white/10">
          <div className="flex gap-2">
            <input type="text" placeholder="Search assets…" value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 px-2 py-1.5 rounded bg-white/5 border border-white/10 text-sm text-white placeholder-white/25 focus:outline-none focus:border-indigo-500/50" />
            <button onClick={() => setShowTpl(true)}
              className="shrink-0 px-2.5 py-1.5 rounded bg-indigo-600/80 hover:bg-indigo-500 text-xs font-medium text-white border border-indigo-500/40 transition-colors">
              ⚡ Layouts
            </button>
          </div>
        </div>

        {/* Category tabs */}
        {!search && (
          <div className="shrink-0 bg-[#0d1018] border-b border-white/10">
            <p className="px-3 pt-2 pb-1 text-[9px] font-mono uppercase tracking-[0.22em] text-white/25 select-none">Categories</p>
            <div className="flex flex-col gap-px px-2 pb-2">
              {ASSET_CATEGORIES.map(cat => (
                <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-left transition-all border ${
                    activeCategory === cat.id
                      ? 'bg-indigo-600/20 text-indigo-200 border-indigo-500/35 font-semibold'
                      : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04] border-transparent'}`}>
                  <span className="text-sm leading-none w-4 text-center">{cat.icon}</span>
                  <span className="leading-none">{cat.label}</span>
                  {activeCategory === cat.id && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Asset list */}
        <div className="flex-1 overflow-y-auto">
          <p className="px-3 pt-2.5 pb-1 text-[9px] font-mono uppercase tracking-[0.22em] text-white/25 select-none">
            {search ? `Results for "${search}"` : ASSET_CATEGORIES.find(c => c.id === activeCategory)?.label ?? 'Assets'}
          </p>
          <div className="px-2 pb-3 space-y-0.5">
            {filteredAssets.map(asset => (
              <button key={asset.id}
                onClick={() => { setPlacing(prev => prev?.id === asset.id ? null : asset); setSel(new Set()) }}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all border ${
                  placing?.id === asset.id
                    ? 'bg-indigo-600/30 border-indigo-500/50 text-white ring-1 ring-indigo-500/30'
                    : 'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.07] hover:border-white/15 text-white/60 hover:text-white'}`}>
                <span className="w-4 h-4 rounded shrink-0" style={{ background: asset.defaultColor, boxShadow: `0 1px 4px ${asset.defaultColor}80` }} />
                <span className="flex-1 text-xs truncate font-medium">{asset.name}</span>
                <span className="text-[9px] text-white/20 font-mono shrink-0">{asset.size[0]}×{asset.size[1]}</span>
                {asset.tier === 'premium' && <span className="text-yellow-400/70 text-[10px] ml-0.5">★</span>}
              </button>
            ))}
            {filteredAssets.length === 0 && <p className="text-white/25 text-xs text-center py-6">No assets found</p>}
          </div>
        </div>

        {/* Placing indicator */}
        {placing && (
          <div className="px-3 py-2.5 bg-indigo-900/50 border-t border-indigo-500/30 flex items-center gap-2.5 shrink-0">
            <span className="w-4 h-4 rounded shrink-0" style={{ background: placing.defaultColor }} />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-indigo-100 truncate">{placing.name}</p>
              <p className="text-[10px] text-indigo-400">Click canvas to place  •  Esc to cancel</p>
            </div>
          </div>
        )}
      </div>
      )}

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col overflow-hidden min-w-0">

        {/* Toolbar */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-white/10 bg-[#151922] shrink-0 flex-wrap">
          <button onClick={undo} disabled={!canUndo} title="Undo (⌘Z)"
            className="px-2 py-1 rounded text-xs text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-colors">↩ Undo</button>
          <button onClick={redo} disabled={!canRedo} title="Redo (⌘⇧Z)"
            className="px-2 py-1 rounded text-xs text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-colors">↪ Redo</button>

          <div className="h-4 w-px bg-white/10 mx-0.5" />

          {sel.size > 0 && (
            <>
              <span className="text-xs text-indigo-300 font-medium px-1">{sel.size} selected</span>
              {sel.size === 1 && (
                <button onClick={() => selTile && updateTile(selTile.id, { rotation: (selTile.rotation + 90) % 360 })}
                  title="Rotate 90° (R)"
                  className="px-2 py-1 rounded text-xs text-white/60 hover:text-white hover:bg-white/10 transition-colors">⟳ Rotate</button>
              )}
              <button onClick={deleteSelected} title="Delete selection (Del)"
                className="px-2 py-1 rounded text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20 transition-colors">
                🗑 Delete{sel.size > 1 ? ` (${sel.size})` : ''}
              </button>
              <div className="h-4 w-px bg-white/10 mx-0.5" />
            </>
          )}

          <button onClick={() => setSel(new Set(layout.tiles.map(t => t.id)))}
            disabled={layout.tiles.length === 0}
            className="px-2 py-1 rounded text-xs text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-colors">
            Select All
          </button>
          <button onClick={() => setSel(new Set())} disabled={sel.size === 0}
            className="px-2 py-1 rounded text-xs text-white/40 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-colors">
            Deselect
          </button>

          <div className="h-4 w-px bg-white/10 mx-0.5" />
          <span className="text-xs text-white/30 tabular-nums">{Math.round(zoom * 100)}%</span>
          <button onClick={() => { setZoom(INIT_ZOOM); setPan({ x: 20, y: 20 }) }}
            className="px-2 py-1 rounded text-xs text-white/40 hover:text-white hover:bg-white/10 transition-colors">Reset view</button>

          <div className="flex-1" />
          <span className="text-[10px] text-white/15 hidden lg:block mr-2">Space+drag pan  •  Scroll zoom  •  Drag canvas to multi-select</span>
          <button onClick={exportJSON} className="px-2 py-1 rounded text-xs text-white/40 hover:text-white hover:bg-white/10">⬇ Export</button>
          <button onClick={importJSON} className="px-2 py-1 rounded text-xs text-white/40 hover:text-white hover:bg-white/10">⬆ Import</button>
          <button onClick={save} disabled={saving}
            className="px-3 py-1 rounded text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium transition-colors">
            {saving ? 'Saving…' : saveMsg || 'Save'}
          </button>
        </div>

        {/* Canvas viewport */}
        <div
          ref={vpRef}
          className="flex-1 overflow-hidden select-none relative"
          style={{ cursor, touchAction: 'none' }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={e => { if (drag.current.mode !== 'none') onPointerUp(e) }}
          onWheel={onWheel}
          onContextMenu={e => { e.preventDefault(); if (placing) setPlacing(null) }}
        >
          {/* World container */}
          <div style={{
            position: 'absolute', top: 0, left: 0,
            transformOrigin: '0 0',
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            width: WW, height: WH,
            willChange: 'transform',
          }}>
            {/* Floor */}
            <div style={{ position: 'absolute', inset: 0, background: '#1e2435' }} />
            {mode === 'live' && dayPhase.tint !== 'rgba(255, 255, 255, 0.00)' && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  background: dayPhase.tint,
                  zIndex: 0,
                }}
              />
            )}

            {/* Grid (SVG stays crisp under any zoom) */}
            <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} width={WW} height={WH}>
              {Array.from({ length: GRID_W + 1 }, (_, i) => (
                <line key={`v${i}`} x1={i*TILE_PX} y1={0} x2={i*TILE_PX} y2={WH} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
              ))}
              {Array.from({ length: GRID_H + 1 }, (_, i) => (
                <line key={`h${i}`} x1={0} y1={i*TILE_PX} x2={WW} y2={i*TILE_PX} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
              ))}
            </svg>

            {/* Zones */}
            {layout.zones.flatMap(zone => zone.tiles.map(t => (
              <div key={`${zone.id}-${t.x}-${t.y}`} style={{
                position: 'absolute', pointerEvents: 'none',
                left: t.x * TILE_PX, top: t.y * TILE_PX,
                width: TILE_PX, height: TILE_PX,
                background: zone.color + '33',
              }} />
            )))}

            {/* Placement ghost */}
            {placing && ghost && (
              <div style={{
                position: 'absolute', pointerEvents: 'none', zIndex: 10,
                left: ghost.x * TILE_PX, top: ghost.y * TILE_PX,
                width: placing.size[0] * TILE_PX, height: placing.size[1] * TILE_PX,
                background: placing.defaultColor + '44',
                border: `2px dashed ${placing.defaultColor}`,
                borderRadius: 4,
              }} />
            )}

            {/* Tiles */}
            {layout.tiles.map(t => {
              const a = assetMap.get(t.assetId)
              if (!a) return null
              const [aw, ah] = a.size
              const live = livePosRef.current.get(t.id)
              const px = live ? live.x : t.x * TILE_PX
              const py = live ? live.y : t.y * TILE_PX
              const isSelected = sel.has(t.id)
              return (
                <div
                  key={t.id}
                  data-tile-id={t.id}
                  style={{
                    position: 'absolute',
                    left: px, top: py,
                    width: aw * TILE_PX, height: ah * TILE_PX,
                    transform: t.rotation ? `rotate(${t.rotation}deg)` : undefined,
                    transformOrigin: 'center center',
                    cursor: placing ? 'copy' : 'grab',
                    zIndex: isSelected ? 3 : 1,
                    outline: isSelected ? '2.5px solid #3B82F6' : '2px solid transparent',
                    outlineOffset: 2,
                    boxShadow: isSelected ? '0 0 0 5px rgba(59,130,246,0.18)' : undefined,
                    borderRadius: 3,
                    transition: live ? 'none' : 'left 0.06s ease, top 0.06s ease',
                    willChange: live ? 'left, top' : 'auto',
                  }}
                >
                  <img
                    src={assetDataUrl(a, t.primaryColor)}
                    alt={a.name}
                    draggable={false}
                    style={{ width: '100%', height: '100%', display: 'block', pointerEvents: 'none' }}
                  />
                  {t.label && (
                    <div style={{
                      position: 'absolute', bottom: -15, left: 0, right: 0,
                      textAlign: 'center', fontSize: 9, color: '#cbd5e1',
                      whiteSpace: 'nowrap', pointerEvents: 'none', overflow: 'hidden',
                    }}>{t.label}</div>
                  )}
                </div>
              )
            })}

            {/* Rubber band */}
            {band && (band.w > 3 || band.h > 3) && (
              <div style={{
                position: 'absolute', pointerEvents: 'none', zIndex: 20,
                left: band.x, top: band.y, width: band.w, height: band.h,
                border: '1.5px solid #3B82F6',
                background: 'rgba(59,130,246,0.08)',
                borderRadius: 2,
              }} />
            )}

            {/* Batch W: live agent layer — only renders in Live mode. Sits in
                world-space so tokens move with pan + zoom. AgentLayer handles
                its own RAF-driven interpolation so token movement stays smooth
                regardless of how often presence ticks. */}
            {mode === 'live' && (
              <AgentLayer
                presences={presences}
                tilePx={TILE_PX}
                selectedAgentId={selectedAgentId}
                onAgentClick={(aid) => setSelectedAgentId(aid === selectedAgentId ? null : aid)}
              />
            )}
          </div>

          {/* Multi-select HUD */}
          {sel.size > 1 && (
            <div style={{
              position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
              zIndex: 30, pointerEvents: 'none',
              background: '#1a2035', border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: 12, padding: '8px 16px',
              display: 'flex', alignItems: 'center', gap: 12,
              boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
              fontSize: 12, color: '#e2e8f0', whiteSpace: 'nowrap',
            }}>
              <span style={{ color: '#818cf8', fontWeight: 600 }}>{sel.size} items selected</span>
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>Del to delete  •  Arrows to nudge  •  Drag to move together</span>
            </div>
          )}

          {/* Batch N: empty-canvas onboarding overlay. Disappears the moment
              the first tile is placed; non-interactive so it never blocks the
              canvas. Helps a first-time user understand what this page is. */}
          {layout.tiles.length === 0 && !placing && (
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
              style={{ zIndex: 5 }}
            >
              <div className="rounded-2xl border border-white/10 bg-[#151922]/85 backdrop-blur px-6 py-5 max-w-sm text-center shadow-2xl">
                <p className="text-base font-semibold text-white">Welcome to your virtual office</p>
                <p className="mt-1.5 text-xs text-white/55">
                  Build the floor plan for your AI team. Start from a layout template, or browse assets and place them on the grid.
                </p>
                <div className="mt-3 flex items-center justify-center gap-2 text-[10px] uppercase tracking-wider text-white/35 font-mono">
                  <span>Click an asset</span>
                  <span>·</span>
                  <span>Click the grid to place</span>
                </div>
              </div>
            </div>
          )}

          {mode === 'live' && (
            <div className="pointer-events-none absolute left-4 top-4 z-30 flex max-w-[560px] flex-wrap items-center gap-2">
              <div className="rounded-xl border border-white/10 bg-[#0d1018]/82 px-3 py-2 shadow-2xl backdrop-blur">
                <p className="text-[9px] font-mono uppercase tracking-[0.22em] text-white/35">Mood</p>
                <p className="text-sm font-semibold text-white">{officeScore.label}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#0d1018]/82 px-3 py-2 shadow-2xl backdrop-blur">
                <p className="text-[9px] font-mono uppercase tracking-[0.22em] text-white/35">Level {xpInfo.level}</p>
                <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
                  <span className="block h-full rounded-full bg-indigo-400" style={{ width: `${xpProgress}%` }} />
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#0d1018]/82 px-3 py-2 shadow-2xl backdrop-blur">
                <p className="text-[9px] font-mono uppercase tracking-[0.22em] text-white/35">Credits</p>
                <p className="text-sm font-semibold text-white">{layout.mcCredits || 0} MC</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-[#0d1018]/82 px-3 py-2 shadow-2xl backdrop-blur">
                <p className="text-[9px] font-mono uppercase tracking-[0.22em] text-white/35">Phase</p>
                <p className="text-sm font-semibold text-white">{dayPhase.label}</p>
              </div>
            </div>
          )}
        </div>

        {/* Batch N: persistent status bar — gives users a stable line of
            ground-truth (zoom level, item count, last-save state) instead of
            having to hunt across the toolbar. */}
        <div className="flex items-center justify-between gap-4 px-3 py-1.5 border-t border-white/10 bg-[#0d1018] shrink-0 text-[10px] font-mono uppercase tracking-wider text-white/40">
          <div className="flex items-center gap-3">
            <span>Items <span className="text-white/70">{layout.tiles.length}</span></span>
            {sel.size > 0 && <span>Selected <span className="text-indigo-300">{sel.size}</span></span>}
            <span>Zoom <span className="text-white/70">{Math.round(zoom * 100)}%</span></span>
          </div>
          <div className="flex items-center gap-3">
            <span>{saving ? 'Saving…' : saveMsg ? saveMsg : 'Saved'}</span>
            <span className="hidden md:inline">Space+drag pan · Scroll zoom · Drag to multi-select</span>
          </div>
        </div>
      </div>

      {/* ── Right inspector ──────────────────────────────────────────────────
            Batch N: always rendered. Shows an empty-state when nothing is
            selected so users know the editor is here, instead of the column
            disappearing on every click-away.                                  */}
      {selTile && selAsset ? (
        <div className="border-l border-white/10 bg-[#151922] flex flex-col overflow-y-auto min-w-0">
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">Selected</p>
            <p className="text-sm font-semibold text-white truncate">{selAsset.name}</p>
            <p className="text-xs text-white/35">{selAsset.size[0]*0.5}m × {selAsset.size[1]*0.5}m</p>
          </div>

          <div className="px-4 py-3 border-b border-white/10">
            <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-1.5">Label</label>
            <input type="text" value={selTile.label ?? ''}
              onChange={e => updateTile(selTile.id, { label: e.target.value || undefined })}
              placeholder="e.g. Moe's Desk"
              className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/60" />
          </div>

          <div className="px-4 py-3 border-b border-white/10">
            <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-2">Rotation</label>
            <div className="grid grid-cols-4 gap-1">
              {[0, 90, 180, 270].map(r => (
                <button key={r} onClick={() => updateTile(selTile.id, { rotation: r })}
                  className={`py-1.5 rounded text-xs transition-colors font-medium ${
                    selTile.rotation === r ? 'bg-indigo-600 text-white' : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white'}`}>
                  {r}°
                </button>
              ))}
            </div>
          </div>

          <div className="px-4 py-3 border-b border-white/10">
            <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-2">Color</label>
            <div className="grid grid-cols-4 gap-1.5 mb-2">
              {COLOR_PRESETS.map(c => (
                <button key={c} onClick={() => updateTile(selTile.id, { primaryColor: c })}
                  title={c}
                  className={`w-full aspect-square rounded border-2 transition-all ${
                    (selTile.primaryColor ?? selAsset.defaultColor) === c ? 'border-white scale-110' : 'border-transparent hover:border-white/40'}`}
                  style={{ background: c }} />
              ))}
            </div>
            <input type="color"
              value={selTile.primaryColor ?? selAsset.defaultColor}
              onChange={e => updateTile(selTile.id, { primaryColor: e.target.value })}
              className="h-7 w-full rounded cursor-pointer" />
            <button onClick={() => updateTile(selTile.id, { primaryColor: undefined })}
              className="mt-1.5 text-xs text-white/30 hover:text-white/60 transition-colors">↺ Reset to default</button>
          </div>

          {selAsset.assignable && (
            <div className="px-4 py-3 border-b border-white/10">
              <label className="text-[10px] text-white/40 uppercase tracking-wider block mb-2">Assigned Agent</label>
              <select value={selTile.assignedAgentId ?? ''}
                onChange={e => updateTile(selTile.id, { assignedAgentId: e.target.value || undefined })}
                className="w-full px-2 py-1.5 rounded bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-indigo-500/60">
                <option value="">— None —</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          )}

          <div className="px-4 py-3 flex gap-2">
            <button onClick={() => updateTile(selTile.id, { rotation: (selTile.rotation + 90) % 360 })}
              className="flex-1 py-1.5 rounded bg-white/5 hover:bg-white/10 text-sm text-white/70 hover:text-white transition-colors">
              ⟳ Rotate
            </button>
            <button onClick={deleteSelected}
              className="flex-1 py-1.5 rounded bg-red-900/20 hover:bg-red-900/40 text-sm text-red-400 hover:text-red-300 transition-colors">
              ✕ Remove
            </button>
          </div>
        </div>
      ) : (
        // Empty inspector — visible when nothing is selected so users know
        // the editor lives here. Includes a small "what can I do" cheat-sheet
        // and quick-jump buttons to the most common actions.
        <div className="border-l border-white/10 bg-[#151922] flex flex-col overflow-y-auto min-w-0">
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">Inspector</p>
            <p className="text-sm font-semibold text-white">
              {mode === 'live' ? 'Live Office' : 'Nothing selected'}
            </p>
            <p className="text-xs text-white/35 mt-1">
              {mode === 'live'
                ? 'Agents path around furniture, work at desks, and use nearby office amenities.'
                : 'Click a placed item on the floor to edit it.'}
            </p>
          </div>

          {/* Batch X: Live mode — show the agent roster so the user can tell who's around */}
          {mode === 'live' && (
            <div className="px-4 py-4 border-b border-white/10">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-white/40 uppercase tracking-wider">Agents on the floor</p>
                <span className="text-[10px] font-mono text-white/40">{presences.length}</span>
              </div>
              {presences.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.02] px-3 py-3">
                  <p className="text-xs text-white/60">No agents loaded yet.</p>
                  <p className="text-[11px] text-white/40 mt-1">
                    Refresh the page if your team is set up. Agents auto-seed on sign-in.
                  </p>
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {presences.map((p) => (
                    <li
                      key={p.agentId}
                      onClick={() => setSelectedAgentId(p.agentId === selectedAgentId ? null : p.agentId)}
                      className={`flex items-center gap-2.5 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                        selectedAgentId === p.agentId ? 'bg-white/10' : 'hover:bg-white/5'
                      }`}
                    >
                      <span
                        className="h-6 w-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                        style={{ background: p.color }}
                      >
                        {p.initial}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white truncate">{p.agentName}</p>
                        <p className="text-[10px] text-white/40 truncate">
                          {p.status === 'working' ? (
                            <span className="text-emerald-400">● Working</span>
                          ) : (
                            <span>○ {p.activity?.label || 'Idle'}</span>
                          )}
                          {p.message ? ` · ${p.message.slice(0, 32)}${p.message.length > 32 ? '…' : ''}` : ''}
                        </p>
                        {p.status === 'working' && typeof p.progress === 'number' && (
                          <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
                            <span
                              className="block h-full rounded-full bg-emerald-400"
                              style={{ width: `${Math.max(8, Math.round(p.progress * 100))}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Batch X: Zone management — visible in Edit mode so user can rename/delete zones they no longer want */}
          {mode === 'edit' && (layout.zones || []).length > 0 && (
            <div className="px-4 py-4 border-b border-white/10">
              <p className="text-[10px] text-white/40 uppercase tracking-wider mb-2">Zones ({layout.zones.length})</p>
              <ul className="space-y-1.5">
                {layout.zones.map((zone) => (
                  <li key={zone.id} className="flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1.5">
                    <span className="h-3 w-3 rounded shrink-0" style={{ background: zone.color }} />
                    <input
                      value={zone.name}
                      onChange={(e) => {
                        const next = e.target.value
                        setLayout((prev) => ({
                          ...prev,
                          zones: prev.zones.map((z) => (z.id === zone.id ? { ...z, name: next } : z)),
                        }))
                      }}
                      className="flex-1 min-w-0 bg-transparent border-none outline-none text-xs text-white px-0 py-0"
                    />
                    <span className="text-[10px] font-mono text-white/30">{zone.tiles.length}t</span>
                    <button
                      onClick={() => {
                        if (confirm(`Delete zone "${zone.name}"?`)) {
                          setLayout((prev) => ({
                            ...prev,
                            zones: prev.zones.filter((z) => z.id !== zone.id),
                          }))
                        }
                      }}
                      className="text-red-400/70 hover:text-red-300 text-[11px] px-1.5 py-0.5 rounded hover:bg-red-900/20 shrink-0"
                      title="Delete zone"
                    >
                      ×
                    </button>
                  </li>
                ))}
                <li>
                  <button
                    onClick={() => {
                      if (confirm('Clear ALL zones from the layout? This can be undone with ⌘Z.')) {
                        setLayout((prev) => ({ ...prev, zones: [] }))
                      }
                    }}
                    className="w-full text-left text-[11px] text-white/40 hover:text-red-300 px-2 py-1.5 rounded hover:bg-red-900/10 transition-colors"
                  >
                    Clear all zones
                  </button>
                </li>
              </ul>
            </div>
          )}

          <div className="px-4 py-4 border-b border-white/10 space-y-3">
            <p className="text-[10px] text-white/40 uppercase tracking-wider">Quick start</p>
            <button onClick={() => setShowTpl(true)}
              className="w-full text-left rounded-lg border border-indigo-500/30 bg-indigo-600/10 hover:bg-indigo-600/20 px-3 py-2.5 transition-colors">
              <p className="text-sm font-medium text-indigo-100">⚡ Use a template</p>
              <p className="text-[11px] text-indigo-300/70 mt-0.5">Start from a pre-designed layout</p>
            </button>
            {layout.tiles.length > 0 ? (
              <button
                onClick={() => {
                  if (confirm('Remove all placed items? This can be undone with ⌘Z.')) {
                    pushHistory({ ...layoutRef.current, tiles: [] })
                  }
                }}
                className="w-full text-left rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 px-3 py-2.5 transition-colors">
                <p className="text-sm font-medium text-white/80">↺ Clear floor</p>
                <p className="text-[11px] text-white/40 mt-0.5">Remove every placed item (undoable)</p>
              </button>
            ) : (
              <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.02] px-3 py-2.5">
                <p className="text-sm font-medium text-white/70">🏗 Empty office</p>
                <p className="text-[11px] text-white/40 mt-0.5">Pick assets from the left to begin building.</p>
              </div>
            )}
          </div>
          <div className="px-4 py-4 space-y-2">
            <p className="text-[10px] text-white/40 uppercase tracking-wider">Keyboard shortcuts</p>
            <ul className="space-y-1 text-[11px] text-white/50">
              <li className="flex items-center justify-between"><span>Undo</span><kbd className="font-mono text-white/70">⌘Z</kbd></li>
              <li className="flex items-center justify-between"><span>Redo</span><kbd className="font-mono text-white/70">⌘⇧Z</kbd></li>
              <li className="flex items-center justify-between"><span>Delete</span><kbd className="font-mono text-white/70">Del</kbd></li>
              <li className="flex items-center justify-between"><span>Rotate selection</span><kbd className="font-mono text-white/70">R</kbd></li>
              <li className="flex items-center justify-between"><span>Pan canvas</span><kbd className="font-mono text-white/70">Space+drag</kbd></li>
              <li className="flex items-center justify-between"><span>Zoom</span><kbd className="font-mono text-white/70">Scroll</kbd></li>
              <li className="flex items-center justify-between"><span>Select all</span><kbd className="font-mono text-white/70">⌘A</kbd></li>
            </ul>
          </div>
        </div>
      )}

      {/* ── Templates modal ───────────────────────────────────────────────── */}
      {showTpl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => { setShowTpl(false); setPendingTpl(null) }}>
          <div className="bg-[#1a2035] border border-white/10 rounded-xl p-6 w-[760px] max-h-[85vh] overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-semibold text-white">Layouts & Templates</h2>
              <button onClick={() => { setShowTpl(false); setPendingTpl(null) }} className="text-white/40 hover:text-white text-xl leading-none">✕</button>
            </div>
            <p className="text-sm text-white/40 mb-5">Select a template to preview — confirm to apply.</p>

            {pendingTpl && (
              <div className="mb-4 p-3 rounded-lg bg-amber-900/30 border border-amber-500/40 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-300">Apply "{OFFICE_TEMPLATES.find(t => t.id === pendingTpl)?.name}"?</p>
                  <p className="text-xs text-amber-400/70 mt-0.5">Replaces current layout — undo with ⌘Z.</p>
                </div>
                <div className="flex gap-2 ml-4 shrink-0">
                  <button onClick={() => setPendingTpl(null)} className="px-3 py-1 rounded text-sm bg-white/10 hover:bg-white/20 text-white transition-colors">Cancel</button>
                  <button onClick={confirmTemplate} className="px-3 py-1 rounded text-sm bg-indigo-600 hover:bg-indigo-500 text-white transition-colors">Apply</button>
                </div>
              </div>
            )}

            <div className="mb-5">
              <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/30 mb-2">Start Fresh</p>
              <button onClick={() => {
                pushHistory({ ...DEFAULT_LAYOUT })
                setShowTpl(false); setSel(new Set())
              }} className="w-full flex items-center gap-4 p-3 rounded-lg border border-dashed border-white/20 hover:border-indigo-500/50 hover:bg-indigo-950/30 transition-all text-left group">
                <div className="w-[120px] h-[40px] rounded bg-[#1e2435] border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                  <svg width="120" height="40"><rect width="120" height="40" fill="#1e2435"/>
                    {Array.from({length:5},(_,i)=><line key={i} x1={(i+1)*20} y1={0} x2={(i+1)*20} y2={40} stroke="rgba(255,255,255,0.06)" strokeWidth={1}/>)}
                    <text x="60" y="24" textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="11" fontFamily="system-ui">empty canvas</text>
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-white/80 group-hover:text-white text-sm">New Blank Layout</p>
                  <p className="text-xs text-white/35 mt-0.5">Start from scratch — full creative control.</p>
                </div>
              </button>
            </div>

            <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/30 mb-3">Starter Templates</p>
            <div className="grid grid-cols-2 gap-3">
              {OFFICE_TEMPLATES.map(tpl => (
                <button key={tpl.id} onClick={() => setPendingTpl(tpl.id)}
                  className={`text-left rounded-lg border transition-all overflow-hidden ${
                    pendingTpl === tpl.id
                      ? 'bg-indigo-900/40 border-indigo-500/60 ring-1 ring-indigo-500/40'
                      : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10 hover:border-white/20'}`}>
                  <div className="border-b border-white/10 overflow-hidden">
                    <TemplateMiniPreview layout={tpl.layout} width={342} height={114} />
                  </div>
                  <div className="p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base leading-none">{tpl.emoji}</span>
                      <span className="font-semibold text-white text-sm">{tpl.name}</span>
                    </div>
                    <p className="text-xs text-white/40 leading-snug">{tpl.description}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-indigo-900/50 text-indigo-300">~{tpl.capacity} people</span>
                      {tpl.tags.slice(0, 2).map(tag => <span key={tag} className="text-xs px-1.5 py-0.5 rounded bg-white/5 text-white/35">{tag}</span>)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
      )}
    </div>
  )
}
