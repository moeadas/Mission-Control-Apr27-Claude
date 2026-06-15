export type GoogleAdsCampaignFamily =
  | 'search'
  | 'performance_max'
  | 'shopping'
  | 'video'
  | 'display'
  | 'demand_gen'
  | 'app'
  | 'local'
  | 'unknown'

export type GoogleAdsObjectiveFamily = 'leads' | 'sales' | 'traffic' | 'awareness' | 'engagement' | 'app'
export type GoogleAdsMarketCode = 'AE' | 'SA' | 'EG' | 'JO' | 'LB' | 'KW' | 'QA' | 'BH' | 'OM'
export type GoogleAdsTone = 'good' | 'watch' | 'risk' | 'neutral'

export interface GoogleAdsCampaignLike {
  id: string
  name: string
  status?: string
  advertisingChannelType?: string
  advertisingChannelSubType?: string
  biddingStrategyType?: string
  startDate?: string
  endDate?: string
}

export interface GoogleAdsMetricsLike {
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

export interface GoogleAdsKpiCard {
  key: string
  label: string
  value: string
  sub?: string
  tone: GoogleAdsTone
}

export interface GoogleAdsFinding {
  type: 'success' | 'warning' | 'error' | 'info'
  priority: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  kpi?: string
  currentValue?: string
  targetValue?: string
  recommendations: string[]
}

export const GOOGLE_ADS_MARKET_OPTIONS: Array<{ value: GoogleAdsMarketCode; label: string }> = [
  { value: 'JO', label: 'Jordan' },
  { value: 'AE', label: 'United Arab Emirates' },
  { value: 'SA', label: 'Saudi Arabia' },
  { value: 'EG', label: 'Egypt' },
  { value: 'LB', label: 'Lebanon' },
  { value: 'KW', label: 'Kuwait' },
  { value: 'QA', label: 'Qatar' },
  { value: 'BH', label: 'Bahrain' },
  { value: 'OM', label: 'Oman' },
]

const MARKET_BENCHMARKS: Record<GoogleAdsMarketCode, {
  country: string
  searchCtr: number
  displayCtr: number
  cpc: number
  cpa: number
  roas: number
  conversionRate: number
}> = {
  JO: { country: 'Jordan', searchCtr: 4.0, displayCtr: 0.6, cpc: 0.65, cpa: 22, roas: 2.0, conversionRate: 3.0 },
  AE: { country: 'United Arab Emirates', searchCtr: 4.5, displayCtr: 0.7, cpc: 1.6, cpa: 55, roas: 2.2, conversionRate: 3.0 },
  SA: { country: 'Saudi Arabia', searchCtr: 4.2, displayCtr: 0.65, cpc: 1.1, cpa: 40, roas: 2.1, conversionRate: 3.0 },
  EG: { country: 'Egypt', searchCtr: 3.5, displayCtr: 0.45, cpc: 0.35, cpa: 15, roas: 1.8, conversionRate: 2.5 },
  LB: { country: 'Lebanon', searchCtr: 3.7, displayCtr: 0.5, cpc: 0.55, cpa: 20, roas: 1.8, conversionRate: 2.5 },
  KW: { country: 'Kuwait', searchCtr: 4.4, displayCtr: 0.65, cpc: 1.25, cpa: 45, roas: 2.2, conversionRate: 3.0 },
  QA: { country: 'Qatar', searchCtr: 4.4, displayCtr: 0.65, cpc: 1.35, cpa: 48, roas: 2.2, conversionRate: 3.0 },
  BH: { country: 'Bahrain', searchCtr: 4.0, displayCtr: 0.55, cpc: 0.95, cpa: 32, roas: 2.0, conversionRate: 2.8 },
  OM: { country: 'Oman', searchCtr: 3.8, displayCtr: 0.55, cpc: 0.8, cpa: 28, roas: 2.0, conversionRate: 2.8 },
}

function n(value: unknown) {
  const parsed = Number.parseFloat(String(value ?? 0))
  return Number.isFinite(parsed) ? parsed : 0
}

function money(value: unknown, currency = 'USD', digits = 0) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(n(value))
}

