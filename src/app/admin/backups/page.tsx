'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { ClientShell } from '@/components/ClientShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { toast } from '@/components/ui/Toast'
import { getAuthToken } from '@/lib/auth/browser'
import {
  Database, Download, Trash2, RefreshCcw, Plus, Loader2,
  Shield, HardDrive, FileArchive, Clock, CheckCircle2, AlertTriangle,
} from 'lucide-react'

interface BackupFile {
  filename: string
  size: number
  createdAt: string
}

interface BackupResult {
  filename: string
  size: number
  tables: Record<string, number>
  totalRows: number
  uploadedFiles: number
  createdAt: string
}

function fmtBytes(b: number) {
  if (b >= 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`
  if (b >= 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${b} B`
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function BackupsPage() {
  const [backups, setBackups] = useState<BackupFile[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [lastResult, setLastResult] = useState<BackupResult | null>(null)
  const [deletingFile, setDeletingFile] = useState<string | null>(null)

  const loadBackups = useCallback(async () => {
    setLoading(true)
    try {
      const token = await getAuthToken()
      const res = await fetch('/api/admin/backup', {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load backups')
      setBackups(data.backups || [])
    } catch (err: any) {
      toast.error(err.message || 'Failed to load backups')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadBackups() }, [loadBackups])

  async function handleCreate() {
    setCreating(true)
    setLastResult(null)
    try {
      const token = await getAuthToken()
      const res = await fetch('/api/admin/backup', {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Backup failed')
      setLastResult(data)
      toast.success(`Backup created — ${fmtBytes(data.size)}`)
      loadBackups()
    } catch (err: any) {
      toast.error(err.message || 'Backup failed')
    } finally {
      setCreating(false)
    }
  }

  async function handleDownload(filename: string) {
    const token = await getAuthToken()
    const url = `/api/admin/backup/download/${encodeURIComponent(filename)}`
    const res = await fetch(url, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
    if (!res.ok) { toast.error('Download failed'); return }
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function handleDelete(filename: string) {
    if (!confirm(`Delete backup ${filename}? This cannot be undone.`)) return
    setDeletingFile(filename)
    try {
      const token = await getAuthToken()
      const res = await fetch(`/api/admin/backup/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Delete failed')
      toast.success('Backup deleted')
      setBackups(prev => prev.filter(b => b.filename !== filename))
    } catch (err: any) {
      toast.error(err.message || 'Delete failed')
    } finally {
      setDeletingFile(null)
    }
  }

  const totalSize = backups.reduce((s, b) => s + b.size, 0)

  return (
    <ClientShell>
      <div style={{ padding: '24px 32px', maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: '#3b82f620', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Database size={20} style={{ color: '#3b82f6' }} />
            </div>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>System Backups</h1>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                Full DB dump + uploaded files — super-admin only
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="secondary" onClick={loadBackups} disabled={loading}>
              <RefreshCcw size={13} className={loading ? 'animate-spin' : ''} />
              Refresh
            </Button>
            <Button variant="primary" onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
              {creating ? 'Creating backup…' : 'Create Backup'}
            </Button>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { icon: FileArchive, label: 'Total backups', value: String(backups.length), color: '#9b6dff' },
            { icon: HardDrive, label: 'Total size', value: fmtBytes(totalSize), color: '#3b82f6' },
            { icon: Clock, label: 'Latest backup', value: backups[0] ? fmtDate(backups[0].createdAt) : 'None yet', color: '#22d3ee' },
          ].map(({ icon: Icon, label, value, color }) => (
            <Card key={label} style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Icon size={14} style={{ color }} />
                <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{label}</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
            </Card>
          ))}
        </div>

        {/* Last backup result */}
        {lastResult && (
          <Card style={{ padding: 16, marginBottom: 20, borderColor: '#22d3ee40' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <CheckCircle2 size={15} style={{ color: '#22d3ee' }} />
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                Backup created — {fmtBytes(lastResult.size)}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{lastResult.filename}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <Badge color="#22d3ee">{lastResult.totalRows.toLocaleString()} DB rows</Badge>
              <Badge color="#9b6dff">{lastResult.uploadedFiles} files</Badge>
              {Object.entries(lastResult.tables).filter(([, c]) => c > 0).map(([t, c]) => (
                <Badge key={t} color="#6b7280">{t}: {c}</Badge>
              ))}
            </div>
          </Card>
        )}

        {/* Security notice */}
        <Card style={{ padding: 14, marginBottom: 20, background: '#f59e0b10', borderColor: '#f59e0b30' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <Shield size={14} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--text-primary)' }}>Backup security:</strong>{' '}
              Backups contain all database records including client data, credentials, and uploaded files.
              Store downloaded archives securely — they are unencrypted. Backups are only accessible to the super-admin account.
              Consider downloading and moving backups off-server to separate secure storage regularly.
            </div>
          </div>
        </Card>

        {/* Backup list */}
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Archive Files</h2>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Stored in /backups on server</span>
          </div>

          {loading ? (
            <div style={{ padding: 40, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-secondary)' }}>
              <Loader2 size={16} className="animate-spin" />
              <span style={{ fontSize: 13 }}>Loading…</span>
            </div>
          ) : backups.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <FileArchive size={32} style={{ color: 'var(--text-dim)', margin: '0 auto 12px' }} />
              <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>No backups yet. Click <strong>Create Backup</strong> to generate the first one.</p>
            </div>
          ) : (
            <div>
              {backups.map((backup, i) => (
                <div
                  key={backup.filename}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 18px', borderBottom: i < backups.length - 1 ? '1px solid var(--border-subtle)' : undefined,
                    flexWrap: 'wrap', gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <FileArchive size={14} style={{ color: '#3b82f6', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                        {backup.filename}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                        {fmtDate(backup.createdAt)} · {fmtBytes(backup.size)}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button variant="secondary" onClick={() => handleDownload(backup.filename)}>
                      <Download size={12} />
                      Download
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => handleDelete(backup.filename)}
                      disabled={deletingFile === backup.filename}
                      style={{ color: '#ef4444', borderColor: '#ef444440' }}
                    >
                      {deletingFile === backup.filename
                        ? <Loader2 size={12} className="animate-spin" />
                        : <Trash2 size={12} />}
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </ClientShell>
  )
}
