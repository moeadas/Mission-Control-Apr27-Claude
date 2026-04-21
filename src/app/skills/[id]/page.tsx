'use client'

import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { SKILL_CATEGORIES, DIFFICULTY_LEVELS, FREEDOM_LEVELS, type Skill } from '@/lib/skill-schema'
import { ClientShell } from '@/components/ClientShell'
import { Save, Plus, Trash2, X, ChevronDown, ChevronRight, BookOpen, Workflow, ListChecks, Lightbulb, FileText, MessageSquare, Settings } from 'lucide-react'
import { clsx } from 'clsx'
import { getSupabaseAccessToken } from '@/lib/supabase/browser'

interface SkillEditorProps {
  isModal?: boolean
  onClose?: () => void
}

const EMPTY_SKILL = (): Partial<Skill> => ({
  name: '',
  description: '',
  category: 'strategy',
  difficulty: 'intermediate',
  freedom: 'medium',
  prompts: {
    en: {
      trigger: '',
      context: '',
      instructions: '',
      output_template: '',
    }
  },
  variables: [],
  checklist: [],
  metadata: {
    version: '1.0',
    tags: [],
    lastUpdated: new Date().toISOString().split('T')[0],
  },
})

export default function SkillEditorPage({ isModal, onClose }: SkillEditorProps & { onSave?: (skill: Skill) => void }) {
  const params = useParams()
  const skillId = params.id as string | undefined
  const isNew = skillId === 'new'
  const [skill, setSkill] = useState<Partial<Skill>>(EMPTY_SKILL())
  const [activeTab, setActiveTab] = useState<'main' | 'workflow' | 'examples' | 'advanced'>('main')
  const [expandedSection, setExpandedSection] = useState<string | null>('prompt-en')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (skillId && !isNew) {
      const loadSkill = async () => {
        const token = await getSupabaseAccessToken()
        const response = await fetch(`/api/skills/${skillId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        return response.ok ? response.json() : Promise.reject(new Error('Failed to load skill'))
      }

      loadSkill()
        .then(data => setSkill(data))
        .catch(() => {
          const skills = (window as any).__AGENCY_SKILLS__ || []
          const found = skills.find((s: any) => s.id === skillId || s.name === skillId)
          if (found) setSkill(found)
        })
    }
  }, [isNew, skillId])

  const updatePrompt = (lang: 'en' | 'ar', field: string, value: string) => {
    setSkill(prev => {
      const currentPrompts = prev.prompts || { en: { trigger: '', context: '', instructions: '', output_template: '' }, ar: { trigger: '', context: '', instructions: '', output_template: '' } }
      const currentLangPrompt = currentPrompts[lang] || { trigger: '', context: '', instructions: '', output_template: '' }
      return {
        ...prev,
        prompts: {
          ...currentPrompts,
          [lang]: {
            ...currentLangPrompt,
            [field]: value,
          }
        }
      } as Partial<Skill>
    })
  }

  const addVariable = () => {
    setSkill(prev => ({
      ...prev,
      variables: [...(prev.variables || []), { name: '', type: 'string', required: false, description: '' }]
    }))
  }

  const updateVariable = (index: number, field: string, value: any) => {
    setSkill(prev => ({
      ...prev,
      variables: prev.variables?.map((v, i) => i === index ? { ...v, [field]: value } : v) || []
    }))
  }

  const removeVariable = (index: number) => {
    setSkill(prev => ({
      ...prev,
      variables: prev.variables?.filter((_, i) => i !== index) || []
    }))
  }

  const addChecklistItem = () => {
    setSkill(prev => ({
      ...prev,
      checklist: [...(prev.checklist || []), '']
    }))
  }

  const updateChecklistItem = (index: number, value: string) => {
    setSkill(prev => ({
      ...prev,
      checklist: prev.checklist?.map((c, i) => i === index ? value : c) || []
    }))
  }

  const removeChecklistItem = (index: number) => {
    setSkill(prev => ({
      ...prev,
      checklist: prev.checklist?.filter((_, i) => i !== index) || []
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const normalizedId = (skill.id || skill.name || '')
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
      const payload = {
        ...skill,
        id: normalizedId,
        name: skill.name || normalizedId,
      }
      const token = await getSupabaseAccessToken()
      const response = await fetch(!isNew ? `/api/skills/${skillId}` : '/api/skills', {
        method: !isNew ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })
      if (response.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } catch (error) {
      console.error('Failed to save skill:', error)
    }
    setSaving(false)
  }

  const content = (
    <div className="editor-theme space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="editor-heading text-xl font-bold">
            {!isNew ? 'Edit Skill' : 'Create New Skill'}
          </h1>
          <p className="editor-subtle text-sm mt-1">
            Build solid, reusable skills following best practices
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className={clsx(
              'px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all',
              saved
                ? 'bg-green-500/20 text-green-400'
                : 'editor-button-primary'
            )}
          >
            <Save size={16} />
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Skill'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {[
          { id: 'main', label: 'Main', icon: BookOpen },
          { id: 'workflow', label: 'Workflow', icon: Workflow },
          { id: 'examples', label: 'Examples', icon: Lightbulb },
          { id: 'advanced', label: 'Advanced', icon: Settings },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={clsx(
              'editor-tab flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'editor-tab-active'
                : 'hover:text-text-primary'
            )}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Tab */}
      {activeTab === 'main' && (
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="editor-panel p-5 space-y-4">
            <h3 className="text-sm font-semibold text-text-primary">Basic Information</h3>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">Skill Name (kebab-case)</label>
                <input
                  type="text"
                  value={skill.name || ''}
                  onChange={e => {
                    const value = e.target.value.toLowerCase().replace(/\s+/g, '-')
                    setSkill(prev => ({ ...prev, id: value, name: value }))
                  }}
                  placeholder="brand-strategy"
                  className="editor-input px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">Category</label>
                <select
                  value={skill.category || 'strategy'}
                  onChange={e => setSkill(prev => ({ ...prev, category: e.target.value }))}
                  className="editor-select px-3 py-2 text-sm"
                >
                  {SKILL_CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-1.5">Difficulty</label>
                <select
                  value={skill.difficulty || 'intermediate'}
                  onChange={e => setSkill(prev => ({ ...prev, difficulty: e.target.value as any }))}
                  className="editor-select px-3 py-2 text-sm"
                >
                  {DIFFICULTY_LEVELS.map(diff => (
                    <option key={diff.value} value={diff.value}>{diff.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-text-secondary mb-1.5">Description (third person, max 1024 chars)</label>
              <textarea
                value={skill.description || ''}
                onChange={e => setSkill(prev => ({ ...prev, description: e.target.value.slice(0, 1024) }))}
                placeholder="Processes Excel files and generates reports. Use when working with spreadsheets, tabular data, or .xlsx files."
                rows={2}
                className="editor-textarea px-3 py-2 text-sm resize-none"
              />
              <p className="text-[10px] text-text-dim mt-1">{skill.description?.length || 0}/1024</p>
            </div>
          </div>

          {/* Prompts Section */}
          <div className="editor-panel overflow-hidden">
            <button
              onClick={() => setExpandedSection(expandedSection === 'prompt-en' ? null : 'prompt-en')}
              className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-[var(--bg-elevated)]"
            >
              <div className="flex items-center gap-3">
                <MessageSquare size={18} className="text-accent-purple" />
                <span className="text-sm font-semibold text-text-primary">English Prompts</span>
                <span className="text-xs text-text-dim">(Primary)</span>
              </div>
              {expandedSection === 'prompt-en' ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
            </button>
            
            {expandedSection === 'prompt-en' && (
              <div className="px-5 pb-5 space-y-4 border-t border-border pt-4">
                <div>
                  <label className="block text-xs text-text-secondary mb-1.5">Trigger (When to use this skill)</label>
                  <input
                    type="text"
                    value={skill.prompts?.en?.trigger || ''}
                    onChange={e => updatePrompt('en', 'trigger', e.target.value)}
                    placeholder="Use when working with PDF files, forms, or document extraction."
                    className="editor-input px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1.5">Context (Agent persona)</label>
                  <textarea
                    value={skill.prompts?.en?.context || ''}
                    onChange={e => updatePrompt('en', 'context', e.target.value)}
                    placeholder="You are a PDF processing specialist with expertise in document extraction, form filling, and document manipulation."
                    rows={2}
                    className="editor-textarea px-3 py-2 text-sm resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1.5">Instructions (Step-by-step workflow)</label>
                  <textarea
                    value={skill.prompts?.en?.instructions || ''}
                    onChange={e => updatePrompt('en', 'instructions', e.target.value)}
                    placeholder={`## Task Workflow

Follow these steps:

- [ ] 1. Analyze the input
- [ ] 2. Process according to requirements
- [ ] 3. Validate output
- [ ] 4. Format and deliver

Use tools: pdfplumber, pypdf`}
                    rows={8}
                    className="editor-textarea px-3 py-2 text-sm font-mono resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-text-secondary mb-1.5">Output Template</label>
                  <textarea
                    value={skill.prompts?.en?.output_template || ''}
                    onChange={e => updatePrompt('en', 'output_template', e.target.value)}
                    placeholder={`## Output Structure

### Summary
[1-2 sentence overview]

### Details
[Detailed findings]

### Recommendations
1. [Specific action item]
2. [Specific action item]`}
                    rows={6}
                    className="editor-textarea px-3 py-2 text-sm font-mono resize-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Variables */}
          <div className="editor-panel p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText size={18} className="text-accent-purple" />
                <h3 className="text-sm font-semibold text-text-primary">Variables</h3>
                <span className="text-xs text-text-dim">(&#123;&#123;placeholder&#125;&#125; syntax)</span>
              </div>
              <button
                onClick={addVariable}
                className="editor-button-secondary px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1"
              >
                <Plus size={14} /> Add Variable
              </button>
            </div>
            
            <div className="space-y-2">
              {skill.variables?.map((variable, i) => (
                <div key={i} className="editor-panel-muted flex gap-3 items-start p-3">
                  <input
                    type="text"
                    value={variable.name}
                    onChange={e => updateVariable(i, 'name', e.target.value)}
                    placeholder="variable_name"
                    className="editor-input flex-1 px-3 py-1.5 text-sm"
                  />
                  <select
                    value={variable.type}
                    onChange={e => updateVariable(i, 'type', e.target.value)}
                    className="editor-select px-3 py-1.5 text-sm"
                  >
                    <option value="string">String</option>
                    <option value="number">Number</option>
                    <option value="boolean">Boolean</option>
                  </select>
                  <label className="flex items-center gap-1.5 text-xs text-text-secondary py-1.5">
                    <input
                      type="checkbox"
                      checked={variable.required}
                      onChange={e => updateVariable(i, 'required', e.target.checked)}
                      className="rounded"
                    />
                    Required
                  </label>
                  <input
                    type="text"
                    value={variable.description}
                    onChange={e => updateVariable(i, 'description', e.target.value)}
                    placeholder="Description"
                    className="editor-input flex-1 px-3 py-1.5 text-sm"
                  />
                  <button onClick={() => removeVariable(i)} className="p-1.5 text-text-dim hover:text-red-400">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {(!skill.variables || skill.variables.length === 0) && (
                <p className="text-sm text-text-dim italic text-center py-4">
                  No variables yet. Add &#123;&#123;variableName&#125;&#125; placeholders used in your prompts.
                </p>
              )}
            </div>
          </div>

          {/* Checklist */}
          <div className="editor-panel p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ListChecks size={18} className="text-accent-purple" />
                <h3 className="text-sm font-semibold text-text-primary">Quality Checklist</h3>
                <span className="text-xs text-text-dim">(Verification steps)</span>
              </div>
              <button
                onClick={addChecklistItem}
                className="editor-button-secondary px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1"
              >
                <Plus size={14} /> Add Item
              </button>
            </div>
            
            <div className="space-y-2">
              {skill.checklist?.map((item, i) => (
                <div key={i} className="editor-panel-muted flex gap-3 items-center p-3">
                  <span className="text-xs text-text-dim w-6">#{i + 1}</span>
                  <input
                    type="text"
                    value={item}
                    onChange={e => updateChecklistItem(i, e.target.value)}
                    placeholder="Verification item..."
                    className="editor-input flex-1 px-3 py-1.5 text-sm"
                  />
                  <button onClick={() => removeChecklistItem(i)} className="p-1.5 text-text-dim hover:text-red-400">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {(!skill.checklist || skill.checklist.length === 0) && (
                <p className="text-sm text-text-dim italic text-center py-4">
                  No checklist items. Add quality checkpoints for verification.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Workflow Tab */}
      {activeTab === 'workflow' && (
        <div className="space-y-4">
          <div className="editor-panel p-5">
            <div className="flex items-center gap-3 mb-4">
              <Workflow size={18} className="text-accent-purple" />
              <h3 className="text-sm font-semibold text-text-primary">Workflow Steps</h3>
            </div>
            <p className="text-xs text-text-secondary mb-4">
              Define explicit steps with verification criteria. Use for complex, multi-step tasks.
            </p>
            
            <div className="space-y-3">
              {skill.workflow?.steps?.map((step, i) => (
                <div key={i} className="editor-panel-muted p-4 space-y-2">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="w-8 h-8 rounded-full bg-accent-purple/15 text-accent-purple flex items-center justify-center text-sm font-bold">
                      {step.step}
                    </span>
                    <input
                      type="text"
                      value={step.name}
                      onChange={e => {
                        const newSteps = [...(skill.workflow?.steps || [])]
                        newSteps[i] = { ...step, name: e.target.value }
                      setSkill(prev => ({ ...prev, workflow: { steps: newSteps } }))
                    }}
                    placeholder="Step name"
                    className="editor-input flex-1 px-3 py-1.5 text-sm"
                  />
                  </div>
                  <textarea
                    value={step.action}
                    onChange={e => {
                      const newSteps = [...(skill.workflow?.steps || [])]
                      newSteps[i] = { ...step, action: e.target.value }
                      setSkill(prev => ({ ...prev, workflow: { steps: newSteps } }))
                    }}
                    placeholder="What to do in this step..."
                    rows={2}
                    className="editor-textarea w-full px-3 py-2 text-sm resize-none mb-2"
                  />
                  <input
                    type="text"
                    value={step.verify}
                    onChange={e => {
                      const newSteps = [...(skill.workflow?.steps || [])]
                      newSteps[i] = { ...step, verify: e.target.value }
                      setSkill(prev => ({ ...prev, workflow: { steps: newSteps } }))
                    }}
                    placeholder="How to verify completion..."
                    className="editor-input w-full px-3 py-1.5 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Examples Tab */}
      {activeTab === 'examples' && (
        <div className="space-y-4">
          <div className="editor-panel p-5">
            <div className="flex items-center gap-3 mb-4">
              <Lightbulb size={18} className="text-accent-purple" />
              <h3 className="text-sm font-semibold text-text-primary">Examples</h3>
            </div>
            <p className="text-xs text-text-secondary mb-4">
              Input/output pairs help the model understand desired output quality and format.
            </p>
            
            <div className="space-y-4">
              {skill.examples?.map((example, i) => (
                <div key={i} className="editor-panel-muted p-4 space-y-3">
                  <div>
                    <label className="block text-xs text-text-secondary mb-1.5">Input</label>
                    <textarea
                      value={example.input}
                      onChange={e => {
                        const newExamples = [...(skill.examples || [])]
                        newExamples[i] = { ...example, input: e.target.value }
                        setSkill(prev => ({ ...prev, examples: newExamples }))
                      }}
                      placeholder="User request or input..."
                      rows={2}
                      className="editor-textarea w-full px-3 py-2 text-sm resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-text-secondary mb-1.5">Expected Output</label>
                    <textarea
                      value={example.output}
                      onChange={e => {
                        const newExamples = [...(skill.examples || [])]
                        newExamples[i] = { ...example, output: e.target.value }
                        setSkill(prev => ({ ...prev, examples: newExamples }))
                      }}
                      placeholder="What the skill should produce..."
                      rows={4}
                      className="editor-textarea w-full px-3 py-2 text-sm resize-none"
                    />
                  </div>
                  <button
                    onClick={() => setSkill(prev => ({ ...prev, examples: prev.examples?.filter((_, j) => j !== i) || [] }))}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Remove example
                  </button>
                </div>
              ))}
              <button
                onClick={() => setSkill(prev => ({ ...prev, examples: [...(prev.examples || []), { input: '', output: '' }] }))}
                className="editor-button-secondary w-full px-4 py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
              >
                <Plus size={16} /> Add Example
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Tab */}
      {activeTab === 'advanced' && (
        <div className="space-y-4">
          <div className="editor-panel p-5 space-y-4">
            <h3 className="text-sm font-semibold text-text-primary">Freedom Level</h3>
            <p className="text-xs text-text-secondary">
              How much flexibility to give the model when executing this skill.
            </p>
            <div className="grid grid-cols-3 gap-3">
              {FREEDOM_LEVELS.map(level => (
                <button
                  key={level.value}
                  onClick={() => setSkill(prev => ({ ...prev, freedom: level.value as any }))}
                  className={clsx(
                    'p-4 rounded-lg border text-left transition-all',
                    skill.freedom === level.value
                      ? 'border-accent-purple bg-accent-purple/10'
                      : 'border-border hover:border-border-glow'
                  )}
                >
                  <p className="text-sm font-medium text-text-primary">{level.label}</p>
                  <p className="text-xs text-text-secondary mt-1">{level.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="editor-panel p-5 space-y-4">
            <h3 className="text-sm font-semibold text-text-primary">Linked Agents & Pipelines</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-text-secondary mb-2">Assigned Agents</label>
                <input
                  type="text"
                  value={skill.agents?.join(', ') || ''}
                  onChange={e => setSkill(prev => ({ ...prev, agents: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                  placeholder="iris, maya, sage"
                  className="editor-input w-full px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-text-secondary mb-2">Related Pipelines</label>
                <input
                  type="text"
                  value={skill.pipelines?.join(', ') || ''}
                  onChange={e => setSkill(prev => ({ ...prev, pipelines: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))}
                  placeholder="campaign-brief, content-calendar"
                  className="editor-input w-full px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  if (isModal) {
    return (
      <div className="fixed inset-0 bg-black/55 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <div className="editor-theme bg-[var(--bg-panel)] rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-border shadow-2xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border">
            <h2 className="text-lg font-bold text-text-primary">Edit Skill</h2>
            <button onClick={onClose} className="p-2 hover:bg-[var(--bg-hover)] rounded-lg text-text-dim hover:text-text-primary">
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {content}
          </div>
        </div>
      </div>
    )
  }

  return (
    <ClientShell>
      <div className="flex-1 overflow-y-auto">
        {content}
      </div>
    </ClientShell>
  )
}
