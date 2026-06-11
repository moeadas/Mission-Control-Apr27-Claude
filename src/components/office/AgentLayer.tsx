'use client'

/**
 * AgentLayer — animated character layer for the live virtual office.
 *
 * Presence is computed by office-presence.ts. This component only renders and
 * interpolates the characters along the supplied paths. Positions live in refs
 * and are applied directly to DOM nodes in RAF, so the office can feel alive
 * without forcing React to re-render every frame.
 */

import React, { useEffect, useRef } from 'react'

import type { AgentPresence } from '@/lib/office-presence'
import { WALK_MS } from '@/lib/office-presence'

interface Props {
  presences: AgentPresence[]
  /** Pixels per grid tile (world-space, before the parent canvas zoom). */
  tilePx: number
  onAgentClick?: (agentId: string) => void
  selectedAgentId?: string | null
}

const SPRITE_W = 42
const SPRITE_H = 54

interface MotionState {
  x: number
  y: number
  route: Array<{ x: number; y: number }>
}

export function AgentLayer({ presences, tilePx, onAgentClick, selectedAgentId }: Props) {
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map())
  const motionRef = useRef<Map<string, MotionState>>(new Map())
  const presencesRef = useRef<AgentPresence[]>(presences)
  const rafRef = useRef<number | null>(null)
  const lastTickRef = useRef<number>(0)

  useEffect(() => {
    presencesRef.current = presences
    const liveIds = new Set(presences.map((presence) => presence.agentId))

    for (const presence of presences) {
      const current = motionRef.current.get(presence.agentId)
      const destination = { x: presence.targetX, y: presence.targetY }
      const route = presence.path && presence.path.length > 0 ? presence.path : [destination]

      if (!current) {
        motionRef.current.set(presence.agentId, {
          x: route[0]?.x ?? destination.x,
          y: route[0]?.y ?? destination.y,
          route: route.slice(1).length > 0 ? route.slice(1) : [destination],
        })
        continue
      }

      const final = current.route[current.route.length - 1]
      if (!final || Math.hypot(final.x - destination.x, final.y - destination.y) > 0.05) {
        const remainingRoute = route.filter((point) => Math.hypot(point.x - current.x, point.y - current.y) > 0.05)
        current.route = remainingRoute.length > 0 ? remainingRoute : [destination]
      }
    }

    for (const key of Array.from(motionRef.current.keys())) {
      if (!liveIds.has(key)) motionRef.current.delete(key)
    }
  }, [presences])

  useEffect(() => {
    function step(now: number) {
      const previous = lastTickRef.current || now
      const dt = Math.min(80, now - previous)
      lastTickRef.current = now
      const speedTilesPerMs = 1 / WALK_MS

      for (const presence of presencesRef.current) {
        const node = nodeRefs.current.get(presence.agentId)
        const motion = motionRef.current.get(presence.agentId)
        if (!node || !motion) continue

        const target = motion.route[0] || { x: presence.targetX, y: presence.targetY }
        const dx = target.x - motion.x
        const dy = target.y - motion.y
        const dist = Math.hypot(dx, dy)
        const walking = dist > 0.015

        if (walking) {
          const amount = speedTilesPerMs * dt
          if (amount >= dist) {
            motion.x = target.x
            motion.y = target.y
            motion.route.shift()
          } else {
            motion.x += (dx / dist) * amount
            motion.y += (dy / dist) * amount
          }
        }

        const left = motion.x * tilePx - SPRITE_W / 2
        const top = motion.y * tilePx - SPRITE_H + 10
        node.style.transform = `translate3d(${left}px, ${top}px, 0)`
        node.dataset.moving = walking ? 'true' : 'false'
      }

      rafRef.current = window.requestAnimationFrame(step)
    }

    rafRef.current = window.requestAnimationFrame(step)
    return () => {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current)
    }
  }, [tilePx])

  return (
    <div className="pointer-events-none absolute inset-0">
      <style>{AGENT_LAYER_CSS}</style>
      {presences.map((presence) => {
        const selected = selectedAgentId === presence.agentId
        const working = presence.status === 'working'
        const activityLabel = presence.message || presence.activity?.label

        return (
          <div
            key={presence.agentId}
            ref={(node) => {
              if (node) nodeRefs.current.set(presence.agentId, node)
              else nodeRefs.current.delete(presence.agentId)
            }}
            className="office-agent pointer-events-auto absolute cursor-pointer"
            data-pose={presence.pose}
            data-facing={presence.facing}
            data-selected={selected ? 'true' : 'false'}
            style={{
              width: SPRITE_W,
              height: SPRITE_H,
              zIndex: working ? 30 : 20,
              ['--agent-color' as any]: presence.color,
              ['--agent-color-soft' as any]: `${presence.color}2b`,
              ['--agent-ring' as any]: presence.departmentColor || presence.color,
            }}
            onClick={(event) => {
              event.stopPropagation()
              onAgentClick?.(presence.agentId)
            }}
            title={`${presence.agentName} - ${presence.activity?.label || presence.status}`}
          >
            {activityLabel && (
              <div className="office-agent-bubble">
                {truncate(activityLabel, 34)}
              </div>
            )}

            {working && (
              <ProgressRing value={presence.progress ?? 0.35} color={presence.color} />
            )}

            <div className="office-agent-shadow" />
            <div className="office-agent-body">
              <div className="office-agent-antenna" />
              <div className="office-agent-head">
                <span className="office-agent-eye office-agent-eye-left" />
                <span className="office-agent-eye office-agent-eye-right" />
                <span className="office-agent-mouth" />
              </div>
              <div className="office-agent-torso">
                <span>{presence.initial}</span>
              </div>
              <div className="office-agent-feet">
                <span />
                <span />
              </div>
            </div>

            <div className="office-agent-name">{presence.agentName}</div>
          </div>
        )
      })}
    </div>
  )
}

