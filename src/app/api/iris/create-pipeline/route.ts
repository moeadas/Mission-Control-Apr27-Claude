/**
 * POST /api/iris/create-pipeline
 *
 * Iris-assisted pipeline creation. The user describes a workflow they want
 * the AI employees to follow ("plan a product launch for B2B SaaS in 4 phases"),
 * Iris drafts a structured pipeline with phases / activities / role assignments
 * and persists it into the caller's tenant.
 *
 * Body: { brief: string, autoPersist?: boolean }
 */
import { NextRequest, NextResponse } from 'next/server'

import { resolveAuthContextFromToken } from '@/lib/auth/server'
import { draftPipelineFromBrief, persistDraftedPipeline } from '@/lib/server/iris-authoring'
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
        { error: 'Too many authoring requests. Wait before asking Iris to design more pipelines.', retryAfterSeconds: rl.retryAfterSeconds },
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

    const draft = await draftPipelineFromBrief({
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

    const { id } = await persistDraftedPipeline(auth.tenantId, draft, auth.userId)
    return NextResponse.json({ ok: true, draft, persisted: true, pipelineId: id })
  } catch (err: any) {
    console.error('POST /api/iris/create-pipeline error:', err)
    return NextResponse.json({ error: err.message || 'Iris could not draft a pipeline' }, { status: 500 })
  }
}
