/**
 * GET /api/token-usage
 *
 * Returns token usage and cost breakdown for the tenant.
 * Query params:
 *   ?period=7d|30d|all  (default: 30d)
 *   ?agentId=<id>       (optional filter)
 *
 * Response:
 * {
 *   summary: { totalTokens, totalCostUsd, inputTokens, outputTokens },
 *   byAgent: [{ agentId, totalTokens, totalCostUsd, runCount }],
 *   byModel: [{ model, provider, totalTokens, totalCostUsd, runCount }],
 *   recent: [{ id, agentId, sourceType, provider, model, totalTokens, costUsd, createdAt }]
 * }
 */
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db/client'
import { resolveAuthContextFromToken } from '@/lib/auth/server'

function getBearerToken(req: NextRequest) {
  const h = req.headers.get('authorization') || ''
  return h.toLowerCase().startsWith('bearer ') ? h.slice(7).trim() : null
}

function periodToInterval(period: string): string {
  if (period === '7d') return '7 days'
  if (period === 'all') return '10 years'
  return '30 days'
}

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await resolveAuthContextFromToken(getBearerToken(req))
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') || '30d'
  const agentId = searchParams.get('agentId') || null
  const interval = periodToInterval(period)

  try {
    const db = getDb()

    // Summary totals
    const [summary] = await db`
      SELECT
        COALESCE(SUM(input_tokens), 0)::int   AS input_tokens,
        COALESCE(SUM(output_tokens), 0)::int  AS output_tokens,
        COALESCE(SUM(total_tokens), 0)::int   AS total_tokens,
        COALESCE(SUM(cost_usd), 0)            AS total_cost_usd,
        COUNT(*)::int                          AS run_count
      FROM token_usage
      WHERE tenant_id = ${auth.tenantId}
        AND created_at >= now() - ${interval}::interval
        ${agentId ? db`AND agent_id = ${agentId}` : db``}
    `

    // Breakdown by agent
    const byAgent = await db`
      SELECT
        agent_id,
        COALESCE(SUM(total_tokens), 0)::int  AS total_tokens,
        COALESCE(SUM(cost_usd), 0)           AS total_cost_usd,
        COUNT(*)::int                         AS run_count
      FROM token_usage
      WHERE tenant_id = ${auth.tenantId}
        AND created_at >= now() - ${interval}::interval
        AND agent_id IS NOT NULL
      GROUP BY agent_id
      ORDER BY total_cost_usd DESC
    `

    // Breakdown by model
    const byModel = await db`
      SELECT
        model,
        provider,
        COALESCE(SUM(total_tokens), 0)::int  AS total_tokens,
        COALESCE(SUM(cost_usd), 0)           AS total_cost_usd,
        COUNT(*)::int                         AS run_count
      FROM token_usage
      WHERE tenant_id = ${auth.tenantId}
        AND created_at >= now() - ${interval}::interval
      GROUP BY model, provider
      ORDER BY total_cost_usd DESC
    `

    // Recent entries (last 50)
    const recent = await db`
      SELECT id, agent_id, source_type, source_id, provider, model,
             input_tokens, output_tokens, total_tokens, cost_usd, created_at
      FROM token_usage
      WHERE tenant_id = ${auth.tenantId}
        AND created_at >= now() - ${interval}::interval
        ${agentId ? db`AND agent_id = ${agentId}` : db``}
      ORDER BY created_at DESC
      LIMIT 50
    `

    return NextResponse.json({ summary, byAgent, byModel, recent })
  } catch (err: any) {
    console.error('[token-usage] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
