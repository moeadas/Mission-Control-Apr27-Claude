import { ChannelingConfidence, DeliverableComplexity, DeliverableType } from '@/lib/types'
import { getAgentIdsForRole, getDeliverableAgentPlan, matchesAgentTemplate } from '@/lib/agent-roles'
import { getAuditExecutionProfile } from '@/lib/audit-capabilities'

interface ChannelingDeliverableSpec {
  id: DeliverableType
  defaultLead: string
  defaultCollaborators: string[]
  skillBoostPatterns: RegExp[]
  skillPenaltyPatterns: RegExp[]
  complexity: DeliverableComplexity
  simpleVariantPatterns?: RegExp[]
}

const CHANNELING_SPECS: Record<DeliverableType, ChannelingDeliverableSpec> = {
  'content-calendar': {
    id: 'content-calendar',
    defaultLead: 'echo',
    defaultCollaborators: ['maya', 'nova', 'lyra'],
    skillBoostPatterns: [/calendar|content|platform-native|social|campaign|copywriting|headline|scheduling/],
    skillPenaltyPatterns: [/operations|documentation|knowledge|resource|capacity|waterfall|meeting|delegation|scope|process/],
    complexity: 'high',
  },
  'campaign-copy': {
    id: 'campaign-copy',
    defaultLead: 'echo',
    defaultCollaborators: ['maya'],
    skillBoostPatterns: [/copywriting|copy|headline|content|social|email|landing-page|cta|brand-voice|tone-adaptation|persuasion|caption|campaign/],
    skillPenaltyPatterns: [/operations|quality|documentation|knowledge|resource|capacity|waterfall|meeting|delegation|scope|process/],
    complexity: 'medium',
    simpleVariantPatterns: [/\b(linkedin post|instagram post|social post|single post|caption)\b/],
  },
  'short-form-copy': {
    id: 'short-form-copy',
    defaultLead: 'echo',
    defaultCollaborators: ['maya'],
    skillBoostPatterns: [/short-form|headline|cta|social-copy|campaign-copywriting|tagline|brand-voice|tone/],
    skillPenaltyPatterns: [/operations|documentation|calendar|scheduling|media|budget/],
    complexity: 'low',
  },
  'email-campaign': {
    id: 'email-campaign',
    defaultLead: 'echo',
    defaultCollaborators: ['maya', 'nova'],
    skillBoostPatterns: [/email|campaign-copywriting|headline|cta|short-form|automation|journey|nurture|sequence|drip/],
    skillPenaltyPatterns: [/operations|documentation|waterfall|meeting|delegation/],
    complexity: 'medium',
  },
  'blog-article': {
    id: 'blog-article',
    defaultLead: 'echo',
    defaultCollaborators: ['atlas', 'maya'],
    skillBoostPatterns: [/content|copywriting|headline|long-form|narrative|seo|keyword|research|thought-leadership/],
    skillPenaltyPatterns: [/operations|scheduling|media|budget|calendar/],
    complexity: 'medium',
  },
  'website-copy': {
    id: 'website-copy',
    defaultLead: 'echo',
    defaultCollaborators: ['maya', 'lyra'],
    skillBoostPatterns: [/copywriting|headline|cta|web|landing|conversion|ux|persuasion|brand-voice/],
    skillPenaltyPatterns: [/operations|documentation|calendar|scheduling/],
    complexity: 'medium',
  },
  'video-script': {
    id: 'video-script',
    defaultLead: 'echo',
    defaultCollaborators: ['lyra', 'maya'],
    skillBoostPatterns: [/narrative|storytelling|copywriting|script|video|storyboard|content|hook/],
    skillPenaltyPatterns: [/operations|documentation|calendar|scheduling|budget/],
    complexity: 'medium',
  },
  presentation: {
    id: 'presentation',
    defaultLead: 'sage',
    defaultCollaborators: ['maya', 'lyra', 'echo'],
    skillBoostPatterns: [/stakeholder|narrative|presentation|communication|strategy|positioning|messaging|visual|design|headline|copywriting/],
    skillPenaltyPatterns: [/operations|documentation|calendar|scheduling|seo/],
    complexity: 'high',
  },
  'client-brief': {
    id: 'client-brief',
    defaultLead: 'sage',
    defaultCollaborators: ['maya', 'echo'],
    skillBoostPatterns: [/stakeholder|narrative|communication|briefing|onboarding|presentation|strategy|positioning/],
    skillPenaltyPatterns: [/operations|scheduling|seo|keyword|budget|media/],
    complexity: 'medium',
  },
  'strategy-brief': {
    id: 'strategy-brief',
    defaultLead: 'maya',
    defaultCollaborators: ['atlas', 'sage'],
    skillBoostPatterns: [/strategy|positioning|value-proposition|market-segmentation|go-to-market|brand|messaging|persona|audience|campaign-planning|deep-research/],
    skillPenaltyPatterns: [/operations|documentation|calendar|scheduling|seo|keyword/],
    complexity: 'high',
  },
  'campaign-strategy': {
    id: 'campaign-strategy',
    defaultLead: 'maya',
    defaultCollaborators: ['nova', 'echo', 'atlas'],
    skillBoostPatterns: [/campaign-planning|strategy|positioning|audience|messaging|channel|media|organic-social|paid|calendar|deep-research/],
    skillPenaltyPatterns: [/operations|documentation|waterfall|meeting|delegation/],
    complexity: 'high',
  },
  'brand-guidelines': {
    id: 'brand-guidelines',
    defaultLead: 'lyra',
    defaultCollaborators: ['maya', 'echo'],
    skillBoostPatterns: [/visual|design|brand|identity|storytelling|positioning|messaging|tone|voice|art-direction|brand-consistency/],
    skillPenaltyPatterns: [/operations|documentation|calendar|scheduling|seo|media|budget/],
    complexity: 'high',
  },
  'research-brief': {
    id: 'research-brief',
    defaultLead: 'atlas',
    defaultCollaborators: ['maya', 'echo'],
    skillBoostPatterns: [/deep-research|research|insight|seo|competitive|market|consumer|audience|benchmark|trend|analysis/],
    skillPenaltyPatterns: [/operations|documentation|calendar|scheduling/],
    complexity: 'high',
  },
  'seo-audit': {
    id: 'seo-audit',
    defaultLead: 'atlas',
    defaultCollaborators: ['echo', 'nova'],
    skillBoostPatterns: [/seo|keyword|research|report|competitive|insight|technical|audit|search|content/],
    skillPenaltyPatterns: [/operations|documentation|calendar|scheduling|visual|design/],
    complexity: 'high',
  },
  'data-analysis': {
    id: 'data-analysis',
    defaultLead: 'atlas',
    defaultCollaborators: ['nova', 'maya'],
    skillBoostPatterns: [/research|data|analysis|insight|market|competitive|performance|analytics|reporting|kpi/],
    skillPenaltyPatterns: [/operations|documentation|calendar|copywriting|visual|design/],
    complexity: 'high',
  },
  'creative-asset': {
    id: 'creative-asset',
    defaultLead: 'lyra',
    defaultCollaborators: ['echo', 'finn'],
    skillBoostPatterns: [/visual|design|art-direction|creative|nano|reference-image|template|brand-template|brand-guidelines|brand-consistency|illustration/],
    skillPenaltyPatterns: [/operations|documentation|calendar|scheduling|seo|keyword|budget/],
    complexity: 'medium',
  },
  'ui-audit': {
    id: 'ui-audit',
    defaultLead: 'finn',
    defaultCollaborators: ['lyra', 'echo', 'dex'],
    skillBoostPatterns: [/ux|ui|design|visual|quality|copy|conversion|audit|usability|accessibility|heuristic/],
    skillPenaltyPatterns: [/operations|documentation|calendar|scheduling|seo|keyword|budget|media/],
    complexity: 'high',
  },
  'pr-comms': {
    id: 'pr-comms',
    defaultLead: 'sage',
    defaultCollaborators: ['echo', 'maya'],
    skillBoostPatterns: [/stakeholder|narrative|communication|negotiation|presentation|media|press|public-relations|crisis/],
    skillPenaltyPatterns: [/operations|documentation|calendar|scheduling|seo|keyword|budget/],
    complexity: 'medium',
  },
  'event-plan': {
    id: 'event-plan',
    defaultLead: 'nova',
    defaultCollaborators: ['maya', 'sage', 'echo'],
    skillBoostPatterns: [/channel|media|calendar|planning|event|scheduling|stakeholder|communication|content|copywriting/],
    skillPenaltyPatterns: [/seo|keyword|ui|ux|design|visual/],
    complexity: 'high',
  },
  'media-plan': {
    id: 'media-plan',
    defaultLead: 'nova',
    defaultCollaborators: ['maya', 'dex', 'atlas'],
    skillBoostPatterns: [/media|channel|budget|reach|frequency|kpi|paid|organic|allocation|forecast|performance|benchmark|market|audience|measurement/],
    skillPenaltyPatterns: [/operations|documentation|calendar|copywriting|visual|design/],
    complexity: 'high',
  },
  'budget-sheet': {
    id: 'budget-sheet',
    defaultLead: 'dex',
    defaultCollaborators: ['nova', 'maya'],
    skillBoostPatterns: [/budget|forecast|kpi|pacing|spreadsheet|data|financial|allocation|analytics/],
    skillPenaltyPatterns: [/copywriting|visual|design|narrative|seo/],
    complexity: 'medium',
  },
  'kpi-forecast': {
    id: 'kpi-forecast',
    defaultLead: 'dex',
    defaultCollaborators: ['atlas', 'nova'],
    skillBoostPatterns: [/kpi|forecast|projection|data|analytics|performance|metric|benchmark|reporting/],
    skillPenaltyPatterns: [/copywriting|visual|design|narrative|seo|calendar/],
    complexity: 'medium',
  },
  'financial-operations': {
    id: 'financial-operations',
    defaultLead: 'aria',
    defaultCollaborators: ['ledger', 'vera'],
    skillBoostPatterns: [/account|invoice|payable|receivable|close|reconciliation|approval|expense|control|evidence/],
    skillPenaltyPatterns: [/copywriting|visual|design|seo|media/],
    complexity: 'high',
  },
  'financial-report': {
    id: 'financial-report',
    defaultLead: 'ledger',
    defaultCollaborators: ['nora', 'cash'],
    skillBoostPatterns: [/financial|budget|actual|variance|cash|forecast|liquidity|working-capital|management-report/],
    skillPenaltyPatterns: [/copywriting|visual|design|seo|media/],
    complexity: 'high',
  },
  'people-operations': {
    id: 'people-operations',
    defaultLead: 'harper',
    defaultCollaborators: ['ellis', 'devon'],
    skillBoostPatterns: [/people|employee|hr|human-resources|onboarding|offboarding|policy|performance|manager|learning|training/],
    skillPenaltyPatterns: [/media|seo|copywriting|visual|finance/],
    complexity: 'high',
  },
  'talent-acquisition': {
    id: 'talent-acquisition',
    defaultLead: 'remy',
    defaultCollaborators: ['harper'],
    skillBoostPatterns: [/hire|hiring|recruit|candidate|interview|job-description|scorecard|sourcing|talent/],
    skillPenaltyPatterns: [/media|seo|copywriting|visual|finance/],
    complexity: 'high',
  },
  'business-development': {
    id: 'business-development',
    defaultLead: 'orion',
    defaultCollaborators: ['mira', 'atlas'],
    skillBoostPatterns: [/business-development|sales|pipeline|prospect|account|icp|market-entry|outbound|growth|qualification/],
    skillPenaltyPatterns: [/hr|onboarding|payroll|creative|seo/],
    complexity: 'high',
  },
  'partnership-strategy': {
    id: 'partnership-strategy',
    defaultLead: 'mira',
    defaultCollaborators: ['orion', 'atlas'],
    skillBoostPatterns: [/partner|partnership|alliance|co-marketing|distribution|channel|ecosystem|joint/],
    skillPenaltyPatterns: [/hr|onboarding|payroll|creative|seo/],
    complexity: 'high',
  },
  'general-task': {
    id: 'general-task',
    defaultLead: 'maya',
    defaultCollaborators: ['atlas'],
    skillBoostPatterns: [/strategy|positioning|messaging|audience|research|insight/],
    skillPenaltyPatterns: [],
    complexity: 'medium',
  },
  'status-report': {
    id: 'status-report',
    defaultLead: 'iris',
    defaultCollaborators: [],
    skillBoostPatterns: [/task|workflow|coordination|priority/],
    skillPenaltyPatterns: [],
    complexity: 'low',
  },
}

