'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ClientShell } from '@/components/ClientShell'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { toast } from '@/components/ui/Toast'
import { getAuthToken } from '@/lib/auth/browser'
import {
  TrendingUp, TrendingDown, AlertTriangle, Sparkles, RefreshCcw,
  DollarSign, MousePointerClick, Eye, Target, Video, ChevronRight,
  Loader2, Settings, BarChart3, Zap,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdAccount {
  id: string
  name: string
  account_status: number
  currency: string
  timezone_name: string
}

interface CampaignInsight {
  campaign_id: string
  campaign_name: string
  impressions: string
  clicks: string
  spend: string
  cpm: string
  cpc: string
  ctr: string
  reach: string
  conversions?: string
  cost_per_conversion?: string
}

interface AccountSummary {
  impressions: string
  clicks: string
  spend: string
  cpm: string
  cpc: string
  ctr: string
  reach: string
}

interface OptimizationRec {
  priority: 'high' | 'medium' | 'low'
  category: string
  title: string
  detail: string
  estimatedImpact: string
}

interface OptimizationResult {
  summary: string
  recommendations: OptimizationRec[]
  quickWins: string[]
  watchOut: string[]
}

const DATE_PRESETS = [
  { value: 'last_7d', label: 'Last 7 days' },
  { value: 'last_14d', label: 'Last 14 days' },
  { value: 'last_30d', label: 'Last 30 days' },
  { value: 'last_90d', label: 'Last 90 days' },
  { value: 'this_month', label: 'This month' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: string | number | undefined, prefix = '') {
  const v = parseFloat(String(n || 0))
  if (isNaN(v)) return '—'
  if (v >= 1_000_000) return `${prefix}${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${prefix}${(v / 1_000).toFixed(1)}K`
  return `${prefix}${v.toFixed(2)}`
}

function fmtCurrency(n: string | number | undefined, currency = 'USD') {
  const v = parseFloat(String(n || 0))
  if (isNaN(v)) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)
}

function priorityColor(p: string) {
  if (p === 'high') return '#ef4444'
  if (p === 'medium') return '#f59e0b'
  return '#22d3ee'
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>
  label: string
  value: string
  sub?: string
  color: string
}) {
  return (
    <Card style={{ padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} style={{ color }} />
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>{sub}</div>}
    </Card>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdsPage() {
  const [accounts, setAccounts] = useState<AdAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [datePreset, setDatePreset] = useState('last_30d')
  const [insights, setInsights] = useState<CampaignInsight[]>([])
  const [summary, setSummary] = useState<AccountSummary | null>(null)
  const [optimization, setOptimization] = useState<OptimizationResult | null>(null)
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [loadingInsights, setLoadingInsights] = useState(false)
  const [loadingOptimize, setLoadingOptimize] = useState(false)
  const [notConfigured, setNotConfigured] = useState(false)

  // ── Load accounts ────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoadingAccounts(true)
      try {
        const token = await getAuthToken()
        const res = await fetch('/api/integrations/meta/accounts', {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        })
        const data = await res.json()
        if (res.status === 400 && data.error?.includes('not configured')) {
          setNotConfigured(true)
          return
        }
        if (!res.ok) throw new Error(data.error || 'Failed to load accounts')
        setAccounts(data.accounts || [])
        if (data.accounts?.length) setSelectedAccountId(data.accounts[0].id)
      } catch (err: any) {
        // Meta not configured — show empty state instead of toast
        if (err.message?.includes('not configured')) {
          setNotConfigured(true)
        } else {
          toast.error(err.message || 'Failed to load Meta accounts')
        }
      } finally {
        setLoadingAccounts(false)
      }
    }
    load()
  }, [])

  // ── Load insights ────────────────────────────────────────────────────────
  const loadInsights = useCallback(async () => {
    if (!selectedAccountId) return
    setLoadingInsights(true)
    setOptimization(null)
    try {
      const token = await getAuthToken()
      const res = await fetch(
        `/api/integrations/meta/insights?accountId=${selectedAccountId}&datePreset=${datePreset}`,
        { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load insights')
      setInsights(data.insights || [])
      setSummary(data.summary || null)
    } catch (err: any) {
      toast.error(err.message || 'Failed to load insights')
    } finally {
      setLoadingInsights(false)
    }
  }, [selectedAccountId, datePreset])

  useEffect(() => {
    if (selectedAccountId) loadInsights()
  }, [selectedAccountId, datePreset, loadInsights])

  // ── AI Optimise ──────────────────────────────────────────────────────────
  async function handleOptimize() {
    if (!insights.length && !summary) {
      toast.error('Load insights first')
      return
    }
    setLoadingOptimize(true)
    try {
      const token = await getAuthToken()
      const res = await fetch('/api/integrations/meta/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ insights, summary }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Optimisation failed')
      setOptimization(data)
    } catch (err: any) {
      toast.error(err.message || 'Optimisation failed')
    } finally {
      setLoadingOptimize(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  if (notConfigured) {
    return (
      <ClientShell>
        <div style={{ padding: 32, maxWidth: 480, margin: '80px auto', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: 'var(--surface-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <BarChart3 size={28} style={{ color: '#9b6dff' }} />
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Meta Ads not connected</h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
            Add your Meta access token and ad account ID in Settings to start pulling campaign data.
          </p>
          <Button variant="primary" onClick={() => window.location.href = '/settings'}>
            <Settings size={14} /> Go to Settings
          </Button>
        </div>
      </ClientShell>
    )
  }

  return (
    <ClientShell>
      <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Meta Ads</h1>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Campaign performance dashboard</p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Account selector */}
            {accounts.length > 0 && (
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                style={{ minWidth: 200, padding: '6px 10px', background: 'var(--surface-base)', border: '1px solid var(--border-subtle)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer' }}
              >
                {accounts.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            )}
            {/* Date preset */}
            <select
              value={datePreset}
              onChange={(e) => setDatePreset(e.target.value)}
              style={{ minWidth: 140, padding: '6px 10px', background: 'var(--surface-base)', border: '1px solid var(--border-subtle)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer' }}
            >
              {DATE_PRESETS.map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
            <Button variant="secondary" onClick={loadInsights} disabled={loadingInsights || !selectedAccountId}>
              <RefreshCcw size={14} className={loadingInsights ? 'animate-spin' : ''} />
              {loadingInsights ? 'Loading…' : 'Refresh'}
            </Button>
            <Button variant="primary" onClick={handleOptimize} disabled={loadingOptimize || !insights.length}>
              {loadingOptimize ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {loadingOptimize ? 'Analysing…' : 'AI Optimise'}
            </Button>
          </div>
        </div>

        {/* Loading state */}
        {loadingAccounts && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-secondary)', padding: '40px 0' }}>
            <Loader2 size={18} className="animate-spin" />
            <span style={{ fontSize: 13 }}>Loading accounts…</span>
          </div>
        )}

        {/* KPI Summary */}
        {summary && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
            <KpiCard icon={DollarSign} label="Spend" value={fmtCurrency(summary.spend)} sub="Total for period" color="#9b6dff" />
            <KpiCard icon={Eye} label="Impressions" value={fmt(summary.impressions)} color="#60a5fa" />
            <KpiCard icon={MousePointerClick} label="Clicks" value={fmt(summary.clicks)} color="#2dd4bf" />
            <KpiCard icon={Target} label="CTR" value={`${parseFloat(summary.ctr || '0').toFixed(2)}%`} color="#f59e0b" />
            <KpiCard icon={BarChart3} label="CPM" value={`$${parseFloat(summary.cpm || '0').toFixed(2)}`} sub="per 1K impressions" color="#fb923c" />
            <KpiCard icon={MousePointerClick} label="CPC" value={`$${parseFloat(summary.cpc || '0').toFixed(2)}`} sub="per click" color="#34d399" />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: optimization ? '1fr 380px' : '1fr', gap: 20 }}>

          {/* Campaign table */}
          <div>
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  Campaign Performance
                </h2>
                {insights.length > 0 && (
                  <Badge color="#6b7280">{insights.length} campaigns</Badge>
                )}
              </div>

              {loadingInsights ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 32, color: 'var(--text-secondary)' }}>
                  <Loader2 size={16} className="animate-spin" />
                  <span style={{ fontSize: 13 }}>Loading campaign data…</span>
                </div>
              ) : insights.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
                  {selectedAccountId ? 'No campaign data for this period' : 'Select an ad account to load data'}
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        {['Campaign', 'Spend', 'Impressions', 'Clicks', 'CTR', 'CPC', 'CPM'].map(h => (
                          <th key={h} style={{ padding: '10px 16px', textAlign: h === 'Campaign' ? 'left' : 'right', color: 'var(--text-secondary)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {insights.map((row, i) => {
                        const ctr = parseFloat(row.ctr || '0')
                        const cpc = parseFloat(row.cpc || '0')
                        return (
                          <tr
                            key={row.campaign_id || i}
                            style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-raised)')}
                            onMouseLeave={e => (e.currentTarget.style.background = '')}
                          >
                            <td style={{ padding: '12px 16px', maxWidth: 240 }}>
                              <div style={{ fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {row.campaign_name}
                              </div>
                              <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>
                                {row.campaign_id}
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {fmtCurrency(row.spend)}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-secondary)' }}>{fmt(row.impressions)}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-secondary)' }}>{fmt(row.clicks)}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                              <span style={{ color: ctr >= 2 ? '#22d3ee' : ctr >= 1 ? '#f59e0b' : '#ef4444' }}>
                                {ctr.toFixed(2)}%
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                              ${cpc.toFixed(2)}
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                              ${parseFloat(row.cpm || '0').toFixed(2)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </div>

          {/* AI Optimisation Panel */}
          {optimization && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Summary */}
              <Card style={{ padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <Sparkles size={14} style={{ color: '#9b6dff' }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>AI Analysis</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                  {optimization.summary}
                </p>
              </Card>

              {/* Recommendations */}
              {optimization.recommendations?.length > 0 && (
                <Card style={{ padding: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Recommendations</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {optimization.recommendations.slice(0, 5).map((r, i) => (
                      <div key={i} style={{ borderLeft: `2px solid ${priorityColor(r.priority)}`, paddingLeft: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{r.title}</span>
                          <Badge color={r.priority === 'high' ? '#ef4444' : r.priority === 'medium' ? '#f59e0b' : '#6b7280'}>
                            {r.priority}
                          </Badge>
                        </div>
                        <p style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>{r.detail}</p>
                        {r.estimatedImpact && (
                          <p style={{ fontSize: 10, color: '#22d3ee', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                            <TrendingUp size={10} />{r.estimatedImpact}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Quick wins */}
              {optimization.quickWins?.length > 0 && (
                <Card style={{ padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <Zap size={13} style={{ color: '#f59e0b' }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>Quick Wins</span>
                  </div>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {optimization.quickWins.map((w, i) => (
                      <li key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', fontSize: 11, color: 'var(--text-secondary)' }}>
                        <ChevronRight size={11} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 1 }} />
                        {w}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* Watch out */}
              {optimization.watchOut?.length > 0 && (
                <Card style={{ padding: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <AlertTriangle size={13} style={{ color: '#ef4444' }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>Watch Out</span>
                  </div>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {optimization.watchOut.map((w, i) => (
                      <li key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start', fontSize: 11, color: 'var(--text-secondary)' }}>
                        <ChevronRight size={11} style={{ color: '#ef4444', flexShrink: 0, marginTop: 1 }} />
                        {w}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Higgsfield Video Generation */}
        <div style={{ marginTop: 28 }}>
          <VideoGenerationPanel />
        </div>

      </div>
    </ClientShell>
  )
}

// ─── Video Generation Panel ───────────────────────────────────────────────────

function VideoGenerationPanel() {
  const [prompt, setPrompt] = useState('')
  const [aspectRatio, setAspectRatio] = useState('16:9')
  const [duration, setDuration] = useState(5)
  const [generating, setGenerating] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [videoStatus, setVideoStatus] = useState<{ status: string; videoUrl?: string; thumbnailUrl?: string; progress?: number } | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startPolling = useCallback((id: string) => {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const token = await getAuthToken()
        const res = await fetch(`/api/integrations/higgsfield/status?jobId=${id}`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        })
        const data = await res.json()
        setVideoStatus(data)
        if (data.status === 'completed' || data.status === 'failed' || data.videoUrl) {
          clearInterval(pollRef.current!)
          pollRef.current = null
        }
      } catch { /* silent */ }
    }, 4000)
  }, [])

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  async function handleGenerate() {
    if (!prompt.trim()) { toast.error('Enter a prompt'); return }
    setGenerating(true)
    setVideoStatus(null)
    setJobId(null)
    try {
      const token = await getAuthToken()
      const res = await fetch('/api/integrations/higgsfield/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ prompt, aspectRatio, duration }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Generation failed')
      setJobId(data.jobId)
      setVideoStatus({ status: data.status || 'queued', progress: 0 })
      if (data.jobId) startPolling(data.jobId)
      toast.success('Video generation started')
    } catch (err: any) {
      if (err.message?.includes('not configured')) {
        toast.error('Add Higgsfield API key in Settings to generate videos')
      } else {
        toast.error(err.message || 'Generation failed')
      }
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Card style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Video size={16} style={{ color: '#9b6dff' }} />
        <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Video Generation</h2>
        <Badge color="#9b6dff">Higgsfield AI</Badge>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 120px auto', gap: 10, alignItems: 'end' }}>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Prompt</label>
          <input
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="A product showcase with motion blur and cinematic lighting…"
            style={{
              width: '100%', padding: '8px 12px', background: 'var(--surface-raised)',
              border: '1px solid var(--border-subtle)', borderRadius: 6, color: 'var(--text-primary)',
              fontSize: 12, outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Aspect ratio</label>
          <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} style={{ width: '100%', padding: '7px 10px', background: 'var(--surface-base)', border: '1px solid var(--border-subtle)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 12, cursor: 'pointer' }}>
            <option value="16:9">16:9 (landscape)</option>
            <option value="9:16">9:16 (vertical)</option>
            <option value="1:1">1:1 (square)</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Duration</label>
          <select value={duration} onChange={e => setDuration(Number(e.target.value))} style={{ width: '100%', padding: '7px 10px', background: 'var(--surface-base)', border: '1px solid var(--border-subtle)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 12, cursor: 'pointer' }}>
            <option value={3}>3 seconds</option>
            <option value={5}>5 seconds</option>
            <option value={8}>8 seconds</option>
          </select>
        </div>
        <Button variant="primary" onClick={handleGenerate} disabled={generating || !prompt.trim()}>
          {generating ? <Loader2 size={13} className="animate-spin" /> : <Video size={13} />}
          {generating ? 'Starting…' : 'Generate'}
        </Button>
      </div>

      {/* Status */}
      {videoStatus && (
        <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--surface-raised)', borderRadius: 8 }}>
          {videoStatus.videoUrl ? (
            <div>
              <div style={{ fontSize: 12, color: '#22d3ee', fontWeight: 600, marginBottom: 10 }}>✓ Video ready</div>
              <video
                src={videoStatus.videoUrl}
                controls
                style={{ width: '100%', maxWidth: 480, borderRadius: 8, background: '#000' }}
              />
              <a
                href={videoStatus.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#9b6dff', marginTop: 8 }}
              >
                Open in new tab <ChevronRight size={10} />
              </a>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Loader2 size={14} className="animate-spin" style={{ color: '#9b6dff' }} />
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500, textTransform: 'capitalize' }}>
                  {videoStatus.status}
                  {videoStatus.progress != null && videoStatus.progress > 0 ? ` — ${Math.round(videoStatus.progress * 100)}%` : ''}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                  Job ID: {jobId}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
