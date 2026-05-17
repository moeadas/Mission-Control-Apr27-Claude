/**
 * POST /api/iris/create-skill
 *
 * Iris-assisted skill creation. The user describes a capability they want the
 * AI employees to master ("teach my agents how to write FDA-compliant pharma
 * email subject lines"), Iris drafts a full skill definition (prompts,
 * workflow steps, checklist, output template) and persists it.
 *
 * Body: { brief: string, autoPersist?: boolean }
 */
import { NextRequest, NextResponse } from 'next/server'

import { resolveAuthContextFromToken } from '@/lib/auth/server'
import { draftSkillFromBrief, persistDraftedSkill } from '@/lib/server/iris-authoring'
import { checkRateLimit } from '@/lib/server/rate-limit'
import { TokenBudgetExceededError, assertTokenBudget } from '@/lib/server/token-budgets'

export const dynamic = 'force-dynamic'

function getBearerToken(req: NextRequest) {
  const h = req.headers.get('authorization') || ''
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : null
}

export async function POST(request: NextRequest) {
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(request))
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!auth.tenantId) return NextResponse.json({ error: 'No tenant on session' }, { status: 400 })

    const rl = await checkRateLimit(`iris-authoring:${auth.userId}`, { limit: 20, windowSeconds: 60 * 60 })
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many authoring requests. Wait before asking Iris to design more skills.', retryAfterSeconds: rl.retryAfterSeconds },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSeconds) } }
      )
    }

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

    const draft = await draftSkillFromBrief({
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

    if (!autoPersist) return NextResponse.json({ ok: true, draft, persisted: false })

    const { id } = await persistDraftedSkill(auth.tenantId, draft, auth.userId)
    return NextResponse.json({ ok: true, draft, persisted: true, skillId: id })
  } catch (err: any) {
    console.error('POST /api/iris/create-skill error:', err)
    return NextResponse.json({ error: err.message || 'Iris could not draft a skill' }, { status: 500 })
  }
}
