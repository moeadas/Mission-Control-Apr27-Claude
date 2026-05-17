/**
 * Agent templates registry (Batch D)
 *
 * The 10 agents under `src/config/agents/` are TEMPLATES, not the default
 * roster for every tenant. Each tenant builds their own virtual company:
 *   • New tenants are auto-seeded with Iris only (the orchestrator).
 *   • Users can clone any subset of templates into their tenant via
 *     `POST /api/agent-templates/clone`, or start blank.
 *   • Users can also ask Iris to design a brand-new agent via
 *     `POST /api/iris/create-agent`.
 *
 * This module is the canonical source for template metadata and exposes the
 * cloning primitives reused by the API routes + tenant-creation flow.
 */
import { v4 as uuid } from 'uuid'

import type { Agent } from '@/lib/types'
import { CONFIG_AGENTS, AGENT_ARCHITECTURE_BUNDLES } from '@/config/agents/generated'
import { getDb } from '@/lib/db/client'

export interface AgentTemplate {
  id: string
  name: string
  role: string
  division?: string
  specialty?: string
  color?: string
  accentColor?: string
  avatar?: string | null
  skills: string[]
  tools: string[]
  bio?: string
  systemPromptPreview: string
}

/** Iris is always seeded — every tenant needs the orchestrator agent. */
export const REQUIRED_TEMPLATE_IDS = ['iris'] as const

/**
 * Recognise the orchestrator agent in a tenant's roster regardless of how its
 * id was generated. Use this anywhere code needs to find "the tenant's Iris":
 *   • Legacy single-tenant deployments stored Iris with literal id 'iris'.
 *   • Multi-tenant clones use `iris-<tenant-suffix>` so the global agents.id
 *     primary key stays unique.
 *   • Iris-authoring drafts always set metadata.templateId = 'iris' if the
 *     user clones from the orchestrator template.
 */
export function isOrchestratorAgent(agent: { id?: string | null; metadata?: any }): boolean {
  if (!agent) return false
  const meta = (agent.metadata || {}) as any
  if (meta.templateId === 'iris') return true
  if (typeof agent.id === 'string') {
    if (agent.id === 'iris') return true
    if (agent.id.startsWith('iris-')) return true
  }
  return false
}

/**
 * Find a tenant's clone of a given template (e.g. "echo", "lyra", "atlas")
 * regardless of how the runtime id was generated. Used by AI engines that
 * route work to specific specialist agents — they look up by template name
 * rather than literal id so the same engine works for legacy tenants (where
 * id === templateId) and new tenants (where id === `${templateId}-<suffix>`).
 *
 * Lookup precedence:
 *   1. agent.metadata.templateId === templateId  (canonical for new clones)
 *   2. agent.id === templateId                   (legacy single-tenant rows)
 *   3. agent.id starts with `${templateId}-`     (fallback for clones missing metadata)
 */
export function findAgentByTemplate<T extends { id?: string | null; metadata?: any }>(
  agents: Iterable<T> | undefined,
  templateId: string
): T | undefined {
  if (!agents) return undefined
  // First pass: explicit metadata match (most reliable for new clones)
  for (const agent of agents) {
    const meta = (agent?.metadata || {}) as any
    if (meta.templateId === templateId) return agent
  }
  // Second pass: literal id match (legacy)
  for (const agent of agents) {
    if (agent?.id === templateId) return agent
  }
  // Third pass: prefix match (clones without metadata)
  const prefix = `${templateId}-`
  for (const agent of agents) {
    if (typeof agent?.id === 'string' && agent.id.startsWith(prefix)) return agent
  }
  return undefined
}

function previewSystemPrompt(systemPrompt: string | undefined, max = 320): string {
  const trimmed = (systemPrompt || '').trim()
  if (trimmed.length <= max) return trimmed
  return trimmed.slice(0, max - 1) + '…'
}

export function listAgentTemplates(): AgentTemplate[] {
  return CONFIG_AGENTS.map((agent) => ({
    id: agent.id,
    name: agent.name,
    role: agent.role || '',
    division: agent.division,
    specialty: agent.specialty,
    color: agent.color,
    accentColor: agent.accentColor,
    avatar: agent.avatar,
    skills: Array.isArray(agent.skills) ? [...agent.skills] : [],
    tools: Array.isArray(agent.tools) ? [...agent.tools] : [],
    bio: agent.bio,
    systemPromptPreview: previewSystemPrompt(agent.systemPrompt),
  }))
}

