'use client'

import React, { useMemo, useState } from 'react'
import { Clock3, Crown, Sparkles, Trophy, Users, X, Zap, Radio } from 'lucide-react'
import { clsx } from 'clsx'

import { AgentBot } from '@/components/agents/AgentBot'
import { buildAgentLeaderboard, getLiveMissionSnapshots, getLiveOfficeAgentStates } from '@/lib/live-ops'
import { useAgentsStore } from '@/lib/agents-store'
import { Agent } from '@/lib/types'

const ROOMS = [
  {
    id: 'client-services',
    name: 'Client Services',
    accent: '#3b82f6',
    accentLight: '#dbeafe',
    accentMid: '#93c5fd',
    frame: { left: '4%', top: '8%', width: '28%', height: '30%' },
    label: { left: '6%', top: '10%' },
    seats: [
      { left: '16%', top: '27%' },
      { left: '24%', top: '27%' },
      { left: '20%', top: '33%' },
    ],
  },
  {
    id: 'orchestration',
    name: 'Mission Control',
    accent: '#7c3aed',
    accentLight: '#ede9fe',
    accentMid: '#c4b5fd',
    frame: { left: '38%', top: '8%', width: '20%', height: '23%' },
    label: { left: '40%', top: '10%' },
    seats: [
      { left: '45%', top: '23%' },
      { left: '52%', top: '23%' },
    ],
  },
  {
    id: 'creative',
    name: 'Creative Studio',
    accent: '#0891b2',
    accentLight: '#cffafe',
    accentMid: '#67e8f9',
    frame: { left: '63%', top: '8%', width: '29%', height: '30%' },
    label: { left: '65%', top: '10%' },
    seats: [
      { left: '72%', top: '26%' },
      { left: '79%', top: '26%' },
      { left: '86%', top: '26%' },
    ],
  },
  {
    id: 'research',
    name: 'Research Lab',
    accent: '#059669',
    accentLight: '#d1fae5',
    accentMid: '#6ee7b7',
    frame: { left: '10%', top: '53%', width: '32%', height: '28%' },
    label: { left: '12%', top: '55%' },
    seats: [{ left: '26%', top: '71%' }],
  },
  {
    id: 'media',
    name: 'Media Planning',
    accent: '#e11d48',
    accentLight: '#ffe4e6',
    accentMid: '#fda4af',
    frame: { left: '57%', top: '53%', width: '31%', height: '28%' },
    label: { left: '59%', top: '55%' },
    seats: [
      { left: '69%', top: '71%' },
      { left: '77%', top: '71%' },
    ],
  },
] as const

const DIVIDERS = [
  { left: '34%', top: '6%', width: '2px', height: '32%' },
  { left: '60%', top: '6%', width: '2px', height: '32%' },
  { left: '9%', top: '44%', width: '82%', height: '2px' },
  { left: '50%', top: '50%', width: '2px', height: '32%' },
] as const

const GLOBAL_KEYFRAMES = `
  @keyframes office-pulse {
    0%, 100% { opacity: 0.25; transform: scale(1); }
    50% { opacity: 0.8; transform: scale(1.4); }
  }
  @keyframes led-blink {
    0%, 50%, 100% { opacity: 1; }
    25%, 75% { opacity: 0.2; }
  }
  @keyframes slide-in-up {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes office-route-a {
    0% { transform: translate(-50%, -50%) translate3d(0, 0, 0); }
    28% { transform: translate(-50%, -50%) translate3d(102px, 0, 0); }
    56% { transform: translate(-50%, -50%) translate3d(102px, 64px, 0); }
    78% { transform: translate(-50%, -50%) translate3d(28px, 64px, 0); }
    100% { transform: translate(-50%, -50%) translate3d(28px, 118px, 0); }
  }
  @keyframes office-route-b {
    0% { transform: translate(-50%, -50%) translate3d(0, 0, 0); }
    28% { transform: translate(-50%, -50%) translate3d(-102px, 0, 0); }
    56% { transform: translate(-50%, -50%) translate3d(-102px, 68px, 0); }
    78% { transform: translate(-50%, -50%) translate3d(-30px, 68px, 0); }
    100% { transform: translate(-50%, -50%) translate3d(-30px, 120px, 0); }
  }
  @keyframes office-route-c {
    0% { transform: translate(-50%, -50%) translate3d(0, 0, 0); }
    24% { transform: translate(-50%, -50%) translate3d(0, -78px, 0); }
    52% { transform: translate(-50%, -50%) translate3d(92px, -78px, 0); }
    76% { transform: translate(-50%, -50%) translate3d(92px, -14px, 0); }
    100% { transform: translate(-50%, -50%) translate3d(26px, -14px, 0); }
  }
  @keyframes office-route-d {
    0% { transform: translate(-50%, -50%) translate3d(0, 0, 0); }
    24% { transform: translate(-50%, -50%) translate3d(0, -78px, 0); }
    52% { transform: translate(-50%, -50%) translate3d(-94px, -78px, 0); }
    76% { transform: translate(-50%, -50%) translate3d(-94px, -16px, 0); }
    100% { transform: translate(-50%, -50%) translate3d(-28px, -16px, 0); }
  }
  @keyframes office-route-e {
    0% { transform: translate(-50%, -50%) translate3d(0, 0, 0); }
    25% { transform: translate(-50%, -50%) translate3d(64px, 0, 0); }
    50% { transform: translate(-50%, -50%) translate3d(64px, -72px, 0); }
    75% { transform: translate(-50%, -50%) translate3d(-52px, -72px, 0); }
    100% { transform: translate(-50%, -50%) translate3d(-52px, 0, 0); }
  }
`

