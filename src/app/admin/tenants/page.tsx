'use client'

import React, { useEffect, useState } from 'react'
import { ClientShell } from '@/components/ClientShell'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from '@/components/ui/Toast'
import { getSupabaseAccessToken } from '@/lib/auth/browser'
import { useAgentsStore } from '@/lib/agents-store'
import {
  Building2,
  Users,
  Bot,
  CreditCard,
  Plus,
  RefreshCcw,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react'

type Tenant = {
  id: string
  slug: string
  name: string
  plan_id: string
  is_active: boolean
  created_at: string
  owner_email: string | null
  subscription_status: string
  agent_limit: number
  current_agent_count: number
  agent_count: number
  member_count: number
  stripe_customer_id: string | null
}

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-slate-500/20 text-slate-300',
  starter: 'bg-blue-500/20 text-blue-300',
  growth: 'bg-violet-500/20 text-violet-300',
  enterprise: 'bg-amber-500/20 text-amber-300',
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500/20 text-emerald-300',
  trialing: 'bg-sky-500/20 text-sky-300',
  past_due: 'bg-red-500/20 text-red-300',
  canceled: 'bg-slate-500/20 text-slate-400',
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: React.ElementType }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-white/60" />
      </div>
      <div>
        <p className="text-xs text-white/40 uppercase tracking-wide">{label}</p>
        <p className="text-xl font-semibold text-white">{value}</p>
      </div>
    </div>
  )
}

export default function AdminTenantsPage() {
  const { role } = useAgentsStore((s) => ({ role: s.providerSettings?.routing }))
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [provisioning, setProvisioning] = useState(false)
  const [form, setForm] = useState({ ownerEmail: '', companyName: '', planId: 'free' })
  const [showForm, setShowForm] = useState(false)

  const fetchTenants = async () => {
    setLoading(true)
    try {
      const token = await getSupabaseAccessToken()
      const res = await fetch('/api/admin/tenants', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Forbidden')
      const data = await res.json()
      setTenants(data.tenants || [])
    } catch {
      toast.error('Failed to load tenants — super admin access required')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTenants() }, [])

  const handleProvision = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.ownerEmail || !form.companyName) return
    setProvisioning(true)
    try {
      const token = await getSupabaseAccessToken()
      const res = await fetch('/api/admin/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast.success(`Tenant created: ${data.tenantId}`)
      setForm({ ownerEmail: '', companyName: '', planId: 'free' })
      setShowForm(false)
      fetchTenants()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setProvisioning(false)
    }
  }

  const totalAgents = tenants.reduce((s, t) => s + (t.agent_count || 0), 0)
  const totalMembers = tenants.reduce((s, t) => s + (t.member_count || 0), 0)
  const activeCount = tenants.filter((t) => t.subscription_status === 'active').length

  return (
    <ClientShell>
      <div className="min-h-screen bg-[#0a0a0f] px-6 py-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Tenant Management</h1>
              <p className="text-sm text-white/40">Super Admin · All tenants across the platform</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={fetchTenants} disabled={loading}>
              <RefreshCcw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setShowForm(!showForm)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Provision Tenant
            </Button>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard label="Total Tenants" value={tenants.length} icon={Building2} />
          <StatCard label="Active Subscriptions" value={activeCount} icon={TrendingUp} />
          <StatCard label="Total Agents" value={totalAgents} icon={Bot} />
          <StatCard label="Total Members" value={totalMembers} icon={Users} />
        </div>

        {/* Provision form */}
        {showForm && (
          <Card className="mb-6 p-5 bg-white/5 border-white/10">
            <p className="text-sm font-medium text-white mb-4">Manually provision a tenant</p>
            <form onSubmit={handleProvision} className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs text-white/40 block mb-1">Owner Email</label>
                <Input
                  value={form.ownerEmail}
                  onChange={(e) => setForm((f) => ({ ...f, ownerEmail: e.target.value }))}
                  placeholder="client@company.com"
                  type="email"
                  required
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs text-white/40 block mb-1">Company Name</label>
                <Input
                  value={form.companyName}
                  onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                  placeholder="Acme Corp"
                  required
                />
              </div>
              <div className="w-36">
                <label className="text-xs text-white/40 block mb-1">Plan</label>
                <select
                  value={form.planId}
                  onChange={(e) => setForm((f) => ({ ...f, planId: e.target.value }))}
                  className="w-full h-9 rounded-lg bg-white/10 border border-white/10 text-white text-sm px-3 focus:outline-none focus:ring-1 focus:ring-violet-500"
                >
                  <option value="free">Free</option>
                  <option value="starter">Starter</option>
                  <option value="growth">Growth</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <Button type="submit" disabled={provisioning}>
                {provisioning ? 'Creating…' : 'Create Tenant'}
              </Button>
            </form>
          </Card>
        )}

        {/* Tenant table */}
        {loading ? (
          <div className="text-center py-20 text-white/30">Loading tenants…</div>
        ) : tenants.length === 0 ? (
          <div className="text-center py-20 text-white/30">No tenants found</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/40 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3">Tenant</th>
                  <th className="text-left px-4 py-3">Owner</th>
                  <th className="text-left px-4 py-3">Plan</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-center px-4 py-3">Agents</th>
                  <th className="text-center px-4 py-3">Members</th>
                  <th className="text-left px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => (
                  <tr
                    key={tenant.id}
                    className="border-b border-white/5 hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-white">{tenant.name}</p>
                      <p className="text-xs text-white/30 font-mono">{tenant.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-white/60">
                      {tenant.owner_email || <span className="text-white/20">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${PLAN_COLORS[tenant.plan_id] || PLAN_COLORS.free}`}>
                        {tenant.plan_id}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[tenant.subscription_status] || STATUS_COLORS.active}`}>
                        {tenant.subscription_status || 'active'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-white/70">
                      <span className="font-mono">
                        {tenant.agent_count}
                        {tenant.agent_limit !== -1 && (
                          <span className="text-white/30">/{tenant.agent_limit}</span>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-white/70 font-mono">
                      {tenant.member_count}
                    </td>
                    <td className="px-4 py-3 text-white/40 text-xs">
                      {tenant.created_at
                        ? new Date(tenant.created_at).toLocaleDateString('en-GB', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ClientShell>
  )
}
