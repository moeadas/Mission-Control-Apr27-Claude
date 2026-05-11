'use client'

import React, { useEffect, useState } from 'react'
import {
  Users,
  UserPlus,
  RefreshCcw,
  UserCog,
  ShieldCheck,
  Eye,
  EyeOff,
  Copy,
  Check,
  Trash2,
} from 'lucide-react'
import { ClientShell } from '@/components/ClientShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { getStoredToken } from '@/lib/auth/browser'

interface TeamMember {
  id: string
  email: string
  fullName: string
  role: 'super_admin' | 'admin' | 'member'
  isActive: boolean
  createdAt: string
}

interface AddMemberForm {
  email: string
  fullName: string
  password: string
  role: 'admin' | 'member'
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  member: 'Member',
}

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
  admin: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  member: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${ROLE_COLORS[role] || ROLE_COLORS.member}`}
    >
      {ROLE_LABELS[role] || role}
    </span>
  )
}

function PasswordReveal({ password }: { password: string }) {
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(password)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-2 mt-2 rounded-lg bg-white/5 border border-white/10 px-3 py-2">
      <code className="flex-1 text-xs font-mono text-emerald-300">
        {visible ? password : '•'.repeat(password.length)}
      </code>
      <button onClick={() => setVisible((v) => !v)} className="text-white/40 hover:text-white/70 transition-colors">
        {visible ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
      <button onClick={copy} className="text-white/40 hover:text-white/70 transition-colors">
        {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
      </button>
    </div>
  )
}

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [newPassword, setNewPassword] = useState<{ email: string; password: string } | null>(null)
  const [form, setForm] = useState<AddMemberForm>({
    email: '',
    fullName: '',
    password: '',
    role: 'member',
  })

  const authHeaders = (): Record<string, string> => {
    const token = getStoredToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const loadMembers = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/tenant/users', { headers: authHeaders() })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to load team')
      const data = await res.json()
      setMembers(data.users || [])
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadMembers() }, [])

  const handleAddMember = async () => {
    const email = form.email.trim().toLowerCase()
    if (!email) { toast.error('Email is required'); return }

    setSaving('add')
    try {
      const res = await fetch('/api/tenant/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add member')

      setNewPassword(data.temporaryPassword ? { email: data.user.email, password: data.temporaryPassword } : null)
      setForm({ email: '', fullName: '', password: '', role: 'member' })
      setShowForm(false)
      await loadMembers()
      toast.success(data.message || `${data.user.email} added to your workspace`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(null)
    }
  }

  const handleRoleChange = async (userId: string, role: 'admin' | 'member') => {
    setSaving(`role:${userId}`)
    try {
      const res = await fetch('/api/tenant/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ userId, role }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update role')
      await loadMembers()
      toast.success('Role updated')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(null)
    }
  }

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    setSaving(`active:${userId}`)
    try {
      const res = await fetch('/api/tenant/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ userId, isActive }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update status')
      await loadMembers()
      toast.success(isActive ? 'Member activated' : 'Member suspended')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(null)
    }
  }

  const handleRemove = async (userId: string, email: string) => {
    if (!confirm(`Remove ${email} from your workspace?`)) return
    setSaving(`remove:${userId}`)
    try {
      const res = await fetch(`/api/tenant/users?userId=${userId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to remove member')
      await loadMembers()
      toast.success(`${email} removed from workspace`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSaving(null)
    }
  }

  const activeCount = members.filter((m) => m.isActive).length
  const adminCount = members.filter((m) => m.role === 'admin' || m.role === 'super_admin').length

  return (
    <ClientShell>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h1 className="text-xl font-heading font-bold text-text-primary flex items-center gap-2">
              <Users size={20} className="text-accent-blue" />
              Team Management
            </h1>
            <p className="text-xs text-text-secondary mt-0.5">
              Manage workspace members and their roles.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={loadMembers} disabled={loading}>
              <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </Button>
            <Button variant="primary" size="sm" onClick={() => setShowForm((v) => !v)}>
              <UserPlus size={14} />
              Add Member
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl space-y-5">

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="py-3 px-4">
                <p className="text-[11px] font-mono uppercase text-text-dim">Total Members</p>
                <p className="mt-1 text-2xl font-heading font-bold text-text-primary">{members.length}</p>
              </Card>
              <Card className="py-3 px-4">
                <p className="text-[11px] font-mono uppercase text-text-dim">Active</p>
                <p className="mt-1 text-2xl font-heading font-bold text-emerald-400">{activeCount}</p>
              </Card>
              <Card className="py-3 px-4">
                <p className="text-[11px] font-mono uppercase text-text-dim">Admins</p>
                <p className="mt-1 text-2xl font-heading font-bold text-amber-400">{adminCount}</p>
              </Card>
            </div>

            {/* Temp password reveal */}
            {newPassword && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-emerald-300 flex items-center gap-2">
                    <ShieldCheck size={15} />
                    Member added — share these credentials
                  </p>
                  <button
                    onClick={() => setNewPassword(null)}
                    className="text-xs text-emerald-400/60 hover:text-emerald-300 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
                <p className="text-xs text-emerald-200/70 mb-1">
                  <span className="font-mono">{newPassword.email}</span> — temporary password:
                </p>
                <PasswordReveal password={newPassword.password} />
                <p className="text-[11px] text-emerald-400/60 mt-2">
                  They can change their password from Settings after logging in.
                </p>
              </div>
            )}

            {/* Add member form */}
            {showForm && (
              <Card className="border-accent-purple/30">
                <div className="flex items-center gap-2 mb-4">
                  <UserPlus size={15} className="text-accent-purple" />
                  <h2 className="text-sm font-heading font-semibold text-text-primary">Add a Team Member</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="text-[11px] font-mono uppercase text-text-dim block mb-1">Email *</label>
                    <input
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="colleague@company.com"
                      type="email"
                      className="w-full rounded-lg border border-border bg-base px-3 py-2 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:ring-1 focus:ring-accent-purple"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono uppercase text-text-dim block mb-1">Full Name</label>
                    <input
                      value={form.fullName}
                      onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                      placeholder="Jane Smith"
                      className="w-full rounded-lg border border-border bg-base px-3 py-2 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:ring-1 focus:ring-accent-purple"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono uppercase text-text-dim block mb-1">
                      Password <span className="text-text-dim">(auto-generated if blank)</span>
                    </label>
                    <input
                      value={form.password}
                      onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                      placeholder="Leave blank to auto-generate"
                      type="text"
                      className="w-full rounded-lg border border-border bg-base px-3 py-2 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:ring-1 focus:ring-accent-purple"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-mono uppercase text-text-dim block mb-1">Role</label>
                    <select
                      value={form.role}
                      onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as 'admin' | 'member' }))}
                      className="w-full rounded-lg border border-border bg-base px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-purple"
                    >
                      <option value="member">Member — standard access</option>
                      <option value="admin">Admin — can manage team & settings</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={saving === 'add' || !form.email.trim()}
                    onClick={handleAddMember}
                  >
                    <UserPlus size={14} />
                    {saving === 'add' ? 'Adding…' : 'Add Member'}
                  </Button>
                </div>
              </Card>
            )}

            {/* Members list */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-heading font-semibold text-text-primary flex items-center gap-2">
                  <Users size={15} className="text-accent-blue" />
                  Workspace Members
                </h2>
                <span className="text-xs text-text-dim font-mono">{members.length} total</span>
              </div>

              {loading ? (
                <p className="text-sm text-text-secondary py-6 text-center">Loading members…</p>
              ) : members.length === 0 ? (
                <p className="text-sm text-text-secondary py-6 text-center">
                  No team members yet. Add your first member above.
                </p>
              ) : (
                <div className="divide-y divide-border">
                  {members.map((member) => (
                    <div key={member.id} className="flex items-center gap-4 py-3">
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-[14px] bg-gradient-to-br from-accent-blue/20 to-accent-purple/20 border border-border flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-text-secondary uppercase">
                          {(member.fullName || member.email).charAt(0)}
                        </span>
                      </div>

                      {/* Identity */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-text-primary truncate">
                            {member.fullName || member.email}
                          </p>
                          <RoleBadge role={member.role} />
                          {!member.isActive && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border bg-red-500/20 text-red-300 border-red-500/30">
                              Suspended
                            </span>
                          )}
                        </div>
                        {member.fullName && (
                          <p className="text-xs text-text-secondary truncate">{member.email}</p>
                        )}
                        <p className="text-[11px] text-text-dim mt-0.5">
                          Added {new Date(member.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>

                      {/* Controls — don't show for super_admin */}
                      {member.role !== 'super_admin' && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <select
                            value={member.role}
                            onChange={(e) => handleRoleChange(member.id, e.target.value as 'admin' | 'member')}
                            disabled={saving === `role:${member.id}`}
                            className="rounded-lg border border-border bg-base px-2 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-purple"
                          >
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                          </select>

                          <Button
                            variant={member.isActive ? 'secondary' : 'primary'}
                            size="sm"
                            disabled={saving === `active:${member.id}`}
                            onClick={() => handleToggleActive(member.id, !member.isActive)}
                          >
                            <UserCog size={12} />
                            {member.isActive ? 'Suspend' : 'Activate'}
                          </Button>

                          <button
                            onClick={() => handleRemove(member.id, member.email)}
                            disabled={!!saving}
                            className="p-1.5 rounded-lg text-text-dim hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                            title="Remove from workspace"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </ClientShell>
  )
}
