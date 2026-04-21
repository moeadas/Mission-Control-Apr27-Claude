import { ArtifactExecutionStep, AIProvider } from '@/lib/types'
import { buildArtifactHtml } from '@/lib/output-html'
import { validateDeliverableQuality } from '@/lib/output-quality'

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

type GenerateStage = (input: {
  agentId: string
  prompt: string
  temperature: number
  maxTokens: number
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
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
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
}

function parseJsonObject<T>(raw: string): T {
  const candidate = sanitizeJsonCandidate(extractJsonCandidate(raw))
  return JSON.parse(candidate) as T
}

async function generateJsonStage<T>(input: {
  agentId: string
  prompt: string
  temperature: number
  maxTokens: number
  generateStage: GenerateStage
  repairHint: string
}) {
  let lastText = ''
  let lastRuntime: StageRuntime = { provider: 'ollama', model: 'unknown' }

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
          ].join('\n')

    const result = await input.generateStage({
      agentId: input.agentId,
      prompt,
      temperature: attempt === 0 ? input.temperature : Math.max(0.2, input.temperature - 0.2),
      maxTokens: input.maxTokens,
    })

    lastText = result.text
    lastRuntime = { provider: result.provider, model: result.model }

    try {
      return {
        data: parseJsonObject<T>(result.text),
        provider: result.provider,
        model: result.model,
      }
    } catch {
      continue
    }
  }

  throw new Error(`Calendar stage returned invalid JSON after retries. Last response snippet: ${lastText.slice(0, 180)}`)
}

function toLines(value: string[]) {
  return value.filter(Boolean).map((item) => `- ${item}`).join('\n')
}

function getPostingFrequencySummary(profile: ClientProfileMap) {
  const value = profile.posting_frequency || 'Instagram: 3 posts/week; LinkedIn: 2 posts/week'
  return value
}

function getPlatforms(profile: ClientProfileMap) {
  return (profile.platforms || 'Instagram, LinkedIn')
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function getMonthLabel(profile: ClientProfileMap) {
  return profile.month_label || new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })
}

function inferBrandName(profile: ClientProfileMap, request: string) {
  if (profile.brand_name?.trim()) return profile.brand_name.trim()

  const match =
    request.match(/\bfor\s+([^.,\n]+?)(?:\s+focused on|\s+about|\s+for the|\s*$)/i) ||
    request.match(/\bcreate\s+(?:a|an)\s+content calendar\s+for\s+([^.,\n]+?)(?:\s+focused on|\s+about|\s*$)/i)

  return match?.[1]?.trim() || 'Client'
}

function buildClientBlock(profile: ClientProfileMap, request: string) {
  const brandName = inferBrandName(profile, request)
  return [
    `Brand: ${brandName}`,
    `Industry/Niche: ${profile.niche || profile.industry || 'Not specified'}`,
    `Audience demographics: ${profile.audience_demographics || profile.target_audience || 'Not specified'}`,
    `Audience psychographics: ${profile.audience_psychographics || 'Not specified'}`,
    `Pain points: ${profile.pain_points || 'Not specified'}`,
    `Tone: ${profile.tone || profile.brand_voice || 'Professional and warm'}`,
    `Platforms: ${profile.platforms || 'Instagram, LinkedIn'}`,
    `Posting frequency: ${getPostingFrequencySummary(profile)}`,
    `Content goal: ${profile.content_goal || 'Awareness and engagement'}`,
    `Product / service: ${profile.product_service || 'Not specified'}`,
    `Topics to avoid: ${profile.topics_to_avoid || 'None specified'}`,
    `Client request: ${request}`,
    `Month / period: ${getMonthLabel(profile)}`,
  ].join('\n')
}

function buildIdeasPrompt(profile: ClientProfileMap, request: string, pillar?: string) {
  const targetPillars = pillar
    ? `Generate exactly 6 content ideas for the ${pillar} pillar.`
    : 'Generate exactly 30 content ideas across 5 pillars with 6 ideas per pillar.'

  return [
    'You are Maya, the Strategy Lead, building the strategic backbone for a monthly content calendar.',
    buildClientBlock(profile, request),
    targetPillars,
    'Pillars: Educational, Inspirational, Promotional, Entertaining, Engagement.',
    'Keep every title under 10 words and every description to a single short sentence.',
    'Return compact JSON only with no markdown and no commentary.',
    'Return valid JSON only in this shape:',
    '{ "ideas": [{ "id": "idea_01", "title": "Short title", "pillar": "Educational", "description": "2 sentence description", "primaryPlatform": "Instagram", "contentType": "Carousel | Reel | Static Post | Video | Story | Thread" }] }',
    'Keep the ideas practical for a real agency/client workflow.',
  ].join('\n\n')
}

