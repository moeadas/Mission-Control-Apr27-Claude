import { ArtifactExecutionStep } from '@/lib/types'
import { validateDeliverableQuality } from '@/lib/output-quality'
import { escapeHtml, truncate } from '@/lib/server/text-utils'
import { readResponseTextWithLimit, safeFetchUrl } from '@/lib/server/safe-fetch'

type ClientProfileMap = Record<string, string>

type RuntimeHooks = {
  onPhaseStart?: (input: { phase: { id: string; name: string }; progress: number }) => Promise<void> | void
  onActivityStart?: (input: {
    phase: { id: string; name: string }
    activity: { id: string; name: string; outputs?: string[] }
    agent: { id: string; name: string; role: string }
    runtime: { provider: 'ollama'; model: string }
    progress: number
  }) => Promise<void> | void
  onActivityComplete?: (input: {
    phase: { id: string; name: string }
    activity: { id: string; name: string; outputs?: string[] }
    agent: { id: string; name: string; role: string }
    runtime: { provider: 'ollama'; model: string }
    summary: string
    outputIds: string[]
    progress: number
  }) => Promise<void> | void
}

type Issue = {
  title: string
  detail: string
  fix: string
  severity: 'critical' | 'warning' | 'pass'
}

type Category = {
  key: string
  label: string
  score: number
  summary: string
  critical: Issue[]
  warnings: Issue[]
  passed: Issue[]
  recommendations: Array<{ priority: string; action: string; impact: string; effort: string }>
}

type PageEvidence = {
  url: string
  finalUrl: string
  fetched: boolean
  fetchError?: string
  status?: number
  responseMs?: number
  source?: 'seed' | 'sitemap' | 'internal-link'
  htmlBytes: number
  title: string
  metaDescription: string
  canonical: string
  lang: string
  viewport: string
  robotsMeta: string
  hreflangCount: number
  doctypePresent: boolean
  charset: string
  h1: string[]
  headings: Array<{ level: number; text: string }>
  images: Array<{ src: string; alt: string }>
  links: Array<{ href: string; text: string }>
  forms: number
  buttons: number
  ctas: number
  scripts: number
  stylesheets: number
  schemaCount: number
  openGraphCount: number
  twitterCount: number
  textLength: number
  wordCount: number
  hasHttps: boolean
  hasRobotsTxt: boolean
  hasSitemap: boolean
  securityHeaders: Record<string, string>
  pageSpeed: PageSpeedEvidence
}

type SitemapUrl = {
  loc: string
  lastmod?: string
}

type LinkCheck = {
  url: string
  sourceUrl: string
  status?: number
  finalUrl?: string
  redirected: boolean
  broken: boolean
  error?: string
}

type SiteCrawlEvidence = {
  origin: string
  seedUrl: string
  pages: PageEvidence[]
  sitemapUrls: SitemapUrl[]
  discoveredUrls: string[]
  linkChecks: LinkCheck[]
  inlinkCounts: Record<string, number>
}

type PageSpeedStrategy = 'mobile' | 'desktop'

type PageSpeedRun = {
  strategy: PageSpeedStrategy
  available: boolean
  error?: string
  finalUrl?: string
  fetchTime?: string
  scores: {
    performance?: number
    accessibility?: number
    seo?: number
    bestPractices?: number
  }
  metrics: {
    firstContentfulPaint?: string
    largestContentfulPaint?: string
    totalBlockingTime?: string
    cumulativeLayoutShift?: string
    speedIndex?: string
    timeToInteractive?: string
  }
  opportunities: Array<{ title: string; displayValue?: string; savingsMs?: number; savingsBytes?: number }>
}

type PageSpeedEvidence = {
  mobile: PageSpeedRun
  desktop: PageSpeedRun
}

const WEIGHTS: Record<string, number> = {
  seo: 0.15,
  ux: 0.12,
  ui: 0.1,
  conversion: 0.12,
  performance: 0.12,
  accessibility: 0.1,
  content: 0.1,
  security: 0.08,
  mobile: 0.06,
  benchmark: 0.05,
}

function normalizeUrl(value: string) {
  const trimmed = value.trim().replace(/[.,;:!?]+$/, '')
  if (!trimmed) return ''
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

function extractWebsiteAuditUrl(message: string, clientProfile?: ClientProfileMap) {
  const explicit = clientProfile?.website_url || clientProfile?.website || ''
  if (explicit) return normalizeUrl(explicit)
  const match = message.match(/\bhttps?:\/\/[^\s<>)"']+|\bwww\.[^\s<>)"']+|\b(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s<>)"']*)?/i)
  if (!match) return ''
  if (match[0].includes('@')) return ''
  return normalizeUrl(match[0])
}

function getAttr(tag: string, attr: string) {
  const match = tag.match(new RegExp(`${attr}\\s*=\\s*["']([^"']*)["']`, 'i'))
  return match?.[1]?.trim() || ''
}

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function scoreFromChecks(passed: number, warnings: number, critical: number, neutral = 0) {
  const total = passed + warnings + critical + neutral
  if (!total) return 50
  return Math.max(0, Math.min(100, Math.round(((passed * 100 + warnings * 50 + neutral * 60) / total))))
}

function labelForScore(score: number) {
  if (score >= 90) return 'Excellent'
  if (score >= 70) return 'Good'
  if (score >= 40) return 'Fair'
  return 'Poor'
}

function colorForScore(score: number) {
  if (score >= 70) return '#4d9f0c'
  if (score >= 40) return '#d18a00'
  return '#e02b2b'
}

function issue(title: string, detail: string, fix: string, severity: Issue['severity']): Issue {
  return { title, detail, fix, severity }
}

function emptyPageSpeedRun(strategy: PageSpeedStrategy, error?: string): PageSpeedRun {
  return {
    strategy,
    available: false,
    error,
    scores: {},
    metrics: {},
    opportunities: [],
  }
}

function emptyPageSpeedEvidence(error?: string): PageSpeedEvidence {
  return {
    mobile: emptyPageSpeedRun('mobile', error),
    desktop: emptyPageSpeedRun('desktop', error),
  }
}

function scorePercent(value: unknown) {
  return typeof value === 'number' ? Math.round(value * 100) : undefined
}

function auditDisplayValue(audits: any, id: string) {
  const value = audits?.[id]?.displayValue
  return typeof value === 'string' ? value : undefined
}

