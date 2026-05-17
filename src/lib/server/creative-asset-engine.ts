import { ArtifactExecutionStep, AIProvider, CreativeArtifactSpec } from '@/lib/types'
import { validateDeliverableQuality } from '@/lib/output-quality'
import { generateBrandedCreativeAsset, inferCreativeAspectRatio } from '@/lib/server/image-production'
import { findAgentByTemplate } from '@/lib/server/agent-templates'
import { escapeHtml } from '@/lib/server/text-utils'

type RuntimeAgent = {
  id: string
  name: string
  role: string
  systemPrompt?: string
}

type ClientProfileMap = Record<string, string>

type GenerateStage = (input: {
  agentId: string
  prompt: string
  temperature: number
  maxTokens?: number
}) => Promise<{ text: string; provider: AIProvider; model: string }>

function truncate(value: string, max = 2400) {
  const normalized = value.trim()
  if (normalized.length <= max) return normalized
  return `${normalized.slice(0, max - 3)}...`
}

function buildClientBlock(profile: ClientProfileMap, request: string) {
  return [
    `Brand: ${profile.brand_name || 'Client'}`,
    `Industry: ${profile.industry || profile.niche || 'Not specified'}`,
    `Audience: ${profile.target_audience || 'Not specified'}`,
    `Products / services: ${profile.product_service || 'Not specified'}`,
    `Key messages: ${profile.campaign_theme || 'Not specified'}`,
    `Tone: ${profile.brand_voice || profile.tone || 'Professional and warm'}`,
    `Brand colors: ${profile.brand_colors || 'Not specified'}`,
    `Brand fonts: ${profile.brand_fonts || 'Not specified'}`,
    `Visual keywords: ${profile.visual_keywords || 'Not specified'}`,
    `Look and feel: ${profile.look_and_feel || 'Not specified'}`,
    `Photo style: ${profile.photo_style || 'Not specified'}`,
    `Composition rules: ${profile.composition_rules || 'Not specified'}`,
    `Negative rules: ${profile.negative_rules || 'Not specified'}`,
    `Logo assets: ${profile.logo_assets || 'None uploaded'}`,
    `Template assets: ${profile.template_assets || 'None uploaded'}`,
    `Reference assets: ${profile.reference_assets || 'None uploaded'}`,
    `Request: ${request}`,
  ].join('\n')
}

function buildConceptPrompt(profile: ClientProfileMap, request: string) {
  return [
    'You are Finn, defining the creative concept for a branded visual task.',
    buildClientBlock(profile, request),
    'Return markdown only with these sections:',
    '## Concept Direction',
    '## Visual Story',
    '## Art Direction Guardrails',
    '## Template Alignment',
    'Be concise, specific, and brand-safe.',
  ].join('\n\n')
}

function buildCopyPrompt(profile: ClientProfileMap, request: string) {
  return [
    'You are Echo, writing the copy overlays and hook lines for a branded visual asset.',
    buildClientBlock(profile, request),
    'Return markdown only with these sections:',
    '## Primary Hook',
    '## Supporting Overlay Lines',
    '## Caption Draft',
    '## CTA Options',
    '## Copy Guardrails',
    'Keep it short, visual, and platform-native.',
  ].join('\n\n')
}

function buildNanoBananaPrompt(profile: ClientProfileMap, request: string, concept: string, copy: string) {
  return [
    'You are Lyra, preparing the image-generation layer for a branded artwork request.',
    buildClientBlock(profile, request),
    `Finn concept memo:\n${truncate(concept, 1400)}`,
    `Echo copy memo:\n${truncate(copy, 1000)}`,
    'Return markdown only with these exact sections:',
    '## Reference Assets',
    '## Visual Composition',
    '## Nano Banana Master Prompt',
    '## Negative Prompt / Guardrails',
    '## Variations',
    '## Production Notes',
    'The Nano Banana prompt must be detailed, brand-safe, and reference the uploaded logos/templates/reference images when available.',
  ].join('\n\n')
}

