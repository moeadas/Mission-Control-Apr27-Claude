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

function getBlogArticleDraftContent(text: string) {
  const match = text.match(
    /^##\s+Article Draft\s*$([\s\S]*?)(?=^##\s+Post SEO Settings\s*$|^##\s+Internal & External Link Suggestions\s*$|^##\s+Visual & Alt Text Suggestions\s*$|^##\s+Schema & Publishing Checklist\s*$|^##\s+Post-Publish Plan\s*$|(?![\s\S]))/im
  )
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

function extractMarkdownTables(text: string) {
  const tables: string[][][] = []
  const lines = text.split('\n')
  let current: string[] = []
  const flush = () => {
    if (current.length >= 2) {
      const rows = current
        .filter((line) => line.includes('|'))
        .map((line) =>
          line
            .trim()
            .replace(/^\|/, '')
            .replace(/\|$/, '')
            .split('|')
            .map((cell) => cell.trim())
        )
        .filter((row) => row.length >= 2)
      const bodyRows = rows.filter((row) => !row.every((cell) => /^:?-{3,}:?$/.test(cell)))
      if (bodyRows.length >= 2) tables.push(bodyRows)
    }
    current = []
  }

  for (const line of lines) {
    if (line.includes('|')) current.push(line)
    else flush()
  }
  flush()
  return tables
}

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9%]+/g, ' ').trim()
}

