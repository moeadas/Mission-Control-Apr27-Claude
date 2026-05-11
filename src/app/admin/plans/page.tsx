'use client'

import React, { useEffect, useState } from 'react'
import {
  CreditCard,
  RefreshCcw,
  Bot,
  Users,
  DollarSign,
  Edit3,
  Check,
  X,
  ShieldCheck,
  Infinity,
} from 'lucide-react'
import { ClientShell } from '@/components/ClientShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { getStoredToken } from '@/lib/auth/browser'

interface Plan {
  id: string
  name: string
  maxAgents: number
  priceMonthlyUsd: number
  stripePriceId: string
  isActive: boolean
  createdAt: string
  subscriberCount: number
}

const PLAN_ICONS: Record<string, string> = {
  free: '🆓',
  starter: '🚀',
  growth: '📈',
  enterprise: '🏢',
}

const PLAN_COLORS: Record<string, { bg: string; border: string; badge: string }> = {
  free:       { bg: 'bg-slate-500/10',   border: 'border-slate-500/20',   badge: 'bg-slate-500/20 text-slate-300' },
  starter:    { bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    badge: 'bg-blue-500/20 text-blue-300' },
  growth:     { bg: 'bg-violet-500/10',  border: 'border-violet-500/20',  badge: 'bg-violet-500/20 text-violet-300' },
  enterprise: { bg: 'bg-amber-500/10',   border: 'border-amber-500/20',   badge: 'bg-amber-500/20 text-amber-300' },
}

function getPlanColor(id: string) {
  return PLAN_COLORS[id] || PLAN_COLORS.starter
}

interface EditingState {
  name: string
  priceMonthlyUsd: string
  maxAgents: string
  stripePriceId: string
  isActive: boolean
}