function ProgressRing({ value, color }: { value: number; color: string }) {
  const safeValue = Math.max(0, Math.min(1, value))
  const radius = 16
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - safeValue)

  return (
    <svg className="office-agent-progress" width="42" height="42" viewBox="0 0 42 42" aria-hidden="true">
      <circle cx="21" cy="21" r={radius} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="3" />
      <circle
        cx="21"
        cy="21"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 21 21)"
      />
    </svg>
  )
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value
  return value.slice(0, max - 1) + '...'
}

const AGENT_LAYER_CSS = `
  .office-agent {
    will-change: transform;
    transform: translate3d(-999px, -999px, 0);
  }

  .office-agent-body {
    position: absolute;
    left: 4px;
    top: 10px;
    width: 34px;
    height: 40px;
    filter: drop-shadow(0 10px 14px rgba(0, 0, 0, 0.34));
    transition: transform 180ms ease;
  }

  .office-agent[data-facing="left"] .office-agent-body {
    transform: scaleX(-1);
  }

  .office-agent[data-moving="true"] .office-agent-body {
    animation: office-agent-walk 420ms ease-in-out infinite;
  }

  .office-agent[data-pose="sitting"] .office-agent-body {
    transform: translateY(5px);
  }

  .office-agent[data-facing="left"][data-pose="sitting"] .office-agent-body {
    transform: translateY(5px) scaleX(-1);
  }

  .office-agent[data-pose="performing"] .office-agent-body {
    animation: office-agent-perform 1100ms ease-in-out infinite;
  }

  .office-agent[data-selected="true"] .office-agent-body::before {
    content: "";
    position: absolute;
    inset: -7px -6px -3px;
    border: 2px solid var(--agent-ring);
    border-radius: 18px;
    box-shadow: 0 0 18px var(--agent-color-soft);
  }

  .office-agent-shadow {
    position: absolute;
    left: 7px;
    bottom: 0;
    width: 28px;
    height: 8px;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.28);
    filter: blur(1px);
  }

  .office-agent-antenna {
    position: absolute;
    left: 16px;
    top: -6px;
    width: 3px;
    height: 8px;
    border-radius: 999px;
    background: var(--agent-color);
  }

  .office-agent-antenna::after {
    content: "";
    position: absolute;
    left: -3px;
    top: -5px;
    width: 9px;
    height: 9px;
    border-radius: 999px;
    background: #f8fafc;
    box-shadow: 0 0 10px var(--agent-color);
  }

  .office-agent-head {
    position: absolute;
    left: 3px;
    top: 0;
    width: 28px;
    height: 24px;
    border: 2px solid rgba(255,255,255,0.58);
    border-radius: 10px;
    background: linear-gradient(145deg, var(--agent-color), #1f2937);
  }

  .office-agent-head::before,
  .office-agent-head::after {
    content: "";
    position: absolute;
    top: 8px;
    width: 4px;
    height: 8px;
    border-radius: 4px;
    background: var(--agent-color);
    opacity: 0.8;
  }

  .office-agent-head::before { left: -6px; }
  .office-agent-head::after { right: -6px; }

  .office-agent-eye {
    position: absolute;
    top: 8px;
    width: 5px;
    height: 5px;
    border-radius: 999px;
    background: #e0f2fe;
    box-shadow: 0 0 8px #67e8f9;
  }

  .office-agent-eye-left { left: 7px; }
  .office-agent-eye-right { right: 7px; }

  .office-agent-mouth {
    position: absolute;
    left: 10px;
    bottom: 5px;
    width: 8px;
    height: 3px;
    border-radius: 0 0 8px 8px;
    border-bottom: 2px solid rgba(255,255,255,0.72);
  }

  .office-agent-torso {
    position: absolute;
    left: 8px;
    top: 24px;
    width: 18px;
    height: 15px;
    border-radius: 6px 6px 7px 7px;
    background: linear-gradient(180deg, #f8fafc, #cbd5e1);
    color: #0f172a;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 9px;
    font-weight: 800;
    box-shadow: inset 0 -3px 0 rgba(15,23,42,0.16);
  }

  .office-agent-feet {
    position: absolute;
    left: 8px;
    top: 38px;
    width: 18px;
    display: flex;
    justify-content: space-between;
  }

  .office-agent-feet span {
    width: 7px;
    height: 5px;
    border-radius: 2px;
    background: var(--agent-color);
  }

  .office-agent[data-moving="true"] .office-agent-feet span:first-child {
    animation: office-agent-foot-a 420ms ease-in-out infinite;
  }

  .office-agent[data-moving="true"] .office-agent-feet span:last-child {
    animation: office-agent-foot-b 420ms ease-in-out infinite;
  }

  .office-agent-bubble {
    position: absolute;
    left: 50%;
    top: -22px;
    transform: translateX(-50%);
    max-width: 190px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    border: 1px solid rgba(255,255,255,0.14);
    border-radius: 999px;
    background: rgba(15, 17, 23, 0.92);
    color: #f8fafc;
    padding: 4px 8px;
    font-size: 10px;
    font-weight: 700;
    box-shadow: 0 8px 22px rgba(0,0,0,0.32);
    backdrop-filter: blur(10px);
  }

  .office-agent-progress {
    position: absolute;
    left: 0;
    top: 7px;
    opacity: 0.95;
    filter: drop-shadow(0 0 8px var(--agent-color-soft));
  }

  .office-agent-name {
    position: absolute;
    left: 50%;
    top: 53px;
    transform: translateX(-50%);
    max-width: 110px;
    padding: 2px 6px;
    border-radius: 999px;
    background: rgba(15,17,23,0.82);
    border: 1px solid rgba(255,255,255,0.1);
    color: rgba(255,255,255,0.78);
    font-size: 9px;
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    opacity: 0;
    transition: opacity 150ms ease;
  }

  .office-agent:hover .office-agent-name,
  .office-agent[data-selected="true"] .office-agent-name {
    opacity: 1;
  }

  @keyframes office-agent-walk {
    0%, 100% { translate: 0 0; }
    50% { translate: 0 -3px; }
  }

  @keyframes office-agent-foot-a {
    0%, 100% { transform: translateX(-1px); }
    50% { transform: translateX(2px); }
  }

  @keyframes office-agent-foot-b {
    0%, 100% { transform: translateX(2px); }
    50% { transform: translateX(-1px); }
  }

  @keyframes office-agent-perform {
    0%, 100% { translate: 0 0; }
    50% { translate: 0 -2px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .office-agent-body,
    .office-agent-feet span {
      animation: none !important;
    }
  }
`
