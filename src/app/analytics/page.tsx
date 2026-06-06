'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  ExternalLink,
  LineChart,
  Loader2,
  RefreshCcw,
  Sparkles,
  Table2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'

import { ClientShell } from '@/components/ClientShell'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Input'
import { toast } from '@/components/ui/Toast'
import { getAuthToken } from '@/lib/auth/browser'
import { GA4_DATE_RANGES, GA4_PRESETS, type Ga4WidgetConfig } from '@/lib/ga4-presets'

interface Ga4Property {
  account: string
  accountId: string
  propertyId: string
  propertyName: string
  propertyResource: string
}

interface DashboardPayload {
  propertyId: string
  preset: { presetId: string; label: string; description: string; widgets: Ga4WidgetConfig[] }
  dateRange: { value: string; label: string; startDate: string; endDate: string }
  widgets: Record<string, any>
  insights: Array<{ type: string; title: string; evidence: string; severity: string; action: string }>
  freshness: { label: string; generatedAt: string }
}

function n(value: unknown) {
  const parsed = Number.parseFloat(String(value ?? 0))
  return Number.isFinite(parsed) ? parsed : 0
}

function fmtNumber(value: unknown, digits = 0) {
  const parsed = n(value)
  if (parsed >= 1_000_000) return `${(parsed / 1_000_000).toFixed(1)}M`
  if (parsed >= 1_000) return `${(parsed / 1_000).toFixed(1)}K`
  return parsed.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits })
}

function fmtCurrency(value: unknown) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n(value))
}

function fmtPercent(value: unknown) {
  const parsed = n(value)
  const pct = parsed <= 1 ? parsed * 100 : parsed
  return `${pct.toFixed(1)}%`
}

function fmtDuration(seconds: unknown) {
  const value = n(seconds)
  if (value >= 3600) return `${(value / 3600).toFixed(1)}h`
  if (value >= 60) return `${(value / 60).toFixed(1)}m`
  return `${value.toFixed(0)}s`
}

function formatMetric(value: unknown, format?: string) {
  if (format === 'currency') return fmtCurrency(value)
  if (format === 'percent') return fmtPercent(value)
  if (format === 'duration') return fmtDuration(value)
  return fmtNumber(value, n(value) % 1 ? 2 : 0)
}

function firstMetricValue(widget: any) {
  const metric = widget?.config?.query?.metrics?.[0]
  return metric ? widget?.current?.totals?.[metric] ?? widget?.current?.rows?.[0]?.[metric] ?? 0 : 0
}

function previousMetricValue(widget: any) {
  const metric = widget?.config?.query?.metrics?.[0]
  return metric ? widget?.previous?.totals?.[metric] ?? widget?.previous?.rows?.[0]?.[metric] ?? 0 : 0
}

function delta(widget: any) {
  const previous = n(previousMetricValue(widget))
  if (!previous) return null
  return ((n(firstMetricValue(widget)) - previous) / previous) * 100
}

function WidgetCard({ widget }: { widget: any }) {
  const config: Ga4WidgetConfig = widget.config
  if (config.chartType === 'kpi') return <KpiWidget widget={widget} />
  if (config.chartType === 'table') return <TableWidget widget={widget} />
  if (config.chartType === 'funnel') return <FunnelWidget widget={widget} />
  if (config.chartType === 'donut') return <DonutWidget widget={widget} />
  if (config.chartType === 'line') return <LineWidget widget={widget} />
  if (config.chartType === 'scatter') return <ScatterWidget widget={widget} />
  return <BarWidget widget={widget} />
}

