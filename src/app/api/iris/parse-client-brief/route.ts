import { NextRequest, NextResponse } from 'next/server'
import { generateText, getFriendlyProviderError, ProviderError } from '@/lib/server/ai'
import { resolveAuthContextFromToken } from '@/lib/auth/server'
import { normalizeProviderSettings, resolveTaskRuntime } from '@/lib/provider-settings'
import type { AIProvider } from '@/lib/types'

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || ''
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null
  return authHeader.slice(7).trim()
}

export const REQUIRED_FIELDS = ['name', 'industry', 'missionStatement']

export const CLIENT_FIELD_LABELS: Record<string, string> = {
  name: 'Client Name',
  industry: 'Industry',
  website: 'Website',
  description: 'Company Overview',
  missionStatement: 'Mission Statement',
  brandPromise: 'Brand Promise',
  targetAudiences: 'Target Audiences',
  productsAndServices: 'Products & Services',
  usp: 'Unique Selling Proposition',
  competitiveLandscape: 'Competitive Landscape',
  keyMessages: 'Key Messages',
  toneOfVoice: 'Tone of Voice',
  operationalDetails: 'Operational Details',
  objectionHandling: 'Objection Handling',
  brandIdentityNotes: 'Brand Identity Notes',
  strategicPriorities: 'Strategic Priorities',
  competitors: 'Competitors',
  notes: 'Notes',
}

const ENRICHABLE_FIELDS = [
  'website',
  'description',
  'industry',
  'missionStatement',
  'brandPromise',
  'targetAudiences',
  'productsAndServices',
  'usp',
  'competitiveLandscape',
  'keyMessages',
  'toneOfVoice',
  'strategicPriorities',
]

/**
 * Second-pass enrichment: after document extraction, ask the AI to fill in
 * any remaining empty fields using its knowledge of the company/industry.
 * This works especially well when combined with Gemini grounding.
 */
async function enrichClientBriefWithResearch(
  draft: Record<string, any>,
  providerKeys: Record<string, any>,
  runtime: { provider: string; model: string }
): Promise<Record<string, any>> {
  const name = draft.name?.trim() || ''
  if (!name) return draft

  const emptyFields = ENRICHABLE_FIELDS.filter((k) => {
    const v = draft[k]
    return !v || (typeof v === 'string' && !v.trim())
  })

  if (emptyFields.length === 0) return draft

  const alreadyFilled = Object.entries(draft)
    .filter(([k, v]) => v && typeof v === 'string' && v.trim() && k !== 'notes')
    .map(([k, v]) => `${k}: ${String(v).slice(0, 300)}`)
    .join('\n')

  const prompt = `You are a business analyst building a marketing agency client profile for "${name}".

Using your knowledge of this company and industry, fill in the following missing profile fields as accurately and completely as possible. For fields you cannot determine precisely, use reasonable industry-informed estimates — do not leave fields blank.

Already extracted from their documents:
${alreadyFilled || '(only company name is known)'}

Fill in ONLY these missing fields — return as valid JSON, no markdown, no explanation:
${emptyFields.map((f) => `"${f}": string`).join('\n')}
"competitors": array of competitor company names (add or supplement existing list)

JSON only:`

  try {
    const raw = await generateText({
      provider: runtime.provider as AIProvider,
      model: runtime.model,
      temperature: 0.2,
      maxTokens: 2000,
      messages: [{ role: 'user', content: prompt }],
      ...providerKeys,
    })

    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim()

    const researched = JSON.parse(cleaned)
    const enriched = { ...draft }

    for (const key of emptyFields) {
      const val = researched[key]
      if (val && typeof val === 'string' && val.trim()) {
        enriched[key] = val
      }
    }

    // Merge competitors list
    if (Array.isArray(researched.competitors) && researched.competitors.length > 0) {
      const existing: string[] = Array.isArray(draft.competitors) ? draft.competitors : []
      enriched.competitors = [...new Set([...existing, ...researched.competitors.map((c: any) => String(c))])]
    }

    return enriched
  } catch (e) {
    console.error('[parse-client-brief] enrichment error:', e)
    return draft
  }
}

