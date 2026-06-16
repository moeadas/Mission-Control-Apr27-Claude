'use client'

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  DollarSign,
  ExternalLink,
  Layers3,
  Loader2,
  Megaphone,
  MousePointerClick,
  RefreshCcw,
  Search,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  Video,
  Zap,
} from 'lucide-react'

import { ClientShell } from '@/components/ClientShell'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input, Select } from '@/components/ui/Input'
import { toast } from '@/components/ui/Toast'
import { getAuthToken } from '@/lib/auth/browser'
import {
  GOOGLE_ADS_MARKET_OPTIONS,
  analyzeGoogleAdsCampaign,
  buildGoogleAdsKpis,
  inferGoogleAdsObjective,
  mapGoogleAdsCampaignFamily,
  type GoogleAdsFinding,
  type GoogleAdsMarketCode,
  type GoogleAdsTone,
} from '@/lib/google-ads-intelligence'

interface GoogleAdsAccount {
  id: string
  name: string
  currencyCode: string
  timeZone?: string
  manager?: boolean
  status?: string
}

interface GoogleAdsCampaign {
  id: string
  name: string
  status?: string
  advertisingChannelType?: string
  advertisingChannelSubType?: string
  biddingStrategyType?: string
  startDate?: string
  endDate?: string
  budgetAmount?: number
}

interface GoogleAdsMetrics {
  cost?: number
  impressions?: number
  clicks?: number
  conversions?: number
  allConversions?: number
  conversionValue?: number
  allConversionValue?: number
  ctr?: number
  averageCpc?: number
  averageCpm?: number
  costPerConversion?: number
  interactions?: number
  interactionRate?: number
  videoViews?: number
  averageCpv?: number
  videoViewRate?: number
  searchImpressionShare?: number
  searchBudgetLostImpressionShare?: number
  searchRankLostImpressionShare?: number
}

interface CampaignRow {
  campaign: GoogleAdsCampaign
  metrics: GoogleAdsMetrics
  dateRange?: { since: string; until: string }
}

interface CampaignDetails {
  campaign: GoogleAdsCampaign
  metrics: GoogleAdsMetrics
  adGroups: Array<{ id: string; name: string; status?: string; type?: string; metrics: GoogleAdsMetrics }>
  searchTerms: Array<{ term: string; adGroup?: string; metrics: GoogleAdsMetrics }>
  assetGroups: Array<{ id: string; name: string; metrics: GoogleAdsMetrics }>
  dateRange?: { since: string; until: string }
}

function buildGoogleAdsErrorMessage(payload: any, fallback: string) {
  const message = payload?.error || fallback
  const details = [
    payload?.googleCode ? `Code: ${payload.googleCode}` : '',
    payload?.googleStatus ? `Status: ${payload.googleStatus}` : '',
    payload?.requestId ? `Request ID: ${payload.requestId}` : '',
    payload?.rawBody && !String(message).includes(payload.rawBody) ? `Google response: ${payload.rawBody}` : '',
  ].filter(Boolean)
  return [message, ...details].join(' · ')
}

const DATE_PRESETS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last_7d', label: 'Last 7 days' },
  { value: 'last_14d', label: 'Last 14 days' },
  { value: 'last_30d', label: 'Last 30 days' },
  { value: 'last_90d', label: 'Last 90 days' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
]

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'enabled', label: 'Enabled' },
  { value: 'paused', label: 'Paused' },
  { value: 'ended', label: 'Ended' },
  { value: 'other', label: 'Other' },
]

function n(value: unknown) {
  const parsed = Number.parseFloat(String(value ?? 0))
  return Number.isFinite(parsed) ? parsed : 0
}

function fmt(value: unknown, digits = 0) {
  const parsed = n(value)
  if (parsed >= 1_000_000) return `${(parsed / 1_000_000).toFixed(1)}M`
  if (parsed >= 1_000) return `${(parsed / 1_000).toFixed(1)}K`
  return parsed.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits })
}

