'use client'

import React, { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  Filter,
  Layers,
  LineChart,
  Loader2,
  MousePointerClick,
  RefreshCcw,
  Sparkles,
  Table2,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
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
  preset: {
    presetId: string
    label: string
    description: string
    audience?: string
    cadence?: string
    storyQuestion?: string
    widgets: Ga4WidgetConfig[]
  }
  dateRange: { value: string; label: string; startDate: string; endDate: string }
  widgets: Record<string, any>
  insights: Array<{ type: string; title: string; evidence: string; severity: string; action: string }>
  freshness: { label: string; generatedAt: string }
}

type StoryPanel = {
  label: string
  title: string
  body: string
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>
  color: string
}

type ActionInsight = {
  title: string
  evidence: string
  severity: 'low' | 'medium' | 'high'
  action: string
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

function formatMetric(value: unknown, format?: string, metricName?: string) {
  const metric = metricName?.toLowerCase() || ''
  if (format === 'currency' || metric.includes('revenue')) return fmtCurrency(value)
  if (format === 'percent' || metric.includes('rate')) return fmtPercent(value)
  if (format === 'duration' || metric.includes('duration') || metric.includes('time')) return fmtDuration(value)
  return fmtNumber(value, n(value) % 1 ? 2 : 0)
}

function metricLabel(metric: string) {
  return metric
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (value) => value.toUpperCase())
    .replace('Screen Page', 'Page')
}

function firstMetricName(widget: any) {
  return widget?.config?.query?.metrics?.[0] || ''
}

function firstMetricValue(widget: any) {
  const metric = firstMetricName(widget)
  return metric ? widget?.current?.totals?.[metric] ?? widget?.current?.rows?.[0]?.[metric] ?? 0 : 0
}

function previousMetricValue(widget: any) {
  const metric = firstMetricName(widget)
  return metric ? widget?.previous?.totals?.[metric] ?? widget?.previous?.rows?.[0]?.[metric] ?? 0 : 0
}

function delta(widget: any) {
  const previous = n(previousMetricValue(widget))
  if (!previous) return null
  return ((n(firstMetricValue(widget)) - previous) / previous) * 100
}

function getWidget(dashboard: DashboardPayload | null, id: string) {
  return dashboard?.widgets?.[id] || null
}

function metricFromWidgets(dashboard: DashboardPayload | null, metric: string) {
  if (!dashboard) return 0
  for (const widget of Object.values(dashboard.widgets)) {
    if (widget?.current?.totals?.[metric] !== undefined) return n(widget.current.totals[metric])
    if (widget?.current?.rows?.[0]?.[metric] !== undefined) return n(widget.current.rows[0][metric])
  }
  return 0
}

function rowsFromWidget(widget: any) {
  return widget?.current?.rows || []
}

function cleanLabel(value: unknown) {
  const label = String(value || '').trim()
  if (!label || label === '(not set)' || label === '(not provided)' || label === '/') return label || '(not set)'
  return label.length > 72 ? `${label.slice(0, 69)}...` : label
}

function widgetWithDimension(dashboard: DashboardPayload | null, dimension: string) {
  return Object.values(dashboard?.widgets || {}).find((widget: any) =>
    widget?.config?.query?.dimensions?.includes(dimension)
  )
}

function rowMetric(row: any, metric: string) {
  return n(row?.[metric])
}

function totalMetric(rows: any[], metric: string) {
  return rows.reduce((sum, row) => sum + rowMetric(row, metric), 0)
}

function topRowByMetric(widget: any, dimension: string, metric: string) {
  const rows = rowsFromWidget(widget)
    .filter((row: any) => cleanLabel(row?.[dimension]) !== '(not set)')
    .sort((a: any, b: any) => rowMetric(b, metric) - rowMetric(a, metric))
  const row = rows[0]
  if (!row) return null
  const total = totalMetric(rows, metric)
  const value = rowMetric(row, metric)
  return {
    row,
    label: cleanLabel(row[dimension]),
    value,
    total,
    share: total ? (value / total) * 100 : 0,
  }
}

function topOutcomeRow(widget: any, dimension: string) {
  const rawRows = rowsFromWidget(widget)
    .filter((row: any) => cleanLabel(row?.[dimension]) !== '(not set)')
  const totalSessions = totalMetric(rawRows, 'sessions')
  const rows = rawRows
    .map((row: any) => ({
      row,
      label: cleanLabel(row[dimension]),
      keyEvents: rowMetric(row, 'keyEvents'),
      revenue: rowMetric(row, 'totalRevenue'),
      sessions: rowMetric(row, 'sessions'),
      engagementRate: rowMetric(row, 'engagementRate'),
      share: totalSessions ? (rowMetric(row, 'sessions') / totalSessions) * 100 : 0,
    }))
    .sort((a: any, b: any) =>
      (b.keyEvents * 1_000_000 + b.revenue * 1_000 + b.sessions) -
      (a.keyEvents * 1_000_000 + a.revenue * 1_000 + a.sessions)
    )
  return rows[0] || null
}

function weakHighVolumeRow(widget: any, dimension: string) {
  const rows = rowsFromWidget(widget).filter((row: any) => cleanLabel(row?.[dimension]) !== '(not set)')
  if (!rows.length) return null
  const avgEngagement = rows.reduce((sum: number, row: any) => sum + rowMetric(row, 'engagementRate'), 0) / rows.length
  const totalSessions = totalMetric(rows, 'sessions')
  const minimumMeaningfulSessions = Math.max(25, Math.min(250, totalSessions * 0.05))
  const sorted = rows
    .map((row: any) => ({
      row,
      label: cleanLabel(row[dimension]),
      sessions: rowMetric(row, 'sessions'),
      engagementRate: rowMetric(row, 'engagementRate'),
      keyEvents: rowMetric(row, 'keyEvents'),
    }))
    .filter((item: any) => item.sessions >= minimumMeaningfulSessions && (item.engagementRate === 0 || item.engagementRate < Math.max(0.35, avgEngagement * 0.75)))
    .sort((a: any, b: any) => b.sessions - a.sessions)
  return sorted[0] || null
}