const AGENT_CAPACITY_UNITS = 2.5

function normalizeOfficeDivision(division?: string) {
  if (division === 'strategy') return 'client-services'
  return division || 'creative'
}

function getRoamSlots(count: number) {
  const anchors = [
    { left: 38, top: 40, animation: 'office-route-a 22s linear infinite alternate' },
    { left: 62, top: 40, animation: 'office-route-b 24s linear infinite alternate' },
    { left: 40, top: 58, animation: 'office-route-c 23s linear infinite alternate' },
    { left: 60, top: 58, animation: 'office-route-d 25s linear infinite alternate' },
    { left: 48, top: 72, animation: 'office-route-e 26s linear infinite alternate' },
    { left: 33, top: 46, animation: 'office-route-a 27s linear infinite alternate 0.8s' },
    { left: 67, top: 46, animation: 'office-route-b 28s linear infinite alternate 1.4s' },
    { left: 35, top: 66, animation: 'office-route-c 24s linear infinite alternate 1.1s' },
    { left: 65, top: 66, animation: 'office-route-d 26s linear infinite alternate 0.5s' },
    { left: 48, top: 50, animation: 'office-route-e 21s linear infinite alternate 1s' },
    { left: 28, top: 58, animation: 'office-route-a 29s linear infinite alternate 1.8s' },
    { left: 72, top: 58, animation: 'office-route-b 30s linear infinite alternate 2.1s' },
  ]

  return Array.from({ length: count }, (_, index) => {
    const base = anchors[index % anchors.length]
    const rowShift = Math.floor(index / anchors.length)
    const verticalOffset = rowShift * 1.8
    return {
      left: `${base.left}%`,
      top: `${Math.min(78, base.top + verticalOffset)}%`,
      animation: base.animation,
    }
  })
}

function getAgentWorkloadPercent(agentId: string, liveMissions: ReturnType<typeof getLiveMissionSnapshots>) {
  const loadUnits = liveMissions.reduce((total, snapshot) => {
    if (!snapshot.involvedAgentIds.includes(agentId)) return total
    const contribution = snapshot.mission.leadAgentId === agentId ? 1 : 0.65
    return total + contribution
  }, 0)

  return Math.min(100, Math.round((loadUnits / AGENT_CAPACITY_UNITS) * 100))
}

function Plant({ className }: { className?: string }) {
  return (
    <div className={clsx('absolute', className)}>
      <div className="relative h-[18px] w-[18px]">
        <span className="absolute left-0 top-0 h-3.5 w-3.5 rounded-full border-[1.5px] border-emerald-400 bg-emerald-100" />
        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-[1.5px] border-emerald-400 bg-emerald-50" />
        <span className="absolute left-[4px] top-[4px] h-2 w-2 rounded-full bg-emerald-300" />
      </div>
    </div>
  )
}

function Desk({ className, accent = '#94a3b8' }: { className?: string; accent?: string }) {
  return (
    <div
      className={clsx('absolute rounded-[5px]', className)}
      style={{ border: `2px solid ${accent}`, background: '#f8fafc' }}
    >
      <span
        className="absolute left-2.5 top-[4px] h-[7px] w-[18px] rounded-[2px]"
        style={{ border: `1.5px solid ${accent}`, background: `${accent}15` }}
      />
      <span
        className="absolute right-2.5 top-[5px] h-[5px] w-[10px] rounded-[1px]"
        style={{ border: `1px solid ${accent}` }}
      />
    </div>
  )
}

