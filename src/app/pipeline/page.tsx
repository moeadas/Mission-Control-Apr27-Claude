'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClientShell } from '@/components/ClientShell'
import { usePipelinesStore } from '@/lib/stores/pipelines-store'
import { useAgentsStore } from '@/lib/agents-store'
import { Plus, Search, ArrowLeft, Play, Clock, Layers, GitBranch, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'

export default function PipelinesPage() {
  const router = useRouter()
  const pipelines = usePipelinesStore((s) => s.pipelines)
  const isLoaded = usePipelinesStore((s) => s.isLoaded)
  const loadPipelines = usePipelinesStore((s) => s.loadPipelines)
  const missions = useAgentsStore((state) => state.missions)
  const [search, setSearch] = useState('')

  useEffect(() => {
    loadPipelines(true)
  }, [loadPipelines])

  const filtered = pipelines.filter(
    (p) =>
      !search ||
      (p.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(search.toLowerCase())
  )

  const pipelineUsageCounts = useMemo(() => {
    const counts = new Map<string, number>()

    for (const mission of missions) {
      const key = mission.pipelineId || ''
      if (key) {
        counts.set(key, (counts.get(key) || 0) + 1)
      }
    }

    for (const pipeline of pipelines) {
      if (counts.has(pipeline.id)) continue
      const byNameCount = missions.filter((mission) => !mission.pipelineId && mission.pipelineName === pipeline.name).length
      if (byNameCount > 0) {
        counts.set(pipeline.id, byNameCount)
      }
    }

    return counts
  }, [missions, pipelines])

  return (
    <ClientShell>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div
          className="px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-panel)' }}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/config')}
                className="p-2 rounded-xl hover:bg-[var(--bg-elevated)] text-[var(--text-dim)] hover:text-[var(--text-primary)] transition-colors"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h1 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, rgba(0,212,170,0.2), rgba(79,142,247,0.1))',
                      border: '1px solid rgba(0,212,170,0.3)',
                    }}
                  >
                    <Layers size={18} style={{ color: '#00d4aa' }} />
                  </div>
                  Pipeline Library
                </h1>
                <p className="text-xs text-[var(--text-dim)] mt-0.5 font-mono">
                  {pipelines.length} pipelines · Multi-phase workflows
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push('/pipeline/new')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-all hover:opacity-90 active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #00d4aa, #4f8ef7)',
                boxShadow: '0 4px 12px rgba(0,212,170,0.3)',
              }}
            >
              <Plus size={16} />
              New Pipeline
            </button>
          </div>
        </div>

        {/* Search */}
        <div
          className="px-6 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-panel)' }}
        >
          <div className="relative max-w-md">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search pipelines..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-[var(--text-primary)] placeholder-[var(--text-dim)] outline-none transition-all"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--accent-cyan)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>
        </div>

        {/* Pipeline Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {!isLoaded ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-10 h-10 border-2 border-[#00d4aa] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>
                <GitBranch size={36} style={{ color: 'var(--text-dim)' }} />
              </div>
              <p className="text-lg font-medium text-[var(--text-primary)] mb-2">
                {search ? 'No pipelines found' : 'No pipelines yet'}
              </p>
              <p className="text-sm text-[var(--text-dim)]">
                {search ? 'Try a different search term' : 'Create your first pipeline to get started'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((pipeline, i) => {
                const usageCount = pipelineUsageCounts.get(pipeline.id) || 0
                const phases = Array.isArray(pipeline.phases) ? pipeline.phases : []
                const totalTasks = phases.reduce((sum, p) => sum + (Array.isArray(p.activities) ? p.activities.length : 0), 0)

                return (
                <div
                  key={pipeline.id}
                  className="card-surface hover-lift group flex h-full cursor-pointer flex-col overflow-hidden"
                  style={{ animationDelay: `${i * 40}ms` }}
                  onClick={() => router.push(`/pipeline/${pipeline.id}`)}
                >
                  <div className="flex flex-1 flex-col p-5">
                    {/* Header */}
                    <div className="mb-3 flex min-h-[3.9rem] items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3
                          className="line-clamp-2 text-base font-semibold leading-snug transition-colors"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {pipeline.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-mono text-[var(--text-dim)]">
                            v{pipeline.version}
                          </span>
                          {pipeline.isDefault && (
                            <span
                              className="badge"
                              style={{
                                background: 'var(--bg-elevated)',
                                color: 'var(--text-secondary)',
                                border: '1px solid var(--border-subtle)',
                              }}
                            >
                              default
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span
                          className="rounded-full px-2.5 py-1 text-[10px] font-mono text-[var(--text-secondary)]"
                          style={{
                            background: 'var(--bg-elevated)',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          {usageCount} uses
                        </span>
                        <ChevronRight
                          size={16}
                          className="text-[var(--text-dim)] flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all translate-x-0 group-hover:translate-x-1"
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <p className="mb-4 min-h-[3.5rem] text-sm leading-relaxed text-[var(--text-secondary)] line-clamp-2">
                      {pipeline.description}
                    </p>

                    {/* Phase tags */}
                    <div className="mb-4 flex min-h-[7.75rem] content-start flex-wrap gap-1.5">
                      {phases.map((phase) => (
                        <span
                          key={phase.id}
                          className="badge text-[10px]"
                          style={{
                            background: 'var(--bg-elevated)',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          {phase.name}
                        </span>
                      ))}
                    </div>

                    {/* Phase rail */}
                    <div className="mb-4 flex gap-1">
                      {phases.slice(0, 8).map((phase, index) => (
                        <div
                          key={phase.id}
                          className="h-1.5 flex-1 rounded-full"
                          style={{
                            background:
                              index < phases.length
                                ? 'color-mix(in srgb, var(--text-dim) 22%, transparent)'
                                : 'var(--border-subtle)',
                          }}
                          title={phase.name}
                        />
                      ))}
                    </div>

                    <div className="mt-auto" />
                  </div>

                  {/* Footer */}
                  <div
                    className="mt-auto flex items-center justify-between px-5 py-3"
                    style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}
                  >
                    <div className="flex items-center gap-1 text-[10px] text-[var(--text-dim)] font-mono">
                      <Clock size={11} />
                      <span>{pipeline.estimatedDuration}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-[var(--text-dim)] font-mono">
                      <GitBranch size={11} />
                      <span>
                        {phases.length} phases · {totalTasks} tasks
                      </span>
                    </div>
                  </div>
                </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </ClientShell>
  )
}
