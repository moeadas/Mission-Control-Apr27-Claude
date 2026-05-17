import { ArtifactExecutionStep, AIProvider } from '@/lib/types'
import { validateDeliverableQuality } from '@/lib/output-quality'
import { findAgentByTemplate } from '@/lib/server/agent-templates'
import { escapeHtml } from '@/lib/server/text-utils'

type RuntimeAgent = {
  id: string
  name: string
  role: string
}

type ClientProfileMap = Record<string, string>

type CalendarIdea = {
  id: string
  title: string
  pillar: string
  description: string
  primaryPlatform: string
  contentType: string
}

type HookOption = { formula: string; text: string }

type CalendarPost = {
  ideaId: string
  platform: string
  hook: string
  body: string
  cta: string
  characterCount?: number
  hashtags?: {
    primary?: string[]
    niche?: string[]
    trending?: string[]
    seoKeywords?: string[]
  }
}

type CalendarVisual = {
  postId: string
  platform: string
  format: string
  colorPalette?: string[]
  mood?: string
  imageDirection?: string
  copyOverlay?: string
  designNotes?: string
}

type CalendarSchedule = Record<string, string[]>

type SelectedHook = {
  ideaId: string
  ideaTitle: string
  hook: string
  formula: string
  platform: string
  pillar: string
}

type GenerateStage = (input: {
  agentId: string
  prompt: string
  temperature: number
  maxTokens?: number
}) => Promise<{ text: string; provider: AIProvider; model: string }>

type StageRuntime = {
  provider: AIProvider
  model: string
}

type PipelinePhaseRef = { id: string; name: string }
type PipelineActivityRef = { id: string; name: string; outputs?: string[] }
type RuntimeHooks = {
  onPhaseStart?: (input: { phase: PipelinePhaseRef; progress: number }) => Promise<void> | void
  onActivityStart?: (input: {
    phase: PipelinePhaseRef
    activity: PipelineActivityRef
    agent: RuntimeAgent
    runtime: StageRuntime
    progress: number
  }) => Promise<void> | void
  onActivityComplete?: (input: {
    phase: PipelinePhaseRef
    activity: PipelineActivityRef
    agent: RuntimeAgent
    runtime: StageRuntime
    summary: string
    outputIds: string[]
    progress: number
  }) => Promise<void> | void
}

class ContentCalendarGenerationError extends Error {
  stage: string
  cause?: Error

  constructor(stage: string, message: string, cause?: Error) {
    super(`[content-calendar:${stage}] ${message}`)
    this.name = 'ContentCalendarGenerationError'
    this.stage = stage
    this.cause = cause
  }
}


function extractJsonCandidate(raw: string) {
  const cleaned = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
  const firstBrace = cleaned.indexOf('{')
  const lastBrace = cleaned.lastIndexOf('}')

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return cleaned.slice(firstBrace, lastBrace + 1)
  }

  if (firstBrace >= 0 && lastBrace === -1) {
    return `${cleaned.slice(firstBrace)}}`
  }

  return cleaned
}

function sanitizeJsonCandidate(value: string) {
  return value
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
}

function parseJsonObject<T>(raw: string): T {
  const candidate = sanitizeJsonCandidate(extractJsonCandidate(raw))
  return JSON.parse(candidate) as T
}

/**
 * Try hard to extract every complete `{ ... }` object that appears inside a
 * top-level array of a possibly-truncated JSON document. Used as a fallback
 * when full `JSON.parse` fails — it lets us keep, say, 2 valid posts out of
 * a response that ran out of tokens halfway through the third.
 */
function salvageObjectsFromArray(raw: string, arrayKey: string): any[] {
  const cleaned = sanitizeJsonCandidate(extractJsonCandidate(raw))
  const keyMarker = `"${arrayKey}"`
  const keyIndex = cleaned.indexOf(keyMarker)
  if (keyIndex < 0) return []
  const colonIndex = cleaned.indexOf(':', keyIndex + keyMarker.length)
  if (colonIndex < 0) return []
  const arrayStart = cleaned.indexOf('[', colonIndex + 1)
  if (arrayStart < 0) return []

  const objects: any[] = []
  let depth = 0
  let objectStart = -1
  let inString = false
  let escape = false

  for (let i = arrayStart + 1; i < cleaned.length; i += 1) {
    const ch = cleaned[i]

    if (inString) {
      if (escape) escape = false
      else if (ch === '\\') escape = true
      else if (ch === '"') inString = false
      continue
    }

    if (ch === '"') {
      inString = true
      continue
    }

    if (ch === '{') {
      if (depth === 0) objectStart = i
      depth += 1
    } else if (ch === '}') {
      depth -= 1
      if (depth === 0 && objectStart >= 0) {
        const slice = cleaned.slice(objectStart, i + 1)
        try {
          objects.push(JSON.parse(slice))
        } catch {
          // Skip malformed object; keep scanning for the next one.
        }
        objectStart = -1
      }
    } else if (ch === ']' && depth === 0) {
      break
    }
  }

  return objects
}

async function generateJsonStage<T>(input: {
  agentId: string
  prompt: string
  temperature: number
  maxTokens?: number
  generateStage: GenerateStage
  repairHint: string
  stage: string
  /**
   * If provided, on full-JSON-parse failure the parser will try to salvage
   * complete inner objects from a top-level array with this key (e.g. "posts",
   * "hooks", "visuals", "ideas") and return them as `data: { [salvageKey]: [...] }`.
   * This rescues responses where the model ran out of tokens mid-array.
   */
  salvageArrayKey?: string
}) {
  let lastText = ''
  let salvageBest: any[] = []

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const prompt =
      attempt === 0
        ? input.prompt
        : [
            input.prompt,
            '',
            'Your previous response was not valid JSON.',
            input.repairHint,
            'Return JSON only. Do not include markdown fences, explanation, or commentary.',
            'Keep each entry concise so the response fits within the token budget.',
          ].join('\n')

    const result = await input.generateStage({
      agentId: input.agentId,
      prompt,
      temperature: attempt === 0 ? input.temperature : Math.max(0.2, input.temperature - 0.2),
      maxTokens: input.maxTokens,
    })

    lastText = result.text

    try {
      return {
        data: parseJsonObject<T>(result.text),
        provider: result.provider,
        model: result.model,
      }
    } catch {
      // Full parse failed. Try to salvage individual objects from the array
      // when the caller asked for that — better to keep half a chunk than
      // throw the whole response away.
      if (input.salvageArrayKey) {
        const salvaged = salvageObjectsFromArray(result.text, input.salvageArrayKey)
        if (salvaged.length > salvageBest.length) {
          salvageBest = salvaged
        }
      }
      continue
    }
  }

  if (input.salvageArrayKey && salvageBest.length) {
    return {
      data: { [input.salvageArrayKey]: salvageBest } as unknown as T,
      provider: 'ollama' as AIProvider,
      model: 'salvaged-partial',
    }
  }

  throw new ContentCalendarGenerationError(
    input.stage,
    `model returned invalid JSON after 3 attempts. Last response snippet: ${lastText.slice(0, 180)}`
  )
}

function getPostingFrequencySummary(profile: ClientProfileMap) {
  // Defaults are now supplied upstream via buildClientProfileMap +
  // tenant content defaults; engine-level fallback is intentionally generic.
  return profile.posting_frequency || 'TBD — confirm cadence with the client before drafting'
}

function getPlatforms(profile: ClientProfileMap) {
  return (profile.platforms || '')
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function getMonthLabel(profile: ClientProfileMap) {
  return profile.month_label || new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })
}

function inferCalendarTimeframeDays(profile: ClientProfileMap, request: string) {
  const source = `${profile.timeline || ''} ${profile.campaign_duration || ''} ${profile.month_label || ''} ${request}`.toLowerCase()
  const dayMatch = source.match(/(\d+)[-\s]*day/)
  if (dayMatch) return Number(dayMatch[1])
  if (source.includes('week')) return 7
  if (source.includes('month') || source.includes('30 day')) return 30
  return 30
}

function inferRequestedPostCount(profile: ClientProfileMap, request: string) {
  const source = `${profile.posting_frequency || ''} ${request}`.toLowerCase()
  const perPlatformMatch = source.match(/(\d+)\s+posts?\s+per\s+platform/)
  const platforms = Math.max(1, getPlatforms(profile).length)
  if (perPlatformMatch) return Number(perPlatformMatch[1]) * platforms

  const perWeekMatch = source.match(/(\d+)\s*(?:x|times?)\s*(?:per|a)?\s*week|(\d+)\s+posts?\s+per\s+week/)
  const weeklyCount = Number(perWeekMatch?.[1] || perWeekMatch?.[2] || 0)
  if (weeklyCount) {
    const timeframeDays = inferCalendarTimeframeDays(profile, request)
    return Math.max(weeklyCount, Math.round((weeklyCount / 7) * timeframeDays))
  }

  return 12
}

function getIdeaTarget(profile: ClientProfileMap, request: string) {
  const requestedPosts = inferRequestedPostCount(profile, request)
  const timeframeDays = inferCalendarTimeframeDays(profile, request)
  if (timeframeDays <= 7) return Math.max(8, Math.min(12, requestedPosts + 3))
  if (timeframeDays <= 14) return Math.max(12, Math.min(16, requestedPosts + 4))
  return 20
}

function inferBrandName(profile: ClientProfileMap, request: string) {
  if (profile.brand_name?.trim()) return profile.brand_name.trim()

  const match =
    request.match(/\bfor\s+([^.,\n]+?)(?:\s+focused on|\s+about|\s+for the|\s*$)/i) ||
    request.match(/\bcreate\s+(?:a|an)\s+content calendar\s+for\s+([^.,\n]+?)(?:\s+focused on|\s+about|\s*$)/i)

  return match?.[1]?.trim() || 'Client'
}

