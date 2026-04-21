import { DeliverableType } from '@/lib/types'

export interface DeliverableQualityResult {
  ok: boolean
  score: number
  issues: string[]
}

function isSimpleSocialPostRequest(request: string) {
  const lower = request.toLowerCase()
  return (
    /(facebook post|instagram post|linkedin post|social post|single post|caption)/.test(lower) &&
    !/(carousel|slide by slide|slide-by-slide|content calendar|campaign strategy|media plan|audit|brief|visual direction|design)/.test(lower)
  )
}

function isShortFormCopyRequest(request: string) {
  return /\b(whatsapp description|whatsapp bio|bio|profile description|short description|company description|brand description|tagline|one-liner)\b/i.test(
    request
  )
}

function hasSection(text: string, section: string) {
  return new RegExp(`^##\\s+${section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'im').test(text)
}

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

  if (!/^#\s+.+/m.test(trimmed)) {
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
    'short-form-copy': ['Objective', 'Final Copy'],
    'email-campaign': ['Objective', 'Subject Line Options', 'Email Body', 'CTA'],
    'blog-article': ['Objective', 'Working Title', 'Article Draft'],
    'website-copy': ['Objective', 'Hero Copy', 'Supporting Sections', 'CTA'],
    'video-script': ['Objective', 'Hook', 'Script', 'CTA'],
    'presentation': ['Objective', 'Narrative Arc', 'Slide-by-Slide Outline'],
    'campaign-copy': request && isShortFormCopyRequest(request)
      ? ['Objective', 'Final Copy']
      : request && isSimpleSocialPostRequest(request)
        ? ['Objective', 'Post Copy', 'CTA']
        : ['Objective', 'Audience', 'Core Message'],
    'content-calendar': ['Strategy Summary', 'Content Pillars', 'Calendar'],
    'media-plan': ['Objective', 'Channel Mix', 'Budget Allocation', 'KPI Framework'],
    'budget-sheet': ['Objective', 'Budget Allocation'],
    'kpi-forecast': ['Objective', 'KPI Framework'],
    'strategy-brief': ['Objective', 'Situation / Context', 'Recommendations'],
    'campaign-strategy': ['Objective', 'Situation / Context', 'Recommendations'],
    'brand-guidelines': ['Brand Foundation', 'Tone of Voice', 'Visual Identity'],
    'seo-audit': ['Executive Summary', 'Key Findings', 'Recommended Actions'],
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
