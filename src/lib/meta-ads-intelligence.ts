export type MetaObjectiveFamily = 'awareness' | 'traffic' | 'engagement' | 'leads' | 'app_promotion' | 'sales'
export type MetaMarketCode = 'AE' | 'SA' | 'EG' | 'JO' | 'LB' | 'KW' | 'QA' | 'BH' | 'OM'
export type MetaSuggestionPriority = 'critical' | 'high' | 'medium' | 'low'
export type MetaSuggestionType = 'success' | 'warning' | 'error' | 'info'

export interface MetaObjectiveKpis {
  primary: string[]
  secondary: string[]
  diagnostic: string[]
  skipMetrics: string[]
  skipAlerts: string[]
}

export interface MetaCountryBenchmark {
  code: MetaMarketCode
  country: string
  cpm: { min: number; max: number; optimal: number }
  cpc: { min: number; max: number; optimal: number }
  ctr: { min: number; max: number; optimal: number }
  costPerConversion: { min: number; max: number; optimal: number }
  marketContext: string
  competitionLevel: 'low' | 'medium' | 'high' | 'very_high'
}

export interface MetaInsightLike {
  impressions?: string | number
  clicks?: string | number
  spend?: string | number
  reach?: string | number
  frequency?: string | number
  ctr?: string | number
  cpc?: string | number
  cpm?: string | number
  conversions?: string | number
  conversion_rate?: string | number
  cost_per_conversion?: string | number
  leads?: string | number
  cost_per_lead?: string | number
  post_engagements?: string | number
  engagement_rate?: string | number
  video_views?: string | number
  inline_link_clicks?: string | number
  inline_link_click_ctr?: string | number
}

export interface MetaCampaignLike {
  id?: string
  name?: string
  objective?: string
  status?: string
  daily_budget?: string | number
  lifetime_budget?: string | number
  country_code?: string
  targeting_country?: string
}

export interface MetaOptimizationSuggestion {
  type: MetaSuggestionType
  priority: MetaSuggestionPriority
  category: string
  title: string
  description: string
  kpi?: string
  currentValue?: string
  targetValue?: string
  recommendations: string[]
  impact?: string
  source?: 'meta_official' | 'benchmark' | 'best_practice'
  country?: string
}