function getIndustryAnchor(profile: ClientProfileMap) {
  return (
    profile.niche?.trim() ||
    profile.industry?.trim() ||
    profile.product_service?.trim() ||
    'unspecified industry'
  )
}

function buildClientBlock(profile: ClientProfileMap, request: string) {
  const brandName = inferBrandName(profile, request)
  const industry = getIndustryAnchor(profile)
  return [
    `Brand: ${brandName}`,
    `Industry / niche: ${industry}`,
    `Audience demographics: ${profile.audience_demographics || profile.target_audience || 'Not specified'}`,
    `Audience psychographics: ${profile.audience_psychographics || 'Not specified'}`,
    `Pain points: ${profile.pain_points || 'Not specified'}`,
    `Tone: ${profile.tone || profile.brand_voice || 'Professional and warm'}`,
    `Platforms: ${profile.platforms || 'Not specified — confirm with the client'}`,
    `Posting frequency: ${getPostingFrequencySummary(profile)}`,
    `Content goal: ${profile.content_goal || 'Awareness and engagement'}`,
    `Product / service: ${profile.product_service || 'Not specified'}`,
    `Topics to avoid: ${profile.topics_to_avoid || 'None specified'}`,
    `Client request: ${request}`,
    `Month / period: ${getMonthLabel(profile)}`,
    '',
    `IMPORTANT: every idea, hook, post, and visual you produce MUST be specifically about ${brandName}'s ${industry} business. Do not drift to unrelated industries, generic motivational content, or topics outside this brand's category. Every output must be testably grounded in this brand's actual product, audience, and category.`,
  ].join('\n')
}

function buildIdeasPrompt(profile: ClientProfileMap, request: string, pillar?: string) {
  const totalIdeas = getIdeaTarget(profile, request)
  const perPillar = Math.max(2, Math.ceil(totalIdeas / 5))
  const targetPillars = pillar
    ? `Generate exactly ${perPillar} content ideas for the ${pillar} pillar.`
    : `Generate exactly ${totalIdeas} content ideas across 5 pillars with about ${perPillar} ideas per pillar.`

  return [
    'You are Maya, the Strategy Lead, building the strategic backbone for a monthly content calendar.',
    buildClientBlock(profile, request),
    targetPillars,
    'Pillars: Educational, Inspirational, Promotional, Entertaining, Engagement.',
    'Keep every title under 10 words and every description to a single short sentence.',
    'Every idea must be unmistakably tied to the brand industry, audience, and product/service. Never use generic placeholders.',
    'Each idea in your response must be DISTINCT — no two ideas may share the same title or angle, even when phrased differently.',
    'Return compact JSON only with no markdown and no commentary.',
    'Return valid JSON only in this shape (the system assigns ids automatically — do NOT include an id field):',
    '{ "ideas": [{ "title": "Short distinct title", "pillar": "Educational", "description": "1 sentence description specific to the brand", "primaryPlatform": "Instagram", "contentType": "Carousel | Reel | Static Post | Video | Story | Thread" }] }',
  ].join('\n\n')
}

function buildHooksPrompt(profile: ClientProfileMap, request: string, ideas: CalendarIdea[]) {
  return [
    'You are Echo, generating hooks for shortlisted calendar ideas.',
    buildClientBlock(profile, request),
    'For each idea below, generate exactly 4 strong hooks using these formulas where relevant: Question, Statistic, Bold Statement, Story Opening, How-To, Number List, Controversy, Curiosity Gap.',
    'Every hook must be under 20 words, platform-native, and clearly about the brand industry above.',
    'Each idea has a number (1, 2, 3, ...) shown at the start of its line. Refer to each idea by that number in your response — DO NOT invent ids or copy any other label.',
    'Return compact JSON only with no markdown and no commentary.',
    'Return valid JSON only in this shape:',
    '{ "hooks": [{ "ideaNumber": 1, "options": [{ "formula": "Question", "text": "..." }, { "formula": "Statistic", "text": "..." }, { "formula": "Bold Statement", "text": "..." }, { "formula": "Curiosity Gap", "text": "..." }] }] }',
    'Ideas:',
    ideas
      .map((idea, index) => `${index + 1}. [${idea.pillar} | ${idea.primaryPlatform}] ${idea.title} — ${idea.description}`)
      .join('\n'),
  ].join('\n\n')
}

function buildHookSelectionPrompt(
  profile: ClientProfileMap,
  request: string,
  ideas: CalendarIdea[],
  hooks: Record<string, HookOption[]>
) {
  return [
    'You are Echo, choosing the single strongest hook for each selected content idea.',
    buildClientBlock(profile, request),
    'Pick the best hook for each idea based on scroll-stopping power, brand fit, and monthly calendar variety.',
    'Return compact JSON only with no markdown and no commentary.',
    'Return valid JSON only in this shape:',
    '{ "selectedHooks": [{ "ideaId": "idea_01", "hook": "Chosen hook text", "formula": "Question", "platform": "Instagram", "pillar": "Educational", "ideaTitle": "..." }] }',
    ideas
      .map((idea) => {
        const ideaHooks = (hooks[idea.id] || []).map((hook, index) => `${index + 1}. [${hook.formula}] ${hook.text}`).join('\n')
        return [`${idea.id} | ${idea.title} | ${idea.primaryPlatform} | ${idea.pillar}`, ideaHooks].join('\n')
      })
      .join('\n\n'),
  ].join('\n\n')
}

function buildPostsPrompt(
  profile: ClientProfileMap,
  request: string,
  selectedHooks: SelectedHook[]
) {
  return [
    'You are Echo, drafting full social posts for a monthly content calendar.',
    buildClientBlock(profile, request),
    'For each selected hook below, write a ready-to-publish post with CTA and hashtag groups.',
    'Keep each body concise and platform-native. Avoid unnecessary explanation.',
    'The body MUST mention the brand industry/topic and audience. No generic motivational filler.',
    'STRICT length limits: body ≤ 600 characters, cta ≤ 120 characters, each hashtag list ≤ 5 items. Do NOT exceed these — the response is parsed strictly.',
    'Each idea has a number (1, 2, 3, ...) shown at the start of its line. Refer to each post by that number — DO NOT invent ids or copy any other label.',
    'Return compact JSON only with no markdown and no commentary. Close every brace and bracket.',
    'Return valid JSON only in this shape:',
    '{ "posts": [{ "ideaNumber": 1, "platform": "Instagram", "hook": "The hook", "body": "Full post body under 600 chars", "cta": "Call to action", "characterCount": 240, "hashtags": { "primary": ["#tag"], "niche": ["#tag2"], "trending": ["#tag3"], "seoKeywords": ["keyword"] } }] }',
    'Hooks to draft for:',
    selectedHooks
      .map((item, index) => `${index + 1}. [${item.platform} | ${item.pillar}] ${item.ideaTitle} — Hook: "${item.hook}"`)
      .join('\n'),
  ].join('\n\n')
}

function buildIdeaSelectionPrompt(
  profile: ClientProfileMap,
  request: string,
  ideas: CalendarIdea[],
  targetCount: number
) {
  return [
    'You are Maya, selecting the strongest ideas to take forward into production.',
    buildClientBlock(profile, request),
    `From the candidate ideas below, select exactly ${targetCount} ideas that produce the strongest monthly calendar balance across funnel stages, pillars, and platforms.`,
    'Return valid JSON only in this shape:',
    '{ "selectedIds": ["idea_01"], "selectionSummary": "2-3 sentences on why this set is strong." }',
    ideas
      .map((idea) => `${idea.id} | ${idea.pillar} | ${idea.primaryPlatform} | ${idea.contentType} | ${idea.title} | ${idea.description}`)
      .join('\n'),
  ].join('\n\n')
}

function buildCalendarPrompt(profile: ClientProfileMap, request: string, posts: CalendarPost[]) {
  const daysInMonth = inferCalendarTimeframeDays(profile, request)
  return [
    'You are Nova, scheduling a strategic monthly content calendar.',
    buildClientBlock(profile, request),
    `Distribute the posts below across ${daysInMonth} days of ${getMonthLabel(profile)}.`,
    'Space same-platform posts realistically. Avoid heavy clustering. Balance awareness, education, engagement, and conversion.',
    'Return compact JSON only with no markdown and no commentary.',
    'Return valid JSON only in this shape:',
    '{ "calendar": { "1": ["idea_01"], "3": ["idea_02", "idea_03"] }, "calendarSummary": "2-3 sentence scheduling rationale." }',
    posts.map((post) => `${post.ideaId} | ${post.platform} | ${post.hook}`).join('\n'),
  ].join('\n\n')
}

function buildVisualsPrompt(
  profile: ClientProfileMap,
  request: string,
  selectedHooks: SelectedHook[]
) {
  return [
    'You are Lyra, creating visual briefs for each content-calendar post.',
    buildClientBlock(profile, request),
    'Keep each brief compact and rooted in the brand industry above. No generic visual descriptions.',
    'Each post has a number (1, 2, 3, ...) shown at the start of its line. Refer to each visual brief by that number — DO NOT invent ids or copy any other label.',
    'Return compact JSON only with no markdown and no commentary.',
    'Return valid JSON only in this shape:',
    '{ "visuals": [{ "postNumber": 1, "platform": "Instagram", "format": "Carousel", "colorPalette": ["#123456"], "mood": "Bold and optimistic", "imageDirection": "What the visual should show", "copyOverlay": "Overlay line", "designNotes": "Layout and brand notes" }] }',
    'Posts to brief:',
    selectedHooks
      .map((item, index) => `${index + 1}. [${item.platform}] ${item.ideaTitle} — Hook: "${item.hook}"`)
      .join('\n'),
  ].join('\n\n')
}