function LDesk({ className, accent = '#94a3b8' }: { className?: string; accent?: string }) {
  return (
    <div className={clsx('absolute', className)}>
      <div
        className="absolute inset-x-0 top-0 h-9 rounded-[5px]"
        style={{ border: `2px solid ${accent}`, background: '#f8fafc' }}
      />
      <div
        className="absolute right-0 top-0 h-14 w-9 rounded-[5px]"
        style={{ border: `2px solid ${accent}`, background: '#f8fafc' }}
      />
      <span
        className="absolute left-2.5 top-[5px] h-[6px] w-[14px] rounded-[2px]"
        style={{ border: `1.5px solid ${accent}`, background: `${accent}15` }}
      />
    </div>
  )
}

function Chair({ className, accent = '#f59e0b' }: { className?: string; accent?: string }) {
  return (
    <div
      className={clsx('absolute h-[16px] w-[16px] rounded-full', className)}
      style={{ border: `2px solid ${accent}`, background: `${accent}25` }}
    />
  )
}

function MeetingTable({ className, accent = '#94a3b8' }: { className?: string; accent?: string }) {
  return (
    <div
      className={clsx('absolute rounded-full', className)}
      style={{ border: `2px solid ${accent}`, background: '#f8fafc' }}
    />
  )
}

function Sofa({ className, accent = '#94a3b8' }: { className?: string; accent?: string }) {
  return (
    <div
      className={clsx('absolute rounded-[8px]', className)}
      style={{ border: `2px solid ${accent}`, background: `${accent}12` }}
    >
      <span
        className="absolute inset-x-[10%] top-[18%] h-[44%] rounded-[5px]"
        style={{ border: `1.5px solid ${accent}40` }}
      />
    </div>
  )
}

function Shelf({ className, accent = '#94a3b8' }: { className?: string; accent?: string }) {
  return (
    <div
      className={clsx('absolute rounded-[4px]', className)}
      style={{ border: `2px solid ${accent}`, background: '#f8fafc' }}
    >
      <span className="absolute inset-x-[3px] top-[33%] h-px" style={{ background: `${accent}60` }} />
      <span className="absolute inset-x-[3px] top-[66%] h-px" style={{ background: `${accent}60` }} />
    </div>
  )
}

function Whiteboard({ className, accent = '#94a3b8' }: { className?: string; accent?: string }) {
  return (
    <div
      className={clsx('absolute rounded-[3px]', className)}
      style={{ border: `2px solid ${accent}`, background: '#ffffff' }}
    >
      <span className="absolute bottom-[2px] right-[6px] h-[3px] w-[6px] rounded-sm" style={{ background: accent }} />
    </div>
  )
}

function ServerRack({ className, accent = '#94a3b8', ledColor = '#22c55e' }: { className?: string; accent?: string; ledColor?: string }) {
  return (
    <div
      className={clsx('absolute rounded-[3px]', className)}
      style={{ border: `2px solid ${accent}`, background: '#f1f5f9' }}
    >
      <span
        className="absolute right-[5px] top-[4px] h-[4px] w-[4px] rounded-full"
        style={{ background: ledColor, boxShadow: `0 0 4px ${ledColor}`, animation: 'led-blink 2s infinite' }}
      />
      <span
        className="absolute right-[13px] top-[5px] h-[3px] w-[3px] rounded-full"
        style={{ background: accent, animation: 'led-blink 2s infinite 0.6s' }}
      />
    </div>
  )
}

function SpeechBubble({
  text,
  tone,
  align = 'center',
}: {
  text: string
  tone: 'thinking' | 'working' | 'reviewing' | 'blocked'
  align?: 'left' | 'right' | 'center'
}) {
  const toneConfig = {
    thinking: { border: '#bfdbfe', text: '#1d4ed8', bg: '#eff6ff' },
    working: { border: '#a7f3d0', text: '#047857', bg: '#ecfdf5' },
    reviewing: { border: '#fde68a', text: '#92400e', bg: '#fffbeb' },
    blocked: { border: '#fecdd3', text: '#be123c', bg: '#fff1f2' },
  }[tone]

  return (
    <div
      className={clsx(
        'absolute -top-12 z-30 w-[132px]',
        align === 'center' && 'left-1/2 -translate-x-1/2',
        align === 'left' && 'right-[56%]',
        align === 'right' && 'left-[56%]'
      )}
      style={{ animation: 'slide-in-up 0.25s ease-out' }}
    >
      <div
        className="rounded-xl px-2.5 py-1.5 shadow-sm"
        style={{ border: `1.5px solid ${toneConfig.border}`, background: toneConfig.bg }}
      >
        <p className="text-[10px] font-semibold leading-snug" style={{ color: toneConfig.text }}>
          {text}
        </p>
      </div>
      <div
        className="mx-auto mt-[-4px] h-2 w-2 rotate-45 shadow-sm"
        style={{
          borderRight: `1.5px solid ${toneConfig.border}`,
          borderBottom: `1.5px solid ${toneConfig.border}`,
          background: toneConfig.bg,
        }}
      />
    </div>
  )
}