export const META_MARKET_OPTIONS: Array<{ value: MetaMarketCode; label: string }> = [
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

export const OBJECTIVE_KPI_MAP: Record<MetaObjectiveFamily, MetaObjectiveKpis> = {
  awareness: {
    primary: ['reach', 'impressions', 'cpm', 'frequency'],
    secondary: ['video_views', 'thruplay_rate', 'hook_rate'],
    diagnostic: ['ctr', 'engagement_rate'],
    skipMetrics: ['conversions', 'cost_per_conversion', 'conversion_rate', 'roas', 'purchases'],
    skipAlerts: ['zero_conversions', 'low_conversion_rate', 'high_cost_per_conversion'],
  },
  traffic: {
    primary: ['clicks', 'cpc', 'ctr', 'inline_link_clicks'],
    secondary: ['landing_page_views', 'inline_link_click_ctr'],
    diagnostic: ['impressions', 'cpm'],
    skipMetrics: ['conversions', 'roas'],
    skipAlerts: ['zero_conversions', 'low_roas'],
  },
  engagement: {
    primary: ['post_engagements', 'engagement_rate', 'video_views'],
    secondary: ['reactions', 'saves', 'cost_per_engagement'],
    diagnostic: ['reach', 'impressions', 'frequency'],
    skipMetrics: ['conversions', 'roas', 'purchases'],
    skipAlerts: ['zero_conversions', 'low_conversion_rate'],
  },
  leads: {
    primary: ['leads', 'cost_per_lead', 'lead_rate'],
    secondary: ['form_submissions', 'form_opens', 'ctr'],
    diagnostic: ['clicks', 'impressions', 'cpm'],
    skipMetrics: ['roas', 'purchases'],
    skipAlerts: ['low_roas'],
  },
  app_promotion: {
    primary: ['app_installs', 'cost_per_install', 'app_events'],
    secondary: ['app_engagement', 'retention_rate'],
    diagnostic: ['clicks', 'impressions'],
    skipMetrics: ['roas'],
    skipAlerts: ['low_roas'],
  },
  sales: {
    primary: ['conversions', 'roas', 'cost_per_conversion', 'purchase_value'],
    secondary: ['add_to_cart', 'checkout_initiations', 'conversion_rate'],
    diagnostic: ['clicks', 'ctr', 'cpc'],
    skipMetrics: [],
    skipAlerts: [],
  },
}

export const COUNTRY_BENCHMARKS: Record<MetaMarketCode, MetaCountryBenchmark> = {
  AE: {
    code: 'AE',
    country: 'United Arab Emirates',
    cpm: { min: 8, max: 15, optimal: 10 },
    cpc: { min: 0.8, max: 2, optimal: 1.2 },
    ctr: { min: 1.2, max: 2.5, optimal: 1.8 },
    costPerConversion: { min: 25, max: 80, optimal: 45 },
    marketContext: 'Premium market with high purchasing power and strong advertiser competition.',
    competitionLevel: 'very_high',
  },
  SA: {
    code: 'SA',
    country: 'Saudi Arabia',
    cpm: { min: 5, max: 10, optimal: 7 },
    cpc: { min: 0.5, max: 1.5, optimal: 0.9 },
    ctr: { min: 1, max: 2, optimal: 1.5 },
    costPerConversion: { min: 20, max: 60, optimal: 35 },
    marketContext: 'Largest regional market by scale, with high digital adoption and strong competition.',
    competitionLevel: 'high',
  },
  EG: {
    code: 'EG',
    country: 'Egypt',
    cpm: { min: 2, max: 5, optimal: 3 },
    cpc: { min: 0.2, max: 0.6, optimal: 0.35 },
    ctr: { min: 0.8, max: 1.8, optimal: 1.2 },
    costPerConversion: { min: 8, max: 25, optimal: 15 },
    marketContext: 'High-volume, budget-efficient market with lower average media costs.',
    competitionLevel: 'medium',
  },
  JO: {
    code: 'JO',
    country: 'Jordan',
    cpm: { min: 3, max: 7, optimal: 4.5 },
    cpc: { min: 0.3, max: 0.9, optimal: 0.55 },
    ctr: { min: 1, max: 2.2, optimal: 1.5 },
    costPerConversion: { min: 12, max: 40, optimal: 22 },
    marketContext: 'Mature digital market with educated audiences and moderate competition.',
    competitionLevel: 'medium',
  },
  LB: {
    code: 'LB',
    country: 'Lebanon',
    cpm: { min: 3, max: 7, optimal: 4.5 },
    cpc: { min: 0.3, max: 0.9, optimal: 0.55 },
    ctr: { min: 0.9, max: 2, optimal: 1.4 },
    costPerConversion: { min: 10, max: 35, optimal: 20 },
    marketContext: 'Digitally savvy, cost-sensitive market with moderate competition.',
    competitionLevel: 'medium',
  },
  KW: {
    code: 'KW',
    country: 'Kuwait',
    cpm: { min: 6, max: 12, optimal: 8 },
    cpc: { min: 0.6, max: 1.8, optimal: 1.1 },
    ctr: { min: 1.1, max: 2.3, optimal: 1.6 },
    costPerConversion: { min: 22, max: 70, optimal: 40 },
    marketContext: 'High purchasing power and smaller audience pool. Costs trend premium.',
    competitionLevel: 'high',
  },
  QA: {
    code: 'QA',
    country: 'Qatar',
    cpm: { min: 7, max: 13, optimal: 9 },
    cpc: { min: 0.7, max: 1.9, optimal: 1.15 },
    ctr: { min: 1.1, max: 2.4, optimal: 1.7 },
    costPerConversion: { min: 24, max: 75, optimal: 42 },
    marketContext: 'Wealthy, highly competitive market where premium positioning matters.',
    competitionLevel: 'very_high',
  },
  BH: {
    code: 'BH',
    country: 'Bahrain',
    cpm: { min: 5, max: 10, optimal: 7 },
    cpc: { min: 0.5, max: 1.5, optimal: 0.9 },
    ctr: { min: 1, max: 2.2, optimal: 1.5 },
    costPerConversion: { min: 18, max: 55, optimal: 32 },
    marketContext: 'Small affluent market with moderate competition.',
    competitionLevel: 'medium',
  },
  OM: {
    code: 'OM',
    country: 'Oman',
    cpm: { min: 4, max: 9, optimal: 6 },
    cpc: { min: 0.4, max: 1.3, optimal: 0.75 },
    ctr: { min: 0.9, max: 2, optimal: 1.4 },
    costPerConversion: { min: 15, max: 50, optimal: 28 },
    marketContext: 'Growing digital adoption with moderate media costs.',
    competitionLevel: 'medium',
  },
}

function numeric(value: unknown) {
  const parsed = Number.parseFloat(String(value ?? 0))
  return Number.isFinite(parsed) ? parsed : 0
}

function integer(value: unknown) {
  const parsed = Number.parseInt(String(value ?? 0), 10)
  return Number.isFinite(parsed) ? parsed : 0
}

function money(value: number) {
  return `$${value.toFixed(value >= 10 ? 0 : 2)}`
}

export function mapMetaObjectiveToFamily(objective?: string): MetaObjectiveFamily {
  const value = (objective || '').toLowerCase()
  if (/(awareness|reach|brand)/.test(value)) return 'awareness'
  if (/(traffic|link_clicks)/.test(value)) return 'traffic'
  if (/(engagement|post_engagement|video_views|messages)/.test(value)) return 'engagement'
  if (/(lead|instant_form)/.test(value)) return 'leads'
  if (/(app|mobile)/.test(value)) return 'app_promotion'
  if (/(sales|conversion|purchase|catalog)/.test(value)) return 'sales'
  return 'sales'
}

export function getMetaCountryBenchmark(code?: string | null) {
  const normalized = String(code || '').toUpperCase() as MetaMarketCode
  return COUNTRY_BENCHMARKS[normalized] || COUNTRY_BENCHMARKS.JO
}

export function analyzeMetaCampaign(
  insight: MetaInsightLike | null | undefined,
  campaign: MetaCampaignLike,
  marketCode: string = 'JO'
): {
  objectiveFamily: MetaObjectiveFamily
  kpis: MetaObjectiveKpis
  benchmark: MetaCountryBenchmark
  suggestions: MetaOptimizationSuggestion[]
  score: number
} {
  const objectiveFamily = mapMetaObjectiveToFamily(campaign.objective)
  const kpis = OBJECTIVE_KPI_MAP[objectiveFamily]
  const benchmark = getMetaCountryBenchmark(campaign.country_code || campaign.targeting_country || marketCode)
  const suggestions: MetaOptimizationSuggestion[] = []

  const impressions = integer(insight?.impressions)
  const clicks = integer(insight?.clicks)
  const spend = numeric(insight?.spend)
  const reach = integer(insight?.reach)
  const frequency = numeric(insight?.frequency)
  const ctr = numeric(insight?.ctr)
  const cpc = numeric(insight?.cpc)
  const cpm = numeric(insight?.cpm)
  const conversions = integer(insight?.conversions)
  const leads = integer(insight?.leads) || (objectiveFamily === 'leads' ? conversions : 0)
  const postEngagements = integer(insight?.post_engagements)
  const engagementRate = numeric(insight?.engagement_rate)
  const videoViews = integer(insight?.video_views)
  const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : numeric(insight?.conversion_rate)
  const costPerConversion = conversions > 0 ? spend / conversions : numeric(insight?.cost_per_conversion)
  const costPerLead = leads > 0 ? spend / leads : numeric(insight?.cost_per_lead)

  const push = (suggestion: MetaOptimizationSuggestion) => suggestions.push(suggestion)

  if (!impressions && !clicks && !spend) {
    push({
      type: 'info',
      priority: 'low',
      category: 'data',
      title: 'More delivery data needed',
      description: 'This campaign does not have enough delivery data in the selected period for reliable optimization.',
      kpi: 'Data volume',
      currentValue: 'No recent delivery',
      targetValue: '24-48 hours of data',
      recommendations: ['Confirm the campaign is active', 'Check date range', 'Let new campaigns collect data before changing strategy'],
      impact: 'Prevents premature optimization decisions.',
    })
    return { objectiveFamily, kpis, benchmark, suggestions, score: 50 }
  }

  if (['sales', 'leads'].includes(objectiveFamily)) {
    if (conversions < 50) {
      push({
        type: conversions === 0 && clicks > 100 ? 'error' : 'warning',
        priority: conversions === 0 && clicks > 100 ? 'critical' : 'high',
        category: 'platform_rule',
        title: 'Meta learning phase risk',
        description: `Meta conversion optimization generally needs around 50 optimization events per week. This campaign has ${conversions} detected events in the selected period.`,
        kpi: 'Optimization events',
        currentValue: String(conversions),
        targetValue: '50/week',
        recommendations: [
          `Generate ${Math.max(0, 50 - conversions)} more optimization events to stabilize delivery`,
          'Increase budget carefully if CPA/CPL is acceptable',
          'Broaden audience or optimize to a higher-volume event temporarily',
        ],
        impact: 'Campaign delivery may remain unstable while event volume is low.',
        source: 'meta_official',
      })
    }
  }

  if (impressions > 1000) {
    if (ctr < benchmark.ctr.min * 0.7) {
      push({
        type: 'error',
        priority: 'high',
        category: 'country_benchmark',
        title: `CTR is weak for ${benchmark.country}`,
        description: `CTR is ${ctr.toFixed(2)}%, below the ${benchmark.country} expected range of ${benchmark.ctr.min}-${benchmark.ctr.max}%.`,
        kpi: 'CTR',
        currentValue: `${ctr.toFixed(2)}%`,
        targetValue: `${benchmark.ctr.optimal}%+`,
        recommendations: ['Refresh the opening visual/hook', 'Test a clearer offer or promise', 'Review audience-message match'],
        impact: 'Raising CTR usually lowers CPC and improves delivery efficiency.',
        source: 'benchmark',
        country: benchmark.country,
      })
    } else if (ctr >= benchmark.ctr.max) {
      push({
        type: 'success',
        priority: 'low',
        category: 'country_benchmark',
        title: `Excellent CTR for ${benchmark.country}`,
        description: `CTR is ${ctr.toFixed(2)}%, above the ${benchmark.country} benchmark range.`,
        kpi: 'CTR',
        currentValue: `${ctr.toFixed(2)}%`,
        targetValue: `Maintain ${benchmark.ctr.max}%+`,
        recommendations: ['Scale the winning creative carefully', 'Use the angle as a template for variants', 'Build retargeting audiences from engaged users'],
        impact: 'This is a good candidate for controlled scaling.',
        source: 'benchmark',
        country: benchmark.country,
      })
    }
  }

  if (clicks > 50) {
    if (cpc > benchmark.cpc.max * 1.25) {
      push({
        type: 'warning',
        priority: 'high',
        category: 'country_benchmark',
        title: `CPC is high for ${benchmark.country}`,
        description: `CPC is ${money(cpc)} versus a local target range of ${money(benchmark.cpc.min)}-${money(benchmark.cpc.max)}.`,
        kpi: 'CPC',
        currentValue: money(cpc),
        targetValue: `${money(benchmark.cpc.min)}-${money(benchmark.cpc.max)}`,
        recommendations: ['Improve CTR before changing bids', 'Test broader audiences', 'Review expensive placements and age bands'],
        impact: 'Lower CPC increases traffic volume without increasing budget.',
        source: 'benchmark',
        country: benchmark.country,
      })
    } else if (cpc > 0 && cpc <= benchmark.cpc.min * 1.2) {
      push({
        type: 'success',
        priority: 'low',
        category: 'country_benchmark',
        title: `Efficient CPC for ${benchmark.country}`,
        description: `CPC is ${money(cpc)}, which is strong for this market.`,
        kpi: 'CPC',
        currentValue: money(cpc),
        targetValue: `Maintain below ${money(benchmark.cpc.max)}`,
        recommendations: ['Increase budget in small steps', 'Test adjacent audiences', 'Protect the creative/audience pairing'],
        impact: 'Efficient traffic can support scale or retargeting growth.',
        source: 'benchmark',
        country: benchmark.country,
      })
    }
  }

  if (objectiveFamily === 'awareness' && impressions > 1000) {
    if (cpm > benchmark.cpm.max * 1.3) {
      push({
        type: 'warning',
        priority: 'medium',
        category: 'country_benchmark',
        title: `CPM is elevated for ${benchmark.country}`,
        description: `CPM is ${money(cpm)}. ${benchmark.marketContext}`,
        kpi: 'CPM',
        currentValue: money(cpm),
        targetValue: `${money(benchmark.cpm.min)}-${money(benchmark.cpm.max)}`,
        recommendations: ['Broaden targeting', 'Test automatic placements', 'Refresh creative relevance signals'],
        impact: 'Lower CPM improves reach for awareness campaigns.',
        source: 'benchmark',
        country: benchmark.country,
      })
    }
    if (frequency >= 1.8 && frequency <= 3) {
      push({
        type: 'success',
        priority: 'low',
        category: 'awareness',
        title: 'Frequency is in the awareness sweet spot',
        description: `Frequency is ${frequency.toFixed(2)}, which is healthy for brand recall without heavy fatigue.`,
        kpi: 'Frequency',
        currentValue: frequency.toFixed(2),
        targetValue: '2.0-3.0',
        recommendations: ['Maintain the current rhythm', 'Scale reach gradually', 'Monitor fatigue if frequency passes 3.5'],
        impact: 'Good awareness delivery balance.',
      })
    }
    if (reach > 0 && impressions > 5000 && (reach / impressions) * 100 < 40) {
      push({
        type: 'warning',
        priority: 'medium',
        category: 'awareness',
        title: 'Reach efficiency is low',
        description: 'Too many impressions are going to the same people for an awareness objective.',
        kpi: 'Reach ratio',
        currentValue: `${((reach / impressions) * 100).toFixed(0)}%`,
        targetValue: '60-80%',
        recommendations: ['Expand audience size', 'Rotate creatives', 'Reduce budget pressure on narrow audiences'],
        impact: 'Awareness improves when more unique people are reached.',
      })
    }
  }

  if (objectiveFamily === 'sales') {
    if (clicks > 100 && conversions === 0) {
      push({
        type: 'error',
        priority: 'critical',
        category: 'conversion',
        title: 'Zero conversions despite traffic',
        description: `This sales campaign has ${clicks} clicks but no detected conversions.`,
        kpi: 'Conversions',
        currentValue: '0',
        targetValue: `${Math.ceil(clicks * 0.02)}+`,
        recommendations: ['Verify pixel/event tracking', 'Test the landing page and checkout manually', 'Check message match from ad to page'],
        impact: 'This can waste budget quickly if tracking or funnel conversion is broken.',
      })
    } else if (conversions > 0 && conversionRate < 1) {
      push({
        type: 'warning',
        priority: 'high',
        category: 'conversion',
        title: 'Conversion rate needs work',
        description: `Conversion rate is ${conversionRate.toFixed(2)}%, below a healthy paid traffic range.`,
        kpi: 'Conversion rate',
        currentValue: `${conversionRate.toFixed(2)}%`,
        targetValue: '2-5%',
        recommendations: ['Improve landing page speed', 'Simplify conversion path', 'Strengthen offer and proof near CTA'],
        impact: 'Higher conversion rate directly lowers cost per acquisition.',
      })
    } else if (conversions > 0 && costPerConversion > benchmark.costPerConversion.max) {
      push({
        type: 'warning',
        priority: 'high',
        category: 'country_benchmark',
        title: `CPA is high for ${benchmark.country}`,
        description: `Cost per conversion is ${money(costPerConversion)} versus ${benchmark.country}'s target range of ${money(benchmark.costPerConversion.min)}-${money(benchmark.costPerConversion.max)}.`,
        kpi: 'CPA',
        currentValue: money(costPerConversion),
        targetValue: money(benchmark.costPerConversion.optimal),
        recommendations: ['Audit conversion tracking', 'Improve offer quality', 'Test warmer audiences or retargeting'],
        impact: 'CPA reduction improves profitability before scaling.',
        country: benchmark.country,
      })
    }
  }

  if (objectiveFamily === 'leads') {
    const targetCpl = benchmark.costPerConversion.optimal * 0.5
    if (clicks > 50 && leads === 0) {
      push({
        type: 'error',
        priority: 'critical',
        category: 'leads',
        title: 'Zero leads despite traffic',
        description: `This lead campaign has ${clicks} clicks but no detected leads.`,
        kpi: 'Leads',
        currentValue: '0',
        targetValue: `${Math.ceil(clicks * 0.05)}+`,
        recommendations: ['Use Meta instant forms if possible', 'Reduce form fields', 'Improve lead magnet clarity'],
        impact: 'Lead form friction is likely blocking results.',
      })
    } else if (leads > 0 && costPerLead > targetCpl * 2) {
      push({
        type: 'warning',
        priority: 'high',
        category: 'leads',
        title: `CPL is high for ${benchmark.country}`,
        description: `Cost per lead is ${money(costPerLead)}, above an efficient local target of about ${money(targetCpl)}.`,
        kpi: 'CPL',
        currentValue: money(costPerLead),
        targetValue: `~${money(targetCpl)}`,
        recommendations: ['Improve incentive', 'Test instant forms', 'Separate qualified and low-quality lead audiences'],
        impact: 'Lower CPL increases lead volume at the same budget.',
        country: benchmark.country,
      })
    }
  }

  if (objectiveFamily === 'engagement' && impressions > 1000) {
    const effectiveEngagementRate = engagementRate || (postEngagements > 0 ? (postEngagements / impressions) * 100 : 0)
    if (effectiveEngagementRate > 0 && effectiveEngagementRate < 1) {
      push({
        type: 'warning',
        priority: 'medium',
        category: 'engagement',
        title: 'Engagement rate is low',
        description: `Engagement rate is ${effectiveEngagementRate.toFixed(2)}%.`,
        kpi: 'Engagement rate',
        currentValue: `${effectiveEngagementRate.toFixed(2)}%`,
        targetValue: '2-5%',
        recommendations: ['Use native-feeling content', 'Ask a question', 'Test short video or carousel formats'],
        impact: 'More engagement can improve social proof and retargeting pools.',
      })
    }
  }

  if (frequency > 3.5) {
    push({
      type: 'warning',
      priority: 'high',
      category: 'fatigue',
      title: 'Ad fatigue risk',
      description: `Frequency is ${frequency.toFixed(2)}, which means the same users are seeing the ad repeatedly.`,
      kpi: 'Frequency',
      currentValue: frequency.toFixed(2),
      targetValue: '1.5-3.0',
      recommendations: ['Refresh creative', 'Expand audience', 'Reduce budget pressure until new creative is ready'],
      impact: 'High frequency can reduce CTR and raise CPC.',
    })
  }

  if (objectiveFamily === 'app_promotion' && clicks > 50 && conversions === 0) {
    push({
      type: 'info',
      priority: 'medium',
      category: 'app_promotion',
      title: 'Validate app event tracking',
      description: 'No app installs or app events were detected in this period.',
      kpi: 'App events',
      currentValue: '0',
      targetValue: 'Tracked install/event volume',
      recommendations: ['Check SDK/event setup', 'Use a higher-volume app event if installs are scarce', 'Review store page conversion quality'],
      impact: 'Reliable app event data is required for optimization.',
    })
  }

  if (videoViews > 0 && objectiveFamily === 'engagement') {
    push({
      type: 'info',
      priority: 'low',
      category: 'creative',
      title: 'Use video viewers for retargeting',
      description: `${videoViews.toLocaleString()} video views can become a warm audience for sequential messaging.`,
      kpi: 'Video views',
      currentValue: videoViews.toLocaleString(),
      targetValue: 'Build 25%+ viewer audience',
      recommendations: ['Create a retargeting audience from video viewers', 'Use a conversion-focused follow-up ad', 'Test shorter edits for higher completion'],
      impact: 'Warm retargeting can improve conversion efficiency.',
    })
  }

  if (!suggestions.length) {
    push({
      type: 'success',
      priority: 'low',
      category: 'health',
      title: 'Campaign is within expected ranges',
      description: 'No critical objective or market benchmark issues were detected for this period.',
      kpi: 'Overall health',
      currentValue: 'Healthy',
      targetValue: 'Maintain',
      recommendations: ['Continue creative testing', 'Scale only in controlled increments', 'Document the audience and creative combination'],
      impact: 'Maintain and compound what is working.',
    })
  }

  const priorityWeight: Record<MetaSuggestionPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 }
  suggestions.sort((a, b) => priorityWeight[a.priority] - priorityWeight[b.priority])
  const penalty = suggestions.reduce((sum, item) => {
    if (item.priority === 'critical') return sum + 28
    if (item.priority === 'high') return sum + 16
    if (item.priority === 'medium') return sum + 8
    return sum
  }, 0)
  const successLift = suggestions.filter((item) => item.type === 'success').length * 4
  const score = Math.max(0, Math.min(100, 82 - penalty + successLift))

  return { objectiveFamily, kpis, benchmark, suggestions, score }
}