function chunkItems<T>(items: T[], size: number) {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

/**
 * Resolve a model-supplied label back to an actual idea. The model is asked
 * to use 1-based numeric labels, but if it falls back to ideaId / title /
 * 0-based numbers / partial id strings, we still recover.
 */
function resolveIdeaByLabel<T extends { id: string; title: string }>(
  label: string | number | undefined | null,
  list: T[]
): T | null {
  if (label === undefined || label === null) return null

  // Numeric path — 1-based by default, fall back to 0-based.
  if (typeof label === 'number' || /^\d+$/.test(String(label).trim())) {
    const n = Number(label)
    if (Number.isFinite(n)) {
      if (n >= 1 && n <= list.length) return list[n - 1]
      if (n >= 0 && n < list.length) return list[n]
    }
  }

  const str = String(label).trim()
  if (!str) return null

  // Exact id match
  const byId = list.find((item) => item.id === str)
  if (byId) return byId

  // Substring id match (handles models that truncate the slug part)
  const lowerStr = str.toLowerCase()
  const byPartialId = list.find(
    (item) => item.id.toLowerCase().includes(lowerStr) || lowerStr.includes(item.id.toLowerCase())
  )
  if (byPartialId) return byPartialId

  // Title match (case-insensitive)
  const byTitle = list.find((item) => item.title.toLowerCase().trim() === lowerStr)
  if (byTitle) return byTitle

  return null
}

function uniqueBy<T>(items: T[], getKey: (item: T) => string) {
  const seen = new Set<string>()
  const output: T[] = []
  for (const item of items) {
    const key = getKey(item)
    if (!key || seen.has(key)) continue
    seen.add(key)
    output.push(item)
  }
  return output
}

function normalizeTextValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeArrayOfStrings(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.map((item) => normalizeTextValue(item)).filter(Boolean)
}

function pillarPrefix(pillar: string): string {
  const slug = pillar.toLowerCase().replace(/[^a-z]/g, '').slice(0, 4) || 'idea'
  return slug
}

function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24)
}

/**
 * Build a fresh, unique id for an idea given its pillar and index.
 *
 * We deliberately ignore the id the model returns. Models tend to repeat the
 * literal example id from the prompt across pillars (`idea_01`, `idea_02`, …)
 * which collapses 20 distinct ideas into 4 after dedupe-by-id. Generating the
 * id server-side eliminates that failure mode entirely.
 */
function buildIdeaId(pillar: string, index: number, title: string): string {
  const indexStr = String(index + 1).padStart(2, '0')
  const titleSlug = slugifyTitle(title)
  return titleSlug
    ? `${pillarPrefix(pillar)}-${indexStr}-${titleSlug}`
    : `${pillarPrefix(pillar)}-${indexStr}`
}

function normalizeIdea(raw: any, pillar: string, index: number): CalendarIdea | null {
  const title = normalizeTextValue(raw?.title)
  const description = normalizeTextValue(raw?.description)
  if (!title) return null
  const resolvedPillar = normalizeTextValue(raw?.pillar) || pillar || 'Educational'
  return {
    id: buildIdeaId(resolvedPillar, index, title),
    title,
    pillar: resolvedPillar,
    description,
    primaryPlatform: normalizeTextValue(raw?.primaryPlatform) || 'Instagram',
    contentType: normalizeTextValue(raw?.contentType) || 'Static Post',
  }
}

function normalizeHookOption(raw: any): HookOption | null {
  const formula = normalizeTextValue(raw?.formula || raw?.type || raw?.category)
  const text = normalizeTextValue(raw?.text || raw?.hook || raw?.headline)
  if (!text) return null
  return { formula: formula || 'Question', text }
}

function normalizeCalendarPost(
  raw: any,
  source: SelectedHook
): CalendarPost | null {
  const body = normalizeTextValue(raw?.body || raw?.caption || raw?.post || raw?.content)
  const cta = normalizeTextValue(raw?.cta || raw?.callToAction || raw?.call_to_action)
  const hook = normalizeTextValue(raw?.hook || source.hook)
  const platform = normalizeTextValue(raw?.platform || source.platform)
  const ideaId = normalizeTextValue(raw?.ideaId || raw?.idea_id || source.ideaId)
  if (!body || !ideaId) return null

  const hashtagsRaw = raw?.hashtags || {}
  const hashtagsArray = Array.isArray(hashtagsRaw) ? normalizeArrayOfStrings(hashtagsRaw) : []
  const hashtagsObject =
    hashtagsArray.length || typeof hashtagsRaw !== 'object' || hashtagsRaw === null
      ? {
          primary: hashtagsArray.slice(0, 2),
          niche: hashtagsArray.slice(2, 5),
          trending: [],
          seoKeywords: [],
        }
      : {
          primary: normalizeArrayOfStrings(hashtagsRaw.primary),
          niche: normalizeArrayOfStrings(hashtagsRaw.niche),
          trending: normalizeArrayOfStrings(hashtagsRaw.trending),
          seoKeywords: normalizeArrayOfStrings(hashtagsRaw.seoKeywords || hashtagsRaw.seo_keywords),
        }

  return {
    ideaId,
    platform: platform || source.platform,
    hook: hook || source.hook,
    body,
    cta,
    characterCount: Number(raw?.characterCount || raw?.character_count || body.length) || body.length,
    hashtags: hashtagsObject,
  }
}

function normalizeVisual(raw: any, sourceChunk: SelectedHook[]): CalendarVisual | null {
  // Resolve which post this visual belongs to. Prefer the numeric postNumber
  // we asked for; fall back to legacy postId / ideaTitle matching.
  const numeric = raw?.postNumber ?? raw?.post_number ?? raw?.ideaNumber ?? raw?.idea_number
  let postId = ''
  if (numeric !== undefined && numeric !== null) {
    const n = Number(numeric)
    if (Number.isFinite(n)) {
      if (n >= 1 && n <= sourceChunk.length) postId = sourceChunk[n - 1].ideaId
      else if (n >= 0 && n < sourceChunk.length) postId = sourceChunk[n].ideaId
    }
  }
  if (!postId) {
    const explicit = normalizeTextValue(raw?.postId || raw?.post_id || raw?.ideaId || raw?.idea_id)
    if (explicit) {
      const exact = sourceChunk.find((item) => item.ideaId === explicit)
      if (exact) postId = exact.ideaId
      else {
        const lower = explicit.toLowerCase()
        const partial = sourceChunk.find(
          (item) => item.ideaId.toLowerCase().includes(lower) || lower.includes(item.ideaId.toLowerCase())
        )
        if (partial) postId = partial.ideaId
      }
    }
  }
  if (!postId) {
    const title = normalizeTextValue(raw?.ideaTitle || raw?.idea_title || raw?.title)
    if (title) {
      const byTitle = sourceChunk.find((item) => item.ideaTitle.toLowerCase() === title.toLowerCase())
      if (byTitle) postId = byTitle.ideaId
    }
  }

  if (!postId) return null

  return {
    postId,
    platform: normalizeTextValue(raw?.platform) || 'Instagram',
    format: normalizeTextValue(raw?.format) || 'Static Post',
    colorPalette: normalizeArrayOfStrings(raw?.colorPalette || raw?.color_palette),
    mood: normalizeTextValue(raw?.mood),
    imageDirection: normalizeTextValue(raw?.imageDirection || raw?.image_direction),
    copyOverlay: normalizeTextValue(raw?.copyOverlay || raw?.copy_overlay),
    designNotes: normalizeTextValue(raw?.designNotes || raw?.design_notes),
  }
}

function resolvePostIdeaId(raw: any, sourceChunk: SelectedHook[]) {
  // The new prompt asks for `ideaNumber` (1-based). Resolve that first.
  const ideaNumber = raw?.ideaNumber ?? raw?.idea_number
  if (ideaNumber !== undefined && ideaNumber !== null) {
    const n = Number(ideaNumber)
    if (Number.isFinite(n)) {
      if (n >= 1 && n <= sourceChunk.length) return sourceChunk[n - 1].ideaId
      if (n >= 0 && n < sourceChunk.length) return sourceChunk[n].ideaId
    }
  }

  // Legacy ideaId path — keep for backwards compatibility.
  const explicitId = normalizeTextValue(raw?.ideaId || raw?.idea_id)
  if (explicitId) {
    const exact = sourceChunk.find((item) => item.ideaId === explicitId)
    if (exact) return exact.ideaId
    const lowerStr = explicitId.toLowerCase()
    const partial = sourceChunk.find(
      (item) => item.ideaId.toLowerCase().includes(lowerStr) || lowerStr.includes(item.ideaId.toLowerCase())
    )
    if (partial) return partial.ideaId
  }

  const title = normalizeTextValue(raw?.ideaTitle || raw?.idea_title || raw?.title)
  if (title) {
    const byTitle = sourceChunk.find((item) => item.ideaTitle.toLowerCase() === title.toLowerCase())
    if (byTitle) return byTitle.ideaId
  }

  const hook = normalizeTextValue(raw?.hook)
  if (hook) {
    const byHook = sourceChunk.find((item) => item.hook.toLowerCase() === hook.toLowerCase())
    if (byHook) return byHook.ideaId
  }

  return ''
}

function pickBalancedIdeas(ideas: CalendarIdea[], targetCount: number) {
  const byPillar = new Map<string, CalendarIdea[]>()

  for (const idea of ideas) {
    const pillar = idea.pillar || 'General'
    const list = byPillar.get(pillar) || []
    list.push(idea)
    byPillar.set(pillar, list)
  }

  const selected: CalendarIdea[] = []
  const pillars = Array.from(byPillar.keys())

  while (selected.length < targetCount && pillars.some((pillar) => (byPillar.get(pillar) || []).length)) {
    for (const pillar of pillars) {
      const queue = byPillar.get(pillar) || []
      const next = queue.shift()
      if (next) selected.push(next)
      if (selected.length >= targetCount) break
    }
  }

  return selected.slice(0, targetCount)
}

