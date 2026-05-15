/**
 * The canonical intent classifier — a single source of truth for:
 *
 *   - inferDeliverableType(content)      Which deliverable class is the user asking for?
 *   - isConversationalMessage(content)   Is this casual chat or a real work request?
 *   - isSubstantiveRequest(content)      Bare-minimum heuristic for "this looks like work".
 *   - inferPipelineHint(content, ...)    Does any pipeline match by keywords?
 *   - inferRoutingContext(input)         Lead + collaborator + confidence + clientId.
 *   - getDeliverableSpec(id)             Static lookup of a deliverable's spec.
 *
 * Before this module: the same logic existed in 5 places (chat/route.ts,
 * server/ai.ts, agents-store.ts, IrisChat.tsx, pipeline-execution.ts) and
 * they drifted. Now those files all delegate here.
 *
 * The module is *isomorphic* — it doesn't import anything Node-only, so it
 * can run in the browser (Iris client classifier, mission store) and on the
 * server (chat route, autonomous task) with identical behaviour.
 */

import type { DeliverableType } from '@/lib/types'
import {
  DELIVERABLE_REGISTRY,
  type DeliverableSpec,
  getDeliverableSpec,
  listDeliverableSpecs,
} from '@/lib/intents/deliverable-registry'

export { DELIVERABLE_REGISTRY, getDeliverableSpec, listDeliverableSpecs }
export type { DeliverableSpec }

/* ────────────────────────────────────────────────────────────────────────
 * Conversational vs task classification
 * ─────────────────────────────────────────────────────────────────────── */

const TASK_KEYWORDS =
  /\b(create|make|build|draft|generate|write|produce|design|plan|schedule|audit|analyze|research|forecast|calendar|campaign|brief|copy|content calendar|media plan|budget|strategy|strategic plan|strategic messages|message pillars|messaging|positioning|value proposition|target audience|audience research|market analysis|customer insight|consumer insights|deep research|kpi|seo|competitor|carousel|caption|social post|facebook post|instagram post|linkedin post|x post|twitter post|post copy|post for|hashtag|visual|banner|ad creative|launch plan|report|sales issue|sales problem|objection|buyer|customer)\b/i

const STRATEGIC_TASK_SIGNALS = [
  'target audience',
  'audience research',
  'market analysis',
  'customer insight',
  'what value are they seeking',
  'what do they want',
  'value proposition',
  'strategic messages',
  'message pillars',
  'messaging',
  'positioning',
  'why they are not buying',
  "why they're not buying",
  'why they are not converting',
  'sales issue',
  'sales problem',
]

const CASUAL_PATTERNS: RegExp[] = [
  /^hi[.!? ]*$/i,
  /^hey[.!? ]*$/i,
  /^hello[.!? ]*$/i,
  /^yo[.!? ]*$/i,
  /^thanks?[.!? ]*$/i,
  /^thank you[.!? ]*$/i,
  /^ok(?:ay)?[.!? ]*$/i,
  /^cool[.!? ]*$/i,
  /^great[.!? ]*$/i,
  /^perfect[.!? ]*$/i,
  /^awesome[.!? ]*$/i,
  /^sounds good[.!? ]*$/i,
  /^test(ing)?[.!? ]*$/i,
  /^(good )?morning[.!? ]*$/i,
  /^(good )?afternoon[.!? ]*$/i,
  /^(good )?evening[.!? ]*$/i,
  /^how are you[.!? ]*$/i,
  /^sure[.!? ]*$/i,
  /^yes[.!? ]*$/i,
  /^no[.!? ]*$/i,
  /^got it[.!? ]*$/i,
  /^why[.!? ]*$/i,
]

const EXPLICIT_CHAT_ONLY_PATTERNS: RegExp[] = [
  /\b(project status|task status|status update|what is the status|progress update)\b/i,
  /\bwhat are the agents doing\b/i,
  /\bwho is working on\b/i,
  /\bwhat can you do\b/i,
  /\bwhat can iris do\b/i,
  /\bshow me the team\b/i,
  /\bwho are the agents\b/i,
  /\bhow does the app work\b/i,
  /\bwhat capabilities\b/i,
  /\blist (the|all|my) (tasks|missions|projects)\b/i,
  /\b(explain|tell me about|describe) (yourself|iris|the agents|the team)\b/i,
]

