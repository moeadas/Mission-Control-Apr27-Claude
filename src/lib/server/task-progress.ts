/**
 * Activity-driven task progress model (Batch U)
 *
 * Replaces every hardcoded progress percentage in the codebase. Each task
 * execution is modelled as an ordered list of `Activity` records, each with:
 *   • id            — stable identifier
 *   • name          — human-readable label ("Echo drafting Instagram caption")
 *   • phase         — logical grouping ("research" / "drafting" / "polish" / "quality" / "assembly")
 *   • weight        — relative cost contribution (longer LLM calls have larger weights)
 *   • status        — "pending" | "running" | "complete" | "failed" | "skipped"
 *   • message       — current sub-action narration ("thinking about hooks")
 *
 * Progress is computed as Σ(completed weight) / Σ(all weights) — never hardcoded,
 * never regressing because Activities don't get un-completed. Activities can be
 * built from a pipeline (each phase contributes its activities) or from a
 * default plan keyed by deliverable type when no pipeline matches.
 *
 * Weights are typical wall-clock estimates for Ollama Cloud `minimax-m2.7:cloud`
 * — they don't need to be exact, only proportional. The result is that progress
 * advances in proportion to actual work completed, not according to magic numbers
 * picked when each call was written.
 */

import type { DeliverableType } from '@/lib/types'

export type ActivityPhase = 'routing' | 'research' | 'drafting' | 'polish' | 'quality' | 'assembly'

export type ActivityStatus = 'pending' | 'running' | 'complete' | 'failed' | 'skipped'

export interface Activity {
  id: string
  name: string
  phase: ActivityPhase
  weight: number
  status: ActivityStatus
  message?: string
  startedAt?: string
  completedAt?: string
  agentId?: string
}

export interface ExecutionPlan {
  activities: Activity[]
}

/**
 * Typical wall-clock weights (approximate seconds on Ollama Cloud minimax-m2.7).
 * These are relative — only ratios matter. Adjust if a class of activity
 * consistently feels under- or over-represented in the progress bar.
 */
const WEIGHT = {
  ROUTING: 2,
  COLLAB_HANDOFF: 30,
  LEAD_DRAFT: 45,
  POLISH: 15,
  QUALITY_CHECK: 5,
  ASSEMBLY: 5,
} as const

/**
 * Build an execution plan from the available context. Pipeline phases (when
 * present) are converted into activities one-for-one; otherwise we synthesise a
 * default plan based on the deliverable type and collaborator count.
 */
export function buildExecutionPlan(input: {
  deliverableType: DeliverableType | string
  pipelinePhases?: Array<{ id?: string; name: string }> | null
  collaboratorAgentIds?: string[]
  leadAgentId?: string | null
  leadAgentName?: string
  collaboratorNames?: Record<string, string>
}): ExecutionPlan {
  const activities: Activity[] = []

  // 1. Routing — always present.
  activities.push({
    id: 'routing',
    name: 'Iris routing the request',
    phase: 'routing',
    weight: WEIGHT.ROUTING,
    status: 'pending',
  })

  // 2. Pipeline-driven path takes precedence.
  if (input.pipelinePhases && input.pipelinePhases.length > 0) {
    for (const phase of input.pipelinePhases) {
      activities.push({
        id: phase.id || `phase-${phase.name.toLowerCase().replace(/\s+/g, '-')}`,
        name: phase.name,
        phase: 'drafting',
        weight: WEIGHT.LEAD_DRAFT,
        status: 'pending',
      })
    }
  } else {
    // 3. No-pipeline path: build from deliverable type + collaborators.
    const collaboratorIds = input.collaboratorAgentIds || []
    for (const cid of collaboratorIds) {
      const name = input.collaboratorNames?.[cid] || cid
      activities.push({
        id: `collab-${cid}`,
        name: `${name} contributing to the brief`,
        phase: 'research',
        weight: WEIGHT.COLLAB_HANDOFF,
        status: 'pending',
        agentId: cid,
      })
    }

    const leadName = input.leadAgentName || input.leadAgentId || 'the lead specialist'
    activities.push({
      id: 'lead-draft',
      name: `${leadName} drafting the deliverable`,
      phase: 'drafting',
      weight: WEIGHT.LEAD_DRAFT,
      status: 'pending',
      agentId: input.leadAgentId || undefined,
    })
  }

  // 4. Quality check + assembly — always present.
  activities.push({
    id: 'quality-check',
    name: 'Quality check',
    phase: 'quality',
    weight: WEIGHT.QUALITY_CHECK,
    status: 'pending',
  })
  activities.push({
    id: 'final-assembly',
    name: 'Packaging the final deliverable',
    phase: 'assembly',
    weight: WEIGHT.ASSEMBLY,
    status: 'pending',
  })

  return { activities }
}

/**
 * Progress = completed-weight / total-weight, expressed as 0–100.
 * Running activities contribute half their weight so the bar moves while the
 * LLM is mid-call, then jumps the remaining half when the activity finishes.
 */
export function computeProgress(plan: ExecutionPlan): number {
  const total = plan.activities.reduce((sum, a) => sum + a.weight, 0)
  if (total <= 0) return 0
  const completed = plan.activities.reduce((sum, a) => {
    if (a.status === 'complete') return sum + a.weight
    if (a.status === 'running') return sum + a.weight * 0.5
    if (a.status === 'failed') return sum + a.weight // count failed as "done" so progress doesn't stall
    return sum
  }, 0)
  return Math.min(100, Math.max(0, Math.round((completed / total) * 100)))
}

/**
 * Mutate a single activity in-place. Returns the new computed progress.
 * Use these helpers instead of touching activity.status directly — they keep
 * timing fields consistent.
 */
export function startActivity(plan: ExecutionPlan, id: string, message?: string): number {
  const a = plan.activities.find((x) => x.id === id)
  if (!a) return computeProgress(plan)
  a.status = 'running'
  a.startedAt = a.startedAt || new Date().toISOString()
  if (message) a.message = message
  return computeProgress(plan)
}

export function completeActivity(plan: ExecutionPlan, id: string, message?: string): number {
  const a = plan.activities.find((x) => x.id === id)
  if (!a) return computeProgress(plan)
  a.status = 'complete'
  a.completedAt = new Date().toISOString()
  if (message) a.message = message
  return computeProgress(plan)
}

export function failActivity(plan: ExecutionPlan, id: string, message?: string): number {
  const a = plan.activities.find((x) => x.id === id)
  if (!a) return computeProgress(plan)
  a.status = 'failed'
  a.completedAt = new Date().toISOString()
  if (message) a.message = message
  return computeProgress(plan)
}

export function updateActivityMessage(plan: ExecutionPlan, id: string, message: string): void {
  const a = plan.activities.find((x) => x.id === id)
  if (!a) return
  a.message = message
}

/**
 * Friendly phase labels for the UI status pill. Falls back to the activity name
 * when no specific label matches.
 */
export function phaseLabel(phase: ActivityPhase): string {
  switch (phase) {
    case 'routing':
      return 'Routing'
    case 'research':
      return 'Research & briefing'
    case 'drafting':
      return 'Drafting'
    case 'polish':
      return 'Polishing'
    case 'quality':
      return 'Quality check'
    case 'assembly':
      return 'Final assembly'
    default:
      return 'In progress'
  }
}
