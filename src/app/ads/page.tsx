'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  BarChart3,
  ChevronRight,
  CheckCircle2,
  DollarSign,
  Eye,
  Filter,
  Layers3,
  Loader2,
  MousePointerClick,
  RefreshCcw,
  Search,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  Video,
  Wand2,
  Zap,
} from 'lucide-react'

import { ClientShell } from '@/components/ClientShell'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Select } from '@/components/ui/Input'
import { toast } from '@/components/ui/Toast'
import { getAuthToken } from '@/lib/auth/browser'
import {
  META_MARKET_OPTIONS,
  analyzeMetaCampaign,
  getMetaCountryBenchmark,
  mapMetaObjectiveToFamily,
  type MetaMarketCode,
  type MetaOptimizationSuggestion,
} from '@/lib/meta-ads-intelligence'

interface AdAccount {
  id: string
  account_id?: string
  name: string
  account_status: number
  currency: string
  timezone_name: string
}

interface MetaCampaign {
  id: string
  name: string
  objective?: string
  status?: string
  effective_status?: string
  configured_status?: string
  daily_budget?: string
  lifetime_budget?: string
  start_time?: string
  stop_time?: string
  created_time?: string
  updated_time?: string
  buying_type?: string
}

interface CampaignInsight {
  campaign_id: string
  campaign_name: string
  date_start?: string
  date_stop?: string
  impressions?: string
  clicks?: string
  unique_clicks?: string
  spend?: string
  cpm?: string
  cpc?: string
  ctr?: string
  reach?: string
  frequency?: string
  conversions?: string | number
  leads?: string | number
  lead_action_type?: string | null
  purchases?: string | number
  purchase_value?: string | number
  purchase_action_type?: string | null
  roas?: string | number
  add_to_cart?: string | number
  checkout_initiations?: string | number
  app_installs?: string | number
  messages?: string | number
  page_views?: string | number
  post_engagements?: string | number
  video_views?: string | number
  conversion_rate?: string
  cost_per_conversion?: string
  cost_per_lead?: string
  engagement_rate?: string
  cost_per_engagement?: string
  cost_per_video_view?: string
  inline_link_clicks?: string | number
  inline_link_click_ctr?: string
  cost_per_inline_link_click?: string
  link_clicks_action?: string | number
}

interface AccountSummary {
  impressions?: string
  clicks?: string
  spend?: string
  cpm?: string
  cpc?: string
  ctr?: string
  reach?: string
  frequency?: string
  conversions?: string | number
  leads?: string | number
  purchases?: string | number
  purchase_value?: string | number
  roas?: string | number
}

interface CampaignDetails {
  campaign: MetaCampaign
  insight: CampaignInsight | null
  dailyBreakdown?: CampaignInsight[]
  activeDelivery?: {
    firstDate: string | null
    lastDate: string | null
    daysWithSpend: number
    spend: string
  } | null
  adsets: Array<Record<string, any>>
  ads: Array<Record<string, any>>
  creatives: Array<Record<string, any>>
  dateRange?: { since: string; until: string }
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
  ruleFindings?: any[]
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
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'ended', label: 'Ended' },
  { value: 'other', label: 'Other' },
]

function num(value: unknown) {
  const parsed = Number.parseFloat(String(value ?? 0))
  return Number.isFinite(parsed) ? parsed : 0
}

function fmt(value: unknown, digits = 0) {
  const parsed = num(value)
  if (parsed >= 1_000_000) return `${(parsed / 1_000_000).toFixed(1)}M`
  if (parsed >= 1_000) return `${(parsed / 1_000).toFixed(1)}K`
  return parsed.toFixed(digits)
}

function fmtCurrency(value: unknown, currency = 'USD', digits = 0) {
  const parsed = num(value)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(parsed)
}

function percent(value: unknown) {
  return `${num(value).toFixed(2)}%`
}

function roasValue(insight: CampaignInsight | null | undefined) {
  const direct = num(insight?.roas)
  if (direct > 0) return direct
  const spend = num(insight?.spend)
  const value = num(insight?.purchase_value)
  return spend > 0 && value > 0 ? value / spend : 0
}

function fmtRoas(value: unknown) {
  const parsed = num(value)
  return parsed > 0 ? `${parsed.toFixed(2)}x` : 'Not tracked'
}

function rate(numerator: unknown, denominator: unknown) {
  const top = num(numerator)
  const bottom = num(denominator)
  return bottom > 0 ? `${((top / bottom) * 100).toFixed(2)}%` : '0.00%'
}

function costPerAction(spend: unknown, actions: unknown, fallback?: unknown) {
  const spendValue = num(spend)
  const actionCount = num(actions)
  return actionCount > 0 ? spendValue / actionCount : num(fallback)
}

function budget(value?: string) {
  if (!value) return 'Not set'
  return fmtCurrency(num(value) / 100)
}

function shortDate(value?: string | null) {
  if (!value) return 'Not set'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(date)
}

function dateRangeLabel(range?: { since?: string; until?: string } | null) {
  if (!range?.since || !range?.until) return 'Selected period'
  return `${shortDate(range.since)}-${shortDate(range.until)}`
}

function isEnded(campaign: MetaCampaign) {
  return Boolean(campaign.stop_time && new Date(campaign.stop_time).getTime() < Date.now())
}

function campaignStatus(campaign: MetaCampaign) {
  const effective = String(campaign.effective_status || '').toLowerCase()
  const configured = String(campaign.configured_status || campaign.status || '').toLowerCase()
  const raw = effective || configured
  if (isEnded(campaign) || ['completed', 'ended'].includes(raw)) return 'ended'
  if (raw === 'active') return 'active'
  if (raw.includes('paused')) return 'paused'
  if (['deleted', 'archived'].includes(raw)) return 'ended'
  return raw || 'unknown'
}

function campaignStatusGroup(campaign: MetaCampaign) {
  const status = campaignStatus(campaign)
  if (status === 'active' || status === 'paused' || status === 'ended') return status
  return 'other'
}

function statusBadgeColor(status: string) {
  if (status === 'active') return '#2ecf91'
  if (status === 'paused') return '#f4c84f'
  if (status === 'ended') return '#93a1b5'
  return '#8f72ff'
}

function priorityColor(priority: string) {
  if (priority === 'critical' || priority === 'high') return '#ff7f7f'
  if (priority === 'medium') return '#f4c84f'
  return '#18c7b6'
}

function typeColor(type: string) {
  if (type === 'error') return '#ff7f7f'
  if (type === 'warning') return '#f4c84f'
  if (type === 'success') return '#18c7b6'
  return '#4f8ef7'
}

type CampaignMetric = {
  key: string
  label: string
  value: string
  sub?: string
  color: string
  tone?: MetricTone
}

type MetricTone = 'good' | 'watch' | 'risk' | 'neutral'

type MetaStoryPanel = {
  label: string
  title: string
  body: string
  color: string
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>
}

type MetaActionInsight = {
  title: string
  evidence: string
  action: string
  severity: 'low' | 'medium' | 'high'
}

function toneColor(tone: MetricTone = 'neutral') {
  if (tone === 'good') return '#18c7b6'
  if (tone === 'watch') return '#f4c84f'
  if (tone === 'risk') return '#ff7f7f'
  return '#4f8ef7'
}

function compactMetric({
  label,
  value,
  sub,
  color,
  tone = 'neutral',
}: {
  label: string
  value: string
  sub?: string
  color?: string
  tone?: MetricTone
}) {
  return { key: label, label, value, sub, color: color || toneColor(tone), tone }
}

