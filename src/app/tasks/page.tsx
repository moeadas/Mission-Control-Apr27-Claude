'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { ListTodo, ArrowRight, Clock3, Trash2, ChevronDown, ChevronRight } from 'lucide-react'

import { ClientShell } from '@/components/ClientShell'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { useAgentsStore } from '@/lib/agents-store'
import { DELIVERABLE_LABELS } from '@/lib/bot-animations'

const STATUS_COLORS: Record<string, string> = {
  queued: '#ffd166',
  in_progress: '#00d4aa',
  blocked: '#ff7c42',
  review: '#9b6dff',
  paused: '#8b92a8',
  cancelled: '#555b73',
  completed: '#4f8ef7',
}

export default function TasksPage() {
  const missions = useAgentsStore((state) => state.missions)
  const clients = useAgentsStore((state) => state.clients)
  const artifacts = useAgentsStore((state) => state.artifacts)
  const deleteMission = useAgentsStore((state) => state.deleteMission)
  const appStateReady = useAgentsStore((state) => state.appStateReady)
  const [openTaskIds, setOpenTaskIds] = useState<Record<string, boolean>>({})

  function hasArtifactBody(artifact?: { content?: string; renderedHtml?: string }) {
    return Boolean(artifact?.content?.trim() || artifact?.renderedHtml?.trim())
  }

  function safeTime(value?: string | null) {
    if (!value) return 0
    const time = new Date(value).getTime()
    return Number.isFinite(time) ? time : 0
  }

  function getMissionRecencyTimestamp(missionId: string, createdAt: string) {
    const relatedArtifacts = artifacts
      .filter((artifact) => artifact.missionId === missionId)
      .map((artifact) => safeTime(artifact.createdAt || artifact.updatedAt))

    return Math.max(safeTime(createdAt), ...relatedArtifacts)
  }

  const sortedTasks = useMemo(
    () =>
      [...missions].sort(
        (a, b) =>
          getMissionRecencyTimestamp(b.id, b.createdAt) -
          getMissionRecencyTimestamp(a.id, a.createdAt)
      ),
    [artifacts, missions]
  )

  function toggleTask(id: string) {
    setOpenTaskIds((current) => ({ ...current, [id]: !current[id] }))
  }

  function findBestArtifactForMission(missionId: string) {
    const direct = artifacts
      .filter((artifact) => artifact.missionId === missionId)
      .sort((a, b) => safeTime(b.updatedAt || b.createdAt) - safeTime(a.updatedAt || a.createdAt))

    const bestDirect = direct.find((artifact) => hasArtifactBody(artifact)) || direct[0]
    if (hasArtifactBody(bestDirect)) return bestDirect

    const mission = missions.find((item) => item.id === missionId)
    if (!mission) return bestDirect

    const related = artifacts
      .filter(
        (artifact) =>
          artifact.id !== bestDirect?.id &&
          artifact.clientId === mission.clientId &&
          artifact.deliverableType === mission.deliverableType &&
          hasArtifactBody(artifact) &&
          (artifact.title === mission.title || artifact.sourcePrompt === mission.summary)
      )
      .sort((a, b) => safeTime(b.updatedAt || b.createdAt) - safeTime(a.updatedAt || a.createdAt))

    return related[0] || bestDirect
  }

  return (
    <ClientShell>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h1 className="text-xl font-heading font-bold text-text-primary flex items-center gap-2">
              <ListTodo size={20} className="text-accent-orange" />
              Tasks
            </h1>
            <p className="text-xs text-text-secondary mt-0.5">
              Every request becomes a tracked task with its brief, live output, and exports
            </p>
          </div>
          <div className="text-[11px] font-mono text-text-dim">{missions.length} tracked tasks</div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-4">
            {!appStateReady ? (
              <Card>
                <p className="text-sm text-text-primary">Loading tasks…</p>
              </Card>
            ) : sortedTasks.length ? (
              sortedTasks.map((mission) => {
                const client = clients.find((item) => item.id === mission.clientId)
                const latestArtifact = findBestArtifactForMission(mission.id)

                return (
                  <Card key={mission.id} className="relative">
                    <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleTask(mission.id)}
                        className="inline-flex items-center justify-center rounded-lg border border-border bg-base/60 p-2 text-text-secondary transition-all hover:text-text-primary"
                        aria-label={`${openTaskIds[mission.id] ? 'Collapse' : 'Expand'} ${mission.title}`}
                      >
                        {openTaskIds[mission.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault()
                          event.stopPropagation()
                          if (confirm(`Delete "${mission.title}"? This also removes its saved outputs.`)) {
                            deleteMission(mission.id)
                          }
                        }}
                        className="inline-flex items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-red-400 transition-all hover:bg-red-500/20"
                        aria-label={`Delete ${mission.title}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleTask(mission.id)}
                      className="block w-full space-y-4 text-left pr-24"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-heading font-semibold text-text-primary">{mission.title}</h3>
                          <p className="text-[11px] text-text-secondary mt-1">
                            {client?.name || 'General Ops'} · {DELIVERABLE_LABELS[mission.deliverableType] || mission.deliverableType}
                          </p>
                        </div>
                        <Badge color={STATUS_COLORS[mission.status]} size="sm">
                          {mission.status.replace('_', ' ')}
                        </Badge>
                      </div>

                      <p className="text-sm text-text-secondary line-clamp-2">{mission.summary}</p>

                      <div className="flex items-center justify-between pt-1">
                        <div className="flex items-center gap-2 text-[11px] text-text-dim">
                          <Clock3 size={12} />
                          Added {new Date(getMissionRecencyTimestamp(mission.id, mission.createdAt)).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <span className="inline-flex items-center gap-1 text-[11px] text-accent-blue">
                          {openTaskIds[mission.id] ? 'Hide details' : 'Show details'} <ArrowRight size={12} />
                        </span>
                      </div>
                    </button>

                    {openTaskIds[mission.id] ? (
                      <div className="mt-4 space-y-4 border-t border-border pt-4">
                        {latestArtifact?.content || latestArtifact?.renderedHtml ? (
                          <div className="p-3 rounded-xl border border-border bg-base/50">
                            <p className="text-[10px] font-mono uppercase text-text-dim mb-2">Latest Output</p>
                            <p className="text-[12px] text-text-primary line-clamp-6 whitespace-pre-wrap">
                              {latestArtifact.content || 'Saved HTML output available. Open task to review the full deliverable.'}
                            </p>
                          </div>
                        ) : (
                          <div className="p-3 rounded-xl border border-border bg-base/40">
                            <p className="text-[12px] text-text-secondary">
                              Task created. Output will appear here as soon as Iris drafts it.
                            </p>
                          </div>
                        )}

                        <div className="flex justify-end">
                          <Link href={`/tasks/${mission.id}`} className="inline-flex items-center gap-1 text-[11px] text-accent-blue">
                            Open task <ArrowRight size={12} />
                          </Link>
                        </div>
                      </div>
                    ) : null}
                  </Card>
                )
              })
            ) : (
              <Card>
                <p className="text-sm text-text-primary">No tasks yet.</p>
                <p className="text-[11px] text-text-dim mt-1">
                  Ask Iris for a post, strategy, calendar, media plan, audit, or brief and it will appear here.
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </ClientShell>
  )
}