function getChannelingSpec(deliverableType: DeliverableType): ChannelingDeliverableSpec {
  return CHANNELING_SPECS[deliverableType] || CHANNELING_SPECS['general-task']
}

type RuntimeAgent = {
  id: string
  name: string
  role: string
  specialty?: string
  skills?: string[]
  metadata?: Record<string, unknown> | null
}

type PipelineLike = {
  id: string
  name: string
  executionMode?: 'pipeline-activities' | 'dedicated-engine'
  runtimeEngine?: string
  phases?: Array<{
    id: string
    name: string
    activities?: Array<{
      id: string
      name: string
      assignedRole?: string
    }>
  }>
}

type EnrichedSkillDefinition = {
  id: string
  name: string
  description?: string
  prompts?: {
    en?: {
      trigger?: string
      context?: string
      instructions?: string
      output_template?: string
    }
  }
  agents?: string[]
  pipelines?: string[]
}

type SkillCategory = {
  id: string
  name: string
  skills: EnrichedSkillDefinition[]
}

function resolveAgentReference(agents: RuntimeAgent[], reference: string | undefined) {
  if (!reference) return undefined
  return agents.find((agent) => matchesAgentTemplate(agent, reference))?.id
}

export interface TaskChannelingPlan {
  leadAgentId: string
  collaboratorAgentIds: string[]
  assignedAgentIds: string[]
  selectedSkillsByAgent: Record<string, string[]>
  orchestrationTrace: string[]
  confidence: ChannelingConfidence
  resolvedDeliverableType: DeliverableType
}

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items))
}