function extractSection(markdown: string, section: string) {
  const escaped = section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = markdown.match(new RegExp(`^##\\s+${escaped}\\s*$([\\s\\S]*?)(?=^##\\s+|\\Z)`, 'im'))
  return match?.[1]?.trim() || ''
}

function firstNonEmpty(...values: Array<string | undefined>) {
  return values.map((value) => (value || '').trim()).find(Boolean) || ''
}

function buildBrandIdentityLock(profile: ClientProfileMap) {
  const lines = [
    `Brand: ${profile.brand_name || 'Client'}`,
    `Colors: ${profile.brand_colors || 'Follow uploaded brand palette exactly.'}`,
    `Fonts: ${profile.brand_fonts || 'Use uploaded/approved brand typography only.'}`,
    `Look and feel: ${profile.look_and_feel || profile.visual_keywords || 'Premium, clean, on-brand social creative.'}`,
    `Photo style: ${profile.photo_style || 'Use the approved photography/reference style.'}`,
    `Composition rules: ${profile.composition_rules || 'Keep layout clean, mobile-safe, and template-aligned.'}`,
    `Hard no's: ${profile.negative_rules || 'Do not drift from the uploaded templates, references, or approved brand style.'}`,
  ]
  return lines.join('\n')
}

function buildReferenceAssetsSection(profile: ClientProfileMap, lyraReferenceAssets: string) {
  const parts = [
    `Logos: ${profile.logo_assets || 'None uploaded'}`,
    `Templates: ${profile.template_assets || 'None uploaded'}`,
    `Reference Images: ${profile.reference_assets || 'None uploaded'}`,
  ]
  if (lyraReferenceAssets) {
    parts.push(`Lyra notes: ${lyraReferenceAssets}`)
  }
  return parts.join('\n')
}

function buildConceptDirectionSection(concept: string) {
  const conceptDirection = extractSection(concept, 'Concept Direction')
  const visualStory = extractSection(concept, 'Visual Story')
  const guardrails = extractSection(concept, 'Art Direction Guardrails')
  const templateAlignment = extractSection(concept, 'Template Alignment')
  return [
    conceptDirection && `Concept Direction:\n${conceptDirection}`,
    visualStory && `Visual Story:\n${visualStory}`,
    guardrails && `Art Direction Guardrails:\n${guardrails}`,
    templateAlignment && `Template Alignment:\n${templateAlignment}`,
  ]
    .filter(Boolean)
    .join('\n\n')
}

function buildCopyOverlaySection(copy: string) {
  const primaryHook = extractSection(copy, 'Primary Hook')
  const overlayLines = extractSection(copy, 'Supporting Overlay Lines')
  const ctaOptions = extractSection(copy, 'CTA Options')
  const copyGuardrails = extractSection(copy, 'Copy Guardrails')
  return [
    primaryHook && `Primary Hook:\n${primaryHook}`,
    overlayLines && `Supporting Overlay Lines:\n${overlayLines}`,
    ctaOptions && `CTA Options:\n${ctaOptions}`,
    copyGuardrails && `Copy Guardrails:\n${copyGuardrails}`,
  ]
    .filter(Boolean)
    .join('\n\n')
}

