'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Download, ExternalLink, FileText, MessageSquareText, Sheet, Target, Trash2 } from 'lucide-react'

import { ClientShell } from '@/components/ClientShell'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { getSupportedExportFormats } from '@/lib/artifacts'
import { DELIVERABLE_LABELS } from '@/lib/bot-animations'
import { useAgentsStore } from '@/lib/agents-store'
import { Artifact, ArtifactExport } from '@/lib/types'
import { ArtifactOutputView } from '@/components/outputs/ArtifactOutputView'
import { getStoredToken } from '@/lib/auth/browser'
import { getMissionStageLabel, getWorkflowStageLabel } from '@/lib/mission-stage'

const STATUS_COLORS: Record<string, string> = {
  queued: '#ffd166',
  in_progress: '#00d4aa',
  blocked: '#ff7c42',
  review: '#9b6dff',
  paused: '#8b92a8',
  cancelled: '#555b73',
  completed: '#4f8ef7',
}

function clampProgress(value?: number | null) {
  const next = Number.isFinite(Number(value)) ? Number(value) : 0
  return Math.max(0, Math.min(100, next))
}

function formatRunStage(stage?: string | null) {
  if (!stage) return 'Waiting for work'
  return stage
    .split(':')
    .join(' · ')
    .replace(/-/g, ' ')
}

function prettyRunStatus(status?: string | null) {
  if (!status) return 'idle'
  return status.replace(/_/g, ' ')
}

