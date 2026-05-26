import { DeliverableType } from '@/lib/types'
import { getDeliverableAgentPlan } from '@/lib/agent-roles'

export function buildTaskTitleFromRequest(request: string, deliverableType: DeliverableType) {
  const trimmed = request.trim()
  if (!trimmed) return 'New Task'

  const cleaned = trimmed
    .replace(/^please\s+write\s+me\s+/i, '')
    .replace(/^write\s+me\s+/i, '')
    .replace(/^please\s+make\s+me\s+/i, '')
    .replace(/^make\s+me\s+/i, '')
    .replace(/^please\s+/i, '')
    .replace(/^i need\s+/i, '')
    .replace(/^create\s+/i, '')
    .replace(/^draft\s+/i, '')
    .replace(/^write\s+/i, '')
    .replace(/^build\s+/i, '')
    .replace(/^make\s+/i, '')
    .trim()

  const prefix = {
    'client-brief': 'Client Brief',
    'strategy-brief': 'Strategy Task',
    'campaign-strategy': 'Campaign Strategy',
    'content-calendar': 'Content Calendar',
    'campaign-copy': 'Content Task',
    'short-form-copy': 'Short Copy',
    'email-campaign': 'Email Campaign',
    'blog-article': 'Article Draft',
    'website-copy': 'Website Copy',
    'video-script': 'Script Draft',
    'presentation': 'Presentation Deck',
    'brand-guidelines': 'Brand Guidelines',
    'data-analysis': 'Analytics Report',
    'creative-asset': 'Creative Task',
    'pr-comms': 'PR / Comms',
    'event-plan': 'Event Plan',
    'media-plan': 'Media Plan',
    'budget-sheet': 'Budget Sheet',
    'kpi-forecast': 'KPI Forecast',
    'seo-audit': 'SEO Audit',
    'ui-audit': 'UI Audit',
    'research-brief': 'Research Task',
    'general-task': 'Task',
    'status-report': 'Task',
  }[deliverableType]

  return cleaned.length > 72 ? `${prefix}: ${cleaned.slice(0, 69)}...` : `${prefix}: ${cleaned}`
}

