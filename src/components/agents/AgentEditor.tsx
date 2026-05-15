'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createAppPersistenceSnapshot, useAgentsStore } from '@/lib/agents-store'
import { AgentBot } from '@/components/agents/AgentBot'
import { SkillPicker } from '@/components/ui/SkillPicker'
import { toast } from '@/components/ui/Toast'
import { X, Save, ChevronRight, ChevronLeft, Check, User, Brain, Wrench, Cpu, Trash2, AlertTriangle } from 'lucide-react'
import type { AgencyDivision, AgentSpecialty } from '@/lib/types'
import { getStoredToken } from '@/lib/auth/browser'
import { getAgentArchitectureBundle, getAgentMemoryNote, getAgentSourceOfTruthPath, getProviderRoutingNote } from '@/lib/agent-architecture'
import { v4 as uuidv4 } from 'uuid'
import { MODEL_CATALOG } from '@/config/model-pricing'

interface AgentEditorProps {
  agentId: string | null
  onClose: () => void
}

const DIVISIONS: AgencyDivision[] = ['orchestration', 'client-services', 'creative', 'media', 'research', 'strategy']

const PROVIDERS = [
  { id: 'anthropic' as const, label: 'Anthropic', color: '#cc785c' },
  { id: 'openai' as const, label: 'OpenAI', color: '#10a37f' },
  { id: 'gemini' as const, label: 'Gemini', color: '#4285f4' },
  { id: 'ollama' as const, label: 'Ollama (Local)', color: '#888888' },
]

type AIProvider = 'anthropic' | 'openai' | 'gemini' | 'ollama'
const DIVISION_COLORS: Record<string, string> = {
  orchestration: '#a78bfa',
  'client-services': '#4f8ef7',
  creative: '#00d4aa',
  media: '#ff5fa0',
  research: '#38bdf8',
  strategy: '#9b6dff',
}

const STEPS = [
  { id: 'identity', label: 'Identity', icon: User, desc: 'Name, role, division & photo' },
  { id: 'personality', label: 'Personality', icon: Brain, desc: 'Bio, methodology & system prompt' },
  { id: 'capabilities', label: 'Capabilities', icon: Wrench, desc: 'Skills, tools & responsibilities' },
  { id: 'config', label: 'AI Config', icon: Cpu, desc: 'Model settings & parameters' },
]

type FormData = {
  name: string
  role: string
  photoUrl: string
  bio: string
  methodology: string
  skills: string[]
  responsibilities: string[]
  tools: string[]
  division: AgencyDivision
  color: string
  systemPrompt: string
  temperature: number
  maxTokens: number
  provider: AIProvider
  model: string
}

const DEFAULT_FORM: FormData = {
  name: '',
  role: '',
  photoUrl: '',
  bio: '',
  methodology: '',
  skills: [],
  responsibilities: [],
  tools: [],
  division: 'creative',
  color: '#00d4aa',
  systemPrompt: '',
  temperature: 0.7,
  maxTokens: 1536,
  provider: 'gemini',
  model: 'gemini-2.5-flash',
}

