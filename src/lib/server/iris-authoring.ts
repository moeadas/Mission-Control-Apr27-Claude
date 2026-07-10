/**
 * Iris-assisted authoring (Batch D)
 *
 * Helpers for the `/api/iris/create-{agent,pipeline,skill}` endpoints.
 * Each helper:
 *   1. Asks the configured LLM (via generateText) to draft a structured JSON
 *      payload from the user's natural-language brief.
 *   2. Validates the draft against a minimal schema.
 *   3. Persists the entity into the caller's tenant.
 *
 * The user can then refine the generated draft through the regular CRUD UI.
 * The LLM is acting as a scaffolding assistant — not a one-shot oracle.
 */
import { v4 as uuid } from 'uuid'

import { generateText } from '@/lib/server/ai'
import { sanitizePromptValue } from '@/lib/server/prompt-safety'
import { normalizeProviderSettings, resolveTaskRuntime } from '@/lib/provider-settings'
import type { ProviderSettings } from '@/lib/types'
import { getDb } from '@/lib/db/client'

interface AuthoringInput {
  brief: string
  tenantId: string
  providerSettings: ProviderSettings | undefined
  geminiApiKey?: string
  anthropicApiKey?: string
  openAiApiKey?: string
  openAiBaseUrl?: string
  ollamaBaseUrl?: string
  ollamaApiKey?: string
}

function extractJsonObject(raw: string): any {
  const cleaned = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
  const first = cleaned.indexOf('{')
  const last = cleaned.lastIndexOf('}')
  if (first < 0 || last <= first) throw new Error('LLM did not return a JSON object')
  return JSON.parse(cleaned.slice(first, last + 1))
}

function buildRuntime(input: AuthoringInput) {
  const settings = normalizeProviderSettings(input.providerSettings)
  return resolveTaskRuntime({ settings, deliverableType: 'general-task' })
}

async function generateStructured(prompt: string, input: AuthoringInput): Promise<any> {
  const runtime = buildRuntime(input)
  const raw = await generateText({
    provider: runtime.provider,
    model: runtime.model,
    temperature: 0.4,
    maxTokens: 2048,
    messages: [
      {
        role: 'system',
        content: 'You are a structured-data drafting assistant. Return ONLY valid JSON. No prose, no markdown fences.',
      },
      { role: 'user', content: prompt },
    ],
    ollamaBaseUrl: input.ollamaBaseUrl,
    ollamaApiKey: input.ollamaApiKey,
    geminiApiKey: input.geminiApiKey,
    anthropicApiKey: input.anthropicApiKey,
    openAiApiKey: input.openAiApiKey,
    openAiBaseUrl: input.openAiBaseUrl,
  })
  return extractJsonObject(raw)
}

/* ───────────────────────── AGENT AUTHORING ───────────────────────── */

export async function draftAgentFromBrief(input: AuthoringInput): Promise<any> {
  const prompt = [
    `The user wants to add a new AI employee to their virtual company. Brief:`,
    sanitizePromptValue(input.brief),
    '',
    'Return JSON with this exact shape:',
    '{',
    '  "name": "human-friendly name",',
    '  "role": "short job-title style role",',
    '  "division": "one-word department label",',
    '  "specialty": "one-line specialty",',
    '  "skills": ["skill-id-1", "skill-id-2"],   // kebab-case IDs the team already has',
    '  "tools": ["web-search", "document"],     // optional tool labels',
    '  "systemPrompt": "Multi-paragraph system prompt that captures personality, decision principles, voice, and rules.",',
    '  "color": "#hex",',
    '  "accentColor": "blue|cyan|purple|orange|pink|yellow|green",',
    '  "temperature": 0.4',
    '}',
  ].join('\n')
  return generateStructured(prompt, input)
}

export async function persistDraftedAgent(
  tenantId: string,
  draft: any,
  authorUserId: string
): Promise<{ id: string }> {
  const db = getDb()
  const id = `${(draft.name || 'agent').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24) || 'agent'}-${uuid().slice(0, 6)}`

  await db`
    INSERT INTO agents (
      id, agency_id, name, role, division, specialty, status,
      bio, system_prompt, provider, model, temperature, max_tokens,
      color, accent_color, avatar, tools, skills, metadata
    ) VALUES (
      ${id},
      ${tenantId}::uuid,
      ${draft.name || 'New Agent'},
      ${draft.role || null},
      ${draft.division || null},
      ${draft.specialty || null},
      'idle',
      ${draft.bio || ''},
      ${draft.systemPrompt || ''},
      ${draft.provider || 'ollama'},
      ${draft.model || null},
      ${draft.temperature ?? 0.5},
      ${draft.maxTokens ?? 4096},
      ${draft.color || '#4f8ef7'},
      ${draft.accentColor || 'blue'},
      ${draft.avatar || 'bot-blue'},
      ${JSON.stringify(Array.isArray(draft.tools) ? draft.tools : [])}::jsonb,
      ${JSON.stringify(Array.isArray(draft.skills) ? draft.skills : [])}::jsonb,
      ${JSON.stringify({ createdByUserId: authorUserId, source: 'iris-authoring', createdAt: new Date().toISOString(), department: draft.department || 'marketing' })}::jsonb
    )
  `
  return { id }
}

