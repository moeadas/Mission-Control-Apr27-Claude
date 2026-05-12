import { NextRequest, NextResponse } from 'next/server'
import { resolveAuthContextFromToken } from '@/lib/auth/server'
import { normalizeProviderSettings, resolveTaskRuntime } from '@/lib/provider-settings'
import { generateText } from '@/lib/server/ai'

function getBearerToken(r: NextRequest) {
  const h = r.headers.get('authorization') || ''
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : null
}

export const dynamic = 'force-dynamic'

/**
 * POST /api/integrations/meta/optimize
 * Body: { insights: [...], campaigns: [...], clientContext?: string }
 * Returns AI-generated optimisation suggestions based on actual campaign data.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { insights = [], campaigns = [], clientContext = '' } = body

    if (!insights.length && !campaigns.length) {
      return NextResponse.json({ error: 'No campaign data provided' }, { status: 400 })
    }

    const settings = normalizeProviderSettings(auth.providerSettings)
    const runtime = resolveTaskRuntime({ settings, deliverableType: 'data-analysis' })

    const dataStr = JSON.stringify({ campaigns, insights }, null, 2)
    const prompt = `You are a senior performance marketing strategist. Analyse the following Meta Ads campaign data and produce concise, actionable optimisation recommendations.

${clientContext ? `Client context: ${clientContext}\n` : ''}Campaign data:
${dataStr.slice(0, 8000)}

Respond with a JSON object with this exact shape:
{
  "summary": "2-3 sentence overview of account health",
  "recommendations": [
    {
      "priority": "high|medium|low",
      "category": "budget|targeting|creative|bidding|audience|schedule",
      "title": "Short action title",
      "detail": "Specific recommendation with data-backed reasoning",
      "estimatedImpact": "Expected outcome if applied"
    }
  ],
  "quickWins": ["string"],
  "watchOut": ["string"]
}

Return ONLY the JSON object, no markdown fences.`

    const text = await generateText({
      provider: runtime.provider,
      model: runtime.model,
      temperature: 0.3,
      maxTokens: 2048,
      messages: [{ role: 'user', content: prompt }],
      ollamaBaseUrl: settings.ollama.baseUrl,
      ollamaApiKey: settings.ollama.apiKey,
      geminiApiKey: settings.gemini.apiKey,
      anthropicApiKey: settings.anthropic.apiKey,
      openAiApiKey: settings.openai.apiKey,
      openAiBaseUrl: settings.openai.baseUrl,
    })

    let parsed: any
    try {
      const clean = text.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
      parsed = JSON.parse(clean)
    } catch {
      parsed = { summary: text, recommendations: [], quickWins: [], watchOut: [] }
    }

    return NextResponse.json({ ok: true, ...parsed })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Optimisation failed' }, { status: 500 })
  }
}
