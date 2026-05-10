/**
 * token-logger.ts
 *
 * Thin helper that writes a row to the `token_usage` table.
 * Call this after every generateTextWithUsage() in execution paths.
 * Failures are swallowed — logging should never break the main flow.
 */

import { calculateCost } from '@/config/model-pricing'
import type { TokenUsage } from '@/lib/server/ai'

export interface TokenLogEntry {
  tenantId: string | null
  agentId?: string | null
  /** 'chat' | 'scheduled' | 'manual' | 'pipeline' */
  sourceType: string
  /** task id, scheduled_task id, or chat session id */
  sourceId?: string | null
  provider: string
  model: string
  usage: TokenUsage
}

export async function logTokenUsage(db: any, entry: TokenLogEntry): Promise<void> {
  if (!entry.tenantId) return
  try {
    const costUsd = calculateCost(entry.model, entry.usage.inputTokens, entry.usage.outputTokens)
    await db`
      INSERT INTO token_usage
        (tenant_id, agent_id, source_type, source_id, provider, model,
         input_tokens, output_tokens, total_tokens, cost_usd)
      VALUES
        (${entry.tenantId}, ${entry.agentId ?? null}, ${entry.sourceType},
         ${entry.sourceId ?? null}, ${entry.provider}, ${entry.model},
         ${entry.usage.inputTokens}, ${entry.usage.outputTokens},
         ${entry.usage.totalTokens}, ${costUsd})
    `
  } catch (err) {
    // Never let logging failure crash the main execution
    console.error('[token-logger] Failed to log token usage:', err)
  }
}
