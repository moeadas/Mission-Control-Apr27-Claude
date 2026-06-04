import { NextRequest, NextResponse } from 'next/server'
import { resolveAuthContextFromToken, getAuthTokenFromRequest } from '@/lib/auth/server'
import { normalizeProviderSettings, resolveTaskRuntime } from '@/lib/provider-settings'
import { generateText } from '@/lib/server/ai'
import { analyzeMetaCampaign } from '@/lib/meta-ads-intelligence'

function getBearerToken(r: NextRequest) {
  // Batch P.2: cookie OR bearer. Local wrapper kept so call sites don't change.
  return getAuthTokenFromRequest(r)
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
    const { insights = [], campaigns = [], clientContext = '', market = 'JO', ruleFindings = [] } = body

    if (!insights.length && !campaigns.length) {
      return NextResponse.json({ error: 'No campaign data provided' }, { status: 400 })
    }

    const settings = normalizeProviderSettings(auth.providerSettings)
    const runtime = resolveTaskRuntime({ settings, deliverableType: 'data-analysis' })

    const generatedFindings = Array.isArray(ruleFindings) && ruleFindings.length
      ? ruleFindings
      : (campaigns || []).map((campaign: any) => {
          const insight = (insights || []).find((row: any) => row.campaign_id === campaign.id || row.campaign_id === campaign.campaign_id)
          const analysis = analyzeMetaCampaign(insight, campaign, market)
          return {
            campaignId: campaign.id || campaign.campaign_id,
            campaignName: campaign.name || campaign.campaign_name,
            objective: campaign.objective,
            objectiveFamily: analysis.objectiveFamily,
            market: analysis.benchmark.country,
            score: analysis.score,
            suggestions: analysis.suggestions.slice(0, 5),
          }
        })
    const dataStr = JSON.stringify({ campaigns, insights, market, ruleFindings: generatedFindings }, null, 2)
    const prompt = `You are a senior performance marketing strategist. Analyse the following Meta Ads campaign data and produce concise, actionable optimisation recommendations.

${clientContext ? `Client context: ${clientContext}\n` : ''}Campaign data:
${dataStr.slice(0, 8000)}

Important:
- Respect each campaign objective family. Do not criticize awareness campaigns for missing purchases or lead campaigns for missing ROAS.
- Use the provided market benchmarks and rule findings as the primary evidence.
- Prioritize platform-rule issues, tracking issues, objective mismatch, creative fatigue, budget scale opportunities, and local market efficiency.

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

    return NextResponse.json({ ok: true, ruleFindings: generatedFindings, ...parsed })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Optimisation failed' }, { status: 500 })
  }
}