export function getAgentTemplate(id: string): Agent | null {
  // AGENT_ARCHITECTURE_BUNDLES is a Record<string, AgentArchitectureBundle> keyed by id.
  const bundle = AGENT_ARCHITECTURE_BUNDLES[id]
  return bundle ? bundle.agent : null
}

/**
 * Insert template-based agents into a tenant's `agents` table. Returns the
 * canonical inserted-row ids. Skips templates that already exist in the
 * tenant (by template id) — re-cloning is a no-op.
 *
 * Id strategy: `agents.id` is a GLOBAL primary key, so we namespace every
 * inserted row with `<templateId>-<short-uuid>`. The single exception is the
 * very first tenant that ever cloned Iris (legacy `id='iris'` row) — that's
 * preserved as-is by the upstream check. Use `isOrchestratorAgent()` rather
 * than hardcoded `id === 'iris'` comparisons throughout the codebase.
 */
export async function cloneAgentTemplates(
  tenantId: string,
  templateIds: string[]
): Promise<{ insertedIds: string[]; skipped: string[] }> {
  const db = getDb()
  const insertedIds: string[] = []
  const skipped: string[] = []

  // Load the agents that already exist in this tenant so we don't double-seed.
  const existing = await db`
    SELECT id, metadata FROM agents WHERE agency_id = ${tenantId}::uuid
  `
  const existingTemplateIds = new Set<string>()
  for (const row of existing) {
    const meta = (row.metadata as any) || {}
    if (meta.templateId) existingTemplateIds.add(String(meta.templateId))
    // also treat exact-id matches as already-cloned (handles legacy "iris" id reuse)
    existingTemplateIds.add(String(row.id))
  }

  for (const templateId of templateIds) {
    if (existingTemplateIds.has(templateId)) {
      skipped.push(templateId)
      continue
    }
    const template = getAgentTemplate(templateId)
    if (!template) {
      skipped.push(templateId)
      continue
    }

    // Every cloned agent gets a tenant-unique id so the global agents.id
    // primary key never collides. The orchestrator is found by
    // isOrchestratorAgent(), which recognises metadata.templateId='iris'.
    const newId = `${templateId}-${uuid().slice(0, 8)}`

    const metadata = {
      templateId,
      clonedFrom: 'config-template',
      clonedAt: new Date().toISOString(),
    }

    await db`
      INSERT INTO agents (
        id, agency_id, name, role, division, specialty, unit, status,
        bio, methodology, system_prompt,
        provider, model, temperature, max_tokens,
        color, accent_color, avatar, photo_url,
        tools, skills, responsibilities, primary_outputs, position, metadata
      ) VALUES (
        ${newId},
        ${tenantId}::uuid,
        ${template.name},
        ${template.role || null},
        ${template.division || null},
        ${template.specialty || null},
        ${template.unit || null},
        'idle',
        ${template.bio || ''},
        ${template.methodology || ''},
        ${template.systemPrompt || ''},
        ${template.provider || 'ollama'},
        ${template.model || null},
        ${template.temperature ?? 0.5},
        ${template.maxTokens ?? 4096},
        ${template.color || '#4f8ef7'},
        ${template.accentColor || 'blue'},
        ${template.avatar || 'bot-blue'},
        ${template.photoUrl || null},
        ${JSON.stringify(template.tools || [])}::jsonb,
        ${JSON.stringify(template.skills || [])}::jsonb,
        ${JSON.stringify(template.responsibilities || [])}::jsonb,
        ${JSON.stringify(template.primaryOutputs || [])}::jsonb,
        ${JSON.stringify(template.position || {})}::jsonb,
        ${JSON.stringify(metadata)}::jsonb
      )
      ON CONFLICT (id) DO NOTHING
    `
    insertedIds.push(newId)
  }

  return { insertedIds, skipped }
}

/** Seed the mandatory agents (currently: just Iris) for a freshly-created tenant. */
export async function seedTenantRequiredAgents(tenantId: string) {
  return cloneAgentTemplates(tenantId, [...REQUIRED_TEMPLATE_IDS])
}