function strongestKpiMovement(dashboard: DashboardPayload | null) {
  const movements = Object.values(dashboard?.widgets || {})
    .filter((widget: any) => widget?.config?.chartType === 'kpi')
    .map((widget: any) => {
      const change = delta(widget)
      const metric = firstMetricName(widget)
      return change === null ? null : {
        label: widget.config.title,
        metric,
        change,
        current: firstMetricValue(widget),
        previous: previousMetricValue(widget),
      }
    })
    .filter(Boolean) as Array<{ label: string; metric: string; change: number; current: number; previous: number }>
  return movements.sort((a, b) => Math.abs(b.change) - Math.abs(a.change))[0] || null
}

function findPrimaryDimension(widget: any) {
  return widget?.config?.query?.dimensions?.find((dimension: string) => dimension !== 'date') || widget?.config?.query?.dimensions?.[0] || ''
}

function spanClass(cols: number) {
  if (cols >= 12) return 'lg:col-span-12'
  if (cols >= 8) return 'lg:col-span-8'
  if (cols >= 7) return 'lg:col-span-7'
  if (cols >= 6) return 'lg:col-span-6'
  if (cols >= 5) return 'lg:col-span-5'
  if (cols >= 4) return 'lg:col-span-4'
  return 'lg:col-span-3'
}

function dashboardIcon(presetId: string) {
  if (presetId.includes('traffic')) return Activity
  if (presetId.includes('content')) return Eye
  if (presetId.includes('conversion')) return Target
  if (presetId.includes('ecommerce')) return MousePointerClick
  if (presetId.includes('audience')) return Users
  if (presetId.includes('campaign')) return Filter
  return BarChart3
}

function outcomeDensityLabel(keyEvents: number, sessions: number) {
  if (!sessions) return 'no session base'
  const density = keyEvents / sessions
  if (density >= 1) return `${density.toFixed(2)} key events per session`
  return `${(density * 100).toFixed(1)} key-event sessions proxy`
}

