'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Shield, Users, RefreshCcw, CheckCircle2, UserPlus, UserCog } from 'lucide-react'

import { ClientShell } from '@/components/ClientShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAgentsStore } from '@/lib/agents-store'
import { getSupabaseAccessToken } from '@/lib/supabase/browser'
import { toast } from '@/components/ui/Toast'

interface AdminUser {
  id: string
  email: string
  fullName: string
  role: 'super_admin' | 'member'
  isActive: boolean
  confirmed: boolean
  createdAt: string
  lastSignInAt?: string | null
}

interface CreateUserFormState {
  mode: 'create' | 'invite'
  email: string
  fullName: string
  password: string
  role: 'super_admin' | 'member'
}

export default function UsersPage() {
  const currentUser = useAgentsStore((state) => state.currentUser)
  const clients = useAgentsStore((state) => state.clients)
  const missions = useAgentsStore((state) => state.missions)
  const artifacts = useAgentsStore((state) => state.artifacts)
  const conversations = useAgentsStore((state) => state.conversations)
  const hydrateAppState = useAgentsStore((state) => state.hydrateAppState)

  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [createUserForm, setCreateUserForm] = useState<CreateUserFormState>({
    mode: 'create',
    email: '',
    fullName: '',
    password: '',
    role: 'member',
  })

  const memberUsers = useMemo(() => users.filter((user) => user.isActive), [users])
  const ownershipCounts = useMemo(
    () =>
      users.reduce<Record<string, { clients: number; tasks: number }>>((acc, user) => {
        acc[user.id] = {
          clients: clients.filter((client) => client.ownerUserId === user.id).length,
          tasks: missions.filter((mission) => mission.ownerUserId === user.id).length,
        }
        return acc
      }, {}),
    [clients, missions, users]
  )

  const loadAdminData = async () => {
    setLoading(true)
    try {
      const token = await getSupabaseAccessToken()
      const response = await fetch('/api/admin/users', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!response.ok) throw new Error('Unable to load users')
      const payload = await response.json()
      setUsers(Array.isArray(payload.users) ? payload.users : [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAdminData()
  }, [])

  const reloadSharedState = async () => {
    const token = await getSupabaseAccessToken()
    const response = await fetch('/api/state', {
      cache: 'no-store',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!response.ok) throw new Error('Unable to refresh shared state')
    const payload = await response.json()
    if (payload?.state) hydrateAppState(payload.state)
  }

  const handleBackfill = async () => {
    setSavingKey('backfill')
    try {
      const token = await getSupabaseAccessToken()
      const response = await fetch('/api/admin/backfill-ownership', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Unable to backfill ownership')
      await reloadSharedState()
      toast.success(
        `Backfilled ${payload.counts.clients} clients, ${payload.counts.tasks} tasks, ${payload.counts.outputs} outputs, and ${payload.counts.conversations} conversations.`
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to backfill ownership')
    } finally {
      setSavingKey(null)
    }
  }

  const handleAssign = async (entityType: 'client' | 'task', entityId: string, ownerUserId: string | null) => {
    const opKey = `${entityType}:${entityId}`
    setSavingKey(opKey)
    try {
      const token = await getSupabaseAccessToken()
      const response = await fetch('/api/admin/assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ entityType, entityId, ownerUserId }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Unable to save assignment')
      await reloadSharedState()
      toast.success('Assignment updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to save assignment')
    } finally {
      setSavingKey(null)
    }
  }

  const handleCreateUser = async () => {
    const email = createUserForm.email.trim().toLowerCase()
    if (!email) {
      toast.error('Email is required')
      return
    }

    if (createUserForm.mode === 'create' && !createUserForm.password.trim()) {
      toast.error('Password is required for direct account creation')
      return
    }

    setSavingKey('create-user')
    try {
      const token = await getSupabaseAccessToken()
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          mode: createUserForm.mode,
          email,
          fullName: createUserForm.fullName.trim(),
          password: createUserForm.password,
          role: createUserForm.role,
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Unable to create user')

      setCreateUserForm({
        mode: 'create',
        email: '',
        fullName: '',
        password: '',
        role: 'member',
      })
      await loadAdminData()
      toast.success(
        createUserForm.mode === 'invite'
          ? `Invitation sent to ${payload.user.email}`
          : `User created for ${payload.user.email}${payload.temporaryPassword ? ` · temporary password: ${payload.temporaryPassword}` : ''}`
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to create user')
    } finally {
      setSavingKey(null)
    }
  }

  const handleUserUpdate = async (
    userId: string,
    patch: { role?: 'super_admin' | 'member'; isActive?: boolean }
  ) => {
    const opKey = `user:${userId}`
    setSavingKey(opKey)
    try {
      const token = await getSupabaseAccessToken()
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ userId, ...patch }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Unable to update user')
      await loadAdminData()
      toast.success('User updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update user')
    } finally {
      setSavingKey(null)
    }
  }

  return (
    <ClientShell>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h1 className="text-xl font-heading font-bold text-text-primary flex items-center gap-2">
              <Shield size={20} className="text-accent-purple" />
              Users & Ownership
            </h1>
            <p className="text-xs text-text-secondary mt-0.5">
              Admin control for members, client ownership, and task assignment.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={loadAdminData}>
              <RefreshCcw size={14} />
              Refresh
            </Button>
            <Button variant="primary" size="sm" disabled={savingKey === 'backfill'} onClick={handleBackfill}>
              <CheckCircle2 size={14} />
              {savingKey === 'backfill' ? 'Backfilling…' : 'Backfill Legacy Ownership'}
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card>
                <p className="text-[11px] font-mono uppercase text-text-dim">Current Admin</p>
                <p className="mt-2 text-sm font-semibold text-text-primary">{currentUser?.email || 'Unknown'}</p>
                <p className="text-xs text-text-secondary mt-1">{currentUser?.role || 'Not loaded'}</p>
              </Card>
              <Card>
                <p className="text-[11px] font-mono uppercase text-text-dim">Active Users</p>
                <p className="mt-2 text-2xl font-heading font-bold text-text-primary">{memberUsers.length}</p>
              </Card>
              <Card>
                <p className="text-[11px] font-mono uppercase text-text-dim">Ownership Coverage</p>
                <p className="mt-2 text-sm text-text-primary">
                  {clients.filter((item) => item.ownerUserId).length}/{clients.length} clients · {missions.filter((item) => item.ownerUserId).length}/{missions.length} tasks
                </p>
              </Card>
            </div>

            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Users size={16} className="text-accent-blue" />
                <h2 className="text-sm font-heading font-semibold text-text-primary">Workspace Users</h2>
              </div>
              <div className="mb-5 rounded-2xl border border-border bg-base/40 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <UserPlus size={16} className="text-accent-purple" />
                  <h3 className="text-sm font-semibold text-text-primary">Create or Invite User</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
                  <select
                    value={createUserForm.mode}
                    onChange={(event) =>
                      setCreateUserForm((current) => ({
                        ...current,
                        mode: event.target.value === 'invite' ? 'invite' : 'create',
                      }))
                    }
                    className="rounded-lg border border-border bg-base px-3 py-2 text-sm text-text-primary"
                  >
                    <option value="create">Create directly</option>
                    <option value="invite">Invite by email</option>
                  </select>
                  <input
                    value={createUserForm.fullName}
                    onChange={(event) =>
                      setCreateUserForm((current) => ({ ...current, fullName: event.target.value }))
                    }
                    placeholder="Full name"
                    className="rounded-lg border border-border bg-base px-3 py-2 text-sm text-text-primary"
                  />
                  <input
                    value={createUserForm.email}
                    onChange={(event) =>
                      setCreateUserForm((current) => ({ ...current, email: event.target.value }))
                    }
                    placeholder="email@company.com"
                    className="rounded-lg border border-border bg-base px-3 py-2 text-sm text-text-primary"
                  />
                  <select
                    value={createUserForm.role}
                    onChange={(event) =>
                      setCreateUserForm((current) => ({
                        ...current,
                        role: event.target.value === 'super_admin' ? 'super_admin' : 'member',
                      }))
                    }
                    className="rounded-lg border border-border bg-base px-3 py-2 text-sm text-text-primary"
                  >
                    <option value="member">Member</option>
                    <option value="super_admin">Super admin</option>
                  </select>
                  {createUserForm.mode === 'create' ? (
                    <input
                      value={createUserForm.password}
                      onChange={(event) =>
                        setCreateUserForm((current) => ({ ...current, password: event.target.value }))
                      }
                      placeholder="Temporary password"
                      className="rounded-lg border border-border bg-base px-3 py-2 text-sm text-text-primary"
                    />
                  ) : (
                    <div className="rounded-lg border border-dashed border-border bg-base/40 px-3 py-2 text-xs text-text-secondary flex items-center">
                      Supabase email invite will be used
                    </div>
                  )}
                </div>
                <div className="mt-4 flex justify-end">
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={savingKey === 'create-user'}
                    onClick={handleCreateUser}
                  >
                    <UserPlus size={14} />
                    {savingKey === 'create-user'
                      ? createUserForm.mode === 'invite'
                        ? 'Sending…'
                        : 'Creating…'
                      : createUserForm.mode === 'invite'
                        ? 'Send Invite'
                        : 'Create User'}
                  </Button>
                </div>
              </div>
              {loading ? (
                <p className="text-sm text-text-secondary">Loading users…</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {users.map((user) => (
                    <div key={user.id} className="rounded-xl border border-border bg-base/40 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-text-primary">{user.fullName || user.email}</p>
                          <p className="text-xs text-text-secondary">{user.email}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={user.role}
                            onChange={(event) =>
                              handleUserUpdate(user.id, {
                                role: event.target.value === 'super_admin' ? 'super_admin' : 'member',
                              })
                            }
                            className="rounded-lg border border-border bg-base px-2 py-1.5 text-xs text-text-primary"
                            disabled={savingKey === `user:${user.id}`}
                          >
                            <option value="member">member</option>
                            <option value="super_admin">super_admin</option>
                          </select>
                          <Button
                            variant={user.isActive ? 'secondary' : 'danger'}
                            size="sm"
                            disabled={savingKey === `user:${user.id}`}
                            onClick={() => handleUserUpdate(user.id, { isActive: !user.isActive })}
                          >
                            <UserCog size={12} />
                            {user.isActive ? 'Active' : 'Suspended'}
                          </Button>
                        </div>
                      </div>
                      <p className="text-[11px] text-text-dim mt-3">
                        {user.confirmed ? 'Confirmed' : 'Pending confirmation'} · Last sign-in {user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleString() : 'never'}
                      </p>
                      <p className="text-[11px] text-text-secondary mt-2">
                        {ownershipCounts[user.id]?.clients || 0} clients · {ownershipCounts[user.id]?.tasks || 0} tasks
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <Card>
                <h2 className="text-sm font-heading font-semibold text-text-primary mb-4">Client Ownership</h2>
                <div className="space-y-3">
                  {clients.map((client) => (
                    <div key={client.id} className="rounded-xl border border-border bg-base/40 p-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{client.name}</p>
                        <p className="text-xs text-text-secondary">{client.industry}</p>
                      </div>
                      <select
                        value={client.ownerUserId || ''}
                        onChange={(event) => handleAssign('client', client.id, event.target.value || null)}
                        className="rounded-lg border border-border bg-base px-3 py-2 text-sm text-text-primary min-w-[220px]"
                        disabled={savingKey === `client:${client.id}`}
                      >
                        <option value="">Unassigned</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.email}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <h2 className="text-sm font-heading font-semibold text-text-primary mb-4">Task Ownership</h2>
                <div className="space-y-3 max-h-[720px] overflow-y-auto pr-1">
                  {missions.map((mission) => (
                    <div key={mission.id} className="rounded-xl border border-border bg-base/40 p-4 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-text-primary truncate">{mission.title}</p>
                        <p className="text-xs text-text-secondary">{mission.status} · {mission.progress}%</p>
                      </div>
                      <select
                        value={mission.ownerUserId || ''}
                        onChange={(event) => handleAssign('task', mission.id, event.target.value || null)}
                        className="rounded-lg border border-border bg-base px-3 py-2 text-sm text-text-primary min-w-[220px]"
                        disabled={savingKey === `task:${mission.id}`}
                      >
                        <option value="">Unassigned</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.email}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            <Card>
              <p className="text-xs text-text-secondary">
                Current shared data: {artifacts.length} outputs and {conversations.length} conversations are already scoped in the backend. Client/task assignment cascades ownership to related outputs and conversations.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </ClientShell>
  )
}
