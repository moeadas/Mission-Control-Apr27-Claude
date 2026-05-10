'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  MousePointer2, Eraser, PaintBucket, Users, Save,
  Lock, Star, Crown, ChevronDown, ChevronUp, X,
  Plus, Trash2, Settings, Maximize2, ZoomIn, ZoomOut,
  RotateCcw, RotateCw, Info, Sparkles,
} from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'

import { OFFICE_ASSETS, ASSET_CATEGORIES, ZONE_COLORS, getAssetById, isAssetUnlocked } from '@/lib/office-assets'
import type { OfficeFurnitureAsset } from '@/lib/office-assets'
import type { PlacedTile, OfficeZone, OfficeLayout } from '@/lib/office-types'
import { DEFAULT_LAYOUT } from '@/lib/office-types'
import { useAgentsStore } from '@/lib/agents-store'
import { getStoredToken } from '@/lib/auth/browser'

const TILE_SIZE = 52  // px per grid tile

type Tool = 'select' | 'place' | 'erase' | 'zone'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tileKey(x: number, y: number) { return `${x},${y}` }

/** Returns all grid coords occupied by a placed tile (accounts for asset size) */
function occupiedCells(tile: PlacedTile, assets: OfficeFurnitureAsset[]): Array<{x:number;y:number}> {
  const asset = getAssetById(tile.assetId)
  if (!asset) return [{ x: tile.x, y: tile.y }]
  const [w, h] = tile.rotation === 90 || tile.rotation === 270
    ? [asset.size[1], asset.size[0]]
    : asset.size
  const cells: Array<{x:number;y:number}> = []
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      cells.push({ x: tile.x + dx, y: tile.y + dy })
    }
  }
  return cells
}

// ─── Mini Agent Avatar ────────────────────────────────────────────────────────

function AgentDot({ name, color, status }: { name: string; color: string; status: string }) {
  return (
    <div
      title={name}
      className="absolute -top-3 -right-3 w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-black text-white shadow-md z-10"
      style={{ background: color }}
    >
      {name.slice(0, 2).toUpperCase()}
      {status === 'active' && (
        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-white" />
      )}
    </div>
  )
}

// ─── OfficeBuilder ────────────────────────────────────────────────────────────

interface OfficeBuilderProps {
  isSuperAdmin?: boolean
}

