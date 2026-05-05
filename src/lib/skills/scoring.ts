/**
 * Shared skill-relevance scoring core.
 *
 * Before this module: scoring logic lived in two places with different
 * weights:
 *   - `task-channeling.ts` `scoreSkill` — agent-level skill assignment
 *     (which skills should this agent activate for this deliverable?)
 *   - `autonomous-task.ts` `scoreSkillForActivity` and `scoreSkillForDeliverable`
 *     — per-activity primary-skill picking (which one skill should be
 *     fully injected into the prompt?)
 *
 * They drifted. Tuning one didn't affect the other and they could disagree
 * about which skill was most relevant. Now both delegate to this module.
 *
 * The single entry point is `scoreSkillRelevance(skill, context)` which
 * accepts the union of inputs both call sites care about. Callers fill in
 * the bits they have and leave the rest undefined; the scorer applies the
 * relevant components and skips the rest.
 */

import type { DeliverableType } from '@/lib/types'

export interface ScorableSkill {
  id: string
  name?: string
  description?: string
  tags?: string[]
  trigger?: string
  instructions?: string
  prompts?: { en?: { trigger?: string; context?: string; instructions?: string } }
  agents?: string[]
  pipelines?: string[]
}

export interface PipelineLikeForScoring {
  id: string
  name?: string
}

export interface PipelineActivityForScoring {
  id?: string
  name?: string
  description?: string
  assignedRole?: string
}

export interface ChannelingScoringSpec {
  skillBoostPatterns?: RegExp[]
  skillPenaltyPatterns?: RegExp[]
}

export interface ScoreSkillContext {
  /** Free-text user request — drives request-token overlap scoring. */
  request?: string
  /** Resolved deliverable type — drives type-token + category bonuses. */
  deliverableType?: DeliverableType
  /** When picking a per-activity primary skill, the activity being run. */
  activity?: PipelineActivityForScoring
  /** When agent assignment is happening, the lead/collaborator agent id. */
  agentId?: string
  /** When a pipeline match exists, used for pipeline-membership bonus. */
  pipeline?: PipelineLikeForScoring | null
  /** Channeling-spec boost/penalty patterns — only set by task-channeling. */
  channelingSpec?: ChannelingScoringSpec
}

interface ScoreSkillOptions {
  /**
   * Maximum number of request tokens to consider. Channeling cares about all
   * of them; per-activity scoring already has a tight needle so it caps at
   * the first N. Default 24 — enough to cover reasonable prompts without
   * letting a 5-paragraph paste dominate.
   */
  maxRequestTokens?: number
  /**
   * Per-activity scoring weights overlap on the activity name + description
   * heavily. Caller can override for per-activity calls.
   */
  activityTokenWeight?: number
  /**
   * Per-token bonus when a request word appears in the skill haystack.
   * Channeling uses 2, per-activity scoring also uses 2; default kept at 2
   * unless a caller wants to dial it down for very long requests.
   */
  requestTokenWeight?: number
}

function buildHaystack(skill: ScorableSkill): string {
  return [
    skill.id,
    skill.name || '',
    (skill.tags || []).join(' '),
    skill.description || '',
    skill.trigger || skill.prompts?.en?.trigger || '',
    skill.prompts?.en?.context || '',
    (skill.instructions || skill.prompts?.en?.instructions || '').slice(0, 600),
  ]
    .join(' ')
    .toLowerCase()
}

function tokenize(value: string, minLength = 3): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= minLength)
}

const RESEARCH_HEAVY_DELIVERABLES = new Set<DeliverableType>([
  'research-brief',
  'strategy-brief',
  'campaign-strategy',
  'data-analysis',
  'seo-audit',
])

const BRAND_HEAVY_DELIVERABLES = new Set<DeliverableType>([
  'creative-asset',
  'brand-guidelines',
])