function buildIdeaSelectionPrompt(profile: ClientProfileMap, request: string, ideas: CalendarIdea[]) {
  return [
    'You are Maya, selecting the best ideas to take forward into production.',
    buildClientBlock(profile, request),
    `From the 30 candidate ideas below, select exactly 18 ideas that produce the strongest monthly calendar balance across funnel stages, pillars, and platforms.`,
    'Return valid JSON only in this shape:',
    '{ "selectedIds": ["idea_01"], "selectionSummary": "2-3 sentences on why this set is strong." }',
    ideas
      .map((idea) => `${idea.id} | ${idea.pillar} | ${idea.primaryPlatform} | ${idea.contentType} | ${idea.title} | ${idea.description}`)
      .join('\n'),
  ].join('\n\n')
}

function buildHooksPrompt(profile: ClientProfileMap, request: string, ideas: CalendarIdea[]) {
  return [
    'You are Echo, generating hooks for shortlisted calendar ideas.',
    buildClientBlock(profile, request),
    'For each idea below, generate exactly 8 hooks using these formulas: Question, Statistic, Bold Statement, Story Opening, How-To, Number List, Controversy, Curiosity Gap.',
    'Every hook must be under 20 words and platform-native.',
    'Return compact JSON only with no markdown and no commentary.',
    'Return valid JSON only in this shape:',
    '{ "hooks": { "idea_01": [{ "formula": "Question", "text": "..." }] } }',
    ideas.map((idea) => `${idea.id} | ${idea.title} | ${idea.pillar} | ${idea.primaryPlatform}`).join('\n'),
  ].join('\n\n')
}

function buildHookSelectionPrompt(profile: ClientProfileMap, request: string, ideas: CalendarIdea[], hooks: Record<string, HookOption[]>) {
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
  selectedHooks: Array<{ ideaId: string; ideaTitle: string; hook: string; platform: string; pillar: string }>
) {
  return [
    'You are Echo, drafting full social posts for a monthly content calendar.',
    buildClientBlock(profile, request),
    'For each selected hook below, write a ready-to-publish post with CTA and hashtag groups.',
    'Keep each body concise and platform-native. Avoid unnecessary explanation.',
    'Return compact JSON only with no markdown and no commentary.',
    'Return valid JSON only in this shape:',
    '{ "posts": [{ "ideaId": "idea_01", "platform": "Instagram", "hook": "The hook", "body": "Full post body", "cta": "Call to action", "characterCount": 240, "hashtags": { "primary": ["#tag"], "niche": ["#tag2"], "trending": ["#tag3"], "seoKeywords": ["keyword"] } }] }',
    selectedHooks
      .map((item) => `${item.ideaId} | ${item.platform} | ${item.pillar} | ${item.ideaTitle} | Hook: ${item.hook}`)
      .join('\n'),
  ].join('\n\n')
}

