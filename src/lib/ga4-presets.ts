export type Ga4ChartType = 'kpi' | 'line' | 'bar' | 'table' | 'donut' | 'funnel' | 'heatmap' | 'scatter'

export interface Ga4WidgetConfig {
  id: string
  title: string
  chartType: Ga4ChartType
  gridSpan: { cols: number; rows: number }
  query: {
    dimensions?: string[]
    metrics?: string[]
    orderBys?: Array<{ metric: string; desc?: boolean }>
    limit?: number
    funnelEvents?: string[]
  }
  viz?: {
    compareToPrevious?: boolean
    annotateMax?: boolean
    valueFormat?: 'number' | 'currency' | 'percent' | 'duration'
    story?: string
  }
}

export interface Ga4PresetConfig {
  presetId: string
  label: string
  description: string
  audience: string
  cadence: string
  storyQuestion: string
  dateRange: { default: string }
  widgets: Ga4WidgetConfig[]
}

export const GA4_DATE_RANGES = [
  { value: 'last_7_days', label: 'Last 7 days', startDate: '7daysAgo', endDate: 'yesterday', previousStartDate: '14daysAgo', previousEndDate: '8daysAgo' },
  { value: 'last_28_days', label: 'Last 28 days', startDate: '28daysAgo', endDate: 'yesterday', previousStartDate: '56daysAgo', previousEndDate: '29daysAgo' },
  { value: 'last_30_days', label: 'Last 30 days', startDate: '30daysAgo', endDate: 'yesterday', previousStartDate: '60daysAgo', previousEndDate: '31daysAgo' },
  { value: 'last_90_days', label: 'Last 90 days', startDate: '90daysAgo', endDate: 'yesterday', previousStartDate: '180daysAgo', previousEndDate: '91daysAgo' },
  { value: 'this_month', label: 'This month', startDate: 'firstDayOfMonth', endDate: 'today', previousStartDate: 'firstDayOfLastMonth', previousEndDate: 'lastDayOfLastMonth' },
]

const kpi = (
  id: string,
  title: string,
  metric: string,
  valueFormat?: 'number' | 'currency' | 'percent' | 'duration',
): Ga4WidgetConfig => ({
  id,
  title,
  chartType: 'kpi',
  gridSpan: { cols: 3, rows: 1 },
  query: { metrics: [metric] },
  viz: { compareToPrevious: true, valueFormat },
})

