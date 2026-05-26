import { DeliverableType } from '@/lib/types'

export interface DeliverableQualityResult {
  ok: boolean
  score: number
  issues: string[]
}

function isSimpleSocialPostRequest(request: string) {
  // Use only the FIRST line/sentence — the user's actual ask — not the augmented
  // "Confirmed brief details:" block that the orchestrator appends. Without this,
  // augmentation strings like "brief details" / "design notes" falsely trigger the
  // multi-complex exclusion and force a structured-deliverable schema onto a simple
  // one-line social post request.
  const firstSentence = (request.split(/[\n.]/)[0] || request).trim()
  const lower = firstSentence.toLowerCase()
  const hasSinglePostSignal =
    /(facebook post|instagram post|linkedin post|x post|twitter post|social post|single post|one post|a post for|post for|post on|caption for|write.*post|create.*post|draft.*post|generate.*post)\b/.test(lower)
  // Tightened exclusion: each term must read like a request word, not an incidental
  // mention. "create a content calendar" matches; "brief details" no longer does.
  const hasMultiOrComplexSignal =
    /\b(carousel|slide by slide|slide-by-slide|content calendar|campaign strategy|media plan|audit|visual direction|design system|series of|sequence of|multiple posts|\d+\s+posts)\b/.test(
      lower
    )
  return hasSinglePostSignal && !hasMultiOrComplexSignal
}

function isShortFormCopyRequest(request: string) {
  return /\b(whatsapp description|whatsapp bio|bio|profile description|short description|company description|brand description|tagline|one-liner)\b/i.test(
    request
  )
}

function hasSection(text: string, section: string) {
  return new RegExp(`^##\\s+${section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'im').test(text)
}

// Deliverable types that are lightweight prose/copy — no H1 or H2 structure required
const LIGHTWEIGHT_TYPES = new Set<DeliverableType>([
  'campaign-copy',
  'short-form-copy',
  'status-report',
  'general-task',
  'pr-comms',
])

export function validateDeliverableQuality(
  deliverableType: DeliverableType,
  content: string,
  request?: string
): DeliverableQualityResult {
  const issues: string[] = []
  const trimmed = content.trim()

  if (!trimmed) {
    return { ok: false, score: 0, issues: ['Output is empty.'] }
  }

  const isSimplePost = deliverableType === 'campaign-copy' && request && isSimpleSocialPostRequest(request)
  const isLightweight = LIGHTWEIGHT_TYPES.has(deliverableType) || isSimplePost

  // H1 title check only applies to structured deliverables (briefs, reports, calendars, etc.)
  if (!isLightweight && !/^#\s+.+/m.test(trimmed)) {
    issues.push('Missing primary H1 title.')
  }

  const genericIssues = [
    ['task routed to', 'Output still contains routing boilerplate.'],
    ['lead agent', 'Output still contains internal lead-agent language.'],
    ['next steps:', 'Output still contains project-management status language.'],
    ['status: in progress', 'Output still contains internal status language.'],
  ] as const

  for (const [needle, issue] of genericIssues) {
    if (trimmed.toLowerCase().includes(needle)) issues.push(issue)
  }

  const requiredSections: Record<DeliverableType, string[]> = {
    'short-form-copy': [], // bios, taglines, one-liners — no structural headers required
    'email-campaign': ['Objective', 'Subject Line Options', 'Email Body', 'CTA'],
    'blog-article': ['Objective', 'SEO Package', 'Article Outline', 'Key Takeaways', 'Article Draft', 'FAQ', 'Schema & Publishing Checklist'],
    'website-copy': ['Objective', 'Hero Copy', 'Supporting Sections', 'CTA'],
    'video-script': ['Objective', 'Hook', 'Script', 'CTA'],
    'presentation': ['Objective', 'Narrative Arc', 'Slide-by-Slide Outline'],
    // Simple one-off social posts need no structural headers — just check content isn't empty
    // Short-form copy (bios, taglines) needs Objective + Final Copy
    // Complex campaign copy (multi-post, carousel, strategy-led) expects structure
    'campaign-copy': request && isSimpleSocialPostRequest(request)
      ? []
      : request && isShortFormCopyRequest(request)
        ? ['Objective', 'Final Copy']
        : ['Objective', 'Core Message'],
    'content-calendar': ['Strategy Summary', 'Content Pillars', 'Calendar'],
    'media-plan': ['Objective', 'Channel Mix', 'Budget Allocation', 'KPI Framework'],
    'budget-sheet': ['Objective', 'Budget Allocation'],
    'kpi-forecast': ['Objective', 'KPI Framework'],
    'strategy-brief': ['Objective', 'Situation / Context', 'Recommendations'],
    'campaign-strategy': ['Objective', 'Situation / Context', 'Recommendations'],
    'brand-guidelines': ['Brand Foundation', 'Tone of Voice', 'Visual Identity'],
    'seo-audit': ['Overall Score', 'Category Scores', 'Executive Summary', 'Top Priorities', 'Category Deep Dives', '30/60/90 Roadmap'],
    'data-analysis': ['Executive Summary', 'Key Metrics', 'Findings', 'Recommended Actions'],
    'ui-audit': ['Executive Summary', 'Key UX Findings', 'Priority Fixes'],
    'research-brief': ['Executive Summary', 'Key Findings', 'Recommended Actions'],
    'creative-asset': ['Creative Objective', 'Brand Identity Lock', 'Concept Direction', 'Copy Overlays', 'Caption Draft', 'Nano Banana Master Prompt', 'Negative Prompt / Guardrails'],
    'pr-comms': ['Objective', 'Key Message', 'Draft'],
    'client-brief': ['Objective', 'Situation / Context'],
    'event-plan': ['Objective', 'Event Concept', 'Logistics', 'Promotion Plan'],
    'general-task': [],
    'status-report': [],
  }

  for (const section of requiredSections[deliverableType] || []) {
    if (!hasSection(trimmed, section)) {
      issues.push(`Missing required section: ${section}.`)
    }
  }

  // For lightweight types (single posts, short copy), skip structural checks
  // but enforce a minimum word count so blank or one-word outputs still fail.
  if (isLightweight) {
    const wordCount = trimmed.split(/\s+/).filter(Boolean).length
    if (wordCount < 8) {
      issues.push('Output is too short to be a usable deliverable.')
    }
  }

  if (deliverableType === 'content-calendar' && !/\|.+\|.+\|/.test(trimmed)) {
    issues.push('Content calendar is missing a table layout.')
  }

  if (deliverableType === 'short-form-copy' && request) {
    const maxCharMatch = request.match(/\b(?:maximum|max|under|within)\s+(\d{2,4})\s*character/i)
    if (maxCharMatch) {
      const limit = Number(maxCharMatch[1])
      const finalCopySection = trimmed.split(/^##\s+Final Copy\s*$/im)[1] || trimmed
      const stripped = finalCopySection.replace(/^#.*$/gm, '').replace(/^##.*$/gm, '').trim()
      if (limit > 0 && stripped.length > limit) {
        issues.push(`Final copy exceeds the requested ${limit}-character limit.`)
      }
    }
  }

  const score = Math.max(0, 100 - issues.length * 15)
  return {
    ok: issues.length === 0,
    score,
    issues,
  }
}