function RoomFurniture({ roomId }: { roomId: string }) {
  const room = ROOMS.find((r) => r.id === roomId)
  const a = room?.accent ?? '#94a3b8'

  switch (roomId) {
    case 'client-services':
      return (
        <>
          <Desk className="left-[14%] top-[36%] h-9 w-[44%]" accent={a} />
          <Chair className="left-[24%] top-[56%]" />
          <Chair className="left-[42%] top-[56%]" />
          <Sofa className="right-[10%] top-[26%] h-[24%] w-[12%]" accent={a} />
          <Plant className="right-[12%] bottom-[12%]" />
        </>
      )
    case 'orchestration':
      return (
        <>
          <LDesk className="left-[20%] top-[28%] h-[36%] w-[54%]" accent={a} />
          <Chair className="left-[36%] top-[60%]" />
          <Chair className="left-[56%] top-[60%]" />
          <ServerRack className="right-[8%] top-[24%] h-[14px] w-[38px]" accent={a} />
          <ServerRack className="right-[8%] top-[42%] h-[14px] w-[38px]" accent={a} ledColor="#f59e0b" />
        </>
      )
    case 'creative':
      return (
        <>
          <Desk className="left-[8%] top-[34%] h-9 w-[30%]" accent={a} />
          <Desk className="left-[48%] top-[34%] h-9 w-[30%]" accent={a} />
          <MeetingTable className="left-[37%] top-[58%] h-9 w-[20%]" accent={a} />
          <Chair className="left-[16%] top-[54%]" />
          <Chair className="left-[56%] top-[54%]" />
          <Chair className="left-[43%] top-[68%]" />
          <Whiteboard className="left-[18%] top-[6%] h-[8px] w-[50%]" accent={a} />
          <Plant className="left-[8%] top-[12%]" />
        </>
      )
    case 'research':
      return (
        <>
          <LDesk className="left-[12%] top-[26%] h-[38%] w-[28%]" accent={a} />
          <Shelf className="right-[10%] top-[20%] h-[38%] w-[10%]" accent={a} />
          <MeetingTable className="left-[42%] top-[48%] h-10 w-[24%]" accent={a} />
          <Chair className="left-[48%] top-[66%]" />
          <Plant className="right-[10%] bottom-[12%]" />
        </>
      )
    default:
      return (
        <>
          <Desk className="left-[10%] top-[28%] h-9 w-[28%]" accent={a} />
          <Desk className="right-[12%] top-[28%] h-9 w-[24%]" accent={a} />
          <Sofa className="left-[36%] top-[56%] h-[16%] w-[20%]" accent={a} />
          <Chair className="left-[18%] top-[50%]" />
          <Chair className="right-[22%] top-[50%]" />
          <Plant className="right-[10%] bottom-[12%]" />
        </>
      )
  }
}