const ACTION_VERBS_RE =
  /\b(create|draft|write|build|make|generate|prepare|design|plan|develop|analyse|analyze|audit|review|research|outline|summarize|summarise|propose|recommend|evaluate|compare|assess|optimize|optimise|launch|execute|schedule|set up|configure|map out|brainstorm|ideate|produce|compose|compile|format|restructure|rework|revamp|update|refresh|rephrase|rewrite|improve|enhance|craft)\b/

const NEED_VERBS_RE =
  /\b(i need|we need|i want|can you|could you|please|help me|let's|lets|i'd like|we'd like|would you)\b/

const DELIVERABLE_NOUNS_RE =
  /\b(report|brief|calendar|plan|strategy|audit|analysis|deck|proposal|copy|content|script|template|guide|framework|roadmap|presentation|newsletter|campaign|email|post|article|blog|page|asset|design|mockup|wireframe|diagram|description|bio|tagline)\b/

/**
 * Returns true when the message is genuinely casual/inspectional rather than
 * a deliverable request. Order matters here:
 *   1. Empty / pure casual phrases → conversational.
 *   2. Explicit "what can you do" type questions → conversational.
 *   3. Strategic task signals or task keywords → NOT conversational.
 *   4. Need-verbs paired with deliverable nouns → NOT conversational.
 *   5. Short messages without punctuation default to conversational.
 *   6. Otherwise: NOT conversational.
 */
export function isConversationalMessage(content: string): boolean {
  const trimmed = (content || '').trim()
  if (!trimmed) return true

  const lower = trimmed.toLowerCase()

  if (CASUAL_PATTERNS.some((pattern) => pattern.test(trimmed))) return true
  if (EXPLICIT_CHAT_ONLY_PATTERNS.some((pattern) => pattern.test(trimmed))) return true

  if (TASK_KEYWORDS.test(content)) return false
  if (STRATEGIC_TASK_SIGNALS.some((signal) => lower.includes(signal))) return false
  if (NEED_VERBS_RE.test(lower) && DELIVERABLE_NOUNS_RE.test(lower)) return false

  if (trimmed.length < 24 && !/[?.!]/.test(trimmed)) return true
  return false
}

/**
 * "This looks like real work, even if no specific deliverable matches."
 * Used as a tiebreaker when the registry returns status-report by default
 * but the message is clearly substantive.
 */
export function isSubstantiveRequest(content: string): boolean {
  const lower = (content || '').toLowerCase().trim()
  if (lower.length < 20) return false
  if (ACTION_VERBS_RE.test(lower)) return true
  if (NEED_VERBS_RE.test(lower) && lower.length > 30) return true
  if (lower.length > 60 && lower.includes('?')) return true
  if (DELIVERABLE_NOUNS_RE.test(lower) && lower.length > 30) return true
  return lower.length > 50
}

/* ────────────────────────────────────────────────────────────────────────
 * Deliverable-type inference
 * ─────────────────────────────────────────────────────────────────────── */

const STRATEGY_SIGNALS = [
  'target audience',
  'audience research',
  'market analysis',
  'customer insight',
  'value proposition',
  'what value are they seeking',
  'what do they want',
  'why they are not buying',
  "why they're not buying",
  'strategic messages',
  'message pillars',
  'messaging',
  'positioning',
  'strategic plan',
]

const RESEARCH_SIGNALS = [
  'research',
  'analysis',
  'competitor',
  'benchmark',
  'data',
  'insight',
  'trend',
  'landscape',
  'audit',
  'report',
]

/**
 * Score-based classifier. Each deliverable's regex patterns contribute 10 +
 * (match length × 0.5). A handful of category-specific dampeners keep
 * misclassifications down (e.g. "creative-asset" can't win for pure strategy
 * requests). We never invent a deliverable — if no pattern matches above the
 * threshold, we fall through to general-task or status-report based on
 * substantiveness.
 */
export function inferDeliverableType(content: string): DeliverableType {
  const lower = (content || '').toLowerCase()

  const strategySignalCount = STRATEGY_SIGNALS.filter((signal) => lower.includes(signal)).length
  const researchSignalCount = RESEARCH_SIGNALS.filter((signal) => lower.includes(signal)).length

  if (strategySignalCount >= 3) {
    return lower.includes('research') || lower.includes('analysis') ? 'research-brief' : 'strategy-brief'
  }

  // Explicit social post patterns always resolve to campaign-copy.
  // This short-circuits the score system so that phrasing like "create a post
  // image for Instagram" (which could score creative-asset via "post image")
  // never accidentally routes to the creative-asset engine.
  if (
    /\b(instagram post|facebook post|linkedin post|social post|single post|carousel post|caption)\b/.test(lower) &&
    !/\b(content calendar|30[- ]?day|monthly content|weekly content plan|editorial calendar)\b/.test(lower)
  ) {
    return 'campaign-copy'
  }

  const candidates = DELIVERABLE_REGISTRY.filter((spec) => spec.patterns.length > 0).sort(
    (a, b) => b.priority - a.priority
  )

  let bestId: DeliverableType = 'status-report'
  let bestScore = 0

  for (const spec of candidates) {
    let score = 0
    for (const pattern of spec.patterns) {
      const matches = lower.match(pattern)
      if (matches) {
        score += 10
        score += (matches[0]?.length || 0) * 0.5
      }
    }

    if (spec.id === 'creative-asset' && score > 0) {
      // Hard-dampen if the request is clearly asking for a social post (text copy),
      // not image/visual generation. The social-post early-return above catches most
      // cases; this handles edge cases like "create a post image for our Instagram".
      if (/\b(instagram post|facebook post|linkedin post|social post|single post|caption)\b/.test(lower)) {
        score *= 0.05
      } else if (
        !/\b(post|caption|instagram|facebook|linkedin|social|ad|banner|display|poster|creative|visual|image|artwork|design)\b/.test(
          lower
        )
      ) {
        score *= 0.35
      }
      if (strategySignalCount >= 2) score *= 0.3
    }

    if (spec.id === 'short-form-copy' && score > 0) score += 5

    if (
      spec.id === 'campaign-copy' &&
      /\b(strategy|plan|planning|strategic)\b/.test(lower)
    ) {
      score *= 0.6
    }

    if (
      spec.id === 'campaign-strategy' &&
      /\b(write|draft|copy|caption|post)\b/.test(lower) &&
      !/\b(strategy|plan|strategic)\b/.test(lower)
    ) {
      score *= 0.5
    }

    if (spec.id === 'creative-asset' && researchSignalCount >= 2) score *= 0.5

    if (score > bestScore) {
      bestScore = score
      bestId = spec.id
    }
  }

  if (bestScore < 5) {
    return isSubstantiveRequest(content) ? 'general-task' : 'status-report'
  }

  return bestId
}

/* ────────────────────────────────────────────────────────────────────────
 * Pipeline matching
 * ─────────────────────────────────────────────────────────────────────── */

export interface PipelineHint {
  id: string
  name: string
  description: string
  confidence: 'high' | 'medium' | 'low'
  phases: string[]
  estimatedDuration: string
  clientProfileFields: Array<{ id: string; label: string; type: string; required: boolean }>
}

interface PipelineLike {
  id: string
  name: string
  description?: string
  estimatedDuration?: string
  phases?: Array<{ id?: string; name: string }> | string[]
  clientProfileFields?: Array<{ id: string; label: string; type: string; required: boolean }>
}

/**
 * Match the message against pipelines that the user has installed. We
 * combine deliverable-spec keywords (curated) with the pipeline's own
 * declared name/description/phases as a fallback so newly-added pipelines
 * can match even without entries in DELIVERABLE_REGISTRY.
 */
export function inferPipelineHint(content: string, pipelines: PipelineLike[]): PipelineHint | null {
  const lower = (content || '').toLowerCase()
  let bestMatch: { pipelineId: string; matchCount: number; specificity: number } | null = null

  for (const spec of DELIVERABLE_REGISTRY) {
    if (!spec.pipelineId || !spec.pipelineKeywords.length) continue

    let matchCount = 0
    let totalMatchLength = 0
    for (const keyword of spec.pipelineKeywords) {
      if (lower.includes(keyword)) {
        matchCount += 1
        totalMatchLength += keyword.length
      }
    }

    if (matchCount > 0) {
      const specificity = totalMatchLength / spec.pipelineKeywords.length
      if (
        !bestMatch ||
        matchCount > bestMatch.matchCount ||
        (matchCount === bestMatch.matchCount && specificity > bestMatch.specificity)
      ) {
        bestMatch = { pipelineId: spec.pipelineId, matchCount, specificity }
      }
    }
  }

  // Fallback 1: deliverable-type bridge — if inferDeliverableType resolves to a
  // type that declares a pipelineId, use it even when keyword matching found nothing.
  // This ensures any correctly-classified deliverable always gets its pipeline.
  if (!bestMatch) {
    const inferredType = inferDeliverableType(content)
    const inferredSpec = DELIVERABLE_REGISTRY.find((spec) => spec.id === inferredType)
    if (inferredSpec?.pipelineId) {
      const pipeline = (pipelines || []).find((entry) => entry.id === inferredSpec.pipelineId)
      if (pipeline) {
        bestMatch = { pipelineId: inferredSpec.pipelineId, matchCount: 1, specificity: 0.5 }
      }
    }
  }

  // Fallback 2: scan user-defined pipelines whose name/description happens to
  // appear in the message. This lets new pipelines match even before the
  // registry is updated. Threshold lowered to >= 1 so single-word pipeline
  // names (e.g. "strategy") still match.
  if (!bestMatch) {
    for (const pipeline of pipelines || []) {
      const haystack = [
        pipeline.id,
        pipeline.name,
        pipeline.description || '',
        ...(Array.isArray(pipeline.phases)
          ? (pipeline.phases as Array<string | { name?: string }>).map((phase) =>
              typeof phase === 'string' ? phase : phase?.name || ''
            )
          : []),
      ]
        .join(' ')
        .toLowerCase()

      const tokens = pipeline.name
        .toLowerCase()
        .split(/\s+/)
        .filter((token) => token.length >= 4)
      const matchCount = tokens.filter((token) => lower.includes(token)).length
      if (matchCount >= 1 && haystack.length) {
        bestMatch = { pipelineId: pipeline.id, matchCount, specificity: 1 }
        break
      }
    }
  }

  if (!bestMatch) return null

  const pipeline = (pipelines || []).find((entry) => entry.id === bestMatch!.pipelineId)
  if (!pipeline) return null

  const confidence: PipelineHint['confidence'] =
    bestMatch.matchCount >= 3 ? 'high' : bestMatch.matchCount >= 2 ? 'medium' : 'low'

  const phaseNames = Array.isArray(pipeline.phases)
    ? (pipeline.phases as Array<string | { name?: string }>).map((phase) =>
        typeof phase === 'string' ? phase : phase?.name || ''
      ).filter(Boolean)
    : []

  return {
    id: pipeline.id,
    name: pipeline.name,
    description: pipeline.description || '',
    confidence,
    phases: phaseNames,
    estimatedDuration: pipeline.estimatedDuration || 'unspecified',
    clientProfileFields: pipeline.clientProfileFields || [],
  }
}

/* ────────────────────────────────────────────────────────────────────────
 * Routing context (lead, collaborators, confidence)
 * ─────────────────────────────────────────────────────────────────────── */

export interface RoutingContext {
  routedAgentId: string
  routingReason: string
  clientId?: string
  deliverableType: DeliverableType
  collaboratorAgentIds: string[]
  pipelineId: string | null
  confidence: 'high' | 'medium' | 'low'
}

const CONTENT_SIGNAL_AGENTS: Array<{ pattern: RegExp; agentId: string }> = [
  { pattern: /(visual|image|design|creative|artwork|graphic|mockup|illustration|banner)/i, agentId: 'lyra' },
  { pattern: /(research|data|market|competitor|benchmark|analysis|insight|trend)/i, agentId: 'atlas' },
  { pattern: /(stakeholder|board|investor|executive|c-suite|management|pitch|presentation)/i, agentId: 'sage' },
  { pattern: /(copy|caption|headline|hook|cta|content|script|article|bio|tagline)/i, agentId: 'echo' },
  { pattern: /(channel|media|budget|spend|allocation|paid|organic|schedule)/i, agentId: 'nova' },
  { pattern: /(excel|spreadsheet|kpi|pacing|budget sheet|forecast|projection)/i, agentId: 'dex' },
  { pattern: /(timeline|handoff|traffic|resourcing|schedule|project plan)/i, agentId: 'piper' },
  { pattern: /(concept|creative direction|campaign concept|idea|brainstorm|ux|ui|usability)/i, agentId: 'finn' },
]

/**
 * Same shape as the prior server/ai.ts inferRoutingContext but powered by
 * the canonical registry. Both server and client can call this safely.
 */
export function inferRoutingContext(input: {
  content: string
  clientHints: Array<{ id: string; name: string; industry: string }>
  agents: Array<{ id: string; name: string; specialty?: string; role?: string; skills?: string[] }>
}): RoutingContext {
  const lower = (input.content || '').toLowerCase()
  const deliverableType = inferDeliverableType(input.content)
  const spec = getDeliverableSpec(deliverableType)
  const client =
    (input.clientHints || []).find(
      (item) => lower.includes(item.name.toLowerCase()) || lower.includes(item.id.toLowerCase())
    ) || null

  const availableAgentIds = new Set((input.agents || []).map((agent) => agent.id))
  const routedAgentId = availableAgentIds.has(spec.defaultLead)
    ? spec.defaultLead
    : spec.defaultCollaborators.find((id) => availableAgentIds.has(id)) || 'iris'

  const collaborators = new Set(
    spec.defaultCollaborators.filter((id) => id !== routedAgentId && availableAgentIds.has(id))
  )

  for (const signal of CONTENT_SIGNAL_AGENTS) {
    if (
      signal.pattern.test(lower) &&
      signal.agentId !== routedAgentId &&
      availableAgentIds.has(signal.agentId)
    ) {
      collaborators.add(signal.agentId)
    }
  }

  let confidence: RoutingContext['confidence'] = 'low'
  if (deliverableType !== 'status-report') {
    const patternMatches = spec.patterns.filter((pattern) => pattern.test(lower)).length
    confidence = patternMatches >= 2 ? 'high' : patternMatches === 1 ? 'medium' : 'low'
  }

  const routedAgent = (input.agents || []).find((agent) => agent.id === routedAgentId)
  const collaboratorNames = Array.from(collaborators)
    .map((id) => (input.agents || []).find((agent) => agent.id === id)?.name || id)
    .join(', ')

  let routingReason = 'Iris handled this request directly.'
  if (routedAgent && deliverableType !== 'status-report') {
    routingReason = `Iris identified this as ${spec.label.toLowerCase()} work and routed it to ${routedAgent.name} (${routedAgent.role || routedAgent.specialty || 'specialist'}) as lead.`
    if (collaborators.size > 0) {
      routingReason += ` Supporting: ${collaboratorNames}.`
    }
  }

  return {
    routedAgentId,
    routingReason,
    clientId: client?.id,
    deliverableType,
    collaboratorAgentIds: Array.from(collaborators),
    pipelineId: spec.pipelineId,
    confidence,
  }
}

/* ────────────────────────────────────────────────────────────────────────
 * Deliverable → pipeline metadata convenience
 * Used by the mission store when seeding a new mission. Keeps the deliverable
 * → pipeline mapping in one place instead of letting each store hardcode it.
 * ─────────────────────────────────────────────────────────────────────── */

export function inferPipelineMetadataForDeliverable(deliverableType: DeliverableType): {
  pipelineId: string | null
  pipelineName: string | null
} {
  const spec = getDeliverableSpec(deliverableType)
  return {
    pipelineId: spec.pipelineId,
    pipelineName: spec.pipelineId ? spec.label : null,
  }
}
