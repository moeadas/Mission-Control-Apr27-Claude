export type ContentCalendarBrief = {
  objective: string
  platforms: string[]
  timeframeDays: number
  periodLabel: string
  postsPerPlatform: number | null
  totalPosts: number
  includeArtwork: boolean
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function latestLabel(request: string, label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const matches = Array.from(request.matchAll(new RegExp(`^-\\s*${escaped}:\\s*(.+)$`, 'gim')))
  return matches.at(-1)?.[1]?.trim() || ''
}

function normalizePlatforms(value: string) {
  const known = ['Instagram', 'Facebook', 'LinkedIn', 'TikTok', 'X', 'YouTube', 'Email', 'Website']
  const lower = value.toLowerCase()
  if (/all platforms|all channels/.test(lower)) return known
  return known.filter((platform) => {
    if (platform === 'X') return /(^|[^a-z])(x|twitter)([^a-z]|$)/i.test(value)
    return lower.includes(platform.toLowerCase())
  })
}

function inferPeriodLabel(request: string) {
  const monthPattern = new RegExp(`\\b(${MONTHS.join('|')})\\b(?:\\s+(20\\d{2}))?`, 'ig')
  const matches = Array.from(request.matchAll(monthPattern))
  const match = matches.at(-1)
  if (!match) return new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })
  const year = match[2] || new Date().getFullYear()
  return `${match[1][0].toUpperCase()}${match[1].slice(1).toLowerCase()} ${year}`
}

function daysInNamedMonth(value: string) {
  const monthPattern = new RegExp(`\\b(${MONTHS.join('|')})\\b(?:\\s+(20\\d{2}))?`, 'i')
  const match = value.match(monthPattern)
  if (!match) return null
  const monthIndex = MONTHS.findIndex((month) => month.toLowerCase() === match[1].toLowerCase())
  const year = Number(match[2] || new Date().getFullYear())
  return new Date(year, monthIndex + 1, 0).getDate()
}

function inferTimeframeDays(value: string) {
  const dayMatch = value.match(/(\d+)\s*-?\s*days?/i)
  if (dayMatch) return Math.max(1, Number(dayMatch[1]))
  const weekMatch = value.match(/(\d+)\s*-?\s*weeks?/i)
  if (weekMatch) return Math.max(1, Number(weekMatch[1]) * 7)
  if (/\bweek\b|7-day/i.test(value)) return 7
  const namedMonthDays = daysInNamedMonth(value)
  if (namedMonthDays) return namedMonthDays
  if (/\bmonth\b|monthly|30-day/i.test(value)) return 30
  return 30
}

function inferCadence(value: string) {
  const match = value.match(/(\d+)\s+posts?/i)
  if (match) return Math.max(1, Number(match[1]))
  if (/daily/i.test(value)) return 7
  const weekly = value.match(/(\d+)\s*x?\s*(?:times?\s*)?(?:per|a)\s*week/i)
  return weekly ? Math.max(1, Number(weekly[1])) : null
}

export function resolveContentCalendarBrief(request: string, profile: Record<string, string>): ContentCalendarBrief {
  const confirmedObjective = latestLabel(request, 'Objective')
  const confirmedPlatforms = latestLabel(request, 'Platforms')
  const confirmedTimeframe = latestLabel(request, 'Timeframe')
  const confirmedCadence = latestLabel(request, 'Cadence')
  const confirmedArtwork = latestLabel(request, 'Include artwork')

  const platforms = normalizePlatforms(confirmedPlatforms || request)
  const fallbackPlatforms = normalizePlatforms(profile.platforms || '')
  const resolvedPlatforms = platforms.length ? platforms : fallbackPlatforms.length ? fallbackPlatforms : ['Instagram']
  const requestNamesMonth = new RegExp(`\\b(${MONTHS.join('|')})\\b`, 'i').test(request)
  const timeframeSource = confirmedTimeframe || (requestNamesMonth ? request : '') || profile.timeline || profile.campaign_duration || request
  const timeframeDays = inferTimeframeDays(timeframeSource)
  const cadenceSource = confirmedCadence || profile.posting_frequency || request
  const postsPerPlatform = inferCadence(cadenceSource)
  const totalPosts = postsPerPlatform
    ? postsPerPlatform * resolvedPlatforms.length
    : Math.max(resolvedPlatforms.length, Math.round((12 / 30) * timeframeDays))
  const artworkValue = confirmedArtwork || request
  const includeArtwork = /\b(yes|include|with artwork|create (?:the )?(?:artwork|visual|image))\b/i.test(artworkValue) &&
    !/\b(no|copy only|text only|without artwork|without (?:an )?image)\b/i.test(artworkValue)

  return {
    objective: confirmedObjective || profile.content_goal || 'Awareness and engagement',
    platforms: resolvedPlatforms,
    timeframeDays,
    periodLabel: inferPeriodLabel(request),
    postsPerPlatform,
    totalPosts,
    includeArtwork,
  }
}

export function applyContentCalendarBrief(profile: Record<string, string>, brief: ContentCalendarBrief) {
  return {
    ...profile,
    content_goal: brief.objective,
    platforms: brief.platforms.join(', '),
    timeline: `${brief.timeframeDays} days`,
    campaign_duration: `${brief.timeframeDays} days`,
    posting_frequency: brief.postsPerPlatform
      ? `${brief.postsPerPlatform} posts per platform`
      : `${brief.totalPosts} total posts`,
    month_label: brief.periodLabel,
    include_artwork: brief.includeArtwork ? 'yes' : 'no',
  }
}
