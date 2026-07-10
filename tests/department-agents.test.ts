import { describe, expect, it } from 'vitest'

import { CONFIG_AGENTS } from '@/config/agents/generated'
import pipelinesConfig from '@/config/pipelines/pipelines.json'
import { getAgentIdsForRole } from '@/lib/agent-roles'
import { normalizePersistedState } from '@/lib/agents-store/normalizers'
import { loadSkillMap } from '@/lib/skills/registry'

const DEPARTMENT_EXPECTATIONS = {
  marketing: 10,
  'accounting-finance': 5,
  'human-resources': 4,
  'business-development': 2,
} as const

describe('department agent architecture', () => {
  it('ships a complete roster grouped into the requested departments', () => {
    for (const [department, count] of Object.entries(DEPARTMENT_EXPECTATIONS)) {
      expect(CONFIG_AGENTS.filter((agent) => agent.department === department)).toHaveLength(count)
    }
  })

  it('registers specialist roles used by the new workflows', () => {
    for (const role of [
      'financial-controller',
      'finance-planning',
      'accounting-operations',
      'treasury-analyst',
      'finance-compliance',
      'people-operations',
      'talent-acquisition',
      'learning-development',
      'employee-relations',
      'business-development',
      'partnerships-growth',
    ]) {
      expect(getAgentIdsForRole(role).length).toBeGreaterThan(0)
    }
  })

  it('keeps new bundled agents when normalising an established workspace', () => {
    const state = normalizePersistedState({
      agents: [{ ...CONFIG_AGENTS.find((agent) => agent.id === 'iris')!, department: undefined }],
      clients: [],
      missions: [],
      artifacts: [],
      conversations: [],
    })

    expect(state.agents.find((agent: { id: string }) => agent.id === 'iris')?.department).toBe('marketing')
    expect(state.agents.some((agent: { id: string }) => agent.id === 'ledger')).toBe(true)
    expect(state.agents.some((agent: { id: string }) => agent.id === 'harper')).toBe(true)
    expect(state.agents.some((agent: { id: string }) => agent.id === 'orion')).toBe(true)
  })

  it('upgrades only the original bundled specialist prompts and preserves custom ones', () => {
    const originalLedgerPrompt = 'You are Ledger, the Financial Controller. Turn financial inputs into accurate, decision-ready reporting. State assumptions, reconcile totals, flag missing evidence, and never invent accounting entries, statutory advice, tax treatment, or compliance confirmation. Present reconciliations, variance explanations, controls, and follow-up actions in a form a finance leader can review.'
    const upgraded = normalizePersistedState({ agents: [{ ...CONFIG_AGENTS.find((agent) => agent.id === 'ledger')!, systemPrompt: originalLedgerPrompt, metadata: { department: 'accounting-finance' } }] })
    expect(upgraded.agents.find((agent: { id: string }) => agent.id === 'ledger')?.systemPrompt).toContain('Operating method:')

    const custom = normalizePersistedState({ agents: [{ ...CONFIG_AGENTS.find((agent) => agent.id === 'ledger')!, systemPrompt: 'My bespoke controller instructions.', metadata: { department: 'accounting-finance' } }] })
    expect(custom.agents.find((agent: { id: string }) => agent.id === 'ledger')?.systemPrompt).toBe('My bespoke controller instructions.')
  })

  it('has executable pipeline roles for the new departments', () => {
    const pipelineIds = ['finance-operations', 'people-operations', 'business-development']
    for (const pipelineId of pipelineIds) {
      const pipeline = pipelinesConfig.pipelines.find((item) => item.id === pipelineId)
      expect(pipeline).toBeDefined()
      for (const activity of pipeline?.phases.flatMap((phase) => phase.activities) || []) {
        expect(getAgentIdsForRole(activity.assignedRole).length).toBeGreaterThan(0)
      }
    }
  })

  it('loads the specialist skills referenced by the new agents', async () => {
    const skills = await loadSkillMap()
    for (const agent of CONFIG_AGENTS.filter((item) => item.department !== 'marketing')) {
      for (const skillId of agent.skills) {
        expect(skills.has(skillId)).toBe(true)
      }
    }
  })

  it('ships substantial role instructions for every new department specialist', () => {
    for (const agent of CONFIG_AGENTS.filter((item) => item.department !== 'marketing')) {
      expect(agent.systemPrompt.length).toBeGreaterThan(1200)
      expect(agent.systemPrompt).toContain('Operating method:')
      expect(agent.systemPrompt).toContain('Quality standards:')
      expect(agent.systemPrompt).toContain('Collaboration and boundaries:')
    }
  })
})