export const GA4_PRESETS: Ga4PresetConfig[] = [
  {
    presetId: 'executive_overview',
    label: 'Executive Overview',
    description: 'A leadership summary of audience, engagement, conversion, and revenue momentum.',
    audience: 'CMO, VP Marketing, senior leadership',
    cadence: 'Weekly / Monthly',
    storyQuestion: 'How is the website performing overall this period?',
    dateRange: { default: 'last_28_days' },
    widgets: [
      kpi('kpi_active_users', 'Active Users', 'activeUsers'),
      kpi('kpi_engaged_sessions', 'Engaged Sessions', 'engagedSessions'),
      kpi('kpi_key_events', 'Key Events', 'keyEvents'),
      kpi('kpi_revenue', 'Revenue', 'totalRevenue', 'currency'),
      { id: 'exec_trend', title: 'Performance Momentum', chartType: 'line', gridSpan: { cols: 8, rows: 2 }, query: { dimensions: ['date'], metrics: ['sessions', 'activeUsers'], limit: 120 }, viz: { story: 'Trend direction reveals whether performance is compounding or flattening.' } },
      { id: 'exec_channel_mix', title: 'Channel Contribution', chartType: 'bar', gridSpan: { cols: 4, rows: 2 }, query: { dimensions: ['sessionDefaultChannelGroup'], metrics: ['sessions', 'keyEvents'], orderBys: [{ metric: 'sessions', desc: true }], limit: 10 }, viz: { story: 'Sorted channels show which sources drive scale and outcomes.' } },
      { id: 'exec_top_pages', title: 'Top Landing Pages', chartType: 'table', gridSpan: { cols: 7, rows: 2 }, query: { dimensions: ['landingPage'], metrics: ['sessions', 'engagementRate', 'keyEvents'], orderBys: [{ metric: 'sessions', desc: true }], limit: 20 }, viz: { story: 'Entry pages expose where demand first meets the website.' } },
      { id: 'exec_device_mix', title: 'Device Mix', chartType: 'donut', gridSpan: { cols: 5, rows: 2 }, query: { dimensions: ['deviceCategory'], metrics: ['activeUsers'], limit: 5 }, viz: { story: 'Device mix frames how users experience the site.' } },
    ],
  },
  {
    presetId: 'traffic_acquisition',
    label: 'Traffic Acquisition',
    description: 'Channel, source, campaign, and quality analysis for acquisition decisions.',
    audience: 'Marketing manager, SEO specialist, paid media team',
    cadence: 'Daily / Weekly',
    storyQuestion: 'Where is traffic coming from and which channels perform best?',
    dateRange: { default: 'last_28_days' },
    widgets: [
      kpi('kpi_sessions', 'Sessions', 'sessions'),
      kpi('kpi_new_users', 'New Users', 'newUsers'),
      kpi('kpi_engagement_rate', 'Engagement Rate', 'engagementRate', 'percent'),
      kpi('kpi_key_events', 'Key Events', 'keyEvents'),
      { id: 'channel_bar', title: 'Sessions by Channel', chartType: 'bar', gridSpan: { cols: 6, rows: 2 }, query: { dimensions: ['sessionDefaultChannelGroup'], metrics: ['sessions', 'engagedSessions'], orderBys: [{ metric: 'sessions', desc: true }], limit: 12 }, viz: { story: 'Volume identifies the channels that shape the period.' } },
      { id: 'source_medium_tbl', title: 'Source / Medium Quality Matrix', chartType: 'table', gridSpan: { cols: 6, rows: 2 }, query: { dimensions: ['sessionSourceMedium'], metrics: ['sessions', 'engagementRate', 'keyEvents', 'totalRevenue'], orderBys: [{ metric: 'sessions', desc: true }], limit: 20 }, viz: { story: 'Quality metrics prevent high-volume sources from hiding weak intent.' } },
      { id: 'channel_trend', title: 'Channel Mix Over Time', chartType: 'line', gridSpan: { cols: 12, rows: 2 }, query: { dimensions: ['date', 'sessionDefaultChannelGroup'], metrics: ['sessions'], limit: 250 }, viz: { story: 'Trend lines reveal whether mix is shifting toward better sources.' } },
      { id: 'campaign_tbl', title: 'Top UTM Campaigns', chartType: 'table', gridSpan: { cols: 7, rows: 2 }, query: { dimensions: ['sessionCampaignName'], metrics: ['sessions', 'engagementRate', 'keyEvents', 'totalRevenue'], orderBys: [{ metric: 'sessions', desc: true }], limit: 20 }, viz: { story: 'Campaign rows connect UTM discipline to actual outcomes.' } },
      { id: 'quality_scatter', title: 'Channel Quality Signals', chartType: 'scatter', gridSpan: { cols: 5, rows: 2 }, query: { dimensions: ['sessionDefaultChannelGroup'], metrics: ['engagementRate', 'keyEvents', 'sessions'], limit: 12 }, viz: { story: 'Compare engagement and conversion quality by channel.' } },
    ],
  },
  {
    presetId: 'content_performance',
    label: 'Content Performance',
    description: 'Page reach, engagement depth, landing-page quality, and content-to-action signals.',
    audience: 'Content team, SEO manager, web manager',
    cadence: 'Weekly',
    storyQuestion: 'Which content is performing well and which needs improvement?',
    dateRange: { default: 'last_28_days' },
    widgets: [
      kpi('kpi_views', 'Views', 'screenPageViews'),
      kpi('kpi_active_users', 'Active Users', 'activeUsers'),
      kpi('kpi_engagement_time', 'Engagement Time', 'userEngagementDuration', 'duration'),
      kpi('kpi_events', 'Events', 'eventCount'),
      { id: 'top_pages', title: 'Top Pages by Views', chartType: 'table', gridSpan: { cols: 7, rows: 3 }, query: { dimensions: ['pageTitle', 'pagePath'], metrics: ['screenPageViews', 'userEngagementDuration', 'eventCount'], orderBys: [{ metric: 'screenPageViews', desc: true }], limit: 25 }, viz: { story: 'High-reach pages deserve engagement and conversion scrutiny.' } },
      { id: 'landing_perf', title: 'Landing Pages by Quality', chartType: 'table', gridSpan: { cols: 5, rows: 3 }, query: { dimensions: ['landingPage'], metrics: ['sessions', 'engagementRate', 'keyEvents'], orderBys: [{ metric: 'sessions', desc: true }], limit: 20 }, viz: { story: 'Landing pages show whether first impressions match intent.' } },
      { id: 'page_trend', title: 'Content Consumption Trend', chartType: 'line', gridSpan: { cols: 12, rows: 2 }, query: { dimensions: ['date'], metrics: ['screenPageViews', 'eventCount'], limit: 120 }, viz: { story: 'Consumption trends separate evergreen strength from short-lived spikes.' } },
      { id: 'events', title: 'Top Content Events', chartType: 'bar', gridSpan: { cols: 6, rows: 2 }, query: { dimensions: ['eventName'], metrics: ['eventCount'], orderBys: [{ metric: 'eventCount', desc: true }], limit: 15 }, viz: { story: 'Events show what users actually do after they arrive.' } },
      { id: 'content_path', title: 'Landing Page to Event Outcomes', chartType: 'table', gridSpan: { cols: 6, rows: 2 }, query: { dimensions: ['landingPage', 'eventName'], metrics: ['eventCount', 'keyEvents'], orderBys: [{ metric: 'eventCount', desc: true }], limit: 25 }, viz: { story: 'Pair entry points with actions to find content-to-conversion paths.' } },
    ],
  },
  {
    presetId: 'conversion_key_events',
    label: 'Conversion & Key Events',
    description: 'Key event volume, event sources, landing pages, and conversion paths.',
    audience: 'Marketing, CRO specialist, product team',
    cadence: 'Weekly / Daily',
    storyQuestion: 'How many conversions are we getting and from which channels?',
    dateRange: { default: 'last_28_days' },
    widgets: [
      kpi('kpi_key_events', 'Key Events', 'keyEvents'),
      kpi('kpi_sessions', 'Sessions', 'sessions'),
      kpi('kpi_revenue', 'Revenue', 'totalRevenue', 'currency'),
      kpi('kpi_engagement_rate', 'Engagement Rate', 'engagementRate', 'percent'),
      { id: 'key_event_trend', title: 'Key Events Over Time', chartType: 'line', gridSpan: { cols: 8, rows: 2 }, query: { dimensions: ['date'], metrics: ['keyEvents'], limit: 120 }, viz: { story: 'Conversion trends show whether demand is turning into outcomes.' } },
      { id: 'conversion_funnel', title: 'Common Event Funnel', chartType: 'funnel', gridSpan: { cols: 4, rows: 2 }, query: { funnelEvents: ['page_view', 'scroll', 'form_start', 'generate_lead', 'purchase'] }, viz: { story: 'A simple event funnel exposes where intent thins out.' } },
      { id: 'channel_key_events', title: 'Key Events by Channel', chartType: 'bar', gridSpan: { cols: 6, rows: 2 }, query: { dimensions: ['sessionDefaultChannelGroup'], metrics: ['keyEvents', 'sessions'], orderBys: [{ metric: 'keyEvents', desc: true }], limit: 12 }, viz: { story: 'Outcome volume by channel shows which sources deserve attention.' } },
      { id: 'event_names', title: 'Key Event and Event Matrix', chartType: 'table', gridSpan: { cols: 6, rows: 2 }, query: { dimensions: ['eventName'], metrics: ['eventCount', 'keyEvents', 'totalRevenue'], orderBys: [{ metric: 'eventCount', desc: true }], limit: 25 }, viz: { story: 'Event names reveal what GA4 is actually measuring as behavior.' } },
      { id: 'landing_conversion', title: 'Landing Pages Driving Outcomes', chartType: 'table', gridSpan: { cols: 12, rows: 2 }, query: { dimensions: ['landingPage'], metrics: ['sessions', 'engagementRate', 'keyEvents', 'totalRevenue'], orderBys: [{ metric: 'keyEvents', desc: true }], limit: 25 }, viz: { story: 'Landing pages connect acquisition intent with business action.' } },
    ],
  },
  {
    presetId: 'ecommerce',
    label: 'E-Commerce',
    description: 'Revenue, purchases, product demand, and checkout friction.',
    audience: 'E-commerce manager, marketing, CEO',
    cadence: 'Daily',
    storyQuestion: 'How is the store performing?',
    dateRange: { default: 'last_28_days' },
    widgets: [
      kpi('kpi_revenue', 'Total Revenue', 'totalRevenue', 'currency'),
      kpi('kpi_transactions', 'Transactions', 'transactions'),
      kpi('kpi_aov', 'Avg. Purchase Revenue', 'averagePurchaseRevenue', 'currency'),
      kpi('kpi_arpu', 'Revenue / User', 'averageRevenuePerUser', 'currency'),
      { id: 'revenue_trend', title: 'Revenue and Transactions Over Time', chartType: 'line', gridSpan: { cols: 8, rows: 2 }, query: { dimensions: ['date'], metrics: ['totalRevenue', 'transactions'], limit: 120 }, viz: { valueFormat: 'currency', story: 'Revenue trend gives the cleanest view of commercial momentum.' } },
      { id: 'ecom_funnel', title: 'Purchase Journey Funnel', chartType: 'funnel', gridSpan: { cols: 4, rows: 2 }, query: { funnelEvents: ['view_item', 'add_to_cart', 'begin_checkout', 'add_payment_info', 'purchase'] }, viz: { story: 'Checkout steps reveal where revenue leaks.' } },
      { id: 'top_products', title: 'Top Products by Revenue', chartType: 'table', gridSpan: { cols: 7, rows: 2 }, query: { dimensions: ['itemName'], metrics: ['itemRevenue', 'itemsPurchased'], orderBys: [{ metric: 'itemRevenue', desc: true }], limit: 15 }, viz: { valueFormat: 'currency', story: 'Product rows reveal what demand is actually buying.' } },
      { id: 'rev_by_channel', title: 'Revenue by Channel', chartType: 'bar', gridSpan: { cols: 5, rows: 2 }, query: { dimensions: ['sessionDefaultChannelGroup'], metrics: ['totalRevenue'], orderBys: [{ metric: 'totalRevenue', desc: true }], limit: 10 }, viz: { valueFormat: 'currency', story: 'Revenue by channel separates buyers from browsers.' } },
    ],
  },
  {
    presetId: 'audience_demographics',
    label: 'Audience & Demographics',
    description: 'Audience composition by geography, device, language, and technology.',
    audience: 'Marketing strategist, content team, paid media',
    cadence: 'Monthly',
    storyQuestion: 'Who are our users and how are they behaving?',
    dateRange: { default: 'last_28_days' },
    widgets: [
      kpi('kpi_users', 'Active Users', 'activeUsers'),
      kpi('kpi_new', 'New Users', 'newUsers'),
      kpi('kpi_sessions', 'Sessions', 'sessions'),
      kpi('kpi_engagement_rate', 'Engagement Rate', 'engagementRate', 'percent'),
      { id: 'countries', title: 'Users by Country', chartType: 'bar', gridSpan: { cols: 6, rows: 2 }, query: { dimensions: ['country'], metrics: ['activeUsers', 'engagementRate'], orderBys: [{ metric: 'activeUsers', desc: true }], limit: 15 }, viz: { story: 'Geography shows where audience concentration and expansion potential sit.' } },
      { id: 'devices', title: 'Device Mix', chartType: 'donut', gridSpan: { cols: 6, rows: 2 }, query: { dimensions: ['deviceCategory'], metrics: ['activeUsers'], limit: 5 }, viz: { story: 'Device mix affects UX priorities and conversion expectations.' } },
      { id: 'city_table', title: 'City-Level Audience Quality', chartType: 'table', gridSpan: { cols: 6, rows: 2 }, query: { dimensions: ['city'], metrics: ['activeUsers', 'sessions', 'engagementRate'], orderBys: [{ metric: 'activeUsers', desc: true }], limit: 20 }, viz: { story: 'Cities reveal local pockets of audience value.' } },
      { id: 'browser_table', title: 'Browser / OS Environment', chartType: 'table', gridSpan: { cols: 6, rows: 2 }, query: { dimensions: ['browser', 'operatingSystem'], metrics: ['activeUsers', 'engagementRate'], orderBys: [{ metric: 'activeUsers', desc: true }], limit: 20 }, viz: { story: 'Technology mix highlights QA and performance priorities.' } },
      { id: 'new_vs_ret', title: 'New vs Returning Users', chartType: 'donut', gridSpan: { cols: 5, rows: 2 }, query: { dimensions: ['newVsReturning'], metrics: ['activeUsers'], limit: 5 }, viz: { story: 'Audience loyalty depends on the balance of first-time and repeat users.' } },
      { id: 'language_table', title: 'Language Mix', chartType: 'table', gridSpan: { cols: 7, rows: 2 }, query: { dimensions: ['language'], metrics: ['activeUsers', 'sessions'], orderBys: [{ metric: 'activeUsers', desc: true }], limit: 20 }, viz: { story: 'Language mix can reveal localization and content opportunities.' } },
    ],
  },
  {
    presetId: 'campaign_performance',
    label: 'Campaign Performance',
    description: 'UTM campaign sessions, quality, key events, revenue, and landing-page fit.',
    audience: 'Paid media, email marketing, performance marketers',
    cadence: 'Daily / Weekly',
    storyQuestion: 'How are campaigns performing against intent?',
    dateRange: { default: 'last_28_days' },
    widgets: [
      kpi('kpi_campaign_sessions', 'Campaign Sessions', 'sessions'),
      kpi('kpi_key_events', 'Key Events', 'keyEvents'),
      kpi('kpi_revenue', 'Revenue', 'totalRevenue', 'currency'),
      kpi('kpi_engagement_rate', 'Engagement Rate', 'engagementRate', 'percent'),
      { id: 'campaign_master', title: 'Campaign Performance Matrix', chartType: 'table', gridSpan: { cols: 12, rows: 3 }, query: { dimensions: ['sessionCampaignName'], metrics: ['sessions', 'engagementRate', 'keyEvents', 'totalRevenue'], orderBys: [{ metric: 'sessions', desc: true }], limit: 30 }, viz: { story: 'The campaign matrix balances volume, quality, and outcome value.' } },
      { id: 'top_campaign_events', title: 'Top Campaigns by Key Events', chartType: 'bar', gridSpan: { cols: 6, rows: 2 }, query: { dimensions: ['sessionCampaignName'], metrics: ['keyEvents', 'sessions'], orderBys: [{ metric: 'keyEvents', desc: true }], limit: 10 }, viz: { story: 'Outcome-ranked campaigns show what deserves budget or repetition.' } },
      { id: 'campaign_engagement', title: 'Campaign Engagement Quality', chartType: 'bar', gridSpan: { cols: 6, rows: 2 }, query: { dimensions: ['sessionCampaignName'], metrics: ['engagementRate', 'sessions'], orderBys: [{ metric: 'sessions', desc: true }], limit: 10 }, viz: { story: 'Engagement rate detects message-to-landing-page fit.' } },
      { id: 'campaign_trend', title: 'Campaign Sessions Over Time', chartType: 'line', gridSpan: { cols: 7, rows: 2 }, query: { dimensions: ['date', 'sessionCampaignName'], metrics: ['sessions'], limit: 250 }, viz: { story: 'Campaign timing shows momentum, decay, or launch spikes.' } },
      { id: 'campaign_landing', title: 'Landing Pages by Campaign', chartType: 'table', gridSpan: { cols: 5, rows: 2 }, query: { dimensions: ['sessionCampaignName', 'landingPage'], metrics: ['sessions', 'engagementRate', 'keyEvents'], orderBys: [{ metric: 'sessions', desc: true }], limit: 25 }, viz: { story: 'Landing-page pairings show where campaign intent lands.' } },
    ],
  },
]

export function getGa4Preset(id?: string | null) {
  return GA4_PRESETS.find((preset) => preset.presetId === id) || GA4_PRESETS[0]
}

export function getGa4DateRange(id?: string | null) {
  return GA4_DATE_RANGES.find((range) => range.value === id) || GA4_DATE_RANGES[1]
}
