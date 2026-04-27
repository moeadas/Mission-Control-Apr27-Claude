import { AIProvider, DeliverableType } from '@/lib/types'
import { getDeliverableOutputSpec } from '@/lib/task-output'

type VerifyPayload =
  | { provider: 'ollama'; baseUrl: string }
  | { provider: 'gemini'; apiKey: string }
  | { provider: 'gemini-image'; apiKey: string; model?: string }

export async function verifyProvider(payload: VerifyPayload) {
  if (payload.provider === 'ollama') {
    const baseUrl = payload.baseUrl.replace(/\/$/, '')
    const response = await fetch(`${baseUrl}/api/tags`)
    if (!response.ok) {
      throw new Error('Could not reach Ollama.')
    }
    const data = await response.json()
    const models = Array.isArray(data.models) ? data.models.map((model: { name: string }) => model.name) : []
    return { ok: true, models }
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${payload.apiKey}`)
  if (!response.ok) {
    throw new Error('Gemini API key verification failed.')
  }
  const data = await response.json()
  const models = Array.isArray(data.models)
    ? data.models
        .map((model: { name?: string }) => model.name?.replace('models/', ''))
        .filter(Boolean)
    : []
  const testModel = models.find((model: string) => model.includes('gemini-2.5-flash')) || models[0]
  if (!testModel) {
    throw new Error('Gemini API key is valid, but no text model is available.')
  }

  const testResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${testModel}:generateContent?key=${payload.apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Reply with exactly: Gemini ready.' }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 48 },
      }),
    }
  )

  if (!testResponse.ok) {
    const text = await testResponse.text()
    throw new Error(text || 'Gemini API responded, but a test generation failed.')
  }

  const testData = await testResponse.json()
  const sample =
    testData.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || '').join('').trim() || ''
  return { ok: true, models, testModel, sample }
}

function extractGeminiImageParts(payload: any) {
  const parts = payload?.candidates?.[0]?.content?.parts
  if (!Array.isArray(parts)) return []
  return parts
    .map((part: any) => {
      const inline = part?.inlineData || part?.inline_data
      if (!inline?.data) return null
      return {
        mimeType: inline.mimeType || inline.mime_type || 'image/png',
        data: inline.data as string,
      }
    })
    .filter(Boolean)
}

export async function verifyVisualProvider(input: { apiKey: string; model: string }) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${input.model}:generateContent?key=${input.apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Create a minimal abstract brand mark with a blue circle on white background.' }] }],
        generationConfig: {
          responseModalities: ['Image'],
          temperature: 0.2,
        },
      }),
    }
  )

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || 'Visual provider verification failed.')
  }

  const data = await response.json()
  const images = extractGeminiImageParts(data)
  if (!images.length) {
    throw new Error('Gemini visual model responded, but no image output was returned.')
  }

  return {
    ok: true,
    model: input.model,
    mimeType: images[0]?.mimeType || 'image/png',
  }
}

export async function generateGeminiImage(input: {
  apiKey: string
  model: string
  prompt: string
  aspectRatio?: '1:1' | '4:5' | '16:9' | '9:16'
  referenceImages?: Array<{ mimeType: string; data: string }>
}) {
  const parts: Array<Record<string, unknown>> = [{ text: input.prompt }]
  for (const image of input.referenceImages || []) {
    parts.push({
      inlineData: {
        mimeType: image.mimeType,
        data: image.data,
      },
    })
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${input.model}:generateContent?key=${input.apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: {
          responseModalities: ['Image'],
          temperature: 0.45,
          ...(input.aspectRatio ? { imageConfig: { aspectRatio: input.aspectRatio } } : {}),
        },
      }),
    }
  )

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || 'Gemini image generation failed.')
  }

  const data = await response.json()
  const images = extractGeminiImageParts(data)
  if (!images.length) {
    throw new Error('Gemini returned no image data.')
  }

  return images[0]
}

interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export class ProviderError extends Error {
  provider: AIProvider
  status?: number
  code?: string

  constructor(provider: AIProvider, message: string, options?: { status?: number; code?: string }) {
    super(message)
    this.name = 'ProviderError'
    this.provider = provider
    this.status = options?.status
    this.code = options?.code
  }
}

function normalizeProviderError(provider: AIProvider, status: number, rawText: string) {
  let parsed: any = null
  try {
    parsed = JSON.parse(rawText)
  } catch {
    parsed = null
  }

  const code = parsed?.error?.status || parsed?.error?.code
  const message =
    (typeof parsed?.error === 'object' ? parsed.error.message : null) ||
    (typeof parsed?.error === 'string' ? parsed.error : null) ||
    rawText ||
    `${provider} request failed.`
  return new ProviderError(provider, message, { status, code })
}

export async function generateText(input: {
  provider: AIProvider
  model: string
  messages: Message[]
  temperature: number
  maxTokens: number
  ollamaBaseUrl?: string
  ollamaContextWindow?: number
  geminiApiKey?: string
  timeoutMs?: number
}) {
  const timeoutMs = input.timeoutMs || (input.provider === 'gemini' ? 45000 : 90000)
  const createAbortSignal = () => AbortSignal.timeout(timeoutMs)

  if (input.provider === 'gemini') {
    if (!input.geminiApiKey) throw new Error('Gemini API key missing.')

    const systemMessage = input.messages.find((message) => message.role === 'system')
    const conversationMessages = input.messages.filter((message) => message.role !== 'system')
    const contents = conversationMessages.map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    }))

    if (contents.length === 0 && systemMessage) {
      contents.push({ role: 'user', parts: [{ text: systemMessage.content }] })
    }

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: input.temperature,
        maxOutputTokens: input.maxTokens,
      },
    }

    if (systemMessage && conversationMessages.length > 0) {
      body.systemInstruction = { parts: [{ text: systemMessage.content }] }
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${input.model}:generateContent?key=${input.geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: createAbortSignal(),
      }
    )

    if (!response.ok) {
      const text = await response.text()
      throw normalizeProviderError('gemini', response.status, text)
    }

    const data = await response.json()
    const text =
      data.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || '').join('') || ''
    return text
  }

  const baseUrl = (input.ollamaBaseUrl || 'http://localhost:11434').replace(/\/$/, '')
  const isCloudModel = input.model.includes(':cloud')
  const configuredCtx =
    typeof input.ollamaContextWindow === 'number' && input.ollamaContextWindow > 0
      ? input.ollamaContextWindow
      : undefined
  const numCtx = configuredCtx
    ? Math.max(2048, Math.min(configuredCtx, isCloudModel ? 65536 : 32768))
    : undefined

  const baseMessages = input.messages.map((message) => ({ role: message.role, content: message.content }))
  const hasNonSystemMessage = baseMessages.some((message) => message.role !== 'system')
  const messages = hasNonSystemMessage
    ? baseMessages
    : [
        ...baseMessages,
        {
          role: 'user' as const,
          content: 'Execute the instruction above and return only the requested output.',
        },
      ]

  const ollamaPayload = {
    model: input.model,
    messages,
    stream: false,
    options: {
      temperature: input.temperature,
      num_predict: input.maxTokens,
      ...(numCtx ? { num_ctx: numCtx } : {}),
    },
  }

  let response: Response
  try {
    response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ollamaPayload),
      signal: createAbortSignal(),
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      throw normalizeProviderError('ollama', 504, `Ollama request timed out after ${Math.round(timeoutMs / 1000)} seconds.`)
    }
    throw error
  }

  if (response.status === 500 && isCloudModel) {
    await new Promise((resolve) => setTimeout(resolve, 1000))
    try {
      response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ollamaPayload),
        signal: createAbortSignal(),
      })
    } catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw normalizeProviderError('ollama', 504, `Ollama retry timed out after ${Math.round(timeoutMs / 1000)} seconds.`)
      }
      throw error
    }
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw normalizeProviderError('ollama', response.status, text || 'Ollama request failed.')
  }

  const data = await response.json()
  return data.message?.content || ''
}

export function getFriendlyProviderError(error: unknown) {
  if (error instanceof ProviderError) {
    if (error.provider === 'gemini' && (error.status === 429 || error.code === 'RESOURCE_EXHAUSTED')) {
      return 'Gemini quota is exhausted right now. Enable Ollama as a fallback, switch Iris to an Ollama model, or check Gemini billing and rate limits.'
    }
    if (error.provider === 'gemini') {
      return 'Gemini is unavailable right now. Check the API key, billing, or quota.'
    }
    if (error.provider === 'ollama') {
      const msg = error.message?.toLowerCase() || ''
      if (msg.includes('econnrefused') || msg.includes('fetch failed') || msg.includes('network') || msg.includes('etimedout')) {
        return 'Ollama is unavailable right now. Make sure your local Ollama server is running.'
      }
      if (error.status === 500 || msg.includes('internal server error')) {
        return "Ollama model error — the conversation may be too long for the model's context window. Try starting a new chat, or switch to a model with a larger context in Settings."
      }
      return `Ollama error: ${error.message || 'Unknown error. Check that Ollama is running and the model is available.'}`
    }
  }

  if (error instanceof Error) return error.message
  return 'Chat request failed.'
}

type DeliverableCategory =
  | 'content'
  | 'strategy'
  | 'research'
  | 'creative'
  | 'technical'
  | 'operations'
  | 'communications'
  | 'analytics'

interface ServerDeliverableSpec {
  id: DeliverableType
  label: string
  category: DeliverableCategory
  patterns: RegExp[]
  defaultLead: string
  defaultCollaborators: string[]
  pipelineId: string | null
  pipelineKeywords: string[]
  priority: number
  executionHints: string[]
  complexity: 'low' | 'medium' | 'high'
}

const SERVER_DELIVERABLE_REGISTRY: ServerDeliverableSpec[] = [
  {
    id: 'content-calendar',
    label: 'Content Calendar',
    category: 'content',
    patterns: [
      /\b(content calendar|editorial calendar|30[- ]?day content|monthly content|weekly content plan|content schedule|posting schedule|content plan)\b/,
    ],
    defaultLead: 'echo',
    defaultCollaborators: ['maya', 'nova', 'lyra'],
    pipelineId: 'content-calendar',
    pipelineKeywords: ['content calendar', 'posting schedule', 'editorial calendar', '30 day content', 'monthly content plan'],
    priority: 95,
    executionHints: [
      'Structure the calendar as a practical publishing plan with clear cadence and channel fit.',
      'Include enough detail for copy, planning, and creative teams to execute without re-briefing.',
    ],
    complexity: 'high',
  },
  {
    id: 'creative-asset',
    label: 'Creative Asset',
    category: 'creative',
    patterns: [
      /\b(image|visual|artwork|design|creative asset|mockup|poster|hero image|ad creative|text over|text overlay|headline on image|post image|generate image|create image|infographic|social graphic|banner|display ad)\b/,
    ],
    defaultLead: 'lyra',
    defaultCollaborators: ['echo', 'maya'],
    pipelineId: 'ad-creative',
    pipelineKeywords: ['ad creative', 'advertising creative', 'ad assets', 'banner ads', 'creative asset', 'post image', 'headline on image'],
    priority: 90,
    executionHints: [
      'Define the visual concept, dimensions, copy overlays, and brand direction clearly.',
      'Keep the output production-ready rather than abstract.',
    ],
    complexity: 'medium',
  },
  {
    id: 'short-form-copy',
    label: 'Short-Form Business Copy',
    category: 'content',
    patterns: [
      /\b(whatsapp description|whatsapp bio|bio|profile description|short description|company description|brand description|tagline|one-liner|elevator pitch|slogan)\b/,
    ],
    defaultLead: 'echo',
    defaultCollaborators: ['maya'],
    pipelineId: null,
    pipelineKeywords: [],
    priority: 88,
    executionHints: [
      'Keep the output concise and polished rather than padded.',
      'Respect hard character limits and avoid extra strategy language unless explicitly requested.',
    ],
    complexity: 'low',
  },
  {
    id: 'campaign-copy',
    label: 'Campaign Copy',
    category: 'content',
    patterns: [
      /\b(facebook post|instagram post|linkedin post|social post|single post|caption|carousel post|campaign copy|campaign content|post copy|post for|social media copy|tweet|thread)\b/,
    ],
    defaultLead: 'echo',
    defaultCollaborators: ['maya'],
    pipelineId: null,
    pipelineKeywords: [],
    priority: 85,
    executionHints: [
      'Write platform-appropriate, audience-aware copy with clear hierarchy and intent.',
      'If the request is short-form, keep it concise and polished rather than over-structured.',
    ],
    complexity: 'medium',
  },
  {
    id: 'email-campaign',
    label: 'Email Campaign',
    category: 'content',
    patterns: [
      /\b(email campaign|email sequence|email template|newsletter|drip campaign|email marketing|welcome email|onboarding email|email flow|email series|email blast|edm)\b/,
    ],
    defaultLead: 'echo',
    defaultCollaborators: ['maya', 'nova'],
    pipelineId: null,
    pipelineKeywords: ['email campaign', 'email sequence', 'email marketing', 'drip campaign', 'newsletter'],
    priority: 82,
    executionHints: [
      'Structure the output for direct use in an email workflow.',
      'Keep subject lines, preview text, and CTA distinct and usable.',
    ],
    complexity: 'medium',
  },
  {
    id: 'blog-article',
    label: 'Blog / Article',
    category: 'content',
    patterns: [
      /\b(blog post|blog article|article|thought leadership|op-?ed|long-?form content|guest post|pillar page|how-?to guide|listicle|write an article|write a blog)\b/,
    ],
    defaultLead: 'echo',
    defaultCollaborators: ['atlas', 'maya'],
    pipelineId: null,
    pipelineKeywords: [],
    priority: 80,
    executionHints: [
      'Make the article substantive and clearly structured.',
      'Balance readability with enough depth to be genuinely useful.',
    ],
    complexity: 'medium',
  },
  {
    id: 'website-copy',
    label: 'Website Copy',
    category: 'content',
    patterns: [
      /\b(website copy|web copy|landing page|homepage copy|about page|product page|service page|hero copy|website content|web content|page copy|site copy)\b/,
    ],
    defaultLead: 'echo',
    defaultCollaborators: ['maya', 'lyra'],
    pipelineId: null,
    pipelineKeywords: [],
    priority: 79,
    executionHints: [
      'Write for scanning, clarity, and conversion intent.',
      'Keep visual pairing and section hierarchy in mind.',
    ],
    complexity: 'medium',
  },
  {
    id: 'video-script',
    label: 'Video / Script',
    category: 'content',
    patterns: [
      /\b(video script|script for|youtube script|reel script|tiktok script|podcast script|voiceover|voice over|screenplay|storyboard script|explainer video|ad script|commercial script)\b/,
    ],
    defaultLead: 'echo',
    defaultCollaborators: ['lyra', 'maya'],
    pipelineId: null,
    pipelineKeywords: [],
    priority: 78,
    executionHints: [
      'Write with pacing, hook strength, and production clarity in mind.',
      'Separate spoken content from visual direction when useful.',
    ],
    complexity: 'medium',
  },
  {
    id: 'presentation',
    label: 'Presentation / Deck',
    category: 'content',
    patterns: [
      /\b(presentation|slide deck|pitch deck|keynote|powerpoint|pptx|investor deck|sales deck|stakeholder deck|board deck|proposal deck|slides)\b/,
    ],
    defaultLead: 'sage',
    defaultCollaborators: ['maya', 'lyra', 'echo'],
    pipelineId: null,
    pipelineKeywords: [],
    priority: 77,
    executionHints: [
      'Organize the deck around a clear narrative progression.',
      'Make slide-level messaging crisp and stakeholder-ready.',
    ],
    complexity: 'high',
  },
  {
    id: 'client-brief',
    label: 'Client Brief',
    category: 'communications',
    patterns: [
      /\b(client brief|briefing document|intake brief|onboarding brief|client onboarding|project brief|creative brief)\b/,
    ],
    defaultLead: 'sage',
    defaultCollaborators: ['maya', 'echo'],
    pipelineId: 'client-brief',
    pipelineKeywords: ['client brief', 'briefing document', 'intake brief', 'onboarding brief', 'client onboarding', 'creative brief', 'project brief'],
    priority: 78,
    executionHints: [
      'Structure the brief so any team member can understand scope, goals, audience, deliverables, and open questions.',
    ],
    complexity: 'medium',
  },
  {
    id: 'strategy-brief',
    label: 'Strategy Brief',
    category: 'strategy',
    patterns: [
      /\b(strategy|strategic|positioning|messaging|message pillars|value proposition|go-?to-?market|gtm|brand strategy|brand positioning|growth strategy|marketing strategy|digital strategy|comms strategy|communication strategy)\b/,
      /\b(why they are not buying|why they're not buying|what do they want|what value are they seeking|sales issue|sales problem|conversion issue)\b/,
    ],
    defaultLead: 'maya',
    defaultCollaborators: ['atlas', 'sage'],
    pipelineId: 'strategy-brief',
    pipelineKeywords: ['strategy brief', 'brand strategy', 'messaging strategy', 'positioning', 'strategic brief', 'brand platform', 'go-to-market'],
    priority: 76,
    executionHints: [
      'Translate analysis into clear positioning, message direction, and practical recommendations.',
      'Make the output decision-ready, not just descriptive.',
    ],
    complexity: 'high',
  },
  {
    id: 'campaign-strategy',
    label: 'Campaign Strategy',
    category: 'strategy',
    patterns: [
      /\b(campaign strategy|campaign plan|media strategy|launch plan|launch strategy|promotion strategy|campaign brief|integrated campaign|omnichannel campaign)\b/,
    ],
    defaultLead: 'maya',
    defaultCollaborators: ['nova', 'echo', 'atlas'],
    pipelineId: 'campaign-brief',
    pipelineKeywords: ['campaign brief', 'campaign strategy', 'marketing campaign', 'campaign plan', 'campaign concept', 'launch plan', 'integrated campaign'],
    priority: 74,
    executionHints: [
      'Map the strategy across channels, phases, audience logic, and success metrics.',
      'Keep the recommendations actionable for execution teams.',
    ],
    complexity: 'high',
  },
  {
    id: 'brand-guidelines',
    label: 'Brand Guidelines',
    category: 'strategy',
    patterns: [
      /\b(brand guidelines|brand book|style guide|brand identity|visual identity|brand manual|brand standards|design system|brand kit)\b/,
    ],
    defaultLead: 'lyra',
    defaultCollaborators: ['maya', 'echo'],
    pipelineId: null,
    pipelineKeywords: [],
    priority: 73,
    executionHints: [
      'Cover both verbal and visual identity rules in a usable way.',
      'Favor concrete standards and examples over abstract branding language.',
    ],
    complexity: 'high',
  },
  {
    id: 'research-brief',
    label: 'Research Brief',
    category: 'research',
    patterns: [
      /\b(market analysis|audience research|customer insight|target audience|competitor|competitive analysis|market research|consumer research|industry analysis|benchmark|benchmarking|trend analysis|trend report|landscape analysis)\b/,
    ],
    defaultLead: 'atlas',
    defaultCollaborators: ['maya', 'echo'],
    pipelineId: 'competitor-research',
    pipelineKeywords: ['competitor research', 'competitive analysis', 'competitor report', 'market research', 'competitor intelligence', 'audience research', 'market analysis'],
    priority: 72,
    executionHints: [
      'Separate observed evidence from interpretation and recommendations.',
      'Be specific enough that strategy and content teams can act on the output directly.',
    ],
    complexity: 'high',
  },
  {
    id: 'seo-audit',
    label: 'SEO Audit',
    category: 'technical',
    patterns: [
      /\b(seo audit|technical seo|search audit|keyword research|keyword analysis|seo report|seo strategy|search engine|serp|backlink audit|on-?page seo|off-?page seo|site audit)\b/,
    ],
    defaultLead: 'atlas',
    defaultCollaborators: ['echo', 'nova'],
    pipelineId: 'seo-audit',
    pipelineKeywords: ['seo audit', 'seo analysis', 'search engine optimization', 'keyword research', 'technical seo', 'seo report', 'seo strategy'],
    priority: 70,
    executionHints: [
      'Prioritize findings by impact and effort, and connect them to search performance outcomes.',
    ],
    complexity: 'high',
  },
  {
    id: 'ui-audit',
    label: 'UI/UX Audit',
    category: 'technical',
    patterns: [
      /\b(ui audit|ux audit|website audit|page audit|usability audit|accessibility audit|heuristic evaluation|design review|ux review|cro audit|conversion audit)\b/,
    ],
    defaultLead: 'finn',
    defaultCollaborators: ['lyra', 'echo', 'dex'],
    pipelineId: null,
    pipelineKeywords: [],
    priority: 68,
    executionHints: [
      'Organize findings by severity, evidence, and recommended fix.',
      'Balance design, copy, accessibility, and conversion considerations.',
    ],
    complexity: 'high',
  },
  {
    id: 'pr-comms',
    label: 'PR / Communications',
    category: 'communications',
    patterns: [
      /\b(press release|pr strategy|media release|public relations|media kit|press kit|media pitch|crisis comms|crisis communication|pr plan|media outreach|earned media|spokesperson)\b/,
    ],
    defaultLead: 'sage',
    defaultCollaborators: ['echo', 'maya'],
    pipelineId: null,
    pipelineKeywords: [],
    priority: 67,
    executionHints: [
      'Keep the communication clear, controlled, and externally usable.',
      'Make quotes and messaging lines feel publishable, not internal.',
    ],
    complexity: 'medium',
  },
  {
    id: 'event-plan',
    label: 'Event Plan',
    category: 'operations',
    patterns: [
      /\b(event plan|event strategy|conference|webinar|workshop|summit|meetup|event brief|activation|experiential|launch event|virtual event|hybrid event)\b/,
    ],
    defaultLead: 'nova',
    defaultCollaborators: ['maya', 'sage', 'echo'],
    pipelineId: null,
    pipelineKeywords: [],
    priority: 65,
    executionHints: [
      'Balance logistics, promotion, audience experience, and communication planning.',
    ],
    complexity: 'high',
  },
  {
    id: 'media-plan',
    label: 'Media Plan',
    category: 'operations',
    patterns: [
      /\b(media plan|channel plan|budget allocation|forecast|media budget|media mix|paid media|organic media|media strategy|ad spend|advertising plan|media allocation)\b/,
    ],
    defaultLead: 'nova',
    defaultCollaborators: ['maya', 'atlas'],
    pipelineId: 'media-plan',
    pipelineKeywords: ['media plan', 'media strategy', 'channel strategy', 'budget allocation', 'media buying', 'ad spend', 'channel mix'],
    priority: 66,
    executionHints: [
      'Break the plan into channels, objective, audience, budget logic, and KPI framework.',
    ],
    complexity: 'high',
  },
  {
    id: 'budget-sheet',
    label: 'Budget Sheet',
    category: 'operations',
    patterns: [
      /\b(budget sheet|budget breakdown|cost estimate|cost breakdown|budget template|financial plan|spend tracker)\b/,
    ],
    defaultLead: 'dex',
    defaultCollaborators: ['nova', 'maya'],
    pipelineId: null,
    pipelineKeywords: ['budget', 'budget sheet'],
    priority: 60,
    executionHints: [
      'Present structured line items, assumptions, subtotals, and totals clearly.',
    ],
    complexity: 'medium',
  },
  {
    id: 'kpi-forecast',
    label: 'KPI Forecast',
    category: 'analytics',
    patterns: [
      /\b(kpi forecast|kpi projection|performance forecast|growth forecast|target setting|goal setting|okr|projection)\b/,
    ],
    defaultLead: 'dex',
    defaultCollaborators: ['atlas', 'nova'],
    pipelineId: null,
    pipelineKeywords: ['kpi', 'forecast', 'projection'],
    priority: 58,
    executionHints: [
      'Show baseline, assumptions, targets, time horizon, and confidence/uncertainty where appropriate.',
    ],
    complexity: 'medium',
  },
  {
    id: 'data-analysis',
    label: 'Data / Analytics Report',
    category: 'analytics',
    patterns: [
      /\b(data analysis|analytics report|performance report|dashboard|kpi report|metrics|roi analysis|attribution|conversion rate|funnel analysis|analytics audit|data audit|reporting)\b/,
    ],
    defaultLead: 'atlas',
    defaultCollaborators: ['nova', 'maya'],
    pipelineId: null,
    pipelineKeywords: [],
    priority: 59,
    executionHints: [
      'Translate metrics into decisions and recommended actions.',
      'Separate raw findings from interpretation and next steps.',
    ],
    complexity: 'high',
  },
  {
    id: 'general-task',
    label: 'General Task',
    category: 'operations',
    patterns: [],
    defaultLead: 'maya',
    defaultCollaborators: ['atlas'],
    pipelineId: null,
    pipelineKeywords: [],
    priority: 1,
    executionHints: [
      'Choose the clearest useful format for the request.',
      'Make reasonable assumptions explicit when the request is underspecified.',
    ],
    complexity: 'medium',
  },
  {
    id: 'status-report',
    label: 'Status Report',
    category: 'operations',
    patterns: [],
    defaultLead: 'iris',
    defaultCollaborators: [],
    pipelineId: null,
    pipelineKeywords: [],
    priority: 0,
    executionHints: [],
    complexity: 'low',
  },
]

export function getServerDeliverableSpec(id: DeliverableType | string) {
  return (
    SERVER_DELIVERABLE_REGISTRY.find((spec) => spec.id === id) ||
    SERVER_DELIVERABLE_REGISTRY.find((spec) => spec.id === 'status-report')!
  )
}

function isSubstantiveServerRequest(lower: string) {
  if (lower.length < 20) return false

  const actionVerbs =
    /\b(create|draft|write|build|make|generate|prepare|design|plan|develop|analyse|analyze|audit|review|research|outline|summarize|summarise|propose|recommend|evaluate|compare|assess|optimize|optimise|launch|execute|schedule|set up|configure|brainstorm|ideate|produce|compose|compile|format|restructure|rework|revamp|update|refresh|rephrase|rewrite|improve|enhance|craft)\b/
  const needVerbs = /\b(i need|we need|i want|can you|could you|please|help me|let's|lets|i'd like|we'd like|would you)\b/
  const deliverableNouns =
    /\b(report|brief|calendar|plan|strategy|audit|analysis|deck|proposal|copy|content|script|template|guide|framework|roadmap|presentation|newsletter|campaign|email|post|article|blog|page|asset|design|mockup|wireframe|diagram|description|bio|tagline)\b/

  if (actionVerbs.test(lower)) return true
  if (needVerbs.test(lower) && lower.length > 30) return true
  if (lower.length > 60 && lower.includes('?')) return true
  if (deliverableNouns.test(lower) && lower.length > 30) return true

  return lower.length > 50
}

export interface RoutingContext {
  routedAgentId: string
  routingReason: string
  clientId?: string
  deliverableType: DeliverableType
  collaboratorAgentIds: string[]
  pipelineId: string | null
  confidence: 'high' | 'medium' | 'low'
}

export function inferRoutingContext(input: {
  content: string
  clientHints: { id: string; name: string; industry: string }[]
  agents: { id: string; name: string; specialty: string; role: string; skills?: string[] }[]
}): RoutingContext {
  const lower = input.content.toLowerCase()
  const deliverableType = inferDeliverableType(input.content)
  const spec = getServerDeliverableSpec(deliverableType)
  const client =
    input.clientHints.find((item) => lower.includes(item.name.toLowerCase()) || lower.includes(item.id.toLowerCase())) || null

  const availableAgentIds = new Set(input.agents.map((agent) => agent.id))
  let routedAgentId = availableAgentIds.has(spec.defaultLead)
    ? spec.defaultLead
    : spec.defaultCollaborators.find((id) => availableAgentIds.has(id)) || 'iris'

  const collaborators = new Set(
    spec.defaultCollaborators.filter((id) => id !== routedAgentId && availableAgentIds.has(id))
  )

  const contentSignals: Array<{ pattern: RegExp; agentId: string }> = [
    { pattern: /(visual|image|design|creative|artwork|graphic|mockup|illustration|banner)/i, agentId: 'lyra' },
    { pattern: /(research|data|market|competitor|benchmark|analysis|insight|trend)/i, agentId: 'atlas' },
    { pattern: /(stakeholder|board|investor|executive|c-suite|management|pitch|presentation)/i, agentId: 'sage' },
    { pattern: /(copy|caption|headline|hook|cta|content|script|article|bio|tagline)/i, agentId: 'echo' },
    { pattern: /(channel|media|budget|spend|allocation|paid|organic|schedule)/i, agentId: 'nova' },
    { pattern: /(excel|spreadsheet|kpi|pacing|budget sheet|forecast|projection)/i, agentId: 'dex' },
    { pattern: /(timeline|handoff|traffic|resourcing|schedule|project plan)/i, agentId: 'piper' },
    { pattern: /(concept|creative direction|campaign concept|idea|brainstorm|ux|ui|usability)/i, agentId: 'finn' },
  ]

  for (const signal of contentSignals) {
    if (
      signal.pattern.test(lower) &&
      signal.agentId !== routedAgentId &&
      availableAgentIds.has(signal.agentId)
    ) {
      collaborators.add(signal.agentId)
    }
  }

  let confidence: 'high' | 'medium' | 'low' = 'low'
  if (deliverableType !== 'status-report') {
    const patternMatches = spec.patterns.filter((pattern) => pattern.test(lower)).length
    confidence = patternMatches >= 2 ? 'high' : patternMatches === 1 ? 'medium' : 'low'
  }

  const routedAgent = input.agents.find((agent) => agent.id === routedAgentId)
  const collaboratorNames = Array.from(collaborators)
    .map((id) => input.agents.find((agent) => agent.id === id)?.name || id)
    .join(', ')

  let routingReason = 'Iris handled this request directly.'
  if (routedAgent && deliverableType !== 'status-report') {
    routingReason = `Iris identified this as ${spec.label.toLowerCase()} work and routed it to ${routedAgent.name} (${routedAgent.role}) as lead.`
    if (collaborators.size > 0) {
      routingReason += ` Supporting: ${collaboratorNames}.`
    }
  }

  return {
    routedAgentId,
    routingReason,
    clientId: client?.id,
    deliverableType,
    collaboratorAgentIds: Array.from(collaborators),
    pipelineId: spec.pipelineId,
    confidence,
  }
}

export function inferDeliverableType(content: string): DeliverableType {
  const lower = content.toLowerCase()

  const strategySignalCount = [
    'target audience',
    'audience research',
    'market analysis',
    'customer insight',
    'value proposition',
    'what value are they seeking',
    'what do they want',
    'why they are not buying',
    "why they're not buying",
    'strategic messages',
    'message pillars',
    'messaging',
    'positioning',
    'strategic plan',
  ].filter((signal) => lower.includes(signal)).length

  const researchSignalCount = [
    'research',
    'analysis',
    'competitor',
    'benchmark',
    'data',
    'insight',
    'trend',
    'landscape',
    'audit',
    'report',
  ].filter((signal) => lower.includes(signal)).length

  if (strategySignalCount >= 3) {
    return lower.includes('research') || lower.includes('analysis') ? 'research-brief' : 'strategy-brief'
  }

  const candidates = SERVER_DELIVERABLE_REGISTRY
    .filter((spec) => spec.patterns.length > 0)
    .sort((a, b) => b.priority - a.priority)

  let bestId: DeliverableType = 'status-report'
  let bestScore = 0

  for (const spec of candidates) {
    let score = 0

    for (const pattern of spec.patterns) {
      const matches = lower.match(pattern)
      if (matches) {
        score += 10
        score += (matches[0]?.length || 0) * 0.5
      }
    }

    if (spec.id === 'creative-asset' && score > 0) {
      if (!/\b(post|caption|instagram|facebook|linkedin|social|ad|banner|display|poster|creative|visual|image|artwork|design)\b/.test(lower)) {
        score *= 0.35
      }
      if (strategySignalCount >= 2) score *= 0.3
    }

    if (spec.id === 'short-form-copy' && score > 0) {
      score += 5
    }

    if (spec.id === 'campaign-copy' && /\b(strategy|plan|planning|strategic)\b/.test(lower)) {
      score *= 0.6
    }

    if (spec.id === 'campaign-strategy' && /\b(write|draft|copy|caption|post)\b/.test(lower) && !/\b(strategy|plan|strategic)\b/.test(lower)) {
      score *= 0.5
    }

    if (spec.id === 'creative-asset' && researchSignalCount >= 2) {
      score *= 0.5
    }

    if (score > bestScore) {
      bestScore = score
      bestId = spec.id
    }
  }

  if (bestScore < 5) {
    return isSubstantiveServerRequest(lower) ? 'general-task' : 'status-report'
  }

  return bestId
}

export interface PipelineHint {
  id: string
  name: string
  description: string
  confidence: 'high' | 'medium' | 'low'
  phases: string[]
  estimatedDuration: string
  clientProfileFields: Array<{ id: string; label: string; type: string; required: boolean }>
}

export function inferPipeline(content: string, pipelines: any[]): PipelineHint | null {
  const lower = content.toLowerCase()
  let bestMatch: { pipelineId: string; matchCount: number; specificity: number } | null = null

  for (const spec of SERVER_DELIVERABLE_REGISTRY) {
    if (!spec.pipelineId || !spec.pipelineKeywords.length) continue

    let matchCount = 0
    let totalMatchLength = 0

    for (const keyword of spec.pipelineKeywords) {
      if (lower.includes(keyword)) {
        matchCount += 1
        totalMatchLength += keyword.length
      }
    }

    if (matchCount > 0) {
      const specificity = totalMatchLength / spec.pipelineKeywords.length
      if (
        !bestMatch ||
        matchCount > bestMatch.matchCount ||
        (matchCount === bestMatch.matchCount && specificity > bestMatch.specificity)
      ) {
        bestMatch = { pipelineId: spec.pipelineId, matchCount, specificity }
      }
    }
  }

  if (!bestMatch) return null

  const pipeline = pipelines.find((p: any) => p.id === bestMatch!.pipelineId)
  if (!pipeline) return null

  const confidence: 'high' | 'medium' | 'low' =
    bestMatch.matchCount >= 3 ? 'high' : bestMatch.matchCount >= 2 ? 'medium' : 'low'

  return {
    id: pipeline.id,
    name: pipeline.name,
    description: pipeline.description,
    confidence,
    phases: pipeline.phases.map((p: any) => p.name),
    estimatedDuration: pipeline.estimatedDuration,
    clientProfileFields: pipeline.clientProfileFields || [],
  }
}

export function buildExecutionPrompt(input: {
  userRequest: string
  deliverableType: DeliverableType
  routedAgentName?: string
  routedAgentSpecialty?: string
  collaboratorAgents?: Array<{ name: string; role: string; specialty?: string }>
  clientName?: string
  clientContext?: string
  clientIndustry?: string
  clientToneOfVoice?: string
  clientTargetAudiences?: string
  clientBrandPromise?: string
  clientKeyMessages?: string
  pipelineName?: string
  briefFields?: Record<string, unknown>
}) {
  const lead = input.routedAgentName || 'the assigned specialist'
  const spec = getServerDeliverableSpec(input.deliverableType)
  const instructions = getDeliverableOutputSpec(input.deliverableType, input.userRequest)

  const lines: string[] = [
    '# Execution Brief',
    '',
    `Lead specialist: ${lead}${input.routedAgentSpecialty ? ` (${input.routedAgentSpecialty})` : ''}`,
  ]

  if (input.collaboratorAgents?.length) {
    lines.push('Supporting team:')
    for (const agent of input.collaboratorAgents) {
      lines.push(`- ${agent.name} (${agent.role}${agent.specialty ? ` — ${agent.specialty}` : ''})`)
    }
  }

  lines.push(input.clientName ? `Client: ${input.clientName}` : 'Client: not specified')
  lines.push(`Deliverable type: ${spec.label} (${spec.id})`)
  lines.push(`Category: ${spec.category}`)
  if (input.pipelineName) lines.push(`Pipeline: ${input.pipelineName}`)
  lines.push('')

  const hasClientContext =
    input.clientContext ||
    input.clientIndustry ||
    input.clientToneOfVoice ||
    input.clientTargetAudiences ||
    input.clientBrandPromise ||
    input.clientKeyMessages

  if (hasClientContext) {
    lines.push('## Client Context')
    if (input.clientIndustry) lines.push(`Industry: ${input.clientIndustry}`)
    if (input.clientBrandPromise) lines.push(`Brand Promise: ${input.clientBrandPromise}`)
    if (input.clientTargetAudiences) lines.push(`Target Audiences: ${input.clientTargetAudiences}`)
    if (input.clientToneOfVoice) lines.push(`Tone of Voice: ${input.clientToneOfVoice}`)
    if (input.clientKeyMessages) lines.push(`Key Messages: ${input.clientKeyMessages}`)
    if (input.clientContext) lines.push(`Additional Context: ${input.clientContext}`)
    lines.push('')
  }

  if (input.briefFields && Object.keys(input.briefFields).length > 0) {
    lines.push('## Confirmed Brief')
    for (const [key, value] of Object.entries(input.briefFields)) {
      if (value !== undefined && value !== null && value !== '') {
        lines.push(`- ${key}: ${Array.isArray(value) ? value.join(' + ') : String(value)}`)
      }
    }
    lines.push('')
  }

  lines.push('## Output Specification')
  lines.push(instructions)
  lines.push('')

  if (spec.executionHints.length) {
    lines.push(`## Quality Guidelines for ${spec.label}`)
    for (const hint of spec.executionHints) {
      lines.push(`- ${hint}`)
    }
    lines.push('')
  }

  lines.push('## Execution Rules')
  lines.push('Do not answer with "task routed", "lead agent", "status", "delivery", or project-management boilerplate when the user asked for a deliverable.')
  lines.push('Produce the actual draft output itself unless the user explicitly asked for planning only.')
  lines.push('Assume the task starts now. Do not describe that you will do the work later. Do the work in the answer.')
  lines.push('Make the result specific to the client, industry, audience, and product context provided.')
  lines.push('Do not invent file paths, exports, delivery actions, inbox sends, or deadlines unless explicitly provided in context.')
  lines.push('Use only real agent names from context. Do not invent team members.')
  lines.push('If work is still a draft, say it is a draft.')

  if (spec.complexity === 'high') {
    lines.push('This is a complex deliverable. Be thorough, structured, and decision-ready.')
  } else if (spec.complexity === 'low') {
    lines.push('Keep the output concise and focused. Do not over-explain.')
  }

  lines.push('')
  lines.push('## User Request')
  lines.push(input.userRequest)

  return lines.join('\n')
}