function composeCreativeProductionPack(input: {
  request: string
  profile: ClientProfileMap
  concept: string
  copy: string
  lyra: string
}) {
  const lyraReferenceAssets = extractSection(input.lyra, 'Reference Assets')
  const lyraVisualComposition = extractSection(input.lyra, 'Visual Composition')
  const lyraMasterPrompt = extractSection(input.lyra, 'Nano Banana Master Prompt')
  const lyraNegativePrompt = extractSection(input.lyra, 'Negative Prompt / Guardrails')
  const lyraVariations = extractSection(input.lyra, 'Variations')
  const lyraProductionNotes = extractSection(input.lyra, 'Production Notes')
  const captionDraft = extractSection(input.copy, 'Caption Draft')

  const visualComposition = firstNonEmpty(
    lyraVisualComposition,
    extractSection(input.concept, 'Visual Story'),
    extractSection(input.concept, 'Template Alignment')
  )

  const negativePrompt = firstNonEmpty(
    lyraNegativePrompt,
    input.profile.negative_rules,
    'Do not break brand identity, color system, typography hierarchy, or approved reference style.'
  )

  const masterPrompt = firstNonEmpty(
    lyraMasterPrompt,
    [
      `Create one polished branded social-post image for ${input.profile.brand_name || 'the client'}.`,
      `Objective: ${input.request}`,
      `Style: ${input.profile.look_and_feel || input.profile.visual_keywords || 'Premium, clean, brand-safe creative'}.`,
      `Photo style: ${input.profile.photo_style || 'Use uploaded references and premium editorial treatment'}.`,
      `Composition: ${input.profile.composition_rules || 'Mobile-first layout with strong hierarchy and legible text overlay'}.`,
      `Brand colors: ${input.profile.brand_colors || 'Use approved brand palette only'}.`,
      `Fonts / typography: ${input.profile.brand_fonts || 'Use approved brand typography style'}.`,
      `Use the uploaded logos, templates, and reference images as hard visual anchors.`,
      `Include clear on-image headline treatment and maintain clean CTA hierarchy.`,
    ].join('\n')
  )

  const variations = firstNonEmpty(
    lyraVariations,
    '- Variation 1: Cleaner premium editorial version\n- Variation 2: More product-offer emphasis\n- Variation 3: Stronger science/data visual emphasis'
  )

  const productionNotes = firstNonEmpty(
    lyraProductionNotes,
    [
      `Aspect ratio: ${inferCreativeAspectRatio(input.request)}`,
      'Keep all text mobile-safe and template-aligned.',
      'Preserve brand consistency across color, typography, and imagery.',
    ].join('\n')
  )

  return [
    '# Creative Asset Production Pack',
    '## Creative Objective',
    input.request.trim(),
    '## Audience',
    input.profile.target_audience || 'Primary brand audience from the client brief.',
    '## Brand Identity Lock',
    buildBrandIdentityLock(input.profile),
    '## Reference Assets',
    buildReferenceAssetsSection(input.profile, lyraReferenceAssets),
    '## Concept Direction',
    buildConceptDirectionSection(input.concept),
    '## Visual Composition',
    visualComposition,
    '## Copy Overlays',
    buildCopyOverlaySection(input.copy),
    '## Caption Draft',
    captionDraft || 'Use the primary hook as the opening line, add context, then close with a CTA.',
    '## Nano Banana Master Prompt',
    masterPrompt,
    '## Negative Prompt / Guardrails',
    negativePrompt,
    '## Variations',
    variations,
    '## Production Notes',
    productionNotes,
  ].join('\n\n')
}