function objectiveResultMetric(insight: CampaignInsight | null | undefined, objectiveFamily: string, currency: string): CampaignMetric {
  if (objectiveFamily === 'leads') {
    const costPerLead = costPerAction(insight?.spend, insight?.leads, insight?.cost_per_lead)
    return compactMetric({
      label: 'Leads',
      value: fmt(insight?.leads),
      sub: `${fmtCurrency(costPerLead, currency, 2)} cost / lead`,
      tone: num(insight?.leads) > 0 ? 'good' : 'risk',
    })
  }
  if (objectiveFamily === 'engagement') {
    return compactMetric({
      label: 'Engagements',
      value: fmt(insight?.post_engagements),
      sub: `${fmtCurrency(insight?.cost_per_engagement, currency, 2)} cost / engagement`,
      tone: num(insight?.post_engagements) > 0 ? 'good' : 'watch',
    })
  }
  if (objectiveFamily === 'traffic') {
    const linkClicks = num(insight?.inline_link_clicks) || num(insight?.link_clicks_action) || num(insight?.clicks)
    return compactMetric({
      label: 'Link Clicks',
      value: fmt(linkClicks),
      sub: `${fmtCurrency(insight?.cost_per_inline_link_click || insight?.cpc, currency, 2)} cost / click`,
      tone: linkClicks > 0 ? 'good' : 'watch',
    })
  }
  if (objectiveFamily === 'app_promotion') {
    const appEvents = num(insight?.app_installs) || num(insight?.conversions) || num(insight?.purchases)
    return compactMetric({
      label: 'App Installs',
      value: fmt(appEvents),
      sub: `${fmtCurrency(insight?.cost_per_conversion, currency, 2)} cost / event`,
      tone: appEvents > 0 ? 'good' : 'watch',
    })
  }
  if (objectiveFamily === 'awareness') {
    return compactMetric({
      label: 'Result Reach',
      value: fmt(insight?.reach),
      sub: `${fmtCurrency(insight?.cpm, currency, 2)} CPM`,
      tone: num(insight?.reach) > 0 ? 'good' : 'neutral',
    })
  }
  const purchases = num(insight?.purchases) || num(insight?.conversions)
  return compactMetric({
    label: 'Purchases',
    value: fmt(purchases),
    sub: `${fmtCurrency(costPerAction(insight?.spend, purchases, insight?.cost_per_conversion), currency, 2)} cost / purchase`,
    tone: purchases > 0 ? 'good' : 'risk',
  })
}

function campaignKpiMetrics(
  insight: CampaignInsight | null | undefined,
  objectiveFamily: string,
  currency: string
): CampaignMetric[] {
  const clicks = num(insight?.inline_link_clicks) || num(insight?.link_clicks_action) || num(insight?.clicks)
  const leads = num(insight?.leads)
  const conversions = num(insight?.conversions)
  const purchases = num(insight?.purchases) || conversions
  const purchaseValue = num(insight?.purchase_value)
  const roas = roasValue(insight)
  const engagements = num(insight?.post_engagements)
  const videoViews = num(insight?.video_views)
  const appInstalls = num(insight?.app_installs) || conversions
  const costPerLead = costPerAction(insight?.spend, leads, insight?.cost_per_lead)
  const costPerPurchase = costPerAction(insight?.spend, purchases, insight?.cost_per_conversion)

  const byObjective: Record<string, CampaignMetric[]> = {
    leads: [
      objectiveResultMetric(insight, 'leads', currency),
      compactMetric({ label: 'Cost / Lead', value: fmtCurrency(costPerLead, currency, 2), sub: 'Spend divided by leads', tone: leads > 0 && costPerLead > 0 ? 'good' : 'risk' }),
      compactMetric({ label: 'Lead Rate', value: rate(leads, clicks), sub: `${fmt(clicks)} clicks`, tone: clicks > 0 && leads / clicks >= 0.05 ? 'good' : leads > 0 ? 'watch' : 'risk' }),
      compactMetric({ label: 'Link Clicks', value: fmt(clicks), sub: percent(insight?.ctr), tone: clicks > 0 ? 'neutral' : 'watch' }),
      compactMetric({ label: 'CPC', value: fmtCurrency(insight?.cpc, currency, 2), sub: 'Traffic cost', tone: num(insight?.cpc) > 1 ? 'watch' : 'neutral' }),
      compactMetric({ label: 'CPM', value: fmtCurrency(insight?.cpm, currency, 2), sub: 'Auction cost', tone: 'neutral' }),
    ],
    engagement: [
      objectiveResultMetric(insight, 'engagement', currency),
      compactMetric({ label: 'Cost / Engage', value: fmtCurrency(insight?.cost_per_engagement, currency, 2), sub: 'Engagement efficiency', tone: num(insight?.cost_per_engagement) > 0.2 ? 'watch' : engagements > 0 ? 'good' : 'neutral' }),
      compactMetric({ label: 'Engagement Rate', value: percent(insight?.engagement_rate), sub: `${fmt(engagements)} engagements`, tone: num(insight?.engagement_rate) >= 2 ? 'good' : engagements > 0 ? 'watch' : 'risk' }),
      compactMetric({ label: 'Video Views', value: fmt(videoViews), sub: `${fmtCurrency(insight?.cost_per_video_view, currency, 3)} cost / view`, tone: videoViews > 0 ? 'good' : 'neutral' }),
      compactMetric({ label: 'CTR', value: percent(insight?.ctr), sub: `${fmt(clicks)} clicks`, tone: num(insight?.ctr) >= 2 ? 'good' : 'neutral' }),
      compactMetric({ label: 'Frequency', value: fmt(insight?.frequency, 2), sub: 'Fatigue signal', tone: num(insight?.frequency) > 3.5 ? 'risk' : num(insight?.frequency) > 2.8 ? 'watch' : 'neutral' }),
    ],
    traffic: [
      objectiveResultMetric(insight, 'traffic', currency),
      compactMetric({ label: 'Cost / Link Click', value: fmtCurrency(insight?.cost_per_inline_link_click || insight?.cpc, currency, 2), sub: 'Traffic efficiency', tone: num(insight?.cost_per_inline_link_click || insight?.cpc) <= 0.5 ? 'good' : 'watch' }),
      compactMetric({ label: 'CTR', value: percent(insight?.inline_link_click_ctr || insight?.ctr), sub: 'Click quality', tone: num(insight?.inline_link_click_ctr || insight?.ctr) >= 2 ? 'good' : 'neutral' }),
      compactMetric({ label: 'Landing Views', value: fmt(insight?.page_views), sub: 'Detected page views', tone: num(insight?.page_views) > 0 ? 'good' : 'watch' }),
      compactMetric({ label: 'CPC', value: fmtCurrency(insight?.cpc, currency, 2), sub: 'All clicks', tone: 'neutral' }),
      compactMetric({ label: 'CPM', value: fmtCurrency(insight?.cpm, currency, 2), sub: 'Auction cost', tone: 'neutral' }),
    ],
    awareness: [
      objectiveResultMetric(insight, 'awareness', currency),
      compactMetric({ label: 'CPM', value: fmtCurrency(insight?.cpm, currency, 2), sub: 'Reach efficiency', tone: num(insight?.cpm) <= 7 ? 'good' : 'watch' }),
      compactMetric({ label: 'Frequency', value: fmt(insight?.frequency, 2), sub: 'Exposure depth', tone: num(insight?.frequency) > 3.5 ? 'risk' : num(insight?.frequency) >= 1.8 ? 'good' : 'neutral' }),
      compactMetric({ label: 'CTR', value: percent(insight?.ctr), sub: 'Creative pull', tone: num(insight?.ctr) >= 2 ? 'good' : 'neutral' }),
      compactMetric({ label: 'Video Views', value: fmt(videoViews), sub: 'Attention signal', tone: videoViews > 0 ? 'good' : 'neutral' }),
      compactMetric({ label: 'Cost / View', value: fmtCurrency(insight?.cost_per_video_view, currency, 3), sub: 'Video efficiency', tone: num(insight?.cost_per_video_view) > 0.05 ? 'watch' : 'neutral' }),
    ],
    app_promotion: [
      objectiveResultMetric(insight, 'app_promotion', currency),
      compactMetric({ label: 'Cost / Install', value: fmtCurrency(insight?.cost_per_conversion, currency, 2), sub: 'Install/event proxy', tone: appInstalls > 0 ? 'good' : 'watch' }),
      compactMetric({ label: 'Install Rate', value: rate(appInstalls, clicks), sub: `${fmt(clicks)} clicks`, tone: clicks > 0 && appInstalls / clicks >= 0.05 ? 'good' : appInstalls > 0 ? 'watch' : 'risk' }),
      compactMetric({ label: 'Link Clicks', value: fmt(clicks), sub: percent(insight?.ctr), tone: clicks > 0 ? 'neutral' : 'watch' }),
      compactMetric({ label: 'CPC', value: fmtCurrency(insight?.cpc, currency, 2), sub: 'Traffic cost', tone: 'neutral' }),
      compactMetric({ label: 'CPM', value: fmtCurrency(insight?.cpm, currency, 2), sub: 'Auction cost', tone: 'neutral' }),
    ],
    sales: [
      objectiveResultMetric(insight, 'sales', currency),
      compactMetric({ label: 'ROAS', value: fmtRoas(roas), sub: purchaseValue ? `${fmtCurrency(purchaseValue, currency)} value` : 'Purchase value missing', tone: roas >= 2.5 ? 'good' : roas > 0 && roas < 1 ? 'risk' : roas > 0 ? 'watch' : 'risk' }),
      compactMetric({ label: 'Purchase Value', value: fmtCurrency(purchaseValue, currency), sub: `${fmt(purchases)} purchases`, tone: purchaseValue > 0 ? 'good' : purchases > 0 ? 'risk' : 'watch' }),
      compactMetric({ label: 'Cost / Purchase', value: fmtCurrency(costPerPurchase, currency, 2), sub: 'Sales efficiency', tone: purchases > 0 ? 'good' : 'risk' }),
      compactMetric({ label: 'Checkout Starts', value: fmt(insight?.checkout_initiations), sub: `${fmt(insight?.add_to_cart)} add to cart`, tone: num(insight?.checkout_initiations) > 0 ? 'neutral' : num(insight?.add_to_cart) > 0 ? 'watch' : 'neutral' }),
      compactMetric({ label: 'Purchase Rate', value: rate(purchases, clicks), sub: `${fmt(clicks)} clicks`, tone: clicks > 0 && purchases / clicks >= 0.02 ? 'good' : purchases > 0 ? 'watch' : 'risk' }),
    ],
  }

  return byObjective[objectiveFamily] || byObjective.sales
}

