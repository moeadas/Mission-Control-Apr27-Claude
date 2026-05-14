import { NextRequest, NextResponse } from 'next/server'
import {
  buildExecutionPrompt,
  generateText,
  generateTextWithUsage,
  getFriendlyProviderError,
  inferDeliverableType,
  inferRoutingContext,
  ProviderError,
  inferPipeline,
  getServerDeliverableSpec,
} from '@/lib/server/ai'
import { logTokenUsage } from '@/lib/server/token-logger'
import { isConversationalMessage } from '@/lib/intents/intent-classifier'
import { buildTaskExecutionPlan } from '@/lib/task-output'
import { executeAutonomousTask } from '@/lib/server/autonomous-task'
import { buildArtifactHtml } from '@/lib/output-html'
import { getDb } from '@/lib/db/client'
import { resolveAuthContextFromToken } from '@/lib/auth/server'
import { normalizeProviderSettings, resolveFallbackRuntime, resolveTaskRuntime, shouldRunCompareMode } from '@/lib/provider-settings'
import { sanitizePromptProfile, sanitizePromptValue } from '@/lib/server/prompt-safety'
import { validateDeliverableQuality } from '@/lib/output-quality'
import { insertTaskRun, upsertWorkflowExecutionState } from '@/lib/server/task-execution'
import { loadConfigSkillCategories, mergeDbSkillsWithConfig } from '@/lib/server/skills-catalog'
import { buildTaskChannelingPlan } from '@/lib/server/task-channeling'
import { extractClientFieldsFromText } from '@/app/api/iris/parse-client-brief/route'

function detectClientBriefIntent(content: string): boolean {
  // Explicit intent signals
  const explicitPatterns = [
    /\b(add|onboard|create|new)\s+(a\s+)?(new\s+)?client\b/i,
    /\bclient\s+brief\b/i,
    /\bhere'?s?\s+(the\s+)?(brief|info|details)\s+(for|about)\b/i,
    /\bclient\s+onboarding\b/i,
    /\bwant\s+to\s+(add|create|onboard)\b.*\bclient\b/i,
    /\b(brand|company)\s+brief\b/i,
    /\bnew\s+(brand|company|client)\s+(info|details|overview|profile)\b/i,
  ]
  if (explicitPatterns.some((p) => p.test(content))) return true

  // Implicit: long pasted text containing multiple brief-like signals
  if (content.length > 400) {
    const lower = content.toLowerCase()
    const briefKeywords = ['mission', 'vision', 'brand', 'industry', 'audience', 'product', 'service', 'competitor', 'tone', 'value proposition', 'target market', 'usp', 'unique selling']
    const matchCount = briefKeywords.filter((kw) => lower.includes(kw)).length
    if (matchCount >= 4) return true
  }

  return false
}

// DEBUG: Log incoming requests
function debugLog(label: string, data: any) {
  if (process.env.NODE_ENV === 'development') {
    console.log(`[CHAT DEBUG] ${label}:`, JSON.stringify(data, null, 2).slice(0, 500))
  }
}

function enforceArtifactTruth(responseText: string, artifacts: any[]) {
  if (/^#\s+.+/m.test(responseText) || /^##\s+.+/m.test(responseText)) return responseText

  const lower = responseText.toLowerCase()
  const claimsDelivery =
    lower.includes('delivered') ||
    lower.includes('shared drive') ||
    lower.includes('client inbox') ||
    lower.includes('.docx') ||
    lower.includes('.pdf') ||
    lower.includes('.xlsx') ||
    lower.includes('saved in') ||
    lower.includes('file:')

  if (!claimsDelivery) return responseText

  if (!artifacts?.length) return 'No completed or delivered file exists in the app yet. I can draft the output here and save it as an internal artifact, but I should not claim it has been exported, uploaded, or sent.'

  const hasDeliveredArtifact = artifacts.some((artifact) => artifact.status === 'delivered' || artifact.path || artifact.link)
  if (hasDeliveredArtifact) return responseText

  return 'No completed or delivered file exists in the app yet. I can draft the output here and save it as an internal artifact, but I should not claim it has been exported, uploaded, or sent.'
}

function getBearerToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || ''
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null
  return authHeader.slice(7).trim()
}

function enforceDeliverableDraft(responseText: string, deliverableType: string) {
  if (deliverableType === 'status-report') return responseText

  const lower = responseText.toLowerCase()
  const looksLikeCoordinationOnly =
    lower.includes('task routed to') ||
    lower.includes('lead agent') ||
    lower.includes('delivery:') ||
    lower.includes('status: in progress') ||
    lower.includes('next steps:')

  if (!looksLikeCoordinationOnly) return responseText

  return 'I have not drafted the deliverable yet. I should respond with the actual draft content and save it as an internal output artifact instead of only returning routing/status language.'
}

function isShortFormCopyRequest(request?: string) {
  if (!request) return false
  return /\b(whatsapp description|whatsapp bio|bio|profile description|short description|company description|brand description|tagline|one-liner)\b/i.test(
    request
  )
}

