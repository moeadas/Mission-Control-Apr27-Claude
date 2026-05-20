'use client'

/**
 * AgentLayer — pixel-art agent tokens rendered on top of the office canvas.
 *
 * Reads computed AgentPresence and renders one token per agent. Tokens
 * smoothly tween between positions using CSS transitions on the
 * transform property (1.4s ease-in-out, matching WALK_MS in office-presence).
 *
 * Each token is a 36×36 circle with the agent's first initial in the middle,
 * the agent's color as the fill, and a status indicator (pulsing dot for
 * working, none for idle, X for offline). If the agent has a department a
 * thin halo ring uses the department color so teammates visually cluster.
 *
 * Speech bubbles appear above working agents that have a live narration
 * message ('Echo is drafting copy options…'). They're cosmetic — clicking
 * an agent opens a side panel with the full active task.
 */

import React, { useEffect, useRef, useState } from 'react'

import type { AgentPresence } from '@/lib/office-presence'
import { PRESENCE_TICK_MS, WALK_MS } from '@/lib/office-presence'

interface Props {
  presences: AgentPresence[]
  /** Pixels per grid tile (the parent canvas's tile size after zoom). */
  tilePx: number
  /** Click handler — called with agentId when a token is clicked. */
  onAgentClick?: (agentId: string) => void
  /** Currently selected agent id (for ring highlight). */
  selectedAgentId?: string | null
}

const TOKEN_PX = 36

export function AgentLayer({ presences, tilePx, onAgentClick, selectedAgentId }: Props) {
  // Persistent position state — interpolated separately from the target so
  // tokens animate smoothly when the target changes. Without this each
  // re-render would snap to the new tile.
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({})
  const targetsRef = useRef<Record<string, { x: number; y: number }>>({})
  const rafRef = useRef<number | null>(null)
  const lastTickRef = useRef<number>(performance.now())

  // Keep targets up to date whenever the presences array changes.
  useEffect(() => {
    const next: Record<string, { x: number; y: number }> = {}
    for (const p of presences) {
      next[p.agentId] = { x: p.targetX, y: p.targetY }
    }
    targetsRef.current = next
    // Initialise positions for any new agents to their target — avoids
    // every new agent flying in from (0,0) on first paint.
    setPositions((prev) => {
      const out = { ...prev }
      for (const p of presences) {
        if (!out[p.agentId]) out[p.agentId] = { x: p.targetX, y: p.targetY }
      }
      // Remove agents that no longer exist.
      for (const k of Object.keys(out)) {
        if (!next[k]) delete out[k]
      }
      return out
    })
  }, [presences])

  // Animation loop — moves each token toward its target at a constant
  // grid-tiles-per-second speed.
  useEffect(() => {
    function step(now: number) {
      const dt = Math.min(100, now - lastTickRef.current)
      lastTickRef.current = now
      const speedTilesPerMs = 1 / WALK_MS // 1 tile per WALK_MS
      let changed = false
      const next: Record<string, { x: number; y: number }> = {}
      const current = positions
      for (const agentId of Object.keys(targetsRef.current)) {
        const target = targetsRef.current[agentId]
        const pos = current[agentId] || target
        const dx = target.x - pos.x
        const dy = target.y - pos.y
        const dist = Math.hypot(dx, dy)
        if (dist < 0.005) {
          next[agentId] = target
          continue
        }
        const step = speedTilesPerMs * dt
        if (step >= dist) {
          next[agentId] = target
        } else {
          next[agentId] = { x: pos.x + (dx / dist) * step, y: pos.y + (dy / dist) * step }
        }
        changed = true
      }
      if (changed) setPositions(next)
      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
    // Intentionally empty deps — the loop reads from refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="pointer-events-none absolute inset-0">
      {presences.map((presence) => {
        const pos = positions[presence.agentId] || { x: presence.targetX, y: presence.targetY }
        const isSelected = selectedAgentId === presence.agentId
        const left = pos.x * tilePx - TOKEN_PX / 2
        const top = pos.y * tilePx - TOKEN_PX / 2

        return (
          <div
            key={presence.agentId}
            className="absolute pointer-events-auto cursor-pointer group"
            style={{
              transform: `translate(${left}px, ${top}px)`,
              width: TOKEN_PX,
              height: TOKEN_PX,
              zIndex: presence.status === 'working' ? 20 : 15,
              transition: 'transform 0s linear',
            }}
            onClick={(e) => {
              e.stopPropagation()
              onAgentClick?.(presence.agentId)
            }}
            title={`${presence.agentName} — ${presence.status}${presence.message ? ` · ${presence.message}` : ''}`}
          >
            {/* Halo / selection ring */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                boxShadow: isSelected
                  ? `0 0 0 3px #fff, 0 0 12px 4px ${presence.color}cc`
                  : presence.departmentColor
                    ? `0 0 0 2px ${presence.departmentColor}aa`
                    : `0 0 0 1px rgba(255,255,255,0.12)`,
              }}
            />
            {/* Token body */}
            <div
              className="absolute inset-1 rounded-full flex items-center justify-center font-bold text-[12px] text-white select-none"
              style={{
                background: `linear-gradient(135deg, ${presence.color} 0%, ${shade(presence.color, -25)} 100%)`,
                textShadow: '0 1px 2px rgba(0,0,0,0.4)',
              }}
            >
              {presence.initial}
            </div>
            {/* Status indicator */}
            {presence.status === 'working' && (
              <div className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-[#0f1117]">
                <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
              </div>
            )}
            {presence.status === 'idle' && (
              <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-slate-300/60 ring-2 ring-[#0f1117]" />
            )}
            {/* Speech bubble for live narration */}
            {presence.message && presence.status === 'working' && (
              <div
                className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-medium text-white shadow-lg ring-1 ring-white/10 backdrop-blur"
                style={{
                  background: 'rgba(15,17,23,0.92)',
                  maxWidth: 220,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {truncate(presence.message, 36)}
              </div>
            )}
            {/* Name label below — visible on hover */}
            <div
              className="absolute top-full left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap rounded px-1.5 py-0.5 text-[9px] font-mono text-white opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: 'rgba(15,17,23,0.85)' }}
            >
              {presence.agentName}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Tiny color helpers ──────────────────────────────────────────────────
function shade(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16)
  let r = (num >> 16) & 0xff
  let g = (num >> 8) & 0xff
  let b = num & 0xff
  r = Math.max(0, Math.min(255, r + Math.round((255 * percent) / 100)))
  g = Math.max(0, Math.min(255, g + Math.round((255 * percent) / 100)))
  b = Math.max(0, Math.min(255, b + Math.round((255 * percent) / 100)))
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max - 1) + '…'
}

// Re-export tick interval for the hook below.
export { PRESENCE_TICK_MS }