export function OfficeBuilder({ isSuperAdmin = false }: OfficeBuilderProps) {
  const agents = useAgentsStore((s) => s.agents)
  const token = getStoredToken()

  // ── Layout state ──────────────────────────────────────────────────────────
  const [layout, setLayout] = useState<OfficeLayout>(DEFAULT_LAYOUT)
  const [mcCredits, setMcCredits] = useState(0)
  const [ownedAssets, setOwnedAssets] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // ── Editor state ──────────────────────────────────────────────────────────
  const [tool, setTool] = useState<Tool>('place')
  const [selectedAsset, setSelectedAsset] = useState<OfficeFurnitureAsset | null>(OFFICE_ASSETS[6]) // basic desk
  const [selectedCategory, setSelectedCategory] = useState<string>('desks')
  const [rotation, setRotation] = useState(0)
  const [hoveredCell, setHoveredCell] = useState<{x:number;y:number}|null>(null)
  const [selectedTileId, setSelectedTileId] = useState<string|null>(null)
  const [zoom, setZoom] = useState(1)

  // ── Zone editor state ─────────────────────────────────────────────────────
  const [editingZone, setEditingZone] = useState<OfficeZone|null>(null)
  const [zoneEditorOpen, setZoneEditorOpen] = useState(false)
  const [zonePaintActive, setZonePaintActive] = useState(false)
  const [isPainting, setIsPainting] = useState(false)

  // ── Right panel ───────────────────────────────────────────────────────────
  const [rightPanel, setRightPanel] = useState<'zones'|'agents'>('zones')

  // ── Load layout ───────────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/office-layout', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (res.ok) {
          const data = await res.json()
          setLayout(data.layout ?? DEFAULT_LAYOUT)
          setMcCredits(data.mcCredits ?? 0)
          setOwnedAssets(data.ownedAssets ?? [])
        }
      } catch (e) {
        console.error('[OfficeBuilder] load failed', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ── Autosave (debounced 1.5s) ─────────────────────────────────────────────
  const saveLayout = useCallback(async (l: OfficeLayout) => {
    setSaving(true)
    try {
      await fetch('/api/office-layout', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ layout: l }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      console.error('[OfficeBuilder] save failed', e)
    } finally {
      setSaving(false)
    }
  }, [token])

  const triggerSave = useCallback((l: OfficeLayout) => {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => saveLayout(l), 1500)
  }, [saveLayout])

  const updateLayout = useCallback((updater: (prev: OfficeLayout) => OfficeLayout) => {
    setLayout((prev) => {
      const next = updater(prev)
      triggerSave(next)
      return next
    })
  }, [triggerSave])

  // ── Build occupied cell map ───────────────────────────────────────────────
  const occupiedMap = React.useMemo(() => {
    const map = new Map<string, string>() // cellKey → tileId
    for (const tile of layout.tiles) {
      for (const cell of occupiedCells(tile, OFFICE_ASSETS)) {
        map.set(tileKey(cell.x, cell.y), tile.id)
      }
    }
    return map
  }, [layout.tiles])

  // Zone tile map
  const zoneMap = React.useMemo(() => {
    const map = new Map<string, string>() // cellKey → zoneId
    for (const zone of layout.zones) {
      for (const t of zone.tiles) map.set(tileKey(t.x, t.y), zone.id)
    }
    return map
  }, [layout.zones])

  // ── Placement preview ─────────────────────────────────────────────────────
  const previewCells = React.useMemo((): Array<{x:number;y:number}> => {
    if (tool !== 'place' || !selectedAsset || !hoveredCell) return []
    const [w, h] = rotation === 90 || rotation === 270
      ? [selectedAsset.size[1], selectedAsset.size[0]]
      : selectedAsset.size
    const cells = []
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        cells.push({ x: hoveredCell.x + dx, y: hoveredCell.y + dy })
      }
    }
    return cells
  }, [tool, selectedAsset, hoveredCell, rotation])

  const previewSet = new Set(previewCells.map(c => tileKey(c.x, c.y)))
  const previewValid = previewCells.every(c =>
    c.x >= 0 && c.x < layout.gridWidth &&
    c.y >= 0 && c.y < layout.gridHeight &&
    !occupiedMap.has(tileKey(c.x, c.y))
  )

  // ── Cell interactions ─────────────────────────────────────────────────────
  const handleCellClick = (x: number, y: number) => {
    if (tool === 'place' && selectedAsset) {
      if (!previewValid) return
      const [w, h] = rotation === 90 || rotation === 270
        ? [selectedAsset.size[1], selectedAsset.size[0]]
        : selectedAsset.size
      // Check bounds
      if (x + w > layout.gridWidth || y + h > layout.gridHeight) return
      const newTile: PlacedTile = { id: uuidv4(), assetId: selectedAsset.id, x, y, rotation }
      updateLayout((prev) => ({ ...prev, tiles: [...prev.tiles, newTile] }))
    } else if (tool === 'erase') {
      const tileId = occupiedMap.get(tileKey(x, y))
      if (tileId) {
        updateLayout((prev) => ({ ...prev, tiles: prev.tiles.filter(t => t.id !== tileId) }))
        if (selectedTileId === tileId) setSelectedTileId(null)
      }
    } else if (tool === 'select') {
      const tileId = occupiedMap.get(tileKey(x, y))
      setSelectedTileId(tileId ?? null)
    } else if (tool === 'zone' && editingZone) {
      const key = tileKey(x, y)
      updateLayout((prev) => {
        const zones = prev.zones.map(z => {
          if (z.id !== editingZone.id) return z
          const exists = z.tiles.some(t => tileKey(t.x, t.y) === key)
          return {
            ...z,
            tiles: exists
              ? z.tiles.filter(t => tileKey(t.x, t.y) !== key)
              : [...z.tiles, { x, y }]
          }
        })
        return { ...prev, zones }
      })
    }
  }

  const handleCellPaint = (x: number, y: number) => {
    if (tool === 'zone' && editingZone && isPainting) {
      const key = tileKey(x, y)
      updateLayout((prev) => {
        const zones = prev.zones.map(z => {
          if (z.id !== editingZone.id) return z
          const exists = z.tiles.some(t => tileKey(t.x, t.y) === key)
          if (exists) return z
          return { ...z, tiles: [...z.tiles, { x, y }] }
        })
        return { ...prev, zones }
      })
    }
  }

  // ── Zone helpers ──────────────────────────────────────────────────────────
  const addZone = () => {
    const newZone: OfficeZone = {
      id: uuidv4(),
      name: `Zone ${layout.zones.length + 1}`,
      color: ZONE_COLORS[layout.zones.length % ZONE_COLORS.length],
      tiles: [],
      agentIds: [],
    }
    updateLayout((prev) => ({ ...prev, zones: [...prev.zones, newZone] }))
    setEditingZone(newZone)
    setTool('zone')
  }

  const deleteZone = (zoneId: string) => {
    updateLayout((prev) => ({ ...prev, zones: prev.zones.filter(z => z.id !== zoneId) }))
    if (editingZone?.id === zoneId) { setEditingZone(null); setTool('select') }
  }

  const renameZone = (zoneId: string, name: string) => {
    updateLayout((prev) => ({
      ...prev,
      zones: prev.zones.map(z => z.id === zoneId ? { ...z, name } : z)
    }))
    if (editingZone?.id === zoneId) setEditingZone(prev => prev ? { ...prev, name } : prev)
  }

  const toggleAgentInZone = (zoneId: string, agentId: string) => {
    updateLayout((prev) => ({
      ...prev,
      zones: prev.zones.map(z => {
        if (z.id !== zoneId) return z
        const has = z.agentIds.includes(agentId)
        return { ...z, agentIds: has ? z.agentIds.filter(id => id !== agentId) : [...z.agentIds, agentId] }
      })
    }))
  }

  const setFloorTile = (assetId: string) => {
    updateLayout((prev) => ({ ...prev, floorAssetId: assetId }))
  }

  // ── Rotate selected tile ──────────────────────────────────────────────────
  const rotateSelectedTile = (dir: 1 | -1) => {
    if (selectedTileId) {
      updateLayout((prev) => ({
        ...prev,
        tiles: prev.tiles.map(t =>
          t.id === selectedTileId
            ? { ...t, rotation: ((t.rotation + dir * 90) + 360) % 360 }
            : t
        )
      }))
    } else {
      setRotation(r => ((r + dir * 90) + 360) % 360)
    }
  }

  // ── Floor asset ───────────────────────────────────────────────────────────
  const floorAsset = getAssetById(layout.floorAssetId)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-[var(--text-dim)]">Loading your office...</p>
        </div>
      </div>
    )
  }

  const selectedTile = layout.tiles.find(t => t.id === selectedTileId)
  const selectedTileAsset = selectedTile ? getAssetById(selectedTile.assetId) : null
  const filteredAssets = OFFICE_ASSETS.filter(a => a.category === selectedCategory)
  const floorAssets = OFFICE_ASSETS.filter(a => a.category === 'floors')

  return (
    <div className="flex h-full overflow-hidden bg-[#f0f4f8] rounded-2xl" style={{ fontFamily: 'system-ui, sans-serif' }}>

      {/* ── Left Panel: Asset Palette ───────────────────────────────────────── */}
      <aside className="w-56 flex-shrink-0 bg-white border-r border-[#e2e8f0] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-3 py-3 border-b border-[#e2e8f0]">
          <p className="text-xs font-bold text-[#0f172a] uppercase tracking-wider">Asset Library</p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-[10px] font-mono text-[#64748b]">MC$</span>
            <span className="text-sm font-black text-[#7c3aed]">
              {isSuperAdmin ? '∞' : mcCredits.toLocaleString()}
            </span>
            {isSuperAdmin && (
              <span className="text-[9px] bg-[#7c3aed]/10 text-[#7c3aed] px-1.5 py-0.5 rounded-full font-semibold">ALL UNLOCKED</span>
            )}
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex flex-col gap-0.5 p-2 border-b border-[#e2e8f0]">
          {ASSET_CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-left ${
                selectedCategory === cat.id
                  ? 'bg-[#7c3aed] text-white'
                  : 'text-[#64748b] hover:bg-[#f8fafc] hover:text-[#0f172a]'
              }`}
            >
              <span>{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Asset grid */}
        <div className="flex-1 overflow-y-auto p-2">
          {/* Floor tile selector (special UI) */}
          {selectedCategory === 'floors' && (
            <div className="mb-2 p-2 bg-[#f8fafc] rounded-lg border border-[#e2e8f0]">
              <p className="text-[9px] font-semibold text-[#64748b] uppercase tracking-wider mb-1.5">Active Floor</p>
              <div
                className="w-10 h-10 rounded-lg border-2 border-[#7c3aed] overflow-hidden"
                dangerouslySetInnerHTML={{ __html: floorAsset?.svg ?? '' }}
              />
            </div>
          )}
          <div className="space-y-1">
            {filteredAssets.map(asset => {
              const unlocked = isAssetUnlocked(asset, isSuperAdmin, ownedAssets)
              const isSelected = tool === 'place' && selectedAsset?.id === asset.id
              const isFloorSelected = selectedCategory === 'floors' && layout.floorAssetId === asset.id

              return (
                <button
                  key={asset.id}
                  onClick={() => {
                    if (!unlocked) return
                    if (selectedCategory === 'floors') {
                      setFloorTile(asset.id)
                    } else {
                      setSelectedAsset(asset)
                      setTool('place')
                    }
                  }}
                  className={`w-full flex items-center gap-2 p-2 rounded-xl border transition-all text-left relative ${
                    isSelected || isFloorSelected
                      ? 'border-[#7c3aed] bg-[#7c3aed]/8 shadow-sm'
                      : 'border-transparent hover:border-[#e2e8f0] hover:bg-[#f8fafc]'
                  } ${!unlocked ? 'opacity-60' : ''}`}
                >
                  {/* SVG preview */}
                  <div
                    className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-[#f1f5f9] border border-[#e2e8f0]"
                    dangerouslySetInnerHTML={{ __html: asset.svg }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-[#0f172a] truncate">{asset.name}</p>
                    <p className="text-[9px] text-[#94a3b8]">{asset.size[0]}×{asset.size[1]} tile{asset.size[0]*asset.size[1]>1?'s':''}</p>
                    {asset.tier === 'premium' && (
                      <p className="text-[9px] font-bold text-[#f59e0b]">
                        {unlocked ? '✓ Owned' : `MC$ ${asset.price}`}
                      </p>
                    )}
                  </div>
                  {asset.tier === 'premium' && !unlocked && (
                    <Lock size={10} className="text-[#94a3b8] flex-shrink-0" />
                  )}
                  {asset.tier === 'premium' && unlocked && (
                    <Star size={10} className="text-[#f59e0b] flex-shrink-0" />
                  )}
                  {isSuperAdmin && asset.tier === 'premium' && (
                    <Crown size={10} className="text-[#7c3aed] flex-shrink-0" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </aside>

      {/* ── Center: Grid Canvas ─────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-[#e2e8f0] flex-shrink-0">
          {/* Tools */}
          <div className="flex items-center gap-1 bg-[#f8fafc] rounded-xl p-1 border border-[#e2e8f0]">
            {([
              { id: 'place', icon: <MousePointer2 size={14}/>, label: 'Place' },
              { id: 'erase', icon: <Eraser size={14}/>, label: 'Erase' },
              { id: 'zone', icon: <PaintBucket size={14}/>, label: 'Zone Paint' },
            ] as const).map(t => (
              <button
                key={t.id}
                title={t.label}
                onClick={() => setTool(t.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  tool === t.id
                    ? 'bg-white shadow-sm text-[#7c3aed] border border-[#e2e8f0]'
                    : 'text-[#64748b] hover:text-[#0f172a]'
                }`}
              >
                {t.icon}
                <span className="hidden sm:block">{t.label}</span>
              </button>
            ))}
          </div>

          {/* Rotation */}
          <div className="flex items-center gap-1">
            <button
              title="Rotate CCW"
              onClick={() => rotateSelectedTile(-1)}
              className="p-1.5 rounded-lg hover:bg-[#f8fafc] text-[#64748b] border border-transparent hover:border-[#e2e8f0]"
            >
              <RotateCcw size={14}/>
            </button>
            <span className="text-[10px] font-mono text-[#94a3b8] w-8 text-center">{rotation}°</span>
            <button
              title="Rotate CW"
              onClick={() => rotateSelectedTile(1)}
              className="p-1.5 rounded-lg hover:bg-[#f8fafc] text-[#64748b] border border-transparent hover:border-[#e2e8f0]"
            >
              <RotateCw size={14}/>
            </button>
          </div>

          <div className="w-px h-5 bg-[#e2e8f0]" />

          {/* Zoom */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setZoom(z => Math.max(0.5, z - 0.1))}
              className="p-1.5 rounded-lg hover:bg-[#f8fafc] text-[#64748b]"
            >
              <ZoomOut size={14}/>
            </button>
            <span className="text-[10px] font-mono text-[#94a3b8] w-10 text-center">{Math.round(zoom*100)}%</span>
            <button
              onClick={() => setZoom(z => Math.min(1.5, z + 0.1))}
              className="p-1.5 rounded-lg hover:bg-[#f8fafc] text-[#64748b]"
            >
              <ZoomIn size={14}/>
            </button>
            <button
              onClick={() => setZoom(1)}
              className="text-[10px] text-[#94a3b8] hover:text-[#64748b] px-1"
            >
              Reset
            </button>
          </div>

          <div className="flex-1" />

          {/* Save indicator */}
          <div className="flex items-center gap-1.5 text-[11px]">
            {saving && <span className="text-[#94a3b8] animate-pulse">Saving…</span>}
            {saved && <span className="text-[#22c55e] font-semibold">✓ Saved</span>}
          </div>

          {/* Active tool hint */}
          {tool === 'place' && selectedAsset && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#7c3aed]/10 text-[#7c3aed] rounded-lg text-[11px] font-semibold">
              <div
                className="w-5 h-5 rounded overflow-hidden"
                dangerouslySetInnerHTML={{ __html: selectedAsset.svg }}
              />
              {selectedAsset.name}
            </div>
          )}
          {tool === 'erase' && (
            <div className="px-2.5 py-1 bg-red-50 text-red-500 rounded-lg text-[11px] font-semibold">
              Erase mode — click items to remove
            </div>
          )}
          {tool === 'zone' && editingZone && (
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-white"
              style={{ background: editingZone.color }}
            >
              <PaintBucket size={11}/>
              Painting: {editingZone.name}
            </div>
          )}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-auto p-4">
          <div
            className="relative inline-block select-none"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              width: layout.gridWidth * TILE_SIZE,
              height: layout.gridHeight * TILE_SIZE,
            }}
            onMouseLeave={() => setHoveredCell(null)}
          >
            {/* Floor tiles grid */}
            {Array.from({ length: layout.gridHeight }, (_, row) =>
              Array.from({ length: layout.gridWidth }, (_, col) => {
                const key = tileKey(col, row)
                const inPreview = previewSet.has(key)
                const inZone = zoneMap.get(key)
                const zone = inZone ? layout.zones.find(z => z.id === inZone) : null

                return (
                  <div
                    key={key}
                    className="absolute"
                    style={{
                      left: col * TILE_SIZE,
                      top: row * TILE_SIZE,
                      width: TILE_SIZE,
                      height: TILE_SIZE,
                    }}
                    onMouseEnter={() => setHoveredCell({ x: col, y: row })}
                    onMouseDown={(e) => {
                      if (e.button === 0) {
                        setIsPainting(true)
                        handleCellClick(col, row)
                      }
                    }}
                    onMouseMove={() => handleCellPaint(col, row)}
                    onMouseUp={() => setIsPainting(false)}
                  >
                    {/* Floor tile */}
                    <div
                      className="absolute inset-0"
                      dangerouslySetInnerHTML={{ __html: floorAsset?.svg ?? '<svg viewBox="0 0 52 52"><rect width="52" height="52" fill="#d4a96a"/></svg>' }}
                    />
                    {/* Zone overlay */}
                    {zone && (
                      <div
                        className="absolute inset-0"
                        style={{ background: zone.color, opacity: 0.18 }}
                      />
                    )}
                    {/* Grid lines */}
                    <div
                      className="absolute inset-0 border border-black/5"
                      style={{ boxShadow: inPreview
                        ? `inset 0 0 0 2px ${previewValid ? '#7c3aed' : '#ef4444'}`
                        : undefined
                      }}
                    />
                    {/* Hover highlight */}
                    {hoveredCell?.x === col && hoveredCell?.y === row && tool !== 'zone' && (
                      <div
                        className="absolute inset-0 rounded-sm"
                        style={{ background: tool === 'erase' ? 'rgba(239,68,68,0.2)' : 'rgba(124,58,237,0.12)' }}
                      />
                    )}
                    {/* Preview tint */}
                    {inPreview && (
                      <div
                        className="absolute inset-0"
                        style={{ background: previewValid ? 'rgba(124,58,237,0.15)' : 'rgba(239,68,68,0.15)' }}
                      />
                    )}
                  </div>
                )
              })
            )}

            {/* Placed furniture */}
            {layout.tiles.map(tile => {
              const asset = getAssetById(tile.assetId)
              if (!asset) return null
              const [w, h] = tile.rotation === 90 || tile.rotation === 270
                ? [asset.size[1], asset.size[0]]
                : asset.size
              const isSelected = tile.id === selectedTileId

              // Find agents assigned to the zone containing this tile's origin
              const zoneId = zoneMap.get(tileKey(tile.x, tile.y))
              const zone = zoneId ? layout.zones.find(z => z.id === zoneId) : null
              const zoneAgents = zone ? agents.filter(a => zone.agentIds.includes(a.id)) : []

              return (
                <div
                  key={tile.id}
                  className={`absolute transition-all cursor-pointer ${isSelected ? 'z-20' : 'z-10'}`}
                  style={{
                    left: tile.x * TILE_SIZE,
                    top: tile.y * TILE_SIZE,
                    width: w * TILE_SIZE,
                    height: h * TILE_SIZE,
                    outline: isSelected ? '2px solid #7c3aed' : undefined,
                    outlineOffset: isSelected ? '2px' : undefined,
                    filter: isSelected ? 'drop-shadow(0 4px 12px rgba(124,58,237,0.4))' : undefined,
                  }}
                  onClick={() => {
                    if (tool === 'select') setSelectedTileId(tile.id)
                    else if (tool === 'erase') {
                      updateLayout((prev) => ({ ...prev, tiles: prev.tiles.filter(t => t.id !== tile.id) }))
                    }
                  }}
                >
                  <div
                    className="w-full h-full"
                    style={{ transform: `rotate(${tile.rotation}deg)` }}
                    dangerouslySetInnerHTML={{ __html: asset.svg.replace(
                      /viewBox="([^"]+)"/,
                      `viewBox="$1" width="${w*TILE_SIZE}" height="${h*TILE_SIZE}"`
                    )}}
                  />
                  {/* Agent dots on this tile */}
                  {zoneAgents.slice(0, 3).map((agent, i) => (
                    <div
                      key={agent.id}
                      className="absolute"
                      style={{ right: i * 20, top: 4 }}
                    >
                      <AgentDot name={agent.name} color={agent.color} status={agent.status} />
                    </div>
                  ))}
                </div>
              )
            })}

            {/* Zone name labels */}
            {layout.zones.map(zone => {
              if (zone.tiles.length === 0) return null
              const minX = Math.min(...zone.tiles.map(t => t.x))
              const minY = Math.min(...zone.tiles.map(t => t.y))
              return (
                <div
                  key={`label-${zone.id}`}
                  className="absolute z-30 pointer-events-none"
                  style={{
                    left: minX * TILE_SIZE + 6,
                    top: minY * TILE_SIZE + 6,
                  }}
                >
                  <div
                    className="px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-sm"
                    style={{ background: zone.color }}
                  >
                    {zone.name}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Bottom hint bar */}
        <div className="px-4 py-2 bg-white border-t border-[#e2e8f0] flex items-center gap-4 text-[10px] text-[#94a3b8] flex-shrink-0">
          <span>🖱️ Click to place</span>
          <span>⌫ Right-panel Erase tool to remove</span>
          <span>🎨 Zone tool → paint zone areas → assign agents in right panel</span>
          <span>🔄 Rotate: buttons above</span>
          {isSuperAdmin && (
            <span className="ml-auto flex items-center gap-1 text-[#7c3aed] font-semibold">
              <Crown size={10}/> All assets unlocked
            </span>
          )}
        </div>
      </div>

      {/* ── Right Panel: Zones & Agents ─────────────────────────────────────── */}
      <aside className="w-60 flex-shrink-0 bg-white border-l border-[#e2e8f0] flex flex-col overflow-hidden">
        {/* Tab toggle */}
        <div className="flex border-b border-[#e2e8f0]">
          {(['zones', 'agents'] as const).map(p => (
            <button
              key={p}
              onClick={() => setRightPanel(p)}
              className={`flex-1 py-2.5 text-xs font-semibold transition-all capitalize ${
                rightPanel === p
                  ? 'text-[#7c3aed] border-b-2 border-[#7c3aed]'
                  : 'text-[#64748b] hover:text-[#0f172a]'
              }`}
            >
              {p === 'zones' ? '🏠 Zones' : '👥 Agents'}
            </button>
          ))}
        </div>

        {rightPanel === 'zones' ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-3 border-b border-[#e2e8f0]">
              <button
                onClick={addZone}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #4f8ef7)' }}
              >
                <Plus size={13}/> Add Zone
              </button>
              <p className="text-[9px] text-[#94a3b8] mt-1.5 text-center">
                Create zones, paint them on the floor, then assign agents
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
              {layout.zones.length === 0 && (
                <div className="text-center py-8 text-[#94a3b8] text-xs">
                  <PaintBucket size={24} className="mx-auto mb-2 opacity-30"/>
                  No zones yet.<br/>Add one to get started.
                </div>
              )}
              {layout.zones.map(zone => {
                const isEditing = editingZone?.id === zone.id
                const zoneAgents = agents.filter(a => zone.agentIds.includes(a.id))

                return (
                  <div
                    key={zone.id}
                    className={`rounded-xl border transition-all ${
                      isEditing ? 'border-[#7c3aed] shadow-sm' : 'border-[#e2e8f0]'
                    }`}
                    style={isEditing ? { boxShadow: `0 0 0 2px ${zone.color}30` } : {}}
                  >
                    <div
                      className="flex items-center gap-2 p-2 cursor-pointer"
                      onClick={() => {
                        if (isEditing) { setEditingZone(null); setTool('select') }
                        else { setEditingZone(zone); setTool('zone') }
                      }}
                    >
                      <div
                        className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                        style={{ background: zone.color }}
                      />
                      <input
                        value={zone.name}
                        onChange={e => { e.stopPropagation(); renameZone(zone.id, e.target.value) }}
                        onClick={e => e.stopPropagation()}
                        className="flex-1 text-[11px] font-semibold text-[#0f172a] bg-transparent outline-none min-w-0"
                      />
                      <span className="text-[9px] text-[#94a3b8]">{zone.tiles.length}t</span>
                      <button
                        onClick={e => { e.stopPropagation(); deleteZone(zone.id) }}
                        className="p-0.5 rounded hover:bg-red-50 text-[#94a3b8] hover:text-red-400"
                      >
                        <Trash2 size={10}/>
                      </button>
                    </div>
                    {isEditing && (
                      <div className="px-2 pb-2 pt-0.5 border-t border-[#f1f5f9] space-y-1.5">
                        <p className="text-[9px] text-[#94a3b8] font-medium">
                          Painting mode active — click/drag on grid to mark zone tiles
                        </p>
                        {/* Agents in this zone */}
                        <p className="text-[9px] font-bold text-[#0f172a] uppercase tracking-wider">Assigned Agents</p>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {agents.map(agent => {
                            const assigned = zone.agentIds.includes(agent.id)
                            return (
                              <button
                                key={agent.id}
                                onClick={() => toggleAgentInZone(zone.id, agent.id)}
                                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[10px] transition-all ${
                                  assigned
                                    ? 'bg-[#7c3aed]/10 text-[#7c3aed] border border-[#7c3aed]/25'
                                    : 'text-[#64748b] hover:bg-[#f8fafc] border border-transparent'
                                }`}
                              >
                                <div
                                  className="w-5 h-5 rounded-full flex-shrink-0 text-white flex items-center justify-center text-[7px] font-black"
                                  style={{ background: agent.color }}
                                >
                                  {agent.name.slice(0, 2).toUpperCase()}
                                </div>
                                <span className="font-medium truncate">{agent.name}</span>
                                {assigned && <span className="ml-auto text-[#7c3aed]">✓</span>}
                              </button>
                            )
                          })}
                          {agents.length === 0 && (
                            <p className="text-[9px] text-[#94a3b8]">No agents yet</p>
                          )}
                        </div>
                      </div>
                    )}
                    {/* Assigned agent chips (collapsed view) */}
                    {!isEditing && zoneAgents.length > 0 && (
                      <div className="flex flex-wrap gap-1 px-2 pb-2">
                        {zoneAgents.map(a => (
                          <div
                            key={a.id}
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-bold text-white"
                            style={{ background: a.color }}
                          >
                            {a.name.slice(0, 2).toUpperCase()}
                            <span className={`w-1.5 h-1.5 rounded-full ${a.status === 'active' ? 'bg-green-300' : 'bg-white/50'}`}/>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          /* Agents Panel */
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            <p className="text-[9px] text-[#94a3b8] px-1 pt-1">
              Agents in zones appear at their assigned desks. Click a zone to assign.
            </p>
            {agents.map(agent => {
              const zone = layout.zones.find(z => z.agentIds.includes(agent.id))
              return (
                <div key={agent.id} className="flex items-center gap-2 p-2 rounded-xl border border-[#e2e8f0] hover:border-[#cbd5e1] bg-[#fafafa]">
                  <div
                    className="w-8 h-8 rounded-full flex-shrink-0 text-white flex items-center justify-center text-[10px] font-black shadow-sm"
                    style={{ background: agent.color }}
                  >
                    {agent.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-[#0f172a] truncate">{agent.name}</p>
                    <p className="text-[9px] text-[#94a3b8] truncate">
                      {zone ? (
                        <span style={{ color: zone.color }}>● {zone.name}</span>
                      ) : (
                        <span>Unassigned</span>
                      )}
                    </p>
                  </div>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    agent.status === 'active' ? 'bg-emerald-400' :
                    agent.status === 'idle' ? 'bg-amber-400' : 'bg-slate-300'
                  }`}/>
                </div>
              )
            })}
            {agents.length === 0 && (
              <div className="text-center py-8 text-[#94a3b8] text-xs">
                <Users size={24} className="mx-auto mb-2 opacity-30"/>
                No agents yet
              </div>
            )}
          </div>
        )}

        {/* Selected tile info */}
        {selectedTile && selectedTileAsset && (
          <div className="border-t border-[#e2e8f0] p-3 bg-[#fafafa]">
            <p className="text-[9px] font-bold text-[#0f172a] uppercase tracking-wider mb-1.5">Selected Item</p>
            <div className="flex items-center gap-2">
              <div
                className="w-10 h-10 rounded-lg overflow-hidden border border-[#e2e8f0] flex-shrink-0"
                dangerouslySetInnerHTML={{ __html: selectedTileAsset.svg }}
              />
              <div>
                <p className="text-[11px] font-semibold text-[#0f172a]">{selectedTileAsset.name}</p>
                <p className="text-[9px] text-[#94a3b8]">Rotation: {selectedTile.rotation}°</p>
              </div>
            </div>
            <button
              onClick={() => {
                updateLayout(prev => ({ ...prev, tiles: prev.tiles.filter(t => t.id !== selectedTile.id) }))
                setSelectedTileId(null)
              }}
              className="mt-2 w-full flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-semibold text-red-400 hover:bg-red-50 transition-all border border-red-100"
            >
              <Trash2 size={11}/> Remove Item
            </button>
          </div>
        )}
      </aside>
    </div>
  )
}
