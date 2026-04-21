'use client'

import React, { useMemo } from 'react'
import { ClientShell } from '@/components/ClientShell'
import { MetricsCards, QuickActions, AgentStrip, MissionQueue } from '@/components/dashboard/MetricsCards'
import { ActivityFeed } from '@/components/dashboard/ActivityFeed'
import { useAgentsStore } from '@/lib/agents-store'
import { AgentBot } from '@/components/agents/AgentBot'
import { useRouter } from 'next/navigation'
import { buildAgentLeaderboard } from '@/lib/live-ops'
import { AgentLeaderboardPanel } from '@/components/analytics/AgentLeaderboardPanel'
import { getMissionStageLabel } from '@/lib/mission-stage'

const DASHBOARD_MESSAGES = [
  'Launch great work with a lighter touch.',
  'Build momentum across every client mission.',
  'Give your team a brighter place to win from.',
  'Turn busy workflows into clear daily progress.',
  'Keep every moving piece aligned and energised.',
  'Guide the agency with clarity, speed, and lift.',
]

export default function DashboardPage() {
  const agents = useAgentsStore((state) => state.agents)
  const missions = useAgentsStore((state) => state.missions)
  const clients = useAgentsStore((state) => state.clients)
  const artifacts = useAgentsStore((state) => state.artifacts)
  const router = useRouter()
  const activeTasks = missions.filter((task) => !['completed', 'cancelled'].includes(task.status))
  const leaderboard = buildAgentLeaderboard({ agents, missions, artifacts })
  const heroMessage = useMemo(
    () => DASHBOARD_MESSAGES[Math.floor(Math.random() * DASHBOARD_MESSAGES.length)],
    []
  )

  const statusColors: Record<string, string> = {
    queued: '#fbbf24',
    in_progress: '#2dd4bf',
    blocked: '#fb923c',
    review: '#a78bfa',
    completed: '#60a5fa',
    paused: '#52525b',
    cancelled: '#52525b',
  }

  return (
    <ClientShell>
      <div className="flex-1 overflow-y-auto">
        <div className="w-full space-y-6 p-6">
          
          <div className="mission-panel overflow-hidden p-6 md:p-7">
            <div className="absolute inset-y-0 right-0 w-[38%] bg-[radial-gradient(circle_at_top,rgba(79,142,247,0.24),transparent_44%),radial-gradient(circle_at_bottom,rgba(143,114,255,0.2),transparent_40%)]" />
            <div className="relative grid gap-6 lg:grid-cols-[1.5fr_0.95fr] lg:items-stretch">
              <div className="space-y-5">
                <div className="mission-chip w-fit">
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent-green)] shadow-[0_0_12px_var(--accent-green)]" />
                  HQ online
                </div>
                <div>
                  <h1
                    className="max-w-2xl bg-[image:var(--gradient-accent)] bg-clip-text text-3xl font-black leading-[1.14] tracking-[-0.03em] text-transparent md:text-[2.8rem] md:leading-[1.08]"
                    style={{ backgroundSize: '100% 100%' }}
                  >
                    {heroMessage}
                  </h1>
                  <p className="mt-4 max-w-2xl text-base leading-7" style={{ color: '#122033' }}>
                    Track active specialists, guide live missions, and keep every client workflow moving from one bright control room.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[24px] border border-white/60 bg-white/72 px-4 py-4 shadow-[0_14px_30px_rgba(45,78,135,0.08)]">
                    <p className="hud-label">Agents live</p>
                    <p className="mt-2 text-3xl font-black text-[var(--accent-purple)]">{agents.filter((a) => a.status === 'active').length}</p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">Ready to route work</p>
                  </div>
                  <div className="rounded-[24px] border border-white/60 bg-white/72 px-4 py-4 shadow-[0_14px_30px_rgba(45,78,135,0.08)]">
                    <p className="hud-label">Client worlds</p>
                    <p className="mt-2 text-3xl font-black text-[var(--accent-blue)]">{clients.length}</p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">Active brand systems</p>
                  </div>
                  <div className="rounded-[24px] border border-white/60 bg-white/72 px-4 py-4 shadow-[0_14px_30px_rgba(45,78,135,0.08)]">
                    <p className="hud-label">Live missions</p>
                    <p className="mt-2 text-3xl font-black text-[var(--accent-orange)]">{activeTasks.length}</p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">Currently in motion</p>
                  </div>
                </div>
              </div>

              <div className="relative flex flex-col justify-between rounded-[30px] border border-white/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(245,250,255,0.72))] p-5 shadow-[0_20px_42px_rgba(45,78,135,0.12)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="hud-label">Party lineup</p>
                    <h2 className="mt-2 text-xl font-bold text-[var(--text-primary)]">Today’s featured squad</h2>
                  </div>
                  <button 
                    onClick={() => router.push('/agents')}
                    className="soft-button px-4 py-2 text-xs"
                  >
                    View roster
                  </button>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-3">
                  {agents.slice(0, 6).map((agent) => (
                    <div key={agent.id} className="rounded-[22px] border border-white/70 bg-white/78 px-3 py-4 text-center shadow-[0_12px_24px_rgba(45,78,135,0.08)]">
                      <div className="mx-auto w-fit rounded-full ring-4 ring-white/80">
                        <AgentBot
                          name={agent.name}
                          avatar={agent.avatar}
                          color={agent.color}
                          photoUrl={agent.photoUrl}
                          status={agent.status}
                          size={42}
                        />
                      </div>
                      <p className="mt-3 truncate text-xs font-semibold text-[var(--text-primary)]">{agent.name}</p>
                      <p className="mt-1 text-[10px] font-mono uppercase tracking-[0.14em] text-[var(--text-dim)]">{agent.specialty}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Metrics Cards */}
          <MetricsCards />

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-5">
              <AgentStrip />
              <ActivityFeed />
            </div>
            <div className="space-y-5">
              <QuickActions />
              <MissionQueue />
              <AgentLeaderboardPanel
                entries={leaderboard}
                compact
                title="Leaderboard"
                subtitle="Top performers this week across lead work and support contributions."
              />

              {/* Active Tasks Preview */}
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-5 overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                    In Progress
                  </h3>
                  <button
                    onClick={() => router.push('/tasks')}
                    className="text-[11px] text-[var(--accent-blue)] hover:opacity-80 transition-opacity"
                  >
                    View all →
                  </button>
                </div>
                <div className="space-y-2">
                  {activeTasks.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border)] hover:border-[var(--border-glow)] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: statusColors[task.status] || '#60a5fa' }}
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-[var(--text-primary)] truncate">{task.title}</p>
                          <p className="text-[10px] text-[var(--text-dim)]">
                            {clients.find((client) => client.id === task.clientId)?.name || 'General Ops'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[11px] text-[var(--text-secondary)] ml-2 tabular-nums">
                        {getMissionStageLabel({ missionStatus: task.status, progress: task.progress })}
                      </span>
                    </div>
                  ))}
                  {activeTasks.length === 0 && (
                    <div className="text-center py-6">
                      <p className="text-xs text-[var(--text-dim)]">All quiet — no active tasks</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ClientShell>
  )
}
