'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import {
  useAgentsStore,
  ChatMessage,
  createAppPersistenceSnapshot,
  IrisConversationBriefing,
  IrisBriefField,
} from '@/lib/agents-store'
import { AgentBot } from '@/components/agents/AgentBot'
import { clsx } from 'clsx'
import { getModelLabel, getProviderLabel } from '@/lib/providers'
import { Paperclip, Send, X, Image, FileText, File, AlertCircle, Loader2, Plus, Trash2, ExternalLink, GitBranch } from 'lucide-react'
import { buildTaskTitleFromRequest } from '@/lib/task-output'
import { getStoredToken } from '@/lib/auth/browser'
import { DeliverableType } from '@/lib/types'
import {
  DELIVERABLE_REGISTRY as CANONICAL_DELIVERABLE_REGISTRY,
  inferDeliverableType as canonicalInferDeliverableType,
  isConversationalMessage as canonicalIsConversationalMessage,
  isSubstantiveRequest as canonicalIsSubstantiveRequest,
} from '@/lib/intents/intent-classifier'

const OBJECTIVE_OPTIONS = [
  { label: 'Awareness', value: 'awareness' },
  { label: 'Engagement', value: 'engagement' },
  { label: 'Lead Generation', value: 'lead generation' },
  { label: 'Traffic', value: 'traffic' },
  { label: 'Conversions', value: 'conversions' },
  { label: 'Education', value: 'education' },
  { label: 'Brand Building', value: 'brand building' },
  { label: 'Thought Leadership', value: 'thought leadership' },
]

const PLATFORM_OPTIONS = [
  { label: 'Instagram', value: 'Instagram' },
  { label: 'Facebook', value: 'Facebook' },
  { label: 'Instagram + Facebook', value: 'Instagram + Facebook' },
  { label: 'LinkedIn', value: 'LinkedIn' },
  { label: 'TikTok', value: 'TikTok' },
  { label: 'X (Twitter)', value: 'X' },
  { label: 'YouTube', value: 'YouTube' },
  { label: 'Email', value: 'Email' },
  { label: 'Website', value: 'Website' },
  { label: 'All Platforms', value: 'All platforms' },
]

const FORMAT_OPTIONS = [
  { label: 'Single Post', value: 'single post' },
  { label: 'Carousel', value: 'carousel' },
  { label: 'Story', value: 'story' },
  { label: 'Reel / Video', value: 'reel' },
  { label: 'Ad Creative', value: 'ad creative' },
  { label: 'Long-form Article', value: 'long-form article' },
  { label: 'Presentation', value: 'presentation' },
  { label: 'Report / Document', value: 'report' },
]

const TIMEFRAME_OPTIONS = [
  { label: '7 Days', value: '7-day calendar' },
  { label: '14 Days', value: '14-day calendar' },
  { label: '30 Days', value: '30-day calendar' },
  { label: 'This Month', value: 'this month' },
  { label: 'This Quarter', value: 'this quarter' },
  { label: 'Custom', value: 'custom' },
]

const CADENCE_OPTIONS = [
  { label: '3 Posts', value: '3 posts per platform' },
  { label: '5 Posts', value: '5 posts per platform' },
  { label: '10 Posts', value: '10 posts per platform' },
  { label: 'Daily', value: 'daily posting cadence' },
  { label: '3x per Week', value: '3 times per week' },
]

const ARTWORK_OPTIONS = [
  { label: 'Yes, include artwork', value: 'yes' },
  { label: 'No, copy only', value: 'no' },
]

type IntakePromptConfig = NonNullable<NonNullable<ChatMessage['meta']>['intakePrompt']>

// Deliverable inference is delegated to the canonical classifier.
// `DELIVERABLE_SPECS` is kept here only as a *display* lookup so existing
// code that does `DELIVERABLE_SPECS.find(...)?.label` keeps working —
// patterns are no longer used for classification (the classifier owns that).
type DeliverableSpec = {
  id: DeliverableType
  label: string
  patterns: RegExp[]
}

