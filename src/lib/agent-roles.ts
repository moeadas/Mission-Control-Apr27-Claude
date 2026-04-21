import { DeliverableType } from '@/lib/types'

export const ROLE_AGENT_MAP: Record<string, string[]> = {
  'client-services': ['sage', 'piper'],
  orchestration: ['iris', 'piper'],
  creative: ['finn', 'echo', 'lyra'],
  media: ['nova', 'dex'],
  research: ['atlas'],
  strategy: ['maya'],
  'brand-strategist': ['maya'],
  copy: ['echo'],
  'visual-producer': ['lyra'],
  'media-planner': ['nova'],
  performance: ['dex'],
  'content-strategist': ['maya', 'echo'],
  'traffic-manager': ['piper'],
  'creative-director': ['finn'],
  'seo-specialist': ['atlas'],
}

export function getAgentIdsForRole(role?: string) {
  if (!role) return []
  return ROLE_AGENT_MAP[role] || []
}

export function pickAgentForRole<T extends { id: string }>(agents: T[], role?: string, fallbackAgentId?: string) {
  const preferredIds = getAgentIdsForRole(role)
  const preferredAgent = preferredIds.map((id) => agents.find((agent) => agent.id === id)).find(Boolean) || null
  if (preferredAgent) return preferredAgent
  return fallbackAgentId ? agents.find((agent) => agent.id === fallbackAgentId) || null : null
}

export function getDeliverableAgentPlan(deliverableType: DeliverableType, request: string, routedAgentId?: string) {
  const lower = request.toLowerCase()

  switch (deliverableType) {
    case 'short-form-copy':
      return { leadAgentId: 'echo', collaboratorAgentIds: ['maya'] }
    case 'email-campaign':
      return { leadAgentId: 'echo', collaboratorAgentIds: ['maya', 'nova'] }
    case 'blog-article':
      return { leadAgentId: 'echo', collaboratorAgentIds: ['atlas', 'maya'] }
    case 'website-copy':
      return { leadAgentId: 'echo', collaboratorAgentIds: ['maya', 'lyra'] }
    case 'video-script':
      return { leadAgentId: 'echo', collaboratorAgentIds: ['lyra', 'maya'] }
    case 'presentation':
      return { leadAgentId: 'sage', collaboratorAgentIds: ['maya', 'lyra', 'echo'] }
    case 'campaign-copy':
      return {
        leadAgentId: 'echo',
        collaboratorAgentIds: lower.includes('carousel') || lower.includes('instagram') ? ['maya', 'lyra'] : ['maya'],
      }
    case 'content-calendar':
      return { leadAgentId: 'echo', collaboratorAgentIds: ['maya', 'lyra'] }
    case 'strategy-brief':
    case 'campaign-strategy':
      return { leadAgentId: 'maya', collaboratorAgentIds: ['sage', 'atlas'] }
    case 'brand-guidelines':
      return { leadAgentId: 'lyra', collaboratorAgentIds: ['maya', 'echo'] }
    case 'creative-asset':
      return { leadAgentId: 'lyra', collaboratorAgentIds: ['finn', 'echo'] }
    case 'data-analysis':
      return { leadAgentId: 'atlas', collaboratorAgentIds: ['nova', 'maya'] }
    case 'media-plan':
      return { leadAgentId: 'nova', collaboratorAgentIds: ['dex', 'maya'] }
    case 'event-plan':
      return { leadAgentId: 'nova', collaboratorAgentIds: ['maya', 'sage', 'echo'] }
    case 'budget-sheet':
    case 'kpi-forecast':
      return { leadAgentId: 'dex', collaboratorAgentIds: ['nova'] }
    case 'seo-audit':
    case 'research-brief':
      return { leadAgentId: 'atlas', collaboratorAgentIds: ['maya'] }
    case 'ui-audit':
      return { leadAgentId: 'finn', collaboratorAgentIds: ['lyra', 'echo', 'dex'] }
    case 'pr-comms':
      return { leadAgentId: 'sage', collaboratorAgentIds: ['echo', 'maya'] }
    case 'client-brief':
      return { leadAgentId: 'sage', collaboratorAgentIds: ['maya', 'piper'] }
    case 'general-task':
      return { leadAgentId: routedAgentId || 'maya', collaboratorAgentIds: ['atlas'] }
    default:
      return { leadAgentId: routedAgentId || 'iris', collaboratorAgentIds: [] }
  }
}