function distributePostsAcrossDays(posts: CalendarPost[], monthLength: number): CalendarSchedule {
  const calendar: CalendarSchedule = {}
  if (!posts.length) return calendar

  const span = Math.max(1, monthLength)
  const stride = Math.max(1, Math.floor(span / Math.max(1, posts.length)))
  let cursor = 1

  for (const post of posts) {
    const day = Math.min(span, cursor)
    const key = String(day)
    calendar[key] = [...(calendar[key] || []), post.ideaId]
    cursor += stride
    if (cursor > span) cursor = span
  }

  return calendar
}

function formatHashtags(post: CalendarPost) {
  const groups = post.hashtags || {}
  return [...(groups.primary || []), ...(groups.niche || []), ...(groups.trending || [])].filter(Boolean).join(' ')
}

function buildCalendarMarkdown(input: {
  request: string
  profile: ClientProfileMap
  ideas: CalendarIdea[]
  selectedIdeas: CalendarIdea[]
  selectedHooks: SelectedHook[]
  posts: CalendarPost[]
  calendar: CalendarSchedule
  calendarSummary?: string
  visuals: CalendarVisual[]
  selectionSummary?: string
}) {
  const selectedIdeaMap = Object.fromEntries(input.selectedIdeas.map((idea) => [idea.id, idea]))
  const postMap = Object.fromEntries(input.posts.map((post) => [post.ideaId, post]))
  const visualMap = Object.fromEntries(input.visuals.map((visual) => [visual.postId, visual]))
  const days = Object.keys(input.calendar).map(Number).sort((a, b) => a - b)

  const calendarRows = days.flatMap((day) =>
    (input.calendar[String(day)] || []).map((postId) => {
      const idea = selectedIdeaMap[postId]
      const post = postMap[postId]
      return `| Day ${day} | ${post?.platform || idea?.primaryPlatform || 'Platform TBD'} | ${idea?.pillar || 'Pillar TBD'} | ${idea?.title || postId} | ${post?.hook || 'Hook TBD'} |`
    })
  )

  const detailedEntries = input.selectedIdeas
    .map((idea) => {
      const post = postMap[idea.id]
      const visual = visualMap[idea.id]
      if (!post) return ''
      return [
        `### ${idea.title}`,
        `- Platform: ${post.platform}`,
        `- Pillar: ${idea.pillar}`,
        `- Hook: ${post.hook}`,
        `- CTA: ${post.cta}`,
        `- Hashtags: ${formatHashtags(post) || 'None specified'}`,
        visual?.mood ? `- Visual Mood: ${visual.mood}` : '',
        visual?.format ? `- Visual Format: ${visual.format}` : '',
        '',
        post.body,
      ]
        .filter(Boolean)
        .join('\n')
    })
    .filter(Boolean)
    .join('\n\n')

  return [
    `# ${inferBrandName(input.profile, input.request)} Content Calendar`,
    '## Strategy Summary',
    `Built from the request: ${input.request}`,
    `Primary goal: ${input.profile.content_goal || 'Awareness and engagement'}.`,
    input.selectionSummary || 'The calendar balances educational, inspirational, promotional, entertaining, and engagement content across the month.',
    input.calendarSummary || 'Posts are spaced to avoid fatigue while keeping the brand visible across the month.',
    '',
    '## Content Pillars',
    '| Pillar | Purpose |',
    '| --- | --- |',
    '| Educational | Teach valuable ideas and build trust. |',
    '| Inspirational | Build aspiration, emotion, and momentum. |',
    '| Promotional | Connect offers and value to buyer intent. |',
    '| Entertaining | Keep the calendar human, social, and memorable. |',
    '| Engagement | Invite replies, comments, saves, and shares. |',
    '',
    '## Calendar',
    '| Day | Platform | Pillar | Post Idea | Hook |',
    '| --- | --- | --- | --- | --- |',
    ...calendarRows,
    '',
    '## Post Details',
    detailedEntries || 'No detailed posts generated.',
  ].join('\n')
}

function buildCalendarHtml(input: {
  title: string
  monthLabel: string
  profile: ClientProfileMap
  calendar: CalendarSchedule
  ideas: CalendarIdea[]
  posts: CalendarPost[]
  visuals: CalendarVisual[]
}) {
  const brandName = input.profile.brand_name || 'Client'
  const ideaMap = Object.fromEntries(input.ideas.map((idea) => [idea.id, idea]))
  const postMap = Object.fromEntries(input.posts.map((post) => [post.ideaId, post]))
  const visualMap = Object.fromEntries(input.visuals.map((visual) => [visual.postId, visual]))
  const days = Object.keys(input.calendar).map(Number).sort((a, b) => a - b)
  const totalEntries = days.reduce((sum, day) => sum + (input.calendar[String(day)] || []).length, 0)
  const platforms = Array.from(new Set(input.posts.map((post) => post.platform).filter(Boolean)))
  const pillarPalette: Record<string, string> = {
    educational: '#4f8ef7',
    inspirational: '#8b6af7',
    promotional: '#ff8a6a',
    entertaining: '#00d4aa',
    engagement: '#f5b700',
  }

  return `
    <article class="artifact-document artifact-calendar" style="background:linear-gradient(180deg,#f7f5ff 0%,#fbfbfe 40%,#ffffff 100%);border-radius:32px;padding:28px 28px 36px;border:1px solid rgba(126,136,168,0.18);box-shadow:0 24px 48px rgba(25,30,52,0.08);">
      <header style="display:grid;grid-template-columns:1.8fr 1fr;gap:18px;align-items:stretch;margin-bottom:24px;">
        <section style="padding:24px;border-radius:26px;background:linear-gradient(135deg,#151b2f 0%,#2b355f 58%,#4f8ef7 120%);color:white;box-shadow:0 18px 36px rgba(24,34,63,0.18);">
          <div style="display:inline-flex;align-items:center;gap:8px;padding:7px 12px;border-radius:999px;background:rgba(255,255,255,0.14);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;letter-spacing:.18em;text-transform:uppercase;">Mission Control Calendar</div>
          <h1 style="margin:18px 0 10px;font-size:34px;line-height:1.05;font-weight:800;">${escapeHtml(input.title)}</h1>
          <p style="margin:0;font-size:15px;line-height:1.7;color:rgba(255,255,255,0.78);">${escapeHtml(brandName)} · ${escapeHtml(input.monthLabel)} · ${escapeHtml(platforms.join(' + ') || 'Mixed channels')}</p>
          <p style="margin:16px 0 0;font-size:14px;line-height:1.75;color:rgba(255,255,255,0.82);">A fully automated multi-agent calendar with shortlisted ideas, selected hooks, drafted posts, scheduled publishing dates, and visual briefs.</p>
        </section>
        <section style="display:grid;gap:14px;">
          <div style="padding:18px;border-radius:22px;background:white;border:1px solid rgba(126,136,168,0.18);box-shadow:0 12px 26px rgba(24,34,63,0.06);">
            <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#6a7390;">Calendar Snapshot</div>
            <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:14px;">
              <div><div style="font-size:28px;font-weight:800;color:#151b2f;">${totalEntries}</div><div style="font-size:12px;color:#69738a;">scheduled entries</div></div>
              <div><div style="font-size:28px;font-weight:800;color:#151b2f;">${platforms.length || 1}</div><div style="font-size:12px;color:#69738a;">active channels</div></div>
              <div><div style="font-size:28px;font-weight:800;color:#151b2f;">${input.visuals.length}</div><div style="font-size:12px;color:#69738a;">visual briefs</div></div>
              <div><div style="font-size:28px;font-weight:800;color:#151b2f;">${days.length}</div><div style="font-size:12px;color:#69738a;">calendar days used</div></div>
            </div>
          </div>
          <div style="padding:18px;border-radius:22px;background:linear-gradient(180deg,#ffffff 0%,#f7f8fc 100%);border:1px solid rgba(126,136,168,0.18);">
            <div style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#6a7390;">Content Focus</div>
            <p style="margin:12px 0 0;font-size:14px;line-height:1.7;color:#394154;">Goal: ${escapeHtml(input.profile.content_goal || 'Awareness')}</p>
            <p style="margin:8px 0 0;font-size:14px;line-height:1.7;color:#394154;">Industry: ${escapeHtml(getIndustryAnchor(input.profile))}</p>
          </div>
        </section>
      </header>

      <section style="margin-bottom:22px;padding:18px;border-radius:24px;background:rgba(255,255,255,0.88);border:1px solid rgba(126,136,168,0.16);">
        <div style="display:flex;flex-wrap:wrap;gap:10px;">
          ${Array.from(new Set(input.ideas.map((idea) => idea.pillar))).map((pillar) => {
            const accent = pillarPalette[pillar.toLowerCase()] || '#4f8ef7'
            return `<span style="display:inline-flex;align-items:center;gap:8px;padding:10px 14px;border-radius:999px;background:${accent}12;border:1px solid ${accent}2f;color:${accent};font-size:12px;font-weight:700;">${escapeHtml(pillar)}</span>`
          }).join('')}
        </div>
      </section>

      <section class="artifact-section" style="margin-bottom:20px;">
        <h2 class="artifact-section-head">Calendar Grid</h2>
        <div class="artifact-section-body">
          <div class="artifact-grid" style="grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
            ${days
              .map((day) => {
                const postIds = input.calendar[String(day)] || []
                return `
                  <section class="artifact-section" style="margin:0;border-radius:22px;background:white;border:1px solid rgba(126,136,168,0.14);box-shadow:0 10px 22px rgba(24,34,63,0.05);">
                    <h3 class="artifact-subheading" style="display:flex;align-items:center;justify-content:space-between;">
                      <span>Day ${day}</span>
                      <span style="font-size:11px;font-weight:700;color:#6a7390;">${postIds.length} post${postIds.length === 1 ? '' : 's'}</span>
                    </h3>
                    ${postIds
                      .map((postId) => {
                        const idea = ideaMap[postId]
                        const post = postMap[postId]
                        const pillar = (idea?.pillar || '').toLowerCase()
                        const accent = pillarPalette[pillar] || '#4f8ef7'
                        return `
                          <div class="artifact-slide" style="margin-bottom:10px;border-radius:18px;background:linear-gradient(180deg,#ffffff 0%,#f8faff 100%);border:1px solid ${accent}22;">
                            <div class="artifact-slide-label" style="color:${accent};">${escapeHtml(post?.platform || idea?.primaryPlatform || 'Platform')}</div>
                            <div class="artifact-slide-copy">
                              <strong>${escapeHtml(idea?.title || postId)}</strong><br/>
                              ${escapeHtml(post?.hook || '')}
                            </div>
                          </div>
                        `
                      })
                      .join('')}
                  </section>
                `
              })
              .join('')}
          </div>
        </div>
      </section>

      <section class="artifact-section">
        <h2 class="artifact-section-head">Post Library</h2>
        <div class="artifact-section-body">
          ${input.posts
            .map((post) => {
              const idea = ideaMap[post.ideaId]
              const visual = visualMap[post.ideaId]
              const pillar = (idea?.pillar || '').toLowerCase()
              const accent = pillarPalette[pillar] || '#4f8ef7'
              return `
                <section class="artifact-section" style="margin-bottom:16px;border-radius:24px;background:white;border:1px solid rgba(126,136,168,0.16);box-shadow:0 10px 22px rgba(24,34,63,0.05);">
                  <h3 class="artifact-subheading" style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
                    <span>${escapeHtml(idea?.title || post.ideaId)}</span>
                    <span style="display:inline-flex;align-items:center;padding:8px 10px;border-radius:999px;background:${accent}12;color:${accent};font-size:11px;font-weight:700;">${escapeHtml(idea?.pillar || 'Content')}</span>
                  </h3>
                  <p class="artifact-paragraph"><strong>Platform:</strong> ${escapeHtml(post.platform)} · <strong>Character count:</strong> ${escapeHtml(String(post.characterCount || post.body.length))}</p>
                  <p class="artifact-paragraph"><strong>Hook:</strong> ${escapeHtml(post.hook)}</p>
                  <p class="artifact-paragraph">${escapeHtml(post.body)}</p>
                  <p class="artifact-paragraph"><strong>CTA:</strong> ${escapeHtml(post.cta)}</p>
                  <p class="artifact-paragraph"><strong>Hashtags:</strong> ${escapeHtml(formatHashtags(post) || 'None specified')}</p>
                  ${
                    visual
                      ? `<p class="artifact-paragraph"><strong>Visual Brief:</strong> ${escapeHtml(
                          `${visual.format || 'Post'} · ${visual.mood || 'Mood TBD'} · ${visual.imageDirection || visual.designNotes || ''}`
                        )}</p>`
                      : ''
                  }
                </section>
              `
            })
            .join('')}
        </div>
      </section>
    </article>
  `
}