function buildSkillIndex(skillCategories: SkillCategory[]): Map<string, EnrichedSkillDefinition> {
  const byId = new Map<string, EnrichedSkillDefinition>()
  for (const category of skillCategories || []) {
    for (const skill of category.skills || []) {
      byId.set(skill.id, skill)
    }
  }
  return byId
}

// Skill scoring is owned by `@/lib/skills/scoring` so this channeling pass
// and the per-activity primary-skill picker in `autonomous-task.ts` always
// agree about what's most relevant.
import { scoreSkillRelevance } from '@/lib/skills/scoring'

function scoreSkill(
  skill: EnrichedSkillDefinition,
  request: string,
  deliverableType: DeliverableType,
  pipeline: PipelineLike | null,
  agentId: string
): number {
  const spec = getChannelingSpec(deliverableType)
  return scoreSkillRelevance(skill, {
    request,
    deliverableType,
    agentId,
    pipeline: pipeline ? { id: pipeline.id, name: pipeline.name } : null,
    channelingSpec: {
      skillBoostPatterns: spec.skillBoostPatterns,
      skillPenaltyPatterns: spec.skillPenaltyPatterns,
    },
  })
}

function isSimpleVariant(request: string, spec: ChannelingDeliverableSpec): boolean {
  if (!spec.simpleVariantPatterns?.length) return false

  const lower = request.toLowerCase()
  const matchesSimple = spec.simpleVariantPatterns.some((pattern) => pattern.test(lower))
  if (!matchesSimple) return false

  const complexityEscalators =
    /\b(carousel|content calendar|multi-?post|campaign strategy|visual direction|design|asset|image|media plan|forecast|budget|research|audit|competitor|benchmark|series|sequence|a\/b test|variant|multiple|several|all platforms)\b/
  return !complexityEscalators.test(lower)
}