function getMediaPlanTable(text: string) {
  return extractMarkdownTables(text).find((table) => {
    const headers = table[0].map(normalizeHeader)
    const headerText = headers.join(' ')
    return headerText.includes('country') && headerText.includes('channel') && headerText.includes('budget') && headerText.includes('primary kpi')
  }) || null
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
    'blog-article': ['Article Draft', 'Post SEO Settings'],
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
    'media-plan': ['Media Plan Strategy', 'Excel-Ready Media Plan'],
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
    'financial-operations': ['Objective', 'Process Scope', 'Operating Workflow', 'Controls and Exceptions'],
    'financial-report': ['Executive Summary', 'Key Financial Metrics', 'Variance Analysis', 'Decisions and Recommended Actions'],
    'people-operations': ['Objective', 'Employee and Manager Experience', 'Operating Process', 'Risks, Escalations, and Required Review'],
    'talent-acquisition': ['Hiring Objective', 'Role Outcomes and Competencies', 'Interview Scorecard and Process', 'Decision Governance'],
    'business-development': ['Growth Objective', 'Ideal Customer Profile', 'Target Account and Qualification Model', 'Pipeline Metrics and Assumptions'],
    'partnership-strategy': ['Partnership Objective', 'Partner Landscape and Selection Criteria', 'Mutual Value Proposition', 'Activation and Governance'],
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

  if (deliverableType === 'media-plan') {
    const mediaStrategy = getSectionContent(trimmed, 'Media Plan Strategy')
    const mediaTableSection = getSectionContent(trimmed, 'Excel-Ready Media Plan')
    const mediaTable = getMediaPlanTable(mediaTableSection || trimmed)
    const requiredStrategyTerms = [
      ['Objective', /\bobjective|funnel/i],
      ['Audience Strategy', /\baudience|prospecting|retargeting/i],
      ['Channel Selection Rationale', /\bchannel|fit score|rationale/i],
      ['Budget Allocation Logic', /\bbudget|allocation/i],
      ['KPI Forecast Summary', /\bforecast|impressions|clicks|outcomes?|kpi/i],
      ['Scheduling & Pacing', /\bflight|schedule|pacing|frequency/i],
      ['Measurement Setup', /\btracking|pixel|utm|conversion|crm|ga4/i],
      ['Optimization Rules', /\boptimi[sz]ation|pacing|fatigue|shift budget/i],
      ['Risks & Watchouts', /\brisk|watchout|assumption|confidence/i],
    ] as const

    for (const [label, pattern] of requiredStrategyTerms) {
      if (!pattern.test(mediaStrategy)) issues.push(`Media Plan Strategy missing: ${label}.`)
    }

    if (!mediaTable) {
      issues.push('Excel-Ready Media Plan is missing the required markdown table.')
    } else {
      const headers = mediaTable[0].map(normalizeHeader)
      const requiredHeaders = [
        'country',
        'industry',
        'campaign objective',
        'funnel stage',
        'channel',
        'platform objective',
        'format placement',
        'buying type',
        'flight start',
        'flight end',
        'duration',
        'scheduling model',
        'budget',
        'budget %',
        'benchmark cost type',
        'benchmark cost',
        'est impressions',
        'est clicks',
        'est outcomes',
        'primary kpi',
        'secondary kpis',
        'frequency cap',
        'tracking requirement',
        'notes rationale',
        'source assumption',
      ]
      for (const requiredHeader of requiredHeaders) {
        if (!headers.some((header) => header.includes(requiredHeader))) {
          issues.push(`Media plan table missing column: ${requiredHeader}.`)
        }
      }

      if (mediaTable.length < 3) {
        issues.push('Media plan table needs at least two line items.')
      }

      const budgetIndex = headers.findIndex((header) => header.includes('budget %'))
      if (budgetIndex >= 0) {
        const percentages = mediaTable.slice(1).map((row) => {
          const value = String(row[budgetIndex] || '').match(/-?\d+(?:\.\d+)?/)
          return value ? Number(value[0]) : 0
        })
        const sum = percentages.reduce((total, value) => total + value, 0)
        if (percentages.length && (sum < 99 || sum > 101)) {
          issues.push(`Media plan budget percentages must sum to 100% (currently ${sum.toFixed(1)}%).`)
        }
      }
    }

    if (/multi|multiple|countries|country|ksa|saudi|uae|qatar|oman|jordan|egypt|iraq|usa|gcc|mena/i.test(request || '')) {
      if (!/\bCountry\b/i.test(mediaTableSection)) {
        issues.push('Media plan must preserve country-level rows for multi-country planning.')
      }
    }
  }

  if (deliverableType === 'blog-article') {
    const articleDraft = getBlogArticleDraftContent(trimmed)
    const articleWordCount = countWords(articleDraft)
    const requestedShort = request ? /\b(short|brief|quick|summary|outline only|draft outline)\b/i.test(request) : false

    if (!requestedShort && articleWordCount < 2500) {
      issues.push(`Article Draft is too short for the blog checklist (${articleWordCount} words; expected at least 2500).`)
    }

    if (!/^#{1,2}\s+.+/m.test(articleDraft)) {
      issues.push('Article Draft is missing its article H1/H2 title.')
    }

    if ((articleDraft.match(/^##\s+.+/gm) || []).length < 14) {
      issues.push('Article Draft needs the full long-form blog structure with at least fourteen H2 sections.')
    }

    const articleNavigation =
      getSectionContent(articleDraft, 'Quick Navigation') || getSectionContent(articleDraft, 'Table of Contents')
    if (!articleNavigation || !/\[[^\]]+\]\(#[^)]+\)/.test(articleNavigation)) {
      issues.push('Article Draft must include linked Quick Navigation inside the copyable post content.')
    }

    const requiredArticlePatterns = [
      [/^##\s+Key Takeaways:/im, 'Article Draft is missing the Key Takeaways benefits section.'],
      [/^##\s+What is .+Why Does Every/im, 'Article Draft is missing the What is/definition section.'],
      [/^##\s+How Does .+Work\?/im, 'Article Draft is missing the step-by-step process section.'],
      [/^##\s+Common Questions About/im, 'Article Draft is missing Common Questions FAQ section.'],
      [/^##\s+Additional Questions About/im, 'Article Draft is missing Additional Questions FAQ section.'],
      [/^##\s+Real-World Success Stories:/im, 'Article Draft is missing case studies.'],
      [/^##\s+Frequently Asked Technical Questions/im, 'Article Draft is missing technical FAQ section.'],
      [/^##\s+Why Now\?/im, 'Article Draft is missing urgency section.'],
      [/^##\s+Summary:/im, 'Article Draft is missing summary section.'],
    ] as const
    for (const [pattern, issue] of requiredArticlePatterns) {
      if (!pattern.test(articleDraft)) issues.push(issue)
    }

    if (!/\|.+\|.+\|/.test(articleDraft) && !/\b(Key takeaway|Pro tip|Quick answer|Important)\b/i.test(articleDraft)) {
      issues.push('Article Draft is missing a scannable table or callout block.')
    }

    const postSeoSettings = getSectionContent(trimmed, 'Post SEO Settings')
    const requiredSettings = [
      'SUGGESTED SEO TITLE TAG',
      'SUGGESTED META DESCRIPTION',
      'SUGGESTED URL SLUG',
      'PRIMARY FOCUS KEYWORD',
      'SECONDARY KEYWORDS USED',
      'ESTIMATED WORD COUNT',
      'IMAGE PLACEMENT NOTES',
      'INTERNAL LINK SUGGESTIONS',
      'SCHEMA MARKUP NOTES',
    ]
    for (const setting of requiredSettings) {
      if (!postSeoSettings.toUpperCase().includes(setting)) {
        issues.push(`Post SEO Settings missing: ${setting}.`)
      }
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
