'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { createAppPersistenceSnapshot, useAgentsStore } from '@/lib/agents-store'
import { AgentBot } from '@/components/agents/AgentBot'
import { SkillPicker } from '@/components/ui/SkillPicker'
import { toast } from '@/components/ui/Toast'
import { X, Save } from 'lucide-react'
import type { AgencyDivision } from '@/lib/types'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser'
import { getAgentArchitectureBundle, getAgentMemoryNote, getAgentSourceOfTruthPath, getProviderRoutingNote } from '@/lib/agent-architecture'

interface AgentEditorProps {
  agentId: string | null
  onClose: () => void
}

const DIVISIONS = ['orchestration', 'client-services', 'creative', 'media', 'research', 'strategy']
const DIVISION_COLORS: Record<string, string> = {
  orchestration: '#a78bfa',
  'client-services': '#4f8ef7',
  creative: '#00d4aa',
  media: '#ff5fa0',
  research: '#38bdf8',
  strategy: '#9b6dff',
}

export function AgentEditor({ agentId, onClose }: AgentEditorProps) {
  const agents = useAgentsStore(state => state.agents)
  const updateAgent = useAgentsStore(state => state.updateAgent)
  const supabase = useMemo(() => getSupabaseBrowserClient(), [])
  const agent = agents.find(a => a.id === agentId)
  const architectureBundle = agentId ? getAgentArchitectureBundle(agentId) : null
  
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    photoUrl: '',
    bio: '',
    methodology: '',
    skills: [] as string[],
    responsibilities: [] as string[],
    tools: [] as string[],
    division: 'creative' as AgencyDivision,
    color: '#4f8ef7',
    systemPrompt: '',
    temperature: 0.7,
    maxTokens: 1536,
  })
  
  const [newResponsibility, setNewResponsibility] = useState('')
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)
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
      })
      setPhotoPreviewUrl(agent.photoUrl || null)
      latestPhotoUrlRef.current = agent.photoUrl || ''
    }
  }, [agent])

  useEffect(() => {
    return () => {
      if (photoPreviewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreviewUrl)
      }
    }
  }, [photoPreviewUrl])
  
  if (!agent) return null
  
  const handleSave = async () => {
    if (!agentId) return
    if (isUploadingPhoto) {
      setPhotoError('Please wait for the photo upload to finish before saving.')
      return
    }

    setIsSaving(true)
    setPhotoError(null)

    try {
      const effectivePhotoUrl = latestPhotoUrlRef.current || formData.photoUrl || ''
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const authHeaders = {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      }

      await fetch(`/api/agent-photos/${agentId}`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ photoUrl: effectivePhotoUrl || null }),
      }).catch(() => {})

      updateAgent(agentId, {
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
      })

      try {
        const snapshot = createAppPersistenceSnapshot(useAgentsStore.getState())
        await fetch('/api/state', {
          method: 'PUT',
          headers: {
            ...authHeaders,
          },
          body: JSON.stringify({ state: snapshot }),
        })
      } catch {
        // Let the background sync pick it up if the immediate save path fails.
      }

      toast.success(`${formData.name || agent.name} updated`)
      onClose()
    } finally {
      setIsSaving(false)
    }
  }
  
  const addSkill = (skillId: string) => {
    if (!formData.skills.includes(skillId)) {
      setFormData(prev => ({ ...prev, skills: [...prev.skills, skillId] }))
    }
  }
  
  const removeSkill = (skillId: string) => {
    setFormData(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skillId) }))
  }
  
  const addResponsibility = () => {
    const resp = newResponsibility.trim()
    if (resp && !formData.responsibilities.includes(resp)) {
      setFormData(prev => ({ ...prev, responsibilities: [...prev.responsibilities, resp] }))
      setNewResponsibility('')
    }
  }
  
  const removeResponsibility = (r: string) => {
    setFormData(prev => ({ ...prev, responsibilities: prev.responsibilities.filter(item => item !== r) }))
  }

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!agentId) return

    setIsUploadingPhoto(true)
    setPhotoError(null)

    try {
      const localPreview = URL.createObjectURL(file)
      setPhotoPreviewUrl((current) => {
        if (current?.startsWith('blob:')) URL.revokeObjectURL(current)
        return localPreview
      })

      const normalizedFile = await normalizeImageUpload(file, agentId)
      const body = new FormData()
      body.append('file', normalizedFile)
      body.append('agentId', agentId)
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const response = await fetch('/api/agent-photos/upload', {
        method: 'POST',
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : undefined,
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
      updateAgent(agentId, { photoUrl: payload.photoUrl })
      setPhotoError(null)
      toast.success(`${agent.name} avatar uploaded`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload photo'
      setPhotoError(message)
      toast.error(message)
    } finally {
      setIsUploadingPhoto(false)
    }

    event.target.value = ''
  }

  const normalizeImageUpload = async (file: File, currentAgentId: string): Promise<File> => {
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
        canvas.toBlob((result) => {
          if (result) resolve(result)
          else reject(new Error('Could not compress image'))
        }, 'image/webp', 0.86)
      })

      return new File([blob], `${currentAgentId}-avatar.webp`, { type: 'image/webp' })
    } finally {
      URL.revokeObjectURL(imageUrl)
    }
  }
  
  return (
    <div className="fixed inset-0 bg-black/55 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="editor-theme bg-[var(--bg-panel)] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-border shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-4">
            <AgentBot
              name={formData.name || agent.name}
              avatar={agent.avatar}
              color={formData.color}
              photoUrl={photoPreviewUrl || formData.photoUrl || agent.photoUrl}
              size={40}
            />
            <div>
              <h2 className="text-xl font-bold text-text-primary">Edit Agent</h2>
              <p className="text-sm text-text-secondary">{formData.name || agent.name} — {formData.role || agent.role}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--bg-hover)] rounded-lg text-text-dim hover:text-text-primary">
            <X size={20} />
          </button>
        </div>
        
        {/* Form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-text-primary">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="editor-input w-full px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-text-primary">Role</label>
              <input
                type="text"
                value={formData.role}
                onChange={e => setFormData(prev => ({ ...prev, role: e.target.value }))}
                className="editor-input w-full px-3 py-2 text-sm"
              />
            </div>
          </div>

          {architectureBundle ? (
            <div className="rounded-2xl border border-border bg-[var(--bg-elevated)] p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-text-primary">Architecture Source Of Truth</p>
                  <p className="text-xs text-text-dim mt-1">
                    This agent now loads from folder-based architecture files. Use the app here for avatar changes; use the config files for behavioral edits.
                  </p>
                </div>
                <code className="text-[11px] text-text-dim bg-[var(--bg-panel)] px-2 py-1 rounded-md">
                  {getAgentSourceOfTruthPath(agent.id)}
                </code>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-border bg-[var(--bg-panel)] p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-text-dim mb-1">Soul</p>
                  <p className="text-text-secondary line-clamp-4">{architectureBundle.soul.split('\n').find(line => line.trim() && !line.startsWith('#'))}</p>
                </div>
                <div className="rounded-xl border border-border bg-[var(--bg-panel)] p-3">
                  <p className="text-xs uppercase tracking-[0.14em] text-text-dim mb-1">Runtime</p>
                  <p className="text-text-secondary">{getProviderRoutingNote(agent.provider, agent.model)}</p>
                </div>
                <div className="rounded-xl border border-border bg-[var(--bg-panel)] p-3 md:col-span-2">
                  <p className="text-xs uppercase tracking-[0.14em] text-text-dim mb-1">Memory</p>
                  <p className="text-text-secondary">{getAgentMemoryNote()}</p>
                </div>
              </div>
            </div>
          ) : null}

          <div>
            <label className="block text-sm font-medium mb-2 text-text-primary">Personal Photo</label>
            <div className="flex items-center gap-4">
              <div className="rounded-2xl border border-border bg-[var(--bg-elevated)] p-3">
                <AgentBot
                  name={formData.name || agent.name}
                  avatar={agent.avatar}
                  color={formData.color}
                  photoUrl={photoPreviewUrl || formData.photoUrl || undefined}
                  size={72}
                />
              </div>
              <div className="space-y-2">
                <input
                  id="agent-photo-upload"
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="absolute w-px h-px opacity-0 pointer-events-none"
                  onChange={handlePhotoUpload}
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isUploadingPhoto}
                    onClick={() => photoInputRef.current?.click()}
                    className="inline-flex items-center px-4 py-2 rounded-lg text-sm editor-button-secondary disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isUploadingPhoto ? 'Uploading...' : 'Upload Photo'}
                  </button>
                  {formData.photoUrl && (
                    <span className="text-xs text-emerald-500">Photo selected</span>
                  )}
                  {isUploadingPhoto && (
                    <span className="text-xs text-amber-500">Uploading...</span>
                  )}
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, photoUrl: '' }))
                      latestPhotoUrlRef.current = ''
                      setPhotoPreviewUrl(null)
                      if (agentId) {
                        updateAgent(agentId, { photoUrl: undefined })
                      }
                      toast.info('Using default agent icon')
                    }}
                    className="text-xs text-text-dim hover:text-text-primary"
                  >
                    Use default icon
                  </button>
                </div>
                <p className="text-xs text-text-dim max-w-md">
                  Upload a square or portrait photo. It is saved to the app uploads folder and reused anywhere this agent appears.
                </p>
                {photoError ? <p className="text-xs text-red-400">{photoError}</p> : null}
              </div>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 text-text-primary">Bio</label>
            <textarea
              value={formData.bio}
              onChange={e => setFormData(prev => ({ ...prev, bio: e.target.value }))}
              rows={2}
              className="editor-textarea w-full px-3 py-2 text-sm resize-none"
              placeholder="Brief description of the agent..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 text-text-primary">Methodology</label>
            <input
              type="text"
              value={formData.methodology}
              onChange={e => setFormData(prev => ({ ...prev, methodology: e.target.value }))}
              className="editor-input w-full px-3 py-2 text-sm"
              placeholder="e.g., Agile/Scrum + Design Thinking"
            />
          </div>
          
          {/* Division */}
          <div>
            <label className="block text-sm font-medium mb-2 text-text-primary">Division</label>
            <div className="flex gap-2 flex-wrap">
              {DIVISIONS.map(div => (
                <button
                  key={div}
                  onClick={() => setFormData(prev => ({ ...prev, division: div as AgencyDivision, color: DIVISION_COLORS[div] }))}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    backgroundColor: formData.division === div ? DIVISION_COLORS[div] + '20' : '#1a1d26',
                    color: formData.division === div ? DIVISION_COLORS[div] : 'var(--text-secondary)',
                    border: formData.division === div ? `1px solid ${DIVISION_COLORS[div]}` : '1px solid var(--border)',
                  }}
                >
                  {div}
                </button>
              ))}
            </div>
          </div>
          
          {/* Skills - Using Picker */}
          <div>
            <label className="block text-sm font-medium mb-2 text-text-primary">Skills</label>
            <p className="text-xs text-text-dim mb-3">Select from the skills library. Each skill includes detailed prompts and instructions.</p>
            <SkillPicker
              selectedSkillIds={formData.skills}
              onAddSkill={addSkill}
              onRemoveSkill={removeSkill}
            />
          </div>
          
          {/* Responsibilities */}
          <div>
            <label className="block text-sm font-medium mb-2 text-text-primary">Responsibilities</label>
            <p className="text-xs text-text-dim mb-2">What this agent is responsible for</p>
            <div className="space-y-1 mb-2">
              {formData.responsibilities.length === 0 && (
                <span className="text-xs text-text-dim italic">No responsibilities added yet</span>
              )}
              {formData.responsibilities.map(r => (
                <div key={r} className="editor-panel-muted flex items-center gap-2 px-3 py-1.5 text-sm">
                  <span className="flex-1">{r}</span>
                  <button onClick={() => removeResponsibility(r)} className="text-text-dim hover:text-red-400">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newResponsibility}
                onChange={e => setNewResponsibility(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (addResponsibility(), setNewResponsibility(''))}
                className="editor-input flex-1 px-3 py-2 text-sm"
                placeholder="Type a responsibility and press Enter..."
              />
              <button onClick={() => { addResponsibility(); setNewResponsibility('') }} className="editor-button-primary px-4 py-2 rounded-lg text-sm">
                Add
              </button>
            </div>
          </div>
          
          {/* Tools */}
          <div>
            <label className="block text-sm font-medium mb-2 text-text-primary">Tools</label>
            <div className="flex flex-wrap gap-2">
              {['web-search', 'analytics', 'document', 'spreadsheet', 'presentation', 'image-gen', 'figma', 'canva'].map(tool => {
                const isSelected = formData.tools.includes(tool)
                return (
                  <button
                    key={tool}
                    onClick={() => {
                      if (isSelected) {
                        setFormData(prev => ({ ...prev, tools: prev.tools.filter(t => t !== tool) }))
                      } else {
                        setFormData(prev => ({ ...prev, tools: [...prev.tools, tool] }))
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs transition-all"
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
          
          {/* AI Settings */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-text-primary">Temperature</label>
              <input
                type="number"
                value={formData.temperature}
                onChange={e => setFormData(prev => ({ ...prev, temperature: parseFloat(e.target.value) || 0.7 }))}
                step={0.1}
                min={0}
                max={1}
                className="editor-input w-full px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-text-primary">Max Tokens</label>
              <input
                type="number"
                value={formData.maxTokens}
                onChange={e => setFormData(prev => ({ ...prev, maxTokens: parseInt(e.target.value) || 1536 }))}
                className="editor-input w-full px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-text-primary">Color</label>
              <input
                type="color"
                value={formData.color}
                onChange={e => setFormData(prev => ({ ...prev, color: e.target.value }))}
                className="w-full h-10 bg-[var(--bg-elevated)] rounded-lg cursor-pointer border border-border"
              />
            </div>
          </div>
          
          {/* System Prompt */}
          <div>
            <label className="block text-sm font-medium mb-1 text-text-primary">System Prompt</label>
            <textarea
              value={formData.systemPrompt}
              onChange={e => setFormData(prev => ({ ...prev, systemPrompt: e.target.value }))}
              rows={6}
              className="editor-textarea w-full px-3 py-2 text-sm font-mono resize-none"
              placeholder="Agent system prompt..."
            />
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-border flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-text-dim hover:text-text-primary">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isUploadingPhoto || isSaving}
            className="editor-button-primary px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            {isSaving ? 'Saving...' : isUploadingPhoto ? 'Uploading photo...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