export async function extractClientFieldsFromText(
  briefText: string,
  providerKeys: Record<string, any>,
  runtime: { provider: string; model: string }
): Promise<{ draft: Record<string, any>; missingFields: string[] }> {
  // Detect whether there is real document content or just a placeholder reference
  const hasSubstantialContent = briefText.length > 200 &&
    !briefText.match(/^\[File:.*\]$/) &&
    !briefText.match(/^\[Image file:.*\]$/)

  const prompt = `You are extracting a structured client brief from the text below. Extract as many fields as possible from the provided content. Return ONLY valid JSON — no markdown, no code fences, no extra text.

Fields to extract:
- name: string (company/client name) — REQUIRED
- industry: string (sector or industry) — REQUIRED
- website: string (URL, or "" if not found)
- description: string (general company/brand overview)
- missionStatement: string (mission, vision, or brand philosophy) — REQUIRED
- brandPromise: string (core brand promise or value proposition)
- targetAudiences: string (target customers/audiences description)
- productsAndServices: string (products or services offered, include pricing if mentioned)
- usp: string (unique selling proposition or key differentiator)
- competitiveLandscape: string (competitor info, market position)
- keyMessages: string (key brand messages or talking points)
- toneOfVoice: string (brand voice, communication style)
- operationalDetails: string (location, team size, operational notes)
- objectionHandling: string (how to address common objections)
- brandIdentityNotes: string (colors, fonts, visual identity notes)
- strategicPriorities: string (business goals, strategic priorities)
- competitors: array of strings (list of competitor names)
- notes: string (anything else worth capturing)

Source text:
---
${briefText.slice(0, 12000)}
---

JSON only:`

  const raw = await generateText({
    provider: runtime.provider as AIProvider,
    model: runtime.model,
    temperature: 0.1,
    maxTokens: 2048,
    messages: [{ role: 'user', content: prompt }],
    ...providerKeys,
  })

  // Strip markdown fences if model wrapped output
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim()

  let draft = JSON.parse(cleaned)

  if (!Array.isArray(draft.competitors)) {
    draft.competitors = typeof draft.competitors === 'string' && draft.competitors
      ? draft.competitors.split(/[,;]/).map((s: string) => s.trim()).filter(Boolean)
      : []
  }

  // Pass 2: enrich with AI knowledge for any fields still empty.
  // Always run when content is thin (just a name). Run for rich docs too
  // as long as 3+ enrichable fields remain empty — documents rarely cover
  // all profile fields (competitive landscape, tone of voice, etc.).
  const shouldEnrich =
    !hasSubstantialContent ||
    ENRICHABLE_FIELDS.filter((k) => !draft[k] || !String(draft[k]).trim()).length >= 3

  if (shouldEnrich) {
    draft = await enrichClientBriefWithResearch(draft, providerKeys, runtime)
  }

  const missingFields = REQUIRED_FIELDS.filter((key) => {
    const val = draft[key]
    return !val || (typeof val === 'string' && !val.trim())
  })

  return { draft, missingFields }
}

export async function POST(req: NextRequest) {
  const auth = await resolveAuthContextFromToken(getBearerToken(req))
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { briefText, providerSettings } = body
  if (!briefText?.trim()) {
    return NextResponse.json({ error: 'briefText is required' }, { status: 400 })
  }

  const normalizedSettings = normalizeProviderSettings(auth.providerSettings || providerSettings)
  const runtime = resolveTaskRuntime({
    settings: normalizedSettings,
    deliverableType: 'status-report',
    requestedProvider: 'anthropic',
    requestedModel: '',
  })

  const providerKeys = {
    ollamaBaseUrl: normalizedSettings?.ollama?.baseUrl,
    ollamaContextWindow: normalizedSettings?.ollama?.contextWindow,
    ollamaApiKey: normalizedSettings?.ollama?.apiKey,
    geminiApiKey: normalizedSettings?.gemini?.apiKey,
    anthropicApiKey: normalizedSettings?.anthropic?.apiKey,
    openAiApiKey: normalizedSettings?.openai?.apiKey,
    openAiBaseUrl: normalizedSettings?.openai?.baseUrl,
  }

  try {
    const result = await extractClientFieldsFromText(briefText, providerKeys, runtime)
    return NextResponse.json(result)
  } catch (err: any) {
    console.error('[parse-client-brief]', err)
    const status = err instanceof ProviderError ? (err.status ?? 503) : 500
    return NextResponse.json({ error: getFriendlyProviderError(err) }, { status })
  }
}