const _LEGACY_DELIVERABLE_SPECS: DeliverableSpec[] = [
  {
    id: 'content-calendar',
    label: 'Content Calendar',
    patterns: [
      /\b(content calendar|editorial calendar|30[- ]?day content|monthly content|weekly content plan|content schedule|posting schedule|content plan)\b/,
    ],
  },
  {
    id: 'creative-asset',
    label: 'Creative Asset',
    patterns: [
      /\b(image|visual|artwork|design|creative asset|mockup|poster|hero image|ad creative|text over|text overlay|headline on image|post image|generate image|create image|infographic|social graphic|banner|display ad)\b/,
    ],
  },
  {
    id: 'short-form-copy',
    label: 'Short-Form Business Copy',
    patterns: [
      /\b(whatsapp description|whatsapp bio|bio|profile description|short description|company description|brand description|tagline|one-liner|elevator pitch|slogan)\b/,
    ],
  },
  {
    id: 'campaign-copy',
    label: 'Campaign Copy',
    patterns: [
      /\b(facebook post|instagram post|linkedin post|social post|single post|caption|carousel|campaign copy|campaign content|post copy|post for|social media copy|tweet|thread)\b/,
    ],
  },
  {
    id: 'email-campaign',
    label: 'Email Campaign',
    patterns: [
      /\b(email campaign|email sequence|email template|newsletter|drip campaign|welcome email|email flow|email series|email blast)\b/,
    ],
  },
  {
    id: 'blog-article',
    label: 'Blog / Article',
    patterns: [
      /\b(blog post|blog article|article|thought leadership|op-?ed|long-?form content|guest post|how-?to guide|listicle|write an article|write a blog)\b/,
    ],
  },
  {
    id: 'website-copy',
    label: 'Website Copy',
    patterns: [
      /\b(website copy|web copy|landing page|homepage copy|about page|product page|service page|hero copy|website content|web content|page copy|site copy)\b/,
    ],
  },
  {
    id: 'video-script',
    label: 'Video / Script',
    patterns: [
      /\b(video script|script for|youtube script|reel script|tiktok script|podcast script|voiceover|voice over|explainer video|ad script|commercial script)\b/,
    ],
  },
  {
    id: 'presentation',
    label: 'Presentation / Deck',
    patterns: [
      /\b(presentation|slide deck|pitch deck|keynote|powerpoint|pptx|investor deck|sales deck|stakeholder deck|board deck|proposal deck|slides)\b/,
    ],
  },
  {
    id: 'seo-audit',
    label: 'SEO Audit',
    patterns: [
      /\b(seo audit|technical seo|search audit|keyword research|keyword analysis|seo report|seo strategy|serp|backlink audit|on-?page seo|off-?page seo|site audit)\b/,
    ],
  },
  {
    id: 'ui-audit',
    label: 'UI/UX Audit',
    patterns: [
      /\b(ui audit|ux audit|website audit|page audit|usability audit|accessibility audit|heuristic evaluation|design review|ux review|cro audit|conversion audit)\b/,
    ],
  },
  {
    id: 'media-plan',
    label: 'Media Plan',
    patterns: [
      /\b(media plan|channel plan|budget|forecast|media budget|media mix|paid media|organic media|ad spend|advertising plan|media allocation)\b/,
    ],
  },
  {
    id: 'research-brief',
    label: 'Research Brief',
    patterns: [
      /\b(market analysis|audience research|customer insight|target audience|competitor|competitive analysis|market research|consumer research|industry analysis|benchmark|benchmarking|trend analysis|trend report|landscape analysis)\b/,
    ],
  },
  {
    id: 'campaign-strategy',
    label: 'Campaign Strategy',
    patterns: [
      /\b(campaign strategy|campaign plan|launch plan|launch strategy|promotion strategy|campaign brief|integrated campaign|omnichannel campaign)\b/,
    ],
  },
  {
    id: 'strategy-brief',
    label: 'Strategy Brief',
    patterns: [
      /\b(strategy|strategic|positioning|messaging|message pillars|value proposition|go-?to-?market|gtm|brand strategy|brand positioning|growth strategy|marketing strategy|digital strategy|communication strategy)\b/,
      /\b(why they are not buying|why they're not buying|what do they want|what value are they seeking|sales issue|sales problem|conversion issue)\b/,
    ],
  },
  {
    id: 'brand-guidelines',
    label: 'Brand Guidelines',
    patterns: [
      /\b(brand guidelines|brand book|style guide|brand identity|visual identity|brand manual|brand standards|design system|brand kit)\b/,
    ],
  },
  {
    id: 'data-analysis',
    label: 'Data / Analytics Report',
    patterns: [
      /\b(data analysis|analytics report|performance report|dashboard|kpi report|metrics|roi analysis|attribution|conversion rate|funnel analysis|analytics audit|data audit|reporting)\b/,
    ],
  },
  {
    id: 'pr-comms',
    label: 'PR / Communications',
    patterns: [
      /\b(press release|pr strategy|media release|public relations|media kit|press kit|media pitch|crisis comms|crisis communication|pr plan|media outreach|earned media|spokesperson)\b/,
    ],
  },
  {
    id: 'event-plan',
    label: 'Event Plan',
    patterns: [
      /\b(event plan|event strategy|conference|webinar|workshop|summit|meetup|event brief|activation|experiential|launch event|virtual event|hybrid event)\b/,
    ],
  },
]

const IRIS = {
  id: 'iris',
  name: 'Iris',
  role: 'Operations Lead',
  avatar: 'bot-purple',
  color: '#a78bfa',
  status: 'active' as const,
}

// Build a name lookup once from both the legacy display map and the canonical
// registry, so labels for newly-added deliverables (added by the registry
// only) still render correctly.
const DELIVERABLE_LABEL_MAP: Record<string, string> = (() => {
  const map: Record<string, string> = {}
  for (const spec of _LEGACY_DELIVERABLE_SPECS) map[spec.id] = spec.label
  for (const spec of CANONICAL_DELIVERABLE_REGISTRY) map[spec.id] = map[spec.id] || spec.label
  return map
})()

function getDeliverableLabel(deliverableType: DeliverableType | string) {
  return DELIVERABLE_LABEL_MAP[String(deliverableType)] || 'Task'
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return <Image size={14} className="text-accent-purple" />
  if (type.includes('pdf')) return <FileText size={14} className="text-accent-red" />
  if (type.includes('sheet') || type.includes('excel')) return <FileText size={14} className="text-accent-green" />
  return <File size={14} className="text-accent-blue" />
}

function looksLikeSavedDeliverable(content: string) {
  const trimmed = content.trim()
  if (!trimmed) return false

  const lower = trimmed.toLowerCase()
  const invalidPatterns = [
    'task routed to',
    'lead agent',
    'status: in progress',
    'delivery:',
    'next steps:',
    'i have not drafted the deliverable yet',
    'no completed or delivered file exists',
  ]

  if (invalidPatterns.some((pattern) => lower.includes(pattern))) return false
  if (/^#\s+.+/m.test(trimmed) || /^##\s+.+/m.test(trimmed)) return trimmed.length >= 40
  if (trimmed.length < 80) return false

  return true
}

function passesQualityGate(meta?: ChatMessage['meta']) {
  const quality = (meta as any)?.quality
  if (!quality) return true
  return quality.ok !== false
}

function isLikelyDeliverableResponse(content: string) {
  const trimmed = content.trim()
  if (!trimmed) return false

  const lower = trimmed.toLowerCase()
  const invalidPatterns = [
    'task routed to',
    'lead agent',
    'status: in progress',
    'delivery:',
    'next steps:',
    'i have not drafted the deliverable yet',
    'no completed or delivered file exists',
    'iris could not complete that request',
    'chat request failed',
  ]

  if (invalidPatterns.some((pattern) => lower.includes(pattern))) return false
  if (/^#\s+.+/m.test(trimmed) || /^##\s+.+/m.test(trimmed)) return trimmed.length >= 32
  return trimmed.length >= 60
}

function deriveMissionOutcome(input: {
  deliverableType: string
  shouldPersistArtifact: boolean
  qualityOk?: boolean
  executionSteps?: Array<{ status?: string }>
}) {
  const hasExecution = Boolean(input.executionSteps?.length)

  if (input.deliverableType === 'status-report') {
    return { status: 'completed' as const, progress: 100 }
  }

  if (input.shouldPersistArtifact) {
    return {
      status: 'review' as const,
      progress: input.qualityOk === false ? 82 : 88,
    }
  }

  if (hasExecution) {
    return {
      status: input.qualityOk === false ? ('blocked' as const) : ('in_progress' as const),
      progress: input.qualityOk === false ? 52 : 72,
    }
  }

  return { status: 'blocked' as const, progress: 0 }
}

function buildAssignmentNote(meta?: ChatMessage['meta']) {
  if (!meta?.leadAgentId) return ''

  const collaborators = meta.collaboratorAgentIds?.length
    ? `Support: ${meta.collaboratorAgentIds.join(', ')}`
    : 'Support: none'
  const pipeline = meta.pipelineName ? `Pipeline: ${meta.pipelineName}` : 'Pipeline: direct execution'

  return `Lead: ${meta.leadAgentId} · ${collaborators} · ${pipeline}`
}

// All inference now delegates to the canonical classifier so the chat
// route, the mission store, the standalone pipeline runner, and IrisChat
// always agree on what a given user message is.
function isSubstantiveRequest(message: string) {
  return canonicalIsSubstantiveRequest(message)
}

function shouldOpenMissionForMessage(message: string) {
  if (!message.trim()) return false
  if (canonicalIsConversationalMessage(message)) return false
  if (canonicalInferDeliverableType(message) !== 'status-report') return true
  return canonicalIsSubstantiveRequest(message)
}

function inferDeliverableFromPrompt(message: string) {
  return canonicalInferDeliverableType(message)
}

// Stub kept for the legacy structure of the function body that still references
// `bestId` for downstream early-return safety. The real return path is above.
function _legacy_inferDeliverableFromPrompt_unused(message: string) {
  const lower = message.toLowerCase()
  let bestId: DeliverableType | 'status-report' = 'status-report'
  let bestScore = 0

  for (const spec of _LEGACY_DELIVERABLE_SPECS) {
    let score = 0

    for (const pattern of spec.patterns) {
      const matches = lower.match(pattern)
      if (matches) {
        score += 10
        score += (matches[0]?.length || 0) * 0.5
      }
    }

    if (spec.id === 'creative-asset' && score > 0) {
      if (!/\b(post|caption|instagram|facebook|linkedin|social|ad|banner|display|creative|visual|image|artwork|design)\b/.test(lower)) {
        score *= 0.4
      }
    }

    if (score > bestScore) {
      bestScore = score
      bestId = spec.id
    }
  }

  if (bestScore >= 5) return bestId
  return 'status-report'
}

function extractBriefFields(text: string) {
  const lower = text.toLowerCase()
  const fields: IrisConversationBriefing['fields'] = {}

  const objectiveDetectors: Array<{ pattern: RegExp; value: string }> = [
    { pattern: /\b(awareness|brand awareness|raise awareness)\b/, value: 'awareness' },
    { pattern: /\b(engagement|engage|interaction|community)\b/, value: 'engagement' },
    { pattern: /\b(lead gen|lead generation|generate leads|capture leads|leads)\b/, value: 'lead generation' },
    { pattern: /\b(traffic|drive traffic|website visits|click-?through)\b/, value: 'traffic' },
    { pattern: /\b(conversions?|convert|sales|revenue|purchase)\b/, value: 'conversions' },
    { pattern: /\b(education|educate|inform|teach|tutorial)\b/, value: 'education' },
    { pattern: /\b(brand building|brand equity|brand love)\b/, value: 'brand building' },
    { pattern: /\b(thought leadership|authority|expert|expertise)\b/, value: 'thought leadership' },
  ]
  const objective = objectiveDetectors.find((entry) => entry.pattern.test(lower))
  if (objective) fields.objective = objective.value

  const platforms = [
    lower.includes('instagram') ? 'Instagram' : null,
    lower.includes('facebook') ? 'Facebook' : null,
    lower.includes('linkedin') ? 'LinkedIn' : null,
    lower.includes('tiktok') ? 'TikTok' : null,
    /\b(x|twitter)\b/.test(lower) ? 'X' : null,
    lower.includes('youtube') ? 'YouTube' : null,
    lower.includes('email') ? 'Email' : null,
    lower.includes('website') ? 'Website' : null,
  ].filter(Boolean) as string[]
  if (platforms.length) fields.platforms = Array.from(new Set(platforms))
  if (lower.includes('all platforms')) fields.platforms = ['All platforms']

  if (/(single post|static post)/.test(lower)) fields.format = 'single post'
  else if (/\bcarousel\b/.test(lower)) fields.format = 'carousel'
  else if (/\bstory\b/.test(lower)) fields.format = 'story'
  else if (/\breel|video\b/.test(lower)) fields.format = 'reel'
  else if (/\bad creative|banner\b/.test(lower)) fields.format = 'ad creative'
  else if (/\b(long-?form|article|blog)\b/.test(lower)) fields.format = 'long-form article'
  else if (/\b(presentation|deck|slides)\b/.test(lower)) fields.format = 'presentation'
  else if (/\b(report|document|white-?paper)\b/.test(lower)) fields.format = 'report'

  const timeframeMatch = text.match(/(?:month of\s+[A-Za-z]+|[A-Za-z]+\s+calendar|30-day calendar|14-day calendar|7-day calendar|this month|this week|this quarter|next quarter|next month|next week|\d+\s*-?\s*day calendar)/i)
  if (timeframeMatch && !/^[A-Za-z]+\s+calendar$/i.test(timeframeMatch[0])) fields.timeframe = timeframeMatch[0]

  const cadenceMatch = text.match(/(\d+\s+posts?\s+(?:per\s+(?:channel|platform)|for each platform|per platform)|daily posting cadence|daily|\d+x?\s*(?:per|times?\s+per)\s*week)/i)
  if (cadenceMatch) fields.cadence = cadenceMatch[0]

  if (/\b(image|artwork|creative|visual|post image|include artwork|with artwork|create the image)\b/.test(lower)) {
    fields.includeArtwork = true
  } else if (/\b(no artwork|copy only|text only|without artwork|without image|no design|no visual)\b/.test(lower)) {
    fields.includeArtwork = false
  }

  return fields
}

function isShortFormBusinessCopyRequest(request: string) {
  return /\b(whatsapp description|whatsapp bio|bio|profile description|short description|company description|brand description|tagline|one-liner)\b/i.test(
    request
  )
}

function isSocialCampaignCopyRequest(request: string) {
  const lower = request.toLowerCase()
  return (
    /\b(facebook post|instagram post|linkedin post|social post|single post|caption|carousel|campaign copy|campaign content|post copy|post for)\b/.test(
      lower
    ) &&
    !isShortFormBusinessCopyRequest(request)
  )
}

function getRequiredBriefFields(briefing: IrisConversationBriefing) {
  const { deliverableType, originalRequest } = briefing

  if (deliverableType === 'content-calendar') {
    return ['objective', 'platforms', 'timeframe', 'cadence', 'includeArtwork'] as IrisBriefField[]
  }
  if (deliverableType === 'creative-asset') {
    return ['objective', 'platforms', 'format', 'includeArtwork'] as IrisBriefField[]
  }
  if (deliverableType === 'email-campaign') {
    return ['objective'] as IrisBriefField[]
  }
  if (deliverableType === 'blog-article' || deliverableType === 'website-copy' || deliverableType === 'video-script' || deliverableType === 'presentation') {
    return ['objective'] as IrisBriefField[]
  }
  if (deliverableType === 'strategy-brief' || deliverableType === 'campaign-strategy' || deliverableType === 'research-brief' || deliverableType === 'data-analysis' || deliverableType === 'pr-comms' || deliverableType === 'event-plan') {
    return ['objective'] as IrisBriefField[]
  }
  if (deliverableType === 'campaign-copy') {
    if (isSocialCampaignCopyRequest(originalRequest)) {
      return ['objective', 'platforms', 'format', 'includeArtwork'] as IrisBriefField[]
    }

    return [] as IrisBriefField[]
  }
  if (deliverableType === 'short-form-copy' || deliverableType === 'brand-guidelines') {
    return [] as IrisBriefField[]
  }
  return [] as IrisBriefField[]
}

function getNextMissingField(briefing: IrisConversationBriefing) {
  const required = getRequiredBriefFields(briefing)
  for (const field of required) {
    const value = briefing.fields[field]
    if (field === 'platforms') {
      if (!Array.isArray(value) || value.length === 0) return field
      continue
    }
    if (typeof value === 'undefined' || value === null || value === '') return field
  }
  return null
}

function buildIntakePrompt(briefing: IrisConversationBriefing): IntakePromptConfig | null {
  const field = getNextMissingField(briefing)
  if (!field) return null
  const deliverableLabel = getDeliverableLabel(briefing.deliverableType).toLowerCase()

  switch (field) {
    case 'objective':
      return {
        field,
        question: `What are the objectives for this ${deliverableLabel}?`,
        helperText: 'Select one or more. This helps Iris pick the right lead agent, tone, and pipeline.',
        multiSelect: true,
        options: OBJECTIVE_OPTIONS,
      }
    case 'platforms':
      return {
        field,
        question: 'Which platforms should this target?',
        helperText: 'Select one or more channels.',
        multiSelect: true,
        options: PLATFORM_OPTIONS,
      }
    case 'format':
      return {
        field,
        question: 'What format do you want?',
        helperText: `Iris will adapt the ${deliverableLabel} structure to the chosen format.`,
        options: FORMAT_OPTIONS,
      }
    case 'timeframe':
      return {
        field,
        question: 'What timeframe should this cover?',
        helperText: 'Choose the period so the scheduling pipeline can lock the plan.',
        options: TIMEFRAME_OPTIONS,
      }
    case 'cadence':
      return {
        field,
        question: 'What posting cadence do you want?',
        helperText: 'This controls how many ideas and posts the calendar should generate.',
        options: CADENCE_OPTIONS,
      }
    case 'includeArtwork':
      return {
        field,
        question: 'Do you want Iris to include the artwork / creative too?',
        helperText: 'Selecting yes triggers the visual workflow and Nano Banana Pro guidance.',
        options: ARTWORK_OPTIONS,
      }
    default:
      return null
  }
}

function buildBriefingMessage(briefing: IrisConversationBriefing) {
  const prompt = buildIntakePrompt(briefing)
  if (!prompt) return null
  return {
    content: prompt.helperText ? `${prompt.question}\n\n${prompt.helperText}` : prompt.question,
    prompt,
  }
}

function buildConversationBriefing(request: string, existing?: IrisConversationBriefing | null): IrisConversationBriefing {
  const deliverableType = existing?.deliverableType || inferDeliverableFromPrompt(request)
  const mergedFields = {
    ...(existing?.fields || {}),
    ...extractBriefFields(request),
  }
  const briefing: IrisConversationBriefing = {
    active: true,
    originalRequest: existing?.originalRequest || request,
    deliverableType,
    fields: mergedFields,
    awaitingField: null,
  }
  briefing.awaitingField = getNextMissingField(briefing)
  return briefing
}

function composeBriefPrompt(briefing: IrisConversationBriefing) {
  const lines = [briefing.originalRequest.trim(), '', `Task type: ${getDeliverableLabel(briefing.deliverableType)}`, '', 'Confirmed brief details:']
  if (briefing.fields.objective) lines.push(`- Objective: ${briefing.fields.objective}`)
  if (briefing.fields.platforms?.length) lines.push(`- Platforms: ${briefing.fields.platforms.join(' + ')}`)
  if (briefing.fields.format) lines.push(`- Format: ${briefing.fields.format}`)
  if (briefing.fields.timeframe) lines.push(`- Timeframe: ${briefing.fields.timeframe}`)
  if (briefing.fields.cadence) lines.push(`- Cadence: ${briefing.fields.cadence}`)
  if (typeof briefing.fields.includeArtwork === 'boolean') {
    lines.push(`- Include artwork: ${briefing.fields.includeArtwork ? 'yes' : 'no'}`)
  }
  if (briefing.fields.includeArtwork) {
    lines.push('- Create the visual artwork/image as part of the deliverable using the client brand assets and creative pipeline.')
  }
  return lines.join('\n')
}

function findSkills(agentId: string, agents: ReturnType<typeof useAgentsStore.getState>['agents'], patterns: RegExp[], fallbackCount = 2) {
  const agent = agents.find((entry) => entry.id === agentId)
  const matches = (agent?.skills || []).filter((skill) => patterns.some((pattern) => pattern.test(skill)))
  return matches.length ? matches.slice(0, 3) : (agent?.skills || []).slice(0, fallbackCount)
}

type ProvisionalMissionRouting = {
  deliverableType: string
  leadAgentId: string
  collaboratorAgentIds: string[]
  assignedAgentIds: string[]
  pipelineName: string | null
  skillAssignments: Record<string, string[]>
  orchestrationTrace: string[]
}

function buildProvisionalMissionRouting(
  message: string,
  agents: ReturnType<typeof useAgentsStore.getState>['agents']
): ProvisionalMissionRouting {
  const deliverableType = inferDeliverableFromPrompt(message)

  if (deliverableType === 'content-calendar') {
    const skillAssignments: Record<string, string[]> = {
      iris: findSkills('iris', agents, [/task|workflow|coordination/], 1),
      echo: findSkills('echo', agents, [/content-calendar|content-calendars|social-copy|platform-native|headline|campaign-copywriting/], 3),
      maya: findSkills('maya', agents, [/campaign-planning|audience|positioning|messaging|strategy/], 2),
      nova: findSkills('nova', agents, [/organic-social|channel|media|calendar|channel-planning/], 2),
      lyra: findSkills('lyra', agents, [/visual|storytelling|design/], 2),
    }

    return {
      deliverableType,
      leadAgentId: 'echo',
      collaboratorAgentIds: ['maya', 'nova', 'lyra'],
      assignedAgentIds: ['iris', 'echo', 'maya', 'nova', 'lyra'],
      pipelineName: 'Content Calendar',
      skillAssignments,
      orchestrationTrace: [
        'Iris recognized this as content calendar work.',
        'Echo is leading the calendar build.',
        'Maya is shaping themes and audience fit.',
        'Nova is planning cadence and platform mix.',
        'Lyra is preparing visual direction.',
      ],
    }
  }

  if (deliverableType === 'campaign-copy') {
    const lower = message.toLowerCase()
    const collaborators = ['maya', ...( /(visual|carousel|image|creative|asset)/.test(lower) ? ['lyra'] : [])]
    const skillAssignments: Record<string, string[]> = {
      iris: findSkills('iris', agents, [/task|workflow|coordination/], 1),
      echo: findSkills('echo', agents, [/social-copy|campaign-copywriting|headline|platform-native|short-form|cta/], 3),
      maya: findSkills('maya', agents, [/campaign-planning|positioning|messaging|audience/], 2),
    }

    if (collaborators.includes('lyra')) {
      skillAssignments.lyra = findSkills('lyra', agents, [/visual|storytelling|design/], 2)
    }

    return {
      deliverableType,
      leadAgentId: 'echo',
      collaboratorAgentIds: collaborators,
      assignedAgentIds: ['iris', 'echo', ...collaborators],
      pipelineName: null,
      skillAssignments,
      orchestrationTrace: [
        'Iris recognized this as campaign copy work.',
        'Echo is leading the copy draft.',
        'Maya is sharpening the strategic angle.',
        ...(collaborators.includes('lyra') ? ['Lyra is pairing the copy with visual direction.'] : []),
      ],
    }
  }

  if (
    deliverableType === 'short-form-copy' ||
    deliverableType === 'email-campaign' ||
    deliverableType === 'blog-article' ||
    deliverableType === 'website-copy' ||
    deliverableType === 'video-script'
  ) {
    const collaboratorAgentIds =
      deliverableType === 'email-campaign'
        ? ['maya', 'nova']
        : deliverableType === 'blog-article'
          ? ['atlas', 'maya']
          : deliverableType === 'website-copy'
            ? ['maya', 'lyra']
            : deliverableType === 'video-script'
              ? ['lyra', 'maya']
              : ['maya']

    const skillAssignments: Record<string, string[]> = {
      iris: findSkills('iris', agents, [/task|workflow|coordination/], 1),
      echo: findSkills('echo', agents, [/copywriting|headline|short-form|email|narrative|script|cta|brand-voice/], 3),
      maya: findSkills('maya', agents, [/positioning|messaging|audience|strategy/], 2),
    }

    if (collaboratorAgentIds.includes('nova')) {
      skillAssignments.nova = findSkills('nova', agents, [/channel|media|automation|calendar/], 2)
    }
    if (collaboratorAgentIds.includes('atlas')) {
      skillAssignments.atlas = findSkills('atlas', agents, [/research|seo|insight|keyword/], 2)
    }
    if (collaboratorAgentIds.includes('lyra')) {
      skillAssignments.lyra = findSkills('lyra', agents, [/visual|design|storytelling/], 2)
    }

    return {
      deliverableType,
      leadAgentId: 'echo',
      collaboratorAgentIds,
      assignedAgentIds: ['iris', 'echo', ...collaboratorAgentIds],
      pipelineName: null,
      skillAssignments,
      orchestrationTrace: [
        `Iris recognized this as ${getDeliverableLabel(deliverableType).toLowerCase()} work.`,
        'Echo is leading the draft.',
        ...collaboratorAgentIds.map((agentId) => `${agentId} is supporting based on the request context.`),
      ],
    }
  }

  if (deliverableType === 'strategy-brief') {
    const skillAssignments: Record<string, string[]> = {
      iris: findSkills('iris', agents, [/task|workflow|coordination|priority/], 1),
      maya: findSkills('maya', agents, [/campaign-planning|positioning|messaging|brand|persona|audience|strategy/], 3),
      atlas: findSkills('atlas', agents, [/deep-research|market|consumer|insight|competitive|audience|research/], 3),
      sage: findSkills('sage', agents, [/stakeholder|narrative|present|message|negotiation/], 2),
    }

    return {
      deliverableType,
      leadAgentId: 'maya',
      collaboratorAgentIds: ['atlas', 'sage'],
      assignedAgentIds: ['iris', 'maya', 'atlas', 'sage'],
      pipelineName: 'Strategy Brief',
      skillAssignments,
      orchestrationTrace: [
        'Iris recognized this as strategy work.',
        'Maya is leading the strategic framing and messaging direction.',
        'Atlas is conducting deeper research and audience insight work.',
        'Sage is shaping stakeholder-ready narrative structure.',
      ],
    }
  }

  if (deliverableType === 'presentation') {
    const skillAssignments: Record<string, string[]> = {
      iris: findSkills('iris', agents, [/task|workflow|coordination|priority/], 1),
      sage: findSkills('sage', agents, [/stakeholder|narrative|presentation|communication/], 3),
      maya: findSkills('maya', agents, [/strategy|positioning|messaging|audience/], 2),
      lyra: findSkills('lyra', agents, [/visual|design|storytelling/], 2),
      echo: findSkills('echo', agents, [/headline|copywriting|narrative/], 2),
    }

    return {
      deliverableType,
      leadAgentId: 'sage',
      collaboratorAgentIds: ['maya', 'lyra', 'echo'],
      assignedAgentIds: ['iris', 'sage', 'maya', 'lyra', 'echo'],
      pipelineName: null,
      skillAssignments,
      orchestrationTrace: [
        'Iris recognized this as presentation work.',
        'Sage is leading the narrative and stakeholder framing.',
        'Maya is shaping strategic clarity.',
        'Lyra is supporting the visual story.',
        'Echo is refining the slide copy.',
      ],
    }
  }

  if (deliverableType === 'creative-asset') {
    const skillAssignments: Record<string, string[]> = {
      iris: findSkills('iris', agents, [/task|workflow|coordination|priority/], 1),
      lyra: findSkills('lyra', agents, [/visual|storytelling|design|creative|brand/], 3),
      echo: findSkills('echo', agents, [/headline|copywriting|cta|social-copy|content/], 2),
      maya: findSkills('maya', agents, [/audience|messaging|positioning|brand|strategy/], 2),
    }

    return {
      deliverableType,
      leadAgentId: 'lyra',
      collaboratorAgentIds: ['echo', 'maya'],
      assignedAgentIds: ['iris', 'lyra', 'echo', 'maya'],
      pipelineName: null,
      skillAssignments,
      orchestrationTrace: [
        'Iris recognized this as creative asset work.',
        'Lyra is leading the visual direction and production brief.',
        'Echo is supporting with copy overlays and caption logic.',
        'Maya is keeping the creative aligned with audience and positioning.',
      ],
    }
  }

  if (deliverableType === 'brand-guidelines') {
    const skillAssignments: Record<string, string[]> = {
      iris: findSkills('iris', agents, [/task|workflow|coordination|priority/], 1),
      lyra: findSkills('lyra', agents, [/visual|design|brand|identity|storytelling/], 3),
      maya: findSkills('maya', agents, [/positioning|messaging|brand|strategy/], 2),
      echo: findSkills('echo', agents, [/copywriting|tone|voice|headline/], 2),
    }

    return {
      deliverableType,
      leadAgentId: 'lyra',
      collaboratorAgentIds: ['maya', 'echo'],
      assignedAgentIds: ['iris', 'lyra', 'maya', 'echo'],
      pipelineName: null,
      skillAssignments,
      orchestrationTrace: [
        'Iris recognized this as brand-guidelines work.',
        'Lyra is leading the identity system.',
        'Maya is aligning the brand strategy.',
        'Echo is shaping tone-of-voice guidance.',
      ],
    }
  }

  if (deliverableType === 'media-plan' || deliverableType === 'campaign-strategy') {
    const skillAssignments: Record<string, string[]> = {
      iris: findSkills('iris', agents, [/task|workflow|coordination|priority/], 1),
      nova: findSkills('nova', agents, [/channel|media|budget|forecast|paid|organic|calendar/], 3),
      maya: findSkills('maya', agents, [/strategy|audience|campaign-planning|positioning|messaging/], 2),
      atlas: findSkills('atlas', agents, [/research|market|competitive|data|insight/], 2),
    }

    return {
      deliverableType,
      leadAgentId: deliverableType === 'media-plan' ? 'nova' : 'maya',
      collaboratorAgentIds: deliverableType === 'media-plan' ? ['maya', 'atlas'] : ['nova', 'atlas'],
      assignedAgentIds:
        deliverableType === 'media-plan'
          ? ['iris', 'nova', 'maya', 'atlas']
          : ['iris', 'maya', 'nova', 'atlas'],
      pipelineName: deliverableType === 'media-plan' ? 'Media Plan' : 'Campaign Strategy',
      skillAssignments,
      orchestrationTrace:
        deliverableType === 'media-plan'
          ? [
              'Iris recognized this as media planning work.',
              'Nova is leading the channel mix and budget allocation.',
              'Maya is aligning the plan to strategic objectives.',
              'Atlas is adding research and market context.',
            ]
          : [
              'Iris recognized this as campaign strategy work.',
              'Maya is leading the strategic framing.',
              'Nova is shaping channel and execution planning.',
              'Atlas is supporting with research and market context.',
            ],
    }
  }

  if (deliverableType === 'data-analysis') {
    const skillAssignments: Record<string, string[]> = {
      iris: findSkills('iris', agents, [/task|workflow|coordination|priority/], 1),
      atlas: findSkills('atlas', agents, [/research|data|analysis|insight|market|competitive/], 3),
      nova: findSkills('nova', agents, [/media|channel|performance|analytics/], 2),
      maya: findSkills('maya', agents, [/strategy|audience|positioning/], 2),
    }

    return {
      deliverableType,
      leadAgentId: 'atlas',
      collaboratorAgentIds: ['nova', 'maya'],
      assignedAgentIds: ['iris', 'atlas', 'nova', 'maya'],
      pipelineName: null,
      skillAssignments,
      orchestrationTrace: [
        'Iris recognized this as analytics work.',
        'Atlas is leading the analysis.',
        'Nova is adding channel performance context.',
        'Maya is connecting findings to decisions.',
      ],
    }
  }

  if (deliverableType === 'ui-audit') {
    const skillAssignments: Record<string, string[]> = {
      iris: findSkills('iris', agents, [/task|workflow|coordination|priority/], 1),
      lyra: findSkills('lyra', agents, [/visual|design|ux|ui|usability/], 3),
      atlas: findSkills('atlas', agents, [/research|audit|data|insight|analysis/], 2),
      echo: findSkills('echo', agents, [/copy|content|headline|cta|messaging/], 2),
    }

    return {
      deliverableType,
      leadAgentId: 'lyra',
      collaboratorAgentIds: ['atlas', 'echo'],
      assignedAgentIds: ['iris', 'lyra', 'atlas', 'echo'],
      pipelineName: null,
      skillAssignments,
      orchestrationTrace: [
        'Iris recognized this as UI/UX audit work.',
        'Lyra is leading the design and usability review.',
        'Atlas is supporting with evidence and analysis.',
        'Echo is reviewing copy and CTA effectiveness.',
      ],
    }
  }

  if (deliverableType === 'research-brief' || deliverableType === 'seo-audit') {
    const skillAssignments: Record<string, string[]> = {
      iris: findSkills('iris', agents, [/task|workflow|coordination|priority/], 1),
      atlas: findSkills('atlas', agents, [/deep-research|market|consumer|insight|competitive|audience|research|seo/], 3),
      maya: findSkills('maya', agents, [/positioning|audience|campaign-planning|messaging|strategy/], 2),
      echo: findSkills('echo', agents, [/copy|narrative|content|social|platform-native/], 2),
    }

    return {
      deliverableType,
      leadAgentId: 'atlas',
      collaboratorAgentIds: ['maya', 'echo'],
      assignedAgentIds: ['iris', 'atlas', 'maya', 'echo'],
      pipelineName: deliverableType === 'seo-audit' ? 'SEO Audit' : 'Research Brief',
      skillAssignments,
      orchestrationTrace: [
        'Iris recognized this as research-heavy work.',
        'Atlas is leading the research and evidence gathering.',
        'Maya is shaping strategic implications.',
        'Echo is helping turn findings into clearer messaging.',
      ],
    }
  }

  if (deliverableType === 'pr-comms' || deliverableType === 'event-plan') {
    const leadAgentId = deliverableType === 'pr-comms' ? 'sage' : 'nova'
    const collaboratorAgentIds = deliverableType === 'pr-comms' ? ['echo', 'maya'] : ['maya', 'sage', 'echo']
    const skillAssignments: Record<string, string[]> = {
      iris: findSkills('iris', agents, [/task|workflow|coordination|priority/], 1),
      [leadAgentId]: findSkills(leadAgentId, agents, leadAgentId === 'sage' ? [/stakeholder|narrative|communication|presentation/] : [/channel|media|planning|event|calendar/], 3),
      maya: findSkills('maya', agents, [/strategy|positioning|audience|messaging/], 2),
      echo: findSkills('echo', agents, [/copywriting|headline|content|narrative/], 2),
    }
    if (collaboratorAgentIds.includes('sage')) {
      skillAssignments.sage = findSkills('sage', agents, [/stakeholder|narrative|communication|presentation/], 2)
    }

    return {
      deliverableType,
      leadAgentId,
      collaboratorAgentIds,
      assignedAgentIds: ['iris', leadAgentId, ...collaboratorAgentIds.filter((id, index, arr) => arr.indexOf(id) === index && id !== leadAgentId)],
      pipelineName: null,
      skillAssignments,
      orchestrationTrace: [
        `Iris recognized this as ${getDeliverableLabel(deliverableType).toLowerCase()} work.`,
        `${leadAgentId} is leading the execution.`,
        ...collaboratorAgentIds.map((agentId) => `${agentId} is supporting this deliverable.`),
      ],
    }
  }

  return {
    ...(deliverableType === 'status-report'
      ? {
          deliverableType,
          leadAgentId: 'iris',
          collaboratorAgentIds: [],
          assignedAgentIds: ['iris'],
          pipelineName: null,
          skillAssignments: { iris: findSkills('iris', agents, [/task|workflow|coordination/], 1) },
          orchestrationTrace: ['Iris is assessing the request.'],
        }
      : {
          deliverableType,
          leadAgentId: 'maya',
          collaboratorAgentIds: ['atlas'],
          assignedAgentIds: ['iris', 'maya', 'atlas'],
          pipelineName: null,
          skillAssignments: {
            iris: findSkills('iris', agents, [/task|workflow|coordination/], 1),
            maya: findSkills('maya', agents, [/strategy|positioning|messaging|audience/], 2),
            atlas: findSkills('atlas', agents, [/deep-research|research|insight|market|audience/], 2),
          },
          orchestrationTrace: [
            'Iris treated this as a substantive task.',
            'Maya is leading the framing.',
            'Atlas is supporting with research and audience insight.',
          ],
        }),
  }
}

function getLongTaskClarifier(message: string) {
  const lower = message.toLowerCase()
  if (!/(content calendar|editorial calendar|30 day content|monthly content)/.test(lower)) return null

  const missing: string[] = []
  if (!/(instagram|linkedin|facebook|x|twitter|tiktok)/.test(lower)) missing.push('platforms')
  if (!/(awareness|engagement|lead|conversion|sales|traffic)/.test(lower)) missing.push('goal')
  if (!/(week|per week|monthly|month|30 day|april|may|june|july|august|september|october|november|december|january|february|march)/.test(lower)) missing.push('timeframe')
  if (!/(\d+\s*(posts?|pieces?)\s*(per\s*(channel|platform|week|month))?|\d+\s*x\s*(week|month)|cadence|frequency)/.test(lower)) missing.push('cadence')

  if (!missing.length) return null

  return [
    'I can turn this into a fully automated content-calendar mission, but I should lock a few inputs first.',
    '',
    `Missing details: ${missing.join(', ')}.`,
    '',
    'Reply in one line like this:',
    '`Platforms: Instagram + LinkedIn · Goal: awareness · Timeframe: 30-day calendar`',
  ].join('\n')
}

function findPendingCalendarRequest(messages: ChatMessage[]) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const msg = messages[index]
    if (msg.role === 'assistant' && msg.content.includes('fully automated content-calendar mission')) {
      for (let userIndex = index - 1; userIndex >= 0; userIndex -= 1) {
        const userMsg = messages[userIndex]
        if (userMsg.role === 'user' && /(content calendar|editorial calendar|30 day content|monthly content)/i.test(userMsg.content)) {
          return userMsg.content
        }
      }
      return null
    }
  }
  return null
}

function mergeCalendarBrief(messages: ChatMessage[], latestUserMessage: string) {
  const pendingRequest = findPendingCalendarRequest(messages)
  if (!pendingRequest) return latestUserMessage
  return `${pendingRequest}\n\nAdditional confirmed brief details:\n${latestUserMessage}`
}

async function requestChat(
  payload: Record<string, unknown>,
  onChunk: (text: string) => void,
  onDone: (meta?: ChatMessage['meta']) => void,
  onError: (err: string) => void,
  onPipelineStart?: (info: { pipelineName: string; phases: string[]; deliverableType: string }) => void
) {
  try {
    const token = getStoredToken()
    if (!token) {
      onError('Your session is not ready or has expired. Please sign in again and retry.')
      return
    }
    const controller = new AbortController()
    const timeoutMs = 180000
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}))
      onError(errData.error || 'Request failed')
      return
    }

    const contentType = response.headers.get('Content-Type') || ''
    if (contentType.includes('application/x-ndjson')) {
      // Parse NDJSON chunks: pipeline_start (optional) then done
      const text = await response.text()
      const lines = text.trim().split('\n').filter(Boolean)
      let resolved = false
      for (const line of lines) {
        try {
          const chunk = JSON.parse(line)
          if (chunk.type === 'pipeline_start') {
            onPipelineStart?.({
              pipelineName: chunk.pipelineName || '',
              phases: chunk.phases || [],
              deliverableType: chunk.deliverableType || '',
            })
          } else if (chunk.type === 'done') {
            if (!chunk.response || !String(chunk.response).trim()) {
              onError('Iris did not return a usable response. Check provider settings and retry.')
              return
            }
            onChunk(chunk.response || '')
            onDone(chunk.meta)
            resolved = true
          } else if (chunk.type === 'error') {
            onError(chunk.error || 'Request failed')
            return
          }
        } catch {
          // malformed line — skip
        }
      }
      if (!resolved) {
        onError('Iris did not return a usable response. Check provider settings and retry.')
      }
    } else {
      // Legacy JSON response (conversational path or older server)
      const data = await response.json().catch(() => ({}))
      if (!data.response || !String(data.response).trim()) {
        onError('Iris did not return a usable response. Check provider settings and retry.')
        return
      }
      onChunk(data.response || '')
      onDone(data.meta)
    }
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      onError('The request timed out before Iris returned a result. Open the task page to check the live execution state and latest error.')
      return
    }
    onError(err.message || 'Network error')
  }
}