export function getDeliverableOutputSpec(deliverableType: DeliverableType, request: string) {
  const lower = request.toLowerCase()
  const isShortFormCopy =
    /(whatsapp description|whatsapp bio|bio|profile description|short description|company description|brand description|tagline|one-liner)/.test(
      lower
    )
  const isSimpleSocialPost =
    /(instagram post|linkedin post|social post|single post|caption)/.test(lower) &&
    !/(carousel|slide by slide|slide-by-slide|content calendar|campaign strategy|media plan|audit|brief|visual direction|design)/.test(lower)
  const formatRules = [
    'Format the final output for direct rendering in the app.',
    'Use this exact structure style:',
    '- First line must be a single H1 in the form "# [Deliverable Title]".',
    '- Every major section must use "## Section Name".',
    '- Use bullets for concise lists and pipe tables when a schedule, plan, or calendar is more useful.',
    '- Do not wrap the answer in code fences.',
    '- Do not use internal notes, analysis labels, or project-management boilerplate.',
  ].join('\n')

  if (deliverableType === 'short-form-copy') {
    return [
      formatRules,
      'Produce a short business description or brand line that is ready to use immediately.',
      'Respect any hard character limit mentioned in the request.',
      'Do not add hashtags, CTA language, strategy notes, or extra variants unless explicitly requested.',
      'Output sections in this exact order:',
      '## Objective',
      '## Final Copy',
      'Keep the final copy concise, polished, and client-ready.',
    ].join('\n')
  }

  if (deliverableType === 'email-campaign') {
    return [
      formatRules,
      'Produce a complete email deliverable, not a planning note.',
      'Output sections in this exact order:',
      '## Objective',
      '## Audience',
      '## Subject Line Options',
      '## Preview Text',
      '## Email Body',
      '## CTA',
      '## Send / Sequence Notes',
    ].join('\n')
  }

  if (deliverableType === 'blog-article') {
    return [
      formatRules,
      'Produce the actual long-form blog post deliverable, not a planning note.',
      'Follow the complete content writer checklist: research, search intent, title, slug, meta, intro, structure, TOC, keyword usage, E-E-A-T, visual suggestions, linking, AEO/GEO, conclusion, pre-publish checks, and after-publish maintenance.',
      'Output sections in this exact order:',
      '## Objective',
      '## Search Intent & SERP Notes',
      '## SEO Package',
      'Include 5 SEO title options, recommended URL slug, meta description, primary keyword, secondary keywords, target audience, and suggested word count.',
      '## Article Outline',
      'Include H1, H2/H3 hierarchy, and table of contents anchors.',
      '## Key Takeaways',
      '## Article Draft',
      'The draft must include the primary keyword naturally in the first 100 words, a 40-60 word direct answer near the top, short paragraphs, useful H2/H3s, FAQ, and a natural conclusion.',
      '## FAQ',
      '## Internal & External Link Suggestions',
      '## Visual & Alt Text Suggestions',
      '## Schema & Publishing Checklist',
      '## Post-Publish Plan',
      '## CTA',
    ].join('\n')
  }

  if (deliverableType === 'website-copy') {
    return [
      formatRules,
      'Produce website-ready copy, not a strategy brief.',
      'Output sections in this exact order:',
      '## Objective',
      '## Hero Copy',
      '## Supporting Sections',
      '## CTA',
      '## Design / Layout Notes',
    ].join('\n')
  }

  if (deliverableType === 'video-script') {
    return [
      formatRules,
      'Produce a script that can be handed directly to production.',
      'Output sections in this exact order:',
      '## Objective',
      '## Audience',
      '## Hook',
      '## Script',
      '## Visual / Production Notes',
      '## CTA',
    ].join('\n')
  }

  if (deliverableType === 'presentation') {
    return [
      formatRules,
      'Produce a slide-ready presentation outline.',
      'Output sections in this exact order:',
      '## Objective',
      '## Narrative Arc',
      '## Slide-by-Slide Outline',
      '## Speaker Notes',
      '## Visual Direction',
    ].join('\n')
  }

  if (deliverableType === 'campaign-copy') {
    if (isShortFormCopy) {
      return [
        formatRules,
        'Produce a short business description that is ready to use immediately.',
        'Respect any hard character limit mentioned in the request.',
        'Do not add hashtags, CTA language, strategy notes, or extra variants unless explicitly requested.',
        'Output sections in this exact order:',
        '## Objective',
        '## Final Copy',
        'Keep the final copy concise, polished, and client-ready.',
      ].join('\n')
    }

    if (lower.includes('carousel') || lower.includes('slide by slide') || lower.includes('slide-by-slide')) {
      return [
        formatRules,
        'Produce the final client-ready social deliverable, not a brief.',
        'Write with scientific clarity, strong hooks, and platform-native structure.',
        'Output sections in this exact order:',
        '## Objective',
        '## Audience',
        '## Core Message',
        '## Hook Options',
        '## Carousel Cover Headline',
        '## Slide-by-Slide Carousel Copy',
        '## Caption',
        '## CTA',
        '## Hashtag Suggestions',
        '## Design Direction Notes',
        'Make every slide concise and readable on mobile.',
      ].join('\n')
    }

    if (isSimpleSocialPost) {
      return [
        formatRules,
        'Produce a short ready-to-publish social post, not a strategy brief.',
        'Keep it tight, platform-native, and client-ready.',
        'Output sections in this exact order:',
        '## Objective',
        '## Post Copy',
        '## CTA',
        '## Hashtags',
        'Do not include audience analysis, hook option lists, supporting variants, or design-direction sections unless the user explicitly asked for them.',
        'Keep the main post copy concise enough for a single post, not a carousel.',
      ].join('\n')
    }

    return [
      formatRules,
      'Produce the final copy deliverable, not a brief.',
      'Output sections in this exact order:',
      '## Objective',
      '## Audience',
      '## Key Message',
      '## Hook Options',
      '## Primary Copy',
      '## Supporting Variants',
      '## CTA',
    ].join('\n')
  }

  if (deliverableType === 'content-calendar') {
    return [
      formatRules,
      'Produce a complete content calendar, not a planning note.',
      'Use these sections in order:',
      '## Strategy Summary',
      '## Content Pillars',
      '## Calendar',
      '## Production Notes',
      'The Calendar section must be a pipe table with at least 10 content entries.',
      'Each row must include: Week/Date, Channel, Theme, Post Idea, Hook, CTA, Asset Type, Objective.',
      'Make the calendar realistic for the client industry and buying cycle.',
    ].join('\n')
  }

  if (deliverableType === 'media-plan' || deliverableType === 'budget-sheet' || deliverableType === 'kpi-forecast') {
    return [
      formatRules,
      'Produce the actual planning output, not a brief.',
      'Include sections in this order:',
      '## Objective',
      '## Audience and Targeting Logic',
      '## Channel Mix',
      '## Budget Allocation',
      '## Flighting / Schedule',
      '## KPI Framework',
      '## Risks and Watchouts',
      'Use at least one pipe table for spend, timing, or KPI planning.',
      'Use concrete numbers when useful, but keep them positioned as planning assumptions.',
    ].join('\n')
  }

  if (deliverableType === 'campaign-strategy' || deliverableType === 'strategy-brief') {
    return [
      formatRules,
      'Produce a strategist-grade output that can be reviewed directly by the client team.',
      'Include sections in this order:',
      '## Objective',
      '## Situation / Context',
      '## Audience Insight',
      '## Strategic Tension or Opportunity',
      '## Positioning / Message Direction',
      '## Recommendations',
      '## Immediate Next Moves',
    ].join('\n')
  }

  if (deliverableType === 'seo-audit' || deliverableType === 'research-brief') {
    if (deliverableType === 'seo-audit') {
      return [
        formatRules,
        'Produce the actual client-ready website audit report, not a routing note.',
        'The report must follow the Pinpointer-style output structure:',
        '## Overall Score',
        '## Category Scores',
        '## Executive Summary',
        '## Top Priorities',
        '## Category Deep Dives',
        '### SEO',
        '### UX & Usability',
        '### UI Design',
        '### Conversion',
        '### Accessibility',
        '### Performance',
        '### Content Quality',
        '### Security',
        '### Mobile Responsiveness',
        '### Competitive Benchmark',
        '## 30/60/90 Roadmap',
        '## Evidence Appendix',
        'Use score labels, severity tags, pass/warning/fail summaries, concrete fixes, expected impact, and effort. If live evidence is limited, state the limitation instead of inventing crawl data.',
      ].join('\n')
    }

    return [
      formatRules,
      'Produce the actual audit or research output.',
      'Include sections: ## Executive Summary, ## Key Findings, ## Implications, ## Recommended Actions, ## Priority Order.',
      'Be specific and commercially useful.',
    ].join('\n')
  }

  if (deliverableType === 'ui-audit') {
    return [
      formatRules,
      'Produce a browser-backed UI audit, not a vague critique.',
      'Include sections in this order:',
      '## Executive Summary',
      '## Scope',
      '## Key UX Findings',
      '## Accessibility Findings',
      '## Messaging / Conversion Findings',
      '## Priority Fixes',
      '## Evidence Needed',
      'Rank findings by severity and keep recommendations concrete.',
    ].join('\n')
  }

  if (deliverableType === 'creative-asset') {
    return [
      formatRules,
      'Produce a complete Nano Banana-ready creative production pack, not a project status note.',
      'Include sections in this order:',
      '## Creative Objective',
      '## Audience',
      '## Brand Identity Lock',
      '## Reference Assets',
      '## Concept Direction',
      '## Visual Composition',
      '## Copy Overlays',
      '## Caption Draft',
      '## Nano Banana Master Prompt',
      '## Negative Prompt / Guardrails',
      '## Variations',
      '## Production Notes',
    ].join('\n')
  }

  if (deliverableType === 'brand-guidelines') {
    return [
      formatRules,
      'Produce a practical brand-guidelines document.',
      'Include sections in this order:',
      '## Brand Foundation',
      '## Tone of Voice',
      '## Visual Identity',
      '## Usage Rules',
      '## Applications',
    ].join('\n')
  }

  if (deliverableType === 'data-analysis') {
    return [
      formatRules,
      'Produce a structured analytics report, not raw notes.',
      'Include sections in this order:',
      '## Executive Summary',
      '## Key Metrics',
      '## Findings',
      '## Implications',
      '## Recommended Actions',
    ].join('\n')
  }

  if (deliverableType === 'pr-comms') {
    return [
      formatRules,
      'Produce the communications deliverable itself.',
      'Include sections in this exact order:',
      '## Objective',
      '## Key Message',
      '## Draft',
      '## Quote / Soundbite Options',
      '## Distribution Notes',
    ].join('\n')
  }

  if (deliverableType === 'event-plan') {
    return [
      formatRules,
      'Produce an execution-ready event plan.',
      'Include sections in this exact order:',
      '## Objective',
      '## Audience',
      '## Event Concept',
      '## Run of Show / Agenda',
      '## Logistics',
      '## Promotion Plan',
      '## Risks and Watchouts',
    ].join('\n')
  }

  return `${formatRules}\nProduce the actual draft deliverable itself, with clear sections and no routing boilerplate.`
}

