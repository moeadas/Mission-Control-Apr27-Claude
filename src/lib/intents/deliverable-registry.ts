/**
 * The canonical deliverable registry — single source of truth for every
 * place in the codebase that needs to know about deliverable types.
 *
 * Before this module existed, deliverable detection logic was duplicated in
 * five different files (chat route, server/ai.ts, agents-store.ts,
 * IrisChat.tsx, pipeline-execution.ts) and they drifted constantly. Now they
 * all delegate here.
 *
 * Each spec carries:
 *   - id            — matches DeliverableType union in src/lib/types.ts
 *   - label         — human-readable name
 *   - category      — for UI grouping
 *   - patterns      — regex array; ANY match contributes score
 *   - defaultLead   — agent id used when no other signal beats it
 *   - defaultCollaborators — extra agents added when this deliverable wins
 *   - pipelineId    — preferred pipeline if one exists
 *   - pipelineKeywords — substring matches for inferPipelineHint
 *   - priority      — tiebreaker when two deliverables tie on score
 *   - executionHints — appended to the lead prompt
 *   - complexity    — drives skill caps and quality strictness
 */

import type { DeliverableType } from '@/lib/types'

export type DeliverableCategory =
  | 'content'
  | 'strategy'
  | 'research'
  | 'creative'
  | 'technical'
  | 'operations'
  | 'communications'
  | 'analytics'

export interface DeliverableSpec {
  id: DeliverableType
  label: string
  category: DeliverableCategory
  patterns: RegExp[]
  defaultLead: string
  defaultCollaborators: string[]
  pipelineId: string | null
  pipelineKeywords: string[]
  priority: number
  executionHints: string[]
  complexity: 'low' | 'medium' | 'high'
}