function looksLikeUsableDeliverable(
  responseText: string,
  deliverableType?: string,
  request?: string
) {
  const trimmed = responseText.trim()
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
  if (
    (deliverableType === 'campaign-copy' || deliverableType === 'short-form-copy') &&
    isShortFormCopyRequest(request)
  ) {
    if (/^#\s+.+/m.test(trimmed) || /^##\s+.+/m.test(trimmed)) return trimmed.length >= 40
    return trimmed.length >= 24
  }

  return trimmed.length >= 80
}

async function getDefaultAgencyId(): Promise<string | null> {
  try {
    const db = getDb()
    const rows = await db`SELECT id FROM agencies WHERE slug = 'default-agency' LIMIT 1`
    return rows[0]?.id ?? null
  } catch {
    return null
  }
}

async function waitForTaskPersistence(taskId: string, attempts = 8, delayMs = 250) {
  if (!taskId) return false

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const db = getDb()
      const rows = await db`SELECT id FROM tasks WHERE id = ${taskId} LIMIT 1`
      if (rows[0]?.id) return true
    } catch {
      // ignore transient errors during wait
    }
    if (attempt < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  return false
}

// Load pipelines server-side
async function loadPipelines() {
  try {
    const agencyId = await getDefaultAgencyId()
    if (agencyId) {
      const db = getDb()
      const rows = await db`
        SELECT definition FROM pipelines
        WHERE agency_id = ${agencyId}
        ORDER BY name ASC
      `
      if (rows.length) return rows.map((row: any) => row.definition || {}).filter(Boolean)
    }
  } catch {
    // Fall through to config fallback.
  }

  try {
    const modules = await import('@/config/pipelines/pipelines.json')
    return modules.default.pipelines
  } catch {
    return []
  }
}

// Load skills server-side
async function loadSkills() {
  try {
    const agencyId = await getDefaultAgencyId()
    if (agencyId) {
      const db = getDb()
      const rows = await db`
        SELECT * FROM skills
        WHERE agency_id = ${agencyId}
        ORDER BY category ASC, name ASC
      `
      if (rows.length) return mergeDbSkillsWithConfig(rows)
    }
  } catch {
    // Fall through to config fallback.
  }

  try {
    const cats = await loadConfigSkillCategories()
    if (!cats?.length) {
      console.warn('[loadSkills] Config skill categories returned empty — agents will use synthetic skill stubs.')
    }
    return cats || []
  } catch (err) {
    console.error('[loadSkills] Failed to load config skill categories:', err)
    return []
  }
}

export async function POST(req: NextRequest) {
  let requestBody: any = null
  try {
    const auth = await resolveAuthContextFromToken(getBearerToken(req))
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    requestBody = await req.json()
    const {
      provider = 'ollama',
      model = 'minimax-m2.7:cloud',
      temperature = 0.7,
      maxTokens = 4096,
      messages,
      systemPrompt,
      providerSettings,
      agentMemories = {},
      artifacts = [],
      agents = [],
      clients = [],
      missions = [],
      currentClientId,
      currentCampaignId,
      missionId,
    } = requestBody

    let canPersistMissionExecution = false
    if (missionId) {
      try {
        canPersistMissionExecution = await waitForTaskPersistence(missionId)
      } catch (error) {
        console.warn('[CHAT] Task execution persistence skipped during lookup:', error)
      }
    }


    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 })
    }

    const latestUser = [...messages].reverse().find((message) => message.role === 'user')
    const userContent = latestUser?.content || ''
    const conversational = isConversationalMessage(userContent)
    const deliverableType = conversational ? 'status-report' : inferDeliverableType(userContent)
    const normalizedProviderSettings = normalizeProviderSettings(auth.providerSettings || providerSettings)

    // Collect all provider secrets from the auth-resolved settings once,
    // then pass them uniformly to every generateText / executeAutonomousTask call.
    const providerKeys = {
      ollamaBaseUrl: normalizedProviderSettings?.ollama?.baseUrl,
      ollamaContextWindow: normalizedProviderSettings?.ollama?.contextWindow,
      ollamaApiKey: normalizedProviderSettings?.ollama?.apiKey,
      geminiApiKey: normalizedProviderSettings?.gemini?.apiKey,
      anthropicApiKey: normalizedProviderSettings?.anthropic?.apiKey,
      openAiApiKey: normalizedProviderSettings?.openai?.apiKey,
      openAiBaseUrl: normalizedProviderSettings?.openai?.baseUrl,
    }

    const selectedRuntime = resolveTaskRuntime({
      settings: normalizedProviderSettings,
      deliverableType,
      requestedProvider: provider,
      requestedModel: model,
    })
    let actualProvider = selectedRuntime.provider
    let actualModel = selectedRuntime.model

    // Detect client brief intent and kick off extraction in parallel with AI response
    type ClientBriefAction = { type: 'CREATE_CLIENT'; draft: Record<string, any>; missingFields: string[] }
    let clientBriefActionPromise: Promise<ClientBriefAction | null> | null = null
    if (detectClientBriefIntent(userContent)) {
      const briefRuntime = resolveTaskRuntime({
        settings: normalizedProviderSettings,
        deliverableType: 'status-report',
        requestedProvider: 'anthropic',
        requestedModel: '',
      })
      clientBriefActionPromise = extractClientFieldsFromText(userContent, providerKeys, briefRuntime)
        .then((result) => ({ type: 'CREATE_CLIENT' as const, ...result }))
        .catch((err) => {
          console.warn('[CHAT] Client brief extraction failed:', err?.message || err)
          return null
        })
    }

    debugLog('Provider payload', {
      requestedProvider: provider,
      requestedModel: model,
      selectedProvider: selectedRuntime.provider,
      selectedModel: selectedRuntime.model,
      hasProviderSettings: Boolean(providerSettings),
      conversational,
    })

    if (actualProvider === 'ollama' && normalizedProviderSettings?.ollama?.enabled === false) {
      console.log('[CHAT ERROR] Ollama is disabled in providerSettings')
      return NextResponse.json({ error: 'Ollama is unavailable right now. Make sure your local Ollama server is running.' }, { status: 503 })
    }

    if (conversational) {
      const agentRoster = agents.slice(0, 10).map((agent: any) => `${agent.name} (${agent.role})`).join(', ')
      const leanSystemPrompt = [
        `ROLE: You are Iris, Chief of Staff at Mission Control — a virtual creative and digital media agency.`,
        `PURPOSE: You help the agency owner manage their team, answer questions, and kick off tasks.`,
        '',
        `TEAM: ${agentRoster}.`,
        clients.length ? `CLIENTS: ${clients.map((client: any) => client.name).join(', ')}.` : '',
        missions.length ? `ACTIVE WORK: ${missions.slice(0, 5).map((mission: any) => mission.title).join(', ')}.` : '',
        '',
        `RESPONSE FORMAT: Short, warm, professional. 1-3 sentences for simple questions. Use markdown for lists.`,
        '',
        `RULES:`,
        `1. Answer questions about the agency, team, clients, and capabilities directly.`,
        `2. Never promise to route to or check with another agent in chat mode.`,
        `3. When the user wants a deliverable, ask them to give the specific request and then execute it.`,
        `4. For status questions, answer honestly based on what you know.`,
      ]
        .filter(Boolean)
        .join('\n')

      const recentMessages = messages.slice(-6)

      try {
        const responseText = await generateText({
          provider: actualProvider,
          model: actualModel,
          temperature,
          maxTokens: Math.min(maxTokens, 768),
          messages: [
            { role: 'system', content: leanSystemPrompt },
            ...recentMessages.map((message: any) => ({ role: message.role, content: message.content })),
          ],
          ...providerKeys,
        })

        if (!responseText?.trim()) {
          return NextResponse.json(
            { error: 'The model returned an empty response. Try rephrasing or starting a new chat.' },
            { status: 503 }
          )
        }

        const clientBriefAction = clientBriefActionPromise ? await clientBriefActionPromise : null
        return NextResponse.json({
          response: responseText,
          meta: {
            routedAgentId: 'iris',
            leadAgentId: 'iris',
            collaboratorAgentIds: [],
            assignedAgentIds: ['iris'],
            clientId: null,
            campaignId: null,
            deliverableType: 'status-report',
            pipelineId: null,
            pipelineName: null,
            qualityChecklist: [],
            handoffNotes: '',
            executionSteps: [],
            quality: null,
            executionPrompt: '',
            renderedHtml: null,
            provider: actualProvider,
            model: actualModel,
            fallbackUsed: false,
            conversational: true,
            action: clientBriefAction,
          },
        })
      } catch (err: any) {
        console.error('[CHAT] Conversational error:', err?.message || err)
        const status =
          err instanceof ProviderError
            ? err.status && Number.isFinite(err.status)
              ? err.status
              : 503
            : 500
        return NextResponse.json({ error: getFriendlyProviderError(err) }, { status })
      }
    }

    // Load pipeline and skill context
    const [pipelines, skillCategories] = await Promise.all([loadPipelines(), loadSkills()])

    const routing = inferRoutingContext({
      content: userContent,
      clientHints: clients,
      agents,
    })

    // Infer which pipeline matches this request
    const pipelineHint = inferPipeline(userContent, pipelines)
    const deliverableSpec = getServerDeliverableSpec(deliverableType)
    const resolvedPipelineId = pipelineHint?.id || routing.pipelineId || deliverableSpec.pipelineId || null
    const pipelineDefinition = resolvedPipelineId
      ? pipelines.find((pipeline: any) => pipeline.id === resolvedPipelineId) || null
      : null
    const routedAgent = agents.find((agent: any) => agent.id === routing.routedAgentId)
    const scopedClient =
      clients.find((client: any) => client.id === routing.clientId || client.id === currentClientId) ||
      clients.find((client: any) => userContent.toLowerCase().includes(client.name.toLowerCase()))

    const clientContext = scopedClient
      ? [
          `Name: ${sanitizePromptValue(scopedClient.name)}`,
          `Industry: ${sanitizePromptValue(scopedClient.industry)}`,
          scopedClient.description ? `Overview: ${sanitizePromptValue(scopedClient.description)}` : '',
          scopedClient.missionStatement ? `Mission: ${sanitizePromptValue(scopedClient.missionStatement)}` : '',
          scopedClient.brandPromise ? `Brand promise: ${sanitizePromptValue(scopedClient.brandPromise)}` : '',
          scopedClient.targetAudiences ? `Audience: ${sanitizePromptValue(scopedClient.targetAudiences)}` : '',
          scopedClient.productsAndServices ? `Products: ${sanitizePromptValue(scopedClient.productsAndServices)}` : '',
          scopedClient.usp ? `USP: ${sanitizePromptValue(scopedClient.usp)}` : '',
          scopedClient.keyMessages ? `Key messages: ${sanitizePromptValue(scopedClient.keyMessages)}` : '',
          scopedClient.toneOfVoice ? `Tone of voice: ${sanitizePromptValue(scopedClient.toneOfVoice)}` : '',
          Array.isArray(scopedClient.brandKit?.colors) && scopedClient.brandKit.colors.length
            ? `Brand colors: ${sanitizePromptValue(scopedClient.brandKit.colors.join(', '))}`
            : '',
          Array.isArray(scopedClient.brandKit?.fonts) && scopedClient.brandKit.fonts.length
            ? `Brand fonts: ${sanitizePromptValue(scopedClient.brandKit.fonts.join(', '))}`
            : '',
          scopedClient.brandKit?.visualKeywords ? `Visual keywords: ${sanitizePromptValue(scopedClient.brandKit.visualKeywords)}` : '',
          scopedClient.brandKit?.lookAndFeel ? `Look and feel: ${sanitizePromptValue(scopedClient.brandKit.lookAndFeel)}` : '',
          scopedClient.brandKit?.photoStyle ? `Photo style: ${sanitizePromptValue(scopedClient.brandKit.photoStyle)}` : '',
          scopedClient.brandKit?.compositionRules ? `Composition rules: ${sanitizePromptValue(scopedClient.brandKit.compositionRules)}` : '',
          scopedClient.brandKit?.negativeRules ? `Negative rules: ${sanitizePromptValue(scopedClient.brandKit.negativeRules)}` : '',
          Array.isArray(scopedClient.brandKit?.logos) && scopedClient.brandKit.logos.length
            ? `Brand logos:\n${scopedClient.brandKit.logos.slice(0, 6).map((asset: any) => `- ${sanitizePromptValue(asset.title)} | ${sanitizePromptValue(asset.url)}`).join('\n')}`
            : '',
          Array.isArray(scopedClient.brandKit?.templates) && scopedClient.brandKit.templates.length
            ? `Brand templates:\n${scopedClient.brandKit.templates.slice(0, 8).map((asset: any) => `- ${sanitizePromptValue(asset.title)} | ${sanitizePromptValue(asset.url)}`).join('\n')}`
            : '',
          Array.isArray(scopedClient.brandKit?.referenceImages) && scopedClient.brandKit.referenceImages.length
            ? `Reference images:\n${scopedClient.brandKit.referenceImages.slice(0, 8).map((asset: any) => `- ${sanitizePromptValue(asset.title)} | ${sanitizePromptValue(asset.url)}`).join('\n')}`
            : '',
          scopedClient.strategicPriorities ? `Strategic priorities: ${sanitizePromptValue(scopedClient.strategicPriorities)}` : '',
          scopedClient.notes ? `Notes: ${sanitizePromptValue(scopedClient.notes)}` : '',
          Array.isArray(scopedClient.knowledgeAssets) && scopedClient.knowledgeAssets.length
            ? `Knowledge assets:\n${scopedClient.knowledgeAssets
                .slice(0, 8)
                .map(
                  (asset: any) =>
                    `- ${sanitizePromptValue(asset.title)} (${sanitizePromptValue(asset.type)})` +
                    `${asset.summary ? `: ${sanitizePromptValue(asset.summary)}` : ''}` +
                    `${asset.extractedInsights ? ` | Insights: ${sanitizePromptValue(asset.extractedInsights)}` : ''}`
                )
                .join('\n')}`
            : '',
        ]
          .filter(Boolean)
          .join('\n')
      : ''

    const clientProfile = scopedClient
      ? sanitizePromptProfile({
          brand_name: scopedClient.name,
          niche: scopedClient.industry,
          industry: scopedClient.industry,
          target_audience: scopedClient.targetAudiences,
          audience_demographics: scopedClient.targetAudiences,
          audience_psychographics: scopedClient.targetAudiences,
          product_service: scopedClient.productsAndServices,
          business_objectives: scopedClient.strategicPriorities,
          tone: scopedClient.toneOfVoice,
          brand_voice: scopedClient.toneOfVoice,
          campaign_theme: scopedClient.keyMessages,
          visual_direction: scopedClient.brandIdentityNotes,
          asset_specs: scopedClient.brandIdentityNotes,
          brand_colors: Array.isArray(scopedClient.brandKit?.colors) ? scopedClient.brandKit.colors.join(', ') : '',
          brand_fonts: Array.isArray(scopedClient.brandKit?.fonts) ? scopedClient.brandKit.fonts.join(', ') : '',
          visual_keywords: scopedClient.brandKit?.visualKeywords,
          look_and_feel: scopedClient.brandKit?.lookAndFeel,
          photo_style: scopedClient.brandKit?.photoStyle,
          composition_rules: scopedClient.brandKit?.compositionRules,
          negative_rules: scopedClient.brandKit?.negativeRules,
          logo_assets: Array.isArray(scopedClient.brandKit?.logos) ? scopedClient.brandKit.logos.map((asset: any) => asset.url).join(', ') : '',
          logo_asset_paths: Array.isArray(scopedClient.brandKit?.logos) ? scopedClient.brandKit.logos.map((asset: any) => asset.path || asset.url).join(', ') : '',
          template_assets: Array.isArray(scopedClient.brandKit?.templates) ? scopedClient.brandKit.templates.map((asset: any) => asset.url).join(', ') : '',
          template_asset_paths: Array.isArray(scopedClient.brandKit?.templates) ? scopedClient.brandKit.templates.map((asset: any) => asset.path || asset.url).join(', ') : '',
          reference_assets: Array.isArray(scopedClient.brandKit?.referenceImages) ? scopedClient.brandKit.referenceImages.map((asset: any) => asset.url).join(', ') : '',
          reference_asset_paths: Array.isArray(scopedClient.brandKit?.referenceImages) ? scopedClient.brandKit.referenceImages.map((asset: any) => asset.path || asset.url).join(', ') : '',
          competitive_landscape: scopedClient.competitiveLandscape,
          channel_strategy: scopedClient.strategicPriorities,
          pain_points: scopedClient.objectionHandling,
          key_dates: scopedClient.operationalDetails,
          posting_frequency: '3-4 posts per week',
          platforms: 'Instagram, LinkedIn',
          content_goal: 'Awareness and lead generation',
          campaign_duration: '30 days',
        })
      : undefined

    const executionPlan = buildTaskExecutionPlan({
      deliverableType,
      request: userContent,
      routedAgentId: routing.routedAgentId,
      pipelinePhases: pipelineHint?.phases,
    })
    const channelingPlan = buildTaskChannelingPlan({
      request: userContent,
      deliverableType,
      routedAgentId: executionPlan.leadAgentId || routing.routedAgentId,
      agents,
      skillCategories,
      pipeline: pipelineDefinition,
    })

    const executionPrompt = buildExecutionPrompt({
      userRequest: userContent,
      deliverableType,
      routedAgentName: agents.find((agent: any) => agent.id === executionPlan.leadAgentId)?.name || routedAgent?.name,
      routedAgentSpecialty: agents.find((agent: any) => agent.id === executionPlan.leadAgentId)?.specialty || routedAgent?.specialty,
      collaboratorAgents: channelingPlan.collaboratorAgentIds
        .map((agentId) => agents.find((agent: any) => agent.id === agentId))
        .filter(Boolean)
        .map((agent: any) => ({ name: agent.name, role: agent.role, specialty: agent.specialty })),
      clientName: scopedClient?.name,
      clientContext,
      clientIndustry: scopedClient?.industry,
      clientToneOfVoice: scopedClient?.toneOfVoice,
      clientTargetAudiences: scopedClient?.targetAudiences,
      clientBrandPromise: scopedClient?.brandPromise,
      clientKeyMessages: scopedClient?.keyMessages,
      pipelineName: pipelineDefinition?.name || pipelineHint?.name || undefined,
    })

    // Build pipeline context for Iris
    const pipelineContext = pipelineHint
      ? [
          '',
          `--- PIPELINE ROUTING ---`,
          `This request matches the "${pipelineDefinition?.name || pipelineHint.name}" pipeline (confidence: ${pipelineHint.confidence}).`,
          `Pipeline phases: ${(pipelineDefinition?.phases || pipelineHint.phases).map((p: any) => `"${typeof p === 'string' ? p : p.name}"`).join(' → ')}.`,
          `Estimated duration: ${pipelineHint.estimatedDuration}.`,
          `Client profile fields needed: ${pipelineHint.clientProfileFields.map((f: any) => f.label).join(', ') || 'none'}.`,
          ``,
          `To execute this pipeline, Iris should:`,
          `1. Confirm the client and collect any missing profile data`,
          `2. Route to the pipeline via /app/pipeline/${pipelineDefinition?.id || pipelineHint.id}`,
          `3. Assign agents to phases based on their roles (client-services → intake, copy → drafting, etc.)`,
        ].join('\n')
      : ''

    // Build skills context
    const skillsContext = skillCategories.length
      ? [
          '',
          `--- AVAILABLE SKILLS ---`,
          `The agency has ${skillCategories.reduce((sum: number, cat: any) => sum + cat.skills.length, 0)} skills across ${skillCategories.length} categories:`,
          ...skillCategories.map((cat: any) =>
            `  [${cat.name}]: ${cat.skills.map((s: any) => s.name).join(', ')}`
          ),
          ``,
          `When routing work, Iris can reference these skills by ID (e.g., "brand-strategy", "campaign-copywriting").`,
          `Skills assigned to agents are stored in the agent's "skills" array.`,
        ].join('\n')
      : ''

    // Build pipelines summary for Iris to pick from
    const pipelinesSummary = pipelines.length
      ? [
          '',
          `--- PIPELINE LIBRARY ---`,
          `Available pipelines (use inferPipeline above to match):`,
          ...pipelines.map((p: any) =>
            `  - ${p.id}: "${p.name}" — ${p.phases.length} phases (${p.phases.map((ph: any) => ph.name).join(', ')})`
          ),
        ].join('\n')
      : ''

    const contextBits = [
      systemPrompt || '',
      `Agency mode: Mission Control is a virtual creative and digital media agency where Iris coordinates specialist units.`,
      `Default response style: keep answers short, precise, and momentum-focused unless the user explicitly asks for depth.`,
      `Real agency roster:\n${agents.map((agent: any) => `- ${agent.name} (${agent.role}, skills: ${(agent.skills || []).join(', ') || 'none'})`).join('\n')}`,
      `Truthfulness rule: never claim a task is completed, delivered, uploaded, emailed, exported, or saved to a file path unless that exact artifact is listed in the known artifacts section below.`,
      `If no matching artifact exists, explicitly say the work is not yet produced in the app and offer to draft it.`,
      routing.routingReason,
      pipelineContext,
      pipelinesSummary,
      skillsContext,
      `Execution plan:
Lead agent: ${channelingPlan.leadAgentId}
Supporting agents: ${channelingPlan.collaboratorAgentIds.join(', ') || 'none'}
Assigned skills by agent:
${Object.entries(channelingPlan.selectedSkillsByAgent)
  .map(([agentId, skills]) => `- ${agentId}: ${skills.join(', ') || 'none'}`)
  .join('\n')}
Quality checklist:
- ${executionPlan.qualityChecklist.join('\n- ')}
Handoff notes: ${executionPlan.handoffNotes}
Orchestration trace:
- ${channelingPlan.orchestrationTrace.join('\n- ')}`,
      `Execution prompt:\n${executionPrompt}`,
      agentMemories?.iris?.roleSummary ? `Iris memory:\n${agentMemories.iris.roleSummary}` : '',
      Array.isArray(agentMemories?.iris?.userPreferences) && agentMemories.iris.userPreferences.length
        ? `User preferences:\n- ${agentMemories.iris.userPreferences.join('\n- ')}`
        : '',
      Array.isArray(agentMemories?.[routing.routedAgentId]?.workingMemory) && agentMemories[routing.routedAgentId].workingMemory.length
        ? `Recent working memory for ${routing.routedAgentId}:\n- ${agentMemories[routing.routedAgentId].workingMemory.join('\n- ')}`
        : '',
      currentClientId ? `Current client in focus: ${currentClientId}` : '',
      currentCampaignId ? `Current campaign in focus: ${currentCampaignId}` : '',
      missions.length ? `Active missions:\n${missions.map((mission: any) => `- ${mission.title} (${mission.status})`).join('\n')}` : '',
      artifacts.length
        ? `Known artifacts in app state:\n${artifacts
            .map((artifact: any) => `- ${artifact.title} [${artifact.status}] (${artifact.deliverableType})${artifact.path ? ` path=${artifact.path}` : ''}${artifact.link ? ` link=${artifact.link}` : ''}`)
            .join('\n')}`
        : 'Known artifacts in app state: none. Do not imply files or delivery exist yet.',
      clients.length
        ? `Known clients:\n${clients.map((client: any) => `- ${client.name}: ${client.industry}`).join('\n')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n\n')

    const chatMessages = [
      { role: 'system', content: contextBits },
      ...messages.map((message: any) => ({ role: message.role, content: message.content })),
    ] as const

    let responseText = ''
    let executionSteps: any[] = []
    let qualityResult: { ok: boolean; score: number; issues: string[] } | null = null
    let renderedHtmlFromTask: string | undefined
    let creativeFromTask: any = undefined
    let fallbackUsed = false
    let compareSummary: any = null
    debugLog('Calling generateText', { provider: actualProvider, model: actualModel, ollamaBaseUrl: providerKeys.ollamaBaseUrl })

    try {
      if (missionId && canPersistMissionExecution) {
        await upsertWorkflowExecutionState({
          taskId: missionId,
          pipelineId: pipelineDefinition?.id || null,
          status: 'active',
          currentPhase: pipelineDefinition?.phases?.[0]?.name || 'Execution',
          progress: 8,
          context: {
            source: 'chat',
            startedBy: auth.userId,
            request: userContent,
          },
        })
        await insertTaskRun({
          taskId: missionId,
          agentId: channelingPlan.leadAgentId || null,
          stage: 'chat-request',
          status: 'in_progress',
          inputPayload: {
            deliverableType,
            pipelineId: pipelineDefinition?.id || null,
          },
          startedAt: new Date().toISOString(),
        })
      }

      if (deliverableType !== 'status-report') {
        const result = await executeAutonomousTask({
          request: userContent,
          provider: actualProvider,
          model: actualModel,
          temperature,
          maxTokens,
          ...providerKeys,
          providerSettings: normalizedProviderSettings,
          deliverableType,
          executionPrompt,
          clientContext,
          clientProfile,
          agents,
          leadAgentId: channelingPlan.leadAgentId,
          collaboratorAgentIds: channelingPlan.collaboratorAgentIds,
          selectedSkillsByAgent: channelingPlan.selectedSkillsByAgent,
          qualityChecklist: executionPlan.qualityChecklist,
          pipeline: pipelineDefinition,
          skillCategories,
          hooks: missionId && canPersistMissionExecution
            ? {
              onPhaseStart: async ({ phase, progress }) => {
                  await upsertWorkflowExecutionState({
                    taskId: missionId,
                    pipelineId: pipelineDefinition?.id || null,
                    status: 'active',
                    currentPhase: phase.name,
                    progress,
                    context: { source: 'chat', phaseId: phase.id },
                  })
                },
                onActivityStart: async ({ phase, activity, agent, runtime, progress }) => {
                  await insertTaskRun({
                    taskId: missionId,
                    agentId: agent.id,
                    stage: `${phase.id}:${activity.id}`,
                    status: 'in_progress',
                    inputPayload: { phaseId: phase.id, activityId: activity.id },
                    outputPayload: { provider: runtime.provider, model: runtime.model, started: true },
                    startedAt: new Date().toISOString(),
                  })
                  await upsertWorkflowExecutionState({
                    taskId: missionId,
                    pipelineId: pipelineDefinition?.id || null,
                    status: 'active',
                    currentPhase: phase.name,
                    progress,
                    context: {
                      source: 'chat',
                      phaseId: phase.id,
                      activityId: activity.id,
                      activityName: activity.name,
                      activeAgentId: agent.id,
                      activeAgentName: agent.name,
                    },
                  })
                },
                onActivityComplete: async ({ phase, activity, agent, runtime, summary, outputIds, progress }) => {
                  await insertTaskRun({
                    taskId: missionId,
                    agentId: agent.id,
                    stage: `${phase.id}:${activity.id}`,
                    status: 'completed',
                    inputPayload: { phaseId: phase.id, activityId: activity.id, outputIds },
                    outputPayload: { summary, provider: runtime.provider, model: runtime.model },
                    startedAt: new Date().toISOString(),
                    completedAt: new Date().toISOString(),
                  })
                  await upsertWorkflowExecutionState({
                    taskId: missionId,
                    pipelineId: pipelineDefinition?.id || null,
                    status: 'active',
                    currentPhase: phase.name,
                    progress,
                    context: { source: 'chat', phaseId: phase.id, activityId: activity.id },
                  })
                },
              }
            : undefined,
        })
        responseText = result.response
        executionSteps = result.executionSteps
        qualityResult = result.qualityResult
        renderedHtmlFromTask = result.renderedHtml
        creativeFromTask = result.creative
      } else {
        const { text: statusText, usage: statusUsage } = await generateTextWithUsage({
          provider: actualProvider,
          model: actualModel,
          temperature,
          maxTokens,
          messages: [...chatMessages],
          ...providerKeys,
        })
        responseText = statusText
        logTokenUsage(getDb(), {
          tenantId: auth.tenantId,
          agentId: channelingPlan?.leadAgentId ?? null,
          sourceType: 'chat',
          sourceId: missionId ?? null,
          provider: actualProvider,
          model: actualModel,
          usage: statusUsage,
        })
      }
    } catch (error) {
      console.log('[CHAT ERROR]', error instanceof Error ? error.message : String(error), 'Provider:', actualProvider)
      const fallbackRuntime = resolveFallbackRuntime({
        settings: normalizedProviderSettings,
        currentProvider: actualProvider,
        requestedModel: model,
      })

      if (!fallbackRuntime) {
        throw error
      }

      actualProvider = fallbackRuntime.provider
      actualModel = fallbackRuntime.model
      fallbackUsed = true

      if (deliverableType !== 'status-report') {
        const result = await executeAutonomousTask({
          request: userContent,
          provider: actualProvider,
          model: actualModel,
          temperature,
          maxTokens,
          ...providerKeys,
          providerSettings: normalizedProviderSettings,
          deliverableType,
          executionPrompt,
          clientContext,
          clientProfile,
          agents,
          leadAgentId: channelingPlan.leadAgentId,
          collaboratorAgentIds: channelingPlan.collaboratorAgentIds,
          selectedSkillsByAgent: channelingPlan.selectedSkillsByAgent,
          qualityChecklist: executionPlan.qualityChecklist,
          pipeline: pipelineDefinition,
          skillCategories,
          hooks: missionId && canPersistMissionExecution
            ? {
                onPhaseStart: async ({ phase, progress }) => {
                  await upsertWorkflowExecutionState({
                    taskId: missionId,
                    pipelineId: pipelineDefinition?.id || null,
                    status: 'active',
                    currentPhase: phase.name,
                    progress,
                    context: { source: 'chat-fallback', phaseId: phase.id },
                  })
                },
                onActivityComplete: async ({ phase, activity, agent, runtime, summary, outputIds, progress }) => {
                  await insertTaskRun({
                    taskId: missionId,
                    agentId: agent.id,
                    stage: `${phase.id}:${activity.id}`,
                    status: 'completed',
                    inputPayload: { phaseId: phase.id, activityId: activity.id, outputIds },
                    outputPayload: { summary, provider: runtime.provider, model: runtime.model },
                    startedAt: new Date().toISOString(),
                    completedAt: new Date().toISOString(),
                  })
                  await upsertWorkflowExecutionState({
                    taskId: missionId,
                    pipelineId: pipelineDefinition?.id || null,
                    status: 'active',
                    currentPhase: phase.name,
                    progress,
                    context: { source: 'chat-fallback', phaseId: phase.id, activityId: activity.id },
                  })
                },
              }
            : undefined,
        })
        responseText = result.response
        executionSteps = result.executionSteps
        qualityResult = result.qualityResult
        renderedHtmlFromTask = result.renderedHtml
        creativeFromTask = result.creative
      } else {
        const { text: fallbackText, usage: fallbackUsage } = await generateTextWithUsage({
          provider: actualProvider,
          model: actualModel,
          temperature,
          maxTokens,
          messages: [...chatMessages],
          ...providerKeys,
        })
        responseText = fallbackText
        logTokenUsage(getDb(), {
          tenantId: auth.tenantId,
          agentId: channelingPlan?.leadAgentId ?? null,
          sourceType: 'chat',
          sourceId: missionId ?? null,
          provider: actualProvider,
          model: actualModel,
          usage: fallbackUsage,
        })
      }
    }

    if (deliverableType !== 'status-report' && shouldRunCompareMode(normalizedProviderSettings, deliverableType)) {
      const alternateRuntime = resolveFallbackRuntime({
        settings: normalizedProviderSettings,
        currentProvider: actualProvider,
        requestedModel: model,
      })

      if (alternateRuntime) {
        const alternateResult = await executeAutonomousTask({
          request: userContent,
          provider: alternateRuntime.provider,
          model: alternateRuntime.model,
          temperature,
          maxTokens,
          ...providerKeys,
          providerSettings: normalizedProviderSettings,
          deliverableType,
          executionPrompt,
          clientContext,
          clientProfile,
          agents,
          leadAgentId: channelingPlan.leadAgentId,
          collaboratorAgentIds: channelingPlan.collaboratorAgentIds,
          selectedSkillsByAgent: channelingPlan.selectedSkillsByAgent,
          qualityChecklist: executionPlan.qualityChecklist,
          pipeline: pipelineDefinition,
          skillCategories,
        })
        const primaryScore = qualityResult?.score ?? 0
        const alternateScore = alternateResult.qualityResult?.score ?? 0
        const pickAlternate = alternateScore > primaryScore
        compareSummary = {
          enabled: true,
          selectedProvider: pickAlternate ? alternateRuntime.provider : actualProvider,
          selectedModel: pickAlternate ? alternateRuntime.model : actualModel,
          alternateProvider: pickAlternate ? actualProvider : alternateRuntime.provider,
          alternateModel: pickAlternate ? actualModel : alternateRuntime.model,
          selectedScore: pickAlternate ? alternateScore : primaryScore,
          alternateScore: pickAlternate ? primaryScore : alternateScore,
        }
        if (pickAlternate) {
          responseText = alternateResult.response
          qualityResult = alternateResult.qualityResult
          renderedHtmlFromTask = alternateResult.renderedHtml
          creativeFromTask = alternateResult.creative
        }
      }
    }

    responseText = enforceArtifactTruth(responseText, artifacts)
    responseText = enforceDeliverableDraft(responseText, deliverableType)
    if (deliverableType !== 'status-report' && !qualityResult) {
      qualityResult = validateDeliverableQuality(deliverableType, responseText, userContent)
    }
    const hasUsableDeliverable =
      deliverableType === 'status-report' ||
      looksLikeUsableDeliverable(responseText, deliverableType, userContent)
    const completionStatus =
      qualityResult?.ok === false
        ? 'blocked'
        : hasUsableDeliverable
          ? 'completed'
          : 'blocked'
    const workflowStatus =
      qualityResult?.ok === false
        ? 'paused'
        : hasUsableDeliverable
          ? 'paused'
          : 'paused'

    if (missionId && canPersistMissionExecution) {
      await insertTaskRun({
        taskId: missionId,
        agentId: channelingPlan.leadAgentId || null,
        stage: 'final-assembly',
        status: completionStatus,
        outputPayload: {
          qualityScore: qualityResult?.score,
          qualityIssues: qualityResult?.issues || [],
          provider: actualProvider,
          model: actualModel,
          usableDeliverable: hasUsableDeliverable,
        },
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      })
      await upsertWorkflowExecutionState({
        taskId: missionId,
        pipelineId: pipelineDefinition?.id || null,
        status: workflowStatus,
        currentPhase: qualityResult?.ok === false ? 'Review' : hasUsableDeliverable ? 'Review' : (pipelineDefinition?.phases?.at(-1)?.name || 'Quality Control'),
        progress: qualityResult?.ok === false ? 82 : hasUsableDeliverable ? 88 : 72,
        context: {
          source: fallbackUsed ? 'chat-fallback' : 'chat',
          quality: qualityResult,
          usableDeliverable: hasUsableDeliverable,
          error: hasUsableDeliverable ? null : 'No usable deliverable was generated for this task.',
          completedAt: new Date().toISOString(),
        },
      })
    }
    const renderedHtml = renderedHtmlFromTask || buildArtifactHtml(responseText)

    const clientBriefAction = clientBriefActionPromise ? await clientBriefActionPromise : null
    const meta = {
      routedAgentId: routing.routedAgentId,
      leadAgentId: channelingPlan.leadAgentId,
      collaboratorAgentIds: channelingPlan.collaboratorAgentIds,
      assignedAgentIds: channelingPlan.assignedAgentIds,
      selectedSkillsByAgent: channelingPlan.selectedSkillsByAgent,
      orchestrationTrace: channelingPlan.orchestrationTrace,
      clientId: routing.clientId || currentClientId || null,
      campaignId: currentCampaignId || null,
      deliverableType,
      pipelineId: pipelineHint?.id || resolvedPipelineId || null,
      pipelineName: pipelineHint?.name || pipelineDefinition?.name || null,
      qualityChecklist: executionPlan.qualityChecklist,
      handoffNotes: executionPlan.handoffNotes,
      confidence: channelingPlan.confidence,
      resolvedDeliverableType: channelingPlan.resolvedDeliverableType,
      executionSteps,
      quality: qualityResult,
      executionPrompt,
      renderedHtml,
      creative: creativeFromTask,
      provider: actualProvider,
      model: actualModel,
      fallbackUsed,
      compareSummary,
      action: clientBriefAction,
    }

    // Build NDJSON response: pipeline_start chunk (if applicable) then done chunk.
    // The client reads pipeline_start first to update the pipeline indicator, then done for the full result.
    // TODO: For genuine background streaming, move executeAutonomousTask calls inside
    // a ReadableStream.start async callback so pipeline_start is flushed before execution begins.
    const ndjsonLines: string[] = []
    if (resolvedPipelineId) {
      ndjsonLines.push(JSON.stringify({
        type: 'pipeline_start',
        pipelineName: pipelineHint?.name || pipelineDefinition?.name || resolvedPipelineId,
        phases: pipelineHint?.phases
          || (Array.isArray(pipelineDefinition?.phases)
            ? pipelineDefinition.phases.map((p: any) => (typeof p === 'string' ? p : p?.name || ''))
            : []),
        deliverableType,
      }))
    }
    ndjsonLines.push(JSON.stringify({ type: 'done', response: responseText, meta }))

    return new Response(ndjsonLines.join('\n') + '\n', {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache, no-transform',
      },
    })
  } catch (err: any) {
    console.error('[/api/chat]', err)
    if (requestBody?.missionId) {
      try {
        const db = getDb()
        const taskRows = await db`SELECT id FROM tasks WHERE id = ${requestBody.missionId} LIMIT 1`
        if (taskRows[0]?.id) {
          await insertTaskRun({
            taskId: requestBody.missionId,
            stage: 'task-execution',
            status: 'failed',
            errorMessage: err instanceof Error ? err.message : 'Chat execution failed.',
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
          })
          await upsertWorkflowExecutionState({
            taskId: requestBody.missionId,
            status: 'paused',
            currentPhase: 'Execution',
            progress: 8,
            context: { error: err instanceof Error ? err.message : 'Chat execution failed.' },
          })
        }
      } catch {}
    }
    const status =
      err instanceof ProviderError
        ? err.status && Number.isFinite(err.status)
          ? err.status
          : 503
        : 500

    return NextResponse.json({ error: getFriendlyProviderError(err) }, { status })
  }
}
