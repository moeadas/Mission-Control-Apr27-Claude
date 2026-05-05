'use client'

import React, { useState, useMemo } from 'react'
import { ClientShell } from '@/components/ClientShell'
import { AgentCard } from '@/components/agents/AgentCard'
import { AgentEditor } from '@/components/agents/AgentEditor'
import { AgentBot } from '@/components/agents/AgentBot'
import { useAgentsStore } from '@/lib/agents-store'
import { Plus, Search, Bot, LayoutGrid, GitBranch } from 'lucide-react'
import { Button } from '@/components/ui/Button'

// ─── Org Chart Component ───────────────────────────────────────────────────

const DIVISION_ORDER = ['orchestration', 'strategy', 'client-services', 'creative', 'media', 'research']
const DIVISION_COLORS: Record<string, string> = {
  orchestration: '#a78bfa',
  'client-services': '#4f8ef7',
  creative: '#00d4aa',
  media: '#ff5fa0',
  research: '#38bdf8',
  strategy: '#9b6dff',
}

function OrgChart({ agents }: { agents: ReturnType<typeof useAgentsStore.getState>['agents'] }) {
  // Group agents by division
  const byDivision = useMemo(() => {
    const groups: Record<string, typeof agents> = {}
    agents.forEach((a) => {
      const div = a.division || 'creative'
      if (!groups[div]) groups[div] = []
      groups[div].push(a)
    })
    return groups
  }, [agents])

  const divisions = DIVISION_ORDER.filter((d) => byDivision[d]?.length)
  const orchestrators = byDivision['orchestration'] || []
  const otherDivisions = divisions.filter((d) => d !== 'orchestration')

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="min-w-[700px] flex flex-col items-center gap-0">

        {/* Top level: Orchestration */}
        {orchestrators.length > 0 && (
          <div className="flex flex-col items-center">
            <div className="flex gap-4 justify-center">
              {orchestrators.map((agent) => (
                <OrgAgentNode key={agent.id} agent={agent} isTop />
              ))}
            </div>
            {/* Connector line down */}
            {otherDivisions.length > 0 && (
              <div className="w-px h-8 bg-gradient-to-b from-[#a78bfa] to-[#a78bfa]/30 mt-1" />
            )}
          </div>
        )}

        {/* Horizontal connector bar */}
        {orchestrators.length > 0 && otherDivisions.length > 0 && (
          <div
            className="h-px"
            style={{
              width: `${Math.min(otherDivisions.length * 200, 900)}px`,
              background: 'linear-gradient(90deg, transparent, #a78bfa40, transparent)',
              borderTop: '1px dashed rgba(167,139,250,0.3)',
            }}
          />
        )}

        {/* Division columns */}
        {otherDivisions.length > 0 && (
          <div className="flex gap-6 mt-0 items-start justify-center flex-wrap">
            {otherDivisions.map((division) => {
              const divAgents = byDivision[division] || []
              const color = DIVISION_COLORS[division] || '#60a5fa'
              return (
                <div key={division} className="flex flex-col items-center gap-3">
                  {/* Vertical connector from top bar to division label */}
                  {orchestrators.length > 0 && (
                    <div className="w-px h-6 mt-0" style={{ background: `${color}50` }} />
                  )}
                  {/* Division header */}
                  <div
                    className="px-4 py-1.5 rounded-full text-[10px] font-mono uppercase tracking-[0.18em] font-semibold"
                    style={{ background: `${color}18`, color, border: `1px solid ${color}35` }}
                  >
                    {division}
                  </div>
                  {/* Agents in this division */}
                  <div className="flex flex-col gap-3 items-center">
                    {divAgents.map((agent, idx) => (
                      <React.Fragment key={agent.id}>
                        {idx > 0 && (
                          <div className="w-px h-3" style={{ background: `${color}40` }} />
                        )}
                        <OrgAgentNode agent={agent} color={color} />
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* No divisions case */}
        {orchestrators.length === 0 && otherDivisions.length === 0 && (
          <div className="text-center py-20">
            <Bot size={40} className="text-[var(--text-dim)] mx-auto mb-3" />
            <p className="text-sm text-[var(--text-secondary)]">No agents to display in org chart</p>
          </div>
        )}
      </div>
    </div>
  )
}

function OrgAgentNode({
  agent,
  isTop,
  color,
}: {
  agent: ReturnType<typeof useAgentsStore.getState>['agents'][0]
  isTop?: boolean
  color?: string
}) {
  const openEditor = useAgentsStore((state) => state.openEditor)
  const accentColor = color || DIVISION_COLORS[agent.division] || '#60a5fa'
  return (
    <button
      onClick={() => openEditor(agent.id)}
      className="group flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all hover:shadow-lg cursor-pointer text-center"
      style={{
        background: isTop ? `${accentColor}10` : 'rgba(255,255,255,0.72)',
        borderColor: isTop ? `${accentColor}40` : 'var(--border)',
        minWidth: '100px',
        maxWidth: '130px',
      }}
    >
      <div
        className="rounded-full ring-2 ring-white"
        style={{ boxShadow: `0 4px 12px ${accentColor}30` }}
      >
        <AgentBot
          name={agent.name}
          avatar={agent.avatar}
          color={agent.color}
          photoUrl={agent.photoUrl}
          status={agent.status}
          size={isTop ? 48 : 40}
        />
      </div>
      <div>
        <p className="text-xs font-semibold text-[var(--text-primary)] leading-tight">{agent.name}</p>
        <p
          className="text-[10px] font-mono uppercase tracking-[0.12em] mt-0.5 truncate max-w-[100px]"
          style={{ color: accentColor }}
        >
          {agent.specialty || agent.division}
        </p>
        <div
          className="mt-1 inline-block w-1.5 h-1.5 rounded-full"
          style={{ background: agent.status === 'active' ? '#2dd4bf' : '#52525b' }}
        />
      </div>
    </button>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function AgentsPage() {
  const agents = useAgentsStore((state) => state.agents)
  const isEditorOpen = useAgentsStore((state) => state.isEditorOpen)
  const editingAgentId = useAgentsStore((state) => state.editingAgentId)
  const closeEditor = useAgentsStore((state) => state.closeEditor)
  const openEditor = useAgentsStore((state) => state.openEditor)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'org'>('grid')

  const filtered = agents.filter((a) => {
    const matchSearch =
      !search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.role.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || a.specialty === filter || a.status === filter || a.division === filter
    return matchSearch && matchFilter
  })

  const filters = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'idle', label: 'Idle' },
    { value: 'paused', label: 'Paused' },
    { value: 'creative', label: 'Creative' },
    { value: 'client-services', label: 'Client Services' },
    { value: 'media', label: 'Media' },
    { value: 'research', label: 'Research' },
    { value: 'strategy', label: 'Strategy' },
    { value: 'copy', label: 'Copy' },
    { value: 'design', label: 'Design' },
  ]

  return (
    <ClientShell>
      <div className="mission-shell flex h-full flex-col">
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-border px-6 py-5">
          <div>
            <div className="mission-chip mb-3 w-fit">
              <Bot size={12} className="text-[var(--accent-purple)]" />
              Active roster
            </div>
            <h1 className="flex items-center gap-3 text-2xl font-black tracking-[-0.03em] text-text-primary">
              <span className="gradient-accent-surface inline-flex h-11 w-11 items-center justify-center rounded-[18px] shadow-[0_14px_30px_rgba(79,142,247,0.24)]">
                <Bot size={20} className="text-white" />
              </span>
              Agent Roster
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              Browse your active cast, tune specialties, and open any agent profile for deeper control.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div className="flex items-center gap-1 rounded-xl border border-border bg-white/60 p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white shadow-sm text-[var(--text-primary)]'
                    : 'text-[var(--text-dim)] hover:text-[var(--text-secondary)]'
                }`}
              >
                <LayoutGrid size={13} />
                Grid
              </button>
              <button
                onClick={() => setViewMode('org')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  viewMode === 'org'
                    ? 'bg-white shadow-sm text-[var(--text-primary)]'
                    : 'text-[var(--text-dim)] hover:text-[var(--text-secondary)]'
                }`}
              >
                <GitBranch size={13} />
                Org Chart
              </button>
            </div>
            <Button variant="primary" onClick={() => openEditor(null)}>
              <Plus size={14} />
              New Agent
            </Button>
          </div>
        </div>

        {/* Filters (only in grid view) */}
        {viewMode === 'grid' && (
          <div className="flex flex-shrink-0 items-center gap-4 border-b border-border px-6 py-4">
            <div className="relative max-w-xs flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
              <input
                type="text"
                placeholder="Search agents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-[18px] border border-border bg-white/70 py-3 pl-10 pr-4 text-sm text-text-primary shadow-[0_12px_24px_rgba(45,78,135,0.06)] placeholder:text-text-dim transition-colors focus:border-accent-blue focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-1 overflow-x-auto rounded-full border border-border bg-white/72 px-2 py-1 shadow-[0_12px_24px_rgba(45,78,135,0.06)]">
              {filters.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setFilter(f.value)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap transition-all ${
                    filter === f.value
                      ? 'bg-accent-purple/18 text-accent-purple border border-accent-purple/30 shadow-[0_6px_18px_rgba(139,92,246,0.14)]'
                      : 'bg-transparent border border-transparent text-text-secondary hover:text-text-primary hover:border-border hover:bg-base'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {viewMode === 'grid' ? (
            filtered.length > 0 ? (
              <div className="grid max-w-6xl grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {filtered.map((agent) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    onEdit={() => openEditor(agent.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20">
                <Bot size={48} className="text-text-dim mb-4" />
                <p className="text-text-secondary">No agents found</p>
                <p className="text-xs text-text-dim mt-1">
                  {search ? 'Try a different search term' : 'Add your first agent to get started'}
                </p>
              </div>
            )
          ) : (
            <OrgChart agents={agents} />
          )}
        </div>
      </div>

      {isEditorOpen && <AgentEditor agentId={editingAgentId} onClose={closeEditor} />}
    </ClientShell>
  )
}