function buildCreativeHtml(input: {
  title: string
  profile: ClientProfileMap
  content: string
  assetUrl?: string
}) {
  const logoAssets = (input.profile.logo_assets || '').split(',').map((item) => item.trim()).filter(Boolean)
  const templateAssets = (input.profile.template_assets || '').split(',').map((item) => item.trim()).filter(Boolean)
  const referenceAssets = (input.profile.reference_assets || '').split(',').map((item) => item.trim()).filter(Boolean)

  return `
    <article style="background:linear-gradient(180deg,#0f1427 0%,#161e38 48%,#f7f6ff 48%,#ffffff 100%);border-radius:32px;overflow:hidden;border:1px solid rgba(109,119,160,0.2);box-shadow:0 24px 48px rgba(20,26,46,0.12);">
      <header style="padding:28px 28px 24px;color:white;">
        <div style="display:inline-flex;align-items:center;padding:8px 12px;border-radius:999px;background:rgba(255,255,255,0.12);font:600 11px ui-monospace, SFMono-Regular, Menlo, monospace;letter-spacing:.18em;text-transform:uppercase;">Nano Banana Creative Pack</div>
        <h1 style="margin:16px 0 8px;font-size:34px;line-height:1.06;font-weight:800;">${escapeHtml(input.title)}</h1>
        <p style="margin:0;font-size:14px;line-height:1.7;color:rgba(255,255,255,0.8);">${escapeHtml(input.profile.brand_name || 'Client')} · ${escapeHtml(input.profile.look_and_feel || input.profile.visual_keywords || 'Brand-safe visual generation')}</p>
      </header>
      <section style="padding:0 28px 28px;">
        <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:-4px;">
          <div style="padding:18px;border-radius:20px;background:white;border:1px solid rgba(109,119,160,0.16);"><div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#707792;">Colors</div><p style="margin:10px 0 0;font-size:14px;color:#1d2440;">${escapeHtml(input.profile.brand_colors || 'Not set')}</p></div>
          <div style="padding:18px;border-radius:20px;background:white;border:1px solid rgba(109,119,160,0.16);"><div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#707792;">Fonts</div><p style="margin:10px 0 0;font-size:14px;color:#1d2440;">${escapeHtml(input.profile.brand_fonts || 'Not set')}</p></div>
          <div style="padding:18px;border-radius:20px;background:white;border:1px solid rgba(109,119,160,0.16);"><div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#707792;">Photo Style</div><p style="margin:10px 0 0;font-size:14px;color:#1d2440;">${escapeHtml(input.profile.photo_style || 'Not set')}</p></div>
        </div>
        <div style="margin-top:18px;padding:22px;border-radius:24px;background:white;border:1px solid rgba(109,119,160,0.16);">
          <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#707792;margin-bottom:12px;">Brand References</div>
          <p style="margin:0 0 8px;font-size:14px;color:#1d2440;"><strong>Logos:</strong> ${escapeHtml(logoAssets.join(' | ') || 'None uploaded')}</p>
          <p style="margin:0 0 8px;font-size:14px;color:#1d2440;"><strong>Templates:</strong> ${escapeHtml(templateAssets.join(' | ') || 'None uploaded')}</p>
          <p style="margin:0;font-size:14px;color:#1d2440;"><strong>Reference Images:</strong> ${escapeHtml(referenceAssets.join(' | ') || 'None uploaded')}</p>
        </div>
        <div style="margin-top:18px;padding:24px;border-radius:24px;background:white;border:1px solid rgba(109,119,160,0.16);">
          <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#707792;margin-bottom:14px;">Production Pack</div>
          ${
            input.assetUrl
              ? `<div style="margin:0 0 18px;"><img src="${escapeHtml(input.assetUrl)}" alt="${escapeHtml(input.title)}" style="display:block;width:100%;max-width:560px;border-radius:22px;border:1px solid rgba(109,119,160,0.16);box-shadow:0 18px 34px rgba(19,25,44,0.12);" /></div>`
              : ''
          }
          <pre style="white-space:pre-wrap;font:500 14px/1.8 ui-sans-serif,system-ui;color:#1d2440;margin:0;">${escapeHtml(input.content)}</pre>
        </div>
      </section>
    </article>
  `
}

function createStep(input: {
  id: string
  agent: RuntimeAgent
  role: 'support' | 'lead' | 'quality'
  title: string
  summary: string
  provider: AIProvider
  model: string
  skillsUsed?: string[]
  status?: 'completed' | 'warning' | 'failed'
}): ArtifactExecutionStep {
  return {
    id: input.id,
    agentId: input.agent.id,
    agentName: input.agent.name,
    role: input.role,
    title: input.title,
    summary: input.summary,
    provider: input.provider,
    model: input.model,
    skillsUsed: input.skillsUsed || [],
    status: input.status || 'completed',
  }
}

