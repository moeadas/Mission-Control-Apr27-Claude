/**
 * POST /api/iris/create-agent
 *
 * Iris-assisted agent creation. The user describes the AI employee they want
 * in plain English; Iris drafts a structured agent definition (name, role,
 * skills, system prompt, etc.) and persists it into the caller's tenant.
 *
 * Body: { brief: string, autoPersist?: boolean }
 *   - autoPersist=true (default): the draft is saved as a real agent row.
 *   - autoPersist=false: returns the draft only for the user to review.
 *
 * The returned draft is editable — users refine names, prompts, skill picks
 * via the regular /agents UI before they're ready to put the agent to work.
 */
import { NextRequest, NextResponse } from 'next/server'

import { resolveAuthContextFromToken, getAuthTokenFromRequest } from '@/lib/auth/server'
import { canAddAgent, syncAgentCount } from '@/lib/server/tenants'
import { draftAgentFromBrief, persistDraftedAgent } from '@/lib/server/iris-authoring'
import { checkRateLimit } from '@/lib/server/rate-limit'
import { TokenBudgetExceededError, assertTokenBudget } from '@/lib/server/token-budgets'

export const dynamic = 'force-dynamic'

function getBearerToken(req: NextRequest) {
  // Batch P.2: cookie OR bearer. Local wrapper kept so call sites don't change.
  return getAuthTokenFromRequest(req)
}

export async function POST(request: NextRequest) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!auth.tenantId) return NextResponse.json({ error: 'No tenant on session' }, { status: 400 })

    // Each authoring call burns LLM tokens. Cap at 20 / hour / user.
    const rl = await checkRateLimit(`iris-authoring:${auth.userId}`, { limit: 20, windowSeconds: 60 * 60 })
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many authoring requests. Wait before asking Iris to design more agents.', retryAfterSeconds: rl.retryAfterSeconds },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
      )
    }

    // Hard budget check before spending LLM tokens.
    try {
      await assertTokenBudget(auth.tenantId)
    } catch (err) {
      if (err instanceof TokenBudgetExceededError) {
        return NextResponse.json(
          { error: err.message, code: err.code, budgetUsd: err.budgetUsd, usedUsd: err.usedUsd },
          { status: 402 }
        )
      }
      throw err
    }

    const body = await request.json().catch(() => ({}))
    const brief: string = (body?.brief || '').trim()
    const autoPersist: boolean = body?.autoPersist !== false
    if (!brief) return NextResponse.json({ error: 'brief is required' }, { status: 400 })
    if (brief.length > 4000) return NextResponse.json({ error: 'brief is too long (max 4000 chars)' }, { status: 400 })

    // Capacity check before spending LLM tokens.
    if (autoPersist) {
      const capacity = await canAddAgent(auth.tenantId)
      if (!capacity.allowed) {
        return NextResponse.json(
          {
            error: `Agent limit reached. Your plan allows ${capacity.limit} agents (${capacity.current}/${capacity.limit}). Upgrade or remove an agent first.`,
            code: 'AGENT_LIMIT_EXCEEDED',
            limit: capacity.limit,
            current: capacity.current,
          },
          { status: 402 }
        )
      }
    }

    const draft = await draftAgentFromBrief({
      brief,
      tenantId: auth.tenantId,
      providerSettings: auth.providerSettings,
      geminiApiKey: auth.providerSettings?.gemini?.apiKey,
      anthropicApiKey: auth.providerSettings?.anthropic?.apiKey,
      openAiApiKey: auth.providerSettings?.openai?.apiKey,
      openAiBaseUrl: auth.providerSettings?.openai?.baseUrl,
      ollamaBaseUrl: auth.providerSettings?.ollama?.baseUrl,
      ollamaApiKey: auth.providerSettings?.ollama?.apiKey,
    })

    if (!autoPersist) {
      return NextResponse.json({ ok: true, draft, persisted: false })
    }

    const { id } = await persistDraftedAgent(auth.tenantId, draft, auth.userId)
    syncAgentCount(auth.tenantId).catch(() => {})

    return NextResponse.json({ ok: true, draft, persisted: true, agentId: id })
  } catch (err: any) {
    console.error('POST /api/iris/create-agent error:', err)
    return NextResponse.json({ error: err.message || 'Iris could not draft an agent' }, { status: 500 })
  }
}