function currency(value: unknown, currencyCode = 'USD', digits = 0) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode || 'USD',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n(value))
}

function percent(value: unknown) {
  return `${n(value).toFixed(2)}%`
}

function shortDate(value?: string | null) {
  if (!value) return 'Not set'
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(date)
}

function dateRangeLabel(range?: { since?: string; until?: string } | null) {
  if (!range?.since || !range?.until) return 'Selected period'
  return `${shortDate(range.since)}-${shortDate(range.until)}`
}

function statusGroup(campaign: GoogleAdsCampaign) {
  const status = String(campaign.status || '').toLowerCase()
  if (campaign.endDate && campaign.endDate < new Date().toISOString().slice(0, 10)) return 'ended'
  if (status === 'enabled') return 'enabled'
  if (status === 'paused') return 'paused'
  if (status === 'removed') return 'ended'
  return 'other'
}

function statusColor(status?: string) {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'enabled') return '#2ecf91'
  if (normalized === 'paused') return '#f4c84f'
  if (normalized === 'removed') return '#93a1b5'
  return '#8f72ff'
}

function toneColor(tone: GoogleAdsTone = 'neutral') {
  if (tone === 'good') return '#18c7b6'
  if (tone === 'watch') return '#f4c84f'
  if (tone === 'risk') return '#ff7f7f'
  return '#4f8ef7'
}

function findingColor(finding: GoogleAdsFinding) {
  if (finding.type === 'error') return '#ff7f7f'
  if (finding.type === 'warning') return '#f4c84f'
  if (finding.type === 'success') return '#18c7b6'
  return '#4f8ef7'
}

function accountLabel(account: GoogleAdsAccount) {
  return `${account.name} (${account.currencyCode || 'Google Ads'})${account.manager ? ' · MCC' : ''}`
}

function roas(metrics: GoogleAdsMetrics) {
  return n(metrics.cost) > 0 && n(metrics.conversionValue) > 0 ? n(metrics.conversionValue) / n(metrics.cost) : 0
}

function GoogleAdsConnectState() {
  return (
    <ClientShell>
      <div className="min-h-[70vh] flex items-center justify-center">
        <Card className="max-w-xl text-center" padding="lg">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl border border-border bg-card">
            <Megaphone className="text-accent-blue" size={30} />
          </div>
          <h1 className="font-heading text-2xl font-semibold text-text-primary">Google Ads is not connected</h1>
          <p className="mt-3 text-text-secondary leading-relaxed">
            Save your Google Ads developer token in Settings, reconnect Google with Ads access, then Mission Control can list accounts and analyze campaigns.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="primary" onClick={() => window.location.href = '/settings'}>
              <Settings size={16} />
              Open Settings
            </Button>
            <Button variant="secondary" onClick={() => window.location.href = '/api/auth/google'}>
              <ExternalLink size={16} />
              Connect Google
            </Button>
          </div>
        </Card>
      </div>
    </ClientShell>
  )
}

function KpiTile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone: GoogleAdsTone }) {
  return (
    <div className="rounded-[8px] border border-border bg-card p-4">
      <div className="mb-4 h-1 w-14 rounded-full" style={{ backgroundColor: toneColor(tone) }} />
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-text-secondary">{label}</p>
      <p className="mt-3 font-heading text-2xl font-semibold text-text-primary">{value}</p>
      {sub && <p className="mt-1 text-sm text-text-secondary">{sub}</p>}
    </div>
  )
}

function MetricCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  value: string
  sub: string
  color: string
}) {
  return (
    <Card className="min-h-[112px]">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-[8px]" style={{ backgroundColor: `${color}14`, color }}>
          <Icon size={22} />
        </div>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-text-secondary">{label}</p>
          <p className="mt-2 font-heading text-2xl font-semibold text-text-primary">{value}</p>
          <p className="mt-1 text-xs text-text-secondary">{sub}</p>
        </div>
      </div>
    </Card>
  )
}