function TrophyBoard({
  leaders,
  onClose,
}: {
  leaders: ReturnType<typeof buildAgentLeaderboard>
  onClose: () => void
}) {
  const topThree = leaders.slice(0, 3)
  const medals = [
    { color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
    { color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0' },
    { color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  ]

  return (
    <div
      className="absolute right-5 top-20 z-40 w-[280px] overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-xl"
      style={{ animation: 'slide-in-up 0.25s ease-out' }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-amber-600">
            Trophy Board
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400">Top performers this week</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
        >
          <X size={12} />
        </button>
      </div>
      <div className="mt-3 space-y-1.5">
        {topThree.map((entry, index) => {
          const m = medals[index] || medals[2]
          return (
            <div
              key={entry.agentId}
              className="flex items-center gap-2.5 rounded-xl border px-3 py-2 transition-colors hover:bg-slate-50"
              style={{ borderColor: m.border, background: m.bg }}
            >
              <div
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                style={{ color: m.color, border: `1.5px solid ${m.color}`, background: `${m.color}15` }}
              >
                {index === 0 ? <Crown size={11} /> : index + 1}
              </div>
              <AgentBot
                name={entry.agentName}
                avatar={entry.avatar || 'bot-blue'}
                photoUrl={entry.photoUrl}
                color={entry.color}
                variant="office"
                status="active"
                animation={index === 0 ? 'working' : 'idle'}
                size={28}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-700">{entry.agentName}</p>
                <p className="text-[10px] text-slate-400">
                  {entry.tasksCompleted} closed · {entry.currentHotStreak} streak
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MissionSpotlight({
  missionCount,
  featuredSummary,
}: {
  missionCount: number
  featuredSummary: string
}) {
  return (
    <div className="absolute left-4 top-4 z-30 flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white/90 px-3.5 py-2 shadow-sm backdrop-blur-sm">
      <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-blue-600">
        <Sparkles size={11} />
        Live
      </span>
      <span className="h-3 w-px bg-slate-200" />
      <span className="text-[11px] text-slate-500">
        {missionCount} active · {featuredSummary}
      </span>
    </div>
  )
}

function StatusBar({
  onMissionCount,
  roamingCount,
  totalCount,
}: {
  onMissionCount: number
  roamingCount: number
  totalCount: number
}) {
  return (
    <div className="absolute bottom-4 left-4 z-30 flex items-center gap-3 rounded-xl border border-slate-200 bg-white/90 px-4 py-2 shadow-sm backdrop-blur-sm">
      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
        <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(34,197,94,0.5)]" />
        <span>{onMissionCount} on mission</span>
      </div>
      <span className="h-3 w-px bg-slate-200" />
      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
        <Clock3 size={11} className="text-slate-400" />
        <span>{roamingCount} roaming</span>
      </div>
      <span className="h-3 w-px bg-slate-200" />
      <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
        <Users size={11} className="text-slate-400" />
        <span>{totalCount} total</span>
      </div>
    </div>
  )
}

function RoomZone({
  room,
  agents,
  engagedAgentIds,
  liveStates,
  isSelected,
  missionCount,
  onSelect,
}: {
  room: (typeof ROOMS)[number]
  agents: Agent[]
  engagedAgentIds: Set<string>
  liveStates: ReturnType<typeof getLiveOfficeAgentStates>
  isSelected: boolean
  missionCount: number
  onSelect: () => void
}) {
  const seatedAgents = agents
    .filter((agent) => engagedAgentIds.has(agent.id))
    .sort((a, b) => {
      const liveDelta = Number(Boolean(liveStates.get(b.id))) - Number(Boolean(liveStates.get(a.id)))
      if (liveDelta !== 0) return liveDelta
      return a.name.localeCompare(b.name)
    })

  return (
    <button
      type="button"
      onClick={onSelect}
      className="absolute text-left transition-all duration-200 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
      style={{ ...room.frame }}
    >
      <div
        className={clsx('absolute inset-0 rounded-2xl transition-all duration-200')}
        style={{
          background: isSelected ? `${room.accent}08` : 'transparent',
          boxShadow: isSelected
            ? `inset 0 0 0 1.5px ${room.accent}25, 0 4px 20px ${room.accent}08`
            : 'none',
        }}
      />
      {!isSelected && (
        <div
          className="absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-200 hover:opacity-100"
          style={{ background: `${room.accent}05` }}
        />
      )}
      <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
        <div
          className="absolute left-0 top-0 h-full w-full rounded-2xl opacity-30"
          style={{ background: `radial-gradient(circle at 15% 15%, ${room.accentLight}, transparent 50%)` }}
        />
      </div>

      <div className="absolute z-20" style={room.label}>
        <p
          className="font-mono text-[10px] font-bold uppercase tracking-[0.16em]"
          style={{ color: room.accent }}
        >
          {room.name}
        </p>
        {missionCount > 0 && (
          <p className="mt-0.5 flex items-center gap-1 text-[9px] text-slate-400">
            <Radio size={7} className="text-emerald-500" />
            {missionCount} live
          </p>
        )}
      </div>

      <RoomFurniture roomId={room.id} />

      <div className="pointer-events-none absolute inset-0">
        <span
          className="absolute h-[7px] w-[7px] rounded-full"
          style={{
            left: '14%',
            top: '15%',
            background: room.accentMid,
            boxShadow: `0 0 8px ${room.accentMid}`,
            animation: 'office-pulse 3.6s ease-in-out infinite',
          }}
        />
        <span
          className="absolute h-[5px] w-[5px] rounded-full"
          style={{
            right: '16%',
            top: '24%',
            background: room.accentMid,
            boxShadow: `0 0 6px ${room.accentMid}`,
            animation: 'office-pulse 4.2s ease-in-out infinite 0.6s',
          }}
        />
        {isSelected && (
          <span
            className="absolute h-1 w-1 rounded-full"
            style={{
              left: '50%',
              bottom: '12%',
              background: room.accent,
              boxShadow: `0 0 8px ${room.accent}`,
              animation: 'office-pulse 2.8s ease-in-out infinite 1s',
            }}
          />
        )}
      </div>

      {room.seats.map((seat, index) => {
        const agent = seatedAgents[index]
        const liveState = agent ? liveStates.get(agent.id) : null
        return (
          <div
            key={`${room.id}-seat-${index}`}
            className="absolute z-20"
            style={{ left: seat.left, top: seat.top, transform: 'translate(-50%, -50%)' }}
          >
            {agent && liveState?.showBubble && liveState.bubble && (
              <SpeechBubble
                text={liveState.bubble}
                tone={liveState.mood}
                align={index === 0 ? 'left' : index === room.seats.length - 1 ? 'right' : 'center'}
              />
            )}
            <div className="absolute left-1/2 top-[82%] h-3 w-12 -translate-x-1/2 rounded-full bg-black/[0.06] blur-[3px]" />
            {agent && (
              <AgentBot
                name={agent.name}
                avatar={agent.avatar}
                photoUrl={agent.photoUrl}
                color={agent.color}
                variant="office"
                status={liveState ? 'active' : agent.status}
                animation={
                  !liveState
                    ? 'resting'
                    : liveState.mood === 'thinking'
                      ? 'thinking'
                      : liveState.mood === 'reviewing'
                        ? 'alert'
                        : 'working'
                }
                size={66}
              />
            )}
          </div>
        )
      })}
    </button>
  )
}

function Rover({
  agent,
  slot,
  onSelect,
}: {
  agent: Agent
  slot: {
    left: string
    top: string
    animation: string
  }
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="absolute z-20 focus:outline-none"
      style={{ left: slot.left, top: slot.top, animation: slot.animation, transform: 'translate(-50%, -50%)' }}
    >
      <div className="absolute left-1/2 top-[82%] h-3 w-12 -translate-x-1/2 rounded-full bg-black/[0.06] blur-[3px]" />
      <AgentBot
        name={agent.name}
        avatar={agent.avatar}
        photoUrl={agent.photoUrl}
        color={agent.color}
        variant="office"
        status={agent.status}
        animation="resting"
        size={62}
      />
    </button>
  )
}

function DetailDock({
  room,
  selectedAgent,
  roomAgents,
  liveStates,
  liveMissions,
  onSelectAgent,
}: {
  room: (typeof ROOMS)[number] | null
  selectedAgent: Agent | null
  roomAgents: Agent[]
  liveStates: ReturnType<typeof getLiveOfficeAgentStates>
  liveMissions: ReturnType<typeof getLiveMissionSnapshots>
  onSelectAgent: (agent: Agent) => void
}) {
  if (!room) return null

  const roomMissionSnapshots = liveMissions.filter((snapshot) =>
    snapshot.involvedAgentIds.some((agentId) => roomAgents.some((agent) => agent.id === agentId))
  )
  const selectedLiveState = selectedAgent ? liveStates.get(selectedAgent.id) : null
  const selectedWorkload = selectedAgent ? getAgentWorkloadPercent(selectedAgent.id, liveMissions) : 0

  return (
    <section className="border-t border-slate-200 bg-white/80 px-5 py-4 backdrop-blur-md">
      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p
                className="font-mono text-[10px] font-bold uppercase tracking-[0.16em]"
                style={{ color: room.accent }}
              >
                {room.name}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">
                {roomAgents.length} agents · {roomMissionSnapshots.length} live missions
              </p>
            </div>
            <div
              className="rounded-full px-2.5 py-1 text-[9px] font-mono font-semibold uppercase tracking-[0.1em]"
              style={{
                color: room.accent,
                border: `1.5px solid ${room.accent}30`,
                background: `${room.accent}08`,
              }}
            >
              live room
            </div>
          </div>

          {selectedAgent ? (
            <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
              <div className="flex items-center gap-3">
                <AgentBot
                  name={selectedAgent.name}
                  avatar={selectedAgent.avatar}
                  photoUrl={selectedAgent.photoUrl}
                  color={selectedAgent.color}
                  variant="office"
                  status={selectedLiveState ? 'active' : selectedAgent.status}
                  animation={selectedLiveState ? 'working' : 'idle'}
                  size={54}
                />
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">{selectedAgent.name}</h3>
                  <p className="text-[11px] text-slate-400">{selectedAgent.role}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
                  <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-slate-400">Status</p>
                  <p className="mt-0.5 text-xs font-medium text-slate-700">
                    {selectedLiveState?.stageLabel || selectedAgent.status}
                  </p>
                </div>
                <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
                  <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-slate-400">Workload</p>
                  <p className="mt-0.5 text-xs font-medium text-slate-700">
                    {selectedWorkload}%
                  </p>
                </div>
              </div>
              <p className="mt-3 rounded-xl bg-white px-3 py-2.5 text-[11px] leading-relaxed text-slate-500 shadow-sm">
                {selectedLiveState?.bubble || selectedAgent.currentTask || 'Standing by for the next mission.'}
              </p>
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-5 text-center text-[11px] text-slate-400">
              Select an agent to view status and context
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-3 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400">
            <Zap size={10} className="text-amber-500" />
            Live Missions
          </p>
          <div className="space-y-2">
            {roomMissionSnapshots.slice(0, 4).map((snapshot) => (
              <div key={snapshot.mission.id} className="rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs font-semibold text-slate-700">{snapshot.mission.title}</p>
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.1em]"
                    style={{
                      color: room.accent,
                      border: `1px solid ${room.accent}25`,
                      background: `${room.accent}08`,
                    }}
                  >
                    {snapshot.stageLabel}
                  </span>
                </div>
                <p className="mt-1.5 text-[10px] leading-relaxed text-slate-400">{snapshot.stageSummary}</p>
              </div>
            ))}
            {roomMissionSnapshots.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-3 py-4 text-center text-[11px] text-slate-400">
                This room is quiet right now
              </div>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-3 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400">
            <Users size={10} className="text-slate-400" />
            Roster
          </p>
          <div className="space-y-1">
            {roomAgents.map((agent) => {
              const isActive = liveStates.has(agent.id)
              return (
                <button
                  key={agent.id}
                  type="button"
                  onClick={() => onSelectAgent(agent)}
                  className={clsx(
                    'flex w-full items-center gap-2.5 rounded-xl border px-3 py-2 text-left transition-all duration-150',
                    selectedAgent?.id === agent.id
                      ? 'border-slate-200 bg-slate-50'
                      : 'border-transparent hover:border-slate-100 hover:bg-slate-50/60'
                  )}
                >
                  <AgentBot
                    name={agent.name}
                    avatar={agent.avatar}
                    photoUrl={agent.photoUrl}
                    color={agent.color}
                    variant="office"
                    status={isActive ? 'active' : agent.status}
                    animation={isActive ? 'working' : 'idle'}
                    size={34}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-slate-700">{agent.name}</p>
                    <p className="truncate text-[10px] text-slate-400">
                      {liveStates.get(agent.id)?.bubble || agent.role}
                    </p>
                  </div>
                  {isActive && (
                    <span className="ml-auto h-[6px] w-[6px] shrink-0 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(34,197,94,0.5)]" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

export function OfficeFloor() {
  const agents = useAgentsStore((state) => state.agents)
  const missions = useAgentsStore((state) => state.missions)
  const artifacts = useAgentsStore((state) => state.artifacts)
  const providerSettings = useAgentsStore((state) => state.providerSettings)
  const selectedAgentId = useAgentsStore((state) => state.selectedAgentId)
  const selectAgent = useAgentsStore((state) => state.selectAgent)

  const [selectedRoomId, setSelectedRoomId] = useState<string>('creative')
  const [showLeaderboard, setShowLeaderboard] = useState(false)

  const liveMissions = useMemo(
    () =>
      getLiveMissionSnapshots({ missions, artifacts, providerSettings }).filter(
        (snapshot) => !['completed', 'cancelled'].includes(snapshot.mission.status)
      ),
    [artifacts, missions, providerSettings]
  )
  const liveStates = useMemo(() => getLiveOfficeAgentStates({ agents, missions, artifacts }), [agents, artifacts, missions])
  const leaderboard = useMemo(() => buildAgentLeaderboard({ agents, missions, artifacts }), [agents, artifacts, missions])
  const engagedAgentIds = useMemo(() => new Set(Array.from(liveStates.keys())), [liveStates])

  const normalizedAgents = useMemo(
    () =>
      agents.map((agent) => ({
        ...agent,
        status: liveStates.has(agent.id) || engagedAgentIds.has(agent.id) ? ('active' as const) : agent.status,
        currentTask: liveStates.get(agent.id)?.bubble || agent.currentTask,
        position: {
          ...agent.position,
          room: normalizeOfficeDivision(agent.position?.room || agent.division),
        },
      })),
    [agents, engagedAgentIds, liveStates]
  )

  const roomAgents = useMemo(
    () =>
      ROOMS.reduce<Record<string, Agent[]>>((acc, room) => {
        acc[room.id] = normalizedAgents.filter(
          (agent) => normalizeOfficeDivision(agent.position.room) === room.id
        )
        return acc
      }, {}),
    [normalizedAgents]
  )

  const idleAgents = useMemo(
    () => normalizedAgents.filter((agent) => !engagedAgentIds.has(agent.id)),
    [engagedAgentIds, normalizedAgents]
  )
  const roamSlots = useMemo(() => getRoamSlots(idleAgents.length), [idleAgents.length])

  const normalizedSelectedAgent = normalizedAgents.find((agent) => agent.id === selectedAgentId) || null
  const selectedRoom =
    ROOMS.find(
      (room) => room.id === (normalizeOfficeDivision(normalizedSelectedAgent?.position.room) || selectedRoomId)
    ) || ROOMS[0]
  const selectedRoomAgents = roomAgents[selectedRoom.id] || []
  const featuredMission = liveMissions[0]

  const roomMissionCounts = Object.fromEntries(
    ROOMS.map((room) => [
      room.id,
      liveMissions.filter((snapshot) =>
        snapshot.involvedAgentIds.some((agentId) => (roomAgents[room.id] || []).some((agent) => agent.id === agentId))
      ).length,
    ])
  ) as Record<string, number>

  return (
    <div className="relative flex h-full min-h-[880px] flex-col overflow-hidden rounded-[36px] border border-slate-200/80 bg-gradient-to-b from-slate-50 via-white to-slate-50 shadow-[0_20px_60px_rgba(0,0,0,0.06)] module-enter">
      <style>{GLOBAL_KEYFRAMES}</style>

      <div className="relative flex-1 overflow-hidden">
        <MissionSpotlight
          missionCount={liveMissions.length}
          featuredSummary={
            featuredMission
              ? `${featuredMission.stageLabel}: ${featuredMission.mission.title.slice(0, 38)}${featuredMission.mission.title.length > 38 ? '…' : ''}`
              : 'No live missions'
          }
        />

        <button
          type="button"
          onClick={() => setShowLeaderboard((v) => !v)}
          className="absolute right-4 top-4 z-30 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/90 px-3.5 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-amber-600 shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:shadow-md"
        >
          <Trophy size={11} />
          Trophies
        </button>
        {showLeaderboard && <TrophyBoard leaders={leaderboard} onClose={() => setShowLeaderboard(false)} />}

        <StatusBar
          onMissionCount={Array.from(liveStates.keys()).length}
          roamingCount={idleAgents.length}
          totalCount={agents.length}
        />

        <div className="absolute inset-[2.2%] overflow-hidden rounded-3xl border border-slate-200/70 bg-gradient-to-br from-[#fafcff] via-white to-[#f8fafb] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(rgba(148,163,184,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.06) 1px, transparent 1px)',
              backgroundSize: '22px 22px',
            }}
          />
          <div
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage:
                'repeating-linear-gradient(90deg, transparent, transparent 36px, rgba(180,160,130,0.4) 36px, rgba(180,160,130,0.4) 38px)',
            }}
          />

          {DIVIDERS.map((divider, index) => (
            <div
              key={`divider-${index}`}
              className="absolute rounded-full"
              style={{
                ...divider,
                background: 'linear-gradient(180deg, #cbd5e1, #e2e8f0)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            />
          ))}

          <Plant className="left-[46%] top-[50%]" />
          <Plant className="left-[51%] top-[55%]" />
          <Plant className="left-[44%] top-[68%]" />
          <Plant className="left-[54%] top-[66%]" />

          {ROOMS.map((room) => (
            <RoomZone
              key={room.id}
              room={room}
              agents={roomAgents[room.id] || []}
              engagedAgentIds={engagedAgentIds}
              liveStates={liveStates}
              missionCount={roomMissionCounts[room.id] || 0}
              isSelected={selectedRoom.id === room.id}
              onSelect={() => {
                setSelectedRoomId(room.id)
                if (
                  !normalizedSelectedAgent ||
                  normalizeOfficeDivision(normalizedSelectedAgent.position.room) !== room.id
                ) {
                  selectAgent(null)
                }
              }}
            />
          ))}

          {idleAgents.map((agent, index) => (
            <Rover
              key={agent.id}
              agent={agent}
              slot={roamSlots[index]}
              onSelect={() => {
                selectAgent(agent.id)
                setSelectedRoomId(normalizeOfficeDivision(agent.position.room))
              }}
            />
          ))}
        </div>
      </div>

      <DetailDock
        room={selectedRoom}
        selectedAgent={normalizedSelectedAgent}
        roomAgents={selectedRoomAgents}
        liveStates={liveStates}
        liveMissions={liveMissions}
        onSelectAgent={(agent) => {
          selectAgent(agent.id)
          setSelectedRoomId(normalizeOfficeDivision(agent.position.room))
        }}
      />
    </div>
  )
}
