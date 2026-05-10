import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db/client'
import { resolveAuthContextFromToken } from '@/lib/auth/server'
import { generateTextWithUsage } from '@/lib/server/ai'
import { normalizeProviderSettings, resolveTaskRuntime } from '@/lib/provider-settings'
import { logTokenUsage } from '@/lib/server/token-logger'
// auth.providerSettings is already loaded from provider-secrets in resolveAuthContextFromToken

function getBearerToken(req: NextRequest) {
  const h = req.headers.get('authorization') || ''
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : null
}

function computeNextRunAt(task: {
  frequency: string
  day_of_week?: number | null
  day_of_month?: number | null
  time_hour: number
  time_minute: number
}): Date | null {
  if (task.frequency === 'once') return null

  const now = new Date()
  const next = new Date(now)
  next.setSeconds(0, 0)
  next.setHours(task.time_hour, task.time_minute, 0, 0)

  if (task.frequency === 'daily') {
    if (next <= now) next.setDate(next.getDate() + 1)
    return next
  }

  if (task.frequency === 'weekly') {
    const target = task.day_of_week ?? 1
    const current = next.getDay()
    let daysUntil = target - current
    if (daysUntil < 0) daysUntil += 7
    if (daysUntil === 0 && next <= now) daysUntil = 7
    next.setDate(next.getDate() + daysUntil)
    return next
  }

  if (task.frequency === 'monthly') {
    const dom = task.day_of_month ?? 1
    next.setDate(dom)
    if (next <= now) next.setMonth(next.getMonth() + 1, dom)
    return next
  }

  return null
}

/** Build a system prompt for an agent given its DB row */
function buildAgentSystemPrompt(agent: any, taskType: string): string {
  const role = agent?.role || 'AI assistant'
  const specialty = agent?.specialty || ''
  const name = agent?.name || 'Iris'

  const taskContext: Record<string, string> = {
    'competitor-research': 'You are conducting a competitor research analysis. Provide detailed, actionable insights about competitor positioning, messaging, content strategy, and gaps you identify.',
    'seo-audit': 'You are conducting an SEO audit. Analyze on-page factors, content quality, keyword opportunities, technical issues, and provide specific recommendations.',
    'content-calendar': 'You are creating a content calendar. Generate structured, platform-specific content ideas with hooks, formats, posting times, and engagement strategies.',
    'performance-report': 'You are generating a performance report. Analyze metrics, identify trends, highlight wins and areas for improvement, provide actionable recommendations.',
    'social-posts': 'You are generating a batch of social media posts. Each post should be platform-optimized, engaging, and include hooks, body copy, and calls to action.',
    'campaign-brief': 'You are writing a campaign brief. Cover objectives, target audience, messaging pillars, channel strategy, success metrics, and budget considerations.',
    'email-campaign': 'You are writing an email campaign. Include subject line variations, preview text, compelling body copy, and a clear call to action.',
    'custom': '',
  }

  const taskInstruction = taskContext[taskType] || taskContext['custom']

  return [
    `You are ${name}, a ${role}${specialty ? ` specialising in ${specialty}` : ''}.`,
    taskInstruction,
    'Be thorough, professional, and output well-structured content. Use markdown formatting for headings and lists where appropriate.',
    agent?.systemPrompt ? `\n---\nAdditional context:\n${agent.systemPrompt}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')
}

type RouteContext = { params: Promise<{ id: string }> }

// ─── POST /api/scheduled-tasks/[id]/run ───────────────────────────────────────

export async function POST(req: NextRequest, ctx: RouteContext) {
  const auth = await resolveAuthContextFromToken(getBearerToken(req))
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await ctx.params
  const db = getDb()

  // Load the task
  const [task] = await db`
    SELECT * FROM scheduled_tasks
    WHERE id = ${id} AND tenant_id = ${auth.tenantId}
  `
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Mark as running (optimistic)
  await db`
    UPDATE scheduled_tasks
    SET last_run_at = now(), updated_at = now()
    WHERE id = ${id}
  `

  try {
    // Load agent if assigned
    let agent: any = null
    if (task.agent_id) {
      const [a] = await db`SELECT * FROM agents WHERE id = ${task.agent_id} LIMIT 1`
      agent = a || null
    }

    // Resolve provider settings — agent's assigned provider/model takes priority
    const settings = normalizeProviderSettings(auth.providerSettings)
    const { provider, model } = resolveTaskRuntime({
      settings,
      deliverableType: task.task_type,
      agentProvider: agent?.provider ?? null,
      agentModel: agent?.model ?? null,
    })

    const systemPrompt = buildAgentSystemPrompt(agent, task.task_type)

    const { text: output, usage } = await generateTextWithUsage({
      provider,
      model,
      temperature: agent?.temperature ?? 0.7,
      maxTokens: agent?.max_tokens ?? 4096,
      ollamaBaseUrl: settings?.ollama?.baseUrl,
      ollamaContextWindow: settings?.ollama?.contextWindow,
      ollamaApiKey: settings?.ollama?.apiKey,
      geminiApiKey: settings?.gemini?.apiKey,
      anthropicApiKey: settings?.anthropic?.apiKey,
      openAiApiKey: settings?.openai?.apiKey,
      openAiBaseUrl: settings?.openai?.baseUrl,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: task.prompt },
      ],
    })

    // Log token usage (fire-and-forget, never blocks)
    logTokenUsage(db, {
      tenantId: auth.tenantId,
      agentId: task.agent_id ?? null,
      sourceType: 'scheduled',
      sourceId: task.id,
      provider,
      model,
      usage,
    })

    // Compute next run
    const nextRunAt = computeNextRunAt(task as any)

    // Persist success
    const [updated] = await db`
      UPDATE scheduled_tasks
      SET
        last_run_at      = now(),
        last_run_status  = 'success',
        last_run_output  = ${output},
        run_count        = run_count + 1,
        next_run_at      = ${nextRunAt?.toISOString() ?? null},
        status           = CASE WHEN frequency = 'once' THEN 'completed' ELSE status END,
        updated_at       = now()
      WHERE id = ${id}
      RETURNING *
    `

    return NextResponse.json({ task: updated, output, usage })
  } catch (err: any) {
    const errMsg = err?.message || 'Unknown execution error'
    console.error('[scheduled-tasks/run]', errMsg)

    await db`
      UPDATE scheduled_tasks
      SET
        last_run_status  = 'error',
        last_run_output  = ${errMsg},
        run_count        = run_count + 1,
        updated_at       = now()
      WHERE id = ${id}
    `

    return NextResponse.json({ error: errMsg }, { status: 500 })
  }
}