function CampaignCard({
  row,
  selected,
  currencyCode,
  marketCode,
  onClick,
}: {
  row: CampaignRow
  selected: boolean
  currencyCode: string
  marketCode: GoogleAdsMarketCode
  onClick: () => void
}) {
  const analysis = analyzeGoogleAdsCampaign(row.campaign, row.metrics, marketCode, currencyCode)
  const kpis = buildGoogleAdsKpis(row.campaign, row.metrics, currencyCode, marketCode)
  const family = mapGoogleAdsCampaignFamily(row.campaign)
  const objective = inferGoogleAdsObjective(row.campaign, row.metrics)
  const topFinding = analysis.findings[0]

  return (
    <Card
      hover
      onClick={onClick}
      className={selected ? 'border-accent-blue shadow-[0_0_0_1px_rgba(79,142,247,0.25)]' : ''}
      padding="lg"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge color={statusColor(row.campaign.status)} variant="outline">{String(row.campaign.status || 'unknown').toLowerCase()}</Badge>
            <Badge color="#6b96ff" variant="outline">{objective}</Badge>
            <Badge color="#18c7b6" variant="outline">{family.replace('_', ' ')}</Badge>
          </div>
          <h2 className="mt-4 font-heading text-2xl font-semibold text-text-primary">{row.campaign.name}</h2>
          <p className="mt-2 text-sm text-text-secondary">
            {row.campaign.advertisingChannelType || 'Google Ads'} · {row.campaign.biddingStrategyType || 'Bidding not set'} · {dateRangeLabel(row.dateRange)}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-text-secondary">Health Score</p>
          <p className="font-heading text-5xl font-semibold text-text-primary">{analysis.score}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <KpiTile label="Cost" value={currency(row.metrics.cost, currencyCode)} sub={dateRangeLabel(row.dateRange)} tone="neutral" />
        <KpiTile label="Impressions" value={fmt(row.metrics.impressions)} sub={`${currency(row.metrics.averageCpm, currencyCode, 2)} CPM`} tone="neutral" />
        <KpiTile label="Clicks" value={fmt(row.metrics.clicks)} sub={`${percent(row.metrics.ctr)} CTR`} tone="neutral" />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {kpis.map((kpi) => (
          <KpiTile key={kpi.key} label={kpi.label} value={kpi.value} sub={kpi.sub} tone={kpi.tone} />
        ))}
      </div>

      {topFinding && (
        <div className="mt-5 rounded-[8px] border border-border bg-base p-4">
          <div className="flex items-start gap-3">
            <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: findingColor(topFinding) }} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-heading text-lg font-semibold text-text-primary">{topFinding.title}</h3>
                <Badge color={findingColor(topFinding)} variant="outline">{topFinding.priority}</Badge>
              </div>
              <p className="mt-2 text-sm text-text-secondary">{topFinding.description}</p>
              <p className="mt-3 text-sm text-accent-cyan">{topFinding.recommendations[0]}</p>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

function AnalystPanel({
  selected,
  details,
  loading,
  currencyCode,
  marketCode,
}: {
  selected: CampaignRow | null
  details: CampaignDetails | null
  loading: boolean
  currencyCode: string
  marketCode: GoogleAdsMarketCode
}) {
  if (!selected) {
    return (
      <Card className="sticky top-6" padding="lg">
        <div className="flex h-14 w-14 items-center justify-center rounded-[8px] border border-border bg-card">
          <Sparkles className="text-accent-purple" size={26} />
        </div>
        <h2 className="mt-5 font-heading text-xl font-semibold text-text-primary">Select a campaign</h2>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          The Google Ads analyst will load campaign-specific findings, search terms, ad groups, asset groups, and recommended actions after a campaign is selected.
        </p>
      </Card>
    )
  }

  const campaign = details?.campaign || selected.campaign
  const metrics = details?.metrics || selected.metrics
  const analysis = analyzeGoogleAdsCampaign(campaign, metrics, marketCode, currencyCode)
  const family = mapGoogleAdsCampaignFamily(campaign)
  const objective = inferGoogleAdsObjective(campaign, metrics)
  const kpis = buildGoogleAdsKpis(campaign, metrics, currencyCode, marketCode)
  const weakKpis = kpis.filter((kpi) => kpi.tone === 'risk' || kpi.tone === 'watch').slice(0, 3)
  const strongKpis = kpis.filter((kpi) => kpi.tone === 'good').slice(0, 2)
  const topSearchTerms = (details?.searchTerms || []).slice(0, 5)
  const topAdGroups = (details?.adGroups || []).slice(0, 4)
  const topAssetGroups = (details?.assetGroups || []).slice(0, 4)

  return (
    <Card className="sticky top-6 max-h-[calc(100vh-48px)] overflow-y-auto" padding="lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-text-secondary">AI Google Ads Analyst</p>
          <h2 className="mt-1 font-heading text-2xl font-semibold text-text-primary">Campaign Readout</h2>
        </div>
        {loading ? <Loader2 className="animate-spin text-accent-blue" size={22} /> : <Badge color={analysis.score >= 80 ? '#18c7b6' : analysis.score < 60 ? '#ff7f7f' : '#f4c84f'} variant="outline">{analysis.score}/100</Badge>}
      </div>

      <div className="mt-6 space-y-4">
        <div className="rounded-[8px] border border-border bg-card p-4">
          <div className="flex items-center gap-2">
            <BarChart3 size={18} className="text-accent-blue" />
            <Badge color="#6b96ff" variant="outline">{objective}</Badge>
            <Badge color="#18c7b6" variant="outline">{family.replace('_', ' ')}</Badge>
          </div>
          <h3 className="mt-4 font-heading text-lg font-semibold text-text-primary">{campaign.name}</h3>
          <p className="mt-2 text-sm leading-relaxed text-text-secondary">
            {dateRangeLabel(details?.dateRange || selected.dateRange)} produced {currency(metrics.cost, currencyCode)} cost, {fmt(metrics.clicks)} clicks,
            {' '}{fmt(metrics.conversions)} conversions, {currency(metrics.conversionValue, currencyCode)} conversion value, and {roas(metrics) ? `${roas(metrics).toFixed(2)}x ROAS` : 'no tracked ROAS'}.
          </p>
        </div>

        {strongKpis.length > 0 && (
          <div className="rounded-[8px] border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-accent-cyan" />
              <h3 className="font-heading text-lg font-semibold text-text-primary">What is working</h3>
            </div>
            <div className="mt-3 space-y-3">
              {strongKpis.map((kpi) => (
                <p key={kpi.key} className="text-sm text-text-secondary">
                  <span className="font-semibold text-text-primary">{kpi.label}: {kpi.value}.</span> {kpi.sub}
                </p>
              ))}
            </div>
          </div>
        )}

        {weakKpis.length > 0 && (
          <div className="rounded-[8px] border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-accent-yellow" />
              <h3 className="font-heading text-lg font-semibold text-text-primary">Where to improve</h3>
            </div>
            <div className="mt-3 space-y-3">
              {weakKpis.map((kpi) => (
                <p key={kpi.key} className="text-sm text-text-secondary">
                  <span className="font-semibold text-text-primary">{kpi.label}: {kpi.value}.</span> {kpi.sub}
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="border-t border-border pt-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-heading text-lg font-semibold text-text-primary">Recommended Actions</h3>
            <div className="flex items-center gap-3 text-xs text-text-secondary">
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#18c7b6]" />healthy</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#f4c84f]" />watch</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#ff7f7f]" />risk</span>
            </div>
          </div>
          <div className="space-y-5">
            {analysis.findings.map((finding) => (
              <div key={finding.title} className="border-l-2 pl-4" style={{ borderColor: findingColor(finding) }}>
                <div className="flex items-start justify-between gap-3">
                  <h4 className="font-heading text-lg font-semibold text-text-primary">{finding.title}</h4>
                  <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-text-secondary">{finding.priority}</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">{finding.description}</p>
                <ul className="mt-3 space-y-2">
                  {finding.recommendations.slice(0, 3).map((item) => (
                    <li key={item} className="flex gap-2 text-sm text-accent-cyan">
                      <span>›</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {(topSearchTerms.length > 0 || topAdGroups.length > 0 || topAssetGroups.length > 0) && (
          <div className="border-t border-border pt-5">
            <h3 className="font-heading text-lg font-semibold text-text-primary">Evidence Drilldown</h3>
            {topSearchTerms.length > 0 && (
              <div className="mt-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-text-secondary">Top Search Terms</p>
                <div className="mt-2 space-y-2">
                  {topSearchTerms.map((term) => (
                    <div key={`${term.term}-${term.adGroup}`} className="rounded-[8px] border border-border bg-base p-3">
                      <p className="text-sm font-medium text-text-primary">{term.term || '(not provided)'}</p>
                      <p className="mt-1 text-xs text-text-secondary">{currency(term.metrics.cost, currencyCode)} · {fmt(term.metrics.clicks)} clicks · {fmt(term.metrics.conversions)} conv.</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {topAdGroups.length > 0 && (
              <div className="mt-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-text-secondary">Top Ad Groups</p>
                <div className="mt-2 space-y-2">
                  {topAdGroups.map((group) => (
                    <div key={group.id} className="rounded-[8px] border border-border bg-base p-3">
                      <p className="text-sm font-medium text-text-primary">{group.name}</p>
                      <p className="mt-1 text-xs text-text-secondary">{currency(group.metrics.cost, currencyCode)} · {percent(group.metrics.ctr)} CTR · {fmt(group.metrics.conversions)} conv.</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {topAssetGroups.length > 0 && (
              <div className="mt-4">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-text-secondary">Top Asset Groups</p>
                <div className="mt-2 space-y-2">
                  {topAssetGroups.map((group) => (
                    <div key={group.id} className="rounded-[8px] border border-border bg-base p-3">
                      <p className="text-sm font-medium text-text-primary">{group.name}</p>
                      <p className="mt-1 text-xs text-text-secondary">{currency(group.metrics.cost, currencyCode)} · {fmt(group.metrics.clicks)} clicks · {currency(group.metrics.conversionValue, currencyCode)} value</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  )
}

export default function GoogleAdsPage() {
  const [accounts, setAccounts] = useState<GoogleAdsAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [accountSearch, setAccountSearch] = useState('')
  const [datePreset, setDatePreset] = useState('last_30d')
  const [marketCode, setMarketCode] = useState<GoogleAdsMarketCode>('JO')
  const [campaignSearch, setCampaignSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([])
  const [summary, setSummary] = useState<Record<string, number> | null>(null)
  const [dateRange, setDateRange] = useState<{ since: string; until: string } | null>(null)
  const [selectedCampaignId, setSelectedCampaignId] = useState('')
  const [details, setDetails] = useState<CampaignDetails | null>(null)
  const [loadingAccounts, setLoadingAccounts] = useState(true)
  const [loadingCampaigns, setLoadingCampaigns] = useState(false)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedAccount = accounts.find((account) => account.id === selectedAccountId) || null
  const currencyCode = selectedAccount?.currencyCode || 'USD'
  const selectedCampaign = campaigns.find((row) => row.campaign.id === selectedCampaignId) || null

  const loadAccounts = useCallback(async () => {
    setLoadingAccounts(true)
    setError(null)
    try {
      const token = await getAuthToken()
      const response = await fetch('/api/integrations/google-ads/accounts', {
        cache: 'no-store',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(buildGoogleAdsErrorMessage(payload, 'Failed to load Google Ads accounts'))
      setAccounts(payload.accounts || [])
      setSelectedAccountId((current) => current || payload.defaultCustomerId || payload.accounts?.[0]?.id || '')
      setMarketCode((payload.primaryMarket || 'JO') as GoogleAdsMarketCode)
    } catch (err: any) {
      setError(err.message || 'Google Ads is not connected')
    } finally {
      setLoadingAccounts(false)
    }
  }, [])

  const loadCampaigns = useCallback(async () => {
    if (!selectedAccountId) return
    setLoadingCampaigns(true)
    setError(null)
    try {
      const token = await getAuthToken()
      const params = new URLSearchParams({ customerId: selectedAccountId, datePreset })
      const response = await fetch(`/api/integrations/google-ads/campaigns?${params.toString()}`, {
        cache: 'no-store',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(buildGoogleAdsErrorMessage(payload, 'Failed to load campaigns'))
      setCampaigns(payload.campaigns || [])
      setSummary(payload.summary || null)
      setDateRange(payload.dateRange || null)
      setSelectedCampaignId((current) => {
        if (current && (payload.campaigns || []).some((row: CampaignRow) => row.campaign.id === current)) return current
        return payload.campaigns?.[0]?.campaign?.id || ''
      })
      setDetails(null)
    } catch (err: any) {
      setError(err.message || 'Failed to load campaigns')
      toast.error(err.message || 'Failed to load campaigns')
    } finally {
      setLoadingCampaigns(false)
    }
  }, [datePreset, selectedAccountId])

  const loadDetails = useCallback(async () => {
    if (!selectedAccountId || !selectedCampaignId) return
    setLoadingDetails(true)
    try {
      const token = await getAuthToken()
      const params = new URLSearchParams({ customerId: selectedAccountId, datePreset })
      const response = await fetch(`/api/integrations/google-ads/campaigns/${selectedCampaignId}/details?${params.toString()}`, {
        cache: 'no-store',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(buildGoogleAdsErrorMessage(payload, 'Failed to load campaign details'))
      setDetails(payload)
    } catch (err: any) {
      setDetails(null)
      toast.error(err.message || 'Failed to load campaign details')
    } finally {
      setLoadingDetails(false)
    }
  }, [datePreset, selectedAccountId, selectedCampaignId])

  useEffect(() => {
    loadAccounts()
  }, [loadAccounts])

  useEffect(() => {
    loadCampaigns()
  }, [loadCampaigns])

  useEffect(() => {
    loadDetails()
  }, [loadDetails])

  const filteredAccounts = useMemo(() => {
    const q = accountSearch.trim().toLowerCase()
    if (!q) return accounts
    return accounts.filter((account) => accountLabel(account).toLowerCase().includes(q) || account.id.includes(q))
  }, [accountSearch, accounts])

  const filteredCampaigns = useMemo(() => {
    const q = campaignSearch.trim().toLowerCase()
    return campaigns.filter((row) => {
      const statusOk = statusFilter === 'all' || statusGroup(row.campaign) === statusFilter
      const searchOk = !q || row.campaign.name.toLowerCase().includes(q) || row.campaign.id.includes(q)
      return statusOk && searchOk
    })
  }, [campaignSearch, campaigns, statusFilter])

  const totalRows = filteredCampaigns.length

  return (
    <ClientShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-accent-blue">
              <Megaphone size={20} />
              <p className="font-mono text-xs uppercase tracking-[0.28em]">Google Ads Intelligence</p>
            </div>
            <h1 className="mt-2 font-heading text-3xl font-semibold text-text-primary">AI Powered Google Ads Analytics</h1>
            <p className="mt-2 max-w-3xl text-sm text-text-secondary">
              Campaign-type aware readouts for Search, Performance Max, Shopping, Video, Display, Demand Gen, and App campaigns.
            </p>
          </div>
          <Button variant="secondary" onClick={() => { loadAccounts(); loadCampaigns() }} disabled={loadingAccounts || loadingCampaigns}>
            <RefreshCcw size={15} className={loadingAccounts || loadingCampaigns ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </div>

        <Card padding="lg">
          <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr_1fr_1.3fr]">
            <div className="space-y-2">
              <Input
                label="Search Ad Accounts"
                value={accountSearch}
                onChange={(event) => setAccountSearch(event.target.value)}
                placeholder="Search by account name or ID"
              />
              <Select
                label="Ad Account"
                value={selectedAccountId}
                onChange={(event) => setSelectedAccountId(event.target.value)}
                options={filteredAccounts.map((account) => ({ value: account.id, label: accountLabel(account) }))}
              />
            </div>
            <Select label="Date Range" value={datePreset} onChange={(event) => setDatePreset(event.target.value)} options={DATE_PRESETS} />
            <Select
              label="Benchmark Market"
              value={marketCode}
              onChange={(event) => setMarketCode(event.target.value as GoogleAdsMarketCode)}
              options={GOOGLE_ADS_MARKET_OPTIONS}
            />
            <Input
              label="Search Campaigns"
              value={campaignSearch}
              onChange={(event) => setCampaignSearch(event.target.value)}
              placeholder="Search by campaign name"
            />
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-border pt-5">
            <Search size={16} className="text-text-secondary" />
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                  statusFilter === filter.value
                    ? 'border-accent-blue text-accent-blue'
                    : 'border-border bg-base text-text-secondary hover:text-text-primary'
                }`}
              >
                {filter.label}
              </button>
            ))}
            <div className="ml-auto flex flex-wrap gap-2 text-xs">
              <Badge color="#6b96ff" variant="outline">{totalRows} of {campaigns.length} campaigns</Badge>
              {dateRange && <Badge color="#8f72ff" variant="outline">{dateRangeLabel(dateRange)}</Badge>}
              <Badge color="#18c7b6" variant="outline">{GOOGLE_ADS_MARKET_OPTIONS.find((item) => item.value === marketCode)?.label || marketCode}</Badge>
            </div>
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard icon={DollarSign} label="Cost" value={currency(summary?.cost, currencyCode)} sub={dateRangeLabel(dateRange)} color="#8f72ff" />
          <MetricCard icon={Layers3} label="Impressions" value={fmt(summary?.impressions)} sub={`${currency(summary?.averageCpm, currencyCode, 2)} CPM`} color="#4f8ef7" />
          <MetricCard icon={MousePointerClick} label="Clicks" value={fmt(summary?.clicks)} sub={`${percent(summary?.ctr)} CTR`} color="#18c7b6" />
          <MetricCard icon={Target} label="Conversions" value={fmt(summary?.conversions)} sub={`${currency(summary?.costPerConversion, currencyCode, 2)} CPA`} color="#2ecf91" />
          <MetricCard icon={TrendingUp} label="ROAS" value={summary?.roas ? `${n(summary.roas).toFixed(2)}x` : 'Not tracked'} sub={`${currency(summary?.conversionValue, currencyCode)} value`} color="#f4c84f" />
        </div>

        {error && (
          <Card className="border-[#ff7f7f]/40 bg-[#ff7f7f]/5">
            <div className="flex items-center gap-3 text-[#ff7f7f]">
              <AlertTriangle size={18} />
              <p className="text-sm">{error}</p>
            </div>
          </Card>
        )}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
          <div className="space-y-5">
            {loadingCampaigns && (
              <Card className="flex items-center gap-3">
                <Loader2 className="animate-spin text-accent-blue" size={20} />
                <span className="text-sm text-text-secondary">Loading Google Ads campaigns…</span>
              </Card>
            )}
            {!loadingCampaigns && filteredCampaigns.length === 0 && (
              <Card className="text-center">
                <p className="font-heading text-lg font-semibold text-text-primary">No campaigns found</p>
                <p className="mt-2 text-sm text-text-secondary">Try another account, date range, status, or search term.</p>
              </Card>
            )}
            {filteredCampaigns.map((row) => (
              <CampaignCard
                key={row.campaign.id}
                row={row}
                selected={selectedCampaignId === row.campaign.id}
                currencyCode={currencyCode}
                marketCode={marketCode}
                onClick={() => setSelectedCampaignId(row.campaign.id)}
              />
            ))}
          </div>

          <AnalystPanel
            selected={selectedCampaign}
            details={details}
            loading={loadingDetails}
            currencyCode={currencyCode}
            marketCode={marketCode}
          />
        </div>
      </div>
    </ClientShell>
  )
}