export interface TaskExecutionPlan {
  leadAgentId: string
  collaboratorAgentIds: string[]
  assignedAgentIds: string[]
  qualityChecklist: string[]
  handoffNotes: string
}

function uniqueIds(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

export function buildTaskExecutionPlan(input: {
  deliverableType: DeliverableType
  request: string
  routedAgentId?: string
  pipelinePhases?: string[]
}) : TaskExecutionPlan {
  const lower = input.request.toLowerCase()
  const { leadAgentId, collaboratorAgentIds } = getDeliverableAgentPlan(
    input.deliverableType,
    input.request,
    input.routedAgentId
  )

  const qualityChecklist =
    input.pipelinePhases?.length
      ? input.pipelinePhases.map((phase, index) => `${index + 1}. ${phase}`)
      : getDefaultQualityChecklist(input.deliverableType, lower)

  const assignedAgentIds = uniqueIds(['iris', leadAgentId, ...collaboratorAgentIds])
  const handoffNotes = buildHandoffNotes({ deliverableType: input.deliverableType, leadAgentId, collaboratorAgentIds, request: input.request })

  return {
    leadAgentId,
    collaboratorAgentIds,
    assignedAgentIds,
    qualityChecklist,
    handoffNotes,
  }
}

function getDefaultQualityChecklist(deliverableType: DeliverableType, lowerRequest: string) {
  if (deliverableType === 'content-calendar') {
    return [
      '1. Validate client brief, audience, platforms, and posting goal',
      '2. Define content pillars and monthly narrative arc',
      '3. Generate content ideas mapped to funnel stages',
      '4. Write hooks and post angles',
      '5. Draft captions / post content',
      '6. Add visual direction and asset type per entry',
      '7. Review cadence, balance, and platform mix',
      '8. Final QA for brand fit, clarity, and conversion logic',
    ]
  }

  if (deliverableType === 'campaign-copy' && (lowerRequest.includes('carousel') || lowerRequest.includes('slide by slide') || lowerRequest.includes('slide-by-slide'))) {
    return [
      '1. Confirm objective, audience, and client message hierarchy',
      '2. Build hook and cover-slide angle',
      '3. Draft slide-by-slide copy with scientific clarity',
      '4. Add caption, CTA, and hashtags',
      '5. Review tone, readability, and claim safety',
      '6. Add design direction for production handoff',
    ]
  }

  if (deliverableType === 'campaign-copy' && /(facebook post|instagram post|linkedin post|social post|single post|caption)/.test(lowerRequest)) {
    return [
      '1. Confirm the post objective and target tone',
      '2. Draft one concise platform-native post',
      '3. Add a clear CTA and relevant hashtags',
      '4. Review for brevity, readability, and brand fit',
    ]
  }

  if (deliverableType === 'short-form-copy') {
    return [
      '1. Confirm brand, audience, and tone',
      '2. Draft a concise client-ready description',
      '3. Check the character limit and trim aggressively',
      '4. Review clarity, polish, and brand fit',
    ]
  }

  if (deliverableType === 'email-campaign') {
    return [
      '1. Confirm objective, audience, and stage in the customer journey',
      '2. Draft subject lines and preview text',
      '3. Write the body copy and CTA',
      '4. Add send logic or sequencing notes',
      '5. Review clarity, persuasion, and mobile readability',
    ]
  }

  if (deliverableType === 'blog-article' || deliverableType === 'website-copy' || deliverableType === 'video-script') {
    if (deliverableType === 'blog-article') {
      return [
        '1. Confirm main blog topic, primary focus keyword, and optional secondary keywords',
        '2. Research search intent, SERP patterns, PAA-style questions, related searches, and content gaps',
        '3. Plan SEO title options, slug, meta description, outline, TOC, and AEO/GEO extraction blocks',
        '4. Draft the full reader-first article with client tone, E-E-A-T signals, visuals, links, FAQ, conclusion, and CTA',
        '5. Run the full pre-publish checklist and add post-publish maintenance actions',
      ]
    }
    return [
      '1. Confirm objective, audience, and core message',
      '2. Build the structure for the deliverable',
      '3. Draft the main body copy',
      '4. Add CTA and execution notes where relevant',
      '5. Review for clarity, tone, and client readiness',
    ]
  }

  if (deliverableType === 'presentation') {
    return [
      '1. Confirm audience, objective, and required story arc',
      '2. Build the narrative structure slide by slide',
      '3. Draft key messages and speaker notes',
      '4. Add visual direction for each section',
      '5. Review for clarity, flow, and stakeholder readiness',
    ]
  }

  if (deliverableType === 'media-plan' || deliverableType === 'budget-sheet' || deliverableType === 'kpi-forecast') {
    return [
      '1. Confirm objective and budget assumptions',
      '2. Define audience and channel strategy',
      '3. Draft spend allocation and timing',
      '4. Add KPI framework and forecasting assumptions',
      '5. Review operational feasibility and pacing logic',
      '6. Prepare export-ready planning file',
    ]
  }

  if (deliverableType === 'strategy-brief' || deliverableType === 'campaign-strategy') {
    return [
      '1. Confirm business objective and category context',
      '2. Extract audience and market insight',
      '3. Define positioning or campaign angle',
      '4. Draft strategic recommendation',
      '5. Review for clarity, differentiation, and client readiness',
    ]
  }

  if (deliverableType === 'brand-guidelines') {
    return [
      '1. Confirm the brand foundation and intended use of the guide',
      '2. Define tone of voice and verbal rules',
      '3. Define visual identity rules and applications',
      '4. Add practical do and do not examples',
      '5. Review for consistency and usability',
    ]
  }

  if (deliverableType === 'seo-audit') {
    return [
      '1. Confirm the target website URL before starting',
      '2. Gather crawl, metadata, performance, accessibility, security, content, mobile, and UX/CRO evidence',
      '3. Run the 10-point category audit with scores and pass/warning/fail checks',
      '4. Translate findings into top priorities and commercial implications',
      '5. Package the output into a Pinpointer-style client-ready report',
    ]
  }

  if (deliverableType === 'research-brief') {
    return [
      '1. Confirm the audit or research scope and evidence sources',
      '2. Gather and group findings into clear themes',
      '3. Translate findings into commercial implications',
      '4. Prioritize actions by urgency and impact',
      '5. Package the output into a client-ready report',
    ]
  }

  if (deliverableType === 'data-analysis') {
    return [
      '1. Confirm metrics, timeframe, and business objective',
      '2. Organize the data into clear performance themes',
      '3. Surface the most important findings and anomalies',
      '4. Translate findings into business implications',
      '5. Recommend next actions and measurement priorities',
    ]
  }

  if (deliverableType === 'ui-audit') {
    return [
      '1. Confirm the page or flow scope and audit objective',
      '2. Review navigation, hierarchy, and usability friction',
      '3. Check accessibility, responsiveness, and interaction states',
      '4. Translate issues into severity-ranked findings',
      '5. Recommend fixes with clear rationale and evidence requirements',
    ]
  }

  if (deliverableType === 'creative-asset') {
    return [
      '1. Confirm the asset objective, platform, and aspect ratio',
      '2. Load the client brand kit, logos, templates, and reference images',
      '3. Define the concept direction and overlay copy',
      '4. Draft the final caption and on-image headline system',
      '5. Build a Nano Banana master prompt with strict brand-safe guardrails',
      '6. Add negative prompts, template rules, and controlled variations',
      '7. Review for brand identity, readability, and platform fit',
    ]
  }

  if (deliverableType === 'pr-comms' || deliverableType === 'client-brief' || deliverableType === 'event-plan') {
    return [
      '1. Confirm objective, audience, and communication context',
      '2. Structure the deliverable for stakeholder readability',
      '3. Draft the core narrative or plan',
      '4. Add implementation notes and watchouts',
      '5. Review for clarity, alignment, and readiness',
    ]
  }

  if (deliverableType === 'general-task') {
    return [
      '1. Confirm the task intent and likely output shape',
      '2. Draft the core deliverable',
      '3. Review for clarity, specificity, and usefulness',
      '4. Package it cleanly for handoff',
    ]
  }

  return [
    '1. Confirm brief and business context',
    '2. Draft the core deliverable',
    '3. Review quality, clarity, and client fit',
    '4. Prepare output for export or delivery',
  ]
}

function buildHandoffNotes(input: {
  deliverableType: DeliverableType
  leadAgentId: string
  collaboratorAgentIds: string[]
  request: string
}) {
  const collaboratorText = input.collaboratorAgentIds.length
    ? `Supporting agents align on message, quality, and specialist checks before output is marked ready: ${input.collaboratorAgentIds.join(', ')}.`
    : 'No supporting specialists are required for this task.'

  return [
    `Lead agent owns the draft and final assembly: ${input.leadAgentId}.`,
    collaboratorText,
    `Original request focus: ${input.request}`,
  ].join(' ')
}
