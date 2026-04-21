'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Download, ExternalLink, FileImage, FileText, Sheet } from 'lucide-react'

import { ClientShell } from '@/components/ClientShell'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { getArtifactFamily, getDefaultCreativeSpec, getSupportedExportFormats } from '@/lib/artifacts'
import { useAgentsStore } from '@/lib/agents-store'
import { getSupabaseAccessToken } from '@/lib/supabase/browser'
import { Artifact, ArtifactExport, CreativeArtifactSpec } from '@/lib/types'
import { ArtifactOutputView } from '@/components/outputs/ArtifactOutputView'
import { useSearchParams } from 'next/navigation'

const STATUS_COLORS = {
  draft: '#ffd166',
  ready: '#4f8ef7',
  delivered: '#00d4aa',
} as const

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getArtifactActivityTimestamp(artifact: Artifact) {
  const safeTime = (value?: string | null) => {
    if (!value) return 0
    const time = new Date(value).getTime()
    return Number.isFinite(time) ? time : 0
  }

  return safeTime(artifact.createdAt || artifact.updatedAt)
}

function CreativePackEditor({
  artifact,
  onSave,
}: {
  artifact: Artifact
  onSave: (creative: CreativeArtifactSpec) => void
}) {
  const [draft, setDraft] = useState<CreativeArtifactSpec>(getDefaultCreativeSpec(artifact))

  return (
    <div className="space-y-3 p-4 rounded-xl border border-border bg-base/40">
      <div className="flex items-center gap-2">
        <FileImage size={14} className="text-accent-orange" />
        <p className="text-[11px] font-mono uppercase text-text-dim">Creative Production Pack</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="space-y-1">
          <span className="text-[11px] text-text-secondary">Asset type</span>
          <select
            value={draft.assetType}
            onChange={(e) => setDraft((current) => ({ ...current, assetType: e.target.value as CreativeArtifactSpec['assetType'] }))}
            className="w-full bg-base border border-border rounded-lg px-3 py-2 text-sm text-text-primary"
          >
            <option value="social-post">Social Post</option>
            <option value="carousel">Carousel</option>
            <option value="story">Story</option>
            <option value="ad-creative">Ad Creative</option>
            <option value="hero-image">Hero Image</option>
            <option value="deck-visual">Deck Visual</option>
            <option value="other">Other</option>
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-[11px] text-text-secondary">Aspect ratio</span>
          <select
            value={draft.aspectRatio}
            onChange={(e) => setDraft((current) => ({ ...current, aspectRatio: e.target.value as CreativeArtifactSpec['aspectRatio'] }))}
            className="w-full bg-base border border-border rounded-lg px-3 py-2 text-sm text-text-primary"
          >
            <option value="1:1">1:1</option>
            <option value="4:5">4:5</option>
            <option value="16:9">16:9</option>
            <option value="9:16">9:16</option>
            <option value="custom">Custom</option>
          </select>
        </label>
      </div>

      <label className="space-y-1 block">
        <span className="text-[11px] text-text-secondary">Visual direction</span>
        <textarea
          value={draft.visualDirection}
          onChange={(e) => setDraft((current) => ({ ...current, visualDirection: e.target.value }))}
          className="w-full min-h-[80px] bg-base border border-border rounded-lg px-3 py-2 text-sm text-text-primary"
        />
      </label>

      <label className="space-y-1 block">
        <span className="text-[11px] text-text-secondary">Image prompt</span>
        <textarea
          value={draft.imagePrompt}
          onChange={(e) => setDraft((current) => ({ ...current, imagePrompt: e.target.value }))}
          className="w-full min-h-[120px] bg-base border border-border rounded-lg px-3 py-2 text-sm text-text-primary"
        />
      </label>

      <label className="space-y-1 block">
        <span className="text-[11px] text-text-secondary">Deliverable specs</span>
        <textarea
          value={draft.deliverableSpecs.join('\n')}
          onChange={(e) =>
            setDraft((current) => ({
              ...current,
              deliverableSpecs: e.target.value
                .split('\n')
                .map((item) => item.trim())
                .filter(Boolean),
            }))
          }
          className="w-full min-h-[90px] bg-base border border-border rounded-lg px-3 py-2 text-sm text-text-primary"
          placeholder="One requirement per line"
        />
      </label>

      <label className="space-y-1 block">
        <span className="text-[11px] text-text-secondary">Reference notes</span>
        <textarea
          value={draft.referenceNotes || ''}
          onChange={(e) => setDraft((current) => ({ ...current, referenceNotes: e.target.value }))}
          className="w-full min-h-[80px] bg-base border border-border rounded-lg px-3 py-2 text-sm text-text-primary"
        />
      </label>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="space-y-1 block">
          <span className="text-[11px] text-text-secondary">Asset URL</span>
          <input
            value={draft.assetUrl || ''}
            onChange={(e) => setDraft((current) => ({ ...current, assetUrl: e.target.value }))}
            className="w-full bg-base border border-border rounded-lg px-3 py-2 text-sm text-text-primary"
            placeholder="https://..."
          />
        </label>
        <label className="space-y-1 block">
          <span className="text-[11px] text-text-secondary">Local asset path</span>
          <input
            value={draft.assetPath || ''}
            onChange={(e) => setDraft((current) => ({ ...current, assetPath: e.target.value }))}
            className="w-full bg-base border border-border rounded-lg px-3 py-2 text-sm text-text-primary"
            placeholder="/path/to/render.png"
          />
        </label>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant="secondary" onClick={() => onSave(draft)}>
          Save Creative Pack
        </Button>
        {draft.assetUrl ? (
          <a
            href={draft.assetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-accent-blue hover:underline"
          >
            Open linked asset <ExternalLink size={10} />
          </a>
        ) : null}
      </div>
    </div>
  )
}

export default function OutputsPage() {
  const searchParams = useSearchParams()
  const artifacts = useAgentsStore((state) => state.artifacts)
  const clients = useAgentsStore((state) => state.clients)
  const missions = useAgentsStore((state) => state.missions)
  const agents = useAgentsStore((state) => state.agents)
  const updateArtifact = useAgentsStore((state) => state.updateArtifact)
  const appStateReady = useAgentsStore((state) => state.appStateReady)

  const initialClientFilter = searchParams.get('client') || 'all'
  const [clientFilter, setClientFilter] = useState(initialClientFilter)
  const [statusFilter, setStatusFilter] = useState('all')
  const [exportingKey, setExportingKey] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [openArtifactIds, setOpenArtifactIds] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setClientFilter(searchParams.get('client') || 'all')
  }, [searchParams])

  const filteredArtifacts = useMemo(
    () =>
      artifacts.filter((artifact) => {
        const clientMatch = clientFilter === 'all' || artifact.clientId === clientFilter
        const statusMatch = statusFilter === 'all' || artifact.status === statusFilter
        return clientMatch && statusMatch
      }).sort((a, b) => getArtifactActivityTimestamp(b) - getArtifactActivityTimestamp(a)),
    [artifacts, clientFilter, statusFilter]
  )

  function toggleArtifact(id: string) {
    setOpenArtifactIds((current) => ({ ...current, [id]: !current[id] }))
  }

  async function handleExport(artifact: Artifact, format: ArtifactExport['format']) {
    const exportKey = `${artifact.id}:${format}`
    const client = clients.find((item) => item.id === artifact.clientId)
    const mission = missions.find((item) => item.id === artifact.missionId)
    const agent = agents.find((item) => item.id === artifact.agentId)
    const payloadArtifact = artifact.deliverableType === 'creative-asset'
      ? { ...artifact, creative: getDefaultCreativeSpec(artifact) }
      : artifact

    setExportingKey(exportKey)
    setFeedback(null)

    try {
      const token = await getSupabaseAccessToken()
      if (!token) {
        throw new Error('Your session expired. Please sign in again and retry the export.')
      }

      const response = await fetch('/api/artifacts/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          artifact: payloadArtifact,
          format,
          clientName: client?.name,
          missionTitle: mission?.title,
          agentName: agent?.name,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data?.error || 'Unable to generate export.')
      }

      const exportRecord = data.exportRecord as ArtifactExport
      updateArtifact(artifact.id, {
        exports: [exportRecord, ...(artifact.exports || [])],
        status: artifact.status === 'draft' ? 'ready' : artifact.status,
        path: exportRecord.path,
      })

      setFeedback(`${artifact.title} exported as ${format.toUpperCase()}.`)

      if (exportRecord.publicUrl?.startsWith('/api/artifacts/download')) {
        const downloadResponse = await fetch(exportRecord.publicUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!downloadResponse.ok) {
          throw new Error('The export was generated, but the secure download failed.')
        }

        const blob = await downloadResponse.blob()
        const downloadUrl = URL.createObjectURL(blob)
        const anchor = document.createElement('a')
        anchor.href = downloadUrl
        anchor.download = exportRecord.fileName || `${artifact.title}.${format}`
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
        URL.revokeObjectURL(downloadUrl)
      } else if (exportRecord.publicUrl) {
        window.open(exportRecord.publicUrl, '_blank', 'noopener,noreferrer')
      }
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Unable to generate export.')
    } finally {
      setExportingKey(null)
    }
  }

  return (
    <ClientShell>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h1 className="text-xl font-heading font-bold text-text-primary flex items-center gap-2">
              <FileText size={20} className="text-accent-orange" />
              Outputs
            </h1>
            <p className="text-xs text-text-secondary mt-0.5">
              Central registry for briefs, plans, KPI sheets, and creative production outputs
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-text-dim">
            <span>{artifacts.length} saved outputs</span>
          </div>
        </div>

        <div className="px-6 py-3 border-b border-border flex items-center gap-3 flex-wrap">
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="bg-base border border-border rounded-lg px-3 py-2 text-sm text-text-primary"
          >
            <option value="all">All clients</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-base border border-border rounded-lg px-3 py-2 text-sm text-text-primary"
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="ready">Ready</option>
            <option value="delivered">Delivered</option>
          </select>
          {feedback ? <span className="text-[11px] text-text-secondary">{feedback}</span> : null}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl space-y-4">
            {!appStateReady ? (
              <Card>
                <p className="text-sm text-text-primary">Loading outputs…</p>
              </Card>
            ) : filteredArtifacts.length > 0 ? (
              filteredArtifacts.map((artifact) => {
                const client = clients.find((item) => item.id === artifact.clientId)
                const mission = missions.find((item) => item.id === artifact.missionId)
                const agent = agents.find((item) => item.id === artifact.agentId)
                const deliverableType = artifact.deliverableType || 'client-brief'
                const artifactFormat = artifact.format || 'html'
                const artifactStatus = artifact.status === 'ready' || artifact.status === 'delivered' ? artifact.status : 'draft'
                const family = getArtifactFamily(deliverableType)
                const supportedFormats = getSupportedExportFormats({
                  ...artifact,
                  deliverableType,
                  format: artifactFormat,
                })

                return (
                  <Card key={artifact.id} className="space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <button type="button" onClick={() => toggleArtifact(artifact.id)} className="flex items-center gap-2 flex-wrap text-left">
                          {openArtifactIds[artifact.id] ? <ChevronDown size={14} className="text-text-dim" /> : <ChevronRight size={14} className="text-text-dim" />}
                          <h3 className="text-sm font-heading font-semibold text-text-primary">{artifact.title}</h3>
                          <Badge color={STATUS_COLORS[artifactStatus]} size="sm">
                            {artifactStatus}
                          </Badge>
                          <Badge color="#8b92a8" size="sm">
                            {deliverableType}
                          </Badge>
                          <Badge color={family === 'media' ? '#4f8ef7' : family === 'creative' ? '#ff7b72' : '#7c879c'} size="sm">
                            {family}
                          </Badge>
                        </button>
                        <p className="text-[11px] text-text-secondary mt-1">
                          {client?.name || 'General ops'} · {mission?.title || 'Unlinked mission'} · {agent?.name || 'Iris'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        <Button size="sm" variant="ghost" onClick={() => updateArtifact(artifact.id, { status: 'draft' })}>
                          Draft
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => updateArtifact(artifact.id, { status: 'ready' })}>
                          Ready
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => updateArtifact(artifact.id, { status: 'delivered' })}>
                          Delivered
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {supportedFormats.map((format) => (
                        <Button
                          key={format}
                          size="sm"
                          variant="secondary"
                          disabled={exportingKey === `${artifact.id}:${format}`}
                          onClick={() => handleExport(artifact, format)}
                        >
                          {format === 'xlsx' ? <Sheet size={14} /> : <Download size={14} />}
                          {exportingKey === `${artifact.id}:${format}` ? `Generating ${format.toUpperCase()}...` : `Generate ${format.toUpperCase()}`}
                        </Button>
                      ))}
                    </div>

                    {openArtifactIds[artifact.id] && artifact.content ? (
                      <div className="p-4 rounded-xl border border-border bg-base/60">
                        <ArtifactOutputView artifact={artifact} />
                      </div>
                    ) : null}

                    {openArtifactIds[artifact.id] && deliverableType === 'creative-asset' ? (
                      <CreativePackEditor
                        artifact={artifact}
                        onSave={(creative) =>
                          updateArtifact(artifact.id, {
                            creative,
                            format: creative.assetUrl || creative.assetPath ? 'image' : artifact.format,
                            link: creative.assetUrl || artifact.link,
                            path: creative.assetPath || artifact.path,
                          })
                        }
                      />
                    ) : null}

                    {openArtifactIds[artifact.id] ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl border border-border bg-base/40">
                        <p className="text-[10px] font-mono uppercase text-text-dim mb-2">Execution Prompt</p>
                        <p className="text-[11px] text-text-secondary whitespace-pre-wrap leading-relaxed">
                          {artifact.sourcePrompt || 'No execution prompt stored.'}
                        </p>
                      </div>

                      <div className="p-4 rounded-xl border border-border bg-base/40 space-y-3">
                        <div>
                          <p className="text-[10px] font-mono uppercase text-text-dim mb-2">Output Metadata</p>
                          <p className="text-[11px] text-text-secondary">Primary format: {artifactFormat.toUpperCase()}</p>
                          {artifact.path ? <p className="text-[11px] font-mono text-text-dim break-all mt-2">{artifact.path}</p> : null}
                          {artifact.link ? (
                            <a
                              href={artifact.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-accent-blue hover:underline mt-2"
                            >
                              Open linked output <ExternalLink size={10} />
                            </a>
                          ) : null}
                        </div>
                        {artifact.notes ? <p className="text-[11px] text-text-dim">{artifact.notes}</p> : null}
                      </div>
                    </div>
                    ) : null}

                    {openArtifactIds[artifact.id] && artifact.exports?.length ? (
                      <div className="p-4 rounded-xl border border-border bg-base/30">
                        <p className="text-[10px] font-mono uppercase text-text-dim mb-3">Generated Files</p>
                        <div className="space-y-2">
                          {artifact.exports.map((record) => (
                            <div key={record.id} className="flex items-center justify-between gap-3 flex-wrap">
                              <div>
                                <p className="text-sm text-text-primary">{record.fileName}</p>
                                <p className="text-[11px] text-text-dim">{formatTimestamp(record.createdAt)}</p>
                              </div>
                              <a
                                href={record.publicUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-[11px] text-text-secondary hover:text-text-primary"
                              >
                                Download <ExternalLink size={12} />
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {openArtifactIds[artifact.id] && artifact.executionSteps?.length ? (
                      <div className="p-4 rounded-xl border border-border bg-base/30">
                        <p className="text-[10px] font-mono uppercase text-text-dim mb-3">Autonomous Execution</p>
                        <div className="space-y-2">
                          {artifact.executionSteps.map((step) => (
                            <div key={step.id} className="p-3 rounded-lg border border-border bg-base/40">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm text-text-primary">{step.agentName} · {step.title}</p>
                                <span className="text-[10px] font-mono uppercase text-text-dim">
                                  {step.status || 'completed'}
                                </span>
                              </div>
                              <p className="text-[11px] text-text-secondary mt-1">{step.summary}</p>
                              <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-text-dim font-mono">
                                {step.phaseName ? <span>phase:{step.phaseName}</span> : null}
                                {step.activityId ? <span>activity:{step.activityId}</span> : null}
                                {step.provider ? <span>provider:{step.provider}</span> : null}
                                {step.model ? <span>model:{step.model}</span> : null}
                                {step.outputIds?.length ? <span>outputs:{step.outputIds.join(', ')}</span> : null}
                              </div>
                              {step.qualityIssues?.length ? (
                                <div className="mt-2 space-y-1">
                                  {step.qualityIssues.map((issue, index) => (
                                    <p key={`${step.id}-issue-${index}`} className="text-[11px] text-accent-yellow">
                                      {issue}
                                    </p>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </Card>
                )
              })
            ) : (
              <Card>
                <p className="text-sm text-text-primary">No outputs match the current filters.</p>
                <p className="text-[11px] text-text-dim mt-1">
                  When Iris drafts work for campaigns, strategies, KPI plans, or creative outputs, it will appear here.
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </ClientShell>
  )
}