function inferCollaborators(
  request: string,
  deliverableType: DeliverableType,
  leadAgentId: string,
  agents: RuntimeAgent[]
): string[] {
  const spec = getChannelingSpec(deliverableType)
  const lower = request.toLowerCase()
  const collaborators = new Set(
    spec.defaultCollaborators
      .map((id) => resolveAgentReference(agents, id))
      .filter((id): id is string => Boolean(id) && id !== leadAgentId)
  )

  if (isSimpleVariant(request, spec)) {
    const essential = spec.defaultCollaborators
      .map((id) => resolveAgentReference(agents, id))
      .find((id) => id && id !== leadAgentId)
    collaborators.clear()
    if (essential) collaborators.add(essential)
  }

  const signalMap: Array<{ pattern: RegExp; agentId: string }> = [
    { pattern: /(visual|image|design|creative|artwork|graphic|mockup|illustration|banner|poster|carousel|infographic)/, agentId: 'lyra' },
    { pattern: /(campaign concept|creative concept|big idea|angle|concept|creative direction)/, agentId: 'finn' },
    { pattern: /(research|competitor|market|benchmark|trend|analysis|data|insight|audience research)/, agentId: 'atlas' },
    { pattern: /(stakeholder|board|investor|executive|c-suite|management|pitch|client presentation|status update|account update)/, agentId: 'sage' },
    { pattern: /(media|channel|budget|spend|allocation|paid|organic|schedule|ad spend|placement)/, agentId: 'nova' },
    { pattern: /(excel|spreadsheet|kpi|pacing|budget sheet|forecast|projection|dashboard|reporting)/, agentId: 'dex' },
    { pattern: /(timeline|schedule|handoff|traffic|resourcing|project plan|milestone|deadline|gantt)/, agentId: 'piper' },
    { pattern: /(copy|caption|headline|hook|cta|content|script|article|blog|newsletter|email)/, agentId: 'echo' },
    { pattern: /(strategy|positioning|messaging|audience|persona|value proposition|brand)/, agentId: 'maya' },
  ]

  for (const signal of signalMap) {
    const resolvedId = resolveAgentReference(agents, signal.agentId)
    if (signal.pattern.test(lower) && resolvedId && resolvedId !== leadAgentId) {
      collaborators.add(resolvedId)
    }
  }

  return Array.from(collaborators)
}

