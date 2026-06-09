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
  getMetaConversionLocationLabel,
  getMetaCountryBenchmark,
  mapMetaObjectiveToFamily,
  resolveMetaResultMetric,
  type MetaObjectiveFamily,
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
  conversion_context?: {
    destinationTypes?: string[]
    optimizationGoals?: string[]
    billingEvents?: string[]
    promotedObjectEventTypes?: string[]
    promotedObjectPixelIds?: string[]
    promotedObjectPageIds?: string[]
    promotedObjectApplicationIds?: string[]
    adsetCount?: number
  } | null
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
  message_action_type?: string | null
  cost_per_message?: string | number
  calls?: string | number
  cost_per_call?: string | number
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
  daily_verified?: boolean
  active_first_date?: string | null
  active_last_date?: string | null
  active_spend_days?: string | number
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

function benchmarkCostTone(value: number, target: number): MetricTone {
  if (!value || !target) return 'neutral'
  if (value <= target * 1.25) return 'good'
  if (value <= target * 2) return 'watch'
  return 'risk'
}

function benchmarkRateTone(value: number, good: number, watch: number): MetricTone {
  if (!value) return 'risk'
  if (value >= good) return 'good'
  if (value >= watch) return 'watch'
  return 'risk'
}

function budget(value?: string) {
  if (!value) return 'Not set'
  return fmtCurrency(num(value) / 100)
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

function dateOnly(value?: string | null) {
  if (!value) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString().slice(0, 10)
}

function campaignSpendPeriodLabel(
  campaign: MetaCampaign,
  insight: CampaignInsight | null | undefined,
  range?: { since?: string; until?: string } | null
) {
  const label = dateRangeLabel(range)
  if (insight?.daily_verified && num(insight.active_spend_days) > 0 && insight.active_first_date && insight.active_last_date) {
    const activeLabel = insight.active_first_date === insight.active_last_date
      ? shortDate(insight.active_first_date)
      : `${shortDate(insight.active_first_date)}-${shortDate(insight.active_last_date)}`
    return `${label} · delivered ${activeLabel}`
  }
  const start = dateOnly(campaign.start_time || campaign.created_time)
  const stop = dateOnly(campaign.stop_time)
  if (range?.since && range?.until && start && start > range.since && start <= range.until) {
    return `${label} · started ${shortDate(start)}`
  }
  if (range?.since && range?.until && stop && stop >= range.since && stop < range.until) {
    return `${label} · ended ${shortDate(stop)}`
  }
  return label
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

type MetaCampaignReadout = {
  title: string
  body: string
  tone: MetricTone
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

function objectiveResultMetric(
  insight: CampaignInsight | null | undefined,
  campaign: MetaCampaign,
  objectiveFamily: MetaObjectiveFamily,
  currency: string
): CampaignMetric {
  const result = resolveMetaResultMetric(insight, campaign, objectiveFamily)
  if (result.kind === 'messages' || result.kind === 'calls') {
    return compactMetric({
      label: result.label,
      value: fmt(result.count),
      sub: `${fmtCurrency(result.cost, currency, 2)} ${result.costLabel.toLowerCase()}`,
      tone: result.count > 0 ? 'good' : 'risk',
    })
  }
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
  campaign: MetaCampaign,
  objectiveFamily: MetaObjectiveFamily,
  currency: string,
  marketCode: MetaMarketCode
): CampaignMetric[] {
  const benchmark = getMetaCountryBenchmark(marketCode)
  const result = resolveMetaResultMetric(insight, campaign, objectiveFamily)
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
  const targetCpl = benchmark.costPerConversion.optimal * 0.5
  const cpcValue = num(insight?.cpc)
  const cpmValue = num(insight?.cpm)

  const byObjective: Record<string, CampaignMetric[]> = {
    leads: [
      objectiveResultMetric(insight, campaign, 'leads', currency),
      compactMetric({ label: result.costLabel, value: fmtCurrency(result.cost, currency, 2), sub: result.kind === 'messages' ? 'Messaging efficiency' : result.kind === 'calls' ? 'Call efficiency' : `Target ~${fmtCurrency(targetCpl, currency, 0)}`, tone: benchmarkCostTone(result.cost, result.kind === 'messages' ? Math.max(benchmark.cpc.optimal * 3, targetCpl * 0.4) : targetCpl) }),
      compactMetric({ label: result.rateLabel, value: `${num(result.rate).toFixed(2)}%`, sub: `${fmt(clicks)} clicks`, tone: benchmarkRateTone(num(result.rate), result.kind === 'messages' ? 4 : 5, 3) }),
      compactMetric({ label: 'Link Clicks', value: fmt(clicks), sub: percent(insight?.ctr), tone: clicks > 0 ? 'neutral' : 'watch' }),
      compactMetric({ label: 'CPC', value: fmtCurrency(cpcValue, currency, 2), sub: 'Traffic cost', tone: cpcValue > benchmark.cpc.max * 1.25 ? 'watch' : cpcValue > 0 && cpcValue <= benchmark.cpc.min * 1.2 ? 'good' : 'neutral' }),
      compactMetric({ label: 'CPM', value: fmtCurrency(cpmValue, currency, 2), sub: 'Auction cost', tone: cpmValue > benchmark.cpm.max * 1.3 ? 'watch' : 'neutral' }),
    ],
    engagement: [
      objectiveResultMetric(insight, campaign, 'engagement', currency),
      compactMetric({ label: 'Cost / Engage', value: fmtCurrency(insight?.cost_per_engagement, currency, 2), sub: 'Engagement efficiency', tone: num(insight?.cost_per_engagement) > 0.2 ? 'watch' : engagements > 0 ? 'good' : 'neutral' }),
      compactMetric({ label: 'Engagement Rate', value: percent(insight?.engagement_rate), sub: `${fmt(engagements)} engagements`, tone: num(insight?.engagement_rate) >= 2 ? 'good' : engagements > 0 ? 'watch' : 'risk' }),
      compactMetric({ label: 'Video Views', value: fmt(videoViews), sub: `${fmtCurrency(insight?.cost_per_video_view, currency, 3)} cost / view`, tone: videoViews > 0 ? 'good' : 'neutral' }),
      compactMetric({ label: 'Messages', value: fmt(insight?.messages), sub: 'Conversation signal', tone: num(insight?.messages) > 0 ? 'good' : 'neutral' }),
      compactMetric({ label: 'Frequency', value: fmt(insight?.frequency, 2), sub: 'Fatigue signal', tone: num(insight?.frequency) > 3.5 ? 'risk' : num(insight?.frequency) > 2.8 ? 'watch' : 'neutral' }),
    ],
    traffic: [
      objectiveResultMetric(insight, campaign, 'traffic', currency),
      compactMetric({ label: 'Cost / Link Click', value: fmtCurrency(insight?.cost_per_inline_link_click || insight?.cpc, currency, 2), sub: 'Traffic efficiency', tone: num(insight?.cost_per_inline_link_click || insight?.cpc) <= benchmark.cpc.min * 1.2 ? 'good' : num(insight?.cost_per_inline_link_click || insight?.cpc) > benchmark.cpc.max * 1.25 ? 'watch' : 'neutral' }),
      compactMetric({ label: 'CTR', value: percent(insight?.inline_link_click_ctr || insight?.ctr), sub: 'Click quality', tone: num(insight?.inline_link_click_ctr || insight?.ctr) >= benchmark.ctr.max ? 'good' : num(insight?.inline_link_click_ctr || insight?.ctr) < benchmark.ctr.min * 0.7 && num(insight?.impressions) > 1000 ? 'risk' : 'neutral' }),
      compactMetric({ label: 'Landing Views', value: fmt(insight?.page_views), sub: 'Detected page views', tone: num(insight?.page_views) > 0 ? 'good' : 'watch' }),
      compactMetric({ label: 'CPC', value: fmtCurrency(insight?.cpc, currency, 2), sub: 'All clicks', tone: 'neutral' }),
      compactMetric({ label: 'CPM', value: fmtCurrency(insight?.cpm, currency, 2), sub: 'Auction cost', tone: 'neutral' }),
    ],
    awareness: [
      objectiveResultMetric(insight, campaign, 'awareness', currency),
      compactMetric({ label: 'CPM', value: fmtCurrency(insight?.cpm, currency, 2), sub: 'Reach efficiency', tone: cpmValue <= benchmark.cpm.max ? 'good' : 'watch' }),
      compactMetric({ label: 'Frequency', value: fmt(insight?.frequency, 2), sub: 'Exposure depth', tone: num(insight?.frequency) > 3.5 ? 'risk' : num(insight?.frequency) >= 1.8 ? 'good' : 'neutral' }),
      compactMetric({ label: 'Impressions', value: fmt(insight?.impressions), sub: 'Delivery volume', tone: num(insight?.impressions) > 0 ? 'neutral' : 'watch' }),
      compactMetric({ label: 'Video Views', value: fmt(videoViews), sub: 'Attention signal', tone: videoViews > 0 ? 'good' : 'neutral' }),
      compactMetric({ label: 'Cost / View', value: fmtCurrency(insight?.cost_per_video_view, currency, 3), sub: 'Video efficiency', tone: num(insight?.cost_per_video_view) > 0.05 ? 'watch' : 'neutral' }),
    ],
    app_promotion: [
      objectiveResultMetric(insight, campaign, 'app_promotion', currency),
      compactMetric({ label: 'Cost / Install', value: fmtCurrency(insight?.cost_per_conversion, currency, 2), sub: 'Install/event proxy', tone: appInstalls > 0 ? 'good' : 'watch' }),
      compactMetric({ label: 'Install Rate', value: rate(appInstalls, clicks), sub: `${fmt(clicks)} clicks`, tone: clicks > 0 && appInstalls / clicks >= 0.05 ? 'good' : appInstalls > 0 ? 'watch' : 'risk' }),
      compactMetric({ label: 'Link Clicks', value: fmt(clicks), sub: percent(insight?.ctr), tone: clicks > 0 ? 'neutral' : 'watch' }),
      compactMetric({ label: 'CPC', value: fmtCurrency(insight?.cpc, currency, 2), sub: 'Traffic cost', tone: 'neutral' }),
      compactMetric({ label: 'CPM', value: fmtCurrency(insight?.cpm, currency, 2), sub: 'Auction cost', tone: 'neutral' }),
    ],
    sales: [
      objectiveResultMetric(insight, campaign, 'sales', currency),
      compactMetric({ label: 'ROAS', value: fmtRoas(roas), sub: purchaseValue ? `${fmtCurrency(purchaseValue, currency)} value` : 'Purchase value missing', tone: roas >= 2.5 ? 'good' : roas > 0 && roas < 1 ? 'risk' : roas > 0 ? 'watch' : 'risk' }),
      compactMetric({ label: 'Purchase Value', value: fmtCurrency(purchaseValue, currency), sub: `${fmt(purchases)} purchases`, tone: purchaseValue > 0 ? 'good' : purchases > 0 ? 'risk' : 'watch' }),
      compactMetric({ label: 'Cost / Purchase', value: fmtCurrency(costPerPurchase, currency, 2), sub: 'Sales efficiency', tone: benchmarkCostTone(costPerPurchase, benchmark.costPerConversion.optimal) }),
      compactMetric({ label: 'Checkout Starts', value: fmt(insight?.checkout_initiations), sub: `${fmt(insight?.add_to_cart)} add to cart`, tone: num(insight?.checkout_initiations) > 0 ? 'neutral' : num(insight?.add_to_cart) > 0 ? 'watch' : 'neutral' }),
      compactMetric({ label: 'Purchase Rate', value: rate(purchases, clicks), sub: `${fmt(clicks)} clicks`, tone: clicks > 0 && purchases / clicks >= 0.02 ? 'good' : purchases > 0 ? 'watch' : 'risk' }),
    ],
  }

  return byObjective[objectiveFamily] || byObjective.sales
}

function objectiveResultCount(insight: CampaignInsight | null | undefined, campaign: MetaCampaign, objectiveFamily: MetaObjectiveFamily) {
  const result = resolveMetaResultMetric(insight, campaign, objectiveFamily)
  if (result.kind === 'messages' || result.kind === 'calls' || result.kind === 'landing_page_views') return result.count
  if (objectiveFamily === 'leads') return num(insight?.leads)
  if (objectiveFamily === 'engagement') return num(insight?.post_engagements)
  if (objectiveFamily === 'traffic') return num(insight?.inline_link_clicks) || num(insight?.link_clicks_action) || num(insight?.clicks)
  if (objectiveFamily === 'awareness') return num(insight?.reach)
  if (objectiveFamily === 'app_promotion') return num(insight?.app_installs) || num(insight?.conversions)
  return num(insight?.purchases) || num(insight?.conversions)
}

function objectiveResultLabel(campaign: MetaCampaign, objectiveFamily: MetaObjectiveFamily) {
  const result = resolveMetaResultMetric(null, campaign, objectiveFamily)
  if (result.kind === 'messages' || result.kind === 'calls') return result.shortLabel
  if (objectiveFamily === 'leads') return 'leads'
  if (objectiveFamily === 'engagement') return 'engagements'
  if (objectiveFamily === 'traffic') return 'link clicks'
  if (objectiveFamily === 'awareness') return 'reach'
  if (objectiveFamily === 'app_promotion') return 'app installs/events'
  return 'purchases'
}

function objectiveReadout(row: any, currency: string) {
  const insight = row.insight
  const objective = row.analysis.objectiveFamily
  const result = resolveMetaResultMetric(insight, row.campaign, objective)
  const clicks = num(insight?.inline_link_clicks) || num(insight?.link_clicks_action) || num(insight?.clicks)
  const spend = fmtCurrency(insight?.spend, currency)
  const resultCount = fmt(objectiveResultCount(insight, row.campaign, objective))
  const label = objectiveResultLabel(row.campaign, objective)

  if (objective === 'sales') {
    const purchases = num(insight?.purchases) || num(insight?.conversions)
    const roas = roasValue(insight)
    const value = num(insight?.purchase_value)
    return purchases > 0
      ? `${spend} generated ${fmt(purchases)} purchases, ${fmtCurrency(value, currency)} purchase value, ${fmtRoas(roas)} ROAS, and ${fmtCurrency(costPerAction(insight?.spend, purchases, insight?.cost_per_conversion), currency, 2)} cost per purchase.`
      : `${spend} has not produced a tracked purchase yet. Judge this campaign by purchase volume, ROAS, purchase value, and checkout progress before scaling.`
  }

  if (objective === 'leads') {
    return `${spend} generated ${resultCount} ${label} at ${fmtCurrency(result.cost, currency, 2)} ${result.costLabel.toLowerCase()} from ${fmt(clicks)} clicks.`
  }

  if (objective === 'engagement') {
    return `${spend} generated ${resultCount} engagements with ${percent(insight?.engagement_rate)} engagement rate, ${percent(insight?.ctr)} CTR, and ${fmtCurrency(insight?.cost_per_engagement, currency, 2)} cost per engagement.`
  }

  if (objective === 'traffic') {
    return `${spend} generated ${resultCount} ${label} at ${fmtCurrency(result.cost, currency, 2)} ${result.costLabel.toLowerCase()} and ${percent(insight?.inline_link_click_ctr || insight?.ctr)} click-through rate.`
  }

  if (objective === 'awareness') {
    return `${spend} reached ${fmt(insight?.reach)} people with ${fmt(insight?.frequency, 2)} frequency and ${fmtCurrency(insight?.cpm, currency, 2)} CPM.`
  }

  if (objective === 'app_promotion') {
    return `${spend} generated ${resultCount} app installs/events from ${fmt(clicks)} clicks at ${fmtCurrency(insight?.cost_per_conversion, currency, 2)} cost per app event.`
  }

  return `${spend} generated ${resultCount} ${label}.`
}

function buildSelectedCampaignReadout(selectedRow: any, currency: string, rangeLabel: string, marketCode: MetaMarketCode): MetaCampaignReadout[] {
  if (!selectedRow) return []

  const metrics = campaignKpiMetrics(selectedRow.insight, selectedRow.campaign, selectedRow.analysis.objectiveFamily, currency, marketCode)
  const healthyMetrics = metrics.filter((metric) => metric.tone === 'good')
  const weakMetrics = metrics.filter((metric) => metric.tone === 'risk' || metric.tone === 'watch')
  const issues = selectedRow.analysis.suggestions.filter((item: MetaOptimizationSuggestion) => item.type !== 'success')
  const wins = selectedRow.analysis.suggestions.filter((item: MetaOptimizationSuggestion) => item.type === 'success')
  const topIssue = issues[0]
  const topWin = wins[0]
  const score = selectedRow.analysis.score
  const objectiveLabel = selectedRow.analysis.objectiveFamily.replace('_', ' ')

  const readout: MetaCampaignReadout[] = [
    {
      title: `${selectedRow.campaign.name}`,
      body: `${rangeLabel}. This is a ${objectiveLabel} campaign with a health score of ${score}/100. ${objectiveReadout(selectedRow, currency)}`,
      icon: BarChart3,
      tone: score >= 80 ? 'good' : score < 60 ? 'risk' : 'watch',
    },
  ]

  if (topWin || healthyMetrics.length) {
    const metricSummary = healthyMetrics.slice(0, 3).map((metric) => `${metric.label}: ${metric.value}`).join(', ')
    readout.push({
      title: topWin ? topWin.title : 'The campaign has healthy KPI signals',
      body: topWin
        ? `${topWin.description}${topWin.currentValue ? ` Current KPI: ${topWin.currentValue}.` : ''}${metricSummary ? ` Supporting metrics: ${metricSummary}.` : ''}`
        : `${metricSummary}. These are the signals to protect if you scale or test new variants.`,
      icon: CheckCircle2,
      tone: 'good',
    })
  }

  if (topIssue) {
    readout.push({
      title: topIssue.title,
      body: `${topIssue.description}${topIssue.currentValue ? ` Current KPI: ${topIssue.currentValue}.` : ''}${topIssue.targetValue ? ` Target: ${topIssue.targetValue}.` : ''}`,
      icon: AlertTriangle,
      tone: topIssue.priority === 'critical' || topIssue.priority === 'high' ? 'risk' : 'watch',
    })
  } else {
    const stable = weakMetrics.length
      ? `Watch ${weakMetrics.slice(0, 2).map((metric) => `${metric.label}: ${metric.value}`).join(' and ')}, but there is no severe campaign-level alarm in the selected range.`
      : 'The visible KPIs look healthy for this objective. Keep the current structure intact and use controlled tests rather than large edits.'
    readout.push({
      title: 'No major KPI risk is visible',
      body: stable,
      icon: TrendingUp,
      tone: 'good',
    })
  }

  return readout
}

function buildMetaActionInsights(selectedRow: any, currency: string): MetaActionInsight[] {
  const focus = selectedRow
  if (!focus) return []
  const insights: MetaActionInsight[] = []
  const selectedSuggestions = focus.analysis.suggestions
    .filter((suggestion: MetaOptimizationSuggestion) => suggestion.type !== 'success')
    .slice(0, 3)

  selectedSuggestions.forEach((suggestion: MetaOptimizationSuggestion) => {
    insights.push({
      title: suggestion.title,
      evidence: `${suggestion.description}${suggestion.currentValue ? ` Current: ${suggestion.currentValue}.` : ''}${suggestion.targetValue ? ` Target: ${suggestion.targetValue}.` : ''}`,
      action: suggestion.recommendations?.[0] || suggestion.impact || 'Prioritize this finding before scaling.',
      severity: suggestion.priority === 'critical' || suggestion.priority === 'high' ? 'high' : suggestion.priority === 'medium' ? 'medium' : 'low',
    })
  })

  if (focus.analysis.objectiveFamily === 'sales') {
    const purchases = num(focus.insight?.purchases) || num(focus.insight?.conversions)
    const roas = roasValue(focus.insight)
    const purchaseValue = num(focus.insight?.purchase_value)
    if (purchases > 0 && purchaseValue === 0) {
      insights.push({
        title: 'Purchase value tracking is incomplete',
        evidence: `${fmt(purchases)} purchases are visible, but purchase value is ${fmtCurrency(purchaseValue, currency)}.`,
        action: 'Pass value and currency with purchase events before making ROAS decisions.',
        severity: 'high',
      })
    } else if (roas >= 2.5) {
      insights.push({
        title: 'Sales efficiency is strong enough for a controlled scale test',
        evidence: `${fmtRoas(roas)} ROAS from ${fmtCurrency(purchaseValue, currency)} purchase value and ${fmtCurrency(focus.insight?.spend, currency)} spend.`,
        action: 'Increase budget in controlled 10-20% steps or duplicate into one expansion test while protecting the original ad set.',
        severity: 'low',
      })
    }
  }

  if (focus.analysis.objectiveFamily === 'leads' && num(focus.insight?.leads) > 0) {
    insights.push({
      title: 'Lead flow is measurable',
      evidence: `${fmt(focus.insight?.leads)} leads at ${fmtCurrency(costPerAction(focus.insight?.spend, focus.insight?.leads, focus.insight?.cost_per_lead), currency, 2)} cost per lead.`,
      action: 'Review lead quality before scaling; if quality is acceptable, test one budget increase and one new audience variant.',
      severity: focus.analysis.score >= 75 ? 'low' : 'medium',
    })
  }

  if (focus.analysis.objectiveFamily === 'engagement' && num(focus.insight?.post_engagements) > 0) {
    insights.push({
      title: 'Engagement signal is usable for retargeting',
      evidence: `${fmt(focus.insight?.post_engagements)} engagements with ${percent(focus.insight?.engagement_rate)} engagement rate.`,
      action: 'Build a warm audience from engagers and test a follow-up conversion or lead campaign with the same winning angle.',
      severity: 'low',
    })
  }

  if (!insights.length) {
    insights.push({
      title: focus.analysis.score >= 80 ? 'Results look healthy' : 'Keep optimizing before scaling',
      evidence: `${focus.campaign.name} is scoring ${focus.analysis.score}/100 for a ${focus.analysis.objectiveFamily.replace('_', ' ')} objective.`,
      action: focus.analysis.score >= 80
        ? 'Keep the current campaign structure stable, scale gradually, and use separate tests for creative or audience changes.'
        : 'Improve the weakest KPI first, then reassess after the next meaningful delivery window.',
      severity: focus.analysis.score >= 80 ? 'low' : 'medium',
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
  selectedRow,
  currency,
  rangeLabel,
  market,
  loading,
}: {
  selectedRow: any
  currency: string
  rangeLabel: string
  market: MetaMarketCode
  loading: boolean
}) {
  const panels = buildSelectedCampaignReadout(selectedRow, currency, rangeLabel, market)
  const actions = buildMetaActionInsights(selectedRow, currency)

  return (
    <Card className="rounded-lg p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-accent-purple/15 text-accent-purple">
            <Sparkles size={17} />
          </span>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-text-dim">AI Meta analyst</p>
            <h2 className="text-sm font-semibold text-text-primary">Campaign Performance Readout</h2>
          </div>
        </div>
        {selectedRow ? <Badge color="#8f72ff" variant="outline">{actions.length}</Badge> : null}
      </div>

      {loading ? (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-base/60 p-4 text-sm text-text-secondary">
          <Loader2 size={16} className="animate-spin text-accent-blue" />
          Loading Meta campaign data...
        </div>
      ) : !selectedRow ? (
        <div className="rounded-lg border border-border bg-base/60 p-4">
          <p className="text-sm font-semibold text-text-primary">Select a campaign to analyze it.</p>
          <p className="mt-1 text-xs leading-relaxed text-text-secondary">
            The analyst readout appears only after a campaign is selected so the insights stay campaign-specific and do not mix account-level or unrelated campaign signals.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {panels.map((panel) => {
            const Icon = panel.icon
            return (
              <div key={panel.title} className="rounded-lg border border-border bg-base/60 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Icon size={14} style={{ color: toneColor(panel.tone) }} />
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: toneColor(panel.tone) }} />
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
          <h3 className="text-sm font-semibold text-text-primary">Recommended Actions</h3>
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
              {selectedRow ? 'No campaign-specific action can be generated until this campaign has delivery data.' : 'Select a campaign to see campaign-specific recommendations.'}
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
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [loadingDetails, setLoadingDetails] = useState(false)
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
    setSelectedCampaignId('')
    setDetails(null)
    setCampaigns([])
    setInsights([])
    setSummary(null)
    setMetaDateRange(null)
    try {
      const token = await getAuthToken()
      const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      const [campaignResponse, insightResponse] = await Promise.all([
        fetch(`/api/integrations/meta/campaigns?accountId=${encodeURIComponent(selectedAccountId)}`, {
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
    } catch (error: any) {
      if (requestId === dataRequestRef.current) toast.error(error.message || 'Failed to load Meta data')
    } finally {
      if (requestId === dataRequestRef.current) setLoadingData(false)
    }
  }, [datePreset, selectedAccountId])

  const selectCampaign = useCallback((campaignId: string) => {
    setDetails(null)
    setSelectedCampaignId(campaignId)
  }, [])

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
  const selectedInsight = details?.insight || selectedRow?.insight || null
  const selectedCampaign = (details?.campaign as MetaCampaign | undefined) || selectedRow?.campaign
  const selectedAnalysisRow = selectedRow && selectedCampaign
    ? {
        ...selectedRow,
        campaign: selectedCampaign,
        insight: selectedInsight,
        analysis: analyzeMetaCampaign(selectedInsight, selectedCampaign, market),
      }
    : null

  useEffect(() => {
    if (selectedCampaignId && filteredRows.length && !filteredRows.some((row) => row.campaign.id === selectedCampaignId)) {
      setSelectedCampaignId('')
      setDetails(null)
    }
  }, [filteredRows, selectedCampaignId])

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
                          onClick={() => selectCampaign(campaign.id)}
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
                          <td className="px-4 py-3">{fmt(objectiveResultCount(insight, campaign, analysis.objectiveFamily))} {objectiveResultLabel(campaign, analysis.objectiveFamily)}</td>
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
                const objectiveKpis = campaignKpiMetrics(insight, campaign, analysis.objectiveFamily, accountCurrency, market)

                return (
                  <Card
                    key={campaign.id}
                    hover
                    onClick={() => selectCampaign(campaign.id)}
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
                          {campaign.objective || 'No objective'} · {getMetaConversionLocationLabel(campaign)} location · Daily {budget(campaign.daily_budget)} · Lifetime {budget(campaign.lifetime_budget)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-[11px] uppercase tracking-wider text-text-dim">Health Score</p>
                        <p className="font-heading text-3xl font-semibold text-text-primary">{analysis.score}</p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      {[
                        { label: 'Spend', value: fmtCurrency(insight?.spend, accountCurrency), sub: campaignSpendPeriodLabel(campaign, insight, metaDateRange) },
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
              selectedRow={selectedAnalysisRow}
              currency={accountCurrency}
              rangeLabel={dateRangeLabel(details?.dateRange || metaDateRange)}
              market={market}
              loading={loadingData || loadingAccounts || Boolean(selectedCampaignId && loadingDetails)}
            />

            <Card className="rounded-lg p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-wider text-text-dim">Selected Campaign</p>
                  <h2 className="mt-1 text-sm font-semibold text-text-primary">{selectedAnalysisRow?.campaign.name || 'No campaign selected'}</h2>
                </div>
                {loadingDetails ? <Loader2 size={16} className="animate-spin text-accent-blue" /> : <Layers3 size={17} className="text-accent-blue" />}
              </div>

              {selectedAnalysisRow && loadingDetails ? (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-base/60 p-4 text-sm text-text-secondary">
                  <Loader2 size={16} className="animate-spin text-accent-blue" />
                  Loading selected campaign data for {dateRangeLabel(metaDateRange)}...
                </div>
              ) : selectedAnalysisRow ? (
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-lg border border-border bg-base/60 p-3">
                        <p className="text-[10px] font-mono uppercase text-text-dim">Objective</p>
                        <p className="mt-1 text-sm font-semibold text-text-primary">{mapMetaObjectiveToFamily(selectedAnalysisRow.campaign.objective)}</p>
                      </div>
                      <div className="rounded-lg border border-border bg-base/60 p-3">
                        <p className="text-[10px] font-mono uppercase text-text-dim">Location</p>
                        <p className="mt-1 text-sm font-semibold text-text-primary">{getMetaConversionLocationLabel(selectedAnalysisRow.campaign)}</p>
                      </div>
                      <div className="rounded-lg border border-border bg-base/60 p-3">
                        <p className="text-[10px] font-mono uppercase text-text-dim">Score</p>
                        <p className="mt-1 text-sm font-semibold text-text-primary">{selectedAnalysisRow.analysis.score}/100</p>
                      </div>
                    </div>

                  <div className="rounded-lg border border-border bg-base/60 p-3">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <Badge color={statusBadgeColor(campaignStatusGroup(selectedAnalysisRow.campaign))} variant="outline">
                        {campaignStatus(selectedAnalysisRow.campaign)}
                      </Badge>
                      <Badge color="#4f8ef7" variant="outline">{datePreset.replaceAll('_', ' ')}</Badge>
                      <Badge color="#8f72ff" variant="outline">{dateRangeLabel(details?.dateRange || metaDateRange)}</Badge>
                      <Badge color="#18c7b6" variant="outline">{selectedAnalysisRow.analysis.benchmark.country}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="font-mono uppercase tracking-wider text-text-dim">Configured</p>
                        <p className="mt-1 text-text-primary">{selectedAnalysisRow.campaign.configured_status || selectedAnalysisRow.campaign.status || 'Unknown'}</p>
                      </div>
                      <div>
                        <p className="font-mono uppercase tracking-wider text-text-dim">Effective</p>
                        <p className="mt-1 text-text-primary">{selectedAnalysisRow.campaign.effective_status || 'Unknown'}</p>
                      </div>
                      <div>
                        <p className="font-mono uppercase tracking-wider text-text-dim">Daily Budget</p>
                        <p className="mt-1 text-text-primary">{budget(selectedAnalysisRow.campaign.daily_budget)}</p>
                      </div>
                      <div>
                        <p className="font-mono uppercase tracking-wider text-text-dim">Lifetime</p>
                        <p className="mt-1 text-text-primary">{budget(selectedAnalysisRow.campaign.lifetime_budget)}</p>
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
                      { label: 'Spend', value: fmtCurrency(selectedAnalysisRow.insight?.spend, accountCurrency) },
                      { label: 'Impr.', value: fmt(selectedAnalysisRow.insight?.impressions) },
                      { label: 'Reach', value: fmt(selectedAnalysisRow.insight?.reach) },
                      { label: 'Clicks', value: fmt(selectedAnalysisRow.insight?.clicks) },
                      { label: 'CTR', value: percent(selectedAnalysisRow.insight?.ctr) },
                      { label: 'Freq.', value: fmt(selectedAnalysisRow.insight?.frequency, 2) },
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
                      {campaignKpiMetrics(selectedAnalysisRow.insight, selectedAnalysisRow.campaign, selectedAnalysisRow.analysis.objectiveFamily, accountCurrency, market).slice(0, 6).map((metric) => (
                        <div key={metric.key} className="rounded-md border border-border/70 bg-card/60 p-2">
                          <div className="mb-1 h-1 w-8 rounded-full" style={{ backgroundColor: metric.color }} />
                          <p className="text-[9px] font-mono uppercase tracking-wider text-text-dim">{metric.label}</p>
                          <p className="mt-0.5 text-sm font-semibold text-text-primary">{metric.value}</p>
                          {metric.sub ? <p className="mt-0.5 text-[10px] text-text-secondary">{metric.sub}</p> : null}
                        </div>
                      ))}
                    </div>
                  </div>

                  <SuggestionList suggestions={selectedAnalysisRow.analysis.suggestions} />

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