function objectiveResultCount(insight: CampaignInsight | null | undefined, objectiveFamily: string) {
  if (objectiveFamily === 'leads') return num(insight?.leads)
  if (objectiveFamily === 'engagement') return num(insight?.post_engagements)
  if (objectiveFamily === 'traffic') return num(insight?.inline_link_clicks) || num(insight?.link_clicks_action) || num(insight?.clicks)
  if (objectiveFamily === 'awareness') return num(insight?.reach)
  if (objectiveFamily === 'app_promotion') return num(insight?.app_installs) || num(insight?.conversions)
  return num(insight?.purchases) || num(insight?.conversions)
}

function objectiveResultLabel(objectiveFamily: string) {
  if (objectiveFamily === 'leads') return 'leads'
  if (objectiveFamily === 'engagement') return 'engagements'
  if (objectiveFamily === 'traffic') return 'link clicks'
  if (objectiveFamily === 'awareness') return 'reach'
  if (objectiveFamily === 'app_promotion') return 'app installs/events'
  return 'purchases'
}

function buildMetaStoryPanels({
  rows,
  filteredRows,
  selectedRow,
  summary,
  currency,
  rangeLabel,
}: {
  rows: any[]
  filteredRows: any[]
  selectedRow: any
  summary: AccountSummary | null
  currency: string
  rangeLabel: string
}): MetaStoryPanel[] {
  const rowSet = filteredRows.length ? filteredRows : rows
  const focus = selectedRow || rowSet[0]
  const topSpend = [...rowSet].sort((a, b) => num(b.insight?.spend) - num(a.insight?.spend))[0]
  const topResult = [...rowSet].sort((a, b) =>
    objectiveResultCount(b.insight, b.analysis.objectiveFamily) - objectiveResultCount(a.insight, a.analysis.objectiveFamily)
  )[0]
  const risk = rowSet.find((row) => row.analysis.suggestions.some((item: MetaOptimizationSuggestion) => ['critical', 'high'].includes(item.priority)))
  const best = rowSet.find((row) => row.analysis.suggestions.some((item: MetaOptimizationSuggestion) => item.type === 'success')) || topResult

  if (!focus) {
    return [
      {
        label: 'Situation',
        title: 'No campaign data loaded yet',
        body: 'Connect Meta, choose an account, and load a date range to generate campaign-level analysis.',
        icon: BarChart3,
        color: '#4f8ef7',
      },
      {
        label: 'Problem',
        title: 'No evidence available',
        body: 'The analysis engine waits for spend, delivery, and action data before making recommendations.',
        icon: AlertTriangle,
        color: '#f4c84f',
      },
      {
        label: 'Answer',
        title: 'Load a valid campaign range',
        body: 'Use a recent range with delivery data so objective-specific KPIs can be evaluated.',
        icon: CheckCircle2,
        color: '#18c7b6',
      },
      {
        label: 'Impact',
        title: 'Recommendations will become specific',
        body: 'Once data is loaded, this area names the exact campaign, KPI, and next action.',
        icon: Target,
        color: '#8f72ff',
      },
    ]
  }

  const focusResult = objectiveResultCount(focus.insight, focus.analysis.objectiveFamily)
  const focusResultLabel = objectiveResultLabel(focus.analysis.objectiveFamily)
  const topIssue = focus.analysis.suggestions[0] || risk?.analysis.suggestions[0]
  const topIssueRow = focus.analysis.suggestions[0] ? focus : risk
  const roas = roasValue(focus.insight)

  return [
    {
      label: 'Situation',
      title: `${rowSet.length} campaigns analyzed`,
      body: `${rangeLabel}: ${fmtCurrency(summary?.spend, currency)} spend, ${fmt(summary?.impressions)} impressions, and ${fmt(summary?.reach)} reach. ${topSpend?.campaign?.name || focus.campaign.name} carries the highest spend at ${fmtCurrency(topSpend?.insight?.spend, currency)}.`,
      icon: BarChart3,
      color: '#4f8ef7',
    },
    {
      label: 'Problem',
      title: topIssue ? `${topIssueRow?.campaign?.name || focus.campaign.name}: ${topIssue.title}` : `${focus.campaign.name} has no severe alert`,
      body: topIssue
        ? `${topIssue.description} Current KPI: ${topIssue.currentValue || 'not available'}; target: ${topIssue.targetValue || 'improve quality'}.`
        : `${focus.campaign.name} is within the current rule thresholds. Keep monitoring spend concentration, frequency, and result quality before scaling.`,
      icon: AlertTriangle,
      color: topIssue?.priority === 'critical' || topIssue?.priority === 'high' ? '#ff7f7f' : '#f4c84f',
    },
    {
      label: 'Answer',
      title: `${focus.campaign.name}: ${fmt(focusResult)} ${focusResultLabel}`,
      body: focus.analysis.objectiveFamily === 'sales'
        ? `Sales readout: ${fmt(focus.insight?.purchases)} purchases, ${fmtCurrency(focus.insight?.purchase_value, currency)} purchase value, ${fmtRoas(roas)} ROAS, and ${fmtCurrency(costPerAction(focus.insight?.spend, focus.insight?.purchases || focus.insight?.conversions, focus.insight?.cost_per_conversion), currency, 2)} cost per purchase.`
        : `${focus.campaign.name} should be judged by ${focusResultLabel}, not generic clicks. Its current objective score is ${focus.analysis.score}/100 with ${fmtCurrency(focus.insight?.spend, currency)} spend.`,
      icon: CheckCircle2,
      color: '#18c7b6',
    },
    {
      label: 'Impact',
      title: best?.campaign?.name ? `Best pattern: ${best.campaign.name}` : 'Next action is objective-specific',
      body: best?.campaign?.name
        ? `${best.campaign.name} has the strongest visible pattern with ${fmt(objectiveResultCount(best.insight, best.analysis.objectiveFamily))} ${objectiveResultLabel(best.analysis.objectiveFamily)} and score ${best.analysis.score}/100. Use it as the benchmark before scaling weaker campaigns.`
        : 'Prioritize the first high-priority alert, then scale only campaigns with clear objective results and clean tracking.',
      icon: TrendingUp,
      color: '#8f72ff',
    },
  ]
}

