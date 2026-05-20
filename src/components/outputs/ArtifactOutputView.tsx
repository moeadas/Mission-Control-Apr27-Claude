'use client'

import React, { useMemo, useState } from 'react'

import { Artifact } from '@/lib/types'
import { buildArtifactHtml } from '@/lib/output-html'
import { sanitizeHtml } from '@/lib/html-sanitizer'

// Client-side escapeHtml — the server version in `@/lib/server/text-utils`
// can't be imported into client components, so we keep a minimal copy here.
function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function parseMarkdownSections(content: string) {
  const cleaned = (content || '').replace(/\r/g, '').trim()
  const titleMatch = cleaned.match(/^#\s+(.+)$/m)
  const title = titleMatch?.[1]?.trim() || ''
  const body = titleMatch ? cleaned.replace(titleMatch[0], '').trim() : cleaned
  const chunks = body.split(/\n(?=##\s+)/g).map((chunk) => chunk.trim()).filter(Boolean)
  const sections = chunks.map((chunk) => {
    const lines = chunk.split('\n')
    const heading = lines[0].replace(/^##\s+/, '').trim()
    const text = lines.slice(1).join('\n').trim()
    return { heading, text }
  })
  return { title, sections }
}

function findSection(sections: Array<{ heading: string; text: string }>, heading: string) {
  return sections.find((section) => section.heading.toLowerCase() === heading.toLowerCase())?.text || ''
}

function extractLabeledBlock(text: string, label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = text.match(new RegExp(`${escaped}:\\s*([\\s\\S]*?)(?=\\n\\n[A-Z][^\\n]*:|\\n[A-Z][^\\n]*:|$)`, 'i'))
  return match?.[1]?.trim() || ''
}

function firstMeaningfulLine(text: string) {
  return text
    .split('\n')
    .map((line) => line.replace(/^[-*]\s+/, '').trim())
    .find(Boolean) || ''
}

function resolveCreativeImageUrl(artifact: Artifact) {
  const directUrl = artifact.creative?.assetUrl?.trim() || artifact.link?.trim() || ''
  if (directUrl) return directUrl

  const savedPath = artifact.creative?.assetPath?.trim() || artifact.path?.trim() || ''
  if (savedPath.includes('/uploads/generated/')) {
    const index = savedPath.indexOf('/uploads/generated/')
    return savedPath.slice(index)
  }
  if (savedPath.startsWith('public/uploads/generated/')) {
    return `/${savedPath.replace(/^public\//, '')}`
  }

  const html = artifact.renderedHtml || ''
  const match = html.match(/<img[^>]+src="([^"]+)"/i)
  return match?.[1]?.trim() || ''
}

function renderSafeHtml(content: string) {
  try {
    // Batch CC: always sanitize before returning. The LLM-produced content
    // may contain script tags, event handlers, javascript: URIs, etc.
    // buildArtifactHtml just wraps + styles the content — it does not strip
    // anything. Without the sanitize step, an attacker who controls part of
    // the LLM output (via prompt injection) can execute arbitrary JS in any
    // viewer's browser.
    return sanitizeHtml(buildArtifactHtml(content))
  } catch (error) {
    console.error('[ArtifactOutputView]', error)
    const safeText = typeof content === 'string' ? content : 'This output could not be rendered safely.'
    return `<article class="artifact-document"><div class="artifact-grid"><section class="artifact-section"><h2 class="artifact-section-head">Output Preview</h2><div class="artifact-section-body"><pre class="artifact-paragraph">${escapeHtml(
      safeText
    )}</pre></div></section></div></article>`
  }
}

function CreativeArtifactView({ artifact }: { artifact: Artifact }) {
  const [showLog, setShowLog] = useState(false)

  const creativeView = useMemo(() => {
    const content = typeof artifact.content === 'string' ? artifact.content : ''
    const { sections } = parseMarkdownSections(content)

    const imageUrl = resolveCreativeImageUrl(artifact)
    const copyOverlays = findSection(sections, 'Copy Overlays')
    const captionDraft = findSection(sections, 'Caption Draft')
    const productionNotes = findSection(sections, 'Production Notes')
    const visualComposition = findSection(sections, 'Visual Composition')
    const masterPrompt = findSection(sections, 'Nano Banana Master Prompt')
    const guardrails = findSection(sections, 'Negative Prompt / Guardrails')
    const brandLock = findSection(sections, 'Brand Identity Lock')
    const referenceAssets = findSection(sections, 'Reference Assets')
    const conceptDirection = findSection(sections, 'Concept Direction')
    const variations = findSection(sections, 'Variations')

    const cta =
      extractLabeledBlock(copyOverlays, 'CTA Options') ||
      firstMeaningfulLine(copyOverlays.split(/CTA Options:/i)[1] || '') ||
      firstMeaningfulLine(captionDraft)

    const overlayHeadline =
      extractLabeledBlock(copyOverlays, 'Primary Hook') ||
      extractLabeledBlock(copyOverlays, 'Supporting Overlay Lines') ||
      firstMeaningfulLine(copyOverlays)

    const logMarkdown = [
      '# Creative Execution Log',
      referenceAssets ? `## Reference Assets\n\n${referenceAssets}` : '',
      conceptDirection ? `## Concept Direction\n\n${conceptDirection}` : '',
      visualComposition ? `## Visual Composition\n\n${visualComposition}` : '',
      overlayHeadline ? `## Copy Overlays\n\n${copyOverlays}` : '',
      masterPrompt ? `## Nano Banana Master Prompt\n\n${masterPrompt}` : '',
      guardrails ? `## Negative Prompt / Guardrails\n\n${guardrails}` : '',
      brandLock ? `## Brand Identity Lock\n\n${brandLock}` : '',
      variations ? `## Variations\n\n${variations}` : '',
      productionNotes ? `## Production Notes\n\n${productionNotes}` : '',
    ]
      .filter(Boolean)
      .join('\n\n')

    return {
      imageUrl,
      captionDraft,
      cta,
      overlayHeadline,
      logHtml: logMarkdown ? renderSafeHtml(logMarkdown) : '',
    }
  }, [artifact])

  return (
    <div className="space-y-4">
      {creativeView.imageUrl ? (
        <section className="rounded-[24px] border border-border bg-base/40 p-4">
          <p className="text-[10px] font-mono uppercase text-text-dim mb-3">Image Output</p>
          <img
            src={creativeView.imageUrl}
            alt={artifact.title || 'Generated image'}
            className="block w-full max-w-[720px] rounded-[20px] border border-border object-cover shadow-[0_16px_32px_rgba(15,23,42,0.10)]"
          />
          <p className="mt-3 text-[11px] text-text-dim">Right-click the image to save it, or open it in a new tab.</p>
        </section>
      ) : null}

      <section className="rounded-[24px] border border-border bg-base/40 p-4">
        <p className="text-[10px] font-mono uppercase text-text-dim mb-3">Caption</p>
        <div className="rounded-[18px] border border-border bg-base px-4 py-4">
          <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
            {creativeView.captionDraft || 'No caption draft was generated.'}
          </p>
        </div>
      </section>

      <section className="rounded-[24px] border border-border bg-base/40 p-4">
        <p className="text-[10px] font-mono uppercase text-text-dim mb-3">CTA</p>
        <div className="rounded-[18px] border border-border bg-base px-4 py-4">
          <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
            {creativeView.cta || 'No CTA was extracted from the creative pack.'}
          </p>
        </div>
      </section>

      <section className="rounded-[24px] border border-border bg-base/30">
        <button
          type="button"
          onClick={() => setShowLog((current) => !current)}
          className="w-full flex items-center justify-between gap-3 px-4 py-4 text-left"
        >
          <div>
            <p className="text-[10px] font-mono uppercase text-text-dim">Execution Log</p>
            <p className="mt-1 text-xs text-text-secondary">Background details, prompts, brand references, and production notes.</p>
          </div>
          <span className="text-[11px] text-accent-blue">{showLog ? 'Hide log' : 'Show log'}</span>
        </button>

        {showLog && creativeView.logHtml ? (
          <div
            className="artifact-render prose prose-invert max-w-none border-t border-border px-4 py-4"
            // Batch CC: logHtml already came through renderSafeHtml which now
            // sanitizes, but we sanitize again defensively in case this code
            // path ever ingests raw HTML directly.
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(creativeView.logHtml) }}
          />
        ) : null}
      </section>
    </div>
  )
}

export function ArtifactOutputView({ artifact }: { artifact: Artifact }) {
  const html = useMemo(() => {
    const rendered = typeof artifact.renderedHtml === 'string' ? artifact.renderedHtml : ''
    const content = typeof artifact.content === 'string' ? artifact.content : ''
    return renderSafeHtml(rendered || content)
  }, [artifact.content, artifact.renderedHtml])

  if (artifact.deliverableType === 'creative-asset') {
    return <CreativeArtifactView artifact={artifact} />
  }

  return (
    <div
      className="artifact-render prose prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