function buildKeyFindings(dashboard: DashboardPayload | null): StoryPanel[] {
  if (!dashboard) return []

  const sessions = metricFromWidgets(dashboard, 'sessions')
  const activeUsers = metricFromWidgets(dashboard, 'activeUsers')
  const engagementRate = metricFromWidgets(dashboard, 'engagementRate')
  const keyEvents = metricFromWidgets(dashboard, 'keyEvents')
  const revenue = metricFromWidgets(dashboard, 'totalRevenue')
  const channelWidget = widgetWithDimension(dashboard, 'sessionDefaultChannelGroup')
  const sourceWidget = widgetWithDimension(dashboard, 'sessionSourceMedium')
  const landingWidget = widgetWithDimension(dashboard, 'landingPage')
  const pageWidget = widgetWithDimension(dashboard, 'pagePath')
  const campaignWidget = widgetWithDimension(dashboard, 'sessionCampaignName')
  const countryWidget = widgetWithDimension(dashboard, 'country')
  const deviceWidget = widgetWithDimension(dashboard, 'deviceCategory')
  const primaryWidget = channelWidget || sourceWidget || landingWidget || pageWidget || campaignWidget || countryWidget || deviceWidget
  const primaryDimension = findPrimaryDimension(primaryWidget)
  const topTraffic = primaryWidget && primaryDimension ? topRowByMetric(primaryWidget, primaryDimension, primaryWidget.config.query.metrics?.[0] || 'sessions') : null
  const topOutcome =
    (channelWidget && topOutcomeRow(channelWidget, 'sessionDefaultChannelGroup')) ||
    (landingWidget && topOutcomeRow(landingWidget, 'landingPage')) ||
    (campaignWidget && topOutcomeRow(campaignWidget, 'sessionCampaignName')) ||
    null
  const weakSegment =
    (landingWidget && weakHighVolumeRow(landingWidget, 'landingPage')) ||
    (sourceWidget && weakHighVolumeRow(sourceWidget, 'sessionSourceMedium')) ||
    (channelWidget && weakHighVolumeRow(channelWidget, 'sessionDefaultChannelGroup')) ||
    null
  const kpiMovement = strongestKpiMovement(dashboard)
  const userLabel = activeUsers || sessions

  const findings: StoryPanel[] = []

  if (sessions > 100 && keyEvents === 0) {
    findings.push({
      label: 'Tracking risk',
      title: 'Traffic is visible, but business outcomes are not',
      body: `${fmtNumber(sessions)} sessions loaded for ${dashboard.dateRange.label}, but GA4 returned 0 key events. Before judging channel quality, confirm that lead, form, call, purchase, or other business events are marked as key events.`,
      icon: AlertTriangle,
      color: '#ff7f7f',
    })
  }

  if (topTraffic) {
    findings.push({
      label: 'Traffic leader',
      title: `${topTraffic.label} is driving the most visible demand`,
      body: `${topTraffic.label} contributed ${fmtNumber(topTraffic.value)} ${metricLabel(primaryWidget?.config?.query?.metrics?.[0] || 'sessions').toLowerCase()} (${topTraffic.share.toFixed(1)}% of ranked rows). Treat this as the first place to inspect audience intent, landing message, and next step.`,
      icon: Users,
      color: '#4f8ef7',
    })
  } else {
    findings.push({
      label: 'Readout',
      title: `${fmtNumber(userLabel)} users loaded for this report`,
      body: `${dashboard.preset.label} has KPI data for ${dashboard.dateRange.label}, but the selected preset did not return a ranked segment row to explain where the result is coming from.`,
      icon: BarChart3,
      color: '#4f8ef7',
    })
  }

  if (topOutcome?.keyEvents) {
    findings.push({
      label: 'Outcome leader',
      title: `${topOutcome.label} is producing the strongest tracked outcomes`,
      body: `${topOutcome.label} generated ${fmtNumber(topOutcome.keyEvents)} key events from ${fmtNumber(topOutcome.sessions)} sessions${topOutcome.revenue ? ` and ${fmtCurrency(topOutcome.revenue)} revenue` : ''}. Use this segment as the benchmark before scaling weaker pages, channels, or campaigns.`,
      icon: CheckCircle2,
      color: '#18c7b6',
    })
  } else if (keyEvents > 0) {
    findings.push({
      label: 'Outcome signal',
      title: `${fmtNumber(keyEvents)} key events are being tracked`,
      body: `The report shows ${outcomeDensityLabel(keyEvents, sessions)} across ${fmtNumber(sessions)} sessions. Because GA4 key events can fire multiple times per session, use this as outcome density rather than a literal conversion rate.`,
      icon: Target,
      color: '#18c7b6',
    })
  }

  if (weakSegment) {
    findings.push({
      label: 'Needs attention',
      title: `${weakSegment.label} has enough traffic to justify a focused fix`,
      body: `${weakSegment.label} has ${fmtNumber(weakSegment.sessions)} sessions with ${fmtPercent(weakSegment.engagementRate)} engagement and ${fmtNumber(weakSegment.keyEvents)} key events. This is a meaningful repair target because it passes the minimum volume threshold for the selected report.`,
      icon: AlertTriangle,
      color: weakSegment.engagementRate < 0.35 ? '#ff7f7f' : '#f4c84f',
    })
  } else if (engagementRate > 0) {
    findings.push({
      label: engagementRate >= 0.55 ? 'Healthy engagement' : 'Engagement watch',
      title: engagementRate >= 0.55 ? `Engagement looks healthy at ${fmtPercent(engagementRate)}` : `Engagement needs review at ${fmtPercent(engagementRate)}`,
      body: engagementRate >= 0.55
        ? 'The dashboard-level engagement rate is above the working health threshold. Focus optimization on outcome quality and the segments that already create key events.'
        : 'The dashboard-level engagement rate is below the working health threshold. Review the top landing page and top source together for message mismatch, slow first screen, or unclear next step.',
      icon: engagementRate >= 0.55 ? CheckCircle2 : AlertTriangle,
      color: engagementRate >= 0.55 ? '#18c7b6' : '#f4c84f',
    })
  }

  if (kpiMovement) {
    findings.push({
      label: 'Trend',
      title: `${kpiMovement.label} ${kpiMovement.change >= 0 ? 'improved' : 'declined'} ${Math.abs(kpiMovement.change).toFixed(1)}%`,
      body: `${kpiMovement.label} moved from ${formatMetric(kpiMovement.previous, undefined, kpiMovement.metric)} to ${formatMetric(kpiMovement.current, undefined, kpiMovement.metric)} versus the previous comparable period. Use the segment tables below to locate which channel, page, or campaign explains the change.`,
      icon: kpiMovement.change >= 0 ? TrendingUp : TrendingDown,
      color: kpiMovement.change >= 0 ? '#18c7b6' : '#ff7f7f',
    })
  }

  if (revenue > 0) {
    findings.push({
      label: 'Revenue',
      title: `${fmtCurrency(revenue)} revenue is visible in this report`,
      body: 'Revenue is connected to the selected GA4 view, so sales-related decisions can use revenue alongside key events rather than relying on engagement alone.',
      icon: MousePointerClick,
      color: '#8f72ff',
    })
  }

  return findings.slice(0, 5)
}