function PlanCard({
  plan,
  onSave,
  saving,
}: {
  plan: Plan
  onSave: (id: string, updates: Partial<EditingState>) => Promise<void>
  saving: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<EditingState>({
    name: plan.name,
    priceMonthlyUsd: String(plan.priceMonthlyUsd),
    maxAgents: plan.maxAgents === -1 ? '-1' : String(plan.maxAgents),
    stripePriceId: plan.stripePriceId,
    isActive: plan.isActive,
  })

  const color = getPlanColor(plan.id)

  const handleSave = async () => {
    await onSave(plan.id, {
      name: form.name,
      priceMonthlyUsd: form.priceMonthlyUsd,
      maxAgents: form.maxAgents,
      stripePriceId: form.stripePriceId,
      isActive: form.isActive,
    })
    setEditing(false)
  }

  const handleCancel = () => {
    setForm({
      name: plan.name,
      priceMonthlyUsd: String(plan.priceMonthlyUsd),
      maxAgents: plan.maxAgents === -1 ? '-1' : String(plan.maxAgents),
      stripePriceId: plan.stripePriceId,
      isActive: plan.isActive,
    })
    setEditing(false)
  }

  return (
    <div className={`rounded-2xl border p-5 ${color.bg} ${color.border} relative overflow-hidden`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{PLAN_ICONS[plan.id] || '📦'}</span>
          <div>
            {editing ? (
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-sm font-semibold text-white w-32 focus:outline-none focus:ring-1 focus:ring-white/30"
              />
            ) : (
              <h3 className="text-sm font-semibold text-white">{plan.name}</h3>
            )}
            <p className="text-[11px] text-white/40 font-mono mt-0.5">plan_id: {plan.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!plan.isActive && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
              Inactive
            </span>
          )}
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <Edit3 size={14} />
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={handleCancel}
                className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <X size={14} />
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="p-1.5 rounded-lg text-white/40 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
              >
                <Check size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Price */}
      <div className="mb-4">
        {editing ? (
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/50 text-sm">$</span>
              <input
                value={form.priceMonthlyUsd}
                onChange={(e) => setForm((f) => ({ ...f, priceMonthlyUsd: e.target.value }))}
                type="number"
                min="0"
                step="1"
                className="bg-white/10 border border-white/20 rounded-lg pl-6 pr-2 py-1.5 text-lg font-bold text-white w-28 focus:outline-none focus:ring-1 focus:ring-white/30"
              />
            </div>
            <span className="text-white/40 text-sm">/ month</span>
          </div>
        ) : (
          <div className="flex items-end gap-1">
            <span className="text-3xl font-bold text-white">
              ${plan.priceMonthlyUsd === 0 ? '0' : plan.priceMonthlyUsd.toFixed(0)}
            </span>
            <span className="text-white/40 text-sm mb-1">/ month</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl bg-white/5 border border-white/10 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Bot size={12} className="text-white/40" />
            <p className="text-[10px] text-white/40 uppercase tracking-wide font-mono">Agent Limit</p>
          </div>
          {editing ? (
            <div className="flex items-center gap-1">
              <input
                value={form.maxAgents}
                onChange={(e) => setForm((f) => ({ ...f, maxAgents: e.target.value }))}
                type="number"
                min="-1"
                className="bg-white/10 border border-white/20 rounded px-2 py-0.5 text-sm font-semibold text-white w-20 focus:outline-none focus:ring-1 focus:ring-white/30"
              />
              <span className="text-[10px] text-white/30">(-1 = ∞)</span>
            </div>
          ) : (
            <p className="text-lg font-bold text-white flex items-center gap-1">
              {plan.maxAgents === -1 ? <Infinity size={20} /> : plan.maxAgents}
            </p>
          )}
        </div>

        <div className="rounded-xl bg-white/5 border border-white/10 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Users size={12} className="text-white/40" />
            <p className="text-[10px] text-white/40 uppercase tracking-wide font-mono">Subscribers</p>
          </div>
          <p className="text-lg font-bold text-white">{plan.subscriberCount}</p>
        </div>
      </div>

      {/* Stripe Price ID */}
      <div className="mb-4">
        <p className="text-[10px] text-white/40 uppercase tracking-wide font-mono mb-1">Stripe Price ID</p>
        {editing ? (
          <input
            value={form.stripePriceId}
            onChange={(e) => setForm((f) => ({ ...f, stripePriceId: e.target.value }))}
            placeholder="price_xxx (optional)"
            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-xs font-mono text-white placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-white/30"
          />
        ) : (
          <p className="text-xs font-mono text-white/50">
            {plan.stripePriceId || <span className="text-white/20 italic">not configured</span>}
          </p>
        )}
      </div>

      {/* Active toggle */}
      {editing && (
        <label className="flex items-center gap-2 cursor-pointer">
          <div
            onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
            className={`w-9 h-5 rounded-full transition-colors ${form.isActive ? 'bg-emerald-500' : 'bg-white/20'} relative cursor-pointer`}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.isActive ? 'translate-x-4' : 'translate-x-0.5'}`}
            />
          </div>
          <span className="text-xs text-white/60">{form.isActive ? 'Plan active' : 'Plan inactive'}</span>
        </label>
      )}

      {saving && editing && (
        <p className="text-xs text-white/40 mt-2 animate-pulse">Saving…</p>
      )}
    </div>
  )
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  const authHeaders = (): Record<string, string> => {
    const token = getStoredToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const loadPlans = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/plans', { headers: authHeaders() })
      if (!res.ok) throw new Error((await res.json()).error || 'Forbidden')
      const data = await res.json()
      setPlans(data.plans || [])
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadPlans() }, [])

  const handleSave = async (id: string, updates: Partial<EditingState>) => {
    setSaving(id)
    try {
      const payload: Record<string, unknown> = {}
      if (updates.name !== undefined) payload.name = updates.name
      if (updates.priceMonthlyUsd !== undefined) payload.priceMonthlyUsd = parseFloat(updates.priceMonthlyUsd as string)
      if (updates.maxAgents !== undefined) payload.maxAgents = parseInt(updates.maxAgents as string, 10)
      if (updates.stripePriceId !== undefined) payload.stripePriceId = updates.stripePriceId
      if (updates.isActive !== undefined) payload.isActive = updates.isActive

      const res = await fetch('/api/admin/plans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ id, ...payload }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')
      toast.success(`${data.plan.name} plan updated`)
      await loadPlans()
    } catch (err: any) {
      toast.error(err.message)
      throw err
    } finally {
      setSaving(null)
    }
  }

  const totalRevenuePotential = plans.reduce(
    (sum, p) => sum + p.priceMonthlyUsd * p.subscriberCount,
    0
  )
  const totalSubscribers = plans.reduce((sum, p) => sum + p.subscriberCount, 0)

  return (
    <ClientShell>
      <div className="min-h-screen bg-[#0a0a0f] px-6 py-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Subscription Plans</h1>
              <p className="text-sm text-white/40">Super Admin · Edit pricing, limits, and plan details</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={loadPlans} disabled={loading}>
            <RefreshCcw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-white/60" />
            </div>
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-wide">Active Plans</p>
              <p className="text-xl font-semibold text-white">{plans.filter((p) => p.isActive).length}</p>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
              <Users className="w-4 h-4 text-white/60" />
            </div>
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-wide">Total Subscribers</p>
              <p className="text-xl font-semibold text-white">{totalSubscribers}</p>
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
            <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-white/60" />
            </div>
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-wide">MRR Potential</p>
              <p className="text-xl font-semibold text-white">${totalRevenuePotential.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Plans grid */}
        {loading ? (
          <div className="text-center py-20 text-white/30">Loading plans…</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onSave={handleSave}
                saving={saving === plan.id}
              />
            ))}
          </div>
        )}

        <p className="mt-6 text-xs text-white/20 text-center">
          Price changes apply to new subscriptions only. Existing subscribers keep their current rate.
        </p>
      </div>
    </ClientShell>
  )
}