export async function executeCreativeAssetTask(input: {
  request: string
  clientProfile: ClientProfileMap
  agentsById: Map<string, RuntimeAgent>
  selectedSkillsByAgent?: Record<string, string[]>
  generateStage: GenerateStage
  maxTokens?: number
  geminiApiKey?: string
  visualModel?: string
  visualEnabled?: boolean
}) {
  // Template-aware lookup: works for legacy single-tenant rows (id='finn')
  // AND for new tenant clones (id='finn-<suffix>', metadata.templateId='finn').
  const byTemplate = (templateId: string) =>
    findAgentByTemplate(input.agentsById.values(), templateId)

  const finn = byTemplate('finn') || byTemplate('lyra') || byTemplate('iris')
  const echo = byTemplate('echo') || byTemplate('iris')
  const lyra = byTemplate('lyra') || byTemplate('finn') || byTemplate('iris')
  const iris = byTemplate('iris') || lyra

  if (!finn || !echo || !lyra || !iris) {
    throw new Error('Required specialist agents are not available for creative-asset automation.')
  }

  const executionSteps: ArtifactExecutionStep[] = []

  const concept = await input.generateStage({
    agentId: finn.id,
    prompt: buildConceptPrompt(input.clientProfile, input.request),
    temperature: 0.55,
    maxTokens: input.maxTokens,
  })
  executionSteps.push(
    createStep({
      id: `creative-concept-${Date.now()}`,
      agent: finn,
      role: 'support',
      title: 'Creative concept set',
      summary: 'Finn established the concept direction, visual story, and art-direction guardrails.',
      provider: concept.provider,
      model: concept.model,
      skillsUsed: input.selectedSkillsByAgent?.[finn.id] || ['art-direction', 'brand-consistency'],
    })
  )

  const copy = await input.generateStage({
    agentId: echo.id,
    prompt: buildCopyPrompt(input.clientProfile, input.request),
    temperature: 0.5,
    maxTokens: input.maxTokens,
  })
  executionSteps.push(
    createStep({
      id: `creative-copy-${Date.now()}`,
      agent: echo,
      role: 'support',
      title: 'Copy overlays drafted',
      summary: 'Echo drafted the hooks, overlay lines, and CTA options for the visual asset.',
      provider: copy.provider,
      model: copy.model,
      skillsUsed: input.selectedSkillsByAgent?.[echo.id] || ['campaign-copywriting', 'brand-voice'],
    })
  )

  const lyraLayer = await input.generateStage({
    agentId: lyra.id,
    prompt: buildNanoBananaPrompt(input.clientProfile, input.request, concept.text, copy.text),
    temperature: 0.55,
    maxTokens: input.maxTokens,
  })
  const packText = composeCreativeProductionPack({
    request: input.request,
    profile: input.clientProfile,
    concept: concept.text,
    copy: copy.text,
    lyra: lyraLayer.text,
  })
  executionSteps.push(
    createStep({
      id: `creative-pack-${Date.now()}`,
      agent: lyra,
      role: 'lead',
      title: 'Nano Banana production pack prepared',
      summary: 'Lyra assembled a brand-safe Nano Banana master prompt, guardrails, and production notes using the client brand kit.',
      provider: lyraLayer.provider,
      model: lyraLayer.model,
      skillsUsed: input.selectedSkillsByAgent?.[lyra.id] || ['brand-consistency', 'composition', 'nano-banana-pro'],
    })
  )

  const quality = validateDeliverableQuality('creative-asset', packText, input.request)
  let creative: CreativeArtifactSpec | undefined

  if (input.visualEnabled && input.geminiApiKey) {
    try {
      const generated = await generateBrandedCreativeAsset({
        apiKey: input.geminiApiKey,
        model: input.visualModel || 'gemini-3-pro-image-preview',
        prompt: [
          'Use the following Nano Banana production pack to generate one final on-brand image.',
          'Strictly follow the uploaded templates, brand identity, and reference images.',
          'Do not invent a different brand style.',
          packText,
        ].join('\n\n'),
        referenceFields: [
          ...(input.clientProfile.template_asset_paths || '').split(',').map((item) => item.trim()).filter(Boolean),
          ...(input.clientProfile.reference_asset_paths || '').split(',').map((item) => item.trim()).filter(Boolean),
          ...(input.clientProfile.logo_asset_paths || '').split(',').map((item) => item.trim()).filter(Boolean),
        ],
        title: `${input.clientProfile.brand_name || 'client'} creative asset`,
        request: input.request,
      })

      creative = {
        assetType: 'social-post',
        visualDirection: input.clientProfile.look_and_feel || input.clientProfile.visual_keywords || 'Brand-safe social artwork',
        imagePrompt: packText,
        aspectRatio: generated.aspectRatio,
        referenceNotes: `Used ${generated.usedReferenceImages} brand/reference image(s) during generation.`,
        deliverableSpecs: [
          input.clientProfile.brand_colors || '',
          input.clientProfile.brand_fonts || '',
          input.clientProfile.composition_rules || '',
        ].filter(Boolean),
        assetUrl: generated.assetUrl,
        assetPath: generated.assetPath,
      }

      executionSteps.push(
        createStep({
          id: `creative-image-${Date.now()}`,
          agent: lyra,
          role: 'lead',
          title: 'Artwork rendered',
          summary: `Lyra generated the final branded artwork using Gemini image generation with ${generated.usedReferenceImages} reference asset(s).`,
          provider: 'gemini',
          model: input.visualModel || 'gemini-3-pro-image-preview',
          skillsUsed: input.selectedSkillsByAgent?.[lyra.id] || ['nano-banana-pro', 'reference-image-direction', 'brand-template-enforcement'],
        })
      )
    } catch (error: any) {
      executionSteps.push(
        createStep({
          id: `creative-image-warning-${Date.now()}`,
          agent: lyra,
          role: 'lead',
          title: 'Artwork render fallback',
          summary: `The production pack is ready, but the image render step failed: ${error?.message || 'Unknown error'}`,
          provider: 'gemini',
          model: input.visualModel || 'gemini-3-pro-image-preview',
          skillsUsed: input.selectedSkillsByAgent?.[lyra.id] || ['nano-banana-pro'],
          status: 'warning',
        })
      )
    }
  } else {
    executionSteps.push(
      createStep({
        id: `creative-image-skipped-${Date.now()}`,
        agent: lyra,
        role: 'lead',
        title: 'Artwork render skipped',
        summary: input.geminiApiKey
          ? 'Visual generation is disabled or not verified in Settings, so only the production pack was created.'
          : 'No Gemini API key was available for image rendering, so only the production pack was created.',
        provider: 'gemini',
        model: input.visualModel || 'gemini-3-pro-image-preview',
        skillsUsed: input.selectedSkillsByAgent?.[lyra.id] || ['nano-banana-pro'],
        status: 'warning',
      })
    )
  }

  executionSteps.push(
    createStep({
      id: `creative-quality-${Date.now()}`,
      agent: iris,
      role: 'quality',
      title: 'Creative quality review',
      summary: quality.ok
        ? 'The creative production pack passed the structural quality gate and is ready for review.'
        : `The pack is usable but still has quality issues: ${quality.issues.join(' | ')}`,
      provider: lyraLayer.provider,
      model: lyraLayer.model,
      skillsUsed: input.selectedSkillsByAgent?.[iris.id] || ['priority-management'],
      status: quality.ok ? 'completed' : 'warning',
    })
  )

  return {
    response: packText,
    renderedHtml: buildCreativeHtml({
      title: `${input.clientProfile.brand_name || 'Client'} Creative Asset`,
      profile: input.clientProfile,
      content: packText,
      assetUrl: creative?.assetUrl,
    }),
    executionSteps,
    qualityResult: quality,
    creative,
  }
}