function resolveLeadAgent(
  deliverableType: DeliverableType,
  routedAgentId: string | undefined,
  initialLeadFromRoles: string,
  agents: RuntimeAgent[]
): string {
  const spec = getChannelingSpec(deliverableType)
  const resolvedRoutedAgentId = resolveAgentReference(agents, routedAgentId)
  const resolvedInitialLead = resolveAgentReference(agents, initialLeadFromRoles)
  const resolvedDefaultLead = resolveAgentReference(agents, spec.defaultLead)

  if (
    resolvedRoutedAgentId &&
    !matchesAgentTemplate(agents.find((agent) => agent.id === resolvedRoutedAgentId)!, 'iris') &&
    deliverableType !== 'status-report'
  ) {
    return resolvedRoutedAgentId
  }

  if (
    resolvedInitialLead &&
    !matchesAgentTemplate(agents.find((agent) => agent.id === resolvedInitialLead)!, 'iris') &&
    deliverableType !== 'status-report'
  ) {
    return resolvedInitialLead
  }

  if (deliverableType !== 'status-report' && resolvedDefaultLead && spec.defaultLead !== 'iris') {
    return resolvedDefaultLead
  }

  if (deliverableType !== 'status-report') {
    const fallback = spec.defaultCollaborators
      .map((id) => resolveAgentReference(agents, id))
      .find((id) => id && !matchesAgentTemplate(agents.find((agent) => agent.id === id)!, 'iris'))
    if (fallback) return fallback
  }

  return resolvedInitialLead || resolveAgentReference(agents, 'iris') || initialLeadFromRoles
}

