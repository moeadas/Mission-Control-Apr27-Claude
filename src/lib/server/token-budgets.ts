/**
 * Per-tenant token-budget enforcement (Batch H)
 *
 * Budgets live on the subscriptions row:
 *   • monthly_token_budget_usd : hard cap in USD (NULL = unlimited)
 *   • monthly_token_warning_pct: soft-alert threshold (default 80%)
 *
 * Usage is the SUM of `token_usage.cost_usd` rows for the tenant within the
 * current billing cycle. If the tenant has no billing cycle yet (Stripe not
 * wired), we default to the calendar month — that's the right behaviour for
 * a tenant on a free plan during POC.
 *
 * `assertTokenBudget(tenantId)` is the call site for hot paths (chat,
 * scheduled tasks, Iris authoring). It throws a `TokenBudgetExceededError`
 * with a `code: 'TOKEN_BUDGET_EXCEEDED'` payload so route handlers can
 * convert into a 402 Payment Required.
 */
import { getDb } from '@/lib/db/client'

export class TokenBudgetExceededError extends Error {
  code: 'TOKEN_BUDGET_EXCEEDED'
  budgetUsd: number
  usedUsd: number

  constructor(opts: { budgetUsd: number; usedUsd: number }) {
    super(
      `Monthly token budget exceeded: $${opts.usedUsd.toFixed(2)} used of $${opts.budgetUsd.toFixed(2)} cap.`
    )
    this.name = 'TokenBudgetExceededError'
    this.code = 'TOKEN_BUDGET_EXCEEDED'
    this.budgetUsd = opts.budgetUsd
    this.usedUsd = opts.usedUsd
  }
}

export interface BudgetStatus {
  budgetUsd: number | null
  usedUsd: number
  remainingUsd: number | null
  warningThresholdPct: number
  exceeded: boolean
  warning: boolean
  cycleStart: Date
  cycleEnd: Date | null
}

/**
 * Resolve the billing-cycle window for a tenant. Prefers the subscription's
 * (billing_cycle_start, billing_cycle_end) pair; falls back to the calendar
 * month when Stripe hasn't set those yet.
 */
function resolveCycleWindow(sub: { billing_cycle_start: Date | null; billing_cycle_end: Date | null }): {
  cycleStart: Date
  cycleEnd: Date | null
} {
  if (sub.billing_cycle_start) {
    return {
      cycleStart: new Date(sub.billing_cycle_start),
      cycleEnd: sub.billing_cycle_end ? new Date(sub.billing_cycle_end) : null,
    }
  }
  const now = new Date()
  const cycleStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0))
  return { cycleStart, cycleEnd: null }
}

export async function getTokenBudgetStatus(tenantId: string): Promise<BudgetStatus> {
  const db = getDb()
  const subs = await db`
    SELECT monthly_token_budget_usd, monthly_token_warning_pct,
           billing_cycle_start, billing_cycle_end
    FROM subscriptions
    WHERE tenant_id = ${tenantId}::uuid
    LIMIT 1
  `
  const sub = subs[0]
  if (!sub) {
    // No subscription row → treat as unlimited (rare; backfill creates one).
    return {
      budgetUsd: null,
      usedUsd: 0,
      remainingUsd: null,
      warningThresholdPct: 80,
      exceeded: false,
      warning: false,
      cycleStart: new Date(0),
      cycleEnd: null,
    }
  }

  const budgetUsd = sub.monthly_token_budget_usd === null
    ? null
    : Number(sub.monthly_token_budget_usd)
  const warningThresholdPct = Number(sub.monthly_token_warning_pct ?? 80)
  const { cycleStart, cycleEnd } = resolveCycleWindow(sub as any)

  const usageRows = await db`
    SELECT COALESCE(SUM(cost_usd), 0)::numeric AS used
    FROM token_usage
    WHERE tenant_id = ${tenantId}::uuid
      AND created_at >= ${cycleStart.toISOString()}
      ${cycleEnd ? db`AND created_at < ${cycleEnd.toISOString()}` : db``}
  `
  const usedUsd = Number(usageRows[0]?.used ?? 0)

  if (budgetUsd === null) {
    return {
      budgetUsd: null,
      usedUsd,
      remainingUsd: null,
      warningThresholdPct,
      exceeded: false,
      warning: false,
      cycleStart,
      cycleEnd,
    }
  }

  const remainingUsd = Math.max(0, budgetUsd - usedUsd)
  return {
    budgetUsd,
    usedUsd,
    remainingUsd,
    warningThresholdPct,
    exceeded: usedUsd >= budgetUsd,
    warning: budgetUsd > 0 && (usedUsd / budgetUsd) * 100 >= warningThresholdPct,
    cycleStart,
    cycleEnd,
  }
}

/**
 * Throws `TokenBudgetExceededError` if the tenant's monthly budget is hit.
 * Call this BEFORE invoking any LLM endpoint. A best-effort guard — it can't
 * stop a generation already mid-flight, so combine with the per-task token
 * caps inside the engines.
 */
export async function assertTokenBudget(tenantId: string | null | undefined): Promise<BudgetStatus | null> {
  if (!tenantId) return null
  const status = await getTokenBudgetStatus(tenantId)
  if (status.exceeded && status.budgetUsd !== null) {
    throw new TokenBudgetExceededError({ budgetUsd: status.budgetUsd, usedUsd: status.usedUsd })
  }
  return status
}