function fmt(value: unknown, digits = 0) {
  const parsed = n(value)
  if (parsed >= 1_000_000) return `${(parsed / 1_000_000).toFixed(1)}M`
  if (parsed >= 1_000) return `${(parsed / 1_000).toFixed(1)}K`
  return parsed.toLocaleString('en-US', { maximumFractionDigits: digits, minimumFractionDigits: digits })
}

function pct(value: unknown, digits = 2) {
  return `${n(value).toFixed(digits)}%`
}

function roas(metrics: GoogleAdsMetricsLike) {
  const cost = n(metrics.cost)
  const value = n(metrics.conversionValue) || n(metrics.allConversionValue)
  return cost > 0 && value > 0 ? value / cost : 0
}

function cpa(metrics: GoogleAdsMetricsLike) {
  const conversions = n(metrics.conversions) || n(metrics.allConversions)
  return conversions > 0 ? n(metrics.cost) / conversions : n(metrics.costPerConversion)
}

function conversionRate(metrics: GoogleAdsMetricsLike) {
  return n(metrics.clicks) > 0 ? (n(metrics.conversions) / n(metrics.clicks)) * 100 : 0
}

function costTone(value: number, target: number): GoogleAdsTone {
  if (!value || !target) return 'neutral'
  if (value <= target * 1.15) return 'good'
  if (value <= target * 1.75) return 'watch'
  return 'risk'
}

function rateTone(value: number, good: number, watch = good * 0.65): GoogleAdsTone {
  if (!value) return 'risk'
  if (value >= good) return 'good'
  if (value >= watch) return 'watch'
  return 'risk'
}

function valueTone(value: number, good: number, watch = good * 0.65): GoogleAdsTone {
  if (!value) return 'neutral'
  if (value >= good) return 'good'
  if (value >= watch) return 'watch'
  return 'risk'
}

export function mapGoogleAdsCampaignFamily(campaign: GoogleAdsCampaignLike): GoogleAdsCampaignFamily {
  const channel = String(campaign.advertisingChannelType || '').toUpperCase()
  const sub = String(campaign.advertisingChannelSubType || '').toUpperCase()
  if (channel === 'PERFORMANCE_MAX') return 'performance_max'
  if (channel === 'SEARCH') return 'search'
  if (channel === 'SHOPPING') return 'shopping'
  if (channel === 'VIDEO') return 'video'
  if (channel === 'DISPLAY') return 'display'
  if (channel === 'DEMAND_GEN' || sub.includes('DEMAND_GEN')) return 'demand_gen'
  if (channel === 'MULTI_CHANNEL' && sub.includes('APP')) return 'app'
  if (channel === 'APP') return 'app'
  if (channel === 'LOCAL') return 'local'
  return 'unknown'
}

export function inferGoogleAdsObjective(campaign: GoogleAdsCampaignLike, metrics: GoogleAdsMetricsLike = {}): GoogleAdsObjectiveFamily {
  const family = mapGoogleAdsCampaignFamily(campaign)
  const text = [
    campaign.name,
    campaign.biddingStrategyType,
    campaign.advertisingChannelType,
    campaign.advertisingChannelSubType,
  ].join(' ').toLowerCase()

  if (family === 'app' || /install|app/.test(text)) return 'app'
  if (family === 'video' && !/lead|sale|purchase|conversion|shop/.test(text)) return 'awareness'
  if (/(sale|purchase|roas|value|shop|shopping|cart|revenue|ecomm)/.test(text) || family === 'shopping') return 'sales'
  if (/(lead|form|call|whatsapp|contact|quote|signup|conversion)/.test(text) || n(metrics.conversions) > 0) return 'leads'
  if (/(traffic|click|visit|website)/.test(text)) return 'traffic'
  if (family === 'display' || family === 'demand_gen' || /engagement|view|awareness|reach|brand/.test(text)) return 'awareness'
  return family === 'search' ? 'leads' : 'traffic'
}

