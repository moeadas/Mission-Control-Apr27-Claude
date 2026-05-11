/**
 * GET /api/scheduled-tasks/tick
 *
 * Called every minute by a VPS crontab:
 *   * * * * * curl -sf -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/scheduled-tasks/tick
 *
 * Finds all active tasks whose next_run_at <= now, then fires each one.
 * Uses the agent's assigned provider/model as priority 0 in routing.
 * Logs token usage after each run.
 *
 * Auth: Bearer token must match CRON_SECRET env var.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db/client'
import { generateTextWithUsage } from '@/lib/server/ai'
import { normalizeProviderSettings, resolveTaskRuntime } from '@/lib/provider-settings'
import { loadPersistedProviderSettings } from '@/lib/server/provider-secrets'
import { logTokenUsage } from '@/lib/server/token-logger'

export const dynamic = 'force-dynamic'

function buildAgentSystemPrompt(agent: any, taskType: string): string {
  const role = agent?.role || 'AI assistant'
  const specialty = agent?.specialty || ''
  const name = agent?.name || 'Iris'

  const taskContext: Record<string, string> = {
    'competitor-research': 'You are conducting a competitor research analysis. Provide detailed, actionable insights about competitor positioning, messaging, content strategy, and gaps.',
    'seo-audit': 'You are conducting an SEO audit. Analyse on-page factors, content quality, keyword opportunities, and technical issues with specific recommendations.',
    'content-calendar': 'You are creating a content calendar. Generate structured, platform-specific content ideas with hooks, formats, and posting schedules.',
    'performance-report': 'You are generating a performance report. Analyse metrics, highlight wins and areas for improvement, provide actionable next steps.',
    'social-posts': 'You are generating a batch of social media posts. Each post should be platform-optimised, engaging, with hooks, body copy, and calls to action.',
    'campaign-brief': 'You are writing a campaign brief. Cover objectives, target audience, messaging pillars, channel strategy, and success metrics.',
    'email-campaign': 'You are writing an email campaign with subject line variations, preview text, compelling body copy, and a clear call to action.',
    'custom': '',
  }

  return [
    `You are ${name}, a ${role}${specialty ? ` specialising in ${specialty}` : ''}.`,
    taskContext[taskType] || '',
    'Be thorough, professional, and output well-structured content. Use markdown formatting where appropriate.',
    agent?.systemPrompt ? `\n---\nAdditional context:\n${agent.systemPrompt}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')
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

async function runTask(db: any, task: any) {
  await db`UPDATE scheduled_tasks SET last_run_at = now(), updated_at = now() WHERE id = ${task.id}`

  try {
    // Load agent if assigned
    let agent: any = null
    if (task.agent_id) {
      const [a] = await db`SELECT * FROM agents WHERE id = ${task.agent_id} LIMIT 1`
      agent = a || null
    }

    // Load provider settings for the tenant's owner
    // profiles.id = users.id (no separate user_id column)
    const [ownerProfile] = await db`
      SELECT u.id FROM profiles p
      JOIN users u ON u.id = p.id
      WHERE p.tenant_id = ${task.tenant_id}
      ORDER BY u.created_at ASC
      LIMIT 1
    `
    const ownerUserId = ownerProfile?.id || null
    const savedSettings = ownerUserId ? await loadPersistedProviderSettings(ownerUserId) : null
    const settings = normalizeProviderSettings(savedSettings || {})

    // Agent's assigned provider/model is highest priority
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

    // Log token usage (swallows errors)
    logTokenUsage(db, {
      tenantId: task.tenant_id,
      agentId: task.agent_id ?? null,
      sourceType: 'scheduled',
      sourceId: task.id,
      provider,
      model,
      usage,
    })

    const nextRunAt = computeNextRunAt(task as any)

    await db`
      UPDATE scheduled_tasks
      SET
        last_run_status  = 'success',
        last_run_output  = ${output},
        run_count        = run_count + 1,
        next_run_at      = ${nextRunAt?.toISOString() ?? null},
        status           = CASE WHEN frequency = 'once' THEN 'completed' ELSE status END,
        updated_at       = now()
      WHERE id = ${task.id}
    `
    return { id: task.id, status: 'success' }
  } catch (err: any) {
    const errMsg = err?.message || 'Unknown error'
    const nextRunAt = computeNextRunAt(task as any)
    await db`
      UPDATE scheduled_tasks
      SET last_run_status = 'error',
          last_run_output = ${errMsg},
          run_count       = run_count + 1,
          next_run_at     = ${nextRunAt?.toISOString() ?? null},
          updated_at      = now()
      WHERE id = ${task.id}
    `
    return { id: task.id, status: 'error', error: errMsg }
  }
}

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : null

  if (!cronSecret || token !== cronSecret) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const db = getDb()

    const due = await db`
      UPDATE scheduled_tasks
      SET next_run_at = NULL
      WHERE status = 'active'
        AND next_run_at IS NOT NULL
        AND next_run_at <= now()
      RETURNING *
    `

    if (due.length === 0) {
      return NextResponse.json({ ran: 0, results: [] })
    }

    const results = await Promise.allSettled(due.map((task: any) => runTask(db, task)))
    const summary = results.map((r, i) =>
      r.status === 'fulfilled' ? r.value : { id: due[i].id, status: 'error', error: 'Promise rejected' }
    )

    console.log(`[tick] Ran ${due.length} scheduled tasks:`, summary)
    return NextResponse.json({ ran: due.length, results: summary })
  } catch (err: any) {
    console.error('[tick] Fatal error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