export const DELIVERABLE_REGISTRY: DeliverableSpec[] = [
  {
    id: 'content-calendar',
    label: 'Content Calendar',
    category: 'content',
    patterns: [
      /\b(content calendar|editorial calendar|30[- ]?day content|monthly content|weekly content plan|content schedule|posting schedule|content plan)\b/,
    ],
    defaultLead: 'echo',
    defaultCollaborators: ['maya', 'nova', 'lyra'],
    pipelineId: 'content-calendar',
    pipelineKeywords: [
      'content calendar',
      'posting schedule',
      'editorial calendar',
      '30 day content',
      'monthly content plan',
      'content plan',
      'weekly content',
      'social media plan',
      'social calendar',
      'plan my content',
      'content for the month',
      'content for next month',
      'plan social content',
      'content schedule',
      'post schedule',
      'content roadmap',
      'weekly posting',
    ],
    priority: 95,
    executionHints: [
      'Structure the calendar as a practical publishing plan with clear cadence and channel fit.',
      'Include enough detail for copy, planning, and creative teams to execute without re-briefing.',
    ],
    complexity: 'high',
  },
  {
    id: 'creative-asset',
    label: 'Creative Asset',
    category: 'creative',
    patterns: [
      /\b(image|visual|artwork|design|creative asset|mockup|poster|hero image|ad creative|text over|text overlay|headline on image|post image|generate image|create image|infographic|social graphic|banner|display ad)\b/,
    ],
    defaultLead: 'lyra',
    defaultCollaborators: ['echo', 'maya'],
    pipelineId: 'ad-creative',
    pipelineKeywords: [
      'ad creative',
      'advertising creative',
      'ad assets',
      'banner ads',
      'creative asset',
      'post image',
      'headline on image',
      'social graphic',
      'ad image',
      'ad visuals',
      'display ad',
      'create an image',
      'generate image',
      'design a post',
      'visual asset',
      'creative for',
      'image for',
    ],
    priority: 90,
    executionHints: [
      'Define the visual concept, dimensions, copy overlays, and brand direction clearly.',
      'Keep the output production-ready rather than abstract.',
    ],
    complexity: 'medium',
  },
  {
    id: 'short-form-copy',
    label: 'Short-Form Business Copy',
    category: 'content',
    patterns: [
      /\b(whatsapp description|whatsapp bio|bio|profile description|short description|company description|brand description|tagline|one-liner|elevator pitch|slogan)\b/,
    ],
    defaultLead: 'echo',
    defaultCollaborators: ['maya'],
    pipelineId: null,
    pipelineKeywords: [],
    priority: 88,
    executionHints: [
      'Keep the output concise and polished rather than padded.',
      'Respect hard character limits and avoid extra strategy language unless explicitly requested.',
    ],
    complexity: 'low',
  },
  {
    id: 'campaign-copy',
    label: 'Campaign Copy',
    category: 'content',
    patterns: [
      /\b(facebook post|instagram post|linkedin post|social post|single post|caption|carousel post|campaign copy|campaign content|post copy|post for|social media copy|tweet|thread)\b/,
    ],
    defaultLead: 'echo',
    defaultCollaborators: ['maya'],
    pipelineId: null,
    pipelineKeywords: [],
    priority: 85,
    executionHints: [
      'Write platform-appropriate, audience-aware copy with clear hierarchy and intent.',
      'If the request is short-form, keep it concise and polished rather than over-structured.',
    ],
    complexity: 'medium',
  },
  {
    id: 'email-campaign',
    label: 'Email Campaign',
    category: 'content',
    patterns: [
      /\b(email campaign|email sequence|email template|newsletter|drip campaign|email marketing|welcome email|onboarding email|email flow|email series|email blast|edm)\b/,
    ],
    defaultLead: 'echo',
    defaultCollaborators: ['maya', 'nova'],
    pipelineId: null,
    pipelineKeywords: [
      'email campaign',
      'email sequence',
      'email marketing',
      'drip campaign',
      'newsletter',
      'email series',
      'welcome email',
      'onboarding email',
      'email flow',
      'email funnel',
    ],
    priority: 82,
    executionHints: [
      'Structure the output for direct use in an email workflow.',
      'Keep subject lines, preview text, and CTA distinct and usable.',
    ],
    complexity: 'medium',
  },
  {
    id: 'blog-article',
    label: 'Blog / Article',
    category: 'content',
    patterns: [
      /\b(blog post|blog article|article|thought leadership|op-?ed|long-?form content|guest post|pillar page|how-?to guide|listicle|write an article|write a blog)\b/,
    ],
    defaultLead: 'echo',
    defaultCollaborators: ['atlas', 'maya'],
    pipelineId: 'blog-post-writing',
    pipelineKeywords: [
      'blog post',
      'blog article',
      'write a blog',
      'write an article',
      'seo blog',
      'seo article',
      'content writer',
      'long-form article',
      'pillar page',
      'how-to guide',
      'guest post',
      'thought leadership article',
    ],
    priority: 80,
    executionHints: [
      'Ask for the main blog topic and primary focus keyword before drafting if either is missing.',
      'Follow the full blog writing checklist: SERP intent, title, slug, meta description, intro, TOC, heading hierarchy, keyword usage, E-E-A-T, visuals, links, AEO/GEO, conclusion, and pre/post-publish checks.',
      'Make the article substantive, reader-first, and clearly structured.',
    ],
    complexity: 'medium',
  },
  {
    id: 'website-copy',
    label: 'Website Copy',
    category: 'content',
    patterns: [
      /\b(website copy|web copy|landing page|homepage copy|about page|product page|service page|hero copy|website content|web content|page copy|site copy)\b/,
    ],
    defaultLead: 'echo',
    defaultCollaborators: ['maya', 'lyra'],
    pipelineId: null,
    pipelineKeywords: [],
    priority: 79,
    executionHints: [
      'Write for scanning, clarity, and conversion intent.',
      'Keep visual pairing and section hierarchy in mind.',
    ],
    complexity: 'medium',
  },
  {
    id: 'video-script',
    label: 'Video / Script',
    category: 'content',
    patterns: [
      /\b(video script|script for|youtube script|reel script|tiktok script|podcast script|voiceover|voice over|screenplay|storyboard script|explainer video|ad script|commercial script)\b/,
    ],
    defaultLead: 'echo',
    defaultCollaborators: ['lyra', 'maya'],
    pipelineId: null,
    pipelineKeywords: [],
    priority: 78,
    executionHints: [
      'Write with pacing, hook strength, and production clarity in mind.',
      'Separate spoken content from visual direction when useful.',
    ],
    complexity: 'medium',
  },
  {
    id: 'presentation',
    label: 'Presentation / Deck',
    category: 'content',
    patterns: [
      /\b(presentation|slide deck|pitch deck|keynote|powerpoint|pptx|investor deck|sales deck|stakeholder deck|board deck|proposal deck|slides)\b/,
    ],
    defaultLead: 'sage',
    defaultCollaborators: ['maya', 'lyra', 'echo'],
    pipelineId: null,
    pipelineKeywords: [],
    priority: 77,
    executionHints: [
      'Organize the deck around a clear narrative progression.',
      'Make slide-level messaging crisp and stakeholder-ready.',
    ],
    complexity: 'high',
  },
  {
    id: 'client-brief',
    label: 'Client Brief',
    category: 'communications',
    patterns: [
      /\b(client brief|briefing document|intake brief|onboarding brief|client onboarding|project brief|creative brief)\b/,
    ],
    defaultLead: 'sage',
    defaultCollaborators: ['maya', 'echo'],
    pipelineId: 'client-brief',
    pipelineKeywords: [
      'client brief',
      'briefing document',
      'intake brief',
      'onboarding brief',
      'client onboarding',
      'creative brief',
      'project brief',
      'brief for the client',
      'client summary',
      'kick-off brief',
      'kickoff brief',
      'client intake',
      'write a brief',
      'prepare a brief',
    ],
    priority: 78,
    executionHints: [
      'Structure the brief so any team member can understand scope, goals, audience, deliverables, and open questions.',
    ],
    complexity: 'medium',
  },
  {
    id: 'strategy-brief',
    label: 'Strategy Brief',
    category: 'strategy',
    patterns: [
      /\b(strategy|strategic|positioning|messaging|message pillars|value proposition|go-?to-?market|gtm|brand strategy|brand positioning|growth strategy|marketing strategy|digital strategy|comms strategy|communication strategy)\b/,
      /\b(why they are not buying|why they're not buying|what do they want|what value are they seeking|sales issue|sales problem|conversion issue)\b/,
    ],
    defaultLead: 'maya',
    defaultCollaborators: ['atlas', 'sage'],
    pipelineId: 'strategy-brief',
    pipelineKeywords: [
      'strategy brief',
      'brand strategy',
      'messaging strategy',
      'positioning',
      'strategic brief',
      'brand platform',
      'go-to-market',
      'gtm strategy',
      'value proposition',
      'message pillars',
      'messaging framework',
      'brand positioning',
      'growth strategy',
      'marketing strategy',
      'comms strategy',
      'communication strategy',
      'strategic plan',
      'why are they not buying',
      'why they are not buying',
      'what do customers want',
    ],
    priority: 76,
    executionHints: [
      'Translate analysis into clear positioning, message direction, and practical recommendations.',
      'Make the output decision-ready, not just descriptive.',
    ],
    complexity: 'high',
  },
  {
    id: 'campaign-strategy',
    label: 'Campaign Strategy',
    category: 'strategy',
    patterns: [
      /\b(campaign strategy|campaign plan|media strategy|launch plan|launch strategy|promotion strategy|campaign brief|integrated campaign|omnichannel campaign)\b/,
    ],
    defaultLead: 'maya',
    defaultCollaborators: ['nova', 'echo', 'atlas'],
    pipelineId: 'campaign-brief',
    pipelineKeywords: [
      'campaign brief',
      'campaign strategy',
      'marketing campaign',
      'campaign plan',
      'campaign concept',
      'launch plan',
      'integrated campaign',
      'campaign idea',
      'plan a campaign',
      'run a campaign',
      'launch strategy',
      'promotion strategy',
      'omnichannel campaign',
      'multichannel campaign',
      'product launch',
      'media strategy',
    ],
    priority: 74,
    executionHints: [
      'Map the strategy across channels, phases, audience logic, and success metrics.',
      'Keep the recommendations actionable for execution teams.',
    ],
    complexity: 'high',
  },
  {
    id: 'brand-guidelines',
    label: 'Brand Guidelines',
    category: 'strategy',
    patterns: [
      /\b(brand guidelines|brand book|style guide|brand identity|visual identity|brand manual|brand standards|design system|brand kit)\b/,
    ],
    defaultLead: 'lyra',
    defaultCollaborators: ['maya', 'echo'],
    pipelineId: null,
    pipelineKeywords: [],
    priority: 73,
    executionHints: [
      'Cover both verbal and visual identity rules in a usable way.',
      'Favor concrete standards and examples over abstract branding language.',
    ],
    complexity: 'high',
  },
  {
    id: 'research-brief',
    label: 'Research Brief',
    category: 'research',
    patterns: [
      /\b(market analysis|audience research|customer insight|target audience|competitor|competitive analysis|market research|consumer research|industry analysis|benchmark|benchmarking|trend analysis|trend report|landscape analysis)\b/,
    ],
    defaultLead: 'atlas',
    defaultCollaborators: ['maya', 'echo'],
    pipelineId: 'competitor-research',
    pipelineKeywords: [
      'competitor research',
      'competitive analysis',
      'competitor report',
      'market research',
      'competitor intelligence',
      'audience research',
      'market analysis',
      'research the market',
      'research competitors',
      'who are our competitors',
      'competitive landscape',
      'industry analysis',
      'benchmark report',
      'trend report',
      'customer insights',
      'target audience analysis',
      'consumer research',
    ],
    priority: 72,
    executionHints: [
      'Separate observed evidence from interpretation and recommendations.',
      'Be specific enough that strategy and content teams can act on the output directly.',
    ],
    complexity: 'high',
  },
  {
    id: 'seo-audit',
    label: 'SEO Audit',
    category: 'technical',
    patterns: [
      /\b(seo audit|technical seo|search audit|keyword research|keyword analysis|seo report|seo strategy|search engine|serp|backlink audit|on-?page seo|off-?page seo|site audit|website audit|audit my site|audit my website|website performance analysis|website performance|page speed|pagespeed|core web vitals|lighthouse audit|full website audit|ux\/ui website audit|ui\/ux website audit)\b/,
    ],
    defaultLead: 'atlas',
    defaultCollaborators: ['echo', 'nova'],
    pipelineId: 'seo-audit',
    pipelineKeywords: [
      'seo audit',
      'seo analysis',
      'search engine optimization',
      'keyword research',
      'technical seo',
      'seo report',
      'seo strategy',
      'check my seo',
      'audit my site',
      'website seo',
      'website audit',
      'full website audit',
      'website performance',
      'website performance analysis',
      'ux/ui website audit',
      'ui/ux website audit',
      'page speed',
      'pagespeed',
      'core web vitals',
      'search ranking',
      'serp',
      'on-page seo',
      'backlink audit',
      'site health',
      'keyword gap',
    ],
    priority: 78,
    executionHints: [
      'Require a target website URL before starting the audit.',
      'Produce a Pinpointer-style report with an overall score, 10 category scores, automated checks, AI insights, top priorities, and a 30/60/90 action roadmap.',
    ],
    complexity: 'high',
  },
  {
    id: 'ui-audit',
    label: 'UI/UX Audit',
    category: 'technical',
    patterns: [
      /\b(ui audit|ux audit|website audit|page audit|usability audit|accessibility audit|heuristic evaluation|design review|ux review|cro audit|conversion audit)\b/,
    ],
    defaultLead: 'finn',
    defaultCollaborators: ['lyra', 'echo', 'dex'],
    pipelineId: 'seo-audit',
    pipelineKeywords: [
      'ui audit',
      'ux audit',
      'ux/ui website audit',
      'ui/ux website audit',
      'website audit',
      'website ux',
      'website ui',
      'usability audit',
      'accessibility audit',
      'conversion audit',
    ],
    priority: 68,
    executionHints: [
      'Organize findings by severity, evidence, and recommended fix.',
      'Balance design, copy, accessibility, and conversion considerations.',
    ],
    complexity: 'high',
  },
  {
    id: 'pr-comms',
    label: 'PR / Communications',
    category: 'communications',
    patterns: [
      /\b(press release|pr strategy|media release|public relations|media kit|press kit|media pitch|crisis comms|crisis communication|pr plan|media outreach|earned media|spokesperson)\b/,
    ],
    defaultLead: 'sage',
    defaultCollaborators: ['echo', 'maya'],
    pipelineId: null,
    pipelineKeywords: [],
    priority: 67,
    executionHints: [
      'Keep the communication clear, controlled, and externally usable.',
      'Make quotes and messaging lines feel publishable, not internal.',
    ],
    complexity: 'medium',
  },
  {
    id: 'event-plan',
    label: 'Event Plan',
    category: 'operations',
    patterns: [
      /\b(event plan|event strategy|conference|webinar|workshop|summit|meetup|event brief|activation|experiential|launch event|virtual event|hybrid event)\b/,
    ],
    defaultLead: 'nova',
    defaultCollaborators: ['maya', 'sage', 'echo'],
    pipelineId: null,
    pipelineKeywords: [],
    priority: 65,
    executionHints: [
      'Balance logistics, promotion, audience experience, and communication planning.',
    ],
    complexity: 'high',
  },
  {
    id: 'media-plan',
    label: 'Media Plan',
    category: 'operations',
    patterns: [
      /\b(media plan|channel plan|budget allocation|forecast|media budget|media mix|paid media|organic media|media strategy|ad spend|advertising plan|media allocation)\b/,
    ],
    defaultLead: 'nova',
    defaultCollaborators: ['maya', 'atlas'],
    pipelineId: 'media-plan',
    pipelineKeywords: [
      'media plan',
      'media strategy',
      'channel strategy',
      'budget allocation',
      'media buying',
      'ad spend',
      'channel mix',
      'paid media plan',
      'media budget',
      'channel plan',
      'how to spend our budget',
      'allocate the budget',
      'advertising plan',
      'paid channels',
      'organic channels',
    ],
    priority: 66,
    executionHints: [
      'Break the plan into channels, objective, audience, budget logic, and KPI framework.',
    ],
    complexity: 'high',
  },
  {
    id: 'budget-sheet',
    label: 'Budget Sheet',
    category: 'operations',
    patterns: [
      /\b(budget sheet|budget breakdown|cost estimate|cost breakdown|budget template|financial plan|spend tracker)\b/,
    ],
    defaultLead: 'dex',
    defaultCollaborators: ['nova', 'maya'],
    pipelineId: null,
    pipelineKeywords: ['budget', 'budget sheet'],
    priority: 60,
    executionHints: ['Present structured line items, assumptions, subtotals, and totals clearly.'],
    complexity: 'medium',
  },
  {
    id: 'kpi-forecast',
    label: 'KPI Forecast',
    category: 'analytics',
    patterns: [
      /\b(kpi forecast|kpi projection|performance forecast|growth forecast|target setting|goal setting|okr|projection)\b/,
    ],
    defaultLead: 'dex',
    defaultCollaborators: ['atlas', 'nova'],
    pipelineId: null,
    pipelineKeywords: ['kpi', 'forecast', 'projection'],
    priority: 58,
    executionHints: [
      'Show baseline, assumptions, targets, time horizon, and confidence/uncertainty where appropriate.',
    ],
    complexity: 'medium',
  },
  {
    id: 'data-analysis',
    label: 'Data / Analytics Report',
    category: 'analytics',
    patterns: [
      /\b(data analysis|analytics report|performance report|dashboard|kpi report|metrics|roi analysis|attribution|conversion rate|funnel analysis|analytics audit|data audit|reporting)\b/,
    ],
    defaultLead: 'atlas',
    defaultCollaborators: ['nova', 'maya'],
    pipelineId: null,
    pipelineKeywords: [],
    priority: 59,
    executionHints: [
      'Translate metrics into decisions and recommended actions.',
      'Separate raw findings from interpretation and next steps.',
    ],
    complexity: 'high',
  },
  {
    id: 'financial-operations',
    label: 'Finance Operations',
    category: 'operations',
    patterns: [
      /\b(accounts payable|accounts receivable|ap\b|ar\b|invoice workflow|collections tracker|payment approval|expense process|month[- ]end close|close checklist|reconciliation process|accounting operations)\b/,
    ],
    defaultLead: 'aria',
    defaultCollaborators: ['ledger', 'vera'],
    pipelineId: 'finance-operations',
    pipelineKeywords: ['accounts payable', 'accounts receivable', 'invoice workflow', 'month end close', 'financial controls', 'accounting operations'],
    priority: 84,
    executionHints: [
      'Build an owner-led process with evidence, approvals, timing, and exception handling.',
      'Do not create accounting entries or provide tax, legal, or audit advice.',
    ],
    complexity: 'high',
  },
  {
    id: 'financial-report',
    label: 'Financial Report / Forecast',
    category: 'analytics',
    patterns: [
      /\b(financial report|management accounts|budget vs actual|budget versus actual|financial forecast|cash flow forecast|cashflow forecast|liquidity forecast|financial planning|financial analysis|working capital)\b/,
    ],
    defaultLead: 'ledger',
    defaultCollaborators: ['nora', 'cash'],
    pipelineId: 'finance-operations',
    pipelineKeywords: ['financial report', 'management accounts', 'cash flow forecast', 'financial forecast', 'budget versus actual', 'working capital'],
    priority: 83,
    executionHints: [
      'Separate supplied facts, calculated results, assumptions, and forecast ranges.',
      'End with decisions and actions rather than generic finance commentary.',
    ],
    complexity: 'high',
  },
  {
    id: 'talent-acquisition',
    label: 'Talent Acquisition',
    category: 'operations',
    patterns: [
      /\b(hire|hiring|recruit|recruitment|job description|job brief|candidate|interview scorecard|interview plan|talent acquisition|sourcing plan)\b/,
    ],
    defaultLead: 'remy',
    defaultCollaborators: ['harper'],
    pipelineId: 'people-operations',
    pipelineKeywords: ['hiring plan', 'job description', 'candidate', 'interview scorecard', 'recruitment'],
    priority: 82,
    executionHints: [
      'Use job-relevant competencies and evidence-based evaluation.',
      'Do not infer protected characteristics or make final hiring decisions.',
    ],
    complexity: 'high',
  },
  {
    id: 'people-operations',
    label: 'People Operations',
    category: 'operations',
    patterns: [
      /\b(hr policy|human resources|people operations|onboarding process|offboarding process|employee handbook|employee engagement|performance management|employee relations|manager playbook|learning and development|training plan)\b/,
    ],
    defaultLead: 'harper',
    defaultCollaborators: ['ellis', 'devon'],
    pipelineId: 'people-operations',
    pipelineKeywords: ['people operations', 'hr policy', 'onboarding', 'employee handbook', 'performance management', 'learning and development'],
    priority: 81,
    executionHints: [
      'Create a fair, privacy-aware operating process with human review boundaries.',
      'Do not make employment decisions or provide legal advice.',
    ],
    complexity: 'high',
  },
  {
    id: 'partnership-strategy',
    label: 'Partnership Strategy',
    category: 'strategy',
    patterns: [
      /\b(partnership strategy|strategic partnership|partner program|partner landscape|alliance strategy|co[- ]?marketing partnership|channel partner)\b/,
    ],
    defaultLead: 'mira',
    defaultCollaborators: ['orion', 'atlas'],
    pipelineId: 'business-development',
    pipelineKeywords: ['partnership strategy', 'partner program', 'strategic partnership', 'alliance'],
    priority: 80,
    executionHints: [
      'Make the mutual value exchange, governance, and success metrics concrete.',
      'Do not claim that a partnership exists without confirmation.',
    ],
    complexity: 'high',
  },
  {
    id: 'business-development',
    label: 'Business Development',
    category: 'strategy',
    patterns: [
      /\b(business development|sales pipeline|lead generation strategy|target accounts|account plan|market entry|outbound strategy|prospecting strategy|new business)\b/,
    ],
    defaultLead: 'orion',
    defaultCollaborators: ['mira', 'atlas'],
    pipelineId: 'business-development',
    pipelineKeywords: ['business development', 'sales pipeline', 'target accounts', 'market entry', 'prospecting'],
    priority: 79,
    executionHints: [
      'Tie account prioritisation and outreach to a specific offer and buying context.',
      'Do not invent prospects, relationships, pipeline, or revenue.',
    ],
    complexity: 'high',
  },
  {
    id: 'general-task',
    label: 'General Task',
    category: 'operations',
    patterns: [],
    defaultLead: 'maya',
    defaultCollaborators: ['atlas'],
    pipelineId: null,
    pipelineKeywords: [],
    priority: 1,
    executionHints: [
      'Choose the clearest useful format for the request.',
      'Make reasonable assumptions explicit when the request is underspecified.',
    ],
    complexity: 'medium',
  },
  {
    id: 'status-report',
    label: 'Status Report',
    category: 'operations',
    patterns: [],
    defaultLead: 'iris',
    defaultCollaborators: [],
    pipelineId: null,
    pipelineKeywords: [],
    priority: 0,
    executionHints: [],
    complexity: 'low',
  },
]

export function getDeliverableSpec(id: DeliverableType | string): DeliverableSpec {
  return (
    DELIVERABLE_REGISTRY.find((spec) => spec.id === id) ||
    DELIVERABLE_REGISTRY.find((spec) => spec.id === 'status-report')!
  )
}

export function listDeliverableSpecs(): DeliverableSpec[] {
  return DELIVERABLE_REGISTRY
}
