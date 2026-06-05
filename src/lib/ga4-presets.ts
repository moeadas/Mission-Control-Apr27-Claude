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
  }
}

export interface Ga4PresetConfig {
  presetId: string
  label: string
  description: string
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

export const GA4_PRESETS: Ga4PresetConfig[] = [
  {
    presetId: 'ecommerce',
    label: 'E-commerce',
    description: 'Revenue, purchase funnel, and product performance.',
    dateRange: { default: 'last_28_days' },
    widgets: [
      { id: 'kpi_revenue', title: 'Total Revenue', chartType: 'kpi', gridSpan: { cols: 3, rows: 1 }, query: { metrics: ['totalRevenue'] }, viz: { compareToPrevious: true, valueFormat: 'currency' } },
      { id: 'kpi_transactions', title: 'Transactions', chartType: 'kpi', gridSpan: { cols: 3, rows: 1 }, query: { metrics: ['transactions'] }, viz: { compareToPrevious: true } },
      { id: 'kpi_aov', title: 'Avg. Purchase Revenue', chartType: 'kpi', gridSpan: { cols: 3, rows: 1 }, query: { metrics: ['averagePurchaseRevenue'] }, viz: { compareToPrevious: true, valueFormat: 'currency' } },
      { id: 'kpi_arpu', title: 'Revenue / User', chartType: 'kpi', gridSpan: { cols: 3, rows: 1 }, query: { metrics: ['averageRevenuePerUser'] }, viz: { compareToPrevious: true, valueFormat: 'currency' } },
      { id: 'revenue_trend', title: 'Revenue Over Time', chartType: 'line', gridSpan: { cols: 8, rows: 2 }, query: { dimensions: ['date'], metrics: ['totalRevenue', 'transactions'], limit: 120 }, viz: { valueFormat: 'currency' } },
      { id: 'ecom_funnel', title: 'Purchase Funnel', chartType: 'funnel', gridSpan: { cols: 4, rows: 2 }, query: { funnelEvents: ['view_item', 'add_to_cart', 'begin_checkout', 'add_payment_info', 'purchase'] } },
      { id: 'top_products', title: 'Top Products by Revenue', chartType: 'bar', gridSpan: { cols: 6, rows: 2 }, query: { dimensions: ['itemName'], metrics: ['itemRevenue', 'itemsPurchased'], orderBys: [{ metric: 'itemRevenue', desc: true }], limit: 10 }, viz: { valueFormat: 'currency' } },
      { id: 'rev_by_channel', title: 'Revenue by Channel', chartType: 'bar', gridSpan: { cols: 6, rows: 2 }, query: { dimensions: ['sessionDefaultChannelGroup'], metrics: ['totalRevenue'], orderBys: [{ metric: 'totalRevenue', desc: true }], limit: 10 }, viz: { valueFormat: 'currency' } },
    ],
  },
  {
    presetId: 'user_journey',
    label: 'User Journey',
    description: 'How users move from channels to pages and outcomes.',
    dateRange: { default: 'last_28_days' },
    widgets: [
      { id: 'kpi_active', title: 'Active Users', chartType: 'kpi', gridSpan: { cols: 3, rows: 1 }, query: { metrics: ['activeUsers'] }, viz: { compareToPrevious: true } },
      { id: 'kpi_engrate', title: 'Engagement Rate', chartType: 'kpi', gridSpan: { cols: 3, rows: 1 }, query: { metrics: ['engagementRate'] }, viz: { compareToPrevious: true, valueFormat: 'percent' } },
      { id: 'kpi_avgdur', title: 'Engagement Time', chartType: 'kpi', gridSpan: { cols: 3, rows: 1 }, query: { metrics: ['userEngagementDuration'] }, viz: { valueFormat: 'duration' } },
      { id: 'kpi_pages', title: 'Views / Session', chartType: 'kpi', gridSpan: { cols: 3, rows: 1 }, query: { metrics: ['screenPageViewsPerSession'] }, viz: { compareToPrevious: true } },
      { id: 'journey_paths', title: 'Channel to Landing Page Outcomes', chartType: 'table', gridSpan: { cols: 12, rows: 3 }, query: { dimensions: ['sessionDefaultChannelGroup', 'landingPage'], metrics: ['sessions', 'keyEvents'], orderBys: [{ metric: 'sessions', desc: true }], limit: 25 } },
      { id: 'landing_perf', title: 'Landing Page Performance', chartType: 'table', gridSpan: { cols: 7, rows: 2 }, query: { dimensions: ['landingPage'], metrics: ['sessions', 'engagementRate', 'keyEvents'], orderBys: [{ metric: 'sessions', desc: true }], limit: 20 } },
      { id: 'new_vs_ret', title: 'New vs Returning', chartType: 'donut', gridSpan: { cols: 5, rows: 2 }, query: { dimensions: ['newVsReturning'], metrics: ['activeUsers'], limit: 5 } },
    ],
  },
  {
    presetId: 'traffic_source',
    label: 'Traffic Acquisition',
    description: 'Where users come from and which channels convert.',
    dateRange: { default: 'last_28_days' },
    widgets: [
      { id: 'kpi_sessions', title: 'Sessions', chartType: 'kpi', gridSpan: { cols: 3, rows: 1 }, query: { metrics: ['sessions'] }, viz: { compareToPrevious: true } },
      { id: 'kpi_users', title: 'Active Users', chartType: 'kpi', gridSpan: { cols: 3, rows: 1 }, query: { metrics: ['activeUsers'] }, viz: { compareToPrevious: true } },
      { id: 'kpi_key_events', title: 'Key Events', chartType: 'kpi', gridSpan: { cols: 3, rows: 1 }, query: { metrics: ['keyEvents'] }, viz: { compareToPrevious: true } },
      { id: 'kpi_revenue', title: 'Revenue', chartType: 'kpi', gridSpan: { cols: 3, rows: 1 }, query: { metrics: ['totalRevenue'] }, viz: { compareToPrevious: true, valueFormat: 'currency' } },
      { id: 'channel_bar', title: 'Sessions by Channel', chartType: 'bar', gridSpan: { cols: 6, rows: 2 }, query: { dimensions: ['sessionDefaultChannelGroup'], metrics: ['sessions', 'engagedSessions'], orderBys: [{ metric: 'sessions', desc: true }], limit: 12 } },
      { id: 'source_medium_tbl', title: 'Top Source / Medium', chartType: 'table', gridSpan: { cols: 6, rows: 2 }, query: { dimensions: ['sessionSourceMedium'], metrics: ['sessions', 'engagementRate', 'keyEvents', 'totalRevenue'], orderBys: [{ metric: 'sessions', desc: true }], limit: 15 } },
      { id: 'channel_trend', title: 'Channel Trends', chartType: 'line', gridSpan: { cols: 12, rows: 2 }, query: { dimensions: ['date', 'sessionDefaultChannelGroup'], metrics: ['sessions'], limit: 250 } },
      { id: 'campaign_tbl', title: 'Campaign Performance', chartType: 'table', gridSpan: { cols: 6, rows: 2 }, query: { dimensions: ['sessionCampaignName'], metrics: ['sessions', 'keyEvents', 'totalRevenue'], orderBys: [{ metric: 'totalRevenue', desc: true }], limit: 15 } },
      { id: 'quality_scatter', title: 'Channel Quality', chartType: 'scatter', gridSpan: { cols: 6, rows: 2 }, query: { dimensions: ['sessionDefaultChannelGroup'], metrics: ['engagementRate', 'keyEvents', 'sessions'], limit: 12 } },
    ],
  },
  {
    presetId: 'engagement',
    label: 'Engagement & Content',
    description: 'Content consumption, events, and on-site engagement quality.',
    dateRange: { default: 'last_28_days' },
    widgets: [
      { id: 'kpi_views', title: 'Views', chartType: 'kpi', gridSpan: { cols: 3, rows: 1 }, query: { metrics: ['screenPageViews'] }, viz: { compareToPrevious: true } },
      { id: 'kpi_events', title: 'Events', chartType: 'kpi', gridSpan: { cols: 3, rows: 1 }, query: { metrics: ['eventCount'] }, viz: { compareToPrevious: true } },
      { id: 'kpi_engrate', title: 'Engagement Rate', chartType: 'kpi', gridSpan: { cols: 3, rows: 1 }, query: { metrics: ['engagementRate'] }, viz: { compareToPrevious: true, valueFormat: 'percent' } },
      { id: 'kpi_bounce', title: 'Bounce Rate', chartType: 'kpi', gridSpan: { cols: 3, rows: 1 }, query: { metrics: ['bounceRate'] }, viz: { compareToPrevious: true, valueFormat: 'percent' } },
      { id: 'top_pages', title: 'Top Pages by Views', chartType: 'bar', gridSpan: { cols: 6, rows: 2 }, query: { dimensions: ['pageTitle'], metrics: ['screenPageViews', 'userEngagementDuration'], orderBys: [{ metric: 'screenPageViews', desc: true }], limit: 12 } },
      { id: 'events', title: 'Event Count by Name', chartType: 'bar', gridSpan: { cols: 6, rows: 2 }, query: { dimensions: ['eventName'], metrics: ['eventCount'], orderBys: [{ metric: 'eventCount', desc: true }], limit: 15 } },
      { id: 'page_table', title: 'Page Engagement Table', chartType: 'table', gridSpan: { cols: 12, rows: 2 }, query: { dimensions: ['pagePath'], metrics: ['screenPageViews', 'engagementRate', 'eventCount'], orderBys: [{ metric: 'screenPageViews', desc: true }], limit: 25 } },
    ],
  },
  {
    presetId: 'audience',
    label: 'Audience',
    description: 'Location, devices, browsers, and language mix.',
    dateRange: { default: 'last_28_days' },
    widgets: [
      { id: 'kpi_users', title: 'Active Users', chartType: 'kpi', gridSpan: { cols: 3, rows: 1 }, query: { metrics: ['activeUsers'] }, viz: { compareToPrevious: true } },
      { id: 'kpi_new', title: 'New Users', chartType: 'kpi', gridSpan: { cols: 3, rows: 1 }, query: { metrics: ['newUsers'] }, viz: { compareToPrevious: true } },
      { id: 'countries', title: 'Users by Country', chartType: 'bar', gridSpan: { cols: 6, rows: 2 }, query: { dimensions: ['country'], metrics: ['activeUsers'], orderBys: [{ metric: 'activeUsers', desc: true }], limit: 15 } },
      { id: 'devices', title: 'Device Mix', chartType: 'donut', gridSpan: { cols: 6, rows: 2 }, query: { dimensions: ['deviceCategory'], metrics: ['activeUsers'], limit: 5 } },
      { id: 'browser_table', title: 'Browser / OS', chartType: 'table', gridSpan: { cols: 6, rows: 2 }, query: { dimensions: ['browser', 'operatingSystem'], metrics: ['activeUsers', 'engagementRate'], orderBys: [{ metric: 'activeUsers', desc: true }], limit: 20 } },
      { id: 'language_table', title: 'Language', chartType: 'table', gridSpan: { cols: 6, rows: 2 }, query: { dimensions: ['language'], metrics: ['activeUsers', 'sessions'], orderBys: [{ metric: 'activeUsers', desc: true }], limit: 20 } },
    ],
  },
]

export function getGa4Preset(id?: string | null) {
  return GA4_PRESETS.find((preset) => preset.presetId === id) || GA4_PRESETS[0]
}

export function getGa4DateRange(id?: string | null) {
  return GA4_DATE_RANGES.find((range) => range.value === id) || GA4_DATE_RANGES[1]
}
