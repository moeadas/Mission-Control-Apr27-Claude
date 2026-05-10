import { AIProvider, DeliverableType } from '@/lib/types'
import { getDeliverableOutputSpec } from '@/lib/task-output'

type VerifyPayload =
  | { provider: 'ollama'; baseUrl: string; apiKey?: string }
  | { provider: 'gemini'; apiKey: string }
  | { provider: 'gemini-image'; apiKey: string; model?: string }
  | { provider: 'anthropic'; apiKey: string }
  | { provider: 'openai'; apiKey: string; baseUrl?: string }

export async function verifyProvider(payload: VerifyPayload) {
  // ── Ollama ──────────────────────────────────────────────────────────────────
  if (payload.provider === 'ollama') {
    const baseUrl = (payload.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/$/, '')
    const headers: Record<string, string> = {}
    if (payload.apiKey) headers['Authorization'] = `Bearer ${payload.apiKey}`
    const response = await fetch(`${baseUrl}/api/tags`, { headers })
    if (!response.ok) throw new Error('Could not reach Ollama. Check the URL and API key.')
    const data = await response.json()
    const models = Array.isArray(data.models) ? data.models.map((m: { name: string }) => m.name) : []
    return { ok: true, models }
  }

  // ── Anthropic ───────────────────────────────────────────────────────────────
  if (payload.provider === 'anthropic') {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': payload.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 16,
        messages: [{ role: 'user', content: 'Reply with exactly: ready.' }],
      }),
    })
    if (!response.ok) {
      const text = await response.text()
      throw new Error(text || 'Anthropic API key verification failed.')
    }
    return {
      ok: true,
      models: ['claude-opus-4-5', 'claude-sonnet-4-5', 'claude-haiku-4-5'],
    }
  }

  // ── OpenAI ──────────────────────────────────────────────────────────────────
  if (payload.provider === 'openai') {
    const base = (payload.baseUrl || 'https://api.openai.com').replace(/\/$/, '')
    const response = await fetch(`${base}/v1/models`, {
      headers: { Authorization: `Bearer ${payload.apiKey}` },
    })
    if (!response.ok) {
      const text = await response.text()
      throw new Error(text || 'OpenAI API key verification failed.')
    }
    const data = await response.json()
    const models = Array.isArray(data.data)
      ? data.data
          .map((m: { id: string }) => m.id)
          .filter((id: string) => id.startsWith('gpt'))
          .slice(0, 20)
      : ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo']
    return { ok: true, models }
  }

  // ── Gemini ──────────────────────────────────────────────────────────────────
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${payload.apiKey}`)
  if (!response.ok) throw new Error('Gemini API key verification failed.')
  const data = await response.json()
  const models = Array.isArray(data.models)
    ? data.models.map((model: { name?: string }) => model.name?.replace('models/', '')).filter(Boolean)
    : []
  const testModel = models.find((model: string) => model.includes('gemini-2.5-flash')) || models[0]
  if (!testModel) throw new Error('Gemini API key is valid, but no text model is available.')

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
  const sample = testData.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || '').join('').trim() || ''
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

export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
}

export interface GenerateTextResult {
  text: string
  usage: TokenUsage
}

type GenerateTextInput = {
  provider: AIProvider
  model: string
  messages: Message[]
  temperature: number
  maxTokens: number
  ollamaBaseUrl?: string
  ollamaContextWindow?: number
  ollamaApiKey?: string
  geminiApiKey?: string
  anthropicApiKey?: string
  openAiApiKey?: string
  openAiBaseUrl?: string
  timeoutMs?: number
}

/**
 * generateTextWithUsage — full result including token usage for cost tracking.
 * Use this in execution paths (chat, /run, /tick) where you want to log tokens.
 */
export async function generateTextWithUsage(input: GenerateTextInput): Promise<GenerateTextResult> {
  // Bumped both defaults to 120s. Content-heavy chunks (calendar posts,
  // long copy) regularly need 60s+ on Ollama; Gemini's previous 45s was
  // tripping abort errors on /tasks/<id> retries before the model finished
  // streaming. The runtime caller can still pass a tighter timeoutMs when
  // it knows the chunk is small (e.g. selection/scheduling stages).
  const timeoutMs = input.timeoutMs || 120000
  const createAbortSignal = () => AbortSignal.timeout(timeoutMs)

  // ── Anthropic ────────────────────────────────────────────────────────────────
  if (input.provider === 'anthropic') {
    const apiKey = input.anthropicApiKey || process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('Anthropic API key missing.')

    const systemMessage = input.messages.find((m) => m.role === 'system')
    const conversationMessages = input.messages.filter((m) => m.role !== 'system')

    const body: Record<string, unknown> = {
      model: input.model,
      max_tokens: input.maxTokens,
      temperature: input.temperature,
      messages: conversationMessages.map((m) => ({ role: m.role, content: m.content })),
    }
    if (systemMessage) body.system = systemMessage.content

    let response: Response
    try {
      response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: createAbortSignal(),
      })
    } catch (error) {
      if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
        throw normalizeProviderError('anthropic', 504, `Anthropic request timed out after ${Math.round(timeoutMs / 1000)} seconds.`)
      }
      throw error
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw normalizeProviderError('anthropic', response.status, text)
    }

    const data = await response.json()
    const text = (data.content as Array<{ type: string; text?: string }>)
      ?.filter((b) => b.type === 'text')
      .map((b) => b.text || '')
      .join('') || ''
    const inputTokens = data.usage?.input_tokens ?? 0
    const outputTokens = data.usage?.output_tokens ?? 0
    return { text, usage: { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens } }
  }

  // ── OpenAI ───────────────────────────────────────────────────────────────────
  if (input.provider === 'openai') {
    const apiKey = input.openAiApiKey || process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error('OpenAI API key missing.')
    const baseUrl = (input.openAiBaseUrl || 'https://api.openai.com').replace(/\/$/, '')

    const body = {
      model: input.model,
      max_tokens: input.maxTokens,
      temperature: input.temperature,
      messages: input.messages.map((m) => ({ role: m.role, content: m.content })),
    }

    let response: Response
    try {
      response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: createAbortSignal(),
      })
    } catch (error) {
      if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
        throw normalizeProviderError('openai', 504, `OpenAI request timed out after ${Math.round(timeoutMs / 1000)} seconds.`)
      }
      throw error
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw normalizeProviderError('openai', response.status, text)
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content || ''
    const inputTokens = data.usage?.prompt_tokens ?? 0
    const outputTokens = data.usage?.completion_tokens ?? 0
    return { text, usage: { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens } }
  }

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

    let response: Response
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${input.model}:generateContent?key=${input.geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: createAbortSignal(),
        }
      )
    } catch (error) {
      // Wrap raw timeout errors so callers get the same friendly
      // ProviderError shape as Ollama. Without this, the bare
      // `TimeoutError: The operation was aborted due to timeout` surfaces
      // straight into task_runs.errorMessage and the task UI.
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw normalizeProviderError(
          'gemini',
          504,
          `Gemini request timed out after ${Math.round(timeoutMs / 1000)} seconds. ` +
            `The prompt may be too large for the chosen model, or the network is slow. ` +
            `Try a shorter prompt or switch the runtime mode in Settings.`
        )
      }
      if (error instanceof Error && (error.name === 'AbortError' || error.message?.includes('aborted'))) {
        throw normalizeProviderError('gemini', 499, `Gemini request was aborted before completion.`)
      }
      throw error
    }

    if (!response.ok) {
      const text = await response.text()
      throw normalizeProviderError('gemini', response.status, text)
    }

    const data = await response.json()
    const text =
      data.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || '').join('') || ''
    const inputTokens = data.usageMetadata?.promptTokenCount ?? 0
    const outputTokens = data.usageMetadata?.candidatesTokenCount ?? 0
    return { text, usage: { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens } }
  }

  // Priority: per-user setting → OLLAMA_BASE_URL env var → localhost fallback
  // On VPS/Docker, set OLLAMA_BASE_URL=http://host.docker.internal:11434 in docker-compose.yml
  const baseUrl = (input.ollamaBaseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/$/, '')
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

  const ollamaHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
  const ollamaApiKey = input.ollamaApiKey
  if (ollamaApiKey) ollamaHeaders['Authorization'] = `Bearer ${ollamaApiKey}`

  let response: Response
  try {
    response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: ollamaHeaders,
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
        headers: ollamaHeaders,
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
  const text = data.message?.content || ''
  const inputTokens = data.prompt_eval_count ?? 0
  const outputTokens = data.eval_count ?? 0
  return { text, usage: { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens } }
}

/**
 * generateText — backward-compatible wrapper.
 * All existing callers that only need the text string can keep using this.
 * New code that needs token tracking should use generateTextWithUsage().
 */
export async function generateText(input: GenerateTextInput): Promise<string> {
  const result = await generateTextWithUsage(input)
  return result.text
}

export function getFriendlyProviderError(error: unknown) {
  if (error instanceof ProviderError) {
    const msg = error.message?.toLowerCase() || ''
    const isTimeout = error.status === 504 || msg.includes('timed out') || msg.includes('aborted')

    if (error.provider === 'gemini') {
      if (isTimeout) {
        return (
          'Gemini timed out before returning a response. ' +
          'This usually means the prompt was too large or the network was slow. Try one of: ' +
          '(1) re-run the request, (2) reduce the max tokens for the agent in /agents, ' +
          '(3) switch to gemini-2.5-flash in Settings for faster responses on this content type.'
        )
      }
      if (error.status === 429 || error.code === 'RESOURCE_EXHAUSTED') {
        return 'Gemini quota is exhausted right now. Enable Ollama as a fallback, switch Iris to an Ollama model, or check Gemini billing and rate limits.'
      }
      return 'Gemini is unavailable right now. Check the API key, billing, or quota.'
    }
    if (error.provider === 'ollama') {
      if (isTimeout) {
        return (
          'Ollama timed out before returning a response. ' +
          'The local model is taking longer than the configured limit. Try one of: ' +
          '(1) re-run the request, (2) lower the max tokens for the agent in /agents, ' +
          '(3) switch to a faster model in Settings, ' +
          '(4) make sure no other heavy job is competing for the GPU/CPU.'
        )
      }
      if (msg.includes('econnrefused') || msg.includes('fetch failed') || msg.includes('network') || msg.includes('etimedout')) {
        return 'Ollama is unavailable right now. Make sure your local Ollama server is running.'
      }
      if (error.status === 500 || msg.includes('internal server error')) {
        return "Ollama model error — the conversation may be too long for the model's context window. Try starting a new chat, or switch to a model with a larger context in Settings."
      }
      return `Ollama error: ${error.message || 'Unknown error. Check that Ollama is running and the model is available.'}`
    }
    if (error.provider === 'anthropic') {
      if (isTimeout) return 'Anthropic timed out before returning a response. Re-run the task or switch to a faster model.'
      if (error.status === 401) return 'Anthropic API key is invalid or expired. Update it in Settings → AI Providers.'
      if (error.status === 429) return 'Anthropic rate limit hit. Wait a moment and retry, or upgrade your Anthropic plan.'
      if (error.status === 529) return 'Anthropic is overloaded right now. Retry in a moment.'
      return `Anthropic error: ${error.message || 'Unknown error.'}`
    }
    if (error.provider === 'openai') {
      if (isTimeout) return 'OpenAI timed out before returning a response. Re-run the task or switch to a faster model.'
      if (error.status === 401) return 'OpenAI API key is invalid or expired. Update it in Settings → AI Providers.'
      if (error.status === 429) return 'OpenAI rate limit hit. Wait a moment and retry, or check your OpenAI usage limits.'
      return `OpenAI error: ${error.message || 'Unknown error.'}`
    }
  }

  // Catch raw TimeoutError / AbortError from any unwrapped fetch path so
  // the user never sees the bare "operation was aborted due to timeout".
  if (error instanceof Error) {
    const name = error.name || ''
    const message = error.message || ''
    if (name === 'TimeoutError' || message.toLowerCase().includes('aborted due to timeout')) {
      return (
        'The request timed out before the model finished. ' +
        'Try re-running the task, lowering max tokens, or switching to a faster model in Settings.'
      )
    }
    if (name === 'AbortError' || message.toLowerCase().includes('aborted')) {
      return 'The request was aborted before completion. Re-run the task to retry.'
    }
    return message
  }

  return 'Chat request failed.'
}

// ---------------------------------------------------------------------------
// Deliverable / routing / pipeline inference is now owned by the canonical
// classifier module (`@/lib/intents/intent-classifier`). The exports below
// preserve the previous public API of this file (getServerDeliverableSpec,
// inferDeliverableType, inferRoutingContext, inferPipeline, RoutingContext,
// PipelineHint) so chat/route.ts, autonomous-task.ts, and task-channeling.ts
// keep working unchanged. Callers may also import from the canonical module
// directly.
// ---------------------------------------------------------------------------
import {
  DELIVERABLE_REGISTRY as CANONICAL_DELIVERABLE_REGISTRY,
  getDeliverableSpec as canonicalGetDeliverableSpec,
  inferDeliverableType as canonicalInferDeliverableType,
  inferPipelineHint as canonicalInferPipelineHint,
  inferRoutingContext as canonicalInferRoutingContext,
  type DeliverableSpec as CanonicalDeliverableSpec,
  type PipelineHint as CanonicalPipelineHint,
  type RoutingContext as CanonicalRoutingContext,
} from '@/lib/intents/intent-classifier'

type ServerDeliverableSpec = CanonicalDeliverableSpec
const SERVER_DELIVERABLE_REGISTRY = CANONICAL_DELIVERABLE_REGISTRY

export type RoutingContext = CanonicalRoutingContext
export type PipelineHint = CanonicalPipelineHint

export function getServerDeliverableSpec(id: DeliverableType | string): ServerDeliverableSpec {
  return canonicalGetDeliverableSpec(id)
}

export function inferDeliverableType(content: string): DeliverableType {
  return canonicalInferDeliverableType(content)
}

export function inferRoutingContext(input: {
  content: string
  clientHints: { id: string; name: string; industry: string }[]
  agents: { id: string; name: string; specialty: string; role: string; skills?: string[] }[]
}): RoutingContext {
  return canonicalInferRoutingContext(input)
}

export function inferPipeline(content: string, pipelines: any[]): PipelineHint | null {
  return canonicalInferPipelineHint(content, pipelines as any)
}

// Suppress an unused-symbol warning for TypeScript while keeping the alias
// around in case any downstream code reaches for the registry directly.
void SERVER_DELIVERABLE_REGISTRY
void {} as ServerDeliverableSpec | undefined



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
