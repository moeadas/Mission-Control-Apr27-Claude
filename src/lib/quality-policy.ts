import type { DeliverableType } from '@/lib/types'
import { scoreSkillRelevance, type ScorableSkill } from '@/lib/skills/scoring'

export type QualitySkill = ScorableSkill & {
  checklist?: string[]
}

const DELIVERABLE_SKILL_PATTERNS: Partial<Record<DeliverableType, RegExp>> = {
  'content-calendar': /content.?calendar|organic.?social|platform.?native|social.?copy|campaign.?copy|headline|keyword.?research/i,
  'campaign-copy': /campaign.?copy|social.?copy|platform.?native|brand.?voice|headline|conversion.?copy/i,
  'short-form-copy': /short.?form|social.?copy|brand.?voice|headline|conversion.?copy/i,
  'email-campaign': /email|lifecycle|conversion.?copy|campaign.?copy|brand.?voice/i,
  'blog-article': /blog|seo.?content|keyword.?research|content.?writing|copywriting|research/i,
  'website-copy': /website.?copy|conversion.?copy|seo.?content|brand.?voice/i,
  'video-script': /video|script|storytelling|campaign.?copy|brand.?voice/i,
  presentation: /presentation|storytelling|data.?visual|report.?writing/i,
  'media-plan': /media.?plan|channel.?plan|paid.?social|paid.?search|budget|forecast|audience/i,
  'budget-sheet': /budget|forecast|financial|media.?plan/i,
  'kpi-forecast': /kpi|forecast|measurement|analytics|benchmark/i,
  'seo-audit': /seo.?audit|technical.?seo|keyword|page.?speed|research/i,
  'ui-audit': /ui|ux|accessibility|design.?system|audit/i,
  'data-analysis': /data|analytics|insight|visual|report|hypothesis/i,
  'research-brief': /research|insight|competitive|audience|market|report/i,
  'strategy-brief': /strategy|research|competitive|audience|positioning/i,
  'campaign-strategy': /campaign|strategy|audience|positioning|measurement/i,
  'creative-asset': /creative|art.?direction|brand|visual|composition|image/i,
  'financial-operations': /financial|account|control|compliance|operations/i,
  'financial-report': /financial|variance|forecast|report|account/i,
  'people-operations': /people|employee|hr|policy|operations/i,
  'talent-acquisition': /talent|recruit|interview|hiring|scorecard/i,
  'business-development': /business.?development|sales|qualification|pipeline|account/i,
  'partnership-strategy': /partner|alliance|business.?development|governance/i,
}

function skillText(skill: QualitySkill) {
  return [skill.id, skill.name, skill.description, skill.trigger, skill.instructions, ...(skill.tags || [])]
    .filter(Boolean)
    .join(' ')
}

/**
 * Pick only the skills whose artifact requirements are relevant to the final
 * deliverable. Activity prompts still receive their own primary skill; this
 * function prevents unrelated collaborator checklists from lowering the final
 * score (for example an audio checklist on a content calendar).
 */
export function selectApplicableQualitySkills(input: {
  deliverableType: DeliverableType
  request: string
  skills: QualitySkill[]
  preferredSkillIds?: string[]
  maxSkills?: number
}) {
  const preferred = new Set(input.preferredSkillIds || [])
  const compatibility = DELIVERABLE_SKILL_PATTERNS[input.deliverableType]
  const ranked = input.skills
    .map((skill) => {
      const compatible = compatibility ? compatibility.test(skillText(skill)) : true
      const relevance = scoreSkillRelevance(skill, {
        request: input.request,
        deliverableType: input.deliverableType,
      })
      const score = relevance + (preferred.has(skill.id) ? 8 : 0) + (compatible ? 8 : -20)
      return { skill, score, compatible }
    })
    .filter(({ skill, score, compatible }) =>
      Boolean(skill.checklist?.length) && compatible && (score >= 8 || preferred.has(skill.id))
    )
    .sort((a, b) => b.score - a.score)

  const seen = new Set<string>()
  return ranked
    .filter(({ skill }) => {
      if (seen.has(skill.id)) return false
      seen.add(skill.id)
      return true
    })
    .slice(0, input.maxSkills ?? 3)
    .map(({ skill }) => skill)
}

export function qualityIssueWeight(issue: string) {
  const lower = issue.toLowerCase()
  if (/output is empty|unsupported factual claim|outside the confirmed|unconfirmed platforms|must sum to 100/.test(lower)) return 25
  if (/confirmed|missing required section|missing the required|missing a parseable|too short|requires \d+|needs at least|does not preserve/.test(lower)) return 15
  if (/skill .*checklist not satisfied/.test(lower)) return 7
  return 10
}

export function scoreQualityIssues(issues: string[]) {
  const unique = Array.from(new Set(issues.map((issue) => issue.trim()).filter(Boolean)))
  return {
    ok: unique.length === 0,
    score: Math.max(0, 100 - unique.reduce((total, issue) => total + qualityIssueWeight(issue), 0)),
    issues: unique,
  }
}
