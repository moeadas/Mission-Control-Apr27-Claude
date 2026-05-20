/**
 * office-context.ts — inject office awareness into agent system prompts
 * (Batch W Phase 4).
 *
 * Each agent receives a small, structured "Office context" block at the top
 * of their system prompt describing:
 *   • Their physical location (desk label, zone)
 *   • Their department + manager
 *   • Their teammates (other agents in the same department)
 *   • Office vitals (capacity, score) so they have situational awareness
 *
 * The block is intentionally short (~10 lines) so it doesn't blow up token
 * budgets, and it's prefixed with a clear "[Office context]" label so the
 * agent treats it as background rather than a directive.
 */

import type { OfficeLayout } from '@/lib/office-types'
import { OFFICE_ASSETS } from '@/lib/office-assets'

const assetMap = new Map(OFFICE_ASSETS.map((a) => [a.id, a]))

interface AgentInfo {
  id: string
  name: string
  role?: string | null
}

/**
 * Build a one-paragraph office-awareness block for a specific agent.
 * Returns an empty string when there's no useful context (no layout, no
 * department, no desk) so we don't pad prompts with noise.
 */
export function buildOfficeContextForAgent(
  agentId: string,
  agents: AgentInfo[],
  layout: OfficeLayout | null | undefined
): string {
  if (!layout) return ''

  const me = agents.find((a) => a.id === agentId)
  if (!me) return ''

  const lines: string[] = []

  // Desk location
  const desk = layout.tiles.find((t) => t.assignedAgentId === agentId && assetMap.get(t.assetId)?.category === 'desks')
  if (desk) {
    const assetName = assetMap.get(desk.assetId)?.name || 'desk'
    const label = desk.label ? `"${desk.label}"` : `a ${assetName.toLowerCase()}`
    lines.push(`Your desk: ${label} at grid (${desk.x}, ${desk.y}).`)
  }

  // Zone the desk falls into
  if (desk) {
    const zone = (layout.zones || []).find((z) =>
      z.tiles.some((t) => t.x === desk.x && t.y === desk.y)
    )
    if (zone) lines.push(`Zone: ${zone.name}.`)
  }

  // Department + manager (Phase 2 wiring)
  const dept = (layout.org?.departments || []).find((d) => d.agentIds.includes(agentId))
  if (dept) {
    const lead = dept.leadAgentId ? agents.find((a) => a.id === dept.leadAgentId) : null
    const leadLabel = lead && lead.id !== agentId ? ` Lead: ${lead.name}.` : ''
    lines.push(`Department: ${dept.name}.${leadLabel}`)
    // Teammates (max 4 to keep this concise)
    const teammates = dept.agentIds
      .filter((aid) => aid !== agentId)
      .map((aid) => agents.find((a) => a.id === aid)?.name)
      .filter(Boolean)
      .slice(0, 4) as string[]
    if (teammates.length > 0) lines.push(`Teammates: ${teammates.join(', ')}.`)
  }

  // Reporting line (manager) — only when not redundant with dept lead
  const myReportingLine = (layout.org?.reportingLines || []).find((r) => r.agentId === agentId)
  if (myReportingLine && myReportingLine.managerId !== dept?.leadAgentId) {
    const manager = agents.find((a) => a.id === myReportingLine.managerId)
    if (manager) lines.push(`Reports to: ${manager.name}.`)
  }

  // Office vitals — single line summary
  const deskCount = layout.tiles.filter((t) => assetMap.get(t.assetId)?.category === 'desks').length
  const officeName = layout.org?.notes?.split('\n')[0] || 'the agency office'
  lines.push(`The agency operates from ${officeName} (${deskCount} desk${deskCount === 1 ? '' : 's'}, ${agents.length} agents).`)

  if (lines.length === 0) return ''

  return [
    '[Office context — background only, do not quote verbatim unless asked]',
    ...lines,
    '[End office context]',
  ].join('\n')
}

/**
 * Helper for the chat / autonomous-task path: take the full agents roster and
 * a target agentId and return the system-prompt prefix to inject.
 */
export function officeContextPrefix(
  agentId: string,
  agents: AgentInfo[],
  layout: OfficeLayout | null | undefined
): string {
  const block = buildOfficeContextForAgent(agentId, agents, layout)
  return block ? `${block}\n\n` : ''
}