export function AgentEditor({ agentId, onClose }: AgentEditorProps) {
  const agents = useAgentsStore((state) => state.agents)
  const updateAgent = useAgentsStore((state) => state.updateAgent)
  const createAgent = useAgentsStore((state) => state.createAgent)
  const deleteAgent = useAgentsStore((state) => state.deleteAgent)
  const providerSettings = useAgentsStore((state) => state.providerSettings)
  const token = getStoredToken()

  // Build merged model list: static catalog + dynamic installed models from providerSettings
  function getMergedModels(prov: string) {
    const catalogModels = MODEL_CATALOG.filter((m) => m.provider === prov)
    const catalogIds = new Set(catalogModels.map((m) => m.id))
    const dynamic: string[] =
      prov === 'ollama' ? (providerSettings.ollama?.availableModels || [])
      : prov === 'gemini' ? (providerSettings.gemini?.availableModels || [])
      : prov === 'anthropic' ? (providerSettings.anthropic?.availableModels || [])
      : prov === 'openai' ? (providerSettings.openai?.availableModels || [])
      : []
    const extra = dynamic
      .filter((id) => !catalogIds.has(id))
      .map((id) => ({
        id,
        label: id,
        provider: prov as any,
        tier: 'local' as const,
        note: 'Installed on your Ollama server',
      }))
    return [...catalogModels, ...extra]
  }

  const isCreating = agentId === null
  const agent = isCreating ? null : agents.find((a) => a.id === agentId)

  // Don't render if editing a non-existent agent (agentId set but not found)
  if (!isCreating && !agent) return null

  const architectureBundle = !isCreating && agentId ? getAgentArchitectureBundle(agentId) : null

  const [step, setStep] = useState(0)
  const [formData, setFormData] = useState<FormData>(DEFAULT_FORM)
  const [newResponsibility, setNewResponsibility] = useState('')
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)
  // For new agents, generate an id upfront so photo upload works
  const [pendingAgentId] = useState(() => isCreating ? uuidv4() : agentId!)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const latestPhotoUrlRef = useRef<string>('')

  useEffect(() => {
    if (agent) {
      setFormData({
        name: agent.name,
        role: agent.role,
        photoUrl: agent.photoUrl || '',
        bio: agent.bio || '',
        methodology: agent.methodology || '',
        skills: agent.skills || [],
        responsibilities: agent.responsibilities || [],
        tools: agent.tools || [],
        division: agent.division,
        color: agent.color,
        systemPrompt: agent.systemPrompt || '',
        temperature: agent.temperature || 0.7,
        maxTokens: agent.maxTokens || 1536,
        provider: (agent.provider as AIProvider) || 'gemini',
        model: agent.model || 'gemini-2.5-flash',
      })
      setPhotoPreviewUrl(agent.photoUrl || null)
      latestPhotoUrlRef.current = agent.photoUrl || ''
    }
  }, [agent?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      if (photoPreviewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreviewUrl)
      }
    }
  }, [photoPreviewUrl])

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Agent name is required')
      setStep(0)
      return
    }
    if (isUploadingPhoto) {
      setPhotoError('Please wait for the photo upload to finish before saving.')
      return
    }

    setIsSaving(true)
    setPhotoError(null)

    try {
      const effectivePhotoUrl = latestPhotoUrlRef.current || formData.photoUrl || ''
      const authHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }

      if (isCreating) {
        // Create new agent
        createAgent({
          name: formData.name,
          role: formData.role,
          photoUrl: effectivePhotoUrl || undefined,
          bio: formData.bio,
          methodology: formData.methodology,
          skills: formData.skills,
          responsibilities: formData.responsibilities,
          tools: formData.tools,
          division: formData.division,
          unit: formData.division,
          specialty: (formData.division as AgentSpecialty) || 'creative',
          color: formData.color,
          accentColor: formData.color,
          avatar: formData.name.slice(0, 2).toUpperCase(),
          systemPrompt: formData.systemPrompt,
          temperature: formData.temperature,
          maxTokens: formData.maxTokens,
          provider: formData.provider,
          model: formData.model,
          status: 'active',
          primaryOutputs: [],
          position: { x: 200, y: 200, room: 'creative' },
        })
        toast.success(`${formData.name} added to your team`)
      } else {
        // Update existing agent
        await fetch(`/api/agent-photos/${agentId}`, {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify({ photoUrl: effectivePhotoUrl || null }),
        }).catch(() => {})

        updateAgent(agentId!, {
          name: formData.name,
          role: formData.role,
          photoUrl: effectivePhotoUrl || undefined,
          bio: formData.bio,
          methodology: formData.methodology,
          skills: formData.skills,
          responsibilities: formData.responsibilities,
          tools: formData.tools,
          division: formData.division,
          color: formData.color,
          systemPrompt: formData.systemPrompt,
          temperature: formData.temperature,
          maxTokens: formData.maxTokens,
          provider: formData.provider,
          model: formData.model,
        })

        try {
          const snapshot = createAppPersistenceSnapshot(useAgentsStore.getState())
          await fetch('/api/state', {
            method: 'PUT',
            headers: authHeaders,
            body: JSON.stringify({ state: snapshot }),
          })
        } catch {
          // Background sync will pick it up
        }

        toast.success(`${formData.name} updated`)
      }
      onClose()
    } finally {
      setIsSaving(false)
    }
  }

  const addSkill = (skillId: string) => {
    if (!formData.skills.includes(skillId)) {
      setFormData((prev) => ({ ...prev, skills: [...prev.skills, skillId] }))
    }
  }

  const removeSkill = (skillId: string) => {
    setFormData((prev) => ({ ...prev, skills: prev.skills.filter((s) => s !== skillId) }))
  }

  const addResponsibility = () => {
    const resp = newResponsibility.trim()
    if (resp && !formData.responsibilities.includes(resp)) {
      setFormData((prev) => ({ ...prev, responsibilities: [...prev.responsibilities, resp] }))
      setNewResponsibility('')
    }
  }

  const removeResponsibility = (r: string) => {
    setFormData((prev) => ({ ...prev, responsibilities: prev.responsibilities.filter((item) => item !== r) }))
  }

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploadingPhoto(true)
    setPhotoError(null)

    try {
      const localPreview = URL.createObjectURL(file)
      setPhotoPreviewUrl((current) => {
        if (current?.startsWith('blob:')) URL.revokeObjectURL(current)
        return localPreview
      })

      const normalizedFile = await normalizeImageUpload(file, pendingAgentId)
      const body = new FormData()
      body.append('file', normalizedFile)
      body.append('agentId', pendingAgentId)
      const response = await fetch('/api/agent-photos/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body,
      })

      const payload = await response.json()

      if (!response.ok || !payload.photoUrl) {
        throw new Error(payload.error || 'Upload failed')
      }

      setFormData((prev) => ({ ...prev, photoUrl: payload.photoUrl }))
      latestPhotoUrlRef.current = payload.photoUrl
      setPhotoPreviewUrl((current) => {
        if (current?.startsWith('blob:')) URL.revokeObjectURL(current)
        return payload.photoUrl
      })
      if (!isCreating && agentId) {
        updateAgent(agentId, { photoUrl: payload.photoUrl })
      }
      setPhotoError(null)
      toast.success('Avatar uploaded')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload photo'
      setPhotoError(message)
      toast.error(message)
    } finally {
      setIsUploadingPhoto(false)
    }

    event.target.value = ''
  }

  const normalizeImageUpload = async (file: File, id: string): Promise<File> => {
    if (file.size <= 900_000) return file
    const imageUrl = URL.createObjectURL(file)
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error('Could not read image'))
        img.src = imageUrl
      })
      const maxDimension = 768
      const scale = Math.min(1, maxDimension / Math.max(image.width, image.height))
      const targetWidth = Math.max(1, Math.round(image.width * scale))
      const targetHeight = Math.max(1, Math.round(image.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = targetWidth
      canvas.height = targetHeight
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Could not process image')
      context.drawImage(image, 0, 0, targetWidth, targetHeight)
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) => { if (result) resolve(result); else reject(new Error('Could not compress image')) },
          'image/webp', 0.86
        )
      })
      return new File([blob], `${id}-avatar.webp`, { type: 'image/webp' })
    } finally {
      URL.revokeObjectURL(imageUrl)
    }
  }

  const currentStepName = STEPS[step].id

  return (
    <div className="form-backdrop">
      <div className="form-panel max-w-3xl max-h-[92vh] editor-theme">

        {/* Header */}
        <div className="form-header">
          <div className="flex items-center gap-4">
            <AgentBot
              name={formData.name || (isCreating ? 'New' : agent?.name || 'Agent')}
              avatar={isCreating ? 'NW' : agent?.avatar || 'AG'}
              color={formData.color}
              photoUrl={photoPreviewUrl || formData.photoUrl || undefined}
              size={40}
            />
            <div>
              <p className="form-header-title">
                {isCreating ? 'Add New Agent' : `Edit Agent`}
              </p>
              <p className="form-header-subtitle">
                {formData.name || (isCreating ? 'Fill in the details below' : agent?.role)}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="form-close-btn">
            <X size={20} />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex-shrink-0 border-b border-[#e2e8f0] px-5 py-3 bg-white">
          <div className="flex items-center gap-1">
            {STEPS.map((s, i) => {
              const Icon = s.icon
              const isCompleted = i < step
              const isCurrent = i === step
              return (
                <React.Fragment key={s.id}>
                  <button
                    onClick={() => setStep(i)}
                    className={`form-step-tab ${
                      isCurrent ? 'form-step-tab-active' : isCompleted ? 'form-step-tab-done' : ''
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${
                      isCompleted ? 'bg-[#00d4aa]/20 text-[#00d4aa]' : isCurrent ? 'bg-[#9b6dff]/20 text-[#9b6dff]' : 'bg-[#f1f5f9] text-[#94a3b8]'
                    }`}>
                      {isCompleted ? <Check size={10} /> : i + 1}
                    </span>
                    <span className="hidden sm:block">{s.label}</span>
                  </button>
                  {i < STEPS.length - 1 && (
                    <div className={`h-px flex-1 max-w-6 ${i < step ? 'bg-[#00d4aa]/40' : 'bg-[#e2e8f0]'}`} />
                  )}
                </React.Fragment>
              )
            })}
          </div>
        </div>

        {/* Step content */}
        <div className="form-body space-y-5">

          {/* ── Step 0: Identity ── */}
          {currentStepName === 'identity' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Name <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    className="form-input px-3 py-2"
                    placeholder="e.g., Nova, Atlas, Maya"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="form-label">Role / Title</label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value }))}
                    className="form-input px-3 py-2"
                    placeholder="e.g., Creative Director, SEO Specialist"
                  />
                </div>
              </div>

              {/* Division */}
              <div>
                <label className="form-label mb-2">Division</label>
                <div className="flex gap-2 flex-wrap">
                  {DIVISIONS.map((div) => (
                    <button
                      key={div}
                      onClick={() => setFormData((prev) => ({ ...prev, division: div, color: DIVISION_COLORS[div] }))}
                      className="px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize"
                      style={{
                        backgroundColor: formData.division === div ? DIVISION_COLORS[div] + '20' : 'var(--bg-elevated)',
                        color: formData.division === div ? DIVISION_COLORS[div] : 'var(--text-secondary)',
                        border: `1px solid ${formData.division === div ? DIVISION_COLORS[div] : 'var(--border)'}`,
                      }}
                    >
                      {div}
                    </button>
                  ))}
                </div>
              </div>

              {/* Photo */}
              <div>
                <label className="form-label mb-2">Avatar Photo</label>
                <div className="flex items-center gap-5">
                  <div className="rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-3">
                    <AgentBot
                      name={formData.name || 'New'}
                      avatar={formData.name.slice(0, 2).toUpperCase() || 'NW'}
                      color={formData.color}
                      photoUrl={photoPreviewUrl || formData.photoUrl || undefined}
                      size={72}
                    />
                  </div>
                  <div className="space-y-2">
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      className="absolute w-px h-px opacity-0 pointer-events-none"
                      onChange={handlePhotoUpload}
                    />
                    <button
                      type="button"
                      disabled={isUploadingPhoto}
                      onClick={() => photoInputRef.current?.click()}
                      className="inline-flex items-center px-4 py-2 rounded-lg text-sm editor-button-secondary disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isUploadingPhoto ? 'Uploading...' : 'Upload Photo'}
                    </button>
                    {formData.photoUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, photoUrl: '' }))
                          latestPhotoUrlRef.current = ''
                          setPhotoPreviewUrl(null)
                        }}
                        className="block text-xs text-text-dim hover:text-text-primary"
                      >
                        Remove photo
                      </button>
                    )}
                    <p className="text-xs text-text-dim">Square or portrait image. Auto-compressed.</p>
                    {photoError && <p className="text-xs text-red-400">{photoError}</p>}
                  </div>
                  {/* Color picker */}
                  <div className="ml-auto text-center">
                    <label className="block text-xs text-text-dim mb-1">Color</label>
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData((prev) => ({ ...prev, color: e.target.value }))}
                      className="w-12 h-12 rounded-xl cursor-pointer border border-border bg-[var(--bg-elevated)]"
                    />
                  </div>
                </div>
              </div>

              {/* Architecture notice for existing agents */}
              {architectureBundle && (
                <div className="form-info-card">
                  <p className="text-sm font-semibold text-text-primary mb-1">Architecture Source</p>
                  <p className="text-xs text-text-dim">
                    This agent loads from config files at{' '}
                    <code className="text-[10px] bg-[#f1f5f9] px-1 py-0.5 rounded">
                      {getAgentSourceOfTruthPath(agentId!)}
                    </code>
                    . Edit behaviour there; use this editor for avatar & appearance changes.
                  </p>
                </div>
              )}
            </>
          )}

          {/* ── Step 1: Personality ── */}
          {currentStepName === 'personality' && (
            <>
              <div>
                <label className="form-label">Bio</label>
                <p className="form-hint">A short description of who this agent is and what makes them unique.</p>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
                  rows={3}
                  className="form-textarea px-3 py-2 resize-none"
                  placeholder="e.g., Nova is a data-driven creative strategist who blends analytical insight with bold visual thinking..."
                />
              </div>

              <div>
                <label className="form-label">Methodology</label>
                <p className="form-hint">How does this agent approach work?</p>
                <input
                  type="text"
                  value={formData.methodology}
                  onChange={(e) => setFormData((prev) => ({ ...prev, methodology: e.target.value }))}
                  className="form-input px-3 py-2"
                  placeholder="e.g., Design Thinking + Agile, Research-first, Iterate fast"
                />
              </div>

              <div>
                <label className="form-label">System Prompt</label>
                <p className="form-hint">
                  The AI instructions that define this agent's behavior. Leave blank to inherit global defaults.
                </p>
                <textarea
                  value={formData.systemPrompt}
                  onChange={(e) => setFormData((prev) => ({ ...prev, systemPrompt: e.target.value }))}
                  rows={7}
                  className="form-textarea px-3 py-2 font-mono resize-none"
                  placeholder="You are [name], a [role] at a creative agency. You specialise in..."
                />
              </div>
            </>
          )}

          {/* ── Step 2: Capabilities ── */}
          {currentStepName === 'capabilities' && (
            <>
              {/* Skills */}
              <div>
                <label className="form-label">Skills</label>
                <p className="text-xs text-text-dim mb-3">Select skills from the library. Each skill unlocks specialised capabilities.</p>
                <SkillPicker
                  selectedSkillIds={formData.skills}
                  onAddSkill={addSkill}
                  onRemoveSkill={removeSkill}
                />
              </div>

              {/* Tools */}
              <div>
                <label className="form-label mb-2">Tools Access</label>
                <div className="flex flex-wrap gap-2">
                  {['web-search', 'analytics', 'document', 'spreadsheet', 'presentation', 'image-gen', 'figma', 'canva'].map((tool) => {
                    const isSelected = formData.tools.includes(tool)
                    return (
                      <button
                        key={tool}
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            tools: isSelected ? prev.tools.filter((t) => t !== tool) : [...prev.tools, tool],
                          }))
                        }
                        className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
                        style={{
                          backgroundColor: isSelected ? 'rgba(155, 109, 255, 0.14)' : 'var(--bg-elevated)',
                          color: isSelected ? '#9b6dff' : 'var(--text-secondary)',
                          border: `1px solid ${isSelected ? '#9b6dff' : 'var(--border)'}`,
                        }}
                      >
                        {isSelected ? '✓ ' : '+ '}{tool}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Responsibilities */}
              <div>
                <label className="form-label">Responsibilities</label>
                <p className="form-hint">What is this agent accountable for?</p>
                <div className="space-y-1 mb-3">
                  {formData.responsibilities.length === 0 && (
                    <span className="text-xs text-text-dim italic">No responsibilities added yet</span>
                  )}
                  {formData.responsibilities.map((r) => (
                    <div key={r} className="editor-panel-muted flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg">
                      <span className="flex-1">{r}</span>
                      <button onClick={() => removeResponsibility(r)} className="text-text-dim hover:text-red-400 flex-shrink-0">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newResponsibility}
                    onChange={(e) => setNewResponsibility(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { addResponsibility() } }}
                    className="editor-input flex-1 px-3 py-2 text-sm"
                    placeholder="Type a responsibility and press Enter…"
                  />
                  <button onClick={addResponsibility} className="editor-button-primary px-4 py-2 rounded-lg text-sm">
                    Add
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── Step 3: AI Config ── */}
          {currentStepName === 'config' && (
            <>
              {/* Provider selector */}
              <div>
                <label className="form-label">AI Provider</label>
                <p className="form-hint">Which provider this agent uses. Must have an API key configured in Settings.</p>
                <div className="flex gap-2 flex-wrap">
                  {PROVIDERS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        const merged = getMergedModels(p.id)
                        const defaultModel = merged[0]?.id || ''
                        setFormData((prev) => ({ ...prev, provider: p.id, model: defaultModel }))
                      }}
                      className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
                      style={{
                        backgroundColor: formData.provider === p.id ? p.color + '20' : 'var(--bg-elevated)',
                        color: formData.provider === p.id ? p.color : 'var(--text-secondary)',
                        border: `1px solid ${formData.provider === p.id ? p.color : 'var(--border)'}`,
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Model selector */}
              <div>
                <label className="form-label">Model</label>
                <p className="form-hint">
                  {formData.provider === 'ollama'
                    ? 'Shows models from your Ollama server. Verify Ollama in Settings to refresh the list.'
                    : 'More capable models cost more per token'}
                </p>
                <div className="space-y-1.5">
                  {getMergedModels(formData.provider).map((m) => {
                    const tierColors: Record<string, string> = {
                      powerful: '#cc785c',
                      balanced: '#9b6dff',
                      fast: '#00d4aa',
                      local: '#888888',
                    }
                    const tierColor = tierColors[m.tier] || '#888'
                    const isSelected = formData.model === m.id
                    return (
                      <button
                        key={m.id}
                        onClick={() => setFormData((prev) => ({ ...prev, model: m.id }))}
                        className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm transition-all text-left"
                        style={{
                          backgroundColor: isSelected ? tierColor + '14' : 'var(--bg-elevated)',
                          border: `1px solid ${isSelected ? tierColor : 'var(--border)'}`,
                        }}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: tierColor }}
                          />
                          <span className={isSelected ? 'font-medium' : ''} style={{ color: isSelected ? tierColor : 'var(--text-primary)' }}>
                            {m.label}
                          </span>
                        </div>
                        <span className="text-xs text-text-dim ml-3 text-right shrink-0">{m.note}</span>
                      </button>
                    )
                  })}
                </div>
                {/* Custom model — for any model not in the list (e.g. newly pulled Ollama models) */}
                <div className="mt-3">
                  <p className="text-[11px] text-text-dim mb-1.5">
                    Model not listed? Enter the exact model ID:
                  </p>
                  <input
                    type="text"
                    placeholder={formData.provider === 'ollama' ? 'e.g. kimi-k2:latest' : 'e.g. custom-model-id'}
                    value={getMergedModels(formData.provider).some((m) => m.id === formData.model) ? '' : formData.model}
                    onChange={(e) => setFormData((prev) => ({ ...prev, model: e.target.value }))}
                    className="form-input px-3 py-2 text-sm w-full"
                  />
                  {formData.model && !getMergedModels(formData.provider).some((m) => m.id === formData.model) && (
                    <p className="text-[11px] text-[#9b6dff] mt-1">
                      ✓ Using custom model: <span className="font-mono">{formData.model}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Temperature</label>
                  <p className="form-hint">0 = precise, 1 = creative. Default: 0.7</p>
                  <input
                    type="number"
                    value={formData.temperature}
                    onChange={(e) => setFormData((prev) => ({ ...prev, temperature: parseFloat(e.target.value) || 0.7 }))}
                    step={0.05}
                    min={0}
                    max={1}
                    className="form-input px-3 py-2"
                  />
                  <input
                    type="range"
                    value={formData.temperature}
                    onChange={(e) => setFormData((prev) => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                    step={0.05}
                    min={0}
                    max={1}
                    className="w-full mt-2 accent-[#9b6dff]"
                  />
                  <div className="flex justify-between text-[10px] text-text-dim mt-0.5">
                    <span>Precise</span>
                    <span>Creative</span>
                  </div>
                </div>
                <div>
                  <label className="form-label">Max Output Tokens</label>
                  <p className="form-hint">How long responses can be. Default: 1536</p>
                  <input
                    type="number"
                    value={formData.maxTokens}
                    onChange={(e) => setFormData((prev) => ({ ...prev, maxTokens: parseInt(e.target.value) || 1536 }))}
                    min={256}
                    max={8192}
                    step={256}
                    className="form-input px-3 py-2"
                  />
                </div>
              </div>

              {/* Summary card */}
              <div className="form-info-card mt-4" style={{ borderRadius: '1rem', padding: '1.25rem' }}>
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Agent Summary</p>
                <div className="flex items-center gap-4 mb-4">
                  <AgentBot
                    name={formData.name || 'New'}
                    avatar={formData.name.slice(0, 2).toUpperCase() || 'NW'}
                    color={formData.color}
                    photoUrl={photoPreviewUrl || formData.photoUrl || undefined}
                    size={52}
                  />
                  <div>
                    <p className="font-bold text-text-primary">{formData.name || '—'}</p>
                    <p className="text-xs text-text-secondary">{formData.role || '—'}</p>
                    <p className="text-xs text-text-dim capitalize mt-0.5">{formData.division}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center text-xs">
                  <div className="bg-[#f1f5f9] rounded-xl p-2">
                    <p className="font-bold text-[#9b6dff]">{formData.skills.length}</p>
                    <p className="text-text-dim">Skills</p>
                  </div>
                  <div className="bg-[#f1f5f9] rounded-xl p-2">
                    <p className="font-bold text-[#4f8ef7]">{formData.tools.length}</p>
                    <p className="text-text-dim">Tools</p>
                  </div>
                  <div className="bg-[#f1f5f9] rounded-xl p-2">
                    <p className="font-bold text-[#00d4aa]">{formData.responsibilities.length}</p>
                    <p className="text-text-dim">Tasks</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-[#e2e8f0] flex items-center justify-between text-xs">
                  <span className="text-text-dim">Model</span>
                  <span className="font-medium text-text-primary">
                    {getMergedModels(formData.provider).find((m) => m.id === formData.model)?.label || formData.model || '—'}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer navigation */}
        <div className="form-footer">
          <div className="flex items-center gap-2">
            <button
              onClick={() => (step === 0 ? onClose() : setStep((s) => s - 1))}
              className="flex items-center gap-2 px-4 py-2 text-sm text-text-dim hover:text-text-primary transition-colors"
            >
              {step === 0 ? (
                'Cancel'
              ) : (
                <>
                  <ChevronLeft size={16} />
                  Back
                </>
              )}
            </button>
            {/* Delete — only visible when editing an existing agent */}
            {!isCreating && (
              <button
                onClick={() => setConfirmingDelete(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-400 hover:text-red-500 hover:bg-red-500/8 rounded-xl transition-all"
              >
                <Trash2 size={14} />
                Delete
              </button>
            )}
          </div>

          <div className="flex items-center gap-1">
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`w-2 h-2 rounded-full transition-all ${i === step ? 'bg-[#9b6dff] w-4' : i < step ? 'bg-[#00d4aa]' : 'bg-[var(--border)]'}`}
              />
            ))}
          </div>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium text-white transition-all"
              style={{ background: 'linear-gradient(135deg, #9b6dff, #6f42f5)' }}
            >
              Next
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={isUploadingPhoto || isSaving || !formData.name.trim()}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #00d4aa, #0ea5c4)' }}
            >
              <Save size={16} />
              {isSaving ? 'Saving…' : isCreating ? 'Create Agent' : 'Save Changes'}
            </button>
          )}
        </div>
      </div>

      {/* Delete confirmation overlay */}
      {confirmingDelete && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-[1.5rem] z-10">
          <div className="bg-white border border-[#e2e8f0] rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/12">
                <AlertTriangle size={20} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0f172a]">Delete {agent?.name}?</h3>
                <p className="text-xs text-[#64748b] mt-0.5">This cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-[#64748b] mb-5 leading-relaxed">
              The agent will be removed from your roster and all active missions they are assigned to.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmingDelete(false)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-[#e2e8f0] text-[#64748b] hover:bg-[#f8fafc] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (agentId) deleteAgent(agentId)
                  onClose()
                }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-all"
              >
                Delete Agent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
