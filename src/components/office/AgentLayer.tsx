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

import { AgentBot } from '@/components/agents/AgentBot'
import type { AgentPresence } from '@/lib/office-presence'
import { WALK_MS } from '@/lib/office-presence'
import type { BotAnimation } from '@/lib/types'

interface Props {
  presences: AgentPresence[]
  /** Pixels per grid tile (world-space, before the parent canvas zoom). */
  tilePx: number
  onAgentClick?: (agentId: string) => void
  selectedAgentId?: string | null
}

const SPRITE_W = 50
const SPRITE_H = 64

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
        const activityLabel = presence.activity?.label || presence.message

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
              <AgentBot
                name={presence.agentName}
                avatar={presence.avatar || presence.initial}
                color={presence.color}
                photoUrl={presence.photoUrl}
                variant="office"
                animation={animationForPresence(presence)}
                status={presence.status === 'working' ? 'active' : 'idle'}
                size={44}
              />
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
  const radius = 18
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - safeValue)

  return (
    <svg className="office-agent-progress" width="50" height="50" viewBox="0 0 50 50" aria-hidden="true">
      <circle cx="25" cy="25" r={radius} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="3" />
      <circle
        cx="25"
        cy="25"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 25 25)"
      />
    </svg>
  )
}

function animationForPresence(presence: AgentPresence): BotAnimation {
  if (presence.status === 'working') return 'working'
  if (presence.pose === 'performing' || presence.activity?.kind === 'focus') return 'thinking'
  if (presence.activity?.kind === 'coffee' || presence.activity?.kind === 'lounge' || presence.activity?.kind === 'recharge') return 'resting'
  return 'idle'
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
    left: 3px;
    top: 9px;
    width: 44px;
    height: 44px;
    filter: drop-shadow(0 10px 14px rgba(0, 0, 0, 0.34));
    transition: transform 180ms ease;
  }

  .office-agent[data-facing="left"] .office-agent-body {
    transform: none;
  }

  .office-agent[data-moving="true"] .office-agent-body {
    animation: office-agent-walk 420ms ease-in-out infinite;
  }

  .office-agent[data-pose="sitting"] .office-agent-body {
    transform: translateY(5px);
  }

  .office-agent[data-facing="left"][data-pose="sitting"] .office-agent-body {
    transform: translateY(5px);
  }

  .office-agent[data-pose="performing"] .office-agent-body {
    animation: office-agent-perform 1100ms ease-in-out infinite;
  }

  .office-agent[data-selected="true"] .office-agent-body::before {
    content: "";
    position: absolute;
    inset: -5px;
    border: 2px solid var(--agent-ring);
    border-radius: 14px;
    box-shadow: 0 0 18px var(--agent-color-soft);
  }

  .office-agent-shadow {
    position: absolute;
    left: 9px;
    bottom: 0;
    width: 32px;
    height: 8px;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.28);
    filter: blur(1px);
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
    top: 6px;
    opacity: 0.95;
    filter: drop-shadow(0 0 8px var(--agent-color-soft));
  }

  .office-agent-name {
    position: absolute;
    left: 50%;
    top: 58px;
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

  @keyframes office-agent-perform {
    0%, 100% { translate: 0 0; }
    50% { translate: 0 -2px; }
  }

  @media (prefers-reduced-motion: reduce) {
    .office-agent-body {
      animation: none !important;
    }
  }
`