/**
 * The single canonical skill scorer. Both task-channeling and the per-activity
 * picker delegate here with their own context shapes.
 *
 * Score breakdown:
 *   • +2 per request token that overlaps the skill haystack (capped at maxRequestTokens)
 *   • +5 per activity-name token that overlaps the skill haystack
 *   • +5 deliverable-as-words appears in haystack (e.g. "research brief")
 *   • +4 deliverable-id appears in haystack (e.g. "research-brief")
 *   • +3 skill.agents includes the assigned agentId
 *   • +4 skill.pipelines includes the resolved pipelineId
 *   • +6 channelingSpec.skillBoostPatterns matches skill.id
 *   • -8 channelingSpec.skillPenaltyPatterns matches skill.id
 *   • +10 deep-research skill on a research-heavy deliverable
 *   • +7 brand-template / nano-banana skill on creative-asset / brand-guidelines
 */
export function scoreSkillRelevance(
  skill: ScorableSkill,
  context: ScoreSkillContext,
  options: ScoreSkillOptions = {}
): number {
  const haystack = buildHaystack(skill)
  let score = 0

  // Request-token overlap (channeling-style)
  if (context.request) {
    const maxTokens = options.maxRequestTokens ?? 24
    const tokens = tokenize(context.request, 3).slice(0, maxTokens)
    const tokenWeight = options.requestTokenWeight ?? 2
    for (const token of tokens) {
      if (haystack.includes(token)) score += tokenWeight
    }
  }

  // Activity-token overlap (per-activity-style) — heavier weight because
  // activity name + description is a tight, intentional needle, unlike a
  // free-form request.
  if (context.activity) {
    const needle = [
      context.activity.name || '',
      context.activity.description || '',
      context.activity.assignedRole || '',
    ]
      .join(' ')
      .toLowerCase()
    if (needle.trim()) {
      const tokens = tokenize(needle, 4)
      const tokenWeight = options.activityTokenWeight ?? 5
      for (const token of tokens) {
        if (haystack.includes(token)) score += tokenWeight
      }
    }
    if (context.activity.assignedRole && skill.tags?.includes(context.activity.assignedRole)) {
      score += 3
    }
  }

  // Deliverable-type bonuses
  if (context.deliverableType) {
    const dt = context.deliverableType
    if (haystack.includes(dt.replace(/-/g, ' '))) score += 5
    if (haystack.includes(dt)) score += 4

    if (/deep-research/.test(skill.id) && RESEARCH_HEAVY_DELIVERABLES.has(dt)) score += 10
    if (
      /(brand-template|brand-guidelines|brand-consistency|nano|reference-image)/.test(skill.id) &&
      BRAND_HEAVY_DELIVERABLES.has(dt)
    ) {
      score += 7
    }
  }

  // Agent/pipeline membership bonuses
  if (context.agentId && skill.agents?.includes(context.agentId)) score += 3
  if (context.pipeline?.id && skill.pipelines?.includes(context.pipeline.id)) score += 4

  // Channeling-specific boost/penalty patterns
  if (context.channelingSpec?.skillBoostPatterns?.length) {
    for (const pattern of context.channelingSpec.skillBoostPatterns) {
      if (pattern.test(skill.id)) {
        score += 6
        break
      }
    }
  }
  if (context.channelingSpec?.skillPenaltyPatterns?.length) {
    for (const pattern of context.channelingSpec.skillPenaltyPatterns) {
      if (pattern.test(skill.id)) {
        score -= 8
        break
      }
    }
  }

  return score
}

/**
 * Convenience: pick the highest-scoring skill from a list, falling back to
 * the first entry if every score is non-positive (so callers always get
 * *some* skill for the prompt rather than nothing).
 */
export function pickBestSkill<T extends ScorableSkill>(
  skills: T[],
  context: ScoreSkillContext,
  options?: ScoreSkillOptions
): T | null {
  if (!skills.length) return null
  let best: { skill: T; score: number } | null = null
  for (const skill of skills) {
    const score = scoreSkillRelevance(skill, context, options)
    if (!best || score > best.score) best = { skill, score }
  }
  return best && best.score > 0 ? best.skill : skills[0]
}