function KpiWidget({ widget }: { widget: any }) {
  const config: Ga4WidgetConfig = widget.config
  const change = delta(widget)
  const value = firstMetricValue(widget)
  const up = (change || 0) >= 0
  return (
    <Card className="rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-wider text-text-dim">{config.title}</p>
          <p className="mt-2 font-heading text-3xl font-semibold text-text-primary">{formatMetric(value, config.viz?.valueFormat)}</p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-accent-purple/15 text-accent-purple">
          <BarChart3 size={17} />
        </span>
      </div>
      {change !== null ? (
        <div className={`mt-3 flex items-center gap-1 text-xs ${up ? 'text-accent-green' : 'text-accent-red'}`}>
          {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          {Math.abs(change).toFixed(1)}% vs previous period
        </div>
      ) : (
        <p className="mt-3 text-xs text-text-secondary">Previous-period comparison unavailable</p>
      )}
    </Card>
  )
}

function BarWidget({ widget }: { widget: any }) {
  const config: Ga4WidgetConfig = widget.config
  const rows = widget.current?.rows || []
  const dimension = config.query.dimensions?.[0]
  const metric = config.query.metrics?.[0]
  const max = Math.max(...rows.map((row: any) => n(row[metric || ''])), 1)
  return (
    <Card className="rounded-lg p-4 lg:col-span-6">
      <WidgetHeader icon={BarChart3} title={config.title} rows={rows.length} />
      <div className="mt-4 space-y-3">
        {rows.slice(0, 10).map((row: any, index: number) => (
          <div key={`${row[dimension || 'label']}-${index}`}>
            <div className="mb-1 flex items-center justify-between gap-3 text-xs">
              <span className="truncate text-text-secondary">{row[dimension || ''] || '(not set)'}</span>
              <span className="font-mono text-text-primary">{formatMetric(row[metric || ''], config.viz?.valueFormat)}</span>
            </div>
            <div className="h-2 rounded-full bg-base">
              <div className="h-2 rounded-full bg-accent-purple" style={{ width: `${Math.max(3, (n(row[metric || '']) / max) * 100)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function LineWidget({ widget }: { widget: any }) {
  const config: Ga4WidgetConfig = widget.config
  const rows = widget.current?.rows || []
  const metric = config.query.metrics?.[0]
  const values = rows.slice(-28).map((row: any) => n(row[metric || '']))
  const max = Math.max(...values, 1)
  return (
    <Card className="rounded-lg p-4 lg:col-span-12">
      <WidgetHeader icon={LineChart} title={config.title} rows={rows.length} />
      <div className="mt-4 flex h-44 items-end gap-1 rounded-lg border border-border bg-base/50 p-3">
        {values.map((value: number, index: number) => (
          <div key={index} className="flex-1 rounded-t bg-accent-cyan/80" style={{ height: `${Math.max(4, (value / max) * 100)}%` }} />
        ))}
      </div>
    </Card>
  )
}

function FunnelWidget({ widget }: { widget: any }) {
  const rows = widget.current?.rows || []
  const max = Math.max(...rows.map((row: any) => n(row.eventCount)), 1)
  return (
    <Card className="rounded-lg p-4 lg:col-span-4">
      <WidgetHeader icon={TrendingDown} title={widget.config.title} rows={rows.length} />
      <div className="mt-4 space-y-3">
        {rows.map((row: any) => (
          <div key={row.eventName}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-text-secondary">{String(row.eventName).replaceAll('_', ' ')}</span>
              <span className="font-mono text-text-primary">{fmtNumber(row.eventCount)}</span>
            </div>
            <div className="h-3 rounded-full bg-base">
              <div className="h-3 rounded-full bg-accent-blue" style={{ width: `${Math.max(4, (n(row.eventCount) / max) * 100)}%` }} />
            </div>
            <p className="mt-1 text-[10px] text-text-dim">{fmtPercent(row.stepConversionRate)} step conversion</p>
          </div>
        ))}
      </div>
    </Card>
  )
}

function DonutWidget({ widget }: { widget: any }) {
  const config: Ga4WidgetConfig = widget.config
  const rows = widget.current?.rows || []
  const dimension = config.query.dimensions?.[0]
  const metric = config.query.metrics?.[0]
  const total = rows.reduce((sum: number, row: any) => sum + n(row[metric || '']), 0) || 1
  return (
    <Card className="rounded-lg p-4 lg:col-span-5">
      <WidgetHeader icon={BarChart3} title={config.title} rows={rows.length} />
      <div className="mt-4 space-y-3">
        {rows.slice(0, 6).map((row: any, index: number) => {
          const pct = (n(row[metric || '']) / total) * 100
          return (
            <div key={`${row[dimension || '']}-${index}`} className="flex items-center gap-3">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: ['#8f72ff', '#4f8ef7', '#18c7b6', '#f4c84f', '#ff8a5b', '#ff7f7f'][index % 6] }} />
              <span className="min-w-0 flex-1 truncate text-sm text-text-secondary">{row[dimension || ''] || '(not set)'}</span>
              <span className="font-mono text-xs text-text-primary">{pct.toFixed(1)}%</span>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function ScatterWidget({ widget }: { widget: any }) {
  return <TableWidget widget={widget} compact />
}

function TableWidget({ widget, compact = false }: { widget: any; compact?: boolean }) {
  const config: Ga4WidgetConfig = widget.config
  const rows = widget.current?.rows || []
  const columns = [...(config.query.dimensions || []), ...(config.query.metrics || [])]
  return (
    <Card className={`overflow-hidden rounded-lg p-0 ${compact ? 'lg:col-span-6' : 'lg:col-span-7'}`}>
      <div className="border-b border-border px-4 py-3">
        <WidgetHeader icon={Table2} title={config.title} rows={rows.length} />
      </div>
      <div className="max-h-80 overflow-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="sticky top-0 bg-card">
            <tr className="border-b border-border text-left font-mono text-[10px] uppercase tracking-wider text-text-dim">
              {columns.map((column) => <th key={column} className="px-4 py-3">{column}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any, index: number) => (
              <tr key={index} className="border-b border-border/70">
                {columns.map((column) => (
                  <td key={column} className="px-4 py-3 text-text-secondary">
                    {typeof row[column] === 'number' ? formatMetric(row[column], column.toLowerCase().includes('rate') ? 'percent' : undefined) : row[column] || '(not set)'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

function WidgetHeader({ icon: Icon, title, rows }: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string; rows: number }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Icon size={15} className="text-accent-blue" />
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      </div>
      <Badge color="#4f8ef7" variant="outline">{rows} rows</Badge>
    </div>
  )
}

function ConnectGoogleState() {
  return (
    <ClientShell>
      <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-lg border border-border bg-card shadow-[var(--shadow-card)]">
          <BarChart3 size={28} className="text-accent-purple" />
        </div>
        <h1 className="font-heading text-2xl font-semibold text-text-primary">Google Analytics is not connected</h1>
        <p className="mt-3 text-sm leading-relaxed text-text-secondary">
          Connect Google in Settings so Mission Control can list your GA4 properties and read report data through the GA4 Data API.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button variant="primary" onClick={() => (window.location.href = '/settings')}>
            <ExternalLink size={15} />
            Open Settings
          </Button>
          <Button variant="secondary" onClick={() => (window.location.href = '/api/auth/google')}>
            Connect Google
          </Button>
        </div>
      </div>
    </ClientShell>
  )
}

export default function AnalyticsPage() {
  const [properties, setProperties] = useState<Ga4Property[]>([])
  const [selectedPropertyId, setSelectedPropertyId] = useState('')
  const [presetId, setPresetId] = useState('traffic_source')
  const [dateRange, setDateRange] = useState('last_28_days')
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null)
  const [accountEmail, setAccountEmail] = useState('')
  const [loadingProperties, setLoadingProperties] = useState(false)
  const [loadingDashboard, setLoadingDashboard] = useState(false)
  const [notConnected, setNotConnected] = useState(false)

  useEffect(() => {
    async function loadProperties() {
      setLoadingProperties(true)
      try {
        const token = await getAuthToken()
        const response = await fetch('/api/integrations/google-analytics/properties', {
          cache: 'no-store',
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        })
        const payload = await response.json()
        if (
          response.status === 400 &&
          (payload.code === 'GOOGLE_ANALYTICS_NOT_CONNECTED' || payload.code === 'GOOGLE_ANALYTICS_RECONNECT_REQUIRED')
        ) {
          setNotConnected(true)
          if (payload.code === 'GOOGLE_ANALYTICS_RECONNECT_REQUIRED') {
            toast.error(payload.error || 'Reconnect Google in Settings.')
          }
          return
        }
        if (!response.ok) throw new Error(payload.error || 'Failed to load GA4 properties')
        setProperties(payload.properties || [])
        setAccountEmail(payload.accountEmail || '')
        setSelectedPropertyId(payload.properties?.[0]?.propertyId || '')
      } catch (error: any) {
        toast.error(error.message || 'Failed to load Google Analytics properties')
      } finally {
        setLoadingProperties(false)
      }
    }
    loadProperties()
  }, [])

  useEffect(() => {
    const preset = GA4_PRESETS.find((item) => item.presetId === presetId)
    if (preset) setDateRange(preset.dateRange.default)
  }, [presetId])

  async function loadDashboard() {
    if (!selectedPropertyId) return
    setLoadingDashboard(true)
    try {
      const token = await getAuthToken()
      const response = await fetch(
        `/api/integrations/google-analytics/dashboard?propertyId=${encodeURIComponent(selectedPropertyId)}&preset=${presetId}&dateRange=${dateRange}`,
        {
          cache: 'no-store',
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        }
      )
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Failed to load GA4 dashboard')
      setDashboard(payload)
    } catch (error: any) {
      toast.error(error.message || 'Failed to load Google Analytics dashboard')
    } finally {
      setLoadingDashboard(false)
    }
  }

  useEffect(() => {
    if (selectedPropertyId) loadDashboard()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPropertyId, presetId, dateRange])

  const selectedProperty = useMemo(
    () => properties.find((property) => property.propertyId === selectedPropertyId),
    [properties, selectedPropertyId]
  )

  if (notConnected) return <ConnectGoogleState />

  const kpiWidgets = dashboard?.preset.widgets.filter((widget) => widget.chartType === 'kpi') || []
  const otherWidgets = dashboard?.preset.widgets.filter((widget) => widget.chartType !== 'kpi') || []

  return (
    <ClientShell>
      <div className="mx-auto max-w-[1500px] px-5 py-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-text-dim">GA4 command center</p>
            <h1 className="mt-1 font-heading text-2xl font-semibold text-text-primary">Analytics & Intelligence</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Live Google Analytics dashboards with preset views, rule insights, and property-level data freshness.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {accountEmail ? <Badge color="#18c7b6" variant="outline">{accountEmail}</Badge> : null}
            <Button variant="secondary" onClick={loadDashboard} disabled={loadingDashboard || !selectedPropertyId}>
              <RefreshCcw size={14} className={loadingDashboard ? 'animate-spin' : ''} />
              Refresh
            </Button>
          </div>
        </div>

        <Card className="mb-5 rounded-lg p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(280px,1.4fr)_220px_180px]">
            <Select
              label="GA4 Property"
              value={selectedPropertyId}
              onChange={(event) => setSelectedPropertyId(event.target.value)}
              options={
                properties.length
                  ? properties.map((property) => ({ value: property.propertyId, label: `${property.propertyName} · ${property.account}` }))
                  : [{ value: '', label: loadingProperties ? 'Loading properties...' : 'No GA4 properties found' }]
              }
            />
            <Select
              label="Dashboard Preset"
              value={presetId}
              onChange={(event) => setPresetId(event.target.value)}
              options={GA4_PRESETS.map((preset) => ({ value: preset.presetId, label: preset.label }))}
            />
            <Select
              label="Date Range"
              value={dateRange}
              onChange={(event) => setDateRange(event.target.value)}
              options={GA4_DATE_RANGES.map((range) => ({ value: range.value, label: range.label }))}
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="text-xs text-text-secondary">{dashboard?.preset.description || 'Select a property to load live GA4 data.'}</p>
            <div className="flex flex-wrap items-center gap-2">
              {selectedProperty ? <Badge color="#4f8ef7" variant="outline">Property {selectedProperty.propertyId}</Badge> : null}
              {dashboard?.freshness ? (
                <Badge color="#f4c84f" variant="outline">
                  <Clock size={11} />
                  {dashboard.freshness.label}
                </Badge>
              ) : null}
            </div>
          </div>
        </Card>

        {loadingDashboard ? (
          <Card className="flex items-center gap-3 rounded-lg p-8 text-text-secondary">
            <Loader2 size={18} className="animate-spin text-accent-blue" />
            Loading GA4 report widgets...
          </Card>
        ) : dashboard ? (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {kpiWidgets.map((widgetConfig) => (
                <WidgetCard key={widgetConfig.id} widget={dashboard.widgets[widgetConfig.id]} />
              ))}
            </div>

            {dashboard.insights?.length ? (
              <Card className="rounded-lg p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles size={16} className="text-accent-purple" />
                  <h2 className="text-sm font-semibold text-text-primary">Rule-Based Insights</h2>
                </div>
                <div className="grid gap-3 lg:grid-cols-3">
                  {dashboard.insights.map((insight, index) => (
                    <div key={`${insight.title}-${index}`} className="rounded-lg border border-border bg-base/60 p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {insight.type === 'risk' ? <AlertTriangle size={14} className="text-accent-red" /> : <CheckCircle2 size={14} className="text-accent-green" />}
                          <p className="text-sm font-semibold text-text-primary">{insight.title}</p>
                        </div>
                        <Badge color={insight.severity === 'high' ? '#ff7f7f' : insight.severity === 'medium' ? '#f4c84f' : '#18c7b6'} variant="outline">
                          {insight.severity}
                        </Badge>
                      </div>
                      <p className="text-xs leading-relaxed text-text-secondary">{insight.evidence}</p>
                      <p className="mt-2 text-xs leading-relaxed text-accent-cyan">{insight.action}</p>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}

            <div className="grid gap-5 lg:grid-cols-12">
              {otherWidgets.map((widgetConfig) => (
                <WidgetCard key={widgetConfig.id} widget={dashboard.widgets[widgetConfig.id]} />
              ))}
            </div>
          </div>
        ) : (
          <Card className="rounded-lg p-10 text-center">
            <p className="text-sm font-medium text-text-primary">Select a GA4 property to load live analytics.</p>
            <p className="mt-1 text-xs text-text-secondary">The app reads aggregated report data through the GA4 Data API. Browser tokens are never used for GA4 calls.</p>
          </Card>
        )}
      </div>
    </ClientShell>
  )
}
