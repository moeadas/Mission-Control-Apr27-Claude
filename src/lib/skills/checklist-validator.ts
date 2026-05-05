/**
 * Post-generation skill-checklist validator.
 *
 * Skills declare a `checklist` array of human-readable verification items.
 * Before this module those items were only injected into the agent's prompt
 * ("Skill checklist (must satisfy before returning output)") — the runtime
 * never verified compliance, so a skill author writing 8 careful checklist
 * items could see the model satisfy 4 and the system still mark the task
 * "completed" because the structural section gate passed.
 *
 * This validator runs cheap programmatic checks per checklist item and feeds
 * failures into `qualityResult.issues`. The existing repair-pass loop in
 * `autonomous-task.ts` (which already triggers when `qualityResult.ok ===
 * false`) then re-runs the lead with the checklist failures explicit, giving
 * the model a chance to fix what it skipped.
 *
 * Design constraints — this validator must be CONSERVATIVE:
 *   - LLMs satisfy items semantically without exact-word matches, so flagging
 *     missing keywords is not always correct.
 *   - We only flag a failure when the item refers to a *concrete artifact*
 *     (a section heading, a specific structural element, a hard constraint
 *     like a character count) AND that artifact is structurally absent.
 *   - Soft items ("be specific", "avoid generic language") are skipped — the
 *     LLM may have honored them in spirit and we have no reliable way to
 *     score that without another LLM call.
 *
 * The price of being conservative: some checklist items will pass the
 * validator that a human would mark failed. The price of being loose: many
 * tasks would loop in repair forever. We err on the conservative side
 * because the structural quality gate (`output-quality.ts`) already catches
 * the highest-impact failures (missing required sections, routing
 * boilerplate, blank output).
 */

export interface ChecklistValidatableSkill {
  id: string
  name?: string
  checklist?: string[]
}

export interface ChecklistValidationResult {
  /** Total items considered (excludes items deemed too soft to check). */
  considered: number
  /** Items the validator was confident were not satisfied. */
  failed: ChecklistValidationFailure[]
  /** Items the validator was confident WERE satisfied. */
  passed: number
  /** Items the validator decided not to check (too vague to score). */
  skipped: number
}

export interface ChecklistValidationFailure {
  skillId: string
  item: string
  reason: string
}

/**
 * Items that mention these tokens are about subjective quality and can't be
 * verified without another LLM call. Skip them entirely.
 */
const SOFT_ITEM_TOKENS = [
  'specific',
  'concrete',
  'meaningful',
  'helpful',
  'useful',
  'clear',
  'concise',
  'professional',
  'polished',
  'on-brand',
  'on brand',
  'compelling',
  'engaging',
  'avoid',
  'no jargon',
  'no fluff',
  'no generic',
  'plain language',
  'be aware',
  'use judgment',
  'consider',
  'feel',
  'tone',
]

/**
 * Try to extract a verifiable "artifact word" from a checklist item — the
 * single noun the item is asking the response to produce.
 *
 * Examples:
 *   "Include a CTA at the end of every email"          → "cta"
 *   "Show a content pillars table in the calendar"     → "pillars"
 *   "Add subject line, preview text, and a clear CTA"  → "subject"
 *   "Provide character counts under each post"         → "character"
 */
function extractArtifactKeywords(item: string): string[] {
  const cleaned = item
    .toLowerCase()
    .replace(/^[\d.)\-*\s]+/, '') // strip list markers
    .replace(/[^\w\s-]+/g, ' ')
    .trim()

  if (!cleaned) return []

  const tokens = cleaned.split(/\s+/).filter(Boolean)

  // Multi-word artifact phrases worth checking as exact-substring matches
  const phrases: string[] = []
  const phraseStems = [
    'subject line',
    'preview text',
    'character count',
    'character counts',
    'content pillars',
    'visual brief',
    'visual briefs',
    'content calendar',
    'production notes',
    'safe zones',
    'reference image',
    'reference images',
    'master prompt',
    'negative prompt',
    'budget breakdown',
    'kpi framework',
    'channel mix',
    'executive summary',
    'situation analysis',
    'recommended actions',
    'output template',
  ]
  for (const phrase of phraseStems) {
    if (cleaned.includes(phrase)) phrases.push(phrase)
  }

  // Single-token concrete-artifact keywords
  const concreteKeywords = new Set([
    'cta',
    'caption',
    'hashtag',
    'hashtags',
    'hook',
    'body',
    'subject',
    'pillar',
    'pillars',
    'metric',
    'metrics',
    'kpi',
    'budget',
    'timeline',
    'roadmap',
    'channel',
    'channels',
    'audience',
    'persona',
    'objective',
    'positioning',
    'message',
    'recommendation',
    'recommendations',
    'finding',
    'findings',
    'overlay',
    'palette',
    'composition',
    'logo',
    'reference',
    'references',
    'template',
    'workflow',
    'mood',
    'aspect',
    'platform',
    'platforms',
    'frequency',
    'cadence',
  ])
  const singleTokenHits = tokens.filter((token) => concreteKeywords.has(token))

  // De-duplicate while keeping order
  const seen = new Set<string>()
  const result: string[] = []
  for (const phrase of [...phrases, ...singleTokenHits]) {
    if (!seen.has(phrase)) {
      seen.add(phrase)
      result.push(phrase)
    }
  }
  return result
}

function isSoftItem(item: string): boolean {
  const lower = item.toLowerCase()
  // Items shorter than 6 words or containing soft-quality tokens are skipped.
  if (lower.split(/\s+/).length < 4) return true
  return SOFT_ITEM_TOKENS.some((token) => lower.includes(token))
}

function responseContainsAll(response: string, keywords: string[]): boolean {
  const lower = response.toLowerCase()
  return keywords.every((keyword) => lower.includes(keyword))
}

/**
 * Validate the checklists of one or more skills against a generated response.
 * Returns aggregate stats plus the list of clear failures so callers can feed
 * the messages back into a quality-repair prompt.
 */
export function validateSkillChecklists(
  skills: ChecklistValidatableSkill[],
  response: string
): ChecklistValidationResult {
  const failed: ChecklistValidationFailure[] = []
  let considered = 0
  let passed = 0
  let skipped = 0

  if (!response || !response.trim()) {
    // No response yet — every checklist item fails by definition. But the
    // structural quality gate already catches empty output, so just skip
    // here so we don't double-count.
    return { considered: 0, failed: [], passed: 0, skipped: 0 }
  }

  for (const skill of skills) {
    const items = Array.isArray(skill.checklist) ? skill.checklist : []
    for (const rawItem of items) {
      const item = String(rawItem || '').trim()
      if (!item) continue

      if (isSoftItem(item)) {
        skipped += 1
        continue
      }

      const keywords = extractArtifactKeywords(item)
      if (!keywords.length) {
        // Couldn't extract a concrete check — skip rather than guess.
        skipped += 1
        continue
      }

      considered += 1
      if (responseContainsAll(response, keywords)) {
        passed += 1
      } else {
        failed.push({
          skillId: skill.id,
          item,
          reason: `response missing required reference(s): ${keywords.join(', ')}`,
        })
      }
    }
  }

  return { considered, failed, passed, skipped }
}

/**
 * Render checklist failures as a single string suitable for appending to the
 * existing `qualityResult.issues` array.
 */
export function formatChecklistFailures(failures: ChecklistValidationFailure[]): string[] {
  return failures.map(
    (failure) => `Skill "${failure.skillId}" checklist not satisfied: ${failure.item} (${failure.reason})`
  )
}
