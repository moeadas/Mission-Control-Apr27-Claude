'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { ClientShell } from '@/components/ClientShell'
import { useAgentsStore } from '@/lib/agents-store'
import { getAuthToken } from '@/lib/auth/browser'
import {
  Calendar,
  Plus,
  Trash2,
  Play,
  Pause,
  Edit3,
  X,
  Save,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  Zap,
  RefreshCw,
  Bot,
  FileText,
  Loader2,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────────────

type ScheduleFrequency = 'once' | 'daily' | 'weekly' | 'monthly'
type ScheduleStatus = 'active' | 'paused' | 'completed' | 'failed'

interface ScheduledTask {
  id: string
  tenant_id: string
  agent_id: string | null
  name: string
  description: string
  task_type: string
  prompt: string
  frequency: ScheduleFrequency
  day_of_week: number | null
  day_of_month: number | null
  time_hour: number
  time_minute: number
  status: ScheduleStatus
  last_run_at: string | null
  last_run_status: 'success' | 'error' | null
  last_run_output: string | null
  next_run_at: string | null
  run_count: number
  created_at: string
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatNextRun(isoStr: string | null): string {
  if (!isoStr) return 'One-time / not scheduled'
  const d = new Date(isoStr)
  const diff = d.getTime() - Date.now()
  if (diff < 0) return 'Overdue'
  if (diff < 60_000) return 'In < 1 min'
  if (diff < 3_600_000) return `In ${Math.round(diff / 60_000)} min`
  if (diff < 86_400_000) return `In ${Math.round(diff / 3_600_000)}h`
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function formatLastRun(isoStr: string | null): string {
  if (!isoStr) return 'Never'
  return new Date(isoStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const TASK_TYPES = [
  { value: 'competitor-research', label: 'Competitor Research' },
  { value: 'content-calendar', label: 'Content Calendar' },
  { value: 'campaign-brief', label: 'Campaign Brief' },
  { value: 'seo-audit', label: 'SEO Audit' },
  { value: 'performance-report', label: 'Performance Report' },
  { value: 'social-posts', label: 'Social Posts Batch' },
  { value: 'email-campaign', label: 'Email Campaign' },
  { value: 'custom', label: 'Custom Prompt' },
]

const PROMPT_PLACEHOLDERS: Record<string, string> = {
  'competitor-research': 'Analyse the top 5 competitors in [your niche]. Compare their content strategy, posting frequency on Instagram and LinkedIn, key messaging themes, and identify 3 gaps we can exploit. Format as a structured report.',
  'content-calendar': 'Create a 2-week content calendar for [brand/client]. Include 3 posts per week across Instagram and LinkedIn. Focus on [topic/theme]. Provide hook, body copy, CTA, and best posting time for each.',
  'campaign-brief': 'Write a campaign brief for [product/service] targeting [audience]. Include objectives, key messages, channel mix, KPIs, and a suggested 4-week rollout timeline.',
  'seo-audit': 'Conduct an SEO content audit for [website/topic]. Identify top keyword opportunities, content gaps, on-page improvements needed, and prioritise by impact. Output as an actionable checklist.',
  'performance-report': 'Generate a marketing performance summary for [period]. Cover engagement rates, top-performing content, email metrics, and 3 concrete recommendations for next month.',
  'social-posts': 'Write 5 social media posts for [platform] about [topic]. Each post should have a strong hook, 150-word body, and 3 relevant hashtags. Vary the format: 1 tip, 1 story, 1 question, 1 list, 1 CTA.',
  'email-campaign': 'Write a 3-email nurture sequence for [product/offer]. Email 1: awareness, Email 2: education/proof, Email 3: conversion. Include subject line, preview text, body, and CTA for each.',
  'custom': 'Describe exactly what you want the agent to do, including any specific context, format requirements, or data sources to reference.',
}

const STATUS_CONFIG: Record<ScheduleStatus, { label: string; color: string; bg: string }> = {
  active: { label: 'Active', color: '#2dd4bf', bg: 'rgba(45,212,191,0.12)' },
  paused: { label: 'Paused', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  completed: { label: 'Completed', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  failed: { label: 'Failed', color: '#fb923c', bg: 'rgba(251,146,60,0.12)' },
}

// ─── API helpers ─────────────────────────────────────────────────────────────

async function apiFetch(path: string, opts: RequestInit = {}) {
  const token = await getAuthToken()
  return fetch(path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(opts.headers || {}),
    },
  })
}

// ─── Form modal ───────────────────────────────────────────────────────────────

interface FormState {
  name: string
  description: string
  task_type: string
  prompt: string
  agent_id: string
  frequency: ScheduleFrequency
  day_of_week: number
  day_of_month: number
  time_hour: number
  time_minute: number
}

function ScheduleModal({
  task,
  agents,
  clients,
  onSave,
  onClose,
}: {
  task: ScheduledTask | null
  agents: { id: string; name: string; role?: string }[]
  clients: { id: string; name: string }[]
  onSave: (data: Partial<ScheduledTask>) => Promise<void>
  onClose: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<FormState>(() => ({
    name: task?.name || '',
    description: task?.description || '',
    task_type: task?.task_type || 'competitor-research',
    prompt: task?.prompt || '',
    agent_id: task?.agent_id || '',
    frequency: task?.frequency || 'weekly',
    day_of_week: task?.day_of_week ?? 1,
    day_of_month: task?.day_of_month ?? 1,
    time_hour: task?.time_hour ?? 9,
    time_minute: task?.time_minute ?? 0,
  }))

  const set = (key: keyof FormState, val: any) => setForm((p) => ({ ...p, [key]: val }))

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Name is required'); return }
    if (!form.prompt.trim()) { setError('Prompt / instructions are required'); return }
    setSaving(true)
    setError('')
    try {
      await onSave({
        name: form.name.trim(),
        description: form.description,
        task_type: form.task_type,
        prompt: form.prompt.trim(),
        agent_id: form.agent_id || null,
        frequency: form.frequency,
        day_of_week: form.frequency === 'weekly' ? form.day_of_week : null,
        day_of_month: form.frequency === 'monthly' ? form.day_of_month : null,
        time_hour: form.time_hour,
        time_minute: form.time_minute,
      } as any)
    } catch (e: any) {
      setError(e.message || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const placeholder = PROMPT_PLACEHOLDERS[form.task_type] || PROMPT_PLACEHOLDERS['custom']

  return (
    <div className="form-backdrop">
      <div className="form-panel max-w-2xl max-h-[90vh]">
        {/* Header */}
        <div className="form-header">
          <p className="form-header-title">
            {task ? 'Edit Schedule' : 'New Scheduled Task'}
          </p>
          <button onClick={onClose} className="form-close-btn">
            <X size={18} />
          </button>
        </div>

        <div className="form-body space-y-5">
          {/* Name */}
          <div>
            <label className="form-label uppercase tracking-wider">
              Task Name <span className="text-red-400">*</span>
            </label>
            <input
              autoFocus
              type="text"
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              className="form-input px-4 py-2.5"
              placeholder="e.g., Weekly Competitor Analysis"
            />
          </div>

          {/* Task type + Agent */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label uppercase tracking-wider">Task Type</label>
              <div className="relative">
                <select
                  value={form.task_type}
                  onChange={(e) => {
                    set('task_type', e.target.value)
                    if (!form.prompt) set('prompt', '')
                  }}
                  className="form-select px-4 py-2.5 appearance-none pr-8"
                >
                  {TASK_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)] pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="form-label uppercase tracking-wider">
                <Bot size={11} className="inline mr-1" />
                Agent (optional)
              </label>
              <div className="relative">
                <select
                  value={form.agent_id}
                  onChange={(e) => set('agent_id', e.target.value)}
                  className="form-select px-4 py-2.5 appearance-none pr-8"
                >
                  <option value="">Iris (default)</option>
                  {agents.map((a) => <option key={a.id} value={a.id}>{a.name}{a.role ? ` — ${a.role}` : ''}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)] pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Prompt / instructions */}
          <div>
            <label className="form-label uppercase tracking-wider">
              Prompt / Instructions <span className="text-red-400">*</span>
            </label>
            <textarea
              value={form.prompt}
              onChange={(e) => set('prompt', e.target.value)}
              rows={5}
              className="form-textarea px-4 py-2.5 resize-none"
              placeholder={placeholder}
            />
            <p className="text-[10px] text-[var(--text-dim)] mt-1">
              Be specific — the agent will execute exactly this prompt on the schedule below.
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="form-label uppercase tracking-wider">
              Internal Note (optional)
            </label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              className="form-input px-4 py-2.5"
              placeholder="What is this task for?"
            />
          </div>

          {/* Frequency */}
          <div>
            <label className="form-label uppercase tracking-wider mb-2">Frequency</label>
            <div className="flex gap-2 flex-wrap">
              {(['once', 'daily', 'weekly', 'monthly'] as ScheduleFrequency[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => set('frequency', f)}
                  className={`form-pill capitalize ${form.frequency === f ? 'form-pill-active' : ''}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Weekly — day of week */}
          {form.frequency === 'weekly' && (
            <div>
              <label className="form-label uppercase tracking-wider mb-2">Day of Week</label>
              <div className="flex gap-2">
                {DAYS_OF_WEEK.map((day, i) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => set('day_of_week', i)}
                    className={`form-pill flex-1 py-2 text-xs ${form.day_of_week === i ? 'form-pill-active' : ''}`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Monthly — day of month */}
          {form.frequency === 'monthly' && (
            <div>
              <label className="form-label uppercase tracking-wider">Day of Month</label>
              <input
                type="number"
                min={1}
                max={28}
                value={form.day_of_month}
                onChange={(e) => set('day_of_month', parseInt(e.target.value) || 1)}
                className="form-input w-24 px-4 py-2.5"
              />
            </div>
          )}

          {/* Time */}
          {form.frequency !== 'once' && (
            <div>
              <label className="form-label uppercase tracking-wider">Run Time (24h)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={form.time_hour}
                  onChange={(e) => set('time_hour', Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
                  className="form-input w-20 px-3 py-2 text-center"
                />
                <span className="text-[var(--text-dim)] font-bold">:</span>
                <input
                  type="number"
                  min={0}
                  max={59}
                  step={15}
                  value={form.time_minute}
                  onChange={(e) => set('time_minute', Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                  className="form-input w-20 px-3 py-2 text-center"
                />
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-400 bg-red-500/10 rounded-xl px-4 py-2">{error}</p>}
        </div>

        {/* Footer */}
        <div className="form-footer justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[#64748b] hover:text-[#374151]">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #4f8ef7, #2dd4bf)' }}
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {task ? 'Update Schedule' : 'Create Schedule'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Output viewer modal ──────────────────────────────────────────────────────

function OutputModal({ task, onClose }: { task: ScheduledTask; onClose: () => void }) {
  return (
    <div className="form-backdrop" onClick={onClose}>
      <div className="form-panel max-w-2xl max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
        <div className="form-header">
          <div>
            <p className="form-header-title">Last Run Output</p>
            <p className="form-header-subtitle">{task.name} · {formatLastRun(task.last_run_at)}</p>
          </div>
          <button onClick={onClose} className="form-close-btn">
            <X size={18} />
          </button>
        </div>
        <div className="form-body">
          {task.last_run_status === 'error' && (
            <div className="mb-3 px-4 py-2 bg-red-500/10 text-red-400 text-xs rounded-xl">
              ⚠ Run failed
            </div>
          )}
          <pre className="text-sm text-[#374151] whitespace-pre-wrap font-sans leading-relaxed">
            {task.last_run_output || 'No output available.'}
          </pre>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SchedulesPage() {
  const agents = useAgentsStore((state) => state.agents)
  const clients = useAgentsStore((state) => state.clients)
  const [tasks, setTasks] = useState<ScheduledTask[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [runningId, setRunningId] = useState<string | null>(null)
  const [viewOutputTask, setViewOutputTask] = useState<ScheduledTask | null>(null)

  const fetchTasks = useCallback(async () => {
    try {
      const res = await apiFetch('/api/scheduled-tasks')
      if (res.ok) {
        const data = await res.json()
        setTasks(data.tasks || [])
      }
    } catch (err) {
      console.error('Failed to fetch scheduled tasks', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const handleSave = async (formData: Partial<ScheduledTask>) => {
    if (editingTask) {
      // Update existing
      const res = await apiFetch(`/api/scheduled-tasks/${editingTask.id}`, {
        method: 'PATCH',
        body: JSON.stringify(formData),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Failed to update')
      }
      const { task } = await res.json()
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)))
    } else {
      // Create new
      const res = await apiFetch('/api/scheduled-tasks', {
        method: 'POST',
        body: JSON.stringify(formData),
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Failed to create')
      }
      const { task } = await res.json()
      setTasks((prev) => [task, ...prev])
    }
    setModalOpen(false)
    setEditingTask(null)
  }

  const handleDelete = async (id: string) => {
    await apiFetch(`/api/scheduled-tasks/${id}`, { method: 'DELETE' })
    setTasks((prev) => prev.filter((t) => t.id !== id))
    setConfirmDeleteId(null)
  }

  const handleToggleStatus = async (task: ScheduledTask) => {
    const newStatus = task.status === 'active' ? 'paused' : 'active'
    const res = await apiFetch(`/api/scheduled-tasks/${task.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) {
      const { task: updated } = await res.json()
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    }
  }

  const handleRunNow = async (task: ScheduledTask) => {
    setRunningId(task.id)
    try {
      const res = await apiFetch(`/api/scheduled-tasks/${task.id}/run`, { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.task) {
        setTasks((prev) => prev.map((t) => (t.id === task.id ? data.task : t)))
        // Show output immediately
        setViewOutputTask(data.task)
      } else {
        console.error('Run failed:', data.error)
      }
    } catch (err) {
      console.error('Run error:', err)
    } finally {
      setRunningId(null)
    }
  }

  const activeCount = tasks.filter((t) => t.status === 'active').length
  const totalRuns = tasks.reduce((acc, t) => acc + (t.run_count || 0), 0)

  return (
    <ClientShell>
      <div className="flex-1 overflow-y-auto">
        <div className="w-full p-6 space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="mission-chip w-fit mb-3">
                <Calendar size={12} className="text-[#22d3ee]" />
                Automation
              </div>
              <h1 className="text-2xl font-black tracking-[-0.03em] text-[var(--text-primary)]">Scheduled Tasks</h1>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Recurring agent jobs — competitor research, content calendars, audits, reports, and more.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchTasks}
                disabled={loading}
                className="p-2.5 rounded-xl border border-[var(--border)] hover:border-[var(--border-glow)] text-[var(--text-dim)] hover:text-[var(--text-primary)] transition-all"
                title="Refresh"
              >
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={() => { setEditingTask(null); setModalOpen(true) }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-[0_8px_18px_rgba(79,142,247,0.24)] hover:shadow-[0_12px_24px_rgba(79,142,247,0.32)] transition-all"
                style={{ background: 'linear-gradient(135deg, #4f8ef7, #2dd4bf)' }}
              >
                <Plus size={16} />
                New Schedule
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Active Schedules', value: activeCount, color: '#2dd4bf', icon: <Zap size={16} /> },
              { label: 'Total Schedules', value: tasks.length, color: '#9b6dff', icon: <Calendar size={16} /> },
              { label: 'Total Runs', value: totalRuns, color: '#4f8ef7', icon: <RefreshCw size={16} /> },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/70 border border-[var(--border)] rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2" style={{ color: stat.color }}>
                  {stat.icon}
                  <p className="text-xs font-mono uppercase tracking-wider">{stat.label}</p>
                </div>
                <p className="text-3xl font-black" style={{ color: stat.color }}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Task list */}
          {loading ? (
            <div className="flex items-center justify-center py-20 text-[var(--text-dim)]">
              <Loader2 size={24} className="animate-spin mr-3" />
              Loading schedules…
            </div>
          ) : tasks.length === 0 ? (
            <div className="mission-panel p-12 text-center">
              <Calendar size={40} className="text-[var(--text-dim)] mx-auto mb-4" />
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">No schedules yet</h2>
              <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-sm mx-auto">
                Create your first scheduled task to automate recurring work — competitor analysis, content calendars, weekly reports, and more.
              </p>
              <button
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #4f8ef7, #2dd4bf)' }}
              >
                <Plus size={16} />
                Create first schedule
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => {
                const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.active
                const agentName = agents.find((a) => a.id === task.agent_id)?.name
                const taskLabel = TASK_TYPES.find((t) => t.value === task.task_type)?.label || task.task_type
                const isRunning = runningId === task.id

                return (
                  <div
                    key={task.id}
                    className="bg-white/72 border border-[var(--border)] rounded-2xl p-5 hover:border-[var(--border-glow)] hover:shadow-[0_8px_24px_rgba(45,78,135,0.08)] transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 min-w-0 flex-1">
                        {/* Status icon */}
                        <div
                          className="w-10 h-10 rounded-[14px] flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ background: statusCfg.bg }}
                        >
                          {task.status === 'active' ? (
                            <Zap size={18} style={{ color: statusCfg.color }} />
                          ) : task.status === 'failed' ? (
                            <AlertCircle size={18} style={{ color: statusCfg.color }} />
                          ) : task.status === 'completed' ? (
                            <CheckCircle size={18} style={{ color: statusCfg.color }} />
                          ) : (
                            <Pause size={18} style={{ color: statusCfg.color }} />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-[var(--text-primary)]">{task.name}</p>
                            <span
                              className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full"
                              style={{ background: statusCfg.bg, color: statusCfg.color }}
                            >
                              {statusCfg.label}
                            </span>
                            {task.last_run_status === 'error' && (
                              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">
                                Last run failed
                              </span>
                            )}
                          </div>

                          {/* Prompt preview */}
                          <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-1 max-w-lg">
                            {task.prompt}
                          </p>

                          <div className="flex items-center gap-3 mt-2 flex-wrap text-[11px]">
                            <span className="text-[var(--text-dim)]">{taskLabel}</span>
                            {agentName && (
                              <span className="text-[var(--accent-purple)] flex items-center gap-1">
                                <Bot size={10} />
                                {agentName}
                              </span>
                            )}
                            <span className="text-[var(--text-dim)] capitalize">
                              {task.frequency === 'weekly' && task.day_of_week !== null
                                ? `Every ${DAYS_OF_WEEK[task.day_of_week]}`
                                : task.frequency}
                              {task.frequency !== 'once'
                                ? ` at ${String(task.time_hour).padStart(2, '0')}:${String(task.time_minute).padStart(2, '0')}`
                                : ''}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: timing + actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-right mr-2 hidden sm:block">
                          <p className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider">Next run</p>
                          <p className="text-xs font-medium text-[var(--text-secondary)]">
                            <Clock size={10} className="inline mr-1" />
                            {formatNextRun(task.next_run_at)}
                          </p>
                          <p className="text-[10px] text-[var(--text-dim)] mt-0.5">
                            Last: {formatLastRun(task.last_run_at)} · {task.run_count} runs
                          </p>
                        </div>

                        {/* View output */}
                        {task.last_run_output && (
                          <button
                            onClick={() => setViewOutputTask(task)}
                            className="p-2 rounded-xl border border-[var(--border)] hover:border-[#9b6dff] hover:text-[#9b6dff] text-[var(--text-dim)] transition-all"
                            title="View last output"
                          >
                            <FileText size={14} />
                          </button>
                        )}

                        {/* Run now */}
                        <button
                          onClick={() => handleRunNow(task)}
                          disabled={isRunning}
                          className="p-2 rounded-xl border border-[var(--border)] hover:border-[#2dd4bf] hover:text-[#2dd4bf] text-[var(--text-dim)] transition-all disabled:opacity-50"
                          title="Run now"
                        >
                          {isRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                        </button>

                        {/* Pause/Resume */}
                        <button
                          onClick={() => handleToggleStatus(task)}
                          className={`p-2 rounded-xl border transition-all ${
                            task.status === 'active'
                              ? 'border-[#fbbf24]/40 text-[#fbbf24] hover:bg-[#fbbf24]/10'
                              : 'border-[var(--border)] text-[var(--text-dim)] hover:border-[#2dd4bf] hover:text-[#2dd4bf]'
                          }`}
                          title={task.status === 'active' ? 'Pause' : 'Resume'}
                        >
                          {task.status === 'active' ? <Pause size={14} /> : <Play size={14} />}
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => { setEditingTask(task); setModalOpen(true) }}
                          className="p-2 rounded-xl border border-[var(--border)] hover:border-[var(--accent-blue)] hover:text-[var(--accent-blue)] text-[var(--text-dim)] transition-all"
                          title="Edit"
                        >
                          <Edit3 size={14} />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => setConfirmDeleteId(task.id)}
                          className="p-2 rounded-xl border border-[var(--border)] hover:border-red-400 hover:text-red-400 text-[var(--text-dim)] transition-all"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Tips */}
          <div className="bg-white/60 border border-[var(--border)] rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <Zap size={14} className="text-[#22d3ee]" />
              Automation Tips
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-[var(--text-secondary)]">
              <div>
                <p className="font-semibold text-[var(--text-primary)] mb-1">Competitor Research</p>
                <p>Run daily or weekly to catch competitor moves early. Assign your research agent and specify the niche in the prompt.</p>
              </div>
              <div>
                <p className="font-semibold text-[var(--text-primary)] mb-1">Content Calendars</p>
                <p>Schedule weekly on Mondays at 09:00. Include your brand voice and target platforms in the prompt for consistent output.</p>
              </div>
              <div>
                <p className="font-semibold text-[var(--text-primary)] mb-1">Performance Reports</p>
                <p>Run monthly on the 1st. Reference your key KPIs in the prompt so the agent knows what metrics matter most.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create/Edit modal */}
      {modalOpen && (
        <ScheduleModal
          task={editingTask}
          agents={agents}
          clients={clients}
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditingTask(null) }}
        />
      )}

      {/* Output viewer */}
      {viewOutputTask && (
        <OutputModal task={viewOutputTask} onClose={() => setViewOutputTask(null)} />
      )}

      {/* Delete confirm */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-panel)] rounded-2xl p-6 max-w-sm w-full border border-[var(--border)] shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/12 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-400" />
            </div>
            <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">Delete schedule?</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-6">This will permanently delete the task and all its history.</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-5 py-2 rounded-xl text-sm border border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text-primary)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </ClientShell>
  )
}
