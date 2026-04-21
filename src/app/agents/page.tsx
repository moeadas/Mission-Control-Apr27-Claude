'use client'

import React, { useState } from 'react'
import { ClientShell } from '@/components/ClientShell'
import { AgentCard } from '@/components/agents/AgentCard'
import { AgentEditor } from '@/components/agents/AgentEditor'
import { useAgentsStore } from '@/lib/agents-store'
import { Plus, Search, Bot } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export default function AgentsPage() {
  const agents = useAgentsStore((state) => state.agents)
  const isEditorOpen = useAgentsStore((state) => state.isEditorOpen)
  const editingAgentId = useAgentsStore((state) => state.editingAgentId)
  const closeEditor = useAgentsStore((state) => state.closeEditor)
  const openEditor = useAgentsStore((state) => state.openEditor)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<string>('all')

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
          <Button variant="primary" onClick={() => openEditor(null)}>
            <Plus size={14} />
            New Agent
          </Button>
        </div>

        {/* Filters */}
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

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {filtered.length > 0 ? (
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
          )}
        </div>
      </div>

      <AgentEditor agentId={editingAgentId}  onClose={closeEditor} />
    </ClientShell>
  )
}