function buildCalendarPrompt(profile: ClientProfileMap, request: string, posts: CalendarPost[]) {
  const daysInMonth = 30
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

function buildVisualsPrompt(profile: ClientProfileMap, request: string, selectedHooks: Array<{ ideaId: string; ideaTitle: string; hook: string; platform: string; pillar: string }>) {
  return [
    'You are Lyra, creating visual briefs for each content-calendar post.',
    buildClientBlock(profile, request),
    'Keep each brief compact. Return compact JSON only with no markdown and no commentary.',
    'Return valid JSON only in this shape:',
    '{ "visuals": [{ "postId": "idea_01", "platform": "Instagram", "format": "Carousel", "colorPalette": ["#123456"], "mood": "Bold and optimistic", "imageDirection": "What the visual should show", "copyOverlay": "Overlay line", "designNotes": "Layout and brand notes" }] }',
    selectedHooks
      .map((item) => `${item.ideaId} | ${item.platform} | ${item.ideaTitle} | ${item.hook}`)
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

function slugifyIdeaId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function buildDeterministicIdeas(profile: ClientProfileMap) {
  const brand = profile.brand_name || 'Client'
  const topic = profile.product_service || profile.niche || 'equine genetics'
  const altTopic = profile.niche || profile.industry || topic
  const pillars = [
    {
      name: 'Educational',
      templates: [
        ['What Is {{topic}}?', 'Explain the core science behind {{topic}} in plain language.'],
        ['Why Breeders Use {{topic}}', 'Show why this insight matters before making breeding decisions.'],
        ['Inside The Lab Process', 'Walk through how the testing process works from sample to result.'],
        ['Reading A Genetic Report', 'Help the audience understand what a real result actually means.'],
        ['When Testing Adds Clarity', 'Show the situations where {{topic}} can answer important questions.'],
        ['Common Genetics Misconceptions', 'Correct one misunderstanding people often have about {{altTopic}}.'],
      ],
    },
    {
      name: 'Inspirational',
      templates: [
        ['Your Horse’s Genetic Story', 'Frame {{topic}} as a way to understand each horse more fully.'],
        ['From Uncertainty To Confidence', 'Show how better insight can create calmer decision-making.'],
        ['Smarter Decisions Start Here', 'Position {{topic}} as a practical step toward better outcomes.'],
        ['Confidence Before The Next Step', 'Focus on the peace of mind that better data can provide.'],
        ['Why Clarity Changes Everything', 'Tell a hopeful story about moving from guesswork to confidence.'],
        ['Better Breeding Starts Small', 'Show how one informed step can improve a long-term breeding plan.'],
      ],
    },
    {
      name: 'Promotional',
      templates: [
        ['Book A Genetics Consultation', 'Invite the audience to talk through whether {{topic}} fits their needs.'],
        ['When To Order Testing', 'Create urgency around the best time to plan for {{topic}}.'],
        ['A Smarter First Conversation', 'Promote a consult as the easiest way to understand next steps.'],
        ['Start With Expert Guidance', 'Show why working with {{brand}} can make the process easier.'],
        ['Make Your Next Decision Clearer', 'Connect {{topic}} to a valuable consultative next step.'],
        ['Turn Questions Into A Plan', 'Promote moving from uncertainty into an informed action plan.'],
      ],
    },
    {
      name: 'Entertaining',
      templates: [
        ['Genetics Myth Or Fact?', 'Turn a common assumption about {{altTopic}} into a myth-versus-fact post.'],
        ['Quiz: What Would You Guess?', 'Create a quick audience challenge around a genetics scenario.'],
        ['Spot The Hidden Clue', 'Use curiosity to tease the hidden insight behind a genetics result.'],
        ['What Would You Do Next?', 'Present a scenario and invite the audience to choose the next step.'],
        ['Can You Decode This?', 'Use an approachable “decode the science” format for audience attention.'],
        ['Guess The Bigger Risk', 'Create a comparison-style post that teaches through interaction.'],
      ],
    },
    {
      name: 'Engagement',
      templates: [
        ['Horse Genetics Poll', 'Ask the audience where they feel the most uncertainty today.'],
        ['Ask The Lab Team', 'Invite questions the audience wants answered about {{topic}}.'],
        ['What’s Your Biggest Question?', 'Prompt comments around confusing parts of {{altTopic}}.'],
        ['Would You Test Earlier?', 'Spark a discussion around timing and decision-making.'],
        ['What Do You Want Explained?', 'Invite requests for future topics or deeper breakdowns.'],
        ['Tell Us Your Experience', 'Encourage the audience to share their own testing questions.'],
      ],
    },
  ] as const
  const platforms = ['Instagram', 'LinkedIn']
  const contentTypes = ['Carousel', 'Reel', 'Static Post', 'Article', 'Story', 'Poll']

  const ideas: CalendarIdea[] = []
  let index = 1

  for (const pillar of pillars) {
    pillar.templates.forEach(([titleTemplate, descriptionTemplate], templateIndex) => {
      const title = titleTemplate
        .replace(/\{\{topic\}\}/g, topic)
        .replace(/\{\{altTopic\}\}/g, altTopic)
        .replace(/\{\{brand\}\}/g, brand)
      const description = descriptionTemplate
        .replace(/\{\{topic\}\}/g, topic)
        .replace(/\{\{altTopic\}\}/g, altTopic)
        .replace(/\{\{brand\}\}/g, brand)
      ideas.push({
        id: `${pillar.name.slice(0, 3).toLowerCase()}_${String(index).padStart(2, '0')}_${slugifyIdeaId(title).slice(0, 20)}`,
        title,
        pillar: pillar.name,
        description,
        primaryPlatform: platforms[templateIndex % platforms.length],
        contentType: contentTypes[templateIndex % contentTypes.length],
      })
      index += 1
    })
  }

  return ideas
}

function pickBalancedIdeas(ideas: CalendarIdea[], targetCount = 18) {
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

function fallbackHooksForIdea(idea: CalendarIdea): HookOption[] {
  const subject = (idea.title || idea.description || 'this topic').replace(/[?.!]+$/g, '')
  const platform = (idea.primaryPlatform || 'Instagram').toLowerCase()
  const pillar = (idea.pillar || 'Educational').toLowerCase()
  const platformTail =
    platform === 'linkedin'
      ? 'for breeders, owners, and equine professionals'
      : 'for horse owners and breeders'
  const angle =
    pillar === 'promotional'
      ? 'that can support a smarter next step'
      : pillar === 'engagement'
        ? 'that people will want to weigh in on'
        : pillar === 'inspirational'
          ? 'that can change how people think about horse health'
          : 'that helps simplify the science'
  return [
    { formula: 'Question', text: `What does ${subject} reveal ${platformTail}?` },
    { formula: 'Statistic', text: `${subject} is one genetics insight more owners should understand.` },
    { formula: 'Bold Statement', text: `${subject} should be part of more breeding conversations.` },
    { formula: 'Story Opening', text: `A single chromosome result can completely change the plan.` },
    { formula: 'How-To', text: `How ${subject} helps people make clearer breeding decisions.` },
    { formula: 'Number List', text: `3 ways ${subject} can improve equine decision-making.` },
    { formula: 'Controversy', text: `Routine screening alone is not always enough ${angle}.` },
    { formula: 'Curiosity Gap', text: `The hidden genetic clue many horse owners never ask about.` },
  ]
}

function choosePreferredHook(idea: CalendarIdea, hooks: HookOption[]) {
  const pillar = (idea.pillar || '').toLowerCase()
  const platform = (idea.primaryPlatform || '').toLowerCase()
  const preferredFormulas =
    pillar === 'promotional'
      ? ['Bold Statement', 'How-To', 'Question']
      : pillar === 'engagement'
        ? ['Question', 'Controversy', 'Curiosity Gap']
        : pillar === 'inspirational'
          ? ['Story Opening', 'Bold Statement', 'Curiosity Gap']
          : platform === 'linkedin'
            ? ['Statistic', 'How-To', 'Question']
            : ['Question', 'Curiosity Gap', 'How-To']

  for (const formula of preferredFormulas) {
    const match = hooks.find((hook) => hook.formula === formula && hook.text.trim().length > 0)
    if (match) return match
  }

  return hooks.find((hook) => hook.text.trim().length > 0) || hooks[0]
}

function fallbackSelectedHook(idea: CalendarIdea, hooks: HookOption[]) {
  const preferred = choosePreferredHook(idea, hooks)
  return {
    ideaId: idea.id,
    hook: preferred?.text || `Why ${idea.title} matters right now.`,
    formula: preferred?.formula || 'Question',
    platform: idea.primaryPlatform,
    pillar: idea.pillar,
    ideaTitle: idea.title,
  }
}

function buildFallbackPost(
  item: { ideaId: string; ideaTitle: string; hook: string; platform: string; pillar: string },
  profile: ClientProfileMap
): CalendarPost {
  const brand = profile.brand_name || 'the brand'
  const topic = profile.product_service || profile.niche || item.ideaTitle
  const body =
    item.platform.toLowerCase() === 'instagram'
      ? `${item.hook}\n\n${item.ideaTitle} matters because ${topic} gives horse owners and breeders a clearer view of what is happening beneath the surface. Instead of relying on assumptions, this kind of insight helps people ask better questions, plan earlier, and feel more confident about the next decision. Save this post if you want more simple genetics explanations made for real-world horse care and breeding.`
      : `${item.hook}\n\n${item.ideaTitle} is an important conversation for ${brand}. This topic helps explain why ${topic} matters, what signals professionals should pay attention to, and how earlier clarity can support stronger breeding and health decisions. For an audience that values confidence, precision, and better planning, this is exactly the kind of insight worth keeping on the radar.`

  const cta =
    item.platform.toLowerCase() === 'linkedin'
      ? `Connect with ${brand} to discuss how this applies to your breeding goals.`
      : item.platform.toLowerCase() === 'facebook'
        ? 'Have a question about this topic? Send us a message.'
        : `DM ${brand} to book a consultation or follow for more equine genetics insights.`

  const baseKeyword = (profile.product_service || item.ideaTitle || 'equine genetics')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .join('')

  return {
    ideaId: item.ideaId,
    platform: item.platform,
    hook: item.hook,
    body,
    cta,
    characterCount: body.length,
    hashtags: {
      primary: [`#${brand.replace(/[^A-Za-z0-9]/g, '') || 'ClientBrand'}`],
      niche: ['#EquineGenetics', '#HorseHealth'],
      trending: item.platform.toLowerCase() === 'instagram' ? ['#HorseOwner', '#EquineEducation'] : ['#HorseBreeding'],
      seoKeywords: [baseKeyword || 'equinegenetics'],
    },
  }
}

function fallbackSchedule(posts: CalendarPost[], monthLength = 30): CalendarSchedule {
  const calendar: CalendarSchedule = {}
  const slotDays = Array.from({ length: Math.min(monthLength, 30) }, (_, index) => 1 + index * 2).filter((day) => day <= monthLength)
  let cursor = 0

  for (const post of posts) {
    const day = slotDays[Math.min(cursor, slotDays.length - 1)]
    const key = String(day)
    calendar[key] = [...(calendar[key] || []), post.ideaId]
    cursor += 1
    if (cursor >= slotDays.length) cursor = slotDays.length - 1
  }

  return calendar
}

function buildDeterministicPosts(
  selectedHooks: Array<{ ideaId: string; ideaTitle: string; hook: string; platform: string; pillar: string }>,
  profile: ClientProfileMap
) {
  return selectedHooks.map((item) => buildFallbackPost(item, profile))
}

function buildDeterministicVisuals(
  selectedHooks: Array<{ ideaId: string; ideaTitle: string; hook: string; platform: string; pillar: string }>
) {
  return selectedHooks.map((item) => fallbackVisual(item))
}

function fallbackVisual(item: {
  ideaId: string
  ideaTitle: string
  hook: string
  platform: string
  pillar: string
}): CalendarVisual {
  return {
    postId: item.ideaId,
    platform: item.platform,
    format: item.platform.toLowerCase() === 'instagram' ? 'Carousel' : 'Static Post',
    colorPalette: ['#151b2f', '#4f8ef7', '#f7f5ff'],
    mood: 'Clear, scientific, trustworthy',
    imageDirection: `Show ${item.ideaTitle} with an editorial, science-forward visual treatment.`,
    copyOverlay: item.hook,
    designNotes: `Keep the composition simple, premium, and easy to scan for ${item.platform}.`,
  }
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
  selectedHooks: Array<{ ideaId: string; ideaTitle: string; hook: string; platform: string; pillar: string }>
  posts: CalendarPost[]
  calendar: CalendarSchedule
  calendarSummary?: string
  visuals: CalendarVisual[]
  selectionSummary?: string
}) {
  const selectedIdeaMap = Object.fromEntries(input.selectedIdeas.map((idea) => [idea.id, idea]))
  const brandName = inferBrandName(input.profile, input.request)
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
    `# ${brandName} Content Calendar`,
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
            <p style="margin:8px 0 0;font-size:14px;line-height:1.7;color:#394154;">Key topic: ${escapeHtml(input.profile.product_service || input.profile.niche || 'Brand positioning')}</p>
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
}) : ArtifactExecutionStep {
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
  maxTokens: number
  hooks?: RuntimeHooks
}) {
  const executionSteps: ArtifactExecutionStep[] = []
  const maya = input.agentsById.get('maya') || input.agentsById.get('iris')
  const echo = input.agentsById.get('echo') || input.agentsById.get('iris')
  const nova = input.agentsById.get('nova') || echo || maya
  const lyra = input.agentsById.get('lyra') || echo || maya
  const iris = input.agentsById.get('iris') || maya || echo || nova || lyra

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
    generateIdeas: { id: 'generate-ideas', name: 'Generate 30 Content Ideas', outputs: ['content-ideas'] },
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

  await startPhase(phaseRefs.intake, 5)
  await startActivity(phaseRefs.intake, activityRefs.collectProfile, maya, { provider: 'ollama', model: 'structured-profile' }, 8)
  await completeActivity(
    phaseRefs.intake,
    activityRefs.collectProfile,
    maya,
    { provider: 'ollama', model: 'structured-profile' },
    'Client profile normalized for the content calendar workflow.',
    10
  )

  const generatedIdeas: CalendarIdea[] = buildDeterministicIdeas(input.clientProfile)
  let ideasRuntime: StageRuntime = { provider: 'ollama', model: 'deterministic-idea-builder' }

  await startPhase(phaseRefs.ideas, 12)
  await startActivity(phaseRefs.ideas, activityRefs.generateIdeas, maya, ideasRuntime, 14)
  executionSteps.push(
    createStep({
      id: `calendar-ideas-${Date.now()}`,
      agent: maya,
      role: 'support',
      title: 'Strategy ideas generated',
      summary: `Generated ${generatedIdeas.length} calendar ideas across multiple pillars for the month.`,
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

  let selectedIdeaIds: { selectedIds: string[]; selectionSummary?: string }
  let selectionRuntime: StageRuntime = { provider: 'ollama', model: 'deterministic-selection-builder' }
  await startActivity(phaseRefs.ideas, activityRefs.selectIdeas, maya, selectionRuntime, 30)
  const balanced = pickBalancedIdeas(generatedIdeas, 18)
  selectedIdeaIds = {
    selectedIds: balanced.map((idea) => idea.id),
    selectionSummary: 'Maya selected a balanced set across pillars, platforms, and funnel intent for the month.',
  }

  let selectedIdeas = generatedIdeas.filter((idea) => selectedIdeaIds.selectedIds?.includes(idea.id)).slice(0, 18)
  if (selectedIdeas.length < 18) {
    const topUp = pickBalancedIdeas(
      generatedIdeas.filter((idea) => !selectedIdeas.some((selected) => selected.id === idea.id)),
      18 - selectedIdeas.length
    )
    selectedIdeas = [...selectedIdeas, ...topUp].slice(0, 18)
    selectedIdeaIds.selectedIds = selectedIdeas.map((idea) => idea.id)
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

  const hooks: Record<string, HookOption[]> = Object.fromEntries(selectedIdeas.map((idea) => [idea.id, fallbackHooksForIdea(idea)]))
  let hooksRuntime: StageRuntime = { provider: 'ollama', model: 'deterministic-hook-builder' }
  await startPhase(phaseRefs.hooks, 40)
  await startActivity(phaseRefs.hooks, activityRefs.generateHooks, echo, hooksRuntime, 42)
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

  const selectedHooks: Array<{ ideaId: string; hook: string; formula: string; platform: string; pillar: string; ideaTitle: string }> = []
  let selectedHooksRuntime: StageRuntime = hooksRuntime
  for (const idea of selectedIdeas) {
    selectedHooks.push(fallbackSelectedHook(idea, hooks[idea.id] || fallbackHooksForIdea(idea)))
  }
  executionSteps.push(
    createStep({
      id: `calendar-hook-selection-${Date.now()}`,
      agent: echo,
      role: 'support',
      title: 'Hooks approved',
      summary: `Selected one production-ready hook per shortlisted idea.`,
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

  const posts: CalendarPost[] = buildDeterministicPosts(selectedHooks, input.clientProfile)
  let postsRuntime: StageRuntime = { provider: 'ollama', model: 'deterministic-post-builder' }
  await startPhase(phaseRefs.drafting, 58)
  await startActivity(phaseRefs.drafting, activityRefs.draftPosts, echo, postsRuntime, 60)
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

  const calendarPayload: { calendar: CalendarSchedule; calendarSummary?: string } = {
    calendar: fallbackSchedule(posts),
    calendarSummary: 'Nova scheduled the posts with a balanced cadence across the month and across platforms.',
  }
  let calendarRuntime: StageRuntime = { provider: 'ollama', model: 'deterministic-calendar-builder' }
  await startPhase(phaseRefs.assembly, 74)
  await startActivity(phaseRefs.assembly, activityRefs.assembleCalendar, nova, calendarRuntime, 76)
  const calendar = calendarPayload.calendar || {}
  executionSteps.push(
    createStep({
      id: `calendar-schedule-${Date.now()}`,
      agent: nova,
      role: 'support',
      title: 'Calendar scheduled',
      summary: `Distributed the monthly posts into a realistic publishing calendar.`,
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

  const visuals: CalendarVisual[] = buildDeterministicVisuals(selectedHooks)
  let visualsRuntime: StageRuntime = { provider: 'ollama', model: 'deterministic-visual-builder' }
  await startPhase(phaseRefs.visuals, 84)
  await startActivity(phaseRefs.visuals, activityRefs.createVisuals, lyra, visualsRuntime, 86)
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

  const markdown = buildCalendarMarkdown({
    request: input.request,
    profile: input.clientProfile,
    ideas: generatedIdeas,
    selectedIdeas,
    selectedHooks,
    posts,
    calendar,
    calendarSummary: calendarPayload.calendarSummary,
    visuals,
    selectionSummary: selectedIdeaIds.selectionSummary,
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