function buildActionInsights(dashboard: DashboardPayload | null): ActionInsight[] {
  if (!dashboard) return []

  const insights: ActionInsight[] = []
  const sessions = metricFromWidgets(dashboard, 'sessions')
  const activeUsers = metricFromWidgets(dashboard, 'activeUsers')
  const keyEvents = metricFromWidgets(dashboard, 'keyEvents')
  const revenue = metricFromWidgets(dashboard, 'totalRevenue')
  const engagementRate = metricFromWidgets(dashboard, 'engagementRate')
  const outcomeDensity = sessions > 0 ? keyEvents / sessions : 0

  const channelWidget = widgetWithDimension(dashboard, 'sessionDefaultChannelGroup')
  const sourceWidget = widgetWithDimension(dashboard, 'sessionSourceMedium')
  const landingWidget = widgetWithDimension(dashboard, 'landingPage')
  const pageWidget = widgetWithDimension(dashboard, 'pagePath')
  const campaignWidget = widgetWithDimension(dashboard, 'sessionCampaignName')
  const countryWidget = widgetWithDimension(dashboard, 'country')
  const deviceWidget = widgetWithDimension(dashboard, 'deviceCategory')

  const topChannel = channelWidget ? topOutcomeRow(channelWidget, 'sessionDefaultChannelGroup') || topRowByMetric(channelWidget, 'sessionDefaultChannelGroup', 'sessions') : null
  const topSource = sourceWidget ? topOutcomeRow(sourceWidget, 'sessionSourceMedium') || topRowByMetric(sourceWidget, 'sessionSourceMedium', 'sessions') : null
  const topLanding = landingWidget ? topOutcomeRow(landingWidget, 'landingPage') || topRowByMetric(landingWidget, 'landingPage', 'sessions') : null
  const topPage = pageWidget ? topRowByMetric(pageWidget, 'pagePath', 'screenPageViews') : null
  const topCampaign = campaignWidget ? topOutcomeRow(campaignWidget, 'sessionCampaignName') || topRowByMetric(campaignWidget, 'sessionCampaignName', 'sessions') : null
  const topCountry = countryWidget ? topRowByMetric(countryWidget, 'country', 'activeUsers') : null
  const topDevice = deviceWidget ? topRowByMetric(deviceWidget, 'deviceCategory', 'activeUsers') : null
  const weakLanding = landingWidget ? weakHighVolumeRow(landingWidget, 'landingPage') : null
  const weakSource = sourceWidget ? weakHighVolumeRow(sourceWidget, 'sessionSourceMedium') : null
  const weakChannel = channelWidget ? weakHighVolumeRow(channelWidget, 'sessionDefaultChannelGroup') : null
  const kpiMovement = strongestKpiMovement(dashboard)
  const visibleLeader = topChannel?.label || topSource?.label || topLanding?.label || topCampaign?.label || topPage?.label

  if (topChannel?.label) {
    const channelKeyEvents = n((topChannel as any).keyEvents ?? topChannel.row?.keyEvents)
    const channelSessions = n((topChannel as any).sessions ?? topChannel.row?.sessions ?? topChannel.value)
    insights.push({
      severity: channelKeyEvents > 0 ? 'medium' : 'low',
      title: `${topChannel.label} is the primary acquisition lever`,
      evidence: `${topChannel.label} accounts for ${fmtNumber(channelSessions)} sessions${channelKeyEvents ? ` and ${fmtNumber(channelKeyEvents)} key events` : ''}${topChannel.share ? ` (${topChannel.share.toFixed(1)}% of ranked volume)` : ''}.`,
      action: channelKeyEvents > 0
        ? `Replicate the ${topChannel.label} path: review its top landing page, keep the same intent/message match, and build the next content or campaign around that pattern.`
        : `Use ${topChannel.label} for reach, but pair it with a stronger conversion path because this dashboard is not showing meaningful key events from it.`,
    })
  }

  if (topSource?.label) {
    const sourceEvents = n((topSource as any).keyEvents ?? topSource.row?.keyEvents)
    insights.push({
      severity: sourceEvents > 0 ? 'medium' : 'low',
      title: `${topSource.label} is the source/medium to inspect first`,
      evidence: `${topSource.label} shows ${fmtNumber((topSource as any).sessions ?? topSource.row?.sessions ?? topSource.value)} sessions, ${fmtNumber(sourceEvents)} key events, and ${fmtPercent((topSource as any).engagementRate ?? topSource.row?.engagementRate)} engagement.`,
      action: sourceEvents > 0
        ? `Create a source-specific follow-up: send more qualified traffic from ${topSource.label} to the same high-intent offer and protect UTMs so this signal stays measurable.`
        : `Audit ${topSource.label}'s landing-page promise. The source is visible, but the event signal is too weak to scale confidently.`,
    })
  }

  if (topLanding?.label) {
    const landingEvents = n((topLanding as any).keyEvents ?? topLanding.row?.keyEvents)
    const landingSessions = n((topLanding as any).sessions ?? topLanding.row?.sessions ?? topLanding.value)
    insights.push({
      severity: landingEvents > 0 ? 'medium' : 'low',
      title: `${topLanding.label} is the landing page with the most decision value`,
      evidence: `${topLanding.label} has ${fmtNumber(landingSessions)} sessions, ${fmtPercent((topLanding as any).engagementRate ?? topLanding.row?.engagementRate)} engagement, and ${fmtNumber(landingEvents)} key events.`,
      action: landingEvents > 0
        ? `Use ${topLanding.label} as the conversion benchmark. Mirror its headline, CTA placement, and internal links on related pages.`
        : `Improve ${topLanding.label}'s above-the-fold CTA and next-step links before sending more traffic to it.`,
    })
  } else if (topPage?.label) {
    insights.push({
      severity: 'medium',
      title: `${topPage.label} is the content page getting the most attention`,
      evidence: `${topPage.label} generated ${fmtNumber(topPage.value)} views in the selected period.`,
      action: `Add a clear next step on ${topPage.label}: product link, lead form, consultation CTA, or related article path so high attention turns into measurable action.`,
    })
  }

  const weak = weakLanding || weakSource || weakChannel
  if (weak?.label) {
    insights.push({
      severity: weak.engagementRate < 0.35 ? 'high' : 'medium',
      title: `Repair ${weak.label} before scaling traffic`,
      evidence: `${weak.label} has ${fmtNumber(weak.sessions)} sessions but only ${fmtPercent(weak.engagementRate)} engagement and ${fmtNumber(weak.keyEvents)} key events.`,
      action: `Run a focused CRO pass on ${weak.label}: align the first headline with visitor intent, move the primary CTA higher, and add one contextual internal link to the next best action.`,
    })
  }

  if (topCampaign?.label && !/^\(not set\)$/i.test(topCampaign.label)) {
    insights.push({
      severity: n((topCampaign as any).keyEvents ?? topCampaign.row?.keyEvents) > 0 ? 'medium' : 'low',
      title: `${topCampaign.label} is the campaign to brief around`,
      evidence: `${topCampaign.label} returned ${fmtNumber((topCampaign as any).sessions ?? topCampaign.row?.sessions ?? topCampaign.value)} sessions, ${fmtPercent((topCampaign as any).engagementRate ?? topCampaign.row?.engagementRate)} engagement, and ${fmtNumber((topCampaign as any).keyEvents ?? topCampaign.row?.keyEvents)} key events.`,
      action: `Use ${topCampaign.label} as the campaign review sample: compare ad promise, landing page, and tracked event path before changing budgets.`,
    })
  }

  if (topCountry?.label) {
    insights.push({
      severity: 'low',
      title: `${topCountry.label} is the audience market to prioritize`,
      evidence: `${topCountry.label} represents ${fmtNumber(topCountry.value)} active users (${topCountry.share.toFixed(1)}% of ranked country users).`,
      action: `Localize the next content/ad angle for ${topCountry.label}: use market-specific proof, currency/contact cues, and language that matches this audience segment.`,
    })
  }

  if (topDevice?.label && topDevice.share >= 55) {
    insights.push({
      severity: 'medium',
      title: `${topDevice.label} experience dominates the audience`,
      evidence: `${topDevice.label} represents ${topDevice.share.toFixed(1)}% of ranked device users.`,
      action: `Prioritize ${topDevice.label} QA before any campaign push: test first screen load, CTA visibility, form completion, and analytics event firing on that device class.`,
    })
  }

  if (kpiMovement) {
    insights.push({
      severity: Math.abs(kpiMovement.change) >= 25 ? 'high' : 'medium',
      title: `${kpiMovement.label} ${kpiMovement.change >= 0 ? 'rose' : 'fell'} ${Math.abs(kpiMovement.change).toFixed(1)}%`,
      evidence: `${kpiMovement.label} moved from ${formatMetric(kpiMovement.previous, undefined, kpiMovement.metric)} to ${formatMetric(kpiMovement.current, undefined, kpiMovement.metric)} versus the previous comparable period.`,
      action: kpiMovement.change >= 0
        ? `Use ${visibleLeader || kpiMovement.label} as the follow-up experiment anchor and repeat the same source/page/campaign pattern in one controlled test.`
        : `Start the recovery review with ${visibleLeader || kpiMovement.label}; compare its landing-page promise and event path before changing acquisition spend.`,
    })
  }

  if (sessions > 100 && keyEvents === 0) {
    insights.unshift({
      severity: 'high',
      title: 'Conversion tracking is blocking decision quality',
      evidence: `${fmtNumber(sessions)} sessions are loaded, but GA4 returned 0 key events for this dashboard.`,
      action: 'Verify GA4 key events for forms, calls, purchases, and lead actions before judging channel quality. Without this, the dashboard can rank traffic but not business impact.',
    })
  } else if (sessions > 0 && keyEvents > 0) {
    insights.push({
      severity: outcomeDensity >= 0.03 ? 'medium' : 'low',
      title: `${fmtNumber(keyEvents)} key events define the current outcome baseline`,
      evidence: `${fmtNumber(keyEvents)} key events came from ${fmtNumber(sessions)} sessions${revenue ? ` with ${fmtCurrency(revenue)} tracked revenue` : ''}.`,
      action: `Use ${outcomeDensityLabel(keyEvents, sessions)} as the current outcome-density benchmark. Compare channels, pages, and campaigns against this before deciding what to scale or repair.`,
    })
  }

  if (activeUsers > 0 && sessions > 0 && sessions / activeUsers < 1.15) {
    insights.push({
      severity: 'low',
      title: 'Return behavior is shallow',
      evidence: `Sessions per active user is ${(sessions / activeUsers).toFixed(2)}, which means most users are not returning within the selected window.`,
      action: 'Add return paths on the top page: email capture, remarketing audience, related-content block, and a clear reason to come back.',
    })
  }

  if (engagementRate > 0 && engagementRate < 0.55) {
    insights.push({
      severity: engagementRate < 0.45 ? 'high' : 'medium',
      title: `Engagement is below target at ${fmtPercent(engagementRate)}`,
      evidence: `The dashboard-level engagement rate is ${fmtPercent(engagementRate)} across the selected period.`,
      action: weak?.label
        ? `Start with ${weak.label}, because it combines traffic volume with weak engagement.`
        : 'Review the top landing page and top traffic source together; the issue is usually message mismatch, slow first screen, or unclear next step.',
    })
  }

  const seen = new Set<string>()
  return insights
    .filter((insight) => {
      const key = `${insight.title}-${insight.evidence}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 7)
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

function KpiWidget({ widget }: { widget: any }) {
  const config: Ga4WidgetConfig = widget.config
  const change = delta(widget)
  const value = firstMetricValue(widget)
  const metric = firstMetricName(widget)
  const up = (change || 0) >= 0
  const Icon = metric.includes('user') ? Users : metric.includes('event') ? Target : metric.includes('revenue') ? MousePointerClick : BarChart3

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-dim">{config.title}</p>
          <p className="mt-2 font-heading text-3xl font-semibold text-text-primary">{formatMetric(value, config.viz?.valueFormat, metric)}</p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-base text-accent-blue">
          <Icon size={18} />
        </span>
      </div>
      {change !== null ? (
        <div className={`mt-4 flex items-center gap-1 text-xs ${up ? 'text-accent-green' : 'text-accent-red'}`}>
          {up ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          {Math.abs(change).toFixed(1)}% vs previous period
        </div>
      ) : (
        <p className="mt-4 text-xs text-text-secondary">Previous comparison unavailable</p>
      )}
    </div>
  )
}

function WidgetHeader({ icon: Icon, title, rows, story }: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string; rows: number; story?: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <Icon size={15} className="text-accent-blue" />
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        </div>
        {story ? <p className="mt-1 text-xs leading-relaxed text-text-secondary">{story}</p> : null}
      </div>
      <Badge color="#4f8ef7" variant="outline">{rows} rows</Badge>
    </div>
  )
}

function ChartShell({ widget, icon: Icon, children }: { widget: any; icon: React.ComponentType<{ size?: number; className?: string }>; children: React.ReactNode }) {
  const config: Ga4WidgetConfig = widget.config
  const rows = rowsFromWidget(widget)
  return (
    <div className={`rounded-lg border border-border bg-card shadow-[var(--shadow-soft)] ${spanClass(config.gridSpan.cols)}`}>
      <div className="border-b border-border px-4 py-3">
        <WidgetHeader icon={Icon} title={config.title} rows={rows.length} story={config.viz?.story} />
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function BarWidget({ widget }: { widget: any }) {
  const config: Ga4WidgetConfig = widget.config
  const rows = rowsFromWidget(widget)
  const dimension = config.query.dimensions?.[0]
  const metric = config.query.metrics?.[0]
  const max = Math.max(...rows.map((row: any) => n(row[metric || ''])), 1)

  return (
    <ChartShell widget={widget} icon={BarChart3}>
      <div className="space-y-3">
        {rows.slice(0, 10).map((row: any, index: number) => {
          const value = n(row[metric || ''])
          return (
            <div key={`${row[dimension || 'label']}-${index}`}>
              <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                <span className="truncate text-text-secondary">{row[dimension || ''] || '(not set)'}</span>
                <span className="font-mono text-text-primary">{formatMetric(value, config.viz?.valueFormat, metric)}</span>
              </div>
              <div className="h-2 rounded-full bg-base">
                <div className="h-2 rounded-full bg-accent-blue" style={{ width: `${Math.max(3, (value / max) * 100)}%` }} />
              </div>
            </div>
          )
        })}
        {!rows.length ? <EmptyWidget /> : null}
      </div>
    </ChartShell>
  )
}

function LineWidget({ widget }: { widget: any }) {
  const config: Ga4WidgetConfig = widget.config
  const rows = rowsFromWidget(widget)
  const metric = config.query.metrics?.[0]
  const values = rows.slice(-42).map((row: any) => n(row[metric || '']))
  const max = Math.max(...values, 1)
  const last = values[values.length - 1] || 0
  const first = values[0] || 0
  const movement = first ? ((last - first) / first) * 100 : 0

  return (
    <ChartShell widget={widget} icon={LineChart}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-text-secondary">
          {values.length ? `${movement >= 0 ? 'Up' : 'Down'} ${Math.abs(movement).toFixed(1)}% from first visible point` : 'No trend points returned'}
        </p>
        <Badge color={movement >= 0 ? '#18c7b6' : '#ff7f7f'} variant="outline">{metricLabel(metric || 'metric')}</Badge>
      </div>
      <div className="flex h-48 items-end gap-1 rounded-md border border-border bg-base/50 p-3">
        {values.map((value: number, index: number) => (
          <div
            key={index}
            className="flex-1 rounded-t bg-accent-cyan/80 transition-all hover:bg-accent-blue"
            style={{ height: `${Math.max(4, (value / max) * 100)}%` }}
            title={`${metric}: ${formatMetric(value, config.viz?.valueFormat, metric)}`}
          />
        ))}
      </div>
      {!values.length ? <EmptyWidget /> : null}
    </ChartShell>
  )
}

function FunnelWidget({ widget }: { widget: any }) {
  const rows = rowsFromWidget(widget)
  const max = Math.max(...rows.map((row: any) => n(row.eventCount)), 1)
  return (
    <ChartShell widget={widget} icon={TrendingDown}>
      <div className="space-y-3">
        {rows.map((row: any, index: number) => (
          <div key={`${row.eventName}-${index}`}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-text-secondary">{String(row.eventName).replaceAll('_', ' ')}</span>
              <span className="font-mono text-text-primary">{fmtNumber(row.eventCount)}</span>
            </div>
            <div className="h-3 rounded-full bg-base">
              <div className="h-3 rounded-full bg-accent-purple" style={{ width: `${Math.max(4, (n(row.eventCount) / max) * 100)}%` }} />
            </div>
            <p className="mt-1 text-[10px] text-text-dim">{fmtPercent(row.stepConversionRate)} step conversion</p>
          </div>
        ))}
        {!rows.length ? <EmptyWidget /> : null}
      </div>
    </ChartShell>
  )
}

function DonutWidget({ widget }: { widget: any }) {
  const config: Ga4WidgetConfig = widget.config
  const rows = rowsFromWidget(widget)
  const dimension = config.query.dimensions?.[0]
  const metric = config.query.metrics?.[0]
  const total = rows.reduce((sum: number, row: any) => sum + n(row[metric || '']), 0) || 1
  const palette = ['#4f8ef7', '#18c7b6', '#8f72ff', '#f4c84f', '#ff8a5b', '#ff7f7f']

  return (
    <ChartShell widget={widget} icon={Layers}>
      <div className="space-y-3">
        {rows.slice(0, 6).map((row: any, index: number) => {
          const pct = (n(row[metric || '']) / total) * 100
          return (
            <div key={`${row[dimension || '']}-${index}`} className="grid grid-cols-[14px_1fr_56px] items-center gap-3">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: palette[index % palette.length] }} />
              <div className="min-w-0">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-sm text-text-secondary">{row[dimension || ''] || '(not set)'}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-base">
                  <div className="h-1.5 rounded-full" style={{ width: `${Math.max(3, pct)}%`, backgroundColor: palette[index % palette.length] }} />
                </div>
              </div>
              <span className="text-right font-mono text-xs text-text-primary">{pct.toFixed(1)}%</span>
            </div>
          )
        })}
        {!rows.length ? <EmptyWidget /> : null}
      </div>
    </ChartShell>
  )
}

function ScatterWidget({ widget }: { widget: any }) {
  return <TableWidget widget={widget} compact />
}

function TableWidget({ widget, compact = false }: { widget: any; compact?: boolean }) {
  const config: Ga4WidgetConfig = widget.config
  const rows = rowsFromWidget(widget)
  const columns = [...(config.query.dimensions || []), ...(config.query.metrics || [])]

  return (
    <div className={`overflow-hidden rounded-lg border border-border bg-card shadow-[var(--shadow-soft)] ${compact ? 'lg:col-span-5' : spanClass(config.gridSpan.cols)}`}>
      <div className="border-b border-border px-4 py-3">
        <WidgetHeader icon={Table2} title={config.title} rows={rows.length} story={config.viz?.story} />
      </div>
      <div className="max-h-96 overflow-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="sticky top-0 bg-card">
            <tr className="border-b border-border text-left font-mono text-[10px] uppercase tracking-wider text-text-dim">
              {columns.map((column) => <th key={column} className="px-4 py-3">{metricLabel(column)}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any, index: number) => (
              <tr key={index} className="border-b border-border/70 transition-colors hover:bg-base/60">
                {columns.map((column) => (
                  <td key={column} className="px-4 py-3 text-text-secondary">
                    {typeof row[column] === 'number' ? formatMetric(row[column], column.toLowerCase().includes('rate') ? 'percent' : undefined, column) : row[column] || '(not set)'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length ? <div className="p-4"><EmptyWidget /></div> : null}
      </div>
    </div>
  )
}

function EmptyWidget() {
  return <p className="rounded-md border border-dashed border-border bg-base/50 p-3 text-xs text-text-secondary">No rows returned for this widget in the selected period.</p>
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

function InsightRail({ dashboard, accountEmail, loading }: { dashboard: DashboardPayload | null; accountEmail: string; loading: boolean }) {
  const findings = buildKeyFindings(dashboard)
  const insights = buildActionInsights(dashboard)
  return (
    <aside className="space-y-4 lg:sticky lg:top-5 lg:self-start">
      <div className="rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-accent-purple/15 text-accent-purple">
            <Sparkles size={17} />
          </span>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim">AI powered analysis</p>
            <h2 className="text-base font-semibold text-text-primary">Decision readout</h2>
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-text-secondary">
          {loading
            ? 'Waiting for GA4 rows to finish loading before analysis is generated.'
            : dashboard
              ? `Analyzed ${Object.keys(dashboard.widgets || {}).length} live GA4 widgets for ${dashboard.dateRange.label}.`
              : 'Select a GA4 property to generate live analysis.'}
        </p>
        {accountEmail ? <Badge color="#18c7b6" variant="outline" className="mt-3">{accountEmail}</Badge> : null}
      </div>

      <div className="rounded-lg border border-border bg-card p-3 shadow-[var(--shadow-soft)]">
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <h3 className="text-sm font-semibold text-text-primary">Key findings</h3>
          <Badge color="#4f8ef7" variant="outline">{findings.length || 0}</Badge>
        </div>
        {loading ? (
          <div className="flex items-center gap-3 rounded-md border border-border bg-base/50 p-4 text-sm text-text-secondary">
            <Loader2 size={16} className="animate-spin text-accent-blue" />
            Analyzing channels, pages, events, and trends...
          </div>
        ) : dashboard ? (
          <div className="space-y-2">
            {findings.map((finding) => {
              const Icon = finding.icon
              return (
                <div key={`${finding.label}-${finding.title}`} className="rounded-md border border-border bg-base/50 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon size={14} style={{ color: finding.color }} />
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-dim">{finding.label}</p>
                    </div>
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: finding.color }} />
                  </div>
                  <p className="text-sm font-semibold leading-snug text-text-primary">{finding.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-text-secondary">{finding.body}</p>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="rounded-md border border-dashed border-border bg-base/50 p-4 text-xs leading-relaxed text-text-secondary">
            The analysis rail will populate after a GA4 property and dashboard preset load.
          </p>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-text-primary">Recommended actions</h3>
          <Badge color="#8f72ff" variant="outline">{insights.length || 0}</Badge>
        </div>
        <div className="space-y-3">
          {insights.length ? insights.slice(0, 6).map((insight, index) => (
            <div key={`${insight.title}-${index}`} className="border-l-2 pl-3" style={{ borderColor: insight.severity === 'high' ? '#ff7f7f' : insight.severity === 'medium' ? '#f4c84f' : '#18c7b6' }}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-text-primary">{insight.title}</p>
                <span className="font-mono text-[10px] uppercase tracking-wider text-text-dim">{insight.severity}</span>
              </div>
              <p className="text-xs leading-relaxed text-accent-cyan">{insight.action}</p>
              <p className="mt-1 text-xs leading-relaxed text-text-secondary">{insight.evidence}</p>
            </div>
          )) : (
            <p className="text-xs leading-relaxed text-text-secondary">
              {loading ? 'Recommendations will appear after GA4 data finishes loading.' : 'No segment-level recommendation is available yet for the selected dashboard.'}
            </p>
          )}
        </div>
      </div>
    </aside>
  )
}

export default function AnalyticsPage() {
  const [properties, setProperties] = useState<Ga4Property[]>([])
  const [selectedPropertyId, setSelectedPropertyId] = useState('')
  const [presetId, setPresetId] = useState('executive_overview')
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
          if (payload.code === 'GOOGLE_ANALYTICS_RECONNECT_REQUIRED') toast.error(payload.error || 'Reconnect Google in Settings.')
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
      if (response.status === 400 && payload.code === 'GOOGLE_ANALYTICS_RECONNECT_REQUIRED') {
        setNotConnected(true)
        setDashboard(null)
        toast.error(payload.error || 'Reconnect Google in Settings.')
        return
      }
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

  const selectedPreset = useMemo(() => GA4_PRESETS.find((preset) => preset.presetId === presetId) || GA4_PRESETS[0], [presetId])

  const kpiWidgets = dashboard?.preset.widgets.filter((widget) => widget.chartType === 'kpi') || []
  const otherWidgets = dashboard?.preset.widgets.filter((widget) => widget.chartType !== 'kpi') || []
  const HeroIcon = dashboardIcon(presetId)

  if (notConnected) return <ConnectGoogleState />

  return (
    <ClientShell>
      <div className="mx-auto max-w-[1680px] px-4 py-5 lg:px-6">
        <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
          <InsightRail dashboard={dashboard} accountEmail={accountEmail} loading={loadingDashboard || loadingProperties} />

          <main className="min-w-0 space-y-5">
            <section className="rounded-lg border border-border bg-card p-5 shadow-[var(--shadow-card)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 gap-4">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-border bg-base text-accent-blue">
                    <HeroIcon size={26} />
                  </span>
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-text-dim">GA4 storytelling dashboard</p>
                    <h1 className="mt-1 font-heading text-3xl font-semibold text-text-primary">{dashboard?.preset.label || selectedPreset.label}</h1>
                    <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text-secondary">
                      {dashboard?.preset.storyQuestion || selectedPreset.storyQuestion}
                    </p>
                  </div>
                </div>
                <Button variant="secondary" onClick={loadDashboard} disabled={loadingDashboard || !selectedPropertyId}>
                  <RefreshCcw size={14} className={loadingDashboard ? 'animate-spin' : ''} />
                  Refresh
                </Button>
              </div>

              <div className="mt-5 grid gap-3 xl:grid-cols-[minmax(280px,1.45fr)_240px_190px]">
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
                  label="Dashboard Story"
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

              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <div className="rounded-md border border-border bg-base/50 p-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-dim">Audience</p>
                  <p className="mt-1 text-sm font-semibold text-text-primary">{dashboard?.preset.audience || selectedPreset.audience}</p>
                </div>
                <div className="rounded-md border border-border bg-base/50 p-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-dim">Cadence</p>
                  <p className="mt-1 text-sm font-semibold text-text-primary">{dashboard?.preset.cadence || selectedPreset.cadence}</p>
                </div>
                <div className="rounded-md border border-border bg-base/50 p-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-dim">Property</p>
                  <p className="mt-1 truncate text-sm font-semibold text-text-primary">{selectedProperty?.propertyName || 'Select a property'}</p>
                </div>
                <div className="rounded-md border border-border bg-base/50 p-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-dim">Freshness</p>
                  <p className="mt-1 text-sm font-semibold text-text-primary">{dashboard?.freshness?.label || 'Waiting for GA4 data'}</p>
                </div>
              </div>
            </section>

            {loadingDashboard ? (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-8 text-text-secondary shadow-[var(--shadow-soft)]">
                <Loader2 size={18} className="animate-spin text-accent-blue" />
                Loading GA4 story widgets...
              </div>
            ) : dashboard ? (
              <div className="space-y-5">
                <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {kpiWidgets.map((widgetConfig) => (
                    <WidgetCard key={widgetConfig.id} widget={dashboard.widgets[widgetConfig.id]} />
                  ))}
                </section>

                <section className="rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim">Key findings</p>
                      <h2 className="text-base font-semibold text-text-primary">What the report is saying</h2>
                    </div>
                    <Badge color="#4f8ef7" variant="outline">
                      <Clock size={11} />
                      {dashboard.dateRange.label}
                    </Badge>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    {buildKeyFindings(dashboard).slice(0, 4).map((panel) => {
                      const Icon = panel.icon
                      return (
                        <div key={panel.label} className="rounded-md border border-border bg-base/50 p-3">
                          <div className="mb-2 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <Icon size={14} style={{ color: panel.color }} />
                              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-dim">{panel.label}</p>
                            </div>
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: panel.color }} />
                          </div>
                          <p className="text-sm font-semibold leading-snug text-text-primary">{panel.title}</p>
                        </div>
                      )
                    })}
                  </div>
                </section>

                <section className="grid gap-5 lg:grid-cols-12">
                  {otherWidgets.map((widgetConfig) => (
                    <WidgetCard key={widgetConfig.id} widget={dashboard.widgets[widgetConfig.id]} />
                  ))}
                </section>
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-card p-10 text-center shadow-[var(--shadow-soft)]">
                <p className="text-sm font-medium text-text-primary">Select a GA4 property to load live analytics.</p>
                <p className="mt-1 text-xs text-text-secondary">The app reads aggregated report data through the GA4 Data API. Browser tokens are never used for GA4 calls.</p>
              </div>
            )}
          </main>
        </div>
      </div>
    </ClientShell>
  )
}