async function waitForMissionTaskPersistence(missionId: string, accessToken: string, attempts = 10, delayMs = 400) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const response = await fetch(`/api/tasks/${missionId}/execution`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    }).catch(() => null)

    if (response?.ok) return true

    if (attempt < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  return false
}

async function queueMissionExecution(
  missionId: string,
  accessToken: string,
  runtimeMode?: 'fast' | 'thinking' | 'compare'
) {
  const response = await fetch(`/api/tasks/${missionId}/execution`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      action: 'retry',
      runtimeMode,
    }),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new Error(data?.error || 'Failed to queue the mission for execution.')
  }

  return response.json().catch(() => null)
}

const BRIEF_FIELD_LABELS: Record<string, string> = {
  name: 'Client Name',
  industry: 'Industry',
  website: 'Website',
  description: 'Company Overview',
  missionStatement: 'Mission Statement',
  brandPromise: 'Brand Promise',
  targetAudiences: 'Target Audiences',
  productsAndServices: 'Products & Services',
  usp: 'Unique Selling Proposition',
  toneOfVoice: 'Tone of Voice',
  competitors: 'Competitors',
  notes: 'Notes',
}

const BRIEF_DISPLAY_FIELDS = [
  'name', 'industry', 'website', 'description', 'missionStatement',
  'brandPromise', 'targetAudiences', 'usp', 'toneOfVoice', 'competitors',
]

