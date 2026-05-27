import type { DeliverableType } from '@/lib/types'

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

function getSectionContent(text: string, section: string) {
  const escaped = section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = text.match(new RegExp(`^##\\s+${escaped}\\s*$([\\s\\S]*?)(?=^##\\s+|(?![\\s\\S]))`, 'im'))
  return match?.[1]?.trim() || ''
}

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function extractBlogPrimaryKeyword(request?: string) {
  if (!request) return ''
  const patterns = [
    /\bprimary\s+(?:focus\s+)?keyword\s*(?:is|:|-)?\s*["“]?([^"\n.;]+)["”]?/i,
    /\bmain\s+focus\s+keyword\s*(?:is|:|-)?\s*["“]?([^"\n.;]+)["”]?/i,
    /\bfocus\s+keyword\s*(?:is|:|-)?\s*["“]?([^"\n.;]+)["”]?/i,
    /\b(?:use|using)\s+["“]?([^"\n.;,]+?)["”]?\s+(?:as|and)\s+(?:the\s+)?(?:main\s+)?(?:primary\s+)?(?:focus\s+)?keyword\b/i,
    /["“]([^"”\n]{2,})["”]\s+(?:as|and)\s+(?:the\s+)?(?:main\s+)?(?:primary\s+)?(?:focus\s+)?keyword\b/i,
  ]
  for (const pattern of patterns) {
    const match = request.match(pattern)
    if (match?.[1]?.trim()) return match[1].trim()
  }
  return ''
}

function getKeywordRegex(keyword: string) {
  return new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
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
    'blog-article': [
      'Objective',
      'Search Intent & SERP Notes',
      'SEO Package',
      'Article Outline',
      'Table of Contents',
      'Key Takeaways',
      'Article Draft',
      'FAQ',
      'Internal & External Link Suggestions',
      'Visual & Alt Text Suggestions',
      'Schema & Publishing Checklist',
      'Post-Publish Plan',
      'CTA',
    ],
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

  if (deliverableType === 'blog-article') {
    const articleDraft = getSectionContent(trimmed, 'Article Draft')
    const articleWordCount = countWords(articleDraft)
    const requestedShort = request ? /\b(short|brief|quick|summary|outline only|draft outline)\b/i.test(request) : false

    if (!requestedShort && articleWordCount < 1200) {
      issues.push(`Article Draft is too short for the blog checklist (${articleWordCount} words; expected at least 1200).`)
    }

    if (!/^#{1,2}\s+.+/m.test(articleDraft)) {
      issues.push('Article Draft is missing its article H1/H2 title.')
    }

    if ((articleDraft.match(/^#{2,3}\s+.+/gm) || []).length < 4) {
      issues.push('Article Draft needs at least four useful H2/H3 sections.')
    }

    if (!hasSection(trimmed, 'Table of Contents') || !/\[[^\]]+\]\(#[^)]+\)/.test(getSectionContent(trimmed, 'Table of Contents'))) {
      issues.push('Missing linked Table of Contents with anchor-style links.')
    }

    if (!hasSection(articleDraft, 'Table of Contents') || !/\[[^\]]+\]\(#[^)]+\)/.test(getSectionContent(articleDraft, 'Table of Contents'))) {
      issues.push('Article Draft must include the linked Table of Contents inside the copyable post content.')
    }

    if (!/\|.+\|.+\|/.test(articleDraft) && !/\b(Key takeaway|Pro tip|Quick answer|Important)\b/i.test(articleDraft)) {
      issues.push('Article Draft is missing a scannable table or callout block.')
    }

    const titleOptionCount = (getSectionContent(trimmed, 'SEO Package').match(/\btitle\s+option\b|\boption\s+\d\b|^\s*\d+[.)]\s+/gim) || []).length
    if (titleOptionCount < 5) {
      issues.push('SEO Package needs five title options.')
    }

    if (request) {
      const primaryKeyword = extractBlogPrimaryKeyword(request)
      if (primaryKeyword) {
        const firstHundredWords = articleDraft.split(/\s+/).slice(0, 100).join(' ')
        if (!getKeywordRegex(primaryKeyword).test(firstHundredWords)) {
          issues.push('Primary keyword is missing from the first 100 words of the Article Draft.')
        }
      }
    }
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