function getSkillCap(agentId: string, leadAgentId: string, complexity: DeliverableComplexity, isIris: boolean): number {
  const capsByComplexity = {
    low: { lead: 2, collaborator: 1, iris: 1 },
    medium: { lead: 3, collaborator: 2, iris: 1 },
    high: { lead: 4, collaborator: 3, iris: 1 },
  }

  const caps = capsByComplexity[complexity]
  if (isIris) return caps.iris
  if (agentId === leadAgentId) return caps.lead
  return caps.collaborator
}

function computeChannelingConfidence(input: {
  deliverableType: DeliverableType
  leadAgentId: string
  selectedSkillsByAgent: Record<string, string[]>
  pipeline: PipelineLike | null
  agents: RuntimeAgent[]
}): ChannelingConfidence {
  let confidenceScore = 0

  if (input.deliverableType !== 'status-report' && input.deliverableType !== 'general-task') confidenceScore += 3
  else if (input.deliverableType === 'general-task') confidenceScore += 1

  if (input.agents.some((agent) => agent.id === input.leadAgentId)) confidenceScore += 2

  const leadSkills = input.selectedSkillsByAgent[input.leadAgentId] || []
  if (leadSkills.length >= 2) confidenceScore += 2
  else if (leadSkills.length >= 1) confidenceScore += 1

  if (input.pipeline) confidenceScore += 2

  if (confidenceScore >= 7) return 'high'
  if (confidenceScore >= 4) return 'medium'
  return 'low'
}