function ClientBriefPreviewCard({
  draft,
  missingFields,
  onCreateClient,
  created,
}: {
  draft: Record<string, any>
  missingFields: string[]
  onCreateClient: () => void
  created: boolean
}) {
  return (
    <div className="mt-3 rounded-xl border border-[#2a2d38] bg-[#0d0f16] overflow-hidden text-xs">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-[#2a2d38] flex items-center gap-2 bg-[#111420]">
        <div className="w-5 h-5 rounded-md bg-[#9b6dff]/20 flex items-center justify-center flex-shrink-0">
          <svg width="11" height="11" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="1" width="12" height="12" rx="2" stroke="#9b6dff" strokeWidth="1.5"/>
            <path d="M4 5h6M4 7.5h6M4 10h3" stroke="#9b6dff" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
        </div>
        <span className="font-semibold text-white text-[11px] tracking-wide">Client Brief Extracted</span>
        {missingFields.length === 0 && (
          <span className="ml-auto text-[10px] text-green-400 font-medium">All required fields found</span>
        )}
      </div>
      {/* Fields */}
      <div className="px-4 py-3 space-y-2 max-h-64 overflow-y-auto">
        {BRIEF_DISPLAY_FIELDS.map((field) => {
          const val = draft[field]
          if (!val || (Array.isArray(val) && val.length === 0)) return null
          const displayVal = Array.isArray(val) ? val.join(', ') : String(val)
          return (
            <div key={field} className="flex gap-2.5">
              <span className="text-gray-500 w-28 flex-shrink-0 pt-px">{BRIEF_FIELD_LABELS[field] || field}</span>
              <span className="text-gray-200 flex-1 line-clamp-2 leading-relaxed">{displayVal}</span>
            </div>
          )
        })}
      </div>
      {/* Missing fields warning */}
      {missingFields.length > 0 && (
        <div className="px-4 py-2 border-t border-[#2a2d38] bg-amber-500/5">
          <p className="text-[10px] text-amber-400/80 leading-relaxed">
            <span className="font-semibold">Missing:</span>{' '}
            {missingFields.map((f) => BRIEF_FIELD_LABELS[f] || f).join(', ')}.{' '}
            You can fill these in from the Clients section after creating.
          </p>
        </div>
      )}
      {/* Action */}
      <div className="px-4 py-3 border-t border-[#2a2d38]">
        {created ? (
          <div className="flex items-center gap-1.5 text-green-400 text-[11px] font-medium">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <circle cx="6.5" cy="6.5" r="6" stroke="#4ade80" strokeWidth="1.2"/>
              <path d="M3.5 6.5L5.5 8.5L9.5 4.5" stroke="#4ade80" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Client created — visit the Clients section to complete the profile.
          </div>
        ) : (
          <button
            type="button"
            onClick={onCreateClient}
            className="px-4 py-2 bg-[#9b6dff] text-white text-[11px] font-semibold rounded-lg hover:bg-[#8b5cf6] active:scale-95 transition-all"
          >
            Create Client
          </button>
        )}
      </div>
    </div>
  )
}

export function IrisChat() {
  const isIrisOpen = useAgentsStore((state) => state.isIrisOpen)
  const closeIris = useAgentsStore((state) => state.closeIris)
  const conversations = useAgentsStore((state) => state.conversations)
  const activeConversationId = useAgentsStore((state) => state.activeConversationId)
  const setActiveConversation = useAgentsStore((state) => state.setActiveConversation)
  const createConversation = useAgentsStore((state) => state.createConversation)
  const sendMessage = useAgentsStore((state) => state.sendMessage)
  const upsertAssistantDraft = useAgentsStore((state) => state.upsertAssistantDraft)
  const addAssistantMessage = useAgentsStore((state) => state.addAssistantMessage)
  const updateConversationBriefing = useAgentsStore((state) => state.updateConversationBriefing)
  const clearConversation = useAgentsStore((state) => state.clearConversation)
  const agents = useAgentsStore((state) => state.agents)
  const clients = useAgentsStore((state) => state.clients)
  const missions = useAgentsStore((state) => state.missions)
  const artifacts = useAgentsStore((state) => state.artifacts)
  const activeMissionId = useAgentsStore((state) => state.activeMissionId)
  const createMissionFromPrompt = useAgentsStore((state) => state.createMissionFromPrompt)
  const addArtifact = useAgentsStore((state) => state.addArtifact)
  const updateMission = useAgentsStore((state) => state.updateMission)
  const providerSettings = useAgentsStore((state) => state.providerSettings)
  const agencySettings = useAgentsStore((state) => state.agencySettings)
  const agentMemories = useAgentsStore((state) => state.agentMemories)
  const chatStatus = useAgentsStore((state) => state.chatStatus)
  const setChatStatus = useAgentsStore((state) => state.setChatStatus)
  const rememberAgentWork = useAgentsStore((state) => state.rememberAgentWork)
  const deleteConversation = useAgentsStore((state) => state.deleteConversation)
  const addClient = useAgentsStore((state) => state.addClient)

  const [input, setInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<File[]>([])
  // Track pending multi-select answers keyed by message id
  const [multiSelectPending, setMultiSelectPending] = useState<Record<string, string[]>>({})
  const [attachedText, setAttachedText] = useState<string>('')
  const [activePipelineInfo, setActivePipelineInfo] = useState<{ name: string; deliverableType: string } | null>(null)
  const [createdBriefMsgIds, setCreatedBriefMsgIds] = useState<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const activeConv = conversations.find((conversation) => conversation.id === activeConversationId)
  const activeBriefing = activeConv?.briefing || null
  const irisAgent = agents.find((agent) => agent.id === 'iris')
  const activeMission = missions.find((mission) => mission.id === activeMissionId)
  const irisVisual = {
    name: irisAgent?.name || IRIS.name,
    role: irisAgent?.role || IRIS.role,
    avatar: irisAgent?.avatar || IRIS.avatar,
    color: irisAgent?.color || IRIS.color,
    photoUrl: irisAgent?.photoUrl,
  }

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeConv?.messages.length, chatStatus])

  // Listen for prefill events from the Mission page quick-starts
  useEffect(() => {
    const handler = (e: Event) => {
      const text = (e as CustomEvent<{ text: string }>).detail?.text
      if (text) setInput(text)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
    window.addEventListener('iris:prefill', handler)
    return () => window.removeEventListener('iris:prefill', handler)
  }, [])

  useEffect(() => {
    if (isIrisOpen) setTimeout(() => inputRef.current?.focus(), 300)
  }, [isIrisOpen])

  // Extract text from files
  const extractFileText = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('text/') || file.type === 'application/json') {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => resolve(`[Could not read file: ${file.name}]`)
        reader.readAsText(file)
      } else if (file.type.startsWith('image/')) {
        // For images, we'll include a placeholder - actual vision would need API support
        resolve(`[Image file: ${file.name} - ${(file.size / 1024).toFixed(1)}KB]`)
      } else {
        resolve(`[File: ${file.name} - ${(file.size / 1024).toFixed(1)}KB - ${file.type}]`)
      }
    })
  }

  const handleFileAttach = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setAttachments(prev => [...prev, ...files])
    // Extract text from each file
    const texts = await Promise.all(files.map(extractFileText))
    setAttachedText(prev => prev + '\n\n' + texts.join('\n\n'))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const executeTaskRequest = useCallback(async (conversationId: string, finalPrompt: string) => {
    let createdMissionId: string | null = shouldOpenMissionForMessage(finalPrompt)
      ? createMissionFromPrompt(finalPrompt, {
          clientId: activeMission?.clientId,
          campaignId: activeMission?.campaignId,
        })
      : null

    const persistCurrentState = async () => {
      const token = getStoredToken()
      if (!token) return

      const snapshot = createAppPersistenceSnapshot(useAgentsStore.getState())
      await fetch('/api/state', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ state: snapshot }),
      }).catch(() => null)
    }

    const getSessionToken = async () => {
      return getStoredToken()
    }

    const waitForMissionSync = async () => {
      if (!createdMissionId) return false
      const accessToken = await getSessionToken()
      if (!accessToken) return false
      return waitForMissionTaskPersistence(createdMissionId, accessToken)
    }

    if (createdMissionId) {
      const provisionalRouting = buildProvisionalMissionRouting(finalPrompt, agents)
      if (provisionalRouting.pipelineName) {
        setActivePipelineInfo({ name: provisionalRouting.pipelineName, deliverableType: provisionalRouting.deliverableType })
      }
      updateMission(createdMissionId, {
        status: 'in_progress',
        progress: 8,
        deliverableType: provisionalRouting.deliverableType as any,
        assignedAgentIds: provisionalRouting.assignedAgentIds,
        leadAgentId: provisionalRouting.leadAgentId,
        collaboratorAgentIds: provisionalRouting.collaboratorAgentIds,
        skillAssignments: provisionalRouting.skillAssignments,
        pipelineName: provisionalRouting.pipelineName || undefined,
        handoffNotes: 'Iris is analysing the request and briefing the specialists.',
        orchestrationTrace: provisionalRouting.orchestrationTrace,
      })
      await persistCurrentState()
      const missionReady = await waitForMissionSync()
      const accessToken = await getSessionToken()

      if (missionReady && accessToken) {
        await queueMissionExecution(createdMissionId, accessToken, providerSettings.routing.runtimeMode)
        addAssistantMessage(
          conversationId,
          'Task launched. Iris has queued the mission and the live task page will show the execution progress.',
          'iris',
          { missionId: createdMissionId }
        )
        setChatStatus('idle')
        return
      }
    }

    setChatStatus('thinking')
    let fullResponse = ''
    let receivedFirstChunk = false
    const liveConversation = useAgentsStore.getState().conversations.find((conversation) => conversation.id === conversationId)
    const historyMessages = liveConversation?.messages || []
    const lastHistoryMessage = historyMessages[historyMessages.length - 1]
    const outboundMessages =
      lastHistoryMessage?.role === 'user' && lastHistoryMessage.content === finalPrompt
        ? historyMessages
        : [...historyMessages, { role: 'user', content: finalPrompt }]

    await requestChat(
      {
        provider: irisAgent?.provider || agencySettings.defaultProvider,
        model: irisAgent?.model || agencySettings.defaultModel,
        temperature: irisAgent?.temperature || 0.7,
        maxTokens: irisAgent?.maxTokens || 4096,
        messages: outboundMessages,
        systemPrompt: irisAgent?.systemPrompt,
        providerSettings,
        agentMemories,
        artifacts: artifacts.slice(0, 12),
        agents: agents.map((agent) => ({
          id: agent.id,
          name: agent.name,
          specialty: agent.specialty,
          role: agent.role,
          skills: agent.skills,
          tools: agent.tools,
          systemPrompt: agent.systemPrompt,
          provider: agent.provider,
          model: agent.model,
        })),
        clients: clients.map((client) => ({
          id: client.id,
          name: client.name,
          website: client.website,
          industry: client.industry,
          description: client.description,
          missionStatement: client.missionStatement,
          brandPromise: client.brandPromise,
          targetAudiences: client.targetAudiences,
          productsAndServices: client.productsAndServices,
          usp: client.usp,
          competitiveLandscape: client.competitiveLandscape,
          keyMessages: client.keyMessages,
          toneOfVoice: client.toneOfVoice,
          operationalDetails: client.operationalDetails,
          objectionHandling: client.objectionHandling,
          brandIdentityNotes: client.brandIdentityNotes,
          strategicPriorities: client.strategicPriorities,
          brandKit: client.brandKit,
          notes: client.notes,
          knowledgeAssets: client.knowledgeAssets,
        })),
        missions: missions.slice(0, 8),
        currentClientId: activeMission?.clientId,
        currentCampaignId: activeMission?.campaignId,
        missionId: createdMissionId || undefined,
      },
      (chunk) => {
        fullResponse += chunk
        setChatStatus('streaming')
        if (createdMissionId && !receivedFirstChunk) {
          receivedFirstChunk = true
          updateMission(createdMissionId, {
            status: 'in_progress',
            progress: 42,
            handoffNotes: 'Specialists are working on the deliverable.',
          })
        }
        upsertAssistantDraft(conversationId, fullResponse, 'iris', { missionId: createdMissionId || undefined })
      },
      (meta) => {
        if (!createdMissionId && meta?.deliverableType && meta.deliverableType !== 'status-report') {
          createdMissionId = createMissionFromPrompt(finalPrompt, {
            clientId: meta?.clientId || activeMission?.clientId,
            campaignId: meta?.campaignId || activeMission?.campaignId,
          })
        }

        const missionForArtifact = (createdMissionId ? missions.find((mission) => mission.id === createdMissionId) : null) || activeMission
        const deliverableType = (meta?.deliverableType as any) || missionForArtifact?.deliverableType || 'status-report'
        const taskTitle = buildTaskTitleFromRequest(finalPrompt, deliverableType)
        const hasUsableDeliverable = looksLikeSavedDeliverable(fullResponse) && passesQualityGate(meta)
        const shouldPersistArtifact =
          deliverableType !== 'status-report' &&
          isLikelyDeliverableResponse(fullResponse)
        const artifactId = hasUsableDeliverable
          ? addArtifact({
              title: taskTitle,
              deliverableType,
              status: 'draft',
              format: 'html',
              content: fullResponse,
              renderedHtml: meta?.renderedHtml,
              creative: (meta as any)?.creative,
              sourcePrompt: meta?.executionPrompt,
              notes:
                (meta as any)?.quality?.ok === false
                  ? `Quality gate flagged issues: ${((meta as any)?.quality?.issues || []).join(' | ')}`
                  : meta?.handoffNotes || 'Generated by Iris',
              clientId: meta?.clientId || activeMission?.clientId,
              campaignId: meta?.campaignId || activeMission?.campaignId,
              missionId: createdMissionId || undefined,
              agentId: meta?.leadAgentId || meta?.routedAgentId || 'iris',
              executionSteps: meta?.executionSteps || [],
            })
          : shouldPersistArtifact
            ? addArtifact({
                title: taskTitle,
                deliverableType,
                status: 'draft',
                format: 'html',
                content: fullResponse,
                renderedHtml: meta?.renderedHtml,
                creative: (meta as any)?.creative,
                sourcePrompt: meta?.executionPrompt,
                notes:
                  (meta as any)?.quality?.ok === false
                    ? `Saved with quality warnings: ${((meta as any)?.quality?.issues || []).join(' | ')}`
                    : meta?.handoffNotes || 'Generated by Iris',
                clientId: meta?.clientId || activeMission?.clientId,
                campaignId: meta?.campaignId || activeMission?.campaignId,
                missionId: createdMissionId || undefined,
                agentId: meta?.leadAgentId || meta?.routedAgentId || 'iris',
                executionSteps: meta?.executionSteps || [],
              })
            : undefined
        addAssistantMessage(conversationId, fullResponse, meta?.routedAgentId || 'iris', {
          ...meta,
          missionId: createdMissionId || undefined,
          artifactId,
          handoffNotes: [meta?.handoffNotes, buildAssignmentNote(meta)].filter(Boolean).join('\n'),
        })
        updateConversationBriefing(conversationId, null)
        if (createdMissionId) {
          const missionOutcome = deriveMissionOutcome({
            deliverableType,
            shouldPersistArtifact,
            qualityOk: (meta as any)?.quality?.ok,
            executionSteps: meta?.executionSteps,
          })
          updateMission(createdMissionId, {
            title: taskTitle,
            summary: finalPrompt,
            deliverableType,
            status: missionOutcome.status,
            progress: missionOutcome.progress,
            reviewStatus: missionOutcome.status === 'completed' ? 'approved' : shouldPersistArtifact ? 'pending' : 'changes_requested',
              runtimeMode: providerSettings.routing.runtimeMode,
              channelingConfidence: (meta as any)?.confidence,
              compareSummary: (meta as any)?.compareSummary,
            assignedAgentIds:
              meta?.assignedAgentIds?.length
                ? meta.assignedAgentIds
                : deliverableType === 'status-report'
                  ? ['iris']
                  : ['iris', meta?.leadAgentId || meta?.routedAgentId || 'maya', ...(meta?.collaboratorAgentIds || [])].filter(Boolean) as string[],
            leadAgentId:
              meta?.leadAgentId || (deliverableType === 'status-report' ? 'iris' : 'maya'),
            collaboratorAgentIds: meta?.collaboratorAgentIds || (deliverableType === 'status-report' ? [] : ['atlas']),
            pipelineId: meta?.pipelineId || undefined,
            pipelineName: meta?.pipelineName || undefined,
            skillAssignments: meta?.selectedSkillsByAgent || {},
            orchestrationTrace: meta?.orchestrationTrace || [],
            qualityChecklist: meta?.qualityChecklist || [],
            handoffNotes: shouldPersistArtifact
              ? [meta?.handoffNotes, buildAssignmentNote(meta)].filter(Boolean).join('\n') || undefined
              : (meta as any)?.quality?.ok === false
                ? `Quality gate failed: ${((meta as any)?.quality?.issues || []).join(' | ')}`
                : 'Iris did not return a usable deliverable. Re-run the task or check provider settings.',
            clientId: meta?.clientId || activeMission?.clientId,
            campaignId: meta?.campaignId || activeMission?.campaignId,
          })
        }
        rememberAgentWork('iris', {
          title: finalPrompt.slice(0, 48),
          summary: `Handled: ${finalPrompt.slice(0, 120)}`,
          clientId: meta?.clientId || activeMission?.clientId,
          campaignId: meta?.campaignId || activeMission?.campaignId,
          missionId: createdMissionId || undefined,
          conversationId,
        })
        if (meta?.leadAgentId && meta.leadAgentId !== 'iris') {
          rememberAgentWork(meta.leadAgentId, {
            title: finalPrompt.slice(0, 48),
            summary: `Lead on task: ${taskTitle}`,
            clientId: meta?.clientId || activeMission?.clientId,
            campaignId: meta?.campaignId || activeMission?.campaignId,
            missionId: createdMissionId || undefined,
            conversationId,
          })
        }
        for (const collaboratorId of meta?.collaboratorAgentIds || []) {
          rememberAgentWork(collaboratorId, {
            title: finalPrompt.slice(0, 48),
            summary: `Supporting task: ${taskTitle}`,
            clientId: meta?.clientId || activeMission?.clientId,
            campaignId: meta?.campaignId || activeMission?.campaignId,
            missionId: createdMissionId || undefined,
            conversationId,
          })
        }
        persistCurrentState().catch(() => null)
        // Update pipeline info with confirmed server response, then clear after a brief moment
        if (meta?.pipelineName) {
          setActivePipelineInfo({ name: meta.pipelineName, deliverableType: (meta as any).resolvedDeliverableType || meta.deliverableType || '' })
        }
        setTimeout(() => setActivePipelineInfo(null), 1200)
        setChatStatus('idle')
      },
      (err) => {
        setError(err)
        setActivePipelineInfo(null)
        addAssistantMessage(
          conversationId,
          `Iris could not complete that request.\n\nReason: ${err}`,
          'iris',
          { missionId: createdMissionId || undefined, handoffNotes: err }
        )
        if (createdMissionId) {
          updateMission(createdMissionId, {
            status: 'blocked',
            progress: 0,
            handoffNotes: err,
          })
        }
        persistCurrentState().catch(() => null)
        setChatStatus('idle')
      },
      // onPipelineStart: server confirms which pipeline is running — update indicator
      // from server source (overrides provisional routing from client)
      (info) => {
        if (info.pipelineName) {
          setActivePipelineInfo({ name: info.pipelineName, deliverableType: info.deliverableType })
        }
      }
    )
  }, [activeMission, addArtifact, addAssistantMessage, agencySettings.defaultModel, agencySettings.defaultProvider, agentMemories, agents, artifacts, clients, createMissionFromPrompt, irisAgent?.maxTokens, irisAgent?.model, irisAgent?.provider, irisAgent?.systemPrompt, irisAgent?.temperature, missions, providerSettings, rememberAgentWork, setActivePipelineInfo, setChatStatus, updateConversationBriefing, updateMission, upsertAssistantDraft])

  const advanceBriefing = useCallback(async (conversationId: string, nextBriefing: IrisConversationBriefing, userFacingText?: string) => {
    updateConversationBriefing(conversationId, nextBriefing)
    if (userFacingText) {
      sendMessage(conversationId, userFacingText)
    }

    const promptConfig = buildBriefingMessage(nextBriefing)
    if (promptConfig) {
      addAssistantMessage(conversationId, promptConfig.content, 'iris', {
        intakePrompt: promptConfig.prompt,
      })
      return
    }

    const finalPrompt = composeBriefPrompt(nextBriefing)
    addAssistantMessage(conversationId, 'Brief locked. Routing this now with the confirmed inputs.', 'iris')
    updateConversationBriefing(conversationId, null)
    await executeTaskRequest(conversationId, finalPrompt)
  }, [addAssistantMessage, executeTaskRequest, sendMessage, updateConversationBriefing])

  const handleSend = useCallback(async () => {
    if (!input.trim() && attachments.length === 0 && !attachedText) return
    if (chatStatus !== 'idle') return

    const conversationId = activeConversationId && conversations.some((conversation) => conversation.id === activeConversationId)
      ? activeConversationId
      : createConversation('Chat with Iris')

    if (!conversationId) return

    const userMsg = input.trim()
    const attachmentContent = attachedText.trim()
    const fullMessage = attachmentContent
      ? `${userMsg}\n\n[Attached files context]\n${attachmentContent}`
      : userMsg

    setInput('')
    setError(null)
    setAttachments([])
    setAttachedText('')
    setActiveConversation(conversationId)

    const currentConversation = useAgentsStore.getState().conversations.find((conversation) => conversation.id === conversationId)
    const currentBriefing = currentConversation?.briefing || null

    if (currentBriefing?.active) {
      const nextBriefing = buildConversationBriefing(fullMessage, currentBriefing)
      await advanceBriefing(conversationId, nextBriefing, userMsg)
      return
    }

    sendMessage(conversationId, userMsg)

    if (shouldOpenMissionForMessage(fullMessage)) {
      const initialBriefing = buildConversationBriefing(fullMessage)
      const promptConfig = buildBriefingMessage(initialBriefing)
      if (promptConfig) {
        updateConversationBriefing(conversationId, initialBriefing)
        addAssistantMessage(conversationId, promptConfig.content, 'iris', {
          intakePrompt: promptConfig.prompt,
        })
        return
      }
    }

    await executeTaskRequest(conversationId, fullMessage)
  }, [activeConversationId, addAssistantMessage, advanceBriefing, attachedText, attachments.length, chatStatus, conversations, createConversation, executeTaskRequest, input, sendMessage, setActiveConversation, updateConversationBriefing])

  const handleIntakeOptionClick = useCallback(async (field: IrisBriefField, value: string, label: string) => {
    if (chatStatus !== 'idle' || !activeConversationId) return
    const liveConversation = useAgentsStore.getState().conversations.find((conversation) => conversation.id === activeConversationId)
    const briefing = liveConversation?.briefing
    if (!briefing?.active) return

    const nextBriefing: IrisConversationBriefing = {
      ...briefing,
      fields: {
        ...briefing.fields,
        [field]:
          field === 'platforms'
            ? value === 'All platforms'
              ? ['All platforms']
              : value.split('+').map((item) => item.trim()).filter(Boolean)
            : field === 'includeArtwork'
              ? value === 'yes'
              : value,
      },
    }
    nextBriefing.awaitingField = getNextMissingField(nextBriefing)
    await advanceBriefing(activeConversationId, nextBriefing, `${field === 'includeArtwork' ? 'Artwork' : field}: ${label}`)
  }, [activeConversationId, advanceBriefing, chatStatus])

  // Multi-select confirm handler — called when user clicks "Confirm" on a multiSelect intake prompt
  const handleMultiSelectConfirm = useCallback(async (field: IrisBriefField, values: string[], labels: string[]) => {
    if (chatStatus !== 'idle' || !activeConversationId || values.length === 0) return
    const liveConversation = useAgentsStore.getState().conversations.find((c) => c.id === activeConversationId)
    const briefing = liveConversation?.briefing
    if (!briefing?.active) return

    const nextBriefing: IrisConversationBriefing = {
      ...briefing,
      fields: {
        ...briefing.fields,
        [field]:
          field === 'platforms'
            ? values
            : field === 'objective'
            ? values.join(', ')
            : values[0],
      },
    }
    nextBriefing.awaitingField = getNextMissingField(nextBriefing)
    await advanceBriefing(activeConversationId, nextBriefing, `${field}: ${labels.join(', ')}`)
  }, [activeConversationId, advanceBriefing, chatStatus])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const startNewChat = () => {
    const id = createConversation('New Chat')
    setActiveConversation(id)
  }

  if (!isIrisOpen) return null

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={closeIris} />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-[76rem] bg-[#12141a] border-l border-[#2a2d38] z-50 flex shadow-2xl">
        <aside className="hidden md:flex w-[280px] flex-col border-r border-[#2a2d38] bg-[#0f1117]">
          <div className="px-4 py-4 border-b border-[#2a2d38]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-mono uppercase tracking-[0.22em] text-[#9b6dff]">Inbox</p>
                <p className="mt-1 text-xs text-gray-400">Task chats and follow-ups</p>
              </div>
              <button onClick={startNewChat} className="p-2 rounded-lg hover:bg-[#1a1d26] text-gray-400 hover:text-white transition-colors" title="New chat">
                <Plus size={16} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {conversations.map((conversation) => {
              const active = conversation.id === activeConversationId
              const lastMessage = conversation.messages[conversation.messages.length - 1]
              return (
                <div
                  key={conversation.id}
                  className={clsx(
                    'group rounded-2xl border p-3 transition-all',
                    active ? 'border-[#9b6dff] bg-[#181b25]' : 'border-[#2a2d38] bg-[#13161e] hover:border-[#3a3f50]'
                  )}
                >
                  <button type="button" onClick={() => setActiveConversation(conversation.id)} className="w-full text-left">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{conversation.title || 'New Chat'}</p>
                        <p className="mt-1 line-clamp-2 text-[11px] text-gray-400">
                          {lastMessage?.content || 'No messages yet'}
                        </p>
                      </div>
                      <span className="text-[10px] text-gray-500 flex-shrink-0">{formatTime(conversation.updatedAt)}</span>
                    </div>
                  </button>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[10px] text-gray-500">{conversation.messages.length} messages</span>
                    <button
                      type="button"
                      onClick={() => deleteConversation(conversation.id)}
                      className="opacity-0 group-hover:opacity-100 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] text-gray-400 transition-all hover:bg-[#1a1d26] hover:text-red-400"
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#2a2d38]">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${irisVisual.color}20` }}>
            <AgentBot name={irisVisual.name} avatar={irisVisual.avatar} photoUrl={irisVisual.photoUrl} color={irisVisual.color} status="active" animation="idle" size={32} />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-semibold text-white">{irisVisual.name}</h2>
            <p className="text-xs text-gray-400">
              {getModelLabel(irisAgent?.model || agencySettings.defaultModel)} · {getProviderLabel(irisAgent?.provider || agencySettings.defaultProvider)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {chatStatus === 'idle' && (
              <span className="w-2 h-2 rounded-full bg-green-500" title="Ready" />
            )}
            {chatStatus === 'thinking' && (
              <span className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" title="Thinking..." />
            )}
            <button onClick={startNewChat} className="p-2 hover:bg-[#1a1d26] rounded-lg text-gray-400 hover:text-white transition-colors" title="New chat">
              <Plus size={18} />
            </button>
            <button onClick={closeIris} className="p-2 hover:bg-[#1a1d26] rounded-lg text-gray-400 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {!activeConv || activeConv.messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5" style={{ background: `${irisVisual.color}15` }}>
                <AgentBot name={irisVisual.name} avatar={irisVisual.avatar} photoUrl={irisVisual.photoUrl} color={irisVisual.color} status="active" animation="idle" size={64} />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Chat with Iris</h3>
              <p className="text-sm text-gray-400 max-w-xs leading-relaxed mb-8">
                Ask anything about your clients, campaigns, or agency operations. Attach files for context.
              </p>
              <div className="flex flex-col gap-2 w-full max-w-sm">
                {[
                  'What campaigns need attention?',
                  'Show me the agency status',
                  'Plan a content calendar for a new client',
                  'Route a campaign brief for TechStart',
                ].map((s) => (
                  <button key={s} onClick={() => setInput(s)} className="text-left px-4 py-3 rounded-xl bg-[#1a1d26] border border-[#2a2d38] text-sm text-gray-300 hover:text-white hover:border-[#9b6dff] transition-all">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-5 space-y-5">
              {activeConv.messages.map((msg, i) => {
                const isUser = msg.role === 'user'
                const showAvatar = !isUser && (i === 0 || activeConv.messages[i - 1].role === 'user')
                return (
                  <div key={`${msg.id}-${i}`} className={clsx('flex gap-3', isUser && 'flex-row-reverse')}>
                    {!isUser && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${irisVisual.color}20` }}>
                        <AgentBot name={irisVisual.name} avatar={irisVisual.avatar} photoUrl={irisVisual.photoUrl} color={irisVisual.color} status="active" animation="idle" size={28} />
                      </div>
                    )}
                  <div className={clsx('max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed', 
                      isUser 
                        ? 'bg-[#9b6dff] text-white rounded-tr-sm' 
                        : 'bg-[#1a1d26] text-gray-200 border border-[#2a2d38] rounded-tl-sm'
                    )}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      {!isUser && msg.meta?.intakePrompt ? (() => {
                        const ip = msg.meta.intakePrompt
                        const isMulti = ip.multiSelect === true
                        const msgSelections = multiSelectPending[msg.id] || []
                        return (
                          <div className="mt-3 space-y-3">
                            <div className="flex flex-wrap gap-2">
                              {ip.options.map((option) => {
                                const isSelected = msgSelections.includes(option.value)
                                return (
                                  <button
                                    key={`${msg.id}-${option.value}`}
                                    type="button"
                                    onClick={() => {
                                      if (!isMulti) {
                                        handleIntakeOptionClick(ip.field as IrisBriefField, option.value, option.label)
                                      } else {
                                        setMultiSelectPending((prev) => {
                                          const current = prev[msg.id] || []
                                          const next = current.includes(option.value)
                                            ? current.filter((v) => v !== option.value)
                                            : [...current, option.value]
                                          return { ...prev, [msg.id]: next }
                                        })
                                      }
                                    }}
                                    className={`rounded-full border px-3 py-1.5 text-[11px] transition-all flex items-center gap-1.5 ${
                                      isSelected && isMulti
                                        ? 'border-[#9b6dff] bg-[#9b6dff]/20 text-white'
                                        : 'border-[#3a3f50] bg-[#171a21] text-[#d9dcff] hover:border-[#9b6dff] hover:text-white'
                                    }`}
                                  >
                                    {isMulti && (
                                      <span className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center flex-shrink-0 ${
                                        isSelected ? 'bg-[#9b6dff] border-[#9b6dff]' : 'border-[#3a3f50]'
                                      }`}>
                                        {isSelected && (
                                          <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                                            <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                          </svg>
                                        )}
                                      </span>
                                    )}
                                    {option.label}
                                  </button>
                                )
                              })}
                            </div>
                            {isMulti && msgSelections.length > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const selectedOptions = ip.options.filter((o) => msgSelections.includes(o.value))
                                  const labels = selectedOptions.map((o) => o.label)
                                  handleMultiSelectConfirm(ip.field as IrisBriefField, msgSelections, labels)
                                  setMultiSelectPending((prev) => { const next = { ...prev }; delete next[msg.id]; return next })
                                }}
                                className="px-4 py-1.5 rounded-full text-[11px] font-semibold bg-[#9b6dff] text-white hover:bg-[#8b5cf6] transition-colors"
                              >
                                Confirm {msgSelections.length} selection{msgSelections.length !== 1 ? 's' : ''} →
                              </button>
                            )}
                            {activeBriefing?.active ? (
                              <div className="rounded-2xl border border-[#2f3342] bg-[#11141b] px-3 py-2 text-[11px] text-gray-400">
                                <p className="font-mono uppercase tracking-[0.22em] text-[#9b6dff]">Brief So Far</p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {activeBriefing.fields.objective ? <span>Objective: {activeBriefing.fields.objective}</span> : null}
                                  {activeBriefing.fields.platforms?.length ? <span>Platforms: {activeBriefing.fields.platforms.join(' + ')}</span> : null}
                                  {activeBriefing.fields.format ? <span>Format: {activeBriefing.fields.format}</span> : null}
                                  {activeBriefing.fields.timeframe ? <span>Timeframe: {activeBriefing.fields.timeframe}</span> : null}
                                  {activeBriefing.fields.cadence ? <span>Cadence: {activeBriefing.fields.cadence}</span> : null}
                                  {typeof activeBriefing.fields.includeArtwork === 'boolean' ? <span>Artwork: {activeBriefing.fields.includeArtwork ? 'Yes' : 'No'}</span> : null}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        )
                      })() : null}
                      {!isUser && msg.meta?.action?.type === 'CREATE_CLIENT' ? (
                        <ClientBriefPreviewCard
                          draft={msg.meta.action.draft}
                          missingFields={msg.meta.action.missingFields}
                          created={createdBriefMsgIds.has(msg.id)}
                          onCreateClient={() => {
                            const d = msg.meta?.action?.draft || {}
                            addClient({
                              name: d.name || '',
                              industry: d.industry || '',
                              website: d.website || '',
                              description: d.description || '',
                              missionStatement: d.missionStatement || '',
                              brandPromise: d.brandPromise || '',
                              targetAudiences: d.targetAudiences || '',
                              productsAndServices: d.productsAndServices || '',
                              usp: d.usp || '',
                              competitiveLandscape: d.competitiveLandscape || '',
                              keyMessages: d.keyMessages || '',
                              toneOfVoice: d.toneOfVoice || '',
                              operationalDetails: d.operationalDetails || '',
                              objectionHandling: d.objectionHandling || '',
                              brandIdentityNotes: d.brandIdentityNotes || '',
                              strategicPriorities: d.strategicPriorities || '',
                              competitors: Array.isArray(d.competitors) ? d.competitors : [],
                              knowledgeAssets: [],
                              notes: d.notes || '',
                              // addClient merges with DEFAULT_CLIENT_BRAND_KIT internally
                              brandKit: {} as any,
                            })
                            setCreatedBriefMsgIds((prev) => new Set([...prev, msg.id]))
                          }}
                        />
                      ) : null}
                      {!isUser && msg.meta?.missionId ? (
                        <div className="mt-3 flex items-center gap-2">
                          <a
                            href={`/tasks/${msg.meta.missionId}`}
                            className="inline-flex items-center gap-1 rounded-full border border-[#3a3f50] bg-[#171a21] px-3 py-1 text-[11px] text-[#9b6dff] hover:border-[#9b6dff]"
                          >
                            Open task
                            <ExternalLink size={11} />
                          </a>
                        </div>
                      ) : null}
                      <p className={clsx('text-[10px] mt-2 opacity-60', isUser ? 'text-right' : 'text-gray-500')}>
                        {formatTime(msg.timestamp)}
                      </p>
                    </div>
                  </div>
                )
              })}
              
              {/* Thinking / streaming indicator */}
              {(chatStatus === 'thinking' || chatStatus === 'streaming') && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center" style={{ background: `${irisVisual.color}20` }}>
                    {chatStatus === 'thinking'
                      ? <Loader2 size={16} className="animate-spin" style={{ color: irisVisual.color }} />
                      : <AgentBot name={irisVisual.name} avatar={irisVisual.avatar} photoUrl={irisVisual.photoUrl} color={irisVisual.color} status="active" animation="idle" size={28} />
                    }
                  </div>
                  <div className="bg-[#1a1d26] border border-[#2a2d38] rounded-2xl rounded-tl-sm px-4 py-3 flex flex-col gap-1.5 min-w-0">
                    {activePipelineInfo?.name ? (
                      <>
                        <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: irisVisual.color }}>
                          <GitBranch size={11} />
                          <span className="truncate">Pipeline: {activePipelineInfo.name}</span>
                        </div>
                        <p className="text-sm text-gray-400">
                          {chatStatus === 'thinking' ? 'Routing to specialists…' : 'Specialists are working on the deliverable…'}
                        </p>
                        <div className="flex gap-1 mt-0.5">
                          <span className="inline-block w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: irisVisual.color, animationDelay: '0ms' }} />
                          <span className="inline-block w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: irisVisual.color, animationDelay: '150ms' }} />
                          <span className="inline-block w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: irisVisual.color, animationDelay: '300ms' }} />
                        </div>
                      </>
                    ) : chatStatus === 'streaming' ? (
                      <div className="flex gap-1 py-1">
                        <span className="inline-block w-2 h-2 rounded-full bg-[#9b6dff] animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="inline-block w-2 h-2 rounded-full bg-[#9b6dff] animate-bounce mx-0.5" style={{ animationDelay: '150ms' }} />
                        <span className="inline-block w-2 h-2 rounded-full bg-[#9b6dff] animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400">Thinking…</p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="px-5 py-2 border-t border-[#2a2d38]">
            <div className="flex flex-wrap gap-2">
              {attachments.map((file, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1d26] border border-[#2a2d38] rounded-lg text-xs text-gray-300">
                  {getFileIcon(file.type)}
                  <span className="max-w-[120px] truncate">{file.name}</span>
                  <button onClick={() => removeAttachment(i)} className="text-gray-500 hover:text-red-400">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-[#2a2d38]">
          <div className="flex items-center gap-3">
            <div className="flex-1 flex bg-[#1a1d26] border border-[#2a2d38] rounded-xl focus-within:border-[#9b6dff] transition-colors overflow-hidden">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message Iris..."
                rows={1}
                className="flex-1 bg-transparent px-4 py-3 text-sm text-white placeholder-gray-500 outline-none resize-y max-h-32"
                style={{ minHeight: '44px' }}
              />
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.json"
                onChange={handleFileAttach}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-3 text-gray-500 hover:text-white transition-colors flex-shrink-0"
                title="Attach files"
              >
                <Paperclip size={18} />
              </button>
            </div>
            <button
              onClick={handleSend}
              disabled={(!input.trim() && attachments.length === 0 && !attachedText) || chatStatus !== 'idle'}
              className={clsx(
                'w-11 h-11 rounded-xl flex items-center justify-center transition-all flex-shrink-0',
                (input.trim() || attachments.length > 0 || attachedText) && chatStatus === 'idle'
                  ? 'bg-[#9b6dff] text-white hover:bg-[#9b6dff]/80'
                  : 'bg-[#1a1d26] text-gray-500 cursor-not-allowed'
              )}
            >
              <Send size={18} />
            </button>
          </div>
          <p className="text-[10px] text-gray-600 mt-2 text-center">
            Attach images, PDFs, Excel, or Word files for context
          </p>
        </div>
        </div>
      </div>
    </>
  )
}