/* ───────────────────────── PIPELINE AUTHORING ───────────────────────── */

export async function draftPipelineFromBrief(input: AuthoringInput): Promise<any> {
  const prompt = [
    `The user wants a new pipeline (a multi-phase, multi-activity workflow run by AI employees). Brief:`,
    sanitizePromptValue(input.brief),
    '',
    'Return JSON with this exact shape:',
    '{',
    '  "id": "kebab-case-pipeline-id",',
    '  "name": "Display name",',
    '  "description": "1-2 sentence pitch of what this pipeline produces",',
    '  "estimatedDuration": "human label, e.g. \\"~30 minutes\\" or \\"2-3 days\\"",',
    '  "phases": [',
    '    {',
    '      "id": "phase-1",',
    '      "name": "Phase name",',
    '      "activities": [',
    '        {',
    '          "id": "activity-1",',
    '          "name": "Activity name",',
    '          "description": "What this activity does",',
    '          "assignedRole": "role label or agent id who should run it",',
    '          "checklist": ["item 1", "item 2"],',
    '          "outputs": ["output-id-1"]',
    '        }',
    '      ]',
    '    }',
    '  ],',
    '  "clientProfileFields": [   // optional inputs the pipeline needs upfront',
    '    { "id": "field-id", "label": "Display label", "type": "text", "required": true }',
    '  ]',
    '}',
  ].join('\n')
  return generateStructured(prompt, input)
}

export async function persistDraftedPipeline(
  tenantId: string,
  draft: any,
  authorUserId: string
): Promise<{ id: string }> {
  const db = getDb()
  const baseId = String(draft.id || draft.name || 'pipeline')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32)
  const id = `${baseId || 'pipeline'}-${uuid().slice(0, 6)}`

  const definition = {
    ...draft,
    id,
    metadata: {
      createdByUserId: authorUserId,
      source: 'iris-authoring',
      createdAt: new Date().toISOString(),
    },
  }

  await db`
    INSERT INTO pipelines (id, agency_id, name, description, version, estimated_duration, definition, source)
    VALUES (
      ${id},
      ${tenantId}::uuid,
      ${draft.name || 'New Pipeline'},
      ${draft.description || ''},
      '1.0',
      ${draft.estimatedDuration || null},
      ${JSON.stringify(definition)}::jsonb,
      'iris-authoring'
    )
  `
  return { id }
}

/* ───────────────────────── SKILL AUTHORING ───────────────────────── */

export async function draftSkillFromBrief(input: AuthoringInput): Promise<any> {
  const prompt = [
    `The user wants a new skill — a reusable expertise module that AI employees apply during tasks. Brief:`,
    sanitizePromptValue(input.brief),
    '',
    'Return JSON with this exact shape:',
    '{',
    '  "id": "kebab-case-skill-id",',
    '  "name": "Display name",',
    '  "category": "category label (e.g. research, content, media, ops)",',
    '  "description": "1-2 sentence description of what this skill enables",',
    '  "difficulty": "beginner|intermediate|advanced",',
    '  "freedom": "high|medium|low",',
    '  "prompts": {',
    '    "en": {',
    '      "trigger": "When to use this skill",',
    '      "context": "Background the agent needs",',
    '      "instructions": "Step-by-step guidance",',
    '      "output_template": "Markdown template for the final output"',
    '    }',
    '  },',
    '  "checklist": ["pass-criterion 1", "pass-criterion 2"],',
    '  "workflow": {',
    '    "steps": [',
    '      { "step": 1, "name": "Step name", "action": "What to do", "verify": "Done-when criterion" }',
    '    ]',
    '  },',
    '  "tools": ["web-search", "analytics"],',
    '  "tags": ["tag1", "tag2"]',
    '}',
  ].join('\n')
  return generateStructured(prompt, input)
}

export async function persistDraftedSkill(
  tenantId: string,
  draft: any,
  authorUserId: string
): Promise<{ id: string }> {
  const db = getDb()
  const baseId = String(draft.id || draft.name || 'skill')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32)
  const id = `${baseId || 'skill'}-${uuid().slice(0, 6)}`

  const metadata = {
    createdByUserId: authorUserId,
    source: 'iris-authoring',
    createdAt: new Date().toISOString(),
    difficulty: draft.difficulty || 'intermediate',
    freedom: draft.freedom || 'medium',
    tags: Array.isArray(draft.tags) ? draft.tags : [],
    tools: Array.isArray(draft.tools) ? draft.tools : [],
    workflow: draft.workflow || { steps: [] },
  }

  await db`
    INSERT INTO skills (id, agency_id, name, category, description, prompts, checklist, examples, metadata, source)
    VALUES (
      ${id},
      ${tenantId}::uuid,
      ${draft.name || 'New Skill'},
      ${draft.category || 'general'},
      ${draft.description || ''},
      ${JSON.stringify(draft.prompts || {})}::jsonb,
      ${JSON.stringify(Array.isArray(draft.checklist) ? draft.checklist : [])}::jsonb,
      ${JSON.stringify(Array.isArray(draft.examples) ? draft.examples : [])}::jsonb,
      ${JSON.stringify(metadata)}::jsonb,
      'iris-authoring'
    )
  `
  return { id }
}