export function buildGoogleAdsKpis(
  campaign: GoogleAdsCampaignLike,
  metrics: GoogleAdsMetricsLike,
  currency = 'USD',
  marketCode: string = 'JO'
): GoogleAdsKpiCard[] {
  const objective = inferGoogleAdsObjective(campaign, metrics)
  const family = mapGoogleAdsCampaignFamily(campaign)
  const benchmark = MARKET_BENCHMARKS[String(marketCode || 'JO').toUpperCase() as GoogleAdsMarketCode] || MARKET_BENCHMARKS.JO
  const conversions = n(metrics.conversions)
  const allConversions = n(metrics.allConversions)
  const cost = n(metrics.cost)
  const clicks = n(metrics.clicks)
  const impressions = n(metrics.impressions)
  const convRate = conversionRate(metrics)
  const cpaValue = cpa(metrics)
  const roasValue = roas(metrics)
  const ctrTarget = family === 'search' ? benchmark.searchCtr : benchmark.displayCtr

  const card = (label: string, value: string, sub: string, tone: GoogleAdsTone = 'neutral'): GoogleAdsKpiCard => ({
    key: label,
    label,
    value,
    sub,
    tone,
  })

  if (objective === 'sales') {
    return [
      card('Conversions', fmt(conversions || allConversions), `${money(cpaValue, currency, 2)} CPA`, conversions > 0 ? 'good' : 'risk'),
      card('ROAS', roasValue ? `${roasValue.toFixed(2)}x` : 'Not tracked', `${money(n(metrics.conversionValue), currency)} value`, valueTone(roasValue, benchmark.roas)),
      card('Conv. Value', money(n(metrics.conversionValue), currency), 'Tracked revenue/value', n(metrics.conversionValue) > 0 ? 'good' : 'watch'),
      card('Conv. Rate', pct(convRate), `${fmt(clicks)} clicks`, rateTone(convRate, benchmark.conversionRate)),
      card('CPA', money(cpaValue, currency, 2), `Target ~${money(benchmark.cpa, currency, 0)}`, costTone(cpaValue, benchmark.cpa)),
      card('CTR', pct(n(metrics.ctr)), 'Creative/search pull', rateTone(n(metrics.ctr), ctrTarget)),
    ]
  }

  if (objective === 'leads') {
    return [
      card('Conversions', fmt(conversions || allConversions), `${money(cpaValue, currency, 2)} cost / conversion`, conversions > 0 ? 'good' : 'risk'),
      card('CPA', money(cpaValue, currency, 2), `Lead efficiency`, costTone(cpaValue, benchmark.cpa)),
      card('Conv. Rate', pct(convRate), `${fmt(clicks)} clicks`, rateTone(convRate, benchmark.conversionRate)),
      card('CTR', pct(n(metrics.ctr)), family === 'search' ? 'Search intent pull' : 'Ad pull', rateTone(n(metrics.ctr), ctrTarget)),
      card('Avg. CPC', money(n(metrics.averageCpc), currency, 2), 'Traffic cost', costTone(n(metrics.averageCpc), benchmark.cpc)),
      card('Impr. Share', pct(n(metrics.searchImpressionShare)), 'Search visibility', family === 'search' ? valueTone(n(metrics.searchImpressionShare), 35, 20) : 'neutral'),
    ]
  }

  if (objective === 'app') {
    return [
      card('App Conversions', fmt(conversions || allConversions), `${money(cpaValue, currency, 2)} cost / event`, conversions > 0 ? 'good' : 'watch'),
      card('Interactions', fmt(n(metrics.interactions)), `${pct(n(metrics.interactionRate))} interaction rate`, n(metrics.interactions) > 0 ? 'good' : 'neutral'),
      card('CPA', money(cpaValue, currency, 2), 'Install/event efficiency', costTone(cpaValue, benchmark.cpa)),
      card('Clicks', fmt(clicks), `${money(n(metrics.averageCpc), currency, 2)} CPC`, clicks > 0 ? 'neutral' : 'watch'),
      card('CTR', pct(n(metrics.ctr)), 'Creative pull', rateTone(n(metrics.ctr), benchmark.displayCtr)),
      card('Cost', money(cost, currency), 'Selected period', 'neutral'),
    ]
  }

  if (objective === 'awareness' || family === 'video') {
    return [
      card(family === 'video' ? 'Video Views' : 'Impressions', fmt(family === 'video' ? n(metrics.videoViews) : impressions), family === 'video' ? `${money(n(metrics.averageCpv), currency, 3)} CPV` : `${money(n(metrics.averageCpm), currency, 2)} CPM`, family === 'video' ? n(metrics.videoViews) > 0 ? 'good' : 'watch' : impressions > 0 ? 'good' : 'watch'),
      card('View Rate', pct(n(metrics.videoViewRate)), 'Video attention', family === 'video' ? rateTone(n(metrics.videoViewRate), 15, 8) : 'neutral'),
      card('Avg. CPM', money(n(metrics.averageCpm), currency, 2), 'Reach cost', n(metrics.averageCpm) > 0 ? 'neutral' : 'watch'),
      card('Interactions', fmt(n(metrics.interactions)), `${pct(n(metrics.interactionRate))} rate`, n(metrics.interactions) > 0 ? 'neutral' : 'watch'),
      card('CTR', pct(n(metrics.ctr)), 'Secondary click signal', 'neutral'),
      card('Conversions', fmt(conversions), 'Down-funnel signal', conversions > 0 ? 'good' : 'neutral'),
    ]
  }

  return [
    card('Clicks', fmt(clicks), `${money(n(metrics.averageCpc), currency, 2)} CPC`, clicks > 0 ? 'good' : 'watch'),
    card('CTR', pct(n(metrics.ctr)), 'Click quality', rateTone(n(metrics.ctr), ctrTarget)),
    card('Avg. CPC', money(n(metrics.averageCpc), currency, 2), 'Traffic efficiency', costTone(n(metrics.averageCpc), benchmark.cpc)),
    card('Conversions', fmt(conversions), `${money(cpaValue, currency, 2)} CPA`, conversions > 0 ? 'good' : 'neutral'),
    card('Conv. Rate', pct(convRate), `${fmt(clicks)} clicks`, conversions > 0 ? rateTone(convRate, benchmark.conversionRate) : 'neutral'),
    card('Impressions', fmt(impressions), `${money(n(metrics.averageCpm), currency, 2)} CPM`, impressions > 0 ? 'neutral' : 'watch'),
  ]
}