export default function TaskDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const missions = useAgentsStore((state) => state.missions)
  const artifacts = useAgentsStore((state) => state.artifacts)
  const clients = useAgentsStore((state) => state.clients)
  const agents = useAgentsStore((state) => state.agents)
  const providerSettings = useAgentsStore((state) => state.providerSettings)
  const currentUser = useAgentsStore((state) => state.currentUser)
  const appStateReady = useAgentsStore((state) => state.appStateReady)
  const updateArtifact = useAgentsStore((state) => state.updateArtifact)
  const updateMission = useAgentsStore((state) => state.updateMission)
  const deleteMission = useAgentsStore((state) => state.deleteMission)
  const hydrateAppState = useAgentsStore((state) => state.hydrateAppState)

  const [exportingKey, setExportingKey] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [executionState, setExecutionState] = useState<any>(null)
  const [executionBusy, setExecutionBusy] = useState<'retry' | 'resume' | null>(null)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewBusy, setReviewBusy] = useState<'approve' | 'changes' | null>(null)

  const mission = missions.find((item) => item.id === params.id)
  const missionArtifacts = useMemo(
    () =>
      artifacts
        .filter((artifact) => artifact.missionId === params.id)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [artifacts, params.id]
  )

  function hasArtifactBody(artifact?: Artifact) {
    return Boolean(artifact?.content?.trim() || artifact?.renderedHtml?.trim())
  }

  if (!appStateReady && !mission) {
    return (
      <ClientShell>
        <div className="p-6">
          <Card>
            <p className="text-sm text-text-primary">Loading task…</p>
          </Card>
        </div>
      </ClientShell>
    )
  }

  if (!mission) {
    return (
      <ClientShell>
        <div className="p-6">
          <Card>
            <p className="text-sm text-text-primary">Task not found.</p>
            <Link href="/tasks" className="inline-flex items-center gap-2 text-sm text-accent-blue mt-3">
              <ArrowLeft size={14} />
              Back to tasks
            </Link>
          </Card>
        </div>
      </ClientShell>
    )
  }

  const client = clients.find((item) => item.id === mission.clientId)
  const assignedAgentIds = Array.isArray(mission.assignedAgentIds) ? mission.assignedAgentIds : []
  const assignedAgents = agents.filter((agent) => assignedAgentIds.includes(agent.id))
  const leadAgent = agents.find((item) => item.id === mission.leadAgentId)
  const supportAgents = assignedAgents.filter((agent) => agent.id !== mission.leadAgentId)
  const displayArtifacts = useMemo(() => {
    const contentfulDirect = missionArtifacts.filter((artifact) => hasArtifactBody(artifact))
    if (contentfulDirect.length) return contentfulDirect

    const related = artifacts
      .filter(
        (artifact) =>
          artifact.missionId !== params.id &&
          artifact.clientId === mission.clientId &&
          artifact.deliverableType === mission.deliverableType &&
          hasArtifactBody(artifact) &&
          (artifact.title === mission.title || artifact.sourcePrompt === mission.summary)
      )
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

    return related.length ? related : missionArtifacts
  }, [artifacts, mission.clientId, mission.deliverableType, mission.summary, mission.title, missionArtifacts, params.id])

  const latestArtifact = displayArtifacts[0]
  const executionSteps = latestArtifact?.executionSteps || []
  const workingAgentIds = Array.from(
    new Set(
      executionSteps
        .map((step) => step.agentId)
        .filter((agentId) => agentId && agentId !== 'iris')
    )
  )
  const workingAgents = agents.filter((agent) => workingAgentIds.includes(agent.id))
  const usedSkillNames = Array.from(
    new Set(
      assignedAgents
        .flatMap((agent) => agent.skills || [])
        .filter(Boolean)
        .slice(0, 8)
    )
  )
  const skillAssignments = mission.skillAssignments || {}
  const orchestrationTrace = mission.orchestrationTrace || []
  const reviewComments = mission.reviewComments || []
  const missionStageLabel = getMissionStageLabel({
    missionStatus: mission.status,
    progress: mission.progress,
    latestArtifact,
  })
  const workflowStageLabel = getWorkflowStageLabel(executionState?.workflow)
  const workflowProgress = Math.max(
    clampProgress(mission.progress ?? 0),
    clampProgress(executionState?.workflow?.progress ?? 0)
  )
  const workflowContext = executionState?.workflow?.context || {}
  const sortedRuns = [...(executionState?.runs || [])].sort(
    (a, b) => new Date(b.updated_at || b.created_at || 0).getTime() - new Date(a.updated_at || a.created_at || 0).getTime()
  )
  const activeRuns = sortedRuns.filter((run) => run.status === 'in_progress')
  const latestRun = sortedRuns[0]
  const latestErrorRun = sortedRuns.find((run) => ['failed', 'blocked'].includes(run.status))
  const workflowError = executionState?.workflow?.context?.error || executionState?.job?.error || null
  const earlyStageStallHint =
    !latestErrorRun &&
    !workflowError &&
    mission.status === 'in_progress' &&
    workflowProgress <= 8
      ? 'This task is still at its initial handoff stage. If it stays here, the chat request likely stalled before the execution runner reported back.'
      : null
  const visibleErrorMessage =
    latestErrorRun?.error_message ||
    workflowError ||
    (mission.status === 'blocked' ? mission.handoffNotes || null : null) ||
    earlyStageStallHint
  const currentActivityLabel =
    workflowContext.activeActivityName ||
    workflowContext.activityName ||
    (activeRuns[0]?.stage ? formatRunStage(activeRuns[0].stage) : null)
  const currentAgentLabel =
    workflowContext.activeAgentName ||
    agents.find((agent) => agent.id === workflowContext.activeAgentId)?.name ||
    activeRuns[0]?.agent?.name ||
    null
  const recentExecutionEvents = sortedRuns.slice(0, 8)
  const liveAgentActivity = activeRuns.length
    ? activeRuns.map((run) => ({
        ...run,
        agent: agents.find((agent) => agent.id === run.agent_id),
      }))
    : executionSteps.slice(-4).reverse().map((step) => ({
        id: step.id,
        status: step.status === 'failed' ? 'failed' : 'completed',
        stage: step.title,
        agent: agents.find((agent) => agent.id === step.agentId),
        output_payload: { summary: step.summary },
      }))

  const flowSteps = [
    {
      id: 'intake',
      label: 'Intake',
      detail: 'Iris receives and classifies the request',
      state: 'done',
    },
    {
      id: 'routing',
      label: 'Routing',
      detail: leadAgent ? `Lead: ${leadAgent.name}${supportAgents.length ? ` · Support: ${supportAgents.map((agent) => agent.name).join(', ')}` : ''}` : 'Awaiting assignment',
      state: leadAgent ? 'done' : mission.status === 'blocked' ? 'warning' : 'active',
    },
    {
      id: 'execution',
      label: 'Execution',
      detail: mission.pipelineName || executionSteps.length ? `${mission.pipelineName || 'Direct execution'} · ${executionSteps.length || 0} logged step${executionSteps.length === 1 ? '' : 's'}` : 'Waiting for execution',
      state:
        mission.status === 'completed' || displayArtifacts.length
          ? 'done'
          : mission.status === 'blocked'
            ? 'warning'
            : mission.status === 'queued' || mission.status === 'in_progress' || mission.status === 'review'
              ? 'active'
              : 'idle',
    },
    {
      id: 'output',
      label: 'Saved Output',
      detail: latestArtifact ? `Latest artifact: ${latestArtifact.title}` : 'No artifact saved yet',
      state: latestArtifact ? 'done' : mission.status === 'blocked' ? 'warning' : 'idle',
    },
  ] as const

  const flowStyles: Record<string, { dot: string; rail: string; badge: string }> = {
    done: {
      dot: 'bg-[var(--accent-green)] shadow-[0_0_0_4px_rgba(0,212,170,0.12)]',
      rail: 'bg-[var(--accent-green)]',
      badge: 'text-[var(--accent-green)] bg-[rgba(0,212,170,0.1)] border-[rgba(0,212,170,0.22)]',
    },
    active: {
      dot: 'bg-[var(--accent-blue)] shadow-[0_0_0_4px_rgba(79,142,247,0.14)]',
      rail: 'bg-[linear-gradient(90deg,var(--accent-blue),rgba(79,142,247,0.18))]',
      badge: 'text-[var(--accent-blue)] bg-[rgba(79,142,247,0.1)] border-[rgba(79,142,247,0.22)]',
    },
    warning: {
      dot: 'bg-[var(--accent-orange)] shadow-[0_0_0_4px_rgba(255,124,66,0.14)]',
      rail: 'bg-[var(--accent-orange)]',
      badge: 'text-[var(--accent-orange)] bg-[rgba(255,124,66,0.1)] border-[rgba(255,124,66,0.22)]',
    },
    idle: {
      dot: 'bg-[var(--border-glow)]',
      rail: 'bg-[var(--border)]',
      badge: 'text-[var(--text-dim)] bg-[var(--bg-elevated)] border-[var(--border)]',
    },
  }

  useEffect(() => {
    let active = true
    const token = getStoredToken()

    ;(async () => {
      if (!token || !active) return
      const response = await fetch(`/api/tasks/${params.id}/execution`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      }).catch(() => null)

      if (!response?.ok || !active) return
      const payload = await response.json().catch(() => null)
      if (active) {
        setExecutionState(payload)
      }
    })()

    return () => {
      active = false
    }
  }, [params.id])

  useEffect(() => {
    const shouldPoll =
      executionBusy !== null ||
      !['completed', 'cancelled'].includes(mission.status) ||
      executionState?.job?.status === 'queued' ||
      executionState?.job?.status === 'running' ||
      executionState?.workflow?.status === 'active'

    if (!shouldPoll) return

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null
    const token = getStoredToken()

    const poll = async () => {
      if (!token || cancelled) return

      const response = await fetch(`/api/tasks/${params.id}/execution`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      }).catch(() => null)

      if (response?.ok && !cancelled) {
        const payload = await response.json().catch(() => null)
        if (payload) {
          setExecutionState(payload)
          if (payload.job?.status === 'completed' || payload.job?.status === 'failed') {
            await refreshSharedState()
            setExecutionBusy(null)
          }
        }
      }

      if (!cancelled) {
        timer = setTimeout(poll, 1800)
      }
    }

    poll()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [executionBusy, executionState?.job?.status, executionState?.workflow?.status, mission.status, params.id])

  async function refreshSharedState() {
    const token = getStoredToken()
    if (!token) return

    const response = await fetch('/api/state', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    })
    if (!response.ok) return
    const payload = await response.json().catch(() => null)
    if (payload?.state) {
      hydrateAppState(payload.state)
    }
  }

  async function handleExecutionAction(action: 'retry' | 'resume') {
    if (!mission) return
    setExecutionBusy(action)
    setFeedback(null)
    try {
      const token = getStoredToken()
      if (!token) throw new Error('Sign in required.')

      const response = await fetch(`/api/tasks/${mission.id}/execution`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Unable to run task.')
      setExecutionState((current: any) => ({
        ...(current || {}),
        job: payload?.job || { status: 'queued', action },
      }))
      setFeedback(action === 'retry' ? 'Task queued for retry.' : 'Task queued to resume.')
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Unable to execute task.')
    }
  }

  async function handleApproveOutput() {
    if (!mission) return
    setReviewBusy('approve')
    setFeedback(null)
    try {
      if (latestArtifact) {
        updateArtifact(latestArtifact.id, {
          status: latestArtifact.status === 'delivered' ? 'delivered' : 'ready',
        })
      }
      updateMission(mission.id, {
        status: 'completed',
        progress: 100,
        reviewStatus: 'approved',
        handoffNotes: 'Output approved and task completed.',
      })
      setFeedback('Output approved. Task marked complete.')
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Unable to approve the output.')
    } finally {
      setReviewBusy(null)
    }
  }

  async function handleRequestChanges() {
    if (!mission) return
    const comment = reviewComment.trim()
    if (!comment) {
      setFeedback('Add a revision comment first.')
      return
    }

    setReviewBusy('changes')
    setFeedback(null)
    try {
      const commentEntry = {
        id: `${Date.now()}`,
        comment,
        author: currentUser?.email || 'Reviewer',
        createdAt: new Date().toISOString(),
        status: 'open' as const,
      }

      updateMission(mission.id, {
        status: 'in_progress',
        progress: 58,
        reviewStatus: 'changes_requested',
        reviewComments: [...reviewComments, commentEntry],
        handoffNotes: `Revision requested: ${comment}`,
      })

      const token = getStoredToken()
      if (!token) throw new Error('Sign in required.')

      const response = await fetch(`/api/tasks/${mission.id}/execution`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'retry',
          comment,
          runtimeMode: mission.runtimeMode || providerSettings.routing.runtimeMode,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || 'Unable to queue revision.')
      setExecutionState((current: any) => ({
        ...(current || {}),
        job: payload?.job || { status: 'queued', action: 'retry' },
      }))
      setExecutionBusy('retry')
      setReviewComment('')
      setFeedback('Revision queued. Iris is reworking the task with your comment.')
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Unable to request changes.')
    } finally {
      setReviewBusy(null)
    }
  }

  async function handleExport(artifact: Artifact, format: ArtifactExport['format']) {
    const exportKey = `${artifact.id}:${format}`
    const leadAgent = agents.find((item) => item.id === artifact.agentId)

    setExportingKey(exportKey)
    setFeedback(null)

    try {
      const response = await fetch('/api/artifacts/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          artifact,
          format,
          clientName: client?.name,
          missionTitle: mission?.title,
          agentName: leadAgent?.name,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Unable to generate export.')
      }

      const exportRecord = data.exportRecord as ArtifactExport
      updateArtifact(artifact.id, {
        exports: [exportRecord, ...(artifact.exports || [])],
        status: artifact.status === 'draft' ? 'ready' : artifact.status,
        path: exportRecord.path,
      })

      setFeedback(`${artifact.title} exported as ${format.toUpperCase()}.`)
      window.open(exportRecord.publicUrl, '_blank', 'noopener,noreferrer')
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Unable to generate export.')
    } finally {
      setExportingKey(null)
    }
  }

  return (
    <ClientShell>
      <div className="flex flex-col h-full">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-4">
          <div>
            <Link href="/tasks" className="inline-flex items-center gap-2 text-[11px] text-accent-blue mb-2">
              <ArrowLeft size={12} />
              Back to tasks
            </Link>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-heading font-bold text-text-primary">{mission.title}</h1>
              <Badge color={STATUS_COLORS[mission.status]} size="sm">
                {mission.status.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-xs text-text-secondary mt-1">
              {client?.name || 'General Ops'} · {DELIVERABLE_LABELS[mission.deliverableType] || mission.deliverableType}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="ghost" onClick={() => updateMission(mission.id, { status: mission.status === 'paused' ? 'in_progress' : 'paused' })}>
              {mission.status === 'paused' ? 'Resume' : 'Pause'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => handleExecutionAction(mission.status === 'paused' ? 'resume' : 'retry')} disabled={Boolean(executionBusy)}>
              {executionBusy ? 'Running…' : mission.status === 'paused' ? 'Resume Run' : 'Retry Run'}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => updateMission(mission.id, { status: 'cancelled', progress: 0 })}>
              Cancel
            </Button>
            <Button size="sm" variant="secondary" onClick={handleApproveOutput} disabled={!latestArtifact || reviewBusy !== null}>
              <CheckCircle2 size={14} />
              {reviewBusy === 'approve' ? 'Approving…' : 'Approve Output'}
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => {
                if (confirm(`Delete "${mission.title}"? This also removes its saved outputs.`)) {
                  deleteMission(mission.id)
                  router.replace('/tasks')
                }
              }}
            >
              <Trash2 size={14} />
              Delete
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 space-y-6">
              <Card>
                <div className="flex items-center gap-2 mb-3">
                  <Target size={16} className="text-accent-orange" />
                  <h2 className="text-sm font-heading font-semibold text-text-primary">Task Request</h2>
                </div>
                <p className="text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">{mission.summary}</p>
              </Card>

              <Card>
                <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                  <div>
                    <h2 className="text-sm font-heading font-semibold text-text-primary">Live Task Tracker</h2>
                    <p className="text-[11px] text-text-secondary mt-1">
                      Real-time task status, line progress, active agents, and the last execution error.
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-mono uppercase text-text-dim">Stage</p>
                    <p className="text-sm font-semibold text-text-primary">{workflowStageLabel || missionStageLabel}</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-base/40 p-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <span className="text-[11px] font-mono uppercase tracking-[0.2em] text-text-dim">Progress</span>
                    <span className="text-sm font-semibold text-text-primary">{workflowProgress}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-base overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${workflowProgress}%`,
                        background: `linear-gradient(90deg, ${STATUS_COLORS[mission.status] || '#4f8ef7'}, #4f8ef7)`,
                      }}
                    />
                  </div>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-xl border border-border bg-base/50 p-3">
                      <p className="text-[10px] font-mono uppercase text-text-dim">Current phase</p>
                      <p className="mt-1 text-sm text-text-primary">{executionState?.workflow?.current_phase || mission.pipelineName || 'Waiting for execution'}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-base/50 p-3">
                      <p className="text-[10px] font-mono uppercase text-text-dim">Runner</p>
                      <p className="mt-1 text-sm text-text-primary">{prettyRunStatus(executionState?.job?.status || latestRun?.status || mission.status)}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-base/50 p-3">
                      <p className="text-[10px] font-mono uppercase text-text-dim">Latest stage</p>
                      <p className="mt-1 text-sm text-text-primary">{formatRunStage(latestRun?.stage)}</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-xl border border-border bg-base/50 p-3">
                      <p className="text-[10px] font-mono uppercase text-text-dim">Current activity</p>
                      <p className="mt-1 text-sm text-text-primary">{currentActivityLabel || 'Waiting for the next recorded activity'}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-base/50 p-3">
                      <p className="text-[10px] font-mono uppercase text-text-dim">Current agent</p>
                      <p className="mt-1 text-sm text-text-primary">{currentAgentLabel || 'No agent actively recorded yet'}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-border bg-base/30 p-4">
                    <p className="text-[10px] font-mono uppercase text-text-dim mb-3">Active Agent Activity</p>
                    <div className="space-y-2">
                      {liveAgentActivity.length ? (
                        liveAgentActivity.map((entry: any) => (
                          <div key={entry.id} className="rounded-2xl border border-border bg-base px-3 py-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm text-text-primary">{entry.agent?.name || 'Agent'}{entry.agent?.role ? ` · ${entry.agent.role}` : ''}</p>
                              <span className="text-[10px] font-mono uppercase text-text-dim">{prettyRunStatus(entry.status)}</span>
                            </div>
                            <p className="mt-2 text-[12px] text-text-secondary">
                              {entry.output_payload?.summary || entry.summary || formatRunStage(entry.stage)}
                            </p>
                          </div>
                        ))
                      ) : (
                        <p className="text-[11px] text-text-dim">No live agent activity has been recorded yet.</p>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-base/30 p-4">
                    <p className="text-[10px] font-mono uppercase text-text-dim mb-3">Errors & Stalls</p>
                    {visibleErrorMessage ? (
                      <div className="rounded-2xl border border-[rgba(255,124,66,0.22)] bg-[rgba(255,124,66,0.08)] px-4 py-4">
                        <p className="text-sm font-semibold text-text-primary">
                          {latestErrorRun ? formatRunStage(latestErrorRun.stage) : executionState?.workflow?.current_phase || 'Execution tracking'}
                        </p>
                        <p className="mt-2 text-[12px] text-text-secondary">{visibleErrorMessage}</p>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-border bg-base px-4 py-4">
                        <p className="text-sm text-text-primary">No blocking error recorded.</p>
                        <p className="mt-1 text-[12px] text-text-secondary">If this task stalls, the latest failure should appear here automatically.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-border bg-base/30 p-4">
                  <p className="text-[10px] font-mono uppercase text-text-dim mb-3">Execution Timeline</p>
                  <div className="space-y-2">
                    {recentExecutionEvents.length ? (
                      recentExecutionEvents.map((run: any) => {
                        const agent = agents.find((entry) => entry.id === run.agent_id)
                        const stamp = run.updated_at || run.completed_at || run.started_at || run.created_at
                        return (
                          <div key={run.id} className="rounded-2xl border border-border bg-base px-3 py-3">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm text-text-primary">
                                {agent?.name || 'System'} · {formatRunStage(run.stage)}
                              </p>
                              <span className="text-[10px] font-mono uppercase text-text-dim">
                                {prettyRunStatus(run.status)}
                              </span>
                            </div>
                            <p className="mt-2 text-[12px] text-text-secondary">
                              {run.output_payload?.summary || run.error_message || run.output_payload?.provider || 'Execution event recorded.'}
                            </p>
                            {stamp ? (
                              <p className="mt-2 text-[10px] font-mono uppercase text-text-dim">
                                {new Date(stamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </p>
                            ) : null}
                          </div>
                        )
                      })
                    ) : (
                      <p className="text-[11px] text-text-dim">No execution events have been recorded yet.</p>
                    )}
                  </div>
                </div>
              </Card>

              <Card>
                <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                  <div>
                    <h2 className="text-sm font-heading font-semibold text-text-primary">Task Flow</h2>
                    <p className="text-[11px] text-text-secondary mt-1">
                      See how Iris routed the work, which specialists were used, and whether the final deliverable was saved.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {leadAgent ? (
                      <span className="px-3 py-1 rounded-full border border-border bg-base/50 text-[11px] text-text-secondary">
                        Lead: <span className="text-text-primary">{leadAgent.name}</span>
                      </span>
                    ) : null}
                    {mission.pipelineName ? (
                      <span className="px-3 py-1 rounded-full border border-border bg-base/50 text-[11px] text-text-secondary">
                        Pipeline: <span className="text-text-primary">{mission.pipelineName}</span>
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full border border-border bg-base/50 text-[11px] text-text-secondary">
                        Direct execution
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {flowSteps.map((step, index) => {
                    const style = flowStyles[step.state]
                    return (
                      <div key={step.id} className="relative rounded-2xl border border-border bg-base/40 p-4">
                        {index < flowSteps.length - 1 ? (
                          <div className={`hidden md:block absolute top-6 -right-4 h-[2px] w-8 ${style.rail}`} />
                        ) : null}
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-3 h-3 rounded-full ${style.dot}`} />
                          <span className={`px-2.5 py-1 rounded-full border text-[10px] font-mono uppercase tracking-wide ${style.badge}`}>
                            {step.state}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-text-primary">{step.label}</p>
                        <p className="text-[11px] text-text-secondary mt-2 leading-relaxed">{step.detail}</p>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-border bg-base/30 p-4">
                    <p className="text-[10px] font-mono uppercase text-text-dim mb-2">Assigned Specialists</p>
                    <div className="flex flex-wrap gap-2">
                      {assignedAgents.length ? (
                        assignedAgents.map((agent) => (
                          <span key={agent.id} className="px-3 py-1.5 rounded-full bg-base border border-border text-[11px] text-text-primary">
                            {agent.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-text-dim">No specialist assigned yet.</span>
                      )}
                    </div>
                  </div>
              <div className="rounded-xl border border-border bg-base/30 p-4">
                <p className="text-[10px] font-mono uppercase text-text-dim mb-2">Skill Stack Used</p>
                    <div className="space-y-3">
                      {Object.keys(skillAssignments).length ? (
                        Object.entries(skillAssignments).map(([agentId, skills]) => {
                          const agent = agents.find((entry) => entry.id === agentId)
                          return (
                            <div key={agentId}>
                              <p className="text-[11px] text-text-secondary mb-1">
                                <span className="text-text-primary">{agent?.name || agentId}</span>
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {(skills || []).length ? (
                                  (skills || []).map((skill) => (
                                    <span key={`${agentId}-${skill}`} className="px-3 py-1.5 rounded-full bg-base border border-border text-[11px] text-text-primary">
                                      {skill}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-[11px] text-text-dim">No explicit skill selection recorded.</span>
                                )}
                              </div>
                            </div>
                          )
                        })
                      ) : usedSkillNames.length ? (
                        <div className="flex flex-wrap gap-2">
                          {usedSkillNames.map((skill) => (
                            <span key={skill} className="px-3 py-1.5 rounded-full bg-base border border-border text-[11px] text-text-primary">
                              {skill}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-text-dim">No explicit skill context recorded.</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-border bg-base/30 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquareText size={15} className="text-accent-blue" />
                      <p className="text-[10px] font-mono uppercase text-text-dim">Review Workflow</p>
                    </div>
                    <p className="text-sm text-text-secondary mb-3">
                      Approve the output to complete the task, or leave a revision note and Iris will rerun the task with your feedback.
                    </p>
                    <textarea
                      value={reviewComment}
                      onChange={(event) => setReviewComment(event.target.value)}
                      placeholder="Example: tighten the hook, make the tone more premium, and end with a softer CTA."
                      className="min-h-[110px] w-full rounded-2xl border border-border bg-base px-4 py-3 text-sm text-text-primary outline-none focus:border-[var(--accent-blue)]"
                    />
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      <Button size="sm" variant="secondary" onClick={handleRequestChanges} disabled={reviewBusy !== null || executionBusy !== null}>
                        {reviewBusy === 'changes' ? 'Sending…' : 'Request Changes'}
                      </Button>
                      <span className="text-[11px] text-text-dim">
                        Runtime mode: {mission.runtimeMode || providerSettings.routing.runtimeMode}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-border bg-base/30 p-4">
                    <p className="text-[10px] font-mono uppercase text-text-dim mb-2">Review History</p>
                    <div className="space-y-2">
                      {reviewComments.length ? (
                        reviewComments
                          .slice()
                          .reverse()
                          .map((entry) => (
                            <div key={entry.id} className="rounded-2xl border border-border bg-base px-3 py-3">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-[11px] text-text-secondary">{entry.author}</p>
                                <span className="text-[10px] font-mono uppercase text-text-dim">{entry.status}</span>
                              </div>
                              <p className="mt-2 text-sm text-text-primary">{entry.comment}</p>
                            </div>
                          ))
                      ) : (
                        <p className="text-[11px] text-text-dim">No review comments yet.</p>
                      )}
                    </div>
                  </div>
                </div>

                {mission.compareSummary?.enabled ? (
                  <div className="mt-4 rounded-xl border border-border bg-base/30 p-4">
                    <p className="text-[10px] font-mono uppercase text-text-dim mb-2">Compare Drafts</p>
                    <p className="text-sm text-text-primary">
                      Selected: {mission.compareSummary.selectedProvider} / {mission.compareSummary.selectedModel} ({mission.compareSummary.selectedScore ?? 0})
                    </p>
                    {mission.compareSummary.alternateProvider ? (
                      <p className="text-[11px] text-text-secondary mt-1">
                        Alternate: {mission.compareSummary.alternateProvider} / {mission.compareSummary.alternateModel} ({mission.compareSummary.alternateScore ?? 0})
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </Card>

              {displayArtifacts.length ? (
                displayArtifacts.map((artifact) => (
                  <Card key={artifact.id} className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-heading font-semibold text-text-primary">{artifact.title}</h2>
                        <p className="text-[11px] text-text-secondary mt-1">
                          {DELIVERABLE_LABELS[artifact.deliverableType] || artifact.deliverableType} · {(artifact.format || 'html').toUpperCase()}
                        </p>
                      </div>
                      <Badge color={artifact.status === 'delivered' ? '#00d4aa' : artifact.status === 'ready' ? '#4f8ef7' : '#ffd166'} size="sm">
                        {artifact.status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {getSupportedExportFormats(artifact).map((format) => (
                        <Button
                          key={format}
                          size="sm"
                          variant="secondary"
                          disabled={exportingKey === `${artifact.id}:${format}`}
                          onClick={() => handleExport(artifact, format)}
                        >
                          {format === 'xlsx' ? <Sheet size={14} /> : <Download size={14} />}
                          {exportingKey === `${artifact.id}:${format}` ? `Generating ${format.toUpperCase()}...` : `Generate ${format.toUpperCase()}`}
                        </Button>
                      ))}
                      <Button size="sm" variant="ghost" onClick={() => updateArtifact(artifact.id, { status: 'ready' })}>
                        Mark Ready
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => updateArtifact(artifact.id, { status: 'delivered' })}>
                        Mark Delivered
                      </Button>
                      {artifact.deliverableType === 'content-calendar' ? (
                        <a
                          href={`/share/output/${artifact.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs text-accent-blue hover:border-border-glow"
                        >
                          <ExternalLink size={14} />
                          Share View
                        </a>
                      ) : null}
                    </div>

                    {hasArtifactBody(artifact) ? (
                      <div className="p-4 rounded-xl border border-border bg-base/60">
                        <ArtifactOutputView artifact={artifact} />
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl border border-border bg-base/40">
                        <p className="text-[12px] text-text-secondary">No output saved yet for this task.</p>
                      </div>
                    )}

                    {artifact.sourcePrompt ? (
                      <div className="p-4 rounded-xl border border-border bg-base/40">
                        <p className="text-[10px] font-mono uppercase text-text-dim mb-2">Task Brief</p>
                        <p className="text-[11px] text-text-secondary whitespace-pre-wrap leading-relaxed">{artifact.sourcePrompt}</p>
                        {artifact.missionId !== mission.id ? (
                          <p className="mt-2 text-[11px] text-accent-blue">
                            Showing the latest matching saved output because this task&apos;s original artifact record is empty.
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    {artifact.exports?.length ? (
                      <div className="p-4 rounded-xl border border-border bg-base/30">
                        <p className="text-[10px] font-mono uppercase text-text-dim mb-3">Exports</p>
                        <div className="space-y-2">
                          {artifact.exports.map((record) => (
                            <a
                              key={record.id}
                              href={record.publicUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border hover:border-border-glow"
                            >
                              <div>
                                <p className="text-sm text-text-primary">{record.fileName}</p>
                                <p className="text-[11px] text-text-dim">{new Date(record.createdAt).toLocaleString()}</p>
                              </div>
                              <ExternalLink size={14} className="text-accent-blue" />
                            </a>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {artifact.executionSteps?.length ? (
                      <div className="p-4 rounded-xl border border-border bg-base/30">
                        <p className="text-[10px] font-mono uppercase text-text-dim mb-3">Autonomous Execution</p>
                        <div className="space-y-2">
                          {artifact.executionSteps.map((step) => (
                            <div key={step.id} className="p-3 rounded-lg border border-border bg-base/40">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm text-text-primary">{step.agentName} · {step.title}</p>
                                <span className="text-[10px] font-mono uppercase text-text-dim">
                                  {step.status || 'completed'}
                                </span>
                              </div>
                              <p className="text-[11px] text-text-secondary mt-1">{step.summary}</p>
                              <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-text-dim font-mono">
                                {step.phaseName ? <span>phase:{step.phaseName}</span> : null}
                                {step.activityId ? <span>activity:{step.activityId}</span> : null}
                                {step.provider ? <span>provider:{step.provider}</span> : null}
                                {step.model ? <span>model:{step.model}</span> : null}
                                {step.outputIds?.length ? <span>outputs:{step.outputIds.join(', ')}</span> : null}
                              </div>
                              {step.qualityIssues?.length ? (
                                <div className="mt-2 space-y-1">
                                  {step.qualityIssues.map((issue, index) => (
                                    <p key={`${step.id}-issue-${index}`} className="text-[11px] text-accent-yellow">
                                      {issue}
                                    </p>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </Card>
                ))
              ) : (
                <Card>
                  <p className="text-sm text-text-primary">No output yet.</p>
                  <p className="text-[11px] text-text-dim mt-1">When Iris drafts the deliverable, it will appear here automatically.</p>
                </Card>
              )}
            </div>

            <div className="space-y-6">
              <Card>
                  <h3 className="text-xs font-mono text-text-dim uppercase mb-3">Task Summary</h3>
                  <div className="space-y-2 text-sm text-text-secondary">
                  <p><span className="text-text-primary">Client:</span> {client?.name || 'General Ops'}</p>
                  <p><span className="text-text-primary">Type:</span> {DELIVERABLE_LABELS[mission.deliverableType] || mission.deliverableType}</p>
                  <p><span className="text-text-primary">Lead:</span> {leadAgent?.name || 'Iris'}</p>
                  <p><span className="text-text-primary">Support:</span> {supportAgents.length ? supportAgents.map((agent) => agent.name).join(', ') : 'None'}</p>
                  {mission.pipelineName ? <p><span className="text-text-primary">Pipeline:</span> {mission.pipelineName}</p> : null}
                  <p><span className="text-text-primary">Stage:</span> {missionStageLabel}</p>
                  <p><span className="text-text-primary">Created:</span> {new Date(mission.createdAt).toLocaleString()}</p>
                  <p><span className="text-text-primary">Updated:</span> {new Date(mission.updatedAt).toLocaleString()}</p>
                </div>
              </Card>

              {executionState?.workflow || executionState?.runs?.length ? (
                <Card>
                  <h3 className="text-xs font-mono text-text-dim uppercase mb-3">Execution State</h3>
                  {executionState.workflow ? (
                    <div className="space-y-2 mb-4 text-sm text-text-secondary">
                      <p><span className="text-text-primary">Workflow:</span> {executionState.workflow.status}</p>
                      <p><span className="text-text-primary">Current phase:</span> {executionState.workflow.current_phase || '—'}</p>
                      <p><span className="text-text-primary">Stage:</span> {workflowStageLabel}</p>
                      <div className="rounded-xl border border-border bg-base/50 px-3 py-3 mt-2">
                        <p className="text-[10px] font-mono uppercase text-text-dim">Workflow State</p>
                        <p className="mt-1 text-sm text-text-primary">{workflowStageLabel}</p>
                      </div>
                    </div>
                  ) : null}
                  {executionState.job ? (
                    <div className="mb-4 p-3 rounded-lg border border-border bg-base/30">
                      <p className="text-sm text-text-primary">Runner status: {executionState.job.status}</p>
                      {executionState.job.error ? (
                        <p className="text-[11px] text-accent-orange mt-1">{executionState.job.error}</p>
                      ) : null}
                    </div>
                  ) : null}
                  {executionState.runs?.length ? (
                    <div className="space-y-2">
                      {executionState.runs.slice(0, 10).map((run: any) => (
                        <div key={run.id} className="p-3 rounded-lg border border-border bg-base/40">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm text-text-primary">{run.stage}</p>
                            <span className="text-[10px] font-mono uppercase text-text-dim">{run.status}</span>
                          </div>
                          {run.error_message ? <p className="text-[11px] text-accent-orange mt-1">{run.error_message}</p> : null}
                          <p className="text-[11px] text-text-dim mt-1">
                            {new Date(run.created_at).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </Card>
              ) : null}

              <Card>
                <div className="flex items-center gap-2 mb-3">
                  <FileText size={14} className="text-accent-blue" />
                  <h3 className="text-xs font-mono text-text-dim uppercase">Assigned Team</h3>
                </div>
                <div className="space-y-2">
                  {assignedAgents.length ? (
                    assignedAgents.map((agent) => (
                      <div key={agent.id} className="p-3 rounded-lg border border-border bg-base/40">
                        <p className="text-sm text-text-primary">{agent.name}</p>
                        <p className="text-[11px] text-text-secondary">{agent.role}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-[11px] text-text-dim">No specialist assigned yet.</p>
                  )}
                </div>
              </Card>

              {workingAgents.length ? (
                <Card>
                  <h3 className="text-xs font-mono text-text-dim uppercase mb-3">Agents Who Worked On This Task</h3>
                  <div className="space-y-2">
                    {workingAgents.map((agent) => (
                      <div key={agent.id} className="p-3 rounded-lg border border-border bg-base/40">
                        <p className="text-sm text-text-primary">{agent.name}</p>
                        <p className="text-[11px] text-text-secondary">{agent.role}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              ) : null}

              {(mission.qualityChecklist?.length || mission.handoffNotes || orchestrationTrace.length) ? (
                <Card>
                  <h3 className="text-xs font-mono text-text-dim uppercase mb-3">Execution Plan</h3>
                  {mission.handoffNotes ? (
                    <p className="text-sm text-text-secondary leading-relaxed mb-3">{mission.handoffNotes}</p>
                  ) : null}
                  {orchestrationTrace.length ? (
                    <div className="space-y-2 mb-3">
                      {orchestrationTrace.map((step, index) => (
                        <div key={`${mission.id}-trace-${index}`} className="p-3 rounded-lg border border-border bg-base/40">
                          <p className="text-sm text-text-primary">{step}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {mission.qualityChecklist?.length ? (
                    <div className="space-y-2">
                      {mission.qualityChecklist.map((step, index) => (
                        <div key={`${mission.id}-qc-${index}`} className="p-3 rounded-lg border border-border bg-base/40">
                          <p className="text-sm text-text-primary">{step}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </Card>
              ) : null}

              {feedback ? (
                <Card>
                  <p className="text-sm text-text-primary">{feedback}</p>
                </Card>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </ClientShell>
  )
}
