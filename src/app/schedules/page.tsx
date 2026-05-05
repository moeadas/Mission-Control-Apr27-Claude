'use client'

import React, { useState, useEffect } from 'react'
import { ClientShell } from '@/components/ClientShell'
import { useAgentsStore } from '@/lib/agents-store'
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
} from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'

// ─── Types ──────────────────────────────────────────────────────────────────

type ScheduleFrequency = 'once' | 'daily' | 'weekly' | 'monthly'
type ScheduleStatus = 'active' | 'paused' | 'completed' | 'failed'

interface ScheduledTask {
  id: string
  name: string
  description: string
  taskType: string
  pipelineId: string | null
  clientId: string | null
  frequency: ScheduleFrequency
  dayOfWeek?: number // 0=Sun … 6=Sat (for weekly)
  dayOfMonth?: number // 1-28 (for monthly)
  timeHour: number
  timeMinute: number
  status: ScheduleStatus
  lastRunAt: string | null
  nextRunAt: string | null
  createdAt: string
  runCount: number
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function computeNextRun(task: Partial<ScheduledTask>): string | null {
  if (!task.frequency || task.frequency === 'once') return null
  const now = new Date()
  const next = new Date(now)
  next.setSeconds(0, 0)
  next.setHours(task.timeHour ?? 9, task.timeMinute ?? 0)
  if (next <= now) {
    if (task.frequency === 'daily') next.setDate(next.getDate() + 1)
    else if (task.frequency === 'weekly') next.setDate(next.getDate() + 7)
    else if (task.frequency === 'monthly') next.setMonth(next.getMonth() + 1)
  }
  return next.toISOString()
}

function formatNextRun(isoStr: string | null): string {
  if (!isoStr) return 'One-time / not scheduled'
  const d = new Date(isoStr)
  const diff = d.getTime() - Date.now()
  if (diff < 0) return 'Overdue'
  if (diff < 60_000) return 'In less than a minute'
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
  { value: 'content-calendar', label: 'Content Calendar' },
  { value: 'campaign-brief', label: 'Campaign Brief' },
  { value: 'seo-audit', label: 'SEO Audit' },
  { value: 'competitor-research', label: 'Competitor Research' },
  { value: 'performance-report', label: 'Performance Report' },
  { value: 'email-campaign', label: 'Email Campaign' },
  { value: 'social-posts', label: 'Social Posts Batch' },
  { value: 'custom', label: 'Custom Prompt' },
]

const STATUS_CONFIG: Record<ScheduleStatus, { label: string; color: string; bg: string }> = {
  active: { label: 'Active', color: '#2dd4bf', bg: 'rgba(45,212,191,0.12)' },
  paused: { label: 'Paused', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  completed: { label: 'Completed', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  failed: { label: 'Failed', color: '#fb923c', bg: 'rgba(251,146,60,0.12)' },
}

// ─── Schedule Form Modal ─────────────────────────────────────────────────────

function ScheduleModal({
  schedule,
  onSave,
  onClose,
  clients,
}: {
  schedule: ScheduledTask | null
  onSave: (s: ScheduledTask) => void
  onClose: () => void
  clients: { id: string; name: string }[]
}) {
  const [form, setForm] = useState<Partial<ScheduledTask>>(
    schedule || {
      name: '',
      description: '',
      taskType: 'content-calendar',
      pipelineId: null,
      clientId: null,
      frequency: 'weekly',
      dayOfWeek: 1, // Monday
      timeHour: 9,
      timeMinute: 0,
      status: 'active',
    }
  )

  const handleSave = () => {
    if (!form.name?.trim()) return
    const now = new Date().toISOString()
    onSave({
      id: schedule?.id || uuidv4(),
      name: form.name || '',
      description: form.description || '',
      taskType: form.taskType || 'content-calendar',
      pipelineId: form.pipelineId || null,
      clientId: form.clientId || null,
      frequency: form.frequency || 'weekly',
      dayOfWeek: form.dayOfWeek,
      dayOfMonth: form.dayOfMonth,
      timeHour: form.timeHour ?? 9,
      timeMinute: form.timeMinute ?? 0,
      status: form.status || 'active',
      lastRunAt: schedule?.lastRunAt || null,
      nextRunAt: computeNextRun(form),
      createdAt: schedule?.createdAt || now,
      runCount: schedule?.runCount || 0,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/55 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-panel)] rounded-2xl w-full max-w-xl border border-[var(--border)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            {schedule ? 'Edit Schedule' : 'New Scheduled Task'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-dim)]">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              autoFocus
              type="text"
              value={form.name || ''}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full rounded-[14px] border border-[var(--border)] bg-white/70 px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-dim)] focus:border-[var(--accent-blue)] focus:outline-none"
              placeholder="e.g., Weekly Content Calendar for TechStart"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Description</label>
            <textarea
              value={form.description || ''}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={2}
              className="w-full rounded-[14px] border border-[var(--border)] bg-white/70 px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-dim)] focus:border-[var(--accent-blue)] focus:outline-none resize-none"
              placeholder="What should this automation do?"
            />
          </div>

          {/* Task type + Client */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Task Type</label>
              <div className="relative">
                <select
                  value={form.taskType || 'content-calendar'}
                  onChange={(e) => setForm((p) => ({ ...p, taskType: e.target.value }))}
                  className="w-full rounded-[14px] border border-[var(--border)] bg-white/70 px-4 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-blue)] focus:outline-none appearance-none pr-8"
                >
                  {TASK_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)] pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Client (optional)</label>
              <div className="relative">
                <select
                  value={form.clientId || ''}
                  onChange={(e) => setForm((p) => ({ ...p, clientId: e.target.value || null }))}
                  className="w-full rounded-[14px] border border-[var(--border)] bg-white/70 px-4 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-blue)] focus:outline-none appearance-none pr-8"
                >
                  <option value="">All clients / General</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)] pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Frequency</label>
            <div className="flex gap-2 flex-wrap">
              {(['once', 'daily', 'weekly', 'monthly'] as ScheduleFrequency[]).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, frequency: f }))}
                  className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${
                    form.frequency === f
                      ? 'bg-[var(--accent-blue)]/14 text-[var(--accent-blue)] border border-[var(--accent-blue)]/35'
                      : 'bg-white/60 text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--border-glow)]'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Weekly — day of week */}
          {form.frequency === 'weekly' && (
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Day of Week</label>
              <div className="flex gap-2">
                {DAYS_OF_WEEK.map((day, i) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, dayOfWeek: i }))}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                      form.dayOfWeek === i
                        ? 'bg-[var(--accent-purple)]/14 text-[var(--accent-purple)] border border-[var(--accent-purple)]/35'
                        : 'bg-white/60 text-[var(--text-secondary)] border border-[var(--border)]'
                    }`}
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
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Day of Month</label>
              <input
                type="number"
                min={1}
                max={28}
                value={form.dayOfMonth || 1}
                onChange={(e) => setForm((p) => ({ ...p, dayOfMonth: parseInt(e.target.value) || 1 }))}
                className="w-24 rounded-[14px] border border-[var(--border)] bg-white/70 px-4 py-2.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent-blue)] focus:outline-none"
              />
            </div>
          )}

          {/* Time */}
          {form.frequency !== 'once' && (
            <div>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-1">Run Time</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={form.timeHour ?? 9}
                  onChange={(e) => setForm((p) => ({ ...p, timeHour: parseInt(e.target.value) || 0 }))}
                  className="w-20 rounded-[14px] border border-[var(--border)] bg-white/70 px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-blue)] focus:outline-none text-center"
                />
                <span className="text-[var(--text-dim)] font-bold">:</span>
                <input
                  type="number"
                  min={0}
                  max={59}
                  step={15}
                  value={form.timeMinute ?? 0}
                  onChange={(e) => setForm((p) => ({ ...p, timeMinute: parseInt(e.target.value) || 0 }))}
                  className="w-20 rounded-[14px] border border-[var(--border)] bg-white/70 px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--accent-blue)] focus:outline-none text-center"
                />
                <span className="text-xs text-[var(--text-dim)]">24h format</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[var(--border)] flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[var(--text-dim)] hover:text-[var(--text-primary)]">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!form.name?.trim()}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #4f8ef7, #2dd4bf)' }}
          >
            <Save size={15} />
            {schedule ? 'Update Schedule' : 'Create Schedule'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

const STORAGE_KEY = 'mc_scheduled_tasks'

function loadSchedules(): ScheduledTask[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function saveSchedules(tasks: ScheduledTask[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
}

export default function SchedulesPage() {
  const clients = useAgentsStore((state) => state.clients)
  const [schedules, setSchedules] = useState<ScheduledTask[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<ScheduledTask | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => {
    setSchedules(loadSchedules())
  }, [])

  const upsertSchedule = (s: ScheduledTask) => {
    setSchedules((prev) => {
      const next = prev.some((p) => p.id === s.id)
        ? prev.map((p) => (p.id === s.id ? s : p))
        : [...prev, s]
      saveSchedules(next)
      return next
    })
    setModalOpen(false)
    setEditingSchedule(null)
  }

  const deleteSchedule = (id: string) => {
    setSchedules((prev) => {
      const next = prev.filter((s) => s.id !== id)
      saveSchedules(next)
      return next
    })
    setConfirmDeleteId(null)
  }

  const toggleStatus = (id: string) => {
    setSchedules((prev) => {
      const next = prev.map((s) =>
        s.id === id ? { ...s, status: s.status === 'active' ? ('paused' as ScheduleStatus) : ('active' as ScheduleStatus) } : s
      )
      saveSchedules(next)
      return next
    })
  }

  const runNow = (s: ScheduledTask) => {
    // In a real app this would call the pipeline/task execution API
    setSchedules((prev) => {
      const next = prev.map((p) =>
        p.id === s.id ? { ...p, lastRunAt: new Date().toISOString(), runCount: p.runCount + 1 } : p
      )
      saveSchedules(next)
      return next
    })
    alert(`▶ Triggered: "${s.name}"\n\nIn production this would fire the "${s.taskType}" pipeline.`)
  }

  const activeCount = schedules.filter((s) => s.status === 'active').length
  const totalRuns = schedules.reduce((acc, s) => acc + (s.runCount || 0), 0)

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
                Create and manage automated recurring tasks — content calendars, reports, audits, and more.
              </p>
            </div>
            <button
              onClick={() => { setEditingSchedule(null); setModalOpen(true) }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-[0_8px_18px_rgba(79,142,247,0.24)] hover:shadow-[0_12px_24px_rgba(79,142,247,0.32)] transition-all"
              style={{ background: 'linear-gradient(135deg, #4f8ef7, #2dd4bf)' }}
            >
              <Plus size={16} />
              New Schedule
            </button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Active Schedules', value: activeCount, color: '#2dd4bf', icon: <Zap size={16} /> },
              { label: 'Total Schedules', value: schedules.length, color: '#9b6dff', icon: <Calendar size={16} /> },
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

          {/* Schedule list */}
          {schedules.length === 0 ? (
            <div className="mission-panel p-12 text-center">
              <Calendar size={40} className="text-[var(--text-dim)] mx-auto mb-4" />
              <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">No schedules yet</h2>
              <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-sm mx-auto">
                Create your first scheduled task to automate recurring work — content calendars, reports, audits, and more.
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
              {schedules.map((s) => {
                const statusCfg = STATUS_CONFIG[s.status]
                const clientName = clients.find((c) => c.id === s.clientId)?.name
                const taskLabel = TASK_TYPES.find((t) => t.value === s.taskType)?.label || s.taskType
                return (
                  <div
                    key={s.id}
                    className="bg-white/72 border border-[var(--border)] rounded-2xl p-5 hover:border-[var(--border-glow)] hover:shadow-[0_8px_24px_rgba(45,78,135,0.08)] transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 min-w-0">
                        {/* Status dot */}
                        <div
                          className="w-10 h-10 rounded-[14px] flex items-center justify-center flex-shrink-0 mt-0.5"
                          style={{ background: statusCfg.bg }}
                        >
                          {s.status === 'active' ? (
                            <Zap size={18} style={{ color: statusCfg.color }} />
                          ) : s.status === 'failed' ? (
                            <AlertCircle size={18} style={{ color: statusCfg.color }} />
                          ) : s.status === 'completed' ? (
                            <CheckCircle size={18} style={{ color: statusCfg.color }} />
                          ) : (
                            <Pause size={18} style={{ color: statusCfg.color }} />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-[var(--text-primary)]">{s.name}</p>
                            <span
                              className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full"
                              style={{ background: statusCfg.bg, color: statusCfg.color }}
                            >
                              {statusCfg.label}
                            </span>
                          </div>
                          {s.description && (
                            <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-1">{s.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-2 flex-wrap">
                            <span className="text-[11px] text-[var(--text-dim)]">{taskLabel}</span>
                            {clientName && (
                              <span className="text-[11px] text-[var(--accent-blue)]">· {clientName}</span>
                            )}
                            <span className="text-[11px] text-[var(--text-dim)] capitalize">
                              · {s.frequency === 'weekly' && s.dayOfWeek !== undefined
                                ? `Every ${DAYS_OF_WEEK[s.dayOfWeek]}`
                                : s.frequency}
                              {s.frequency !== 'once' ? ` at ${String(s.timeHour).padStart(2, '0')}:${String(s.timeMinute).padStart(2, '0')}` : ''}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-right mr-3 hidden sm:block">
                          <p className="text-[10px] text-[var(--text-dim)] uppercase tracking-wider">Next run</p>
                          <p className="text-xs font-medium text-[var(--text-secondary)]">
                            <Clock size={10} className="inline mr-1" />
                            {formatNextRun(s.nextRunAt)}
                          </p>
                          <p className="text-[10px] text-[var(--text-dim)] mt-0.5">Last: {formatLastRun(s.lastRunAt)} · {s.runCount} runs</p>
                        </div>
                        <button
                          onClick={() => runNow(s)}
                          className="p-2 rounded-xl border border-[var(--border)] hover:border-[#2dd4bf] hover:text-[#2dd4bf] text-[var(--text-dim)] transition-all"
                          title="Run now"
                        >
                          <Play size={14} />
                        </button>
                        <button
                          onClick={() => toggleStatus(s.id)}
                          className={`p-2 rounded-xl border transition-all ${
                            s.status === 'active'
                              ? 'border-[#fbbf24]/40 text-[#fbbf24] hover:bg-[#fbbf24]/10'
                              : 'border-[var(--border)] text-[var(--text-dim)] hover:border-[#2dd4bf] hover:text-[#2dd4bf]'
                          }`}
                          title={s.status === 'active' ? 'Pause' : 'Resume'}
                        >
                          {s.status === 'active' ? <Pause size={14} /> : <Play size={14} />}
                        </button>
                        <button
                          onClick={() => { setEditingSchedule(s); setModalOpen(true) }}
                          className="p-2 rounded-xl border border-[var(--border)] hover:border-[var(--accent-blue)] hover:text-[var(--accent-blue)] text-[var(--text-dim)] transition-all"
                          title="Edit"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(s.id)}
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

          {/* Best practices info */}
          <div className="bg-white/60 border border-[var(--border)] rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
              <Zap size={14} className="text-[#22d3ee]" />
              Automation Tips
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-[var(--text-secondary)]">
              <div>
                <p className="font-semibold text-[var(--text-primary)] mb-1">Content Calendars</p>
                <p>Schedule weekly on Mondays at 09:00 to have next week's plan ready before the week starts.</p>
              </div>
              <div>
                <p className="font-semibold text-[var(--text-primary)] mb-1">Performance Reports</p>
                <p>Run monthly on the 1st to get a full previous-month overview when you start fresh each month.</p>
              </div>
              <div>
                <p className="font-semibold text-[var(--text-primary)] mb-1">SEO Audits</p>
                <p>Schedule bi-weekly (every 2 weeks via weekly × 2) to catch regressions before they impact rankings.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create / Edit modal */}
      {modalOpen && (
        <ScheduleModal
          schedule={editingSchedule}
          onSave={upsertSchedule}
          onClose={() => { setModalOpen(false); setEditingSchedule(null) }}
          clients={clients}
        />
      )}

      {/* Delete confirm */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/55 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-panel)] rounded-2xl p-6 max-w-sm w-full border border-[var(--border)] shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/12 flex items-center justify-center mx-auto mb-4">
              <Trash2 size={22} className="text-red-400" />
            </div>
            <h3 className="text-base font-bold text-[var(--text-primary)] mb-2">Delete schedule?</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-6">This cannot be undone.</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="px-5 py-2 rounded-xl text-sm border border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--text-primary)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteSchedule(confirmDeleteId)}
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