export function analyzeGoogleAdsCampaign(
  campaign: GoogleAdsCampaignLike,
  metrics: GoogleAdsMetricsLike,
  marketCode = 'JO',
  currency = 'USD'
) {
  const family = mapGoogleAdsCampaignFamily(campaign)
  const objective = inferGoogleAdsObjective(campaign, metrics)
  const benchmark = MARKET_BENCHMARKS[String(marketCode || 'JO').toUpperCase() as GoogleAdsMarketCode] || MARKET_BENCHMARKS.JO
  const findings: GoogleAdsFinding[] = []
  const conversions = n(metrics.conversions)
  const cost = n(metrics.cost)
  const clicks = n(metrics.clicks)
  const impressions = n(metrics.impressions)
  const ctr = n(metrics.ctr)
  const cpc = n(metrics.averageCpc)
  const convRate = conversionRate(metrics)
  const cpaValue = cpa(metrics)
  const roasValue = roas(metrics)
  const ctrTarget = family === 'search' ? benchmark.searchCtr : benchmark.displayCtr

  const push = (finding: GoogleAdsFinding) => findings.push(finding)

  if (!impressions && !clicks && !cost) {
    push({
      type: 'info',
      priority: 'low',
      title: 'More Google Ads delivery data needed',
      description: 'This campaign has no visible delivery in the selected period.',
      kpi: 'Delivery',
      currentValue: 'No delivery',
      targetValue: '24-48 hours of data',
      recommendations: ['Confirm campaign status and date range', 'Check budget, policy, and bidding eligibility', 'Wait for enough impressions before making optimization changes'],
    })
    return { family, objective, findings, score: 50 }
  }

  if ((objective === 'leads' || objective === 'sales') && clicks > 40 && conversions === 0) {
    push({
      type: 'error',
      priority: 'critical',
      title: `No ${objective === 'sales' ? 'sales conversions' : 'lead conversions'} despite traffic`,
      description: `${fmt(clicks)} clicks produced 0 tracked conversions in the selected period.`,
      kpi: 'Conversions',
      currentValue: '0',
      targetValue: `${Math.ceil(clicks * 0.02)}+`,
      recommendations: ['Verify Google Ads conversion tracking and primary goals', 'Check landing page form/checkout manually', 'Review search terms or audience signals for mismatch'],
    })
  }

  if ((objective === 'leads' || objective === 'sales') && conversions > 0 && cpaValue > benchmark.cpa * 1.5) {
    push({
      type: 'warning',
      priority: 'high',
      title: `CPA is high for ${benchmark.country}`,
      description: `Cost per conversion is ${money(cpaValue, currency, 2)}, above a local target of about ${money(benchmark.cpa, currency, 0)}.`,
      kpi: 'CPA',
      currentValue: money(cpaValue, currency, 2),
      targetValue: `~${money(benchmark.cpa, currency, 0)}`,
      recommendations: ['Split high-intent keywords or asset groups from broad traffic', 'Add negative keywords/search term exclusions where intent is weak', 'Improve landing page proof and form friction before increasing budget'],
    })
  }

  if (objective === 'sales') {
    if (roasValue > 0 && roasValue < benchmark.roas) {
      push({
        type: 'warning',
        priority: roasValue < 1 ? 'critical' : 'high',
        title: 'ROAS is below scale threshold',
        description: `ROAS is ${roasValue.toFixed(2)}x from ${money(cost, currency)} cost and ${money(n(metrics.conversionValue), currency)} tracked value.`,
        kpi: 'ROAS',
        currentValue: `${roasValue.toFixed(2)}x`,
        targetValue: `${benchmark.roas.toFixed(1)}x+`,
        recommendations: ['Hold scale until value efficiency improves', 'Separate best-selling products or high-margin categories', 'Check that conversion values are passed correctly'],
      })
    } else if (roasValue >= benchmark.roas * 1.4) {
      push({
        type: 'success',
        priority: 'medium',
        title: 'ROAS can support controlled scale',
        description: `ROAS is ${roasValue.toFixed(2)}x, above the ${benchmark.country} scale threshold.`,
        kpi: 'ROAS',
        currentValue: `${roasValue.toFixed(2)}x`,
        targetValue: `Protect ${benchmark.roas.toFixed(1)}x+`,
        recommendations: ['Increase budget gradually', 'Use this campaign as the benchmark for weaker sales campaigns', 'Expand only if CPA and conversion value stay stable'],
      })
    }
  }

  if (impressions > 1000 && ctr > 0 && ctr < ctrTarget * 0.55 && objective !== 'awareness') {
    push({
      type: 'warning',
      priority: 'high',
      title: family === 'search' ? 'Search CTR is weak' : 'Ad CTR is weak',
      description: `CTR is ${pct(ctr)}, below the expected ${benchmark.country} target of ${pct(ctrTarget)} for this campaign type.`,
      kpi: 'CTR',
      currentValue: pct(ctr),
      targetValue: `${pct(ctrTarget)}+`,
      recommendations: family === 'search'
        ? ['Rewrite RSAs around the highest-intent query themes', 'Add tighter ad groups for mixed-intent keywords', 'Review search terms and add negatives']
        : ['Refresh the visual hook and opening promise', 'Test stronger offer-led creative', 'Segment prospecting and remarketing audiences'],
    })
  } else if (ctr >= ctrTarget * 1.2 && objective !== 'awareness') {
    push({
      type: 'success',
      priority: 'low',
      title: 'CTR is a strength',
      description: `CTR is ${pct(ctr)}, which is strong for ${benchmark.country} and this campaign type.`,
      kpi: 'CTR',
      currentValue: pct(ctr),
      targetValue: `Maintain ${pct(ctrTarget)}+`,
      recommendations: ['Use the current message as the creative benchmark', 'Test budget growth carefully', 'Build retargeting or similar query/audience tests from this pattern'],
    })
  }

  if (cpc > benchmark.cpc * 1.75 && clicks > 30) {
    push({
      type: 'warning',
      priority: 'medium',
      title: `CPC is elevated for ${benchmark.country}`,
      description: `Average CPC is ${money(cpc, currency, 2)}, above the local target of about ${money(benchmark.cpc, currency, 2)}.`,
      kpi: 'CPC',
      currentValue: money(cpc, currency, 2),
      targetValue: `~${money(benchmark.cpc, currency, 2)}`,
      recommendations: ['Improve Quality Score signals through tighter ad-to-landing-page match', 'Reduce broad/broad-match waste', 'Use bid strategy guardrails if CPA/ROAS is unstable'],
    })
  }

  if (family === 'search') {
    const lostBudget = n(metrics.searchBudgetLostImpressionShare)
    const lostRank = n(metrics.searchRankLostImpressionShare)
    if (lostBudget > 20 && (objective !== 'sales' || roasValue >= benchmark.roas)) {
      push({
        type: 'warning',
        priority: 'medium',
        title: 'Budget is limiting profitable search visibility',
        description: `Search lost impression share due to budget is ${pct(lostBudget)}.`,
        kpi: 'Lost IS budget',
        currentValue: pct(lostBudget),
        targetValue: '<10%',
        recommendations: ['Shift budget from weaker campaigns into this search campaign', 'Increase daily budget only if CPA/ROAS stays healthy', 'Protect exact/high-intent terms first'],
      })
    }
    if (lostRank > 35) {
      push({
        type: 'warning',
        priority: 'medium',
        title: 'Ad rank is suppressing search coverage',
        description: `Search lost impression share due to rank is ${pct(lostRank)}.`,
        kpi: 'Lost IS rank',
        currentValue: pct(lostRank),
        targetValue: '<25%',
        recommendations: ['Improve ad relevance and landing-page experience', 'Audit keyword quality by ad group', 'Raise bids only on proven high-intent segments'],
      })
    }
  }

  if (family === 'video' && n(metrics.videoViews) > 0 && n(metrics.videoViewRate) < 10) {
    push({
      type: 'warning',
      priority: 'medium',
      title: 'Video view rate is thin',
      description: `Video view rate is ${pct(n(metrics.videoViewRate))}; the opening seconds are not holding enough attention.`,
      kpi: 'View rate',
      currentValue: pct(n(metrics.videoViewRate)),
      targetValue: '15%+',
      recommendations: ['Move the main promise into the first 3 seconds', 'Test a more direct visual hook', 'Separate skippable reach creative from conversion creative'],
    })
  }

  if (!findings.some((item) => item.type !== 'success')) {
    push({
      type: 'success',
      priority: 'low',
      title: 'Campaign fundamentals look healthy',
      description: `${campaign.name} has no major KPI alarms in the selected period.`,
      kpi: 'Health',
      currentValue: 'Stable',
      targetValue: 'Maintain',
      recommendations: ['Use this campaign as a benchmark for weaker campaigns', 'Scale gradually rather than restructuring', 'Keep monitoring conversion quality and search/audience mix'],
    })
  }

  const penalties = findings.reduce((total, item) => {
    if (item.priority === 'critical') return total + 28
    if (item.priority === 'high') return total + 18
    if (item.priority === 'medium') return total + 9
    return total + 2
  }, 0)
  const successes = findings.filter((item) => item.type === 'success').length
  const score = Math.max(35, Math.min(96, 82 + successes * 4 - penalties))

  return { family, objective, findings, score }
}
