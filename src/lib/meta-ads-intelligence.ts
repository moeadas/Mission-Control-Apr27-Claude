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
  purchases?: string | number
  purchase_value?: string | number
  roas?: string | number
  add_to_cart?: string | number
  checkout_initiations?: string | number
  post_engagements?: string | number
  engagement_rate?: string | number
  video_views?: string | number
  app_installs?: string | number
  messages?: string | number
  inline_link_clicks?: string | number
  inline_link_click_ctr?: string | number
  cost_per_inline_link_click?: string | number
  page_views?: string | number
  cost_per_engagement?: string | number
  cost_per_video_view?: string | number
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
    diagnostic: ['video_views', 'frequency', 'reach_ratio'],
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
    primary: ['post_engagements', 'cost_per_engagement', 'engagement_rate'],
    secondary: ['video_views', 'messages', 'cost_per_video_view'],
    diagnostic: ['reach', 'impressions', 'frequency', 'video_views'],
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
    secondary: ['conversion_rate', 'cpc', 'ctr'],
    diagnostic: ['clicks', 'impressions', 'frequency'],
    skipMetrics: ['roas'],
    skipAlerts: ['low_roas'],
  },
  sales: {
    primary: ['purchases', 'roas', 'purchase_value', 'cost_per_conversion'],
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
  const purchases = integer(insight?.purchases) || (objectiveFamily === 'sales' ? conversions : 0)
  const purchaseValue = numeric(insight?.purchase_value)
  const roas = numeric(insight?.roas) || (spend > 0 && purchaseValue > 0 ? purchaseValue / spend : 0)
  const addToCart = integer(insight?.add_to_cart)
  const checkoutInitiations = integer(insight?.checkout_initiations)
  const postEngagements = integer(insight?.post_engagements)
  const engagementRate = numeric(insight?.engagement_rate)
  const videoViews = integer(insight?.video_views)
  const appInstalls = integer(insight?.app_installs)
  const messages = integer(insight?.messages)
  const linkClicks = integer(insight?.inline_link_clicks) || integer((insight as any)?.link_clicks_action) || clicks
  const landingPageViews = integer(insight?.page_views)
  const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : numeric(insight?.conversion_rate)
  const purchaseRate = linkClicks > 0 ? (purchases / linkClicks) * 100 : conversionRate
  const leadRate = linkClicks > 0 ? (leads / linkClicks) * 100 : 0
  const landingPageViewRate = linkClicks > 0 ? (landingPageViews / linkClicks) * 100 : 0
  const costPerPurchase = purchases > 0 ? spend / purchases : numeric(insight?.cost_per_conversion)
  const costPerConversion = conversions > 0 ? spend / conversions : numeric(insight?.cost_per_conversion)
  const costPerLead = leads > 0 ? spend / leads : numeric(insight?.cost_per_lead)
  const costPerEngagement = postEngagements > 0 ? spend / postEngagements : numeric(insight?.cost_per_engagement)

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
    const optimizationEvents = objectiveFamily === 'sales' ? purchases : leads
    if (optimizationEvents < 50) {
      push({
        type: optimizationEvents === 0 && clicks > 100 ? 'error' : 'warning',
        priority: optimizationEvents === 0 && clicks > 100 ? 'critical' : 'high',
        category: 'platform_rule',
        title: 'Meta learning phase risk',
        description: `Meta conversion optimization generally needs around 50 optimization events per week. This campaign has ${optimizationEvents} ${objectiveFamily === 'sales' ? 'purchase' : 'lead'} events in the selected period.`,
        kpi: 'Optimization events',
        currentValue: String(optimizationEvents),
        targetValue: '50/week',
        recommendations: [
          `Generate ${Math.max(0, 50 - optimizationEvents)} more ${objectiveFamily === 'sales' ? 'purchases' : 'leads'} before making heavy structural changes`,
          objectiveFamily === 'sales' ? 'Use add-to-cart or checkout optimization temporarily if purchases are too sparse' : 'Use a higher-volume qualified lead event if final leads are too sparse',
          'Broaden audience only if cost quality is still acceptable',
        ],
        impact: 'Campaign delivery may remain unstable while event volume is low.',
        source: 'meta_official',
      })
    }
  }

  const clickQualityObjective = ['traffic', 'leads', 'sales'].includes(objectiveFamily)

  if (clickQualityObjective && impressions > 1000) {
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

  if (clickQualityObjective && clicks > 50) {
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
    if (clicks > 100 && purchases === 0) {
      push({
        type: 'error',
        priority: 'critical',
        category: 'conversion',
        title: 'Zero purchases despite traffic',
        description: `This sales campaign has ${clicks} clicks but no detected purchases.`,
        kpi: 'Purchases',
        currentValue: '0',
        targetValue: `${Math.ceil(clicks * 0.02)}+`,
        recommendations: ['Verify pixel/event tracking', 'Test the landing page and checkout manually', 'Check message match from ad to page'],
        impact: 'This can waste budget quickly if tracking or funnel conversion is broken.',
      })
    } else if (purchases > 0 && purchaseRate < 1) {
      push({
        type: 'warning',
        priority: 'high',
        category: 'conversion',
        title: 'Purchase rate needs work',
        description: `Purchase rate is ${purchaseRate.toFixed(2)}%, below a healthy paid traffic range.`,
        kpi: 'Purchase rate',
        currentValue: `${purchaseRate.toFixed(2)}%`,
        targetValue: '2-5%',
        recommendations: ['Improve landing page speed', 'Simplify conversion path', 'Strengthen offer and proof near CTA'],
        impact: 'Higher conversion rate directly lowers cost per acquisition.',
      })
    } else if (purchases > 0 && costPerPurchase > benchmark.costPerConversion.max) {
      push({
        type: 'warning',
        priority: 'high',
        category: 'country_benchmark',
        title: `Cost per purchase is high for ${benchmark.country}`,
        description: `Cost per purchase is ${money(costPerPurchase)} versus ${benchmark.country}'s target range of ${money(benchmark.costPerConversion.min)}-${money(benchmark.costPerConversion.max)}.`,
        kpi: 'Cost per purchase',
        currentValue: money(costPerPurchase),
        targetValue: money(benchmark.costPerConversion.optimal),
        recommendations: ['Audit conversion tracking', 'Improve offer quality', 'Test warmer audiences or retargeting'],
        impact: 'CPA reduction improves profitability before scaling.',
        country: benchmark.country,
      })
    }
    if (roas > 0 && roas < 1) {
      push({
        type: 'error',
        priority: 'critical',
        category: 'profitability',
        title: 'ROAS is below break-even',
        description: `ROAS is ${roas.toFixed(2)}x from ${money(spend)} spend and ${money(purchaseValue)} tracked purchase value.`,
        kpi: 'ROAS',
        currentValue: `${roas.toFixed(2)}x`,
        targetValue: '1.5x+ before scale',
        recommendations: ['Pause scale until offer economics are fixed', 'Retarget warm add-to-cart users', 'Review pricing, shipping, and checkout friction'],
        impact: 'Scaling below break-even amplifies loss.',
      })
    } else if (roas >= 2.5) {
      push({
        type: 'success',
        priority: 'medium',
        category: 'profitability',
        title: 'ROAS is strong enough to test scale',
        description: `ROAS is ${roas.toFixed(2)}x with ${money(purchaseValue)} tracked purchase value.`,
        kpi: 'ROAS',
        currentValue: `${roas.toFixed(2)}x`,
        targetValue: 'Protect 2x+',
        recommendations: ['Increase budget in controlled 10-20% steps', 'Duplicate the winning creative/audience into a scale test', 'Protect the existing ad set while testing expansion'],
        impact: 'Profitable sales campaigns can scale if frequency and CPA stay stable.',
      })
    } else if (purchases > 0 && purchaseValue === 0) {
      push({
        type: 'warning',
        priority: 'high',
        category: 'measurement',
        title: 'Purchase value is missing',
        description: `${purchases} purchases are tracked, but Meta returned no purchase value, so ROAS cannot be trusted.`,
        kpi: 'Purchase value',
        currentValue: '$0',
        targetValue: 'Value passed with purchase event',
        recommendations: ['Pass value and currency with purchase events', 'Check Pixel/CAPI purchase payloads', 'Avoid ROAS decisions until value tracking is fixed'],
        impact: 'Without value tracking, sales optimization becomes CPA-only.',
      })
    }
    if (addToCart >= 20 && purchases === 0) {
      push({
        type: 'warning',
        priority: 'high',
        category: 'funnel',
        title: 'Cart intent is not becoming purchases',
        description: `${addToCart} add-to-cart actions were detected but 0 purchases were tracked.`,
        kpi: 'Cart to purchase',
        currentValue: '0 purchases',
        targetValue: `${Math.ceil(addToCart * 0.1)}+ purchases`,
        recommendations: ['Audit checkout and payment flow', 'Launch add-to-cart retargeting', 'Add urgency/proof near checkout CTA'],
        impact: 'Fixing checkout leakage can unlock revenue without more traffic.',
      })
    } else if (checkoutInitiations >= 10 && purchases > 0 && purchases / checkoutInitiations < 0.25) {
      push({
        type: 'warning',
        priority: 'medium',
        category: 'funnel',
        title: 'Checkout completion is weak',
        description: `${checkoutInitiations} checkout starts produced ${purchases} purchases (${((purchases / checkoutInitiations) * 100).toFixed(1)}% completion).`,
        kpi: 'Checkout completion',
        currentValue: `${((purchases / checkoutInitiations) * 100).toFixed(1)}%`,
        targetValue: '35%+',
        recommendations: ['Reduce checkout steps', 'Clarify delivery/fees earlier', 'Retarget checkout starters with trust and incentive'],
        impact: 'Checkout improvements directly increase ROAS.',
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
    if (leads > 0 && leadRate < 3) {
      push({
        type: 'warning',
        priority: 'medium',
        category: 'leads',
        title: 'Lead rate is thin for the click volume',
        description: `${linkClicks} link clicks produced ${leads} leads (${leadRate.toFixed(2)}%).`,
        kpi: 'Lead rate',
        currentValue: `${leadRate.toFixed(2)}%`,
        targetValue: '5%+',
        recommendations: ['Match the form promise to the ad hook', 'Reduce required fields', 'Add proof and response-time expectation beside the form'],
        impact: 'Improving lead rate lowers CPL before increasing spend.',
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
    if (postEngagements > 0 && costPerEngagement > 0.2) {
      push({
        type: 'warning',
        priority: 'medium',
        category: 'engagement',
        title: 'Cost per engagement is getting expensive',
        description: `Cost per engagement is ${money(costPerEngagement)} from ${postEngagements.toLocaleString()} engagements.`,
        kpi: 'Cost per engagement',
        currentValue: money(costPerEngagement),
        targetValue: '< $0.10-$0.20',
        recommendations: ['Test more native creative', 'Use existing social proof posts', 'Avoid over-polished ad-looking assets'],
        impact: 'Cheaper engagement builds larger warm audiences.',
      })
    }
  }

  if (objectiveFamily === 'traffic') {
    if (linkClicks > 100 && landingPageViews > 0 && landingPageViewRate < 60) {
      push({
        type: 'warning',
        priority: 'high',
        category: 'traffic_quality',
        title: 'Many clicks are not becoming landing-page views',
        description: `${linkClicks} link clicks produced ${landingPageViews} landing-page views (${landingPageViewRate.toFixed(1)}%).`,
        kpi: 'Landing-page view rate',
        currentValue: `${landingPageViewRate.toFixed(1)}%`,
        targetValue: '80%+',
        recommendations: ['Check page load speed on mobile', 'Review click destination and redirects', 'Use landing-page-view optimization when available'],
        impact: 'Improves useful traffic without increasing spend.',
      })
    }
    if (ctr >= benchmark.ctr.max && cpc > 0 && cpc <= benchmark.cpc.max) {
      push({
        type: 'success',
        priority: 'low',
        category: 'traffic_quality',
        title: 'Traffic quality is efficient',
        description: `CTR is ${ctr.toFixed(2)}% and CPC is ${money(cpc)}, both healthy for ${benchmark.country}.`,
        kpi: 'CTR + CPC',
        currentValue: `${ctr.toFixed(2)}% / ${money(cpc)}`,
        targetValue: 'Maintain',
        recommendations: ['Build retargeting from clickers', 'Send the same audience to a stronger conversion page', 'Test one conversion-oriented follow-up campaign'],
        impact: 'Efficient traffic can become a warm conversion pool.',
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

  if (objectiveFamily === 'app_promotion' && clicks > 50 && appInstalls === 0 && conversions === 0) {
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
  if (objectiveFamily === 'app_promotion' && appInstalls > 0) {
    push({
      type: 'success',
      priority: 'low',
      category: 'app_promotion',
      title: 'App installs are being tracked',
      description: `${appInstalls} installs/events were detected from ${clicks} clicks.`,
      kpi: 'App installs',
      currentValue: appInstalls.toLocaleString(),
      targetValue: 'Scale with event quality',
      recommendations: ['Add post-install event quality checks', 'Optimize toward a deeper event once volume allows', 'Segment iOS/Android performance'],
      impact: 'Install volume is useful only if downstream quality is measured.',
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

  if (messages > 0) {
    push({
      type: 'success',
      priority: 'low',
      category: 'messages',
      title: 'Messaging intent is visible',
      description: `${messages.toLocaleString()} messaging actions were detected in this period.`,
      kpi: 'Messages',
      currentValue: messages.toLocaleString(),
      targetValue: 'Qualify and respond fast',
      recommendations: ['Track response time and qualified conversations', 'Create FAQ/offer scripts for the top questions', 'Retarget message openers who did not convert'],
      impact: 'Message campaigns need speed-to-lead, not just cheap conversations.',
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
