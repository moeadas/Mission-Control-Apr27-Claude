import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import { CONFIG_AGENTS } from '@/config/agents/generated'
import pipelinesConfig from '@/config/pipelines/pipelines.json'
import { getAgentIdsForRole, pickAgentForRole } from '@/lib/agent-roles'
import { buildTaskChannelingPlan } from '@/lib/server/task-channeling'
import { REQUIRED_TEMPLATE_IDS } from '@/lib/server/agent-templates'

const clonedAgents = CONFIG_AGENTS.map((agent) => ({
  id: `${agent.id}-tenant01`,
  name: agent.name,
  role: agent.role,
  specialty: agent.specialty,
  skills: agent.skills,
  metadata: { templateId: agent.id, department: agent.department },
}))

describe('runtime wiring', () => {
  it('resolves cloned tenant specialists instead of falling back to Iris', () => {
    const plan = buildTaskChannelingPlan({
      request: 'Write an SEO blog article about horse genetics',
      deliverableType: 'blog-article',
      agents: clonedAgents,
      skillCategories: [],
      pipeline: null,
    })

    expect(plan.leadAgentId).toBe('echo-tenant01')
    expect(plan.collaboratorAgentIds).toContain('atlas-tenant01')
    expect(plan.collaboratorAgentIds).toContain('maya-tenant01')
    expect(plan.assignedAgentIds).toContain('iris-tenant01')
    expect(plan.assignedAgentIds).not.toContain('iris')
  })

  it('resolves both role labels and direct template ids against cloned agents', () => {
    expect(pickAgentForRole(clonedAgents, 'financial-controller')?.id).toBe('ledger-tenant01')
    expect(pickAgentForRole(clonedAgents, 'vera')?.id).toBe('vera-tenant01')
  })

  it('seeds the complete bundled roster for every new tenant', () => {
    expect(new Set(REQUIRED_TEMPLATE_IDS)).toEqual(new Set(CONFIG_AGENTS.map((agent) => agent.id)))
  })

  it('maps every bundled pipeline activity to an executable role', () => {
    for (const pipeline of pipelinesConfig.pipelines) {
      for (const phase of pipeline.phases || []) {
        for (const activity of phase.activities || []) {
          expect(
            getAgentIdsForRole(activity.assignedRole).length,
            `${pipeline.id}/${activity.id} has unmapped role ${activity.assignedRole}`
          ).toBeGreaterThan(0)
        }
      }
    }
  })

  it('declares specialized pipelines as dedicated runtime contracts', () => {
    for (const id of ['content-calendar', 'ad-creative', 'seo-audit']) {
      const pipeline = pipelinesConfig.pipelines.find((entry) => entry.id === id) as any
      expect(pipeline.executionMode).toBe('dedicated-engine')
      expect(pipeline.runtimeEngine).toMatch(/-engine$/)
    }
  })

  it('forces pipeline and skill guidance into dedicated content-calendar model calls', () => {
    const source = readFileSync('src/lib/server/content-calendar-engine.ts', 'utf8')
    expect(source).toContain('PIPELINE CONTRACT:')
    expect(source).toContain('SKILLS IN FORCE (execute these instructions, not merely cite them)')
    expect(source).toContain("activityId: 'generate-ideas'")
    expect(source).toContain("activityId: 'draft-posts'")
    expect(source).toContain("activityId: 'assemble-calendar'")
  })

  it('turns pipeline activity roles into tenant-cloned collaborators', () => {
    const pipeline = pipelinesConfig.pipelines.find((entry) => entry.id === 'blog-post-writing') as any
    const plan = buildTaskChannelingPlan({
      request: 'Write an article about whole genome sequencing',
      deliverableType: 'blog-article',
      agents: clonedAgents,
      skillCategories: [],
      pipeline,
    })

    expect(plan.assignedAgentIds).toContain('echo-tenant01')
    expect(plan.assignedAgentIds).toContain('atlas-tenant01')
    expect(plan.assignedAgentIds).not.toContain('atlas')
  })

  it('keeps tenant catalog keys and the execution queue in the boot schema', () => {
    const schema = readFileSync('docker/init.sql', 'utf8')
    expect(schema).toContain('PRIMARY KEY (agency_id, id)')
    expect(schema).toContain('FOREIGN KEY (agency_id, pipeline_id)')
    expect(schema).toContain('CREATE TABLE IF NOT EXISTS execution_jobs')
    const queue = readFileSync('src/lib/server/execution-queue.ts', 'utf8')
    expect(queue).toContain('id = ${taskId} AND agency_id = ${auth.tenantId}::uuid')
  })

  it('does not hard-code the default agency in skill APIs', () => {
    for (const file of [
      'src/app/api/skills/route.ts',
      'src/app/api/skills/[id]/route.ts',
      'src/app/api/skills/import/route.ts',
    ]) {
      expect(readFileSync(file, 'utf8')).not.toContain("slug = 'default-agency'")
    }
  })

  it('maps explicit finance pipeline runs to finance operations', () => {
    const source = readFileSync('src/app/api/pipelines/run/route.ts', 'utf8')
    expect(source).toContain("'finance-operations': 'financial-operations'")
    expect(source).toContain('matchesAgentTemplate(agent, spec.defaultLead')
    expect(source).toContain('await ensureBundledPipelines(agencyId)')
  })
})