function buildMetaActionInsights(rows: any[], selectedRow: any, currency: string): MetaActionInsight[] {
  const rowSet = rows.length ? rows : []
  const focus = selectedRow || rowSet[0]
  if (!focus) return []
  const insights: MetaActionInsight[] = []
  const selectedSuggestions = focus.analysis.suggestions.slice(0, 3)

  selectedSuggestions.forEach((suggestion: MetaOptimizationSuggestion) => {
    insights.push({
      title: `${focus.campaign.name}: ${suggestion.title}`,
      evidence: `${suggestion.description}${suggestion.currentValue ? ` Current: ${suggestion.currentValue}.` : ''}${suggestion.targetValue ? ` Target: ${suggestion.targetValue}.` : ''}`,
      action: suggestion.recommendations?.[0] || suggestion.impact || 'Prioritize this finding before scaling.',
      severity: suggestion.priority === 'critical' || suggestion.priority === 'high' ? 'high' : suggestion.priority === 'medium' ? 'medium' : 'low',
    })
  })

  const topSpend = [...rowSet].sort((a, b) => num(b.insight?.spend) - num(a.insight?.spend))[0]
  if (topSpend) {
    const result = objectiveResultCount(topSpend.insight, topSpend.analysis.objectiveFamily)
    insights.push({
      title: `${topSpend.campaign.name} controls the largest budget signal`,
      evidence: `${fmtCurrency(topSpend.insight?.spend, currency)} spend produced ${fmt(result)} ${objectiveResultLabel(topSpend.analysis.objectiveFamily)} and score ${topSpend.analysis.score}/100.`,
      action: topSpend.analysis.score >= 80
        ? `Protect ${topSpend.campaign.name} and scale in small increments only while its cost/result stays stable.`
        : `Do not scale ${topSpend.campaign.name} yet; fix the top alert before increasing budget.`,
      severity: topSpend.analysis.score >= 80 ? 'low' : topSpend.analysis.score < 60 ? 'high' : 'medium',
    })
  }

  const salesRows = rowSet.filter((row) => row.analysis.objectiveFamily === 'sales')
  const missingRoas = salesRows.find((row) => (num(row.insight?.purchases) || num(row.insight?.conversions)) > 0 && num(row.insight?.purchase_value) === 0)
  if (missingRoas) {
    insights.push({
      title: `${missingRoas.campaign.name} needs value tracking`,
      evidence: `${fmt(num(missingRoas.insight?.purchases) || num(missingRoas.insight?.conversions))} purchases are visible, but purchase value is ${fmtCurrency(missingRoas.insight?.purchase_value, currency)}.`,
      action: 'Pass value and currency with purchase events before making ROAS decisions.',
      severity: 'high',
    })
  }

  const profitableSales = salesRows
    .filter((row) => roasValue(row.insight) >= 2.5)
    .sort((a, b) => roasValue(b.insight) - roasValue(a.insight))[0]
  if (profitableSales) {
    insights.push({
      title: `${profitableSales.campaign.name} is the sales scale candidate`,
      evidence: `${fmtRoas(roasValue(profitableSales.insight))} ROAS with ${fmtCurrency(profitableSales.insight?.purchase_value, currency)} purchase value.`,
      action: 'Create one controlled scale test and one creative variant; do not disturb the original ad set.',
      severity: 'medium',
    })
  }

  const seen = new Set<string>()
  return insights.filter((item) => {
    const key = `${item.title}-${item.evidence}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, 6)
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>
  label: string
  value: string
  sub?: string
  color: string
}) {
  return (
    <Card className="p-4 rounded-lg">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-md" style={{ backgroundColor: `${color}18`, color }}>
          <Icon size={17} />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-mono uppercase tracking-wider text-text-dim">{label}</p>
          <p className="mt-1 text-xl font-heading font-semibold text-text-primary">{value}</p>
          {sub ? <p className="mt-0.5 text-[11px] text-text-secondary">{sub}</p> : null}
        </div>
      </div>
    </Card>
  )
}

function EmptyConnectState() {
  return (
    <ClientShell>
      <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center px-6 text-center">
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-lg border border-border bg-card shadow-[var(--shadow-card)]">
          <BarChart3 size={28} className="text-accent-purple" />
        </div>
        <h1 className="font-heading text-2xl font-semibold text-text-primary">Meta Ads is not connected</h1>
        <p className="mt-3 text-sm leading-relaxed text-text-secondary">
          Add and verify your own Meta access token in Settings. Mission Control stores it per user and uses it server-side for campaign data.
        </p>
        <Button className="mt-6" variant="primary" onClick={() => (window.location.href = '/settings')}>
          <Settings size={15} />
          Open Settings
        </Button>
      </div>
    </ClientShell>
  )
}

function SuggestionList({ suggestions }: { suggestions: MetaOptimizationSuggestion[] }) {
  return (
    <div className="space-y-3">
      {suggestions.slice(0, 4).map((item, index) => (
        <div key={`${item.title}-${index}`} className="rounded-lg border border-border bg-base/60 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: typeColor(item.type) }} />
                <p className="text-sm font-semibold text-text-primary">{item.title}</p>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-text-secondary">{item.description}</p>
            </div>
            <Badge color={priorityColor(item.priority)} variant="outline">
              {item.priority}
            </Badge>
          </div>
          {item.recommendations?.length ? (
            <ul className="mt-2 space-y-1">
              {item.recommendations.slice(0, 2).map((rec) => (
                <li key={rec} className="flex gap-1.5 text-[11px] leading-relaxed text-text-secondary">
                  <ChevronRight size={12} className="mt-0.5 shrink-0 text-accent-blue" />
                  {rec}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}
    </div>
  )
}

function MetaInsightRail({
  rows,
  filteredRows,
  selectedRow,
  summary,
  currency,
  rangeLabel,
  loading,
}: {
  rows: any[]
  filteredRows: any[]
  selectedRow: any
  summary: AccountSummary | null
  currency: string
  rangeLabel: string
  loading: boolean
}) {
  const panels = buildMetaStoryPanels({ rows, filteredRows, selectedRow, summary, currency, rangeLabel })
  const actions = buildMetaActionInsights(filteredRows.length ? filteredRows : rows, selectedRow, currency)

  return (
    <Card className="rounded-lg p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-accent-purple/15 text-accent-purple">
            <Sparkles size={17} />
          </span>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim">AI Meta analyst</p>
            <h2 className="text-sm font-semibold text-text-primary">Campaign Storyline</h2>
          </div>
        </div>
        <Badge color="#8f72ff" variant="outline">{actions.length}</Badge>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-base/60 p-4 text-sm text-text-secondary">
          <Loader2 size={16} className="animate-spin text-accent-blue" />
          Analyzing campaigns, objective KPIs, and alerts...
        </div>
      ) : (
        <div className="space-y-2">
          {panels.map((panel) => {
            const Icon = panel.icon
            return (
              <div key={panel.label} className="rounded-lg border border-border bg-base/60 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Icon size={14} style={{ color: panel.color }} />
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-text-dim">{panel.label}</p>
                </div>
                <p className="text-sm font-semibold leading-snug text-text-primary">{panel.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-text-secondary">{panel.body}</p>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-4 border-t border-border pt-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-text-primary">Actions</h3>
          <div className="flex items-center gap-2 text-[10px] text-text-dim">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: toneColor('good') }} /> healthy
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: toneColor('watch') }} /> watch
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: toneColor('risk') }} /> risk
          </div>
        </div>
        <div className="space-y-3">
          {actions.length ? actions.map((item) => (
            <div key={`${item.title}-${item.evidence}`} className="border-l-2 pl-3" style={{ borderColor: priorityColor(item.severity === 'high' ? 'high' : item.severity === 'medium' ? 'medium' : 'low') }}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-text-primary">{item.title}</p>
                <span className="font-mono text-[10px] uppercase tracking-wider text-text-dim">{item.severity}</span>
              </div>
              <p className="text-xs leading-relaxed text-text-secondary">{item.evidence}</p>
              <p className="mt-1 text-xs leading-relaxed text-accent-cyan">{item.action}</p>
            </div>
          )) : (
            <p className="text-xs leading-relaxed text-text-secondary">
              {loading ? 'Actions will appear after Meta data finishes loading.' : 'No action can be generated until campaigns have delivery data.'}
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}

export default function AdsPage() {
  const [accounts, setAccounts] = useState<AdAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [datePreset, setDatePreset] = useState('last_30d')
  const [market, setMarket] = useState<MetaMarketCode>('JO')
  const [campaigns, setCampaigns] = useState<MetaCampaign[]>([])
  const [insights, setInsights] = useState<CampaignInsight[]>([])
  const [summary, setSummary] = useState<AccountSummary | null>(null)
  const [metaDateRange, setMetaDateRange] = useState<{ since: string; until: string } | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [selectedCampaignId, setSelectedCampaignId] = useState('')
  const [details, setDetails] = useState<CampaignDetails | null>(null)
  const [optimization, setOptimization] = useState<OptimizationResult | null>(null)
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [loadingOptimize, setLoadingOptimize] = useState(false)
  const [notConfigured, setNotConfigured] = useState(false)
  const dataRequestRef = useRef(0)
  const detailRequestRef = useRef(0)

  useEffect(() => {
    async function loadAccounts() {
      setLoadingAccounts(true)
      try {
        const token = await getAuthToken()
        const response = await fetch('/api/integrations/meta/accounts', {
          cache: 'no-store',
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        })
        const payload = await response.json()
        if (response.status === 400 && payload.code === 'META_NOT_CONNECTED') {
          setNotConfigured(true)
          return
        }
        if (!response.ok) throw new Error(payload.error || 'Failed to load Meta accounts')
        const nextAccounts = payload.accounts || []
        setAccounts(nextAccounts)
        setMarket((payload.primaryMarket || 'JO') as MetaMarketCode)
        const defaultAccount = payload.defaultAccountId || nextAccounts[0]?.id || ''
        setSelectedAccountId(defaultAccount)
      } catch (error: any) {
        toast.error(error.message || 'Failed to load Meta accounts')
      } finally {
        setLoadingAccounts(false)
      }
    }
    loadAccounts()
  }, [])

  const loadAccountData = useCallback(async () => {
    if (!selectedAccountId) return
    const requestId = dataRequestRef.current + 1
    dataRequestRef.current = requestId
    setLoadingData(true)
    setOptimization(null)
    try {
      const token = await getAuthToken()
      const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      const [campaignResponse, insightResponse] = await Promise.all([
        fetch(`/api/integrations/meta/campaigns?accountId=${encodeURIComponent(selectedAccountId)}&datePreset=${datePreset}`, {
          cache: 'no-store',
          headers,
        }),
        fetch(`/api/integrations/meta/insights?accountId=${encodeURIComponent(selectedAccountId)}&datePreset=${datePreset}&level=campaign`, {
          cache: 'no-store',
          headers,
        }),
      ])
      const campaignPayload = await campaignResponse.json()
      const insightPayload = await insightResponse.json()
      if (!campaignResponse.ok) throw new Error(campaignPayload.error || 'Failed to load campaigns')
      if (!insightResponse.ok) throw new Error(insightPayload.error || 'Failed to load insights')
      if (requestId !== dataRequestRef.current) return
      const nextCampaigns = campaignPayload.campaigns || []
      setCampaigns(nextCampaigns)
      setInsights(insightPayload.insights || [])
      setSummary(insightPayload.summary || null)
      setMetaDateRange(insightPayload.dateRange || null)
      setSelectedCampaignId((current) =>
        current && nextCampaigns.some((campaign: MetaCampaign) => campaign.id === current)
          ? current
          : nextCampaigns[0]?.id || ''
      )
    } catch (error: any) {
      if (requestId === dataRequestRef.current) toast.error(error.message || 'Failed to load Meta data')
    } finally {
      if (requestId === dataRequestRef.current) setLoadingData(false)
    }
  }, [datePreset, selectedAccountId])

  useEffect(() => {
    if (selectedAccountId) loadAccountData()
  }, [selectedAccountId, datePreset, loadAccountData])

  const insightByCampaign = useMemo(() => {
    const map = new Map<string, CampaignInsight>()
    insights.forEach((row) => {
      if (row.campaign_id) map.set(row.campaign_id, row)
    })
    return map
  }, [insights])

  const rows = useMemo(() => {
    return campaigns.map((campaign) => {
      const insight = insightByCampaign.get(campaign.id) || null
      const analysis = analyzeMetaCampaign(insight, campaign, market)
      return { campaign, insight, analysis }
    })
  }, [campaigns, insightByCampaign, market])

  const filteredRows = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase()
    return rows.filter(({ campaign }) => {
      const matchesSearch = !needle || campaign.name.toLowerCase().includes(needle)
      const status = campaignStatusGroup(campaign)
      const matchesStatus = statusFilter === 'all' || status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [rows, searchTerm, statusFilter])

  const selectedAccount = accounts.find((account) => account.id === selectedAccountId)
  const selectedRow = rows.find((row) => row.campaign.id === selectedCampaignId)
  const benchmark = getMetaCountryBenchmark(market)
  const accountCurrency = selectedAccount?.currency || 'USD'

  useEffect(() => {
    if (!selectedCampaignId) {
      setDetails(null)
      return
    }
    async function loadDetails() {
      const requestId = detailRequestRef.current + 1
      detailRequestRef.current = requestId
      setLoadingDetails(true)
      try {
        const token = await getAuthToken()
        const response = await fetch(
          `/api/integrations/meta/campaigns/${encodeURIComponent(selectedCampaignId)}/details?datePreset=${datePreset}`,
          {
            cache: 'no-store',
            headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          }
        )
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || 'Failed to load campaign details')
        if (requestId !== detailRequestRef.current) return
        setDetails(payload)
      } catch (error: any) {
        if (requestId === detailRequestRef.current) toast.error(error.message || 'Failed to load campaign details')
      } finally {
        if (requestId === detailRequestRef.current) setLoadingDetails(false)
      }
    }
    loadDetails()
  }, [datePreset, selectedCampaignId])

  async function handleOptimize() {
    if (!rows.length) {
      toast.error('Load campaigns first')
      return
    }
    setLoadingOptimize(true)
    try {
      const token = await getAuthToken()
      const ruleFindings = rows.map((row) => ({
        campaignId: row.campaign.id,
        campaignName: row.campaign.name,
        objective: row.campaign.objective,
        objectiveFamily: row.analysis.objectiveFamily,
        market: row.analysis.benchmark.country,
        score: row.analysis.score,
        suggestions: row.analysis.suggestions.slice(0, 5),
      }))
      const response = await fetch('/api/integrations/meta/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          campaigns,
          insights,
          summary,
          market,
          ruleFindings,
        }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Optimization failed')
      setOptimization(payload)
    } catch (error: any) {
      toast.error(error.message || 'Optimization failed')
    } finally {
      setLoadingOptimize(false)
    }
  }

  if (notConfigured) return <EmptyConnectState />

  return (
    <ClientShell>
      <div className="mx-auto max-w-[1500px] px-5 py-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-text-dim">Performance command center</p>
            <h1 className="mt-1 font-heading text-2xl font-semibold text-text-primary">Meta Ads Intelligence</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Objective-aware campaign diagnostics with local MENA benchmarks, drill-downs, and AI recommendations.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" onClick={loadAccountData} disabled={loadingData || !selectedAccountId}>
              <RefreshCcw size={14} className={loadingData ? 'animate-spin' : ''} />
              Refresh
            </Button>
            <Button variant="primary" onClick={handleOptimize} disabled={loadingOptimize || !rows.length}>
              {loadingOptimize ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              AI Optimize
            </Button>
          </div>
        </div>

        <Card className="mb-5 rounded-lg p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(260px,1.4fr)_160px_170px_1fr_auto]">
            <Select
              label="Ad Account"
              value={selectedAccountId}
              onChange={(event) => setSelectedAccountId(event.target.value)}
              options={
                accounts.length
                  ? accounts.map((account) => ({ value: account.id, label: `${account.name} (${account.currency || 'Meta'})` }))
                  : [{ value: '', label: loadingAccounts ? 'Loading accounts...' : 'No accounts found' }]
              }
            />
            <Select
              label="Date Range"
              value={datePreset}
              onChange={(event) => setDatePreset(event.target.value)}
              options={DATE_PRESETS}
            />
            <Select
              label="Benchmark Market"
              value={market}
              onChange={(event) => setMarket(event.target.value as MetaMarketCode)}
              options={META_MARKET_OPTIONS}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-mono uppercase tracking-wider text-text-secondary">Search Campaigns</label>
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="w-full rounded-lg border border-border bg-base py-2 pl-9 pr-3 text-sm text-text-primary outline-none transition-colors placeholder:text-text-dim focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/30"
                  placeholder="Search by campaign name"
                />
              </div>
            </div>
            <div className="flex items-end gap-2">
              <Button variant={viewMode === 'cards' ? 'primary' : 'secondary'} size="sm" onClick={() => setViewMode('cards')}>
                Cards
              </Button>
              <Button variant={viewMode === 'table' ? 'primary' : 'secondary'} size="sm" onClick={() => setViewMode('table')}>
                Table
              </Button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <Filter size={14} className="text-text-dim" />
              {STATUS_FILTERS.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setStatusFilter(filter.value)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition ${
                    statusFilter === filter.value
                      ? 'border-accent-blue bg-accent-blue/15 text-accent-blue'
                      : 'border-border bg-base text-text-secondary hover:border-border-glow hover:text-text-primary'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary">
              <Badge color="#4f8ef7" variant="outline">{filteredRows.length} of {rows.length} campaigns</Badge>
              {metaDateRange ? <Badge color="#8f72ff" variant="outline">{dateRangeLabel(metaDateRange)}</Badge> : null}
              <Badge color="#18c7b6" variant="outline">{benchmark.country}</Badge>
              <span>{benchmark.marketContext}</span>
            </div>
          </div>
        </Card>

        {summary ? (
          <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <KpiCard icon={DollarSign} label="Spend" value={fmtCurrency(summary.spend, accountCurrency)} sub={dateRangeLabel(metaDateRange)} color="#8f72ff" />
            <KpiCard icon={Eye} label="Reach" value={fmt(summary.reach)} sub={`${fmt(summary.impressions)} impressions`} color="#4f8ef7" />
            <KpiCard icon={MousePointerClick} label="Clicks" value={fmt(summary.clicks)} sub={`${percent(summary.ctr)} CTR`} color="#18c7b6" />
            <KpiCard icon={Target} label="CPC" value={fmtCurrency(summary.cpc, accountCurrency, 2)} sub="Traffic cost" color="#2ecf91" />
            <KpiCard icon={BarChart3} label="CPM" value={fmtCurrency(summary.cpm, accountCurrency, 2)} sub="Reach cost" color="#f4c84f" />
            <KpiCard icon={Zap} label="Events" value={fmt(num(summary.conversions) + num(summary.leads))} sub="Detected actions" color="#ff8a5b" />
          </div>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-4">
            {loadingData ? (
              <Card className="flex items-center gap-3 rounded-lg p-8 text-text-secondary">
                <Loader2 size={18} className="animate-spin text-accent-blue" />
                Loading campaigns, insights, and objective diagnostics...
              </Card>
            ) : viewMode === 'table' ? (
              <Card className="overflow-hidden rounded-lg p-0">
                <div className="border-b border-border px-4 py-3">
                  <h2 className="text-sm font-semibold text-text-primary">Campaign Table</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[920px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-text-dim">
                        {['Campaign', 'Objective', 'Score', 'Spend', 'Result', 'ROAS', 'CTR', 'Top Alert'].map((heading) => (
                          <th key={heading} className="px-4 py-3 font-mono">{heading}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map(({ campaign, insight, analysis }) => (
                        <tr
                          key={campaign.id}
                          className="cursor-pointer border-b border-border/70 hover:bg-base/60"
                          onClick={() => setSelectedCampaignId(campaign.id)}
                        >
                          <td className="px-4 py-3">
                            <p className="font-medium text-text-primary">{campaign.name}</p>
                            <p className="text-[11px] text-text-dim">{campaign.id}</p>
                          </td>
                          <td className="px-4 py-3">
                            <Badge color="#4f8ef7" variant="outline">{analysis.objectiveFamily}</Badge>
                          </td>
                          <td className="px-4 py-3 font-semibold text-text-primary">{analysis.score}</td>
                          <td className="px-4 py-3">{fmtCurrency(insight?.spend, accountCurrency)}</td>
                          <td className="px-4 py-3">{fmt(objectiveResultCount(insight, analysis.objectiveFamily))} {objectiveResultLabel(analysis.objectiveFamily)}</td>
                          <td className="px-4 py-3">{analysis.objectiveFamily === 'sales' ? fmtRoas(roasValue(insight)) : 'N/A'}</td>
                          <td className="px-4 py-3">{percent(insight?.ctr)}</td>
                          <td className="px-4 py-3 text-text-secondary">{analysis.suggestions[0]?.title || 'Healthy'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            ) : filteredRows.length ? (
              filteredRows.map(({ campaign, insight, analysis }) => {
                const objectiveKpis = campaignKpiMetrics(insight, analysis.objectiveFamily, accountCurrency)

                return (
                  <Card
                    key={campaign.id}
                    hover
                    onClick={() => setSelectedCampaignId(campaign.id)}
                    className={`rounded-lg p-4 ${selectedCampaignId === campaign.id ? 'border-accent-blue shadow-[var(--shadow-glow-blue)]' : ''}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <Badge color={statusBadgeColor(campaignStatusGroup(campaign))} variant="outline">
                            {campaignStatus(campaign) || 'unknown'}
                          </Badge>
                          <Badge color="#4f8ef7" variant="outline">{analysis.objectiveFamily}</Badge>
                          <Badge color="#18c7b6" variant="outline">{analysis.benchmark.country}</Badge>
                        </div>
                        <h2 className="truncate font-heading text-lg font-semibold text-text-primary">{campaign.name}</h2>
                        <p className="mt-1 text-xs text-text-secondary">
                          {campaign.objective || 'No objective'} · Daily {budget(campaign.daily_budget)} · Lifetime {budget(campaign.lifetime_budget)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-[11px] uppercase tracking-wider text-text-dim">Health Score</p>
                        <p className="font-heading text-3xl font-semibold text-text-primary">{analysis.score}</p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      {[
                        { label: 'Spend', value: fmtCurrency(insight?.spend, accountCurrency), sub: dateRangeLabel(metaDateRange) },
                        { label: 'Impressions', value: fmt(insight?.impressions), sub: `${fmtCurrency(insight?.cpm, accountCurrency, 2)} CPM` },
                        { label: 'Reach', value: fmt(insight?.reach), sub: `${fmt(insight?.frequency, 2)} frequency` },
                      ].map((metric) => (
                        <div key={metric.label} className="rounded-lg border border-border bg-base/75 p-3">
                          <p className="text-[10px] font-mono uppercase tracking-wider text-text-dim">{metric.label}</p>
                          <p className="mt-1 font-heading text-lg font-semibold text-text-primary">{metric.value}</p>
                          <p className="mt-0.5 text-[11px] text-text-secondary">{metric.sub}</p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
                      {objectiveKpis.map((metric) => (
                        <div key={metric.key} className="rounded-lg border border-border bg-base/55 p-3">
                          <div className="mb-2 h-1 w-10 rounded-full" style={{ backgroundColor: metric.color }} />
                          <p className="text-[10px] font-mono uppercase tracking-wider text-text-dim">{metric.label}</p>
                          <p className="mt-1 font-semibold text-text-primary">{metric.value}</p>
                          {metric.sub ? <p className="mt-0.5 text-[11px] text-text-secondary">{metric.sub}</p> : null}
                        </div>
                      ))}
                    </div>

                    <div className="mt-4">
                      <SuggestionList suggestions={analysis.suggestions} />
                    </div>
                  </Card>
                )
              })
            ) : (
              <Card className="rounded-lg p-10 text-center">
                <p className="text-sm font-medium text-text-primary">No campaigns match this view.</p>
                <p className="mt-1 text-xs text-text-secondary">Try a wider date range, remove search, or change the status filter.</p>
              </Card>
            )}
          </div>

          <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
            <MetaInsightRail
              rows={rows}
              filteredRows={filteredRows}
              selectedRow={selectedRow}
              summary={summary}
              currency={accountCurrency}
              rangeLabel={dateRangeLabel(metaDateRange)}
              loading={loadingData || loadingAccounts}
            />

            <Card className="rounded-lg p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-wider text-text-dim">Selected Campaign</p>
                  <h2 className="mt-1 text-sm font-semibold text-text-primary">{selectedRow?.campaign.name || 'No campaign selected'}</h2>
                </div>
                {loadingDetails ? <Loader2 size={16} className="animate-spin text-accent-blue" /> : <Layers3 size={17} className="text-accent-blue" />}
              </div>

              {selectedRow ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-border bg-base/60 p-3">
                      <p className="text-[10px] font-mono uppercase text-text-dim">Objective</p>
                      <p className="mt-1 text-sm font-semibold text-text-primary">{mapMetaObjectiveToFamily(selectedRow.campaign.objective)}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-base/60 p-3">
                      <p className="text-[10px] font-mono uppercase text-text-dim">Score</p>
                      <p className="mt-1 text-sm font-semibold text-text-primary">{selectedRow.analysis.score}/100</p>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-base/60 p-3">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <Badge color={statusBadgeColor(campaignStatusGroup(details?.campaign || selectedRow.campaign))} variant="outline">
                        {campaignStatus(details?.campaign || selectedRow.campaign)}
                      </Badge>
                      <Badge color="#4f8ef7" variant="outline">{datePreset.replaceAll('_', ' ')}</Badge>
                      <Badge color="#8f72ff" variant="outline">{dateRangeLabel(details?.dateRange || metaDateRange)}</Badge>
                      <Badge color="#18c7b6" variant="outline">{selectedRow.analysis.benchmark.country}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="font-mono uppercase tracking-wider text-text-dim">Configured</p>
                        <p className="mt-1 text-text-primary">{details?.campaign?.configured_status || selectedRow.campaign.configured_status || selectedRow.campaign.status || 'Unknown'}</p>
                      </div>
                      <div>
                        <p className="font-mono uppercase tracking-wider text-text-dim">Effective</p>
                        <p className="mt-1 text-text-primary">{details?.campaign?.effective_status || selectedRow.campaign.effective_status || 'Unknown'}</p>
                      </div>
                      <div>
                        <p className="font-mono uppercase tracking-wider text-text-dim">Daily Budget</p>
                        <p className="mt-1 text-text-primary">{budget(details?.campaign?.daily_budget || selectedRow.campaign.daily_budget)}</p>
                      </div>
                      <div>
                        <p className="font-mono uppercase tracking-wider text-text-dim">Lifetime</p>
                        <p className="mt-1 text-text-primary">{budget(details?.campaign?.lifetime_budget || selectedRow.campaign.lifetime_budget)}</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-base/60 p-3">
                    <p className="text-[10px] font-mono uppercase tracking-wider text-text-dim">Delivery Evidence</p>
                    <p className="mt-1 text-sm text-text-primary">
                      {details?.activeDelivery
                        ? `${details.activeDelivery.daysWithSpend} spend day${details.activeDelivery.daysWithSpend === 1 ? '' : 's'} · ${shortDate(details.activeDelivery.firstDate)}-${shortDate(details.activeDelivery.lastDate)}`
                        : 'No spend detected inside the selected range'}
                    </p>
                    <p className="mt-1 text-[11px] text-text-secondary">
                      Meta API range: {dateRangeLabel(details?.dateRange || metaDateRange)}
                      {details?.activeDelivery
                        ? ` · Delivered spend ${fmtCurrency(details.activeDelivery.spend, accountCurrency)}`
                        : ''}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Spend', value: fmtCurrency((details?.insight || selectedRow.insight)?.spend, accountCurrency) },
                      { label: 'Impr.', value: fmt((details?.insight || selectedRow.insight)?.impressions) },
                      { label: 'Reach', value: fmt((details?.insight || selectedRow.insight)?.reach) },
                      { label: 'Clicks', value: fmt((details?.insight || selectedRow.insight)?.clicks) },
                      { label: 'CTR', value: percent((details?.insight || selectedRow.insight)?.ctr) },
                      { label: 'Freq.', value: fmt((details?.insight || selectedRow.insight)?.frequency, 2) },
                    ].map((metric) => (
                      <div key={metric.label} className="rounded-lg border border-border bg-base/60 p-2.5">
                        <p className="text-[9px] font-mono uppercase tracking-wider text-text-dim">{metric.label}</p>
                        <p className="mt-1 text-sm font-semibold text-text-primary">{metric.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-lg border border-border bg-base/60 p-3">
                    <p className="mb-2 text-xs font-semibold text-text-primary">Objective KPIs</p>
                    <div className="grid grid-cols-2 gap-2">
                      {campaignKpiMetrics(details?.insight || selectedRow.insight, selectedRow.analysis.objectiveFamily, accountCurrency).slice(0, 6).map((metric) => (
                        <div key={metric.key} className="rounded-md border border-border/70 bg-card/60 p-2">
                          <div className="mb-1 h-1 w-8 rounded-full" style={{ backgroundColor: metric.color }} />
                          <p className="text-[9px] font-mono uppercase tracking-wider text-text-dim">{metric.label}</p>
                          <p className="mt-0.5 text-sm font-semibold text-text-primary">{metric.value}</p>
                          {metric.sub ? <p className="mt-0.5 text-[10px] text-text-secondary">{metric.sub}</p> : null}
                        </div>
                      ))}
                    </div>
                  </div>

                  <SuggestionList suggestions={selectedRow.analysis.suggestions} />

                  <div className="rounded-lg border border-border bg-base/60">
                    <div className="flex items-center justify-between border-b border-border px-3 py-2">
                      <p className="text-xs font-semibold text-text-primary">Ad Sets</p>
                      <Badge color="#4f8ef7" variant="outline">{details?.adsets?.length || 0}</Badge>
                    </div>
                    <div className="max-h-52 overflow-auto p-2">
                      {(details?.adsets || []).slice(0, 8).map((adset: any) => (
                        <div key={adset.id} className="rounded-md px-2 py-2 text-xs hover:bg-card">
                          <p className="font-medium text-text-primary">{adset.name}</p>
                          <p className="mt-0.5 text-text-dim">
                            {adset.status || adset.effective_status || 'unknown'} · {adset.optimization_goal || 'no optimization goal'}
                          </p>
                        </div>
                      ))}
                      {!details?.adsets?.length ? <p className="px-2 py-3 text-xs text-text-dim">No ad sets loaded.</p> : null}
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-base/60">
                    <div className="flex items-center justify-between border-b border-border px-3 py-2">
                      <p className="text-xs font-semibold text-text-primary">Ads & Creatives</p>
                      <Badge color="#18c7b6" variant="outline">{details?.ads?.length || 0}</Badge>
                    </div>
                    <div className="max-h-64 overflow-auto p-2">
                      {(details?.ads || []).slice(0, 8).map((ad: any) => {
                        const creative = details?.creatives?.find((item: any) => item.adId === ad.id)
                        return (
                          <div key={ad.id} className="rounded-md px-2 py-2 text-xs hover:bg-card">
                            <p className="font-medium text-text-primary">{ad.name}</p>
                            <p className="mt-0.5 text-text-dim">{ad.status || ad.effective_status || 'unknown'}</p>
                            {creative?.thumbnail_url || creative?.image_url ? (
                              <img
                                src={creative.thumbnail_url || creative.image_url}
                                alt={creative.name || ad.name}
                                className="mt-2 h-24 w-full rounded-md border border-border object-cover"
                              />
                            ) : null}
                            {creative?.body ? <p className="mt-2 line-clamp-3 text-text-secondary">{creative.body}</p> : null}
                          </div>
                        )
                      })}
                      {!details?.ads?.length ? <p className="px-2 py-3 text-xs text-text-dim">No ads loaded.</p> : null}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-text-secondary">Select a campaign to inspect its ad sets, ads, creative, and objective-aware findings.</p>
              )}
            </Card>

            {optimization ? (
              <Card className="rounded-lg p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Wand2 size={16} className="text-accent-purple" />
                  <h2 className="text-sm font-semibold text-text-primary">AI Optimization</h2>
                </div>
                <p className="text-xs leading-relaxed text-text-secondary">{optimization.summary}</p>
                {optimization.recommendations?.length ? (
                  <div className="mt-4 space-y-3">
                    {optimization.recommendations.slice(0, 5).map((rec, index) => (
                      <div key={`${rec.title}-${index}`} className="border-l-2 pl-3" style={{ borderColor: priorityColor(rec.priority) }}>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-text-primary">{rec.title}</p>
                          <Badge color={priorityColor(rec.priority)} variant="outline">{rec.priority}</Badge>
                        </div>
                        <p className="mt-1 text-[11px] leading-relaxed text-text-secondary">{rec.detail}</p>
                        {rec.estimatedImpact ? <p className="mt-1 text-[11px] text-accent-cyan">{rec.estimatedImpact}</p> : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </Card>
            ) : null}
          </aside>
        </div>

        <div className="mt-6">
          <VideoGenerationPanel />
        </div>
      </div>
    </ClientShell>
  )
}

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
          if (pollRef.current) clearInterval(pollRef.current)
          pollRef.current = null
        }
      } catch {
        // Keep polling quiet; the status call can transiently fail while jobs are queued.
      }
    }, 4000)
  }, [])

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  async function handleGenerate() {
    if (!prompt.trim()) {
      toast.error('Enter a prompt')
      return
    }
    setGenerating(true)
    setVideoStatus(null)
    setJobId(null)
    try {
      const token = await getAuthToken()
      const response = await fetch('/api/integrations/higgsfield/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ prompt, aspectRatio, duration }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Generation failed')
      setJobId(payload.jobId)
      setVideoStatus({ status: payload.status || 'queued', progress: 0 })
      if (payload.jobId) startPolling(payload.jobId)
      toast.success('Video generation started')
    } catch (error: any) {
      toast.error(error.message?.includes('not configured') ? 'Add Higgsfield API key in Settings to generate videos' : error.message || 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Card className="rounded-lg p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Video size={16} className="text-accent-purple" />
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Creative Video Generator</h2>
            <p className="text-xs text-text-secondary">Generate quick ad-video concepts through the existing Higgsfield integration.</p>
          </div>
        </div>
        <Badge color="#8f72ff" variant="outline">Higgsfield</Badge>
      </div>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_150px_130px_auto]">
        <input
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Product showcase with kinetic typography, clean lighting, and a strong CTA"
          className="rounded-lg border border-border bg-base px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-dim focus:border-accent-blue focus:ring-1 focus:ring-accent-blue/30"
        />
        <select
          value={aspectRatio}
          onChange={(event) => setAspectRatio(event.target.value)}
          className="rounded-lg border border-border bg-base px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-blue"
        >
          <option value="16:9">16:9 landscape</option>
          <option value="9:16">9:16 vertical</option>
          <option value="1:1">1:1 square</option>
        </select>
        <select
          value={duration}
          onChange={(event) => setDuration(Number(event.target.value))}
          className="rounded-lg border border-border bg-base px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-blue"
        >
          <option value={3}>3 seconds</option>
          <option value={5}>5 seconds</option>
          <option value={8}>8 seconds</option>
        </select>
        <Button variant="primary" onClick={handleGenerate} disabled={generating || !prompt.trim()}>
          {generating ? <Loader2 size={14} className="animate-spin" /> : <Video size={14} />}
          Generate
        </Button>
      </div>
      {videoStatus ? (
        <div className="mt-4 rounded-lg border border-border bg-base/60 p-4">
          {videoStatus.videoUrl ? (
            <div>
              <p className="mb-3 text-sm font-semibold text-accent-cyan">Video ready</p>
              <video src={videoStatus.videoUrl} controls className="max-h-[420px] w-full rounded-lg border border-border bg-black" />
            </div>
          ) : (
            <div className="flex items-center gap-3 text-sm text-text-secondary">
              <Loader2 size={15} className="animate-spin text-accent-purple" />
              <span className="capitalize">{videoStatus.status}</span>
              {jobId ? <span className="font-mono text-[11px] text-text-dim">Job {jobId}</span> : null}
            </div>
          )}
        </div>
      ) : null}
    </Card>
  )
}