export function buildTaskChannelingPlan(input: {
  request: string
  deliverableType: DeliverableType
  routedAgentId?: string
  agents: RuntimeAgent[]
  skillCategories: SkillCategory[]
  pipeline: PipelineLike | null
}): TaskChannelingPlan {
  const { request, deliverableType, routedAgentId, agents, skillCategories, pipeline } = input
  const spec = getChannelingSpec(deliverableType)
  const initialBase = getDeliverableAgentPlan(deliverableType, request, routedAgentId)
  const leadAgentId = resolveLeadAgent(deliverableType, routedAgentId, initialBase.leadAgentId, agents)
  const leadAgent = agents.find((agent) => agent.id === leadAgentId)
  const skillIndex = buildSkillIndex(skillCategories)

  const pipelineAgentIds = unique(
    (pipeline?.phases || [])
      .flatMap((phase) => phase.activities || [])
      .flatMap((activity) => {
        const reference = String(activity.assignedRole || '').toLowerCase()
        const templateIds = getAgentIdsForRole(reference)
        const resolved = (templateIds.length ? templateIds : [reference])
          .map((templateId) => resolveAgentReference(agents, templateId))
          .filter((id): id is string => Boolean(id))
        if (resolved.length) return resolved
        return agents
          .filter((agent) =>
            reference && (agent.role.toLowerCase().includes(reference) || agent.specialty?.toLowerCase() === reference)
          )
          .map((agent) => agent.id)
      })
  )

  const collaboratorAgentIds = unique([
    ...(initialBase.collaboratorAgentIds || [])
      .map((id) => resolveAgentReference(agents, id))
      .filter((id): id is string => Boolean(id)),
    ...inferCollaborators(request, deliverableType, leadAgentId, agents),
    ...pipelineAgentIds.filter((id) => id !== leadAgentId),
  ]).filter((id) => {
    const agent = agents.find((entry) => entry.id === id)
    return id !== leadAgentId && (!agent || !matchesAgentTemplate(agent, 'iris'))
  })

  const irisAgentId = resolveAgentReference(agents, 'iris') || 'iris'
  const assignedAgentIds = unique([irisAgentId, leadAgentId, ...collaboratorAgentIds])

  const selectedSkillsByAgent: Record<string, string[]> = {}
  for (const agentId of assignedAgentIds) {
    const agent = agents.find((entry) => entry.id === agentId)
    if (!agent) continue

    const ranked = (agent.skills || [])
      .map((skillId) => ({ skillId, skill: skillIndex.get(skillId) }))
      .filter((entry) => entry.skill)
      .map((entry) => ({
        skillId: entry.skillId,
        score: scoreSkill(entry.skill!, request, deliverableType, pipeline, agentId),
      }))
      .sort((a, b) => b.score - a.score)

    const skillCap = getSkillCap(agentId, leadAgentId, spec.complexity, matchesAgentTemplate(agent, 'iris'))
    const chosen = ranked
      .filter((entry) => entry.score > 0)
      .slice(0, skillCap)
      .map((entry) => entry.skillId)

    selectedSkillsByAgent[agentId] = chosen.length ? chosen : (agent.skills || []).slice(0, skillCap)
  }

  const confidence = computeChannelingConfidence({
    deliverableType,
    leadAgentId,
    selectedSkillsByAgent,
    pipeline,
    agents,
  })

  const orchestrationTrace: string[] = [
    `Iris analyzed this as ${deliverableType.replace(/-/g, ' ')} work.`,
    pipeline ? `Selected pipeline: ${pipeline.name}.` : 'No formal pipeline matched, so direct specialist execution was selected.',
    `Lead specialist: ${leadAgentId}${leadAgent ? ` (${leadAgent.name} — ${leadAgent.role})` : ''}.`,
    collaboratorAgentIds.length
      ? `Supporting specialists: ${collaboratorAgentIds
          .map((id) => {
            const agent = agents.find((entry) => entry.id === id)
            return agent ? `${id} (${agent.name})` : id
          })
          .join(', ')}.`
      : 'No supporting specialists were required.',
    `Confidence: ${confidence}.`,
  ]
  if (pipeline?.executionMode === 'dedicated-engine') {
    orchestrationTrace.push(
      `Pipeline runtime: ${pipeline.runtimeEngine || 'dedicated engine'} (the displayed phases describe this engine's execution contract).`
    )
  }

  for (const agentId of assignedAgentIds) {
    if (agentId === irisAgentId) continue
    const skills = selectedSkillsByAgent[agentId] || []
    const agent = agents.find((entry) => entry.id === agentId)
    const agentLabel = agent ? `${agent.name} (${agentId})` : agentId
    orchestrationTrace.push(`${agentLabel} activates: ${skills.join(', ') || 'general specialist context'}.`)
  }

  const defaultCollaborators = new Set(spec.defaultCollaborators)
  const dynamicCollaborators = collaboratorAgentIds.filter(
    (id) => !defaultCollaborators.has(id) && !(initialBase.collaboratorAgentIds || []).includes(id)
  )

  for (const agentId of dynamicCollaborators) {
    const agent = agents.find((entry) => entry.id === agentId)
    orchestrationTrace.push(`${agent?.name || agentId} was dynamically added based on content signals in the request.`)
  }

  const auditProfile = getAuditExecutionProfile(request, deliverableType)
  if (auditProfile) {
    orchestrationTrace.push(`Audit mode: ${auditProfile.title}.`)
    orchestrationTrace.push(`Tool stack requested: ${auditProfile.requiredConnectors.map((connector) => connector.shortName).join(', ')}.`)
  }

  return {
    leadAgentId,
    collaboratorAgentIds,
    assignedAgentIds,
    selectedSkillsByAgent,
    orchestrationTrace,
    confidence,
    resolvedDeliverableType: deliverableType,
  }
}