function createStep(input: {
  id: string
  agent: RuntimeAgent
  role: 'support' | 'lead' | 'quality'
  title: string
  summary: string
  provider: AIProvider
  model: string
  skillsUsed?: string[]
  status?: 'completed' | 'warning' | 'failed'
}): ArtifactExecutionStep {
  return {
    id: input.id,
    agentId: input.agent.id,
    agentName: input.agent.name,
    role: input.role,
    title: input.title,
    summary: input.summary,
    provider: input.provider,
    model: input.model,
    skillsUsed: input.skillsUsed || [],
    status: input.status || 'completed',
  }
}

export async function executeAutomatedContentCalendar(input: {
  request: string
  clientProfile: ClientProfileMap
  agentsById: Map<string, RuntimeAgent>
  selectedSkillsByAgent?: Record<string, string[]>
  generateStage: GenerateStage
  maxTokens?: number
  hooks?: RuntimeHooks
}) {
  const executionSteps: ArtifactExecutionStep[] = []
  // Template-aware lookup so this engine works for both legacy single-tenant
  // rows (id='maya') and new tenant clones (id='maya-<suffix>').
  const byTemplate = (templateId: string) =>
    findAgentByTemplate(input.agentsById.values(), templateId)

  const maya = byTemplate('maya') || byTemplate('iris')
  const echo = byTemplate('echo') || byTemplate('iris')
  const nova = byTemplate('nova') || echo || maya
  const lyra = byTemplate('lyra') || echo || maya
  const iris = byTemplate('iris') || maya || echo || nova || lyra

  if (!maya || !echo || !nova || !lyra || !iris) {
    throw new Error('Required specialist agents are not available for content-calendar automation.')
  }

  const phaseRefs: Record<string, PipelinePhaseRef> = {
    intake: { id: 'intake', name: 'Client Profile' },
    ideas: { id: 'ideas', name: 'Content Ideas' },
    hooks: { id: 'hooks', name: 'Hook Generation' },
    drafting: { id: 'drafting', name: 'Post Drafting' },
    assembly: { id: 'assembly', name: 'Calendar Assembly' },
    visuals: { id: 'visuals', name: 'Visual Briefs' },
    quality: { id: 'quality', name: 'Quality Review' },
  }

  const activityRefs: Record<string, PipelineActivityRef> = {
    collectProfile: { id: 'collect-profile', name: 'Collect Client Profile', outputs: ['approved-profile'] },
    generateIdeas: { id: 'generate-ideas', name: 'Generate Content Ideas', outputs: ['content-ideas'] },
    selectIdeas: { id: 'select-ideas', name: 'Select Ideas to Proceed', outputs: ['selected-ideas'] },
    generateHooks: { id: 'generate-hooks', name: 'Generate Hooks per Idea', outputs: ['hooks'] },
    draftPosts: { id: 'draft-posts', name: 'Draft Full Posts', outputs: ['drafted-posts'] },
    assembleCalendar: { id: 'assemble-calendar', name: 'Assemble Calendar', outputs: ['calendar'] },
    createVisuals: { id: 'create-visual-briefs', name: 'Create Visual Briefs', outputs: ['visual-briefs'] },
    qualityReview: { id: 'quality-review', name: 'Quality Review', outputs: ['final-calendar'] },
  }

  const startPhase = async (phase: PipelinePhaseRef, progress: number) => {
    await input.hooks?.onPhaseStart?.({ phase, progress })
  }

  const startActivity = async (
    phase: PipelinePhaseRef,
    activity: PipelineActivityRef,
    agent: RuntimeAgent,
    runtime: StageRuntime,
    progress: number
  ) => {
    await input.hooks?.onActivityStart?.({ phase, activity, agent, runtime, progress })
  }

  const completeActivity = async (
    phase: PipelinePhaseRef,
    activity: PipelineActivityRef,
    agent: RuntimeAgent,
    runtime: StageRuntime,
    summary: string,
    progress: number
  ) => {
    await input.hooks?.onActivityComplete?.({
      phase,
      activity,
      agent,
      runtime,
      summary,
      outputIds: activity.outputs || [],
      progress,
    })
  }

  // ─── Phase 1: intake ─────────────────────────────────────────────────────
  await startPhase(phaseRefs.intake, 5)
  await startActivity(
    phaseRefs.intake,
    activityRefs.collectProfile,
    maya,
    { provider: 'ollama', model: 'profile-normalizer' },
    8
  )
  await completeActivity(
    phaseRefs.intake,
    activityRefs.collectProfile,
    maya,
    { provider: 'ollama', model: 'profile-normalizer' },
    'Client profile normalized for the content calendar workflow.',
    10
  )

  // ─── Phase 2: ideas (AI-only) ────────────────────────────────────────────
  await startPhase(phaseRefs.ideas, 12)
  let ideasRuntime: StageRuntime = { provider: 'ollama', model: 'pending' }
  await startActivity(
    phaseRefs.ideas,
    activityRefs.generateIdeas,
    maya,
    { provider: 'ollama', model: 'pending' },
    14
  )

  const pillarSequence = ['Educational', 'Inspirational', 'Promotional', 'Entertaining', 'Engagement']
  const totalIdeaTarget = getIdeaTarget(input.clientProfile, input.request)
  const perPillarTarget = Math.max(2, Math.ceil(totalIdeaTarget / 5))
  // Accept a pillar if it returns at least this many ideas; otherwise we
  // re-ask the model for that specific pillar with a tighter prompt.
  const perPillarMinimum = Math.max(1, Math.ceil(perPillarTarget / 2))
  const ideasByPillar = new Map<string, CalendarIdea[]>()

  /**
   * Ask the model for ideas in one pillar. Used both for the first pass and
   * the per-pillar repair pass, with progressively stricter language.
   *
   * `existingCount` lets us seed the index numbering of any retry so freshly
   * generated ids (`<pillar>-NN-<slug>`) don't collide with previously-kept
   * ideas in the same pillar.
   */
  const requestPillarIdeas = async (pillar: string, attempt: number, existingCount: number) => {
    const tighter =
      attempt === 0
        ? buildIdeasPrompt(input.clientProfile, input.request, pillar)
        : [
            buildIdeasPrompt(input.clientProfile, input.request, pillar),
            '',
            `IMPORTANT: your previous attempt returned too few ideas. You MUST return ${perPillarTarget} ideas in this response.`,
            `Each idea must be a distinct angle on the brand's actual product/service. If you are running out of angles, vary the format (carousel vs. reel vs. static), the funnel stage (top vs. middle vs. bottom of funnel), or the audience segment.`,
            `Do not return fewer than ${perPillarTarget} ideas under any circumstances.`,
          ].join('\n')
    const result = await generateJsonStage<{ ideas: any[] }>({
      agentId: maya.id,
      prompt: tighter,
      temperature: attempt === 0 ? 0.55 : 0.7,
      maxTokens: input.maxTokens,
      generateStage: input.generateStage,
      stage: `ideas:${pillar.toLowerCase()}${attempt > 0 ? `:retry${attempt}` : ''}`,
      repairHint: `Return exactly ${perPillarTarget} ${pillar} ideas in a top-level "ideas" array. Each idea needs title, description, primaryPlatform, and contentType — the system will assign ids automatically.`,
      salvageArrayKey: 'ideas',
    })
    const normalized = (result.data.ideas || [])
      .map((raw, index) => normalizeIdea(raw, pillar, existingCount + index))
      .filter(Boolean) as CalendarIdea[]
    ideasRuntime = { provider: result.provider, model: result.model }
    return normalized
  }

  // First pass — ask for each pillar once.
  for (const pillar of pillarSequence) {
    const normalized = await requestPillarIdeas(pillar, 0, 0)
    if (normalized.length) {
      ideasByPillar.set(pillar, normalized.slice(0, perPillarTarget))
    }
  }

  // Per-pillar repair pass — re-ask any pillar that returned fewer than the
  // minimum acceptable count. Up to 2 retries per pillar.
  for (const pillar of pillarSequence) {
    let attempts = 0
    while ((ideasByPillar.get(pillar)?.length || 0) < perPillarMinimum && attempts < 2) {
      attempts += 1
      const existing = ideasByPillar.get(pillar) || []
      const repaired = await requestPillarIdeas(pillar, attempts, existing.length)
      if (repaired.length) {
        // Merge new ideas with whatever we already have for this pillar.
        // Deduplication happens by case-insensitive title within the pillar
        // so two phrasings of the same angle don't both get kept.
        const merged = uniqueBy([...existing, ...repaired], (idea) =>
          `${idea.pillar}::${idea.title.toLowerCase().trim()}`
        ).slice(0, perPillarTarget)
        ideasByPillar.set(pillar, merged)
      }
    }
  }

  const aiIdeas: CalendarIdea[] = pillarSequence.flatMap((pillar) => ideasByPillar.get(pillar) || [])
  // Final dedupe across all pillars. We dedupe by id (which is now guaranteed
  // unique by construction) AND by `pillar::title` to catch the case where
  // the same angle was suggested from two different pillars.
  const seenIds = new Set<string>()
  const seenTitles = new Set<string>()
  const generatedIdeas: CalendarIdea[] = []
  for (const idea of aiIdeas) {
    const titleKey = `${idea.pillar}::${idea.title.toLowerCase().trim()}`
    if (seenIds.has(idea.id) || seenTitles.has(titleKey)) continue
    seenIds.add(idea.id)
    seenTitles.add(titleKey)
    generatedIdeas.push(idea)
    if (generatedIdeas.length >= totalIdeaTarget) break
  }

  // Proportional floor: accept the calendar as long as we have at least 60%
  // of the target ideas AND at least 3 distinct pillars represented. This
  // lets a 12-target run succeed with 7-8 ideas across 3+ pillars while
  // still failing loud on truly degenerate model output.
  const proportionalFloor = Math.max(6, Math.floor(totalIdeaTarget * 0.6))
  const distinctPillars = new Set(generatedIdeas.map((idea) => idea.pillar)).size
  if (generatedIdeas.length < proportionalFloor || distinctPillars < 3) {
    const pillarCounts = pillarSequence
      .map((pillar) => `${pillar}: ${ideasByPillar.get(pillar)?.length || 0}`)
      .join(', ')
    throw new ContentCalendarGenerationError(
      'ideas',
      `the model returned only ${generatedIdeas.length} usable ideas across ${distinctPillars} pillar(s) (${pillarCounts}). ` +
        `Target was ${totalIdeaTarget}. Try one of: (1) re-run the request, (2) switch the runtime mode in Settings to a stronger model (Gemini Pro), ` +
        `(3) broaden the topic so the model has more angles to work with, or (4) raise the agent's max tokens. There is no industry-agnostic fallback to substitute generic content.`
    )
  }

  executionSteps.push(
    createStep({
      id: `calendar-ideas-${Date.now()}`,
      agent: maya,
      role: 'support',
      title: 'Strategy ideas generated',
      summary: `Generated ${generatedIdeas.length} calendar ideas across the five pillars for ${getIndustryAnchor(input.clientProfile)}.`,
      provider: ideasRuntime.provider,
      model: ideasRuntime.model,
      skillsUsed: input.selectedSkillsByAgent?.[maya.id] || ['content-calendar'],
    })
  )
  await completeActivity(
    phaseRefs.ideas,
    activityRefs.generateIdeas,
    maya,
    ideasRuntime,
    `Generated ${generatedIdeas.length} ideas across the content pillars.`,
    28
  )

  // ─── Phase 2b: idea selection (AI-only with deterministic balancing fallback) ─
  const selectedIdeaTarget = Math.min(
    generatedIdeas.length,
    Math.max(6, inferRequestedPostCount(input.clientProfile, input.request))
  )

  let selectedIdeas: CalendarIdea[] = []
  let selectionSummary = ''
  let selectionRuntime: StageRuntime = ideasRuntime || { provider: 'ollama', model: 'unknown' }

  await startActivity(
    phaseRefs.ideas,
    activityRefs.selectIdeas,
    maya,
    selectionRuntime,
    30
  )

  try {
    const selectionResult = await generateJsonStage<{
      selectedIds?: string[]
      selectionSummary?: string
    }>({
      agentId: maya.id,
      prompt: buildIdeaSelectionPrompt(input.clientProfile, input.request, generatedIdeas, selectedIdeaTarget),
      temperature: 0.35,
      maxTokens: input.maxTokens,
      generateStage: input.generateStage,
      stage: 'idea-selection',
      repairHint:
        'Return JSON with "selectedIds" (array of idea ids) and "selectionSummary" (2-3 sentences).',
    })

    const validIds = new Set(generatedIdeas.map((idea) => idea.id))
    const ids = (selectionResult.data.selectedIds || []).filter((id) => validIds.has(id))
    selectedIdeas = ids
      .map((id) => generatedIdeas.find((idea) => idea.id === id))
      .filter(Boolean) as CalendarIdea[]
    selectionSummary = selectionResult.data.selectionSummary || ''
    selectionRuntime = { provider: selectionResult.provider, model: selectionResult.model }
  } catch {
    // The selection step is purely combinatorial — falling back to balanced
    // pillar coverage is safe because we are picking from the same AI ideas,
    // not inventing new content.
    selectedIdeas = []
    selectionSummary = ''
  }

  if (selectedIdeas.length < selectedIdeaTarget) {
    const remainder = pickBalancedIdeas(
      generatedIdeas.filter((idea) => !selectedIdeas.some((selected) => selected.id === idea.id)),
      selectedIdeaTarget - selectedIdeas.length
    )
    selectedIdeas = [...selectedIdeas, ...remainder].slice(0, selectedIdeaTarget)
  }

  if (!selectionSummary) {
    selectionSummary = `Maya selected ${selectedIdeas.length} ideas balanced across pillars and platforms for the month.`
  }

  executionSteps.push(
    createStep({
      id: `calendar-idea-selection-${Date.now()}`,
      agent: maya,
      role: 'support',
      title: 'Ideas shortlisted',
      summary: `Shortlisted ${selectedIdeas.length} ideas to carry into hook and draft production.`,
      provider: selectionRuntime.provider,
      model: selectionRuntime.model,
      skillsUsed: input.selectedSkillsByAgent?.[maya.id] || ['campaign-planning'],
    })
  )
  await completeActivity(
    phaseRefs.ideas,
    activityRefs.selectIdeas,
    maya,
    selectionRuntime,
    `Selected ${selectedIdeas.length} ideas to move into hook and post production.`,
    38
  )

  // ─── Phase 3: hooks (AI-only) ───────────────────────────────────────────
  await startPhase(phaseRefs.hooks, 40)
  let hooksRuntime: StageRuntime = ideasRuntime || { provider: 'ollama', model: 'unknown' }
  await startActivity(phaseRefs.hooks, activityRefs.generateHooks, echo, hooksRuntime, 42)

  const hookChunks = chunkItems(selectedIdeas, 2)
  const mergedHooks: Record<string, HookOption[]> = {}

  /**
   * Tolerantly extract hooks for a chunk of ideas from a model response.
   * Accepts either of two shapes:
   *   - new (preferred): { hooks: [{ ideaNumber: 1, options: [...] }] }
   *   - legacy:          { hooks: { "<some-label>": [...] } }
   * Either way we resolve labels back to actual ideas via resolveIdeaByLabel.
   */
  const ingestHooksResponse = (
    raw: any,
    chunk: CalendarIdea[]
  ): void => {
    const hooksField = raw?.data?.hooks

    if (Array.isArray(hooksField)) {
      for (const entry of hooksField) {
        const idea = resolveIdeaByLabel(entry?.ideaNumber ?? entry?.idea ?? entry?.ideaId, chunk)
        if (!idea) continue
        const list = (Array.isArray(entry?.options) ? entry.options : Array.isArray(entry?.hooks) ? entry.hooks : [])
          .map((value: any) => normalizeHookOption(value))
          .filter(Boolean) as HookOption[]
        if (list.length) mergedHooks[idea.id] = list
      }
    } else if (hooksField && typeof hooksField === 'object') {
      for (const [label, values] of Object.entries(hooksField)) {
        const idea = resolveIdeaByLabel(label, chunk)
        if (!idea) continue
        const list = (Array.isArray(values) ? values : [])
          .map((value) => normalizeHookOption(value))
          .filter(Boolean) as HookOption[]
        if (list.length) mergedHooks[idea.id] = list
      }
    }
  }

  for (const chunk of hookChunks) {
    const hookResult = await generateJsonStage<any>({
      agentId: echo.id,
      prompt: buildHooksPrompt(input.clientProfile, input.request, chunk),
      temperature: 0.55,
      maxTokens: input.maxTokens,
      generateStage: input.generateStage,
      stage: 'hooks',
      repairHint:
        'Return JSON with a top-level "hooks" array. Each entry must have ideaNumber (1, 2, 3...) and options (4 hooks with formula and text).',
      salvageArrayKey: 'hooks',
    })
    ingestHooksResponse(hookResult, chunk)
    hooksRuntime = { provider: hookResult.provider, model: hookResult.model }
  }

  // Repair pass for any ideas that came back empty — single retry, then fail loudly.
  const stillMissing = selectedIdeas.filter((idea) => !(mergedHooks[idea.id] || []).length)
  if (stillMissing.length) {
    for (const chunk of chunkItems(stillMissing, 2)) {
      const repairResult = await generateJsonStage<any>({
        agentId: echo.id,
        prompt: buildHooksPrompt(input.clientProfile, input.request, chunk),
        temperature: 0.35,
        maxTokens: input.maxTokens,
        generateStage: input.generateStage,
        stage: 'hooks-repair',
        repairHint:
          'Return JSON with a top-level "hooks" array, one entry per provided idea, each with ideaNumber (1-based) and options (≥3 hooks with formula and text).',
        salvageArrayKey: 'hooks',
      })
      ingestHooksResponse(repairResult, chunk)
      hooksRuntime = { provider: repairResult.provider, model: repairResult.model }
    }
  }

  const ideasMissingHooks = selectedIdeas.filter((idea) => !(mergedHooks[idea.id] || []).length)
  if (ideasMissingHooks.length) {
    const titlesList = ideasMissingHooks.map((idea) => `"${idea.title}"`).join(', ')
    throw new ContentCalendarGenerationError(
      'hooks',
      `model failed to generate hooks for ${ideasMissingHooks.length} of ${selectedIdeas.length} idea(s) (${titlesList}). ` +
        `Retry the calendar request, or switch the runtime mode in Settings to a stronger model (Gemini Pro).`
    )
  }

  const hooks: Record<string, HookOption[]> = Object.fromEntries(
    selectedIdeas.map((idea) => [idea.id, (mergedHooks[idea.id] || []).slice(0, 4)])
  )

  executionSteps.push(
    createStep({
      id: `calendar-hooks-${Date.now()}`,
      agent: echo,
      role: 'support',
      title: 'Hooks generated',
      summary: `Generated hook sets for ${Object.keys(hooks).length} shortlisted ideas.`,
      provider: hooksRuntime.provider,
      model: hooksRuntime.model,
      skillsUsed: input.selectedSkillsByAgent?.[echo.id] || ['headline-writing', 'social-copy'],
    })
  )

  // ─── Phase 3b: hook selection (AI-only) ─────────────────────────────────
  let selectedHooks: SelectedHook[] = []
  let selectedHooksRuntime: StageRuntime = hooksRuntime

  try {
    const selectionResult = await generateJsonStage<{
      selectedHooks?: Array<{
        ideaId?: string
        idea_id?: string
        hook?: string
        formula?: string
        platform?: string
        pillar?: string
        ideaTitle?: string
      }>
    }>({
      agentId: echo.id,
      prompt: buildHookSelectionPrompt(input.clientProfile, input.request, selectedIdeas, hooks),
      temperature: 0.35,
      maxTokens: input.maxTokens,
      generateStage: input.generateStage,
      stage: 'hook-selection',
      repairHint:
        'Return JSON with "selectedHooks" — one entry per selected idea, with ideaId, hook, formula, platform, pillar, and ideaTitle.',
    })
    const validIds = new Set(selectedIdeas.map((idea) => idea.id))
    const map = new Map<string, SelectedHook>()
    for (const raw of selectionResult.data.selectedHooks || []) {
      const ideaId = normalizeTextValue(raw?.ideaId || raw?.idea_id)
      if (!validIds.has(ideaId)) continue
      const idea = selectedIdeas.find((entry) => entry.id === ideaId)
      const hookText = normalizeTextValue(raw?.hook)
      if (!idea || !hookText) continue
      map.set(ideaId, {
        ideaId,
        ideaTitle: normalizeTextValue(raw?.ideaTitle) || idea.title,
        hook: hookText,
        formula: normalizeTextValue(raw?.formula) || 'Question',
        platform: normalizeTextValue(raw?.platform) || idea.primaryPlatform,
        pillar: normalizeTextValue(raw?.pillar) || idea.pillar,
      })
    }
    selectedHooks = Array.from(map.values())
    selectedHooksRuntime = { provider: selectionResult.provider, model: selectionResult.model }
  } catch {
    selectedHooks = []
  }

  // For any idea where the AI didn't pick a hook, take the first AI-generated
  // hook for that idea — never invent one.
  if (selectedHooks.length < selectedIdeas.length) {
    const existing = new Set(selectedHooks.map((entry) => entry.ideaId))
    for (const idea of selectedIdeas) {
      if (existing.has(idea.id)) continue
      const firstHook = (hooks[idea.id] || [])[0]
      if (!firstHook) continue
      selectedHooks.push({
        ideaId: idea.id,
        ideaTitle: idea.title,
        hook: firstHook.text,
        formula: firstHook.formula,
        platform: idea.primaryPlatform,
        pillar: idea.pillar,
      })
    }
  }

  if (selectedHooks.length === 0) {
    throw new ContentCalendarGenerationError(
      'hook-selection',
      'no usable hooks could be confirmed by the model. Retry the calendar request.'
    )
  }

  executionSteps.push(
    createStep({
      id: `calendar-hook-selection-${Date.now()}`,
      agent: echo,
      role: 'support',
      title: 'Hooks approved',
      summary: 'Selected one production-ready hook per shortlisted idea.',
      provider: selectedHooksRuntime.provider,
      model: selectedHooksRuntime.model,
      skillsUsed: input.selectedSkillsByAgent?.[echo.id] || ['headline-writing', 'platform-native-content'],
    })
  )
  await completeActivity(
    phaseRefs.hooks,
    activityRefs.generateHooks,
    echo,
    selectedHooksRuntime,
    `Generated and selected hooks for ${selectedHooks.length} shortlisted ideas.`,
    55
  )

  // ─── Phase 4: posts (AI-only) ────────────────────────────────────────────
  await startPhase(phaseRefs.drafting, 58)
  let postsRuntime: StageRuntime = selectedHooksRuntime
  await startActivity(phaseRefs.drafting, activityRefs.draftPosts, echo, postsRuntime, 60)

  // Posts are the longest stage output. Use chunks of 1 so each response
  // stays small enough to fit cleanly within the model's token budget. The
  // total round-trip count goes up but each one is far less likely to
  // truncate mid-JSON. The salvage path ensures even truncated responses
  // contribute whatever complete posts they did produce.
  const postChunks = chunkItems(selectedHooks, 1)
  const postMap = new Map<string, CalendarPost>()

  for (const chunk of postChunks) {
    const postResult = await generateJsonStage<{ posts: any[] }>({
      agentId: echo.id,
      prompt: buildPostsPrompt(input.clientProfile, input.request, chunk),
      temperature: 0.55,
      maxTokens: input.maxTokens,
      generateStage: input.generateStage,
      stage: 'posts',
      repairHint:
        'Return JSON with a top-level "posts" array. Each post must include ideaNumber (1-based), platform, hook, body, cta, characterCount, and hashtags groups. Keep the body under 600 characters.',
      salvageArrayKey: 'posts',
    })
    for (const rawPost of postResult.data.posts || []) {
      const resolvedIdeaId = resolvePostIdeaId(rawPost, chunk)
      const source = chunk.find((item) => item.ideaId === resolvedIdeaId)
      if (!source) continue
      const normalized = normalizeCalendarPost({ ...rawPost, ideaId: resolvedIdeaId }, source)
      if (normalized) postMap.set(normalized.ideaId, normalized)
    }
    postsRuntime = { provider: postResult.provider, model: postResult.model }
  }

  // Repair any missing posts via a single retry on the affected chunk.
  const missingPosts = selectedHooks.filter((item) => !postMap.has(item.ideaId))
  if (missingPosts.length) {
    for (const chunk of chunkItems(missingPosts, 1)) {
      const repairResult = await generateJsonStage<{ posts: any[] }>({
        agentId: echo.id,
        prompt: buildPostsPrompt(input.clientProfile, input.request, chunk),
        temperature: 0.35,
        maxTokens: input.maxTokens,
        generateStage: input.generateStage,
        stage: 'posts-repair',
        repairHint:
          'Return JSON with a top-level "posts" array for the single provided idea. The post needs ideaNumber (1-based), platform, hook, body (under 600 chars), cta, characterCount, and hashtags.',
        salvageArrayKey: 'posts',
      })
      for (const rawPost of repairResult.data.posts || []) {
        const resolvedIdeaId = resolvePostIdeaId(rawPost, chunk)
        const source = chunk.find((item) => item.ideaId === resolvedIdeaId)
        if (!source) continue
        const normalized = normalizeCalendarPost({ ...rawPost, ideaId: resolvedIdeaId }, source)
        if (normalized) postMap.set(normalized.ideaId, normalized)
      }
      postsRuntime = { provider: repairResult.provider, model: repairResult.model }
    }
  }

  // After both passes, fail loudly if posts are still missing — never substitute hardcoded content.
  for (const item of selectedHooks) {
    if (!postMap.has(item.ideaId)) {
      throw new ContentCalendarGenerationError(
        'posts',
        `model failed to draft a post for "${item.ideaTitle}" after retry. Retry the calendar request — no industry-agnostic fallback content is generated.`
      )
    }
  }

  const posts: CalendarPost[] = selectedHooks
    .map((item) => postMap.get(item.ideaId))
    .filter(Boolean) as CalendarPost[]

  executionSteps.push(
    createStep({
      id: `calendar-posts-${Date.now()}`,
      agent: echo,
      role: 'lead',
      title: 'Posts drafted',
      summary: `Drafted ${posts.length} ready-to-publish posts with CTAs and hashtags.`,
      provider: postsRuntime.provider,
      model: postsRuntime.model,
      skillsUsed: input.selectedSkillsByAgent?.[echo.id] || ['social-copy', 'campaign-copywriting'],
    })
  )
  await completeActivity(
    phaseRefs.drafting,
    activityRefs.draftPosts,
    echo,
    postsRuntime,
    `Drafted ${posts.length} posts with captions, CTAs, and hashtag groups.`,
    72
  )

  // ─── Phase 5: scheduling (AI-preferred, deterministic distribution as combinatorial fallback) ─
  await startPhase(phaseRefs.assembly, 74)
  let calendarRuntime: StageRuntime = postsRuntime
  await startActivity(phaseRefs.assembly, activityRefs.assembleCalendar, nova, calendarRuntime, 76)

  const monthLength = inferCalendarTimeframeDays(input.clientProfile, input.request)
  let calendar: CalendarSchedule = {}
  let calendarSummary = ''

  try {
    const calendarResult = await generateJsonStage<{
      calendar: Record<string, string[]>
      calendarSummary?: string
    }>({
      agentId: nova.id,
      prompt: buildCalendarPrompt(input.clientProfile, input.request, posts),
      temperature: 0.35,
      maxTokens: input.maxTokens,
      generateStage: input.generateStage,
      stage: 'calendar',
      repairHint:
        'Return JSON with a top-level "calendar" object keyed by day number and an optional "calendarSummary". Use only the provided idea ids.',
    })
    const validIds = new Set(posts.map((post) => post.ideaId))
    calendar = Object.fromEntries(
      Object.entries(calendarResult.data.calendar || {}).map(([day, ids]) => [
        day,
        (Array.isArray(ids) ? ids : []).filter((id): id is string => typeof id === 'string' && validIds.has(id)),
      ])
    )
    calendar = Object.fromEntries(Object.entries(calendar).filter(([, ids]) => ids.length))
    calendarSummary = calendarResult.data.calendarSummary || ''
    calendarRuntime = { provider: calendarResult.provider, model: calendarResult.model }
  } catch {
    calendar = {}
  }

  // If the AI didn't produce a usable schedule, distribute deterministically.
  // This is purely combinatorial — it places existing AI posts on days, it does
  // not invent any content.
  const scheduledIds = new Set(Object.values(calendar).flat())
  if (scheduledIds.size < posts.length) {
    const missing = posts.filter((post) => !scheduledIds.has(post.ideaId))
    const fallback = distributePostsAcrossDays(missing, monthLength)
    for (const [day, ids] of Object.entries(fallback)) {
      calendar[day] = [...(calendar[day] || []), ...ids]
    }
  }

  if (!calendarSummary) {
    calendarSummary = 'Posts are spaced to avoid clustering across the month and across platforms.'
  }

  executionSteps.push(
    createStep({
      id: `calendar-schedule-${Date.now()}`,
      agent: nova,
      role: 'support',
      title: 'Calendar scheduled',
      summary: 'Distributed the monthly posts into a realistic publishing calendar.',
      provider: calendarRuntime.provider,
      model: calendarRuntime.model,
      skillsUsed: input.selectedSkillsByAgent?.[nova.id] || ['channel-planning', 'organic-social-planning'],
    })
  )
  await completeActivity(
    phaseRefs.assembly,
    activityRefs.assembleCalendar,
    nova,
    calendarRuntime,
    'Assembled the month view and scheduling summary for the content calendar.',
    82
  )

  // ─── Phase 6: visuals (AI-only) ──────────────────────────────────────────
  await startPhase(phaseRefs.visuals, 84)
  let visualsRuntime: StageRuntime = calendarRuntime
  await startActivity(phaseRefs.visuals, activityRefs.createVisuals, lyra, visualsRuntime, 86)

  const visualMap = new Map<string, CalendarVisual>()

  for (const chunk of chunkItems(selectedHooks, 3)) {
    const visualResult = await generateJsonStage<{ visuals: any[] }>({
      agentId: lyra.id,
      prompt: buildVisualsPrompt(input.clientProfile, input.request, chunk),
      temperature: 0.45,
      maxTokens: input.maxTokens,
      generateStage: input.generateStage,
      stage: 'visuals',
      repairHint:
        'Return JSON with a top-level "visuals" array. Each item must include postNumber (1-based), platform, format, mood, imageDirection, copyOverlay, and designNotes.',
      salvageArrayKey: 'visuals',
    })
    for (const rawVisual of visualResult.data.visuals || []) {
      const normalized = normalizeVisual(rawVisual, chunk)
      if (!normalized) continue
      visualMap.set(normalized.postId, normalized)
    }
    visualsRuntime = { provider: visualResult.provider, model: visualResult.model }
  }

  const missingVisuals = selectedHooks.filter((item) => !visualMap.has(item.ideaId))
  if (missingVisuals.length) {
    for (const chunk of chunkItems(missingVisuals, 2)) {
      const repairResult = await generateJsonStage<{ visuals: any[] }>({
        agentId: lyra.id,
        prompt: buildVisualsPrompt(input.clientProfile, input.request, chunk),
        temperature: 0.3,
        maxTokens: input.maxTokens,
        generateStage: input.generateStage,
        stage: 'visuals-repair',
        repairHint:
          'Return JSON with a top-level "visuals" array. Each entry must have postNumber (1-based), platform, format, mood, imageDirection, copyOverlay, and designNotes.',
        salvageArrayKey: 'visuals',
      })
      for (const rawVisual of repairResult.data.visuals || []) {
        const normalized = normalizeVisual(rawVisual, chunk)
        if (!normalized) continue
        visualMap.set(normalized.postId, normalized)
      }
      visualsRuntime = { provider: repairResult.provider, model: repairResult.model }
    }
  }

  for (const item of selectedHooks) {
    if (!visualMap.has(item.ideaId)) {
      throw new ContentCalendarGenerationError(
        'visuals',
        `model failed to produce a visual brief for "${item.ideaTitle}" after retry. Retry the calendar request.`
      )
    }
  }

  const visuals: CalendarVisual[] = selectedHooks
    .map((item) => visualMap.get(item.ideaId))
    .filter(Boolean) as CalendarVisual[]

  executionSteps.push(
    createStep({
      id: `calendar-visuals-${Date.now()}`,
      agent: lyra,
      role: 'support',
      title: 'Visual briefs prepared',
      summary: `Prepared ${visuals.length} visual briefs to pair with the drafted posts.`,
      provider: visualsRuntime.provider,
      model: visualsRuntime.model,
      skillsUsed: input.selectedSkillsByAgent?.[lyra.id] || ['visual-storytelling', 'design-systems'],
    })
  )
  await completeActivity(
    phaseRefs.visuals,
    activityRefs.createVisuals,
    lyra,
    visualsRuntime,
    `Prepared ${visuals.length} visual briefs for the drafted posts.`,
    92
  )

  // ─── Phase 7: assembly + quality review ─────────────────────────────────
  const markdown = buildCalendarMarkdown({
    request: input.request,
    profile: input.clientProfile,
    ideas: generatedIdeas,
    selectedIdeas,
    selectedHooks,
    posts,
    calendar,
    calendarSummary,
    visuals,
    selectionSummary,
  })
  const renderedHtml = buildCalendarHtml({
    title: `${inferBrandName(input.clientProfile, input.request)} Content Calendar`,
    monthLabel: getMonthLabel(input.clientProfile),
    profile: input.clientProfile,
    calendar,
    ideas: selectedIdeas,
    posts,
    visuals,
  })
  const qualityResult = validateDeliverableQuality('content-calendar', markdown, input.request)

  executionSteps.push(
    createStep({
      id: `calendar-quality-${Date.now()}`,
      agent: iris,
      role: 'quality',
      title: 'Calendar quality review',
      summary: qualityResult.ok
        ? 'The calendar passed the structural quality gate and is ready for review.'
        : `The calendar is usable but still has quality issues: ${qualityResult.issues.join(' | ')}`,
      provider: postsRuntime.provider,
      model: postsRuntime.model,
      skillsUsed: input.selectedSkillsByAgent?.[iris.id] || ['task-triaging'],
      status: qualityResult.ok ? 'completed' : 'warning',
    })
  )
  await startPhase(phaseRefs.quality, 94)
  await startActivity(phaseRefs.quality, activityRefs.qualityReview, iris, postsRuntime, 96)
  await completeActivity(
    phaseRefs.quality,
    activityRefs.qualityReview,
    iris,
    postsRuntime,
    qualityResult.ok
      ? 'The calendar passed the quality review.'
      : `The calendar completed with quality warnings: ${qualityResult.issues.join(' | ')}`,
    100
  )

  return {
    response: markdown,
    renderedHtml,
    executionSteps,
    qualityResult,
  }
}