async function fetchPageSpeed(url: string, strategy: PageSpeedStrategy): Promise<PageSpeedRun> {
  const apiKey = process.env.PAGESPEED_API_KEY || process.env.GOOGLE_PAGESPEED_API_KEY || ''
  const endpoint = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed')
  endpoint.searchParams.set('url', url)
  endpoint.searchParams.set('strategy', strategy)
  for (const category of ['performance', 'accessibility', 'best-practices', 'seo']) {
    endpoint.searchParams.append('category', category)
  }
  if (apiKey) endpoint.searchParams.set('key', apiKey)

  try {
    const response = await fetch(endpoint, {
      signal: AbortSignal.timeout(45000),
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(text || `PageSpeed API returned HTTP ${response.status}`)
    }
    const data = await response.json()
    const lighthouse = data?.lighthouseResult || {}
    const categories = lighthouse.categories || {}
    const audits = lighthouse.audits || {}
    const opportunityIds = [
      'largest-contentful-paint-element',
      'render-blocking-resources',
      'unused-javascript',
      'unused-css-rules',
      'uses-optimized-images',
      'modern-image-formats',
      'uses-responsive-images',
      'efficient-animated-content',
      'total-byte-weight',
      'server-response-time',
      'uses-text-compression',
    ]
    const opportunities = opportunityIds
      .map((id) => audits[id])
      .filter((audit) => audit && audit.score !== 1)
      .slice(0, 6)
      .map((audit) => ({
        title: String(audit.title || audit.id || 'Performance opportunity'),
        displayValue: typeof audit.displayValue === 'string' ? audit.displayValue : undefined,
        savingsMs: typeof audit.details?.overallSavingsMs === 'number' ? Math.round(audit.details.overallSavingsMs) : undefined,
        savingsBytes: typeof audit.details?.overallSavingsBytes === 'number' ? Math.round(audit.details.overallSavingsBytes) : undefined,
      }))

    return {
      strategy,
      available: true,
      finalUrl: lighthouse.finalUrl || data.id || url,
      fetchTime: lighthouse.fetchTime || data.analysisUTCTimestamp,
      scores: {
        performance: scorePercent(categories.performance?.score),
        accessibility: scorePercent(categories.accessibility?.score),
        seo: scorePercent(categories.seo?.score),
        bestPractices: scorePercent(categories['best-practices']?.score),
      },
      metrics: {
        firstContentfulPaint: auditDisplayValue(audits, 'first-contentful-paint'),
        largestContentfulPaint: auditDisplayValue(audits, 'largest-contentful-paint'),
        totalBlockingTime: auditDisplayValue(audits, 'total-blocking-time'),
        cumulativeLayoutShift: auditDisplayValue(audits, 'cumulative-layout-shift'),
        speedIndex: auditDisplayValue(audits, 'speed-index'),
        timeToInteractive: auditDisplayValue(audits, 'interactive'),
      },
      opportunities,
    }
  } catch (error: any) {
    return emptyPageSpeedRun(strategy, error?.message || 'PageSpeed Insights request failed.')
  }
}

async function fetchPageSpeedEvidence(url: string): Promise<PageSpeedEvidence> {
  const [mobile, desktop] = await Promise.all([
    fetchPageSpeed(url, 'mobile'),
    fetchPageSpeed(url, 'desktop'),
  ])
  return { mobile, desktop }
}

function blendedScore(primary: number, fallback: number | undefined, weight = 0.6) {
  if (typeof fallback !== 'number') return primary
  return Math.round(fallback * weight + primary * (1 - weight))
}

function weightedPsiScore(mobile?: number, desktop?: number) {
  if (typeof mobile === 'number' && typeof desktop === 'number') return Math.round(mobile * 0.7 + desktop * 0.3)
  return mobile ?? desktop
}

async function fetchText(url: string, timeoutMs = 12000) {
  const started = Date.now()
  const { response, finalUrl, redirected } = await safeFetchUrl(url, {
    headers: {
      'User-Agent': 'MissionControlWebsiteAuditor/1.0',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  }, { timeoutMs })
  const text = await readResponseTextWithLimit(response, 1_500_000)
  return { response, text, responseMs: Date.now() - started, finalUrl, redirected }
}

function normalizeCrawlUrl(rawHref: string, baseUrl: string) {
  const href = rawHref.trim()
  if (!href || href.startsWith('#')) return ''
  if (/^(mailto|tel|javascript|data):/i.test(href)) return ''
  try {
    const parsed = new URL(href, baseUrl)
    parsed.hash = ''
    if (!/^https?:$/i.test(parsed.protocol)) return ''
    parsed.pathname = parsed.pathname.replace(/\/{2,}/g, '/')
    return parsed.toString().replace(/\/$/, parsed.pathname === '/' ? '/' : '')
  } catch {
    return ''
  }
}

function isSameOriginUrl(url: string, origin: string) {
  try {
    return new URL(url).origin === origin
  } catch {
    return false
  }
}

function isLikelyHtmlPage(url: string) {
  try {
    const parsed = new URL(url)
    if (parsed.searchParams.size > 3) return false
    return !/\.(pdf|jpg|jpeg|png|gif|webp|svg|mp4|mov|avi|zip|rar|css|js|json|xml|txt|ico|woff2?|ttf|eot)$/i.test(parsed.pathname)
  } catch {
    return false
  }
}

function pageImportanceScore(url: string) {
  const path = new URL(url).pathname.toLowerCase()
  let score = path === '/' ? 100 : 40
  if (/\b(service|product|solution|pricing|contact|about|blog|case|faq|test|shop|audit|genomic|dna|arabian)\b/.test(path)) score += 30
  if (path.split('/').filter(Boolean).length <= 2) score += 15
  if (/[?&]/.test(url)) score -= 25
  return score
}

function uniqueUrls(urls: string[]) {
  return Array.from(new Set(urls.filter(Boolean)))
}

async function fetchSitemapUrls(origin: string, robotsText = '', limit = 40): Promise<SitemapUrl[]> {
  const sitemapCandidates = uniqueUrls([
    ...Array.from(robotsText.matchAll(/^sitemap:\s*(\S+)/gim)).map((match) => match[1]),
    `${origin}/sitemap.xml`,
    `${origin}/sitemap_index.xml`,
  ])
  const seen = new Set<string>()
  const results: SitemapUrl[] = []

  async function readSitemap(sitemapUrl: string, depth = 0) {
    if (seen.has(sitemapUrl) || results.length >= limit || depth > 1) return
    seen.add(sitemapUrl)
    try {
      const { response } = await safeFetchUrl(sitemapUrl, {
        headers: { Accept: 'application/xml,text/xml,*/*' },
      }, { timeoutMs: 7000 })
      if (!response.ok) return
      const xml = await readResponseTextWithLimit(response, 800_000)
      const nested = Array.from(xml.matchAll(/<sitemap>[\s\S]*?<loc>([\s\S]*?)<\/loc>[\s\S]*?<\/sitemap>/gi))
        .map((match) => match[1].trim())
      if (nested.length) {
        for (const nestedUrl of nested.slice(0, 8)) await readSitemap(nestedUrl, depth + 1)
        return
      }
      for (const match of xml.matchAll(/<url>[\s\S]*?<loc>([\s\S]*?)<\/loc>([\s\S]*?)<\/url>/gi)) {
        if (results.length >= limit) break
        const loc = match[1].trim()
        if (!isSameOriginUrl(loc, origin) || !isLikelyHtmlPage(loc)) continue
        const lastmod = match[2].match(/<lastmod>([\s\S]*?)<\/lastmod>/i)?.[1]?.trim()
        results.push({ loc, lastmod })
      }
    } catch {
      // Sitemap discovery is opportunistic; the audit continues with internal links.
    }
  }

  for (const sitemapUrl of sitemapCandidates) await readSitemap(sitemapUrl)
  const deduped = new Map<string, SitemapUrl>()
  for (const item of results) if (!deduped.has(item.loc)) deduped.set(item.loc, item)
  return Array.from(deduped.values())
}

async function checkInternalLinks(pages: PageEvidence[], origin: string, limit = 25): Promise<LinkCheck[]> {
  const checks: Array<{ url: string; sourceUrl: string }> = []
  const seen = new Set<string>()
  for (const page of pages) {
    for (const link of page.links) {
      const normalized = normalizeCrawlUrl(link.href, page.finalUrl || page.url)
      if (!normalized || !isSameOriginUrl(normalized, origin) || !isLikelyHtmlPage(normalized) || seen.has(normalized)) continue
      seen.add(normalized)
      checks.push({ url: normalized, sourceUrl: page.finalUrl || page.url })
      if (checks.length >= limit) break
    }
    if (checks.length >= limit) break
  }

  return Promise.all(checks.map(async (item) => {
    try {
      const { response, finalUrl, redirected } = await safeFetchUrl(item.url, {
        method: 'HEAD',
        headers: { 'User-Agent': 'MissionControlWebsiteAuditor/1.0' },
      }, { timeoutMs: 6000 })
      return {
        ...item,
        status: response.status,
        finalUrl,
        redirected,
        broken: response.status >= 400,
      }
    } catch (error: any) {
      return {
        ...item,
        redirected: false,
        broken: true,
        error: error?.message || 'Link check failed',
      }
    }
  }))
}

function computeInlinkCounts(pages: PageEvidence[], origin: string) {
  const counts: Record<string, number> = {}
  const crawled = new Set(pages.map((page) => page.finalUrl || page.url))
  for (const page of pages) {
    const source = page.finalUrl || page.url
    for (const link of page.links) {
      const normalized = normalizeCrawlUrl(link.href, source)
      if (!normalized || !isSameOriginUrl(normalized, origin) || !crawled.has(normalized) || normalized === source) continue
      counts[normalized] = (counts[normalized] || 0) + 1
    }
  }
  return counts
}

async function collectEvidence(url: string, options?: { includePageSpeed?: boolean; source?: PageEvidence['source'] }): Promise<PageEvidence> {
  const fallback: PageEvidence = {
    url,
    finalUrl: url,
    fetched: false,
    source: options?.source,
    htmlBytes: 0,
    title: '',
    metaDescription: '',
    canonical: '',
    lang: '',
    viewport: '',
    robotsMeta: '',
    hreflangCount: 0,
    doctypePresent: false,
    charset: '',
    h1: [],
    headings: [],
    images: [],
    links: [],
    forms: 0,
    buttons: 0,
    ctas: 0,
    scripts: 0,
    stylesheets: 0,
    schemaCount: 0,
    openGraphCount: 0,
    twitterCount: 0,
    textLength: 0,
    wordCount: 0,
    hasHttps: /^https:/i.test(url),
    hasRobotsTxt: false,
    hasSitemap: false,
    securityHeaders: {},
    pageSpeed: emptyPageSpeedEvidence(),
  }

  try {
    const { response, text: html, responseMs, finalUrl } = await fetchText(url)
    const base = new URL(finalUrl)
    const pageSpeed = options?.includePageSpeed === false ? emptyPageSpeedEvidence() : await fetchPageSpeedEvidence(finalUrl)
    const lower = html.toLowerCase()
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim() || ''
    const metaDescription =
      html.match(/<meta[^>]+name=["']description["'][^>]*>/i)?.[0] ||
      html.match(/<meta[^>]+property=["']og:description["'][^>]*>/i)?.[0] ||
      ''
    const headings = Array.from(html.matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi)).map((match) => ({
      level: Number(match[1]),
      text: stripHtml(match[2]).slice(0, 160),
    }))
    const images = Array.from(html.matchAll(/<img\b[^>]*>/gi)).map((match) => ({
      src: getAttr(match[0], 'src'),
      alt: getAttr(match[0], 'alt'),
    }))
    const links = Array.from(html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)).map((match) => ({
      href: match[1],
      text: stripHtml(match[2]).slice(0, 120),
    }))
    const cleanText = stripHtml(html)
    const securityHeaders: Record<string, string> = {}
    for (const header of [
      'strict-transport-security',
      'content-security-policy',
      'x-content-type-options',
      'x-frame-options',
      'referrer-policy',
      'permissions-policy',
    ]) {
      securityHeaders[header] = response.headers.get(header) || ''
    }

    const [robotsResult, sitemapResult] = await Promise.all([
      safeFetchUrl(`${base.origin}/robots.txt`, {}, { timeoutMs: 5000 }).then(({ response }) => response.ok).catch(() => false),
      safeFetchUrl(`${base.origin}/sitemap.xml`, {}, { timeoutMs: 5000 }).then(({ response }) => response.ok).catch(() => false),
    ])

    return {
      ...fallback,
      finalUrl,
      fetched: true,
      source: options?.source || fallback.source,
      status: response.status,
      responseMs,
      htmlBytes: Buffer.byteLength(html, 'utf8'),
      title,
      metaDescription: metaDescription ? getAttr(metaDescription, 'content') : '',
      canonical: getAttr(html.match(/<link[^>]+rel=["']canonical["'][^>]*>/i)?.[0] || '', 'href'),
      lang: getAttr(html.match(/<html[^>]*>/i)?.[0] || '', 'lang'),
      viewport: getAttr(html.match(/<meta[^>]+name=["']viewport["'][^>]*>/i)?.[0] || '', 'content'),
      robotsMeta: getAttr(html.match(/<meta[^>]+name=["']robots["'][^>]*>/i)?.[0] || '', 'content'),
      hreflangCount: (lower.match(/rel=["']alternate["'][^>]+hreflang=/g) || []).length,
      doctypePresent: /^<!doctype html>/i.test(html.trim()),
      charset: getAttr(html.match(/<meta[^>]+charset=["']?([^"'\s>]+)/i)?.[0] || '', 'charset'),
      h1: headings.filter((heading) => heading.level === 1).map((heading) => heading.text),
      headings,
      images,
      links,
      forms: (lower.match(/<form\b/g) || []).length,
      buttons: (lower.match(/<button\b/g) || []).length,
      ctas: (cleanText.match(/\b(contact|book|buy|order|get started|request|quote|call|subscribe|learn more|schedule)\b/gi) || []).length,
      scripts: (lower.match(/<script\b/g) || []).length,
      stylesheets: (lower.match(/rel=["']stylesheet["']/g) || []).length,
      schemaCount: (lower.match(/application\/ld\+json/g) || []).length,
      openGraphCount: (lower.match(/property=["']og:/g) || []).length,
      twitterCount: (lower.match(/name=["']twitter:/g) || []).length,
      textLength: cleanText.length,
      wordCount: cleanText ? cleanText.split(/\s+/).length : 0,
      hasHttps: /^https:/i.test(finalUrl),
      hasRobotsTxt: robotsResult,
      hasSitemap: sitemapResult,
      securityHeaders,
      pageSpeed,
    }
  } catch (error: any) {
    return {
      ...fallback,
      fetchError: error?.message || 'The website could not be fetched.',
    }
  }
}

async function collectSiteEvidence(seedUrl: string): Promise<SiteCrawlEvidence> {
  const seed = await collectEvidence(seedUrl, { includePageSpeed: true, source: 'seed' })
  const origin = new URL(seed.finalUrl || seedUrl).origin
  const robotsText = await safeFetchUrl(`${origin}/robots.txt`, {}, { timeoutMs: 5000 })
    .then(async ({ response }) => response.ok ? readResponseTextWithLimit(response, 250_000) : '')
    .catch(() => '')
  const sitemapUrls = await fetchSitemapUrls(origin, robotsText)
  const seedInternalUrls = seed.links
    .map((link) => normalizeCrawlUrl(link.href, seed.finalUrl || seed.url))
    .filter((link) => link && isSameOriginUrl(link, origin) && isLikelyHtmlPage(link))
  const crawlCandidates = uniqueUrls([
    ...sitemapUrls.map((item) => item.loc),
    ...seedInternalUrls,
  ])
    .filter((candidate) => candidate !== (seed.finalUrl || seed.url))
    .sort((a, b) => pageImportanceScore(b) - pageImportanceScore(a))
    .slice(0, 7)

  const crawledPages = await Promise.all(
    crawlCandidates.map((candidate) =>
      collectEvidence(candidate, {
        includePageSpeed: false,
        source: sitemapUrls.some((item) => item.loc === candidate) ? 'sitemap' : 'internal-link',
      })
    )
  )
  const pages = [seed, ...crawledPages]
  const linkChecks = await checkInternalLinks(pages, origin)
  return {
    origin,
    seedUrl,
    pages,
    sitemapUrls,
    discoveredUrls: crawlCandidates,
    linkChecks,
    inlinkCounts: computeInlinkCounts(pages, origin),
  }
}

function hasHeadingOrderIssue(headings: PageEvidence['headings']) {
  for (let index = 1; index < headings.length; index += 1) {
    if (headings[index].level - headings[index - 1].level > 1) return true
  }
  return false
}

function buildCategories(e: PageEvidence, clientProfile: ClientProfileMap): Category[] {
  const missingAlt = e.images.filter((img) => !img.alt).length
  const emptyLinks = e.links.filter((link) => !link.text).length
  const internalLinks = e.links.filter((link) => link.href.startsWith('/') || link.href.includes(new URL(e.finalUrl || e.url).hostname)).length
  const securityMissing = Object.entries(e.securityHeaders).filter(([, value]) => !value).map(([key]) => key)
  const headingIssue = hasHeadingOrderIssue(e.headings)
  const hasPrivacy = /\bprivacy policy\b/i.test(e.links.map((link) => link.text).join(' '))
  const hasTrust = /\b(testimonial|review|certified|secure|guarantee|partner|client|case study)\b/i.test(`${e.links.map((l) => l.text).join(' ')} ${clientProfile.brand_name || ''}`)
  const categories: Category[] = []
  const psiPerf = weightedPsiScore(e.pageSpeed.mobile.scores.performance, e.pageSpeed.desktop.scores.performance)
  const psiA11y = weightedPsiScore(e.pageSpeed.mobile.scores.accessibility, e.pageSpeed.desktop.scores.accessibility)
  const psiSeo = weightedPsiScore(e.pageSpeed.mobile.scores.seo, e.pageSpeed.desktop.scores.seo)
  const psiBestPractices = weightedPsiScore(e.pageSpeed.mobile.scores.bestPractices, e.pageSpeed.desktop.scores.bestPractices)
  const pageSpeedAvailable = e.pageSpeed.mobile.available || e.pageSpeed.desktop.available

  const seoCritical = [
    !e.title ? issue('Missing title tag', 'The page does not expose a readable title tag.', 'Add a unique, keyword-led title tag around 45-60 characters.', 'critical') : null,
    !e.metaDescription ? issue('Missing meta description', 'No meta description was detected for the audited page.', 'Write a concise 140-160 character meta description focused on the page value proposition.', 'critical') : null,
    e.h1.length !== 1 ? issue('H1 structure problem', `Detected ${e.h1.length} H1 tags.`, 'Use exactly one descriptive H1 that matches the page search intent.', 'critical') : null,
    missingAlt > 0 ? issue('Image alt text gaps', `${missingAlt} of ${e.images.length} images have missing or empty alt text.`, 'Add descriptive alt text to meaningful images and empty alt only for decorative assets.', 'critical') : null,
    headingIssue ? issue('Broken heading hierarchy', 'Heading levels appear to skip hierarchy in at least one place.', 'Restructure headings sequentially from H1 to H2 to H3.', 'critical') : null,
  ].filter(Boolean) as Issue[]
  const seoWarnings = [
    !e.canonical ? issue('Canonical tag not detected', 'No canonical URL was found in the HTML.', 'Add a canonical link to reduce duplicate URL ambiguity.', 'warning') : null,
    !e.hasSitemap ? issue('Sitemap not detected', '/sitemap.xml did not return a successful response.', 'Publish and submit XML sitemap in Google Search Console.', 'warning') : null,
    e.openGraphCount < 3 ? issue('Open Graph metadata is thin', `Detected ${e.openGraphCount} Open Graph tags.`, 'Add og:title, og:description, og:image, and og:url.', 'warning') : null,
    e.twitterCount < 2 ? issue('Twitter/X card metadata missing', `Detected ${e.twitterCount} Twitter card tags.`, 'Add twitter:card, twitter:title, twitter:description, and twitter:image tags.', 'warning') : null,
  ].filter(Boolean) as Issue[]
  const seoCheckScore = scoreFromChecks(8 - seoCritical.length - seoWarnings.length, seoWarnings.length, seoCritical.length)
  categories.push({
    key: 'seo',
    label: 'SEO',
    score: blendedScore(seoCheckScore, psiSeo, 0.55),
    summary: 'Assesses indexability, metadata, headings, image signals, structured data, and social search presentation.',
    critical: seoCritical,
    warnings: seoWarnings,
    passed: [
      e.hasHttps ? issue('HTTPS is active', 'The audited URL resolves over HTTPS.', 'Maintain HTTPS redirects and certificate renewal.', 'pass') : null,
      e.schemaCount > 0 ? issue('Structured data found', `${e.schemaCount} JSON-LD blocks were detected.`, 'Validate schema in Rich Results Test and expand by page type.', 'pass') : null,
      e.hasRobotsTxt ? issue('robots.txt found', 'robots.txt returned a successful response.', 'Keep crawl directives clean and sitemap linked.', 'pass') : null,
    ].filter(Boolean) as Issue[],
    recommendations: [
      { priority: 'High', action: 'Fix title, meta, H1, canonical, and alt text gaps page-by-page.', impact: 'Higher crawl clarity and SERP CTR.', effort: 'Medium' },
      { priority: 'Medium', action: 'Add FAQ/Product/Organization schema where relevant.', impact: 'Improved rich-result eligibility.', effort: 'Medium' },
    ],
  })

  const uxCritical = [
    e.links.length < 5 ? issue('Sparse navigational signals', `Only ${e.links.length} links were detected.`, 'Expose clear navigation to core services, proof, FAQs, and contact paths.', 'critical') : null,
    emptyLinks > 0 ? issue('Links without discernible text', `${emptyLinks} links have no readable anchor text.`, 'Give every link descriptive text or aria-labels.', 'critical') : null,
    !hasPrivacy ? issue('Privacy policy not visible', 'A privacy policy link was not detected in page links.', 'Add a visible privacy policy link in the footer and forms.', 'critical') : null,
  ].filter(Boolean) as Issue[]
  const uxWarnings = [
    e.ctas < 2 ? issue('CTA path is weak', `Only ${e.ctas} CTA-like phrases were detected.`, 'Repeat one primary action above the fold, mid-page, and near the close.', 'warning') : null,
    !hasTrust ? issue('Trust signals are limited', 'Testimonials, proof, certifications, or partner signals were not strongly detected.', 'Add proof close to decision points.', 'warning') : null,
  ].filter(Boolean) as Issue[]
  categories.push({
    key: 'ux',
    label: 'UX & Usability',
    score: scoreFromChecks(6 - uxCritical.length - uxWarnings.length, uxWarnings.length, uxCritical.length),
    summary: 'Reviews navigation clarity, task completion, trust, link labels, and decision friction.',
    critical: uxCritical,
    warnings: uxWarnings,
    passed: [e.viewport ? issue('Viewport configured', 'A viewport meta tag is present.', 'Keep testing at mobile widths.', 'pass') : null].filter(Boolean) as Issue[],
    recommendations: [
      { priority: 'High', action: 'Make one primary user path obvious: learn, trust, act.', impact: 'Lower bounce and clearer conversion flow.', effort: 'Medium' },
      { priority: 'Medium', action: 'Add proof and FAQ modules next to service CTAs.', impact: 'Higher confidence for first-time visitors.', effort: 'Low' },
    ],
  })

  const uiCritical = [
    e.stylesheets === 0 ? issue('No stylesheet detected', 'The page did not expose linked CSS files.', 'Verify visual styling loads reliably for all users.', 'critical') : null,
    e.images.length === 0 ? issue('No visual assets detected', 'The page HTML did not expose image assets.', 'Use relevant visuals that support product understanding and trust.', 'critical') : null,
  ].filter(Boolean) as Issue[]
  const uiWarnings = [
    e.images.length > 20 ? issue('Heavy visual surface', `${e.images.length} images were detected.`, 'Audit visual hierarchy and compress non-critical images.', 'warning') : null,
    e.wordCount > 1800 ? issue('Dense page copy', `${e.wordCount} words were detected on the page.`, 'Use section breaks, cards, bullets, and summaries to improve scannability.', 'warning') : null,
  ].filter(Boolean) as Issue[]
  categories.push({
    key: 'ui',
    label: 'UI Design',
    score: scoreFromChecks(5 - uiCritical.length - uiWarnings.length, uiWarnings.length, uiCritical.length, e.fetched ? 0 : 2),
    summary: 'Evaluates visible design signals inferable from HTML: assets, density, hierarchy, and styling dependencies.',
    critical: uiCritical,
    warnings: uiWarnings,
    passed: [e.stylesheets > 0 ? issue('CSS assets found', `${e.stylesheets} stylesheet link(s) detected.`, 'Keep design tokens consistent across templates.', 'pass') : null].filter(Boolean) as Issue[],
    recommendations: [
      { priority: 'Medium', action: 'Create a clear above-the-fold hierarchy with one message, one proof point, and one CTA.', impact: 'Faster comprehension.', effort: 'Medium' },
    ],
  })

  const conversionCritical = [
    e.ctas === 0 ? issue('No clear CTA detected', 'No strong action phrase was detected in page copy.', 'Add a primary CTA connected to the business goal.', 'critical') : null,
    e.forms === 0 ? issue('No form detected', 'No lead/contact/order form was detected in the HTML.', 'Provide an obvious conversion mechanism or link to the conversion page.', 'critical') : null,
  ].filter(Boolean) as Issue[]
  const conversionWarnings = [
    !hasTrust ? issue('Social proof not prominent', 'Proof language was not clearly detected.', 'Add testimonials, lab credentials, associations, client logos, or case outcomes.', 'warning') : null,
  ].filter(Boolean) as Issue[]
  categories.push({
    key: 'conversion',
    label: 'Conversion',
    score: scoreFromChecks(5 - conversionCritical.length - conversionWarnings.length, conversionWarnings.length, conversionCritical.length),
    summary: 'Assesses CTA visibility, form path, trust proof, and commercial persuasion flow.',
    critical: conversionCritical,
    warnings: conversionWarnings,
    passed: [e.ctas > 0 ? issue('Action language detected', `${e.ctas} CTA-like phrases were found.`, 'Consolidate around one primary action.', 'pass') : null].filter(Boolean) as Issue[],
    recommendations: [
      { priority: 'High', action: 'Place a primary CTA in the hero, service sections, and footer.', impact: 'Improves lead capture.', effort: 'Low' },
      { priority: 'Medium', action: 'Add objection-handling content near forms.', impact: 'Reduces hesitation.', effort: 'Medium' },
    ],
  })

  const perfCritical = [
    e.responseMs && e.responseMs > 2500 ? issue('Slow server response', `Initial HTML response took ${e.responseMs} ms.`, 'Improve hosting, caching, CDN, and backend response time.', 'critical') : null,
    e.htmlBytes > 900000 ? issue('Large HTML payload', `HTML document is ${(e.htmlBytes / 1024).toFixed(0)} KB.`, 'Reduce inline payload, unused markup, and third-party embeds.', 'critical') : null,
    typeof e.pageSpeed.mobile.scores.performance === 'number' && e.pageSpeed.mobile.scores.performance < 50
      ? issue('Poor mobile Lighthouse performance', `PageSpeed mobile performance is ${e.pageSpeed.mobile.scores.performance}/100. LCP: ${e.pageSpeed.mobile.metrics.largestContentfulPaint || 'n/a'}, FCP: ${e.pageSpeed.mobile.metrics.firstContentfulPaint || 'n/a'}, TBT: ${e.pageSpeed.mobile.metrics.totalBlockingTime || 'n/a'}.`, 'Prioritize LCP element optimization, render-blocking resources, JavaScript reduction, image delivery, and caching.', 'critical')
      : null,
  ].filter(Boolean) as Issue[]
  const perfWarnings = [
    e.scripts > 18 ? issue('High script count', `${e.scripts} script tags were detected.`, 'Remove unused scripts and defer non-critical JavaScript.', 'warning') : null,
    e.images.length > 12 ? issue('Image optimization risk', `${e.images.length} image tags were detected.`, 'Compress, resize, and lazy-load below-the-fold imagery.', 'warning') : null,
    pageSpeedAvailable && typeof e.pageSpeed.desktop.scores.performance === 'number' && e.pageSpeed.desktop.scores.performance < 70
      ? issue('Desktop Lighthouse performance needs work', `PageSpeed desktop performance is ${e.pageSpeed.desktop.scores.performance}/100.`, 'Review PageSpeed opportunities and address the highest savings first.', 'warning')
      : null,
    !pageSpeedAvailable ? issue('PageSpeed Insights unavailable', `${e.pageSpeed.mobile.error || e.pageSpeed.desktop.error || 'The PageSpeed API did not return Lighthouse data.'}`, 'Check the PageSpeed API key/quota and rerun the audit.', 'warning') : null,
  ].filter(Boolean) as Issue[]
  const perfCheckScore = scoreFromChecks(6 - perfCritical.length - perfWarnings.length, perfWarnings.length, perfCritical.length)
  categories.push({
    key: 'performance',
    label: 'Performance',
    score: blendedScore(perfCheckScore, psiPerf, 0.75),
    summary: pageSpeedAvailable
      ? 'Uses live PageSpeed Insights Lighthouse data plus server response, HTML size, script count, and asset signals.'
      : 'Uses server response, HTML size, script count, and asset signals because PageSpeed Insights was unavailable.',
    critical: perfCritical,
    warnings: perfWarnings,
    passed: [e.responseMs && e.responseMs <= 1000 ? issue('Fast HTML response', `Initial response was ${e.responseMs} ms.`, 'Keep monitoring Core Web Vitals with Lighthouse/PageSpeed.', 'pass') : null].filter(Boolean) as Issue[],
    recommendations: [
      { priority: 'High', action: 'Fix the highest-savings PageSpeed opportunities for LCP, render-blocking resources, image delivery, and JavaScript.', impact: 'Better Core Web Vitals, mobile UX, and SEO signals.', effort: 'Medium' },
    ],
  })

  const accessibilityCritical = [
    missingAlt > 0 ? issue('Missing image alternatives', `${missingAlt} images are missing alt text.`, 'Write meaningful alt text for content images.', 'critical') : null,
    !e.lang ? issue('Missing document language', 'The html lang attribute was not detected.', 'Set the correct language on the html tag.', 'critical') : null,
    emptyLinks > 0 ? issue('Non-discernible links', `${emptyLinks} links have no readable text.`, 'Add descriptive anchor text or aria-labels.', 'critical') : null,
  ].filter(Boolean) as Issue[]
  const accessibilityWarnings = [
    headingIssue ? issue('Heading order risk', 'Heading hierarchy may not be sequential.', 'Use headings for structure, not visual styling.', 'warning') : null,
    !e.viewport.includes('width=device-width') ? issue('Viewport may be incomplete', `Viewport content: ${e.viewport || 'none'}.`, 'Use width=device-width and avoid disabling zoom.', 'warning') : null,
  ].filter(Boolean) as Issue[]
  const a11yCheckScore = scoreFromChecks(6 - accessibilityCritical.length - accessibilityWarnings.length, accessibilityWarnings.length, accessibilityCritical.length)
  categories.push({
    key: 'accessibility',
    label: 'Accessibility',
    score: blendedScore(a11yCheckScore, psiA11y, 0.55),
    summary: pageSpeedAvailable
      ? 'Combines live Lighthouse accessibility score with WCAG-oriented basics: alt text, language, links, headings, and responsive viewport.'
      : 'Checks WCAG-oriented basics: alt text, language, links, headings, and responsive viewport.',
    critical: accessibilityCritical,
    warnings: accessibilityWarnings,
    passed: [e.lang ? issue('Language attribute present', `Language is set to "${e.lang}".`, 'Confirm it matches page content.', 'pass') : null].filter(Boolean) as Issue[],
    recommendations: [
      { priority: 'High', action: 'Fix alt text, link names, heading structure, and form labels.', impact: 'Improves WCAG readiness and usability.', effort: 'Medium' },
    ],
  })

  const contentCritical = [
    e.wordCount < 250 ? issue('Thin page content', `${e.wordCount} words detected.`, 'Add enough explanatory content to satisfy search intent and buyer questions.', 'critical') : null,
  ].filter(Boolean) as Issue[]
  const contentWarnings = [
    e.wordCount > 2200 ? issue('Potentially overwhelming copy', `${e.wordCount} words detected.`, 'Break copy into clearer sections and summaries.', 'warning') : null,
    e.headings.length < 3 ? issue('Limited content structure', `${e.headings.length} headings detected.`, 'Add descriptive H2/H3 sections to support scanning and SEO.', 'warning') : null,
  ].filter(Boolean) as Issue[]
  categories.push({
    key: 'content',
    label: 'Content',
    score: scoreFromChecks(6 - contentCritical.length - contentWarnings.length, contentWarnings.length, contentCritical.length),
    summary: 'Evaluates content depth, readability scaffolding, search intent support, and internal structure.',
    critical: contentCritical,
    warnings: contentWarnings,
    passed: [e.wordCount >= 500 ? issue('Substantive copy found', `${e.wordCount} words detected.`, 'Map sections to keyword intent and funnel stage.', 'pass') : null].filter(Boolean) as Issue[],
    recommendations: [
      { priority: 'Medium', action: 'Build topic clusters around service, problem, comparison, and FAQ intents.', impact: 'More organic entry points.', effort: 'Medium' },
    ],
  })

  const securityCritical = [
    !e.hasHttps ? issue('HTTPS not confirmed', 'The final URL is not HTTPS.', 'Force HTTPS and HSTS for all pages.', 'critical') : null,
    securityMissing.includes('content-security-policy') ? issue('Content-Security-Policy missing', 'CSP header was not detected.', 'Add a CSP to reduce XSS and injection risk.', 'critical') : null,
    securityMissing.includes('strict-transport-security') ? issue('HSTS missing', 'Strict-Transport-Security header was not detected.', 'Add HSTS after validating HTTPS coverage.', 'critical') : null,
  ].filter(Boolean) as Issue[]
  const securityWarnings = securityMissing
    .filter((header) => !['content-security-policy', 'strict-transport-security'].includes(header))
    .slice(0, 4)
    .map((header) => issue(`${header} missing`, `${header} was not detected in response headers.`, `Add or validate the ${header} security header.`, 'warning'))
  const securityCheckScore = scoreFromChecks(6 - securityCritical.length - securityWarnings.length, securityWarnings.length, securityCritical.length)
  categories.push({
    key: 'security',
    label: 'Security',
    score: blendedScore(securityCheckScore, psiBestPractices, 0.35),
    summary: pageSpeedAvailable
      ? 'Reviews visible transport security, response headers, and Lighthouse best-practices score.'
      : 'Reviews visible transport security and response headers.',
    critical: securityCritical,
    warnings: securityWarnings,
    passed: [e.hasHttps ? issue('HTTPS active', 'The URL uses HTTPS.', 'Maintain automatic redirects and certificate monitoring.', 'pass') : null].filter(Boolean) as Issue[],
    recommendations: [
      { priority: 'High', action: 'Add HSTS, CSP, X-Content-Type-Options, frame protection, referrer, and permissions policy headers.', impact: 'Improves user trust and security posture.', effort: 'Medium' },
    ],
  })

  const mobileCritical = [
    !e.viewport ? issue('Viewport meta missing', 'No viewport tag was detected.', 'Add a responsive viewport meta tag.', 'critical') : null,
  ].filter(Boolean) as Issue[]
  const mobileWarnings = [
    e.scripts > 18 ? issue('Mobile script burden risk', `${e.scripts} scripts may slow mobile interaction.`, 'Defer non-critical scripts and audit INP/TBT.', 'warning') : null,
    e.forms > 0 && e.ctas === 0 ? issue('Form path needs clearer mobile CTA', 'Forms exist but CTA language is not strong.', 'Add sticky or repeated mobile-friendly CTAs.', 'warning') : null,
  ].filter(Boolean) as Issue[]
  const mobileCheckScore = scoreFromChecks(5 - mobileCritical.length - mobileWarnings.length, mobileWarnings.length, mobileCritical.length)
  categories.push({
    key: 'mobile',
    label: 'Mobile',
    score: blendedScore(mobileCheckScore, e.pageSpeed.mobile.scores.performance, 0.55),
    summary: pageSpeedAvailable
      ? 'Combines mobile Lighthouse performance with responsive viewport, interaction burden, and mobile conversion risk.'
      : 'Checks responsive viewport, interaction burden, and mobile conversion risk.',
    critical: mobileCritical,
    warnings: mobileWarnings,
    passed: [e.viewport ? issue('Responsive viewport found', e.viewport, 'Validate on real mobile breakpoints.', 'pass') : null].filter(Boolean) as Issue[],
    recommendations: [
      { priority: 'Medium', action: 'Test top tasks on mobile: navigation, form submit, contact, and service selection.', impact: 'Improves conversion from mobile traffic.', effort: 'Low' },
    ],
  })

  const benchmarkWarnings = [
    e.schemaCount === 0 ? issue('Structured proof trails lag competitors', 'No JSON-LD schema was detected.', 'Add Organization, Product/Service, FAQ, and Breadcrumb schema.', 'warning') : null,
    !hasTrust ? issue('Trust proof may underperform category leaders', 'Strong proof signals were not detected in crawled text.', 'Add credentials, associations, testimonials, studies, or outcomes.', 'warning') : null,
  ].filter(Boolean) as Issue[]
  const benchmarkCheckScore = scoreFromChecks(4 - benchmarkWarnings.length, benchmarkWarnings.length, 0, e.fetched ? 1 : 0)
  categories.push({
    key: 'benchmark',
    label: 'Benchmark',
    score: blendedScore(benchmarkCheckScore, weightedPsiScore(psiPerf, psiSeo), 0.35),
    summary: 'Benchmarks visible signals against modern category expectations for trust, clarity, SEO, speed, and conversion.',
    critical: [],
    warnings: benchmarkWarnings,
    passed: [e.fetched ? issue('Live page reviewed', 'The audit used live page evidence from the target URL.', 'Add competitor URLs for deeper benchmarking.', 'pass') : null].filter(Boolean) as Issue[],
    recommendations: [
      { priority: 'Medium', action: 'Compare homepage, service pages, proof, and technical SEO against 3 direct competitors.', impact: 'Shows gaps in authority and conversion posture.', effort: 'Medium' },
    ],
  })

  return categories.map((category) => ({ ...category, score: Math.max(0, Math.min(100, category.score)) }))
}

function weightedOverall(categories: Category[]) {
  const weighted = categories.reduce((sum, category) => sum + category.score * (WEIGHTS[category.key] || 0), 0)
  return Math.round(weighted)
}

function topPriorities(categories: Category[]) {
  return categories
    .flatMap((category) => [
      ...category.critical.map((item) => ({ category: category.label, issue: item })),
      ...category.warnings.map((item) => ({ category: category.label, issue: item })),
    ])
    .slice(0, 5)
}

function renderIssueList(items: Issue[], fallback: string) {
  if (!items.length) return `- ${fallback}`
  return items.map((item) => `- **${item.title}**: ${item.detail}\n  Fix: ${item.fix}`).join('\n')
}

function pageSpeedScoreValue(run: PageSpeedRun, key: keyof PageSpeedRun['scores']) {
  const value = run.scores[key]
  return typeof value === 'number' ? `${value}/100` : run.available ? 'Not scored' : 'Unavailable'
}

function pageSpeedMetricValue(run: PageSpeedRun, key: keyof PageSpeedRun['metrics']) {
  return run.metrics[key] || (run.available ? 'Not available' : 'Unavailable')
}

function renderPageSpeedOpportunityList(run: PageSpeedRun) {
  if (!run.available) return `- ${run.error || 'PageSpeed Insights data was unavailable.'}`
  if (!run.opportunities.length) return '- No major PageSpeed opportunity returned for this strategy.'
  return run.opportunities
    .map((item) => `- **${item.title}**${item.displayValue ? `: ${item.displayValue}` : ''}${item.savingsMs ? `; estimated savings ${item.savingsMs} ms` : ''}${item.savingsBytes ? `; estimated bytes ${(item.savingsBytes / 1024).toFixed(0)} KB` : ''}`)
    .join('\n')
}

function truncateUrlForReport(url: string) {
  try {
    const parsed = new URL(url)
    return `${parsed.pathname || '/'}${parsed.search || ''}`.slice(0, 90) || '/'
  } catch {
    return url.slice(0, 90)
  }
}

function pageSeoScore(page: PageEvidence) {
  const missingAlt = page.images.filter((img) => !img.alt).length
  const critical =
    (!page.title ? 1 : 0) +
    (!page.metaDescription ? 1 : 0) +
    (page.h1.length !== 1 ? 1 : 0) +
    (missingAlt > 0 ? 1 : 0) +
    (/noindex/i.test(page.robotsMeta) ? 1 : 0)
  const warnings =
    (!page.canonical ? 1 : 0) +
    (page.openGraphCount < 3 ? 1 : 0) +
    (page.wordCount < 250 ? 1 : 0)
  return scoreFromChecks(8 - critical - warnings, warnings, critical)
}

function pageIssueSummary(page: PageEvidence) {
  const issues: string[] = []
  if (!page.fetched) issues.push('Fetch failed')
  if (!page.title) issues.push('Missing title')
  if (!page.metaDescription) issues.push('Missing meta')
  if (page.h1.length !== 1) issues.push(`${page.h1.length} H1`)
  const missingAlt = page.images.filter((img) => !img.alt).length
  if (missingAlt) issues.push(`${missingAlt} missing alt`)
  if (!page.canonical) issues.push('Missing canonical')
  if (/noindex/i.test(page.robotsMeta)) issues.push('Noindex')
  if (page.wordCount < 250) issues.push('Thin content')
  return issues.length ? issues.join(', ') : 'No major automated issue'
}

function inferKeywordTopics(site: SiteCrawlEvidence, clientProfile: ClientProfileMap) {
  const stop = new Set(['and', 'the', 'for', 'with', 'from', 'your', 'you', 'our', 'are', 'about', 'more', 'home', 'page', 'contact', 'privacy', 'terms'])
  const terms = new Map<string, number>()
  const phraseCandidates: string[] = []
  for (const page of site.pages) {
    const text = [page.title, page.metaDescription, page.h1.join(' '), ...page.headings.slice(0, 8).map((heading) => heading.text)].join(' ')
    for (const phrase of text.match(/\b[A-Za-z][A-Za-z0-9'-]*(?:\s+[A-Za-z][A-Za-z0-9'-]*){1,3}\b/g) || []) {
      const clean = phrase.toLowerCase().replace(/\s+/g, ' ').trim()
      if (clean.length > 8 && !Array.from(stop).some((word) => clean === word)) phraseCandidates.push(clean)
    }
    for (const word of text.toLowerCase().match(/\b[a-z][a-z0-9'-]{3,}\b/g) || []) {
      if (!stop.has(word)) terms.set(word, (terms.get(word) || 0) + 1)
    }
  }
  const brandWords = (clientProfile.brand_name || new URL(site.origin).hostname.replace(/^www\./, '')).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)
  const strategic = Array.from(terms.entries())
    .filter(([word]) => !brandWords.includes(word))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([word, count]) => ({ keyword: word, evidence: `${count} page signal${count === 1 ? '' : 's'}` }))
  const topics = Array.from(new Set(phraseCandidates))
    .filter((phrase) => !brandWords.some((brand) => phrase === brand))
    .slice(0, 10)
  const branded = Array.from(terms.entries())
    .filter(([word]) => brandWords.includes(word))
    .map(([word, count]) => ({ keyword: word, evidence: `${count} page signal${count === 1 ? '' : 's'}` }))
  return { strategic, topics, branded }
}

function sitemapFreshness(site: SiteCrawlEvidence) {
  const dated = site.sitemapUrls
    .map((item) => ({ ...item, time: item.lastmod ? Date.parse(item.lastmod) : NaN }))
    .filter((item) => Number.isFinite(item.time))
    .sort((a, b) => b.time - a.time)
  return dated.slice(0, 5)
}

function buildMetricAvailabilityRows() {
  return [
    ['Search traffic dashboard', 'Needs Analytics/Search Console', 'Not available without connected traffic data.'],
    ['AI visibility', 'Partially available', 'Can inspect schema, crawlability, and content clarity; cannot measure AI mention share externally.'],
    ['Click-through rates', 'Needs Search Console', 'CTR requires impression/click data.'],
    ['Google updates', 'Available as context only', 'Can include known public update context, not site impact without analytics.'],
    ['Traffic acquisition', 'Needs Analytics', 'Channel sessions and conversions require analytics access.'],
    ['Keyword cannibalization', 'Partially available', 'Can flag duplicate titles/H1/topic overlap across crawled pages; rankings need Search Console or SEO provider data.'],
    ['New/lost/growing/declining keywords', 'Needs ranking history', 'Requires Search Console or third-party rank tracker.'],
    ['Backlink overview/monitor', 'Needs backlink index', 'Requires Ahrefs/Semrush/Moz/GSC or similar.'],
    ['Backlink opportunities', 'Available as strategy', 'Can suggest likely sources from niche and content gaps, not verify live backlink data.'],
  ]
}

function buildSiteMetrics(site: SiteCrawlEvidence) {
  const pages = site.pages
  const fetchedPages = pages.filter((page) => page.fetched)
  const missingTitles = fetchedPages.filter((page) => !page.title).length
  const missingMetas = fetchedPages.filter((page) => !page.metaDescription).length
  const h1Issues = fetchedPages.filter((page) => page.h1.length !== 1).length
  const missingAlt = fetchedPages.reduce((sum, page) => sum + page.images.filter((img) => !img.alt).length, 0)
  const totalImages = fetchedPages.reduce((sum, page) => sum + page.images.length, 0)
  const duplicateTitles = fetchedPages.length - new Set(fetchedPages.map((page) => page.title).filter(Boolean)).size
  const duplicateMetas = fetchedPages.length - new Set(fetchedPages.map((page) => page.metaDescription).filter(Boolean)).size
  const canonicalMissing = fetchedPages.filter((page) => !page.canonical).length
  const noindexPages = fetchedPages.filter((page) => /noindex/i.test(page.robotsMeta)).length
  const hreflangPages = fetchedPages.filter((page) => page.hreflangCount > 0).length
  const schemaPages = fetchedPages.filter((page) => page.schemaCount > 0).length
  const ogPages = fetchedPages.filter((page) => page.openGraphCount >= 3).length
  const orphanPages = fetchedPages.filter((page) => page.source === 'sitemap' && !site.inlinkCounts[page.finalUrl]).length
  const brokenLinks = site.linkChecks.filter((link) => link.broken).length
  const redirects = site.linkChecks.filter((link) => link.redirected).length
  const avgWords = fetchedPages.length ? Math.round(fetchedPages.reduce((sum, page) => sum + page.wordCount, 0) / fetchedPages.length) : 0
  return {
    crawledPages: pages.length,
    sitemapUrls: site.sitemapUrls.length,
    discoveredUrls: site.discoveredUrls.length,
    missingTitles,
    missingMetas,
    duplicateTitles: Math.max(0, duplicateTitles),
    duplicateMetas: Math.max(0, duplicateMetas),
    h1Issues,
    missingAlt,
    totalImages,
    canonicalMissing,
    noindexPages,
    hreflangPages,
    schemaPages,
    ogPages,
    orphanPages,
    brokenLinks,
    redirects,
    avgWords,
  }
}

function buildMarkdown(url: string, evidence: PageEvidence, categories: Category[], site?: SiteCrawlEvidence, clientProfile: ClientProfileMap = {}) {
  const overall = weightedOverall(categories)
  const priorities = topPriorities(categories)
  const metrics = site ? buildSiteMetrics(site) : null
  const keywordTopics = site ? inferKeywordTopics(site, clientProfile) : { strategic: [], topics: [], branded: [] }
  const freshContent = site ? sitemapFreshness(site) : []
  return [
    `# Website Audit Report: ${url}`,
    '',
    '## Overall Score',
    `| Score | Label | Basis |`,
    `|---|---|---|`,
    `| ${overall}/100 | ${labelForScore(overall)} | Weighted average across all 10 audit categories |`,
    '',
    '## Category Scores',
    '| Category | Score | Label | Weight |',
    '|---|---:|---|---:|',
    ...categories.map((category) => `| ${category.label} | ${category.score}/100 | ${labelForScore(category.score)} | ${Math.round((WEIGHTS[category.key] || 0) * 100)}% |`),
    '',
    '## PageSpeed Insights',
    '| Strategy | Performance | Accessibility | SEO | Best Practices | FCP | LCP | TBT | CLS | Speed Index |',
    '|---|---:|---:|---:|---:|---|---|---|---|---|',
    ...(['mobile', 'desktop'] as PageSpeedStrategy[]).map((strategy) => {
      const run = evidence.pageSpeed[strategy]
      return `| ${strategy} | ${pageSpeedScoreValue(run, 'performance')} | ${pageSpeedScoreValue(run, 'accessibility')} | ${pageSpeedScoreValue(run, 'seo')} | ${pageSpeedScoreValue(run, 'bestPractices')} | ${pageSpeedMetricValue(run, 'firstContentfulPaint')} | ${pageSpeedMetricValue(run, 'largestContentfulPaint')} | ${pageSpeedMetricValue(run, 'totalBlockingTime')} | ${pageSpeedMetricValue(run, 'cumulativeLayoutShift')} | ${pageSpeedMetricValue(run, 'speedIndex')} |`
    }),
    '',
    '**Mobile PageSpeed Opportunities**',
    renderPageSpeedOpportunityList(evidence.pageSpeed.mobile),
    '',
    '**Desktop PageSpeed Opportunities**',
    renderPageSpeedOpportunityList(evidence.pageSpeed.desktop),
    '',
    site ? '## Multi-Page Crawl Summary' : '',
    site ? '| Metric | Value | Notes |' : '',
    site ? '|---|---:|---|' : '',
    site && metrics ? `| Pages crawled | ${metrics.crawledPages} | Seed URL plus sitemap/internal-link candidates |` : '',
    site && metrics ? `| Sitemap URLs discovered | ${metrics.sitemapUrls} | Used for crawl prioritization and orphan-page approximation |` : '',
    site && metrics ? `| Missing titles / metas | ${metrics.missingTitles} / ${metrics.missingMetas} | On crawled pages only |` : '',
    site && metrics ? `| Duplicate titles / metas | ${metrics.duplicateTitles} / ${metrics.duplicateMetas} | Exact-match duplicate check across crawled pages |` : '',
    site && metrics ? `| H1 issues | ${metrics.h1Issues} | Pages with zero or multiple H1s |` : '',
    site && metrics ? `| Image alt text gaps | ${metrics.missingAlt} / ${metrics.totalImages} | Missing or empty alt attributes |` : '',
    site && metrics ? `| Canonical missing / noindex pages | ${metrics.canonicalMissing} / ${metrics.noindexPages} | Indexation and duplicate-content signals |` : '',
    site && metrics ? `| Structured data / hreflang pages | ${metrics.schemaPages} / ${metrics.hreflangPages} | Pages with JSON-LD or hreflang alternates |` : '',
    site && metrics ? `| Broken internal links / redirects | ${metrics.brokenLinks} / ${metrics.redirects} | Sampled from crawled internal links |` : '',
    site && metrics ? `| Possible orphan pages | ${metrics.orphanPages} | Sitemap pages with no inlinks from the crawled set |` : '',
    site ? '' : '',
    site ? '## Page-by-Page Findings' : '',
    site ? '| Page | Source | Status | Score | Title | Words | Images / Missing Alt | Inlinks | Issues |' : '',
    site ? '|---|---|---:|---:|---|---:|---:|---:|---|' : '',
    ...(site ? site.pages.map((page) => `| ${truncateUrlForReport(page.finalUrl || page.url)} | ${page.source || 'seed'} | ${page.status || 'n/a'} | ${pageSeoScore(page)}/100 | ${page.title || 'Missing'} | ${page.wordCount} | ${page.images.length} / ${page.images.filter((img) => !img.alt).length} | ${site.inlinkCounts[page.finalUrl] || 0} | ${pageIssueSummary(page)} |`) : []),
    site ? '' : '',
    site ? '## Search & Keyword Signals Available Without Analytics' : '',
    site ? '| Area | Evidence | Notes |' : '',
    site ? '|---|---|---|' : '',
    site ? `| Search topics | ${keywordTopics.topics.slice(0, 8).join(', ') || 'Not enough topic signals detected'} | Inferred from titles, descriptions, H1s, and headings. |` : '',
    site ? `| Focus keyword candidates | ${keywordTopics.strategic.slice(0, 10).map((item) => item.keyword).join(', ') || 'Not enough keyword signals detected'} | Frequency-based page signals, not ranking data. |` : '',
    site ? `| Branded keyword signals | ${keywordTopics.branded.map((item) => item.keyword).join(', ') || 'No strong branded term repetition detected'} | Based on crawled page text. |` : '',
    site ? `| New content proxy | ${freshContent.map((item) => `${truncateUrlForReport(item.loc)} (${item.lastmod})`).join('; ') || 'No sitemap lastmod data available'} | Uses sitemap lastmod only, not traffic growth. |` : '',
    site ? '' : '',
    site ? '## Metric Availability Matrix' : '',
    site ? '| Requested Metric | Availability | How this report handles it |' : '',
    site ? '|---|---|---|' : '',
    ...(site ? buildMetricAvailabilityRows().map((row) => `| ${row[0]} | ${row[1]} | ${row[2]} |`) : []),
    site ? '' : '',
    '## Executive Summary',
    evidence.fetched
      ? `The audited site scores ${overall}/100 on the primary URL. The report is based on live HTML, metadata, response headers, robots/sitemap checks, page structure, links, image attributes, forms, CTA language, Google PageSpeed Insights Lighthouse results for the submitted URL, and a bounded crawl of important internal pages where available.`
      : `The target URL could not be fetched successfully, so the report scores visible risk conservatively and flags the crawl limitation in the evidence appendix. Error: ${evidence.fetchError || 'Unknown fetch error'}.`,
    `The strongest areas are ${categories.slice().sort((a, b) => b.score - a.score).slice(0, 2).map((c) => `${c.label} (${c.score})`).join(' and ')}. The highest-risk areas are ${categories.slice().sort((a, b) => a.score - b.score).slice(0, 3).map((c) => `${c.label} (${c.score})`).join(', ')}.`,
    '',
    '## Top Priorities',
    priorities.length
      ? priorities.map((priority, index) => `${index + 1}. **${priority.category}: ${priority.issue.title}**\n   ${priority.issue.detail}\n   Fix: ${priority.issue.fix}`).join('\n')
      : '1. No critical issue was detected by the automated checks. Continue with manual QA, Lighthouse, Search Console, and competitor benchmarking.',
    '',
    '## Category Deep Dives',
    ...categories.flatMap((category) => [
      '',
      `### ${category.label}${category.label === 'SEO' ? ' Analyzer' : category.label === 'Performance' ? ' Analyzer' : category.label === 'Conversion' ? ' Analyzer' : ''} - ${category.score}/100`,
      category.summary,
      '',
      '**AI Insights & Actions**',
      '',
      `**Critical Issues (${category.critical.length})**`,
      renderIssueList(category.critical, 'No critical issue detected by the automated checks.'),
      '',
      `**Warnings (${category.warnings.length})**`,
      renderIssueList(category.warnings, 'No warning detected by the automated checks.'),
      '',
      `**Passed Checks (${category.passed.length})**`,
      renderIssueList(category.passed, 'No pass signal available from the crawl.'),
      '',
      '| Priority | Action | Expected Impact | Effort |',
      '|---|---|---|---|',
      ...category.recommendations.map((rec) => `| ${rec.priority} | ${rec.action} | ${rec.impact} | ${rec.effort} |`),
    ]),
    '',
    '## 30/60/90 Roadmap',
    '| Window | Focus | Actions |',
    '|---|---|---|',
    '| 0-30 days | Critical technical and trust fixes | Fix metadata/H1/canonical/alt text, add missing security headers, clarify primary CTA, publish privacy policy, submit sitemap. |',
    '| 30-60 days | Performance, content, and conversion upgrades | Run Lighthouse, compress images, defer scripts, improve service-page copy, add FAQ/schema, add proof near CTAs. |',
    '| 60-90 days | Authority and benchmark growth | Build topic clusters, add competitor comparison pages, earn relevant backlinks, add Search Console reporting, rerun the audit monthly. |',
    '',
    '## Evidence Appendix',
    '| Evidence | Value |',
    '|---|---|',
    `| Final URL | ${evidence.finalUrl} |`,
    `| HTTP status | ${evidence.status || 'Not available'} |`,
    `| Response time | ${evidence.responseMs ? `${evidence.responseMs} ms` : 'Not available'} |`,
    `| Title | ${evidence.title || 'Missing'} |`,
    `| Meta description | ${evidence.metaDescription || 'Missing'} |`,
    `| Canonical | ${evidence.canonical || 'Missing'} |`,
    `| H1 count | ${evidence.h1.length} |`,
    `| Headings | ${evidence.headings.length} |`,
    `| Images / missing alt | ${evidence.images.length} / ${evidence.images.filter((img) => !img.alt).length} |`,
    `| Links / empty link text | ${evidence.links.length} / ${evidence.links.filter((link) => !link.text).length} |`,
    `| Forms / CTA phrases | ${evidence.forms} / ${evidence.ctas} |`,
    `| Scripts / stylesheets | ${evidence.scripts} / ${evidence.stylesheets} |`,
    `| Schema / Open Graph / Twitter | ${evidence.schemaCount} / ${evidence.openGraphCount} / ${evidence.twitterCount} |`,
    `| robots.txt / sitemap.xml | ${evidence.hasRobotsTxt ? 'Found' : 'Not found'} / ${evidence.hasSitemap ? 'Found' : 'Not found'} |`,
    `| Security headers missing | ${Object.entries(evidence.securityHeaders).filter(([, value]) => !value).map(([key]) => key).join(', ') || 'None detected'} |`,
    `| PageSpeed mobile | ${evidence.pageSpeed.mobile.available ? `Performance ${pageSpeedScoreValue(evidence.pageSpeed.mobile, 'performance')}, LCP ${pageSpeedMetricValue(evidence.pageSpeed.mobile, 'largestContentfulPaint')}` : evidence.pageSpeed.mobile.error || 'Unavailable'} |`,
    `| PageSpeed desktop | ${evidence.pageSpeed.desktop.available ? `Performance ${pageSpeedScoreValue(evidence.pageSpeed.desktop, 'performance')}, LCP ${pageSpeedMetricValue(evidence.pageSpeed.desktop, 'largestContentfulPaint')}` : evidence.pageSpeed.desktop.error || 'Unavailable'} |`,
    '',
    '_Limitations: this audit uses server-side HTML, header evidence, a bounded internal crawl, sampled internal link checks, sitemap/robots probes, and Google PageSpeed Insights Lighthouse data for the submitted URL. It does not replace Search Console, analytics, authenticated crawl data, paid backlink/rank indexes, or manual QA, but it provides a concrete evidence-based starting point._',
  ].join('\n')
}

const SEO_REPORT_STYLES = {
  document: 'font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#172033;background:#f7f9fc;padding:28px;border-radius:8px;line-height:1.55;',
  kicker: 'display:inline-block;border:1px solid #b8d3ff;border-radius:999px;color:#2563eb;background:#eff6ff;padding:6px 14px;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;',
  title: 'font-size:30px;line-height:1.1;margin:18px 0 6px;color:#111827;font-weight:850;letter-spacing:0;',
  muted: 'color:#62708a;margin:0;',
  hero: 'border:1px solid #d9dee8;border-radius:8px;background:#ffffff;padding:24px;margin:24px 0;box-shadow:0 12px 28px rgba(15,23,42,.06);',
  card: 'border:1px solid #d9dee8;border-radius:8px;background:#ffffff;padding:24px;margin:24px 0;box-shadow:0 12px 28px rgba(15,23,42,.06);',
  cardHead: 'display:flex;justify-content:space-between;gap:16px;align-items:center;border-bottom:1px solid #e5e9f0;padding-bottom:14px;margin-bottom:16px;',
  h2: 'font-size:22px;line-height:1.25;margin:0 0 16px;color:#111827;font-weight:850;letter-spacing:0;',
  h2Compact: 'font-size:22px;line-height:1.25;margin:0;color:#111827;font-weight:850;letter-spacing:0;',
  h3: 'margin:22px 0 10px;letter-spacing:.08em;text-transform:uppercase;font-size:13px;color:#475569;font-weight:850;',
  h4: 'font-size:13px;text-transform:uppercase;letter-spacing:.06em;margin:18px 0 8px;color:#475569;font-weight:850;',
  scoreGrid: 'display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;',
  scoreTile: 'border:1px solid #e4e9f1;border-radius:8px;padding:14px;background:#fbfdff;',
  scoreMeta: 'display:flex;justify-content:space-between;gap:12px;margin-bottom:10px;align-items:baseline;',
  bar: 'height:7px;background:#edf0f5;border-radius:999px;overflow:hidden;',
  columns: 'display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px;',
  priorities: 'display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px;',
  priority: 'border:1px solid #e4e9f1;border-radius:8px;padding:16px;background:#fbfdff;',
  priorityIndex: 'display:inline-grid;place-items:center;width:32px;height:32px;border-radius:999px;background:#2563eb;color:#fff;font-size:15px;font-weight:900;margin-right:10px;',
  issue: 'margin:0 0 14px;padding:12px;border-left:3px solid #d7e3f8;background:#f8fbff;border-radius:6px;',
  issueTitle: 'display:block;color:#111827;font-weight:850;margin-bottom:3px;',
  issueText: 'display:block;color:#5e6c84;',
  tableWrap: 'width:100%;overflow-x:auto;border:1px solid #e4e9f1;border-radius:8px;margin-top:14px;',
  table: 'width:100%;border-collapse:collapse;background:#fff;min-width:760px;',
  th: 'border-bottom:1px solid #e6eaf1;text-align:left;padding:10px 12px;vertical-align:top;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#66738a;background:#f8fafc;font-weight:850;white-space:nowrap;',
  td: 'border-bottom:1px solid #eef2f7;text-align:left;padding:11px 12px;vertical-align:top;color:#263244;font-size:14px;',
  metricGrid: 'display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:14px;',
  metric: 'border:1px solid #e4e9f1;border-radius:8px;padding:14px;background:#fbfdff;',
  metricLabel: 'display:block;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:.08em;font-weight:850;',
  metricValue: 'display:block;color:#111827;font-size:28px;line-height:1.15;font-weight:900;margin-top:5px;',
}

function renderHtml(url: string, evidence: PageEvidence, categories: Category[], site?: SiteCrawlEvidence, clientProfile: ClientProfileMap = {}) {
  const overall = weightedOverall(categories)
  const priorities = topPriorities(categories)
  const metrics = site ? buildSiteMetrics(site) : null
  const keywordTopics = site ? inferKeywordTopics(site, clientProfile) : { strategic: [], topics: [], branded: [] }
  const freshContent = site ? sitemapFreshness(site) : []
  const pageSpeedRows = (['mobile', 'desktop'] as PageSpeedStrategy[]).map((strategy) => {
    const run = evidence.pageSpeed[strategy]
    return `
      <tr>
        <td style="${SEO_REPORT_STYLES.td}">${strategy}</td>
        <td style="${SEO_REPORT_STYLES.td}">${escapeHtml(pageSpeedScoreValue(run, 'performance'))}</td>
        <td style="${SEO_REPORT_STYLES.td}">${escapeHtml(pageSpeedScoreValue(run, 'accessibility'))}</td>
        <td style="${SEO_REPORT_STYLES.td}">${escapeHtml(pageSpeedScoreValue(run, 'seo'))}</td>
        <td style="${SEO_REPORT_STYLES.td}">${escapeHtml(pageSpeedScoreValue(run, 'bestPractices'))}</td>
        <td style="${SEO_REPORT_STYLES.td}">${escapeHtml(pageSpeedMetricValue(run, 'firstContentfulPaint'))}</td>
        <td style="${SEO_REPORT_STYLES.td}">${escapeHtml(pageSpeedMetricValue(run, 'largestContentfulPaint'))}</td>
        <td style="${SEO_REPORT_STYLES.td}">${escapeHtml(pageSpeedMetricValue(run, 'totalBlockingTime'))}</td>
        <td style="${SEO_REPORT_STYLES.td}">${escapeHtml(pageSpeedMetricValue(run, 'cumulativeLayoutShift'))}</td>
      </tr>
    `
  }).join('')
  const scoreRows = categories.map((category) => {
    const color = colorForScore(category.score)
    return `
      <div class="seo-score-row" style="${SEO_REPORT_STYLES.scoreTile}">
        <div class="seo-score-meta" style="${SEO_REPORT_STYLES.scoreMeta}">
          <strong style="font-size:14px;color:#172033;">${escapeHtml(category.label)}</strong>
          <span style="color:${color};font-size:24px;font-weight:900;line-height:1;">${category.score}</span>
        </div>
        <div class="seo-bar" style="${SEO_REPORT_STYLES.bar}"><i style="display:block;height:100%;border-radius:999px;width:${category.score}%;background:${color}"></i></div>
      </div>
    `
  }).join('')
  const categoryCards = categories.map((category) => `
    <section class="seo-card" style="${SEO_REPORT_STYLES.card}">
      <div class="seo-card-head" style="${SEO_REPORT_STYLES.cardHead}">
        <h2 style="${SEO_REPORT_STYLES.h2Compact}">${escapeHtml(category.label)}${category.label === 'SEO' || category.label === 'Performance' || category.label === 'Conversion' ? ' Analyzer' : ''}</h2>
        <strong style="color:${colorForScore(category.score)};font-size:24px;white-space:nowrap;">${category.score}/100</strong>
      </div>
      <p style="color:#475569;margin:0 0 10px;">${escapeHtml(category.summary)}</p>
      <h3 style="${SEO_REPORT_STYLES.h3}">AI Insights & Actions</h3>
      <div class="seo-columns" style="${SEO_REPORT_STYLES.columns}">
        <div><h4 style="${SEO_REPORT_STYLES.h4}">Critical Issues (${category.critical.length})</h4>${renderHtmlIssues(category.critical, 'No critical issue detected.')}</div>
        <div><h4 style="${SEO_REPORT_STYLES.h4}">Warnings (${category.warnings.length})</h4>${renderHtmlIssues(category.warnings, 'No warning detected.')}</div>
      </div>
      <h4 style="${SEO_REPORT_STYLES.h4}">Passed Checks (${category.passed.length})</h4>
      ${renderHtmlIssues(category.passed, 'No pass signal available from the crawl.')}
      <div style="${SEO_REPORT_STYLES.tableWrap}"><table style="${SEO_REPORT_STYLES.table}"><thead><tr><th style="${SEO_REPORT_STYLES.th}">Priority</th><th style="${SEO_REPORT_STYLES.th}">Action</th><th style="${SEO_REPORT_STYLES.th}">Impact</th><th style="${SEO_REPORT_STYLES.th}">Effort</th></tr></thead><tbody>
        ${category.recommendations.map((rec) => `<tr><td style="${SEO_REPORT_STYLES.td}">${escapeHtml(rec.priority)}</td><td style="${SEO_REPORT_STYLES.td}">${escapeHtml(rec.action)}</td><td style="${SEO_REPORT_STYLES.td}">${escapeHtml(rec.impact)}</td><td style="${SEO_REPORT_STYLES.td}">${escapeHtml(rec.effort)}</td></tr>`).join('')}
      </tbody></table></div>
    </section>
  `).join('')
  const pageRows = site ? site.pages.map((page) => `
    <tr>
      <td style="${SEO_REPORT_STYLES.td}"><strong>${escapeHtml(truncateUrlForReport(page.finalUrl || page.url))}</strong></td>
      <td style="${SEO_REPORT_STYLES.td}">${escapeHtml(page.source || 'seed')}</td>
      <td style="${SEO_REPORT_STYLES.td}">${page.status || 'n/a'}</td>
      <td style="${SEO_REPORT_STYLES.td}"><strong style="color:${colorForScore(pageSeoScore(page))}">${pageSeoScore(page)}/100</strong></td>
      <td style="${SEO_REPORT_STYLES.td}">${escapeHtml(page.title || 'Missing')}</td>
      <td style="${SEO_REPORT_STYLES.td}">${page.wordCount}</td>
      <td style="${SEO_REPORT_STYLES.td}">${page.images.length} / ${page.images.filter((img) => !img.alt).length}</td>
      <td style="${SEO_REPORT_STYLES.td}">${site.inlinkCounts[page.finalUrl] || 0}</td>
      <td style="${SEO_REPORT_STYLES.td}">${escapeHtml(pageIssueSummary(page))}</td>
    </tr>
  `).join('') : ''
  const metricTiles = metrics ? [
    ['Pages Crawled', metrics.crawledPages],
    ['Sitemap URLs', metrics.sitemapUrls],
    ['Missing Titles', metrics.missingTitles],
    ['Missing Metas', metrics.missingMetas],
    ['H1 Issues', metrics.h1Issues],
    ['Alt Gaps', `${metrics.missingAlt}/${metrics.totalImages}`],
    ['Broken Links', metrics.brokenLinks],
    ['Redirects', metrics.redirects],
  ].map(([label, value]) => `
    <div style="${SEO_REPORT_STYLES.metric}">
      <span style="${SEO_REPORT_STYLES.metricLabel}">${escapeHtml(String(label))}</span>
      <span style="${SEO_REPORT_STYLES.metricValue}">${escapeHtml(String(value))}</span>
    </div>
  `).join('') : ''
  const linkRows = site ? site.linkChecks.slice(0, 12).map((link) => `
    <tr>
      <td style="${SEO_REPORT_STYLES.td}">${escapeHtml(truncateUrlForReport(link.url))}</td>
      <td style="${SEO_REPORT_STYLES.td}">${link.status || 'n/a'}</td>
      <td style="${SEO_REPORT_STYLES.td}">${link.redirected ? 'Redirect' : link.broken ? 'Broken' : 'OK'}</td>
      <td style="${SEO_REPORT_STYLES.td}">${escapeHtml(truncateUrlForReport(link.sourceUrl))}</td>
    </tr>
  `).join('') : ''
  const availabilityRows = buildMetricAvailabilityRows().map((row) => `
    <tr>
      <td style="${SEO_REPORT_STYLES.td}">${escapeHtml(row[0])}</td>
      <td style="${SEO_REPORT_STYLES.td}"><strong>${escapeHtml(row[1])}</strong></td>
      <td style="${SEO_REPORT_STYLES.td}">${escapeHtml(row[2])}</td>
    </tr>
  `).join('')

  return `
    <article class="artifact-document seo-audit-report" style="${SEO_REPORT_STYLES.document}">
      <header>
        <span class="seo-kicker" style="${SEO_REPORT_STYLES.kicker}">Audit Report</span>
        <h1 class="seo-title" style="${SEO_REPORT_STYLES.title}">${escapeHtml(url)}</h1>
        <p class="seo-muted" style="${SEO_REPORT_STYLES.muted}">Generated ${new Date().toLocaleString('en-GB', { timeZone: 'Europe/Madrid', dateStyle: 'medium', timeStyle: 'short' })} Madrid time</p>
      </header>
      <section class="seo-hero seo-overall" style="${SEO_REPORT_STYLES.hero}display:grid;grid-template-columns:minmax(150px,190px) 1fr;gap:22px;align-items:center;">
        <div class="seo-ring" style="width:168px;height:168px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(${colorForScore(overall)} ${overall * 3.6}deg,#edf0f5 0);">
          <div class="seo-ring-inner" style="width:120px;height:120px;border-radius:50%;background:#fff;display:grid;place-items:center;text-align:center;box-shadow:inset 0 0 0 1px #e5e9f0;">
            <div><div class="seo-ring-score" style="font-size:44px;font-weight:900;color:${colorForScore(overall)};line-height:1;">${overall}</div><div class="seo-ring-label" style="font-size:11px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#64748b;margin-top:6px;">Overall</div></div>
          </div>
        </div>
        <div>
          <h2 style="${SEO_REPORT_STYLES.h2Compact}">Website Health: ${labelForScore(overall)}</h2>
          <p class="seo-muted" style="color:#62708a;margin:8px 0 0;">Weighted average across all 10 audit categories. The strongest opportunities are prioritized below with evidence and recommended fixes.</p>
        </div>
      </section>
      <section class="seo-card" style="${SEO_REPORT_STYLES.card}">
        <h2 style="${SEO_REPORT_STYLES.h2}">Category Scores</h2>
        <div style="${SEO_REPORT_STYLES.scoreGrid}">${scoreRows}</div>
      </section>
      ${metrics && site ? `
        <section class="seo-card" style="${SEO_REPORT_STYLES.card}">
          <h2 style="${SEO_REPORT_STYLES.h2}">Multi-Page Crawl</h2>
          <p style="color:#475569;margin:0 0 16px;">Crawled the submitted URL plus prioritized sitemap/internal-link pages. PageSpeed is run on the submitted URL; secondary pages use live HTML and link evidence.</p>
          <div style="${SEO_REPORT_STYLES.metricGrid}">${metricTiles}</div>
        </section>
        <section class="seo-card" style="${SEO_REPORT_STYLES.card}">
          <h2 style="${SEO_REPORT_STYLES.h2}">Page-by-Page Findings</h2>
          <div style="${SEO_REPORT_STYLES.tableWrap}"><table style="${SEO_REPORT_STYLES.table}"><thead><tr><th style="${SEO_REPORT_STYLES.th}">Page</th><th style="${SEO_REPORT_STYLES.th}">Source</th><th style="${SEO_REPORT_STYLES.th}">Status</th><th style="${SEO_REPORT_STYLES.th}">Score</th><th style="${SEO_REPORT_STYLES.th}">Title</th><th style="${SEO_REPORT_STYLES.th}">Words</th><th style="${SEO_REPORT_STYLES.th}">Images / Alt Gaps</th><th style="${SEO_REPORT_STYLES.th}">Inlinks</th><th style="${SEO_REPORT_STYLES.th}">Issues</th></tr></thead><tbody>${pageRows}</tbody></table></div>
        </section>
        <section class="seo-card" style="${SEO_REPORT_STYLES.card}">
          <h2 style="${SEO_REPORT_STYLES.h2}">Search & Keyword Signals</h2>
          <div style="${SEO_REPORT_STYLES.columns}">
            <div>
              <h4 style="${SEO_REPORT_STYLES.h4}">Search Topics</h4>
              <p style="color:#334155;margin:0;">${escapeHtml(keywordTopics.topics.slice(0, 10).join(', ') || 'Not enough topic signals detected.')}</p>
            </div>
            <div>
              <h4 style="${SEO_REPORT_STYLES.h4}">Focus Keyword Candidates</h4>
              <p style="color:#334155;margin:0;">${escapeHtml(keywordTopics.strategic.slice(0, 12).map((item) => item.keyword).join(', ') || 'Not enough keyword signals detected.')}</p>
            </div>
            <div>
              <h4 style="${SEO_REPORT_STYLES.h4}">Branded Signals</h4>
              <p style="color:#334155;margin:0;">${escapeHtml(keywordTopics.branded.map((item) => item.keyword).join(', ') || 'No strong branded term repetition detected.')}</p>
            </div>
            <div>
              <h4 style="${SEO_REPORT_STYLES.h4}">New Content Proxy</h4>
              <p style="color:#334155;margin:0;">${escapeHtml(freshContent.map((item) => `${truncateUrlForReport(item.loc)} (${item.lastmod})`).join('; ') || 'No sitemap lastmod data available.')}</p>
            </div>
          </div>
        </section>
        <section class="seo-card" style="${SEO_REPORT_STYLES.card}">
          <h2 style="${SEO_REPORT_STYLES.h2}">Internal Linking</h2>
          <div style="${SEO_REPORT_STYLES.tableWrap}"><table style="${SEO_REPORT_STYLES.table}"><thead><tr><th style="${SEO_REPORT_STYLES.th}">URL</th><th style="${SEO_REPORT_STYLES.th}">Status</th><th style="${SEO_REPORT_STYLES.th}">Finding</th><th style="${SEO_REPORT_STYLES.th}">Found On</th></tr></thead><tbody>${linkRows || `<tr><td style="${SEO_REPORT_STYLES.td}" colspan="4">No internal links were available for sampling.</td></tr>`}</tbody></table></div>
        </section>
        <section class="seo-card" style="${SEO_REPORT_STYLES.card}">
          <h2 style="${SEO_REPORT_STYLES.h2}">Metric Availability</h2>
          <p style="color:#475569;margin:0 0 16px;">These are the requested metrics separated by what can be measured from public crawl data versus what needs Search Console, Analytics, or backlink/rank providers.</p>
          <div style="${SEO_REPORT_STYLES.tableWrap}"><table style="${SEO_REPORT_STYLES.table}"><thead><tr><th style="${SEO_REPORT_STYLES.th}">Metric</th><th style="${SEO_REPORT_STYLES.th}">Availability</th><th style="${SEO_REPORT_STYLES.th}">Handling</th></tr></thead><tbody>${availabilityRows}</tbody></table></div>
        </section>
      ` : ''}
      <section class="seo-card" style="${SEO_REPORT_STYLES.card}">
        <h2 style="${SEO_REPORT_STYLES.h2}">Executive Summary</h2>
        <p style="color:#334155;margin:0;font-size:15px;">${escapeHtml(evidence.fetched ? `The audited site scores ${overall}/100 on the submitted URL. This report uses live crawl evidence from ${evidence.finalUrl}, metadata, headings, images, links, forms, CTA language, robots/sitemap checks, security headers, PageSpeed Insights for the submitted URL, and page-by-page evidence from a bounded internal crawl.` : `The target URL could not be fetched successfully. ${evidence.fetchError || ''}`)}</p>
      </section>
      <section class="seo-card" style="${SEO_REPORT_STYLES.card}">
        <h2 style="${SEO_REPORT_STYLES.h2}">PageSpeed Insights</h2>
        <div style="${SEO_REPORT_STYLES.tableWrap}"><table style="${SEO_REPORT_STYLES.table}"><thead><tr><th style="${SEO_REPORT_STYLES.th}">Strategy</th><th style="${SEO_REPORT_STYLES.th}">Performance</th><th style="${SEO_REPORT_STYLES.th}">Accessibility</th><th style="${SEO_REPORT_STYLES.th}">SEO</th><th style="${SEO_REPORT_STYLES.th}">Best Practices</th><th style="${SEO_REPORT_STYLES.th}">FCP</th><th style="${SEO_REPORT_STYLES.th}">LCP</th><th style="${SEO_REPORT_STYLES.th}">TBT</th><th style="${SEO_REPORT_STYLES.th}">CLS</th></tr></thead><tbody>${pageSpeedRows}</tbody></table></div>
        <div class="seo-columns" style="${SEO_REPORT_STYLES.columns}">
          <div><h4 style="${SEO_REPORT_STYLES.h4}">Mobile Opportunities</h4>${renderHtmlPageSpeedOpportunities(evidence.pageSpeed.mobile)}</div>
          <div><h4 style="${SEO_REPORT_STYLES.h4}">Desktop Opportunities</h4>${renderHtmlPageSpeedOpportunities(evidence.pageSpeed.desktop)}</div>
        </div>
      </section>
      <section class="seo-card" style="${SEO_REPORT_STYLES.card}">
        <h2 style="${SEO_REPORT_STYLES.h2}">Top Priorities</h2>
        <div class="seo-priorities" style="${SEO_REPORT_STYLES.priorities}">
          ${priorities.map((priority, index) => `<div class="seo-priority" style="${SEO_REPORT_STYLES.priority}"><span style="${SEO_REPORT_STYLES.priorityIndex}">${index + 1}</span><strong style="color:#111827;font-size:15px;">${escapeHtml(priority.category)}: ${escapeHtml(priority.issue.title)}</strong><p style="color:#475569;margin:12px 0 6px;">${escapeHtml(priority.issue.detail)}</p><p style="color:#334155;margin:0;"><strong>Fix:</strong> ${escapeHtml(priority.issue.fix)}</p></div>`).join('')}
        </div>
      </section>
      ${categoryCards}
    </article>
  `
}

function renderHtmlPageSpeedOpportunities(run: PageSpeedRun) {
  if (!run.available) return `<p class="seo-muted" style="${SEO_REPORT_STYLES.muted}">${escapeHtml(run.error || 'PageSpeed Insights data unavailable.')}</p>`
  if (!run.opportunities.length) return `<p class="seo-muted" style="${SEO_REPORT_STYLES.muted}">No major PageSpeed opportunity returned for this strategy.</p>`
  return run.opportunities.map((item) => `
    <p class="seo-issue" style="${SEO_REPORT_STYLES.issue}">
      <strong style="${SEO_REPORT_STYLES.issueTitle}">${escapeHtml(item.title)}</strong>
      <span style="${SEO_REPORT_STYLES.issueText}">${escapeHtml(item.displayValue || 'Opportunity returned by Lighthouse.')}</span>
    </p>
  `).join('')
}

function renderHtmlIssues(items: Issue[], fallback: string) {
  if (!items.length) return `<p class="seo-muted" style="${SEO_REPORT_STYLES.muted}">${escapeHtml(fallback)}</p>`
  return items.map((item) => `
    <p class="seo-issue" style="${SEO_REPORT_STYLES.issue}">
      <strong style="${SEO_REPORT_STYLES.issueTitle}">${escapeHtml(item.title)}</strong>
      <span style="${SEO_REPORT_STYLES.issueText}">${escapeHtml(item.detail)}</span>
      <span style="${SEO_REPORT_STYLES.issueText}"><strong>Fix:</strong> ${escapeHtml(item.fix)}</span>
    </p>
  `).join('')
}

export async function executeSeoAuditTask(input: {
  request: string
  clientProfile?: ClientProfileMap
  hooks?: RuntimeHooks
  agent?: { id: string; name: string; role: string }
  skillsUsed?: string[]
  pipelineName?: string
}) {
  const url = extractWebsiteAuditUrl(input.request, input.clientProfile)
  if (!url) throw new Error('Please send the website URL before starting the website audit.')

  const phase = { id: 'website-audit', name: 'Website Audit' }
  const agent = input.agent || { id: 'atlas', name: 'Atlas', role: 'Research & Insights Lead' }
  const runtime = { provider: 'ollama' as const, model: 'deterministic-audit-engine' }
  const executionSteps: ArtifactExecutionStep[] = []

  await input.hooks?.onPhaseStart?.({ phase, progress: 8 })
  await input.hooks?.onActivityStart?.({
    phase,
    activity: { id: 'collect-website-evidence', name: 'Collect Website Evidence', outputs: ['crawl-evidence'] },
    agent,
    runtime,
    progress: 18,
  })
  const site = await collectSiteEvidence(url)
  const evidence = site.pages[0]
  await input.hooks?.onActivityComplete?.({
    phase,
    activity: { id: 'collect-website-evidence', name: 'Collect Website Evidence', outputs: ['crawl-evidence'] },
    agent,
    runtime,
    summary: evidence.fetched
      ? `Collected live evidence from ${site.pages.length} page(s), ${site.sitemapUrls.length} sitemap URL(s), and ${site.linkChecks.length} sampled internal link(s).`
      : `Could not fetch the target URL: ${evidence.fetchError || 'unknown error'}.`,
    outputIds: ['crawl-evidence'],
    progress: 38,
  })

  await input.hooks?.onActivityStart?.({
    phase,
    activity: { id: 'score-categories', name: 'Score 10 Audit Categories', outputs: ['category-scores'] },
    agent,
    runtime,
    progress: 52,
  })
  const categories = buildCategories(evidence, input.clientProfile || {})
  await input.hooks?.onActivityComplete?.({
    phase,
    activity: { id: 'score-categories', name: 'Score 10 Audit Categories', outputs: ['category-scores'] },
    agent,
    runtime,
    summary: `Scored 10 categories with overall weighted score ${weightedOverall(categories)}/100.`,
    outputIds: ['category-scores'],
    progress: 76,
  })

  await input.hooks?.onActivityStart?.({
    phase,
    activity: { id: 'final-report', name: 'Build Pinpointer-Style Report', outputs: ['audit-report'] },
    agent,
    runtime,
    progress: 88,
  })
  const response = buildMarkdown(url, evidence, categories, site, input.clientProfile || {})
  const renderedHtml = renderHtml(url, evidence, categories, site, input.clientProfile || {})
  await input.hooks?.onActivityComplete?.({
    phase,
    activity: { id: 'final-report', name: 'Build Pinpointer-Style Report', outputs: ['audit-report'] },
    agent,
    runtime,
    summary: 'Generated the final audit report with score dashboard, multi-page crawl summary, page findings, top priorities, category deep dives, and evidence appendix.',
    outputIds: ['audit-report'],
    progress: 95,
  })

  executionSteps.push(
    {
      id: `seo-evidence-${Date.now()}`,
      agentId: agent.id,
      agentName: agent.name,
      role: 'support',
      title: 'Website evidence collection',
      summary: evidence.fetched ? truncate(`Fetched ${site.pages.length} page(s) starting at ${evidence.finalUrl}; sampled ${site.linkChecks.length} internal link(s); primary status ${evidence.status}; title "${evidence.title || 'missing'}".`, 1200) : `Fetch failed: ${evidence.fetchError}`,
      status: evidence.fetched ? 'completed' : 'warning',
      provider: runtime.provider,
      model: runtime.model,
      skillsUsed: input.skillsUsed?.length ? input.skillsUsed : ['seo-audit', 'technical-seo', 'ux-audit'],
    },
    {
      id: `seo-report-${Date.now()}`,
      agentId: agent.id,
      agentName: agent.name,
      role: 'lead',
      title: 'Pinpointer-style final report',
      summary: `Overall score ${weightedOverall(categories)}/100 across ${categories.length} categories.`,
      status: 'completed',
      provider: runtime.provider,
      model: runtime.model,
      skillsUsed: input.skillsUsed?.length ? input.skillsUsed : ['seo-audit', 'performance-analysis', 'accessibility-audit'],
    }
  )

  const qualityResult = validateDeliverableQuality('seo-audit', response, input.request)
  return {
    response,
    renderedHtml,
    executionSteps,
    qualityResult,
    creative: undefined,
  }
}
