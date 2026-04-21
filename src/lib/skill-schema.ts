// Skill schema - follows Claude best practices for solid skills
export interface SkillVariable {
  name: string
  type: 'string' | 'number' | 'boolean' | 'select'
  required: boolean
  description: string
  default?: string
  options?: string[]
}

export interface SkillWorkflowStep {
  step: number
  name: string
  action: string
  verify: string
}

export interface SkillExample {
  input: string
  output: string
}

export interface SkillIOField {
  name: string
  type: string
  required?: boolean
  description: string
}

export interface SkillBundleFile {
  relativePath: string
  role: 'skill' | 'readme' | 'reference' | 'template' | 'script' | 'asset'
  size: number
}

export interface Skill {
  $schema?: string
  id: string            // unique identifier (kebab-case, matches filename)
  name: string          // kebab-case, max 64 chars
  description: string   // max 1024 chars, third person, what + when
  category: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  freedom: 'high' | 'medium' | 'low'  // How much guidance to give
  
  prompts: {
    en: {
      trigger: string           // When to use this skill
      context: string          // Agent persona and context
      instructions: string     // Step-by-step workflow with checklist
      output_template: string  // Expected output structure
    }
    ar?: {
      trigger: string
      context: string
      instructions: string
      output_template: string
    }
  }
  
  variables: SkillVariable[]
  inputs?: SkillIOField[]
  outputs?: SkillIOField[]
  workflow?: {
    steps: SkillWorkflowStep[]
  }
  examples?: SkillExample[]
  checklist: string[]           // Verification checklist
  tools?: string[]             // Required tools
  agents?: string[]            // Relevant agents
  pipelines?: string[]         // Related pipelines
  
  metadata: {
    version: string
    author?: string
    tags?: string[]
    lastUpdated: string
    bundle?: {
      type: string
      entry: string
      files: SkillBundleFile[]
    }
  }
}

// Freedom levels guide:
// HIGH: When multiple valid approaches exist, trust the model
// MEDIUM: Preferred pattern exists but some variation OK  
// LOW: Specific sequence required, consistency critical

// Skill categories
export const SKILL_CATEGORIES = [
  { id: 'strategy', name: 'Strategy & Planning', color: '#a78bfa' },
  { id: 'creative', name: 'Creative & Copy', color: '#f472b6' },
  { id: 'media', name: 'Media & Advertising', color: '#38bdf8' },
  { id: 'research', name: 'Research & Analytics', color: '#34d399' },
  { id: 'operations', name: 'Operations & Workflow', color: '#fb923c' },
  { id: 'client-services', name: 'Client Services', color: '#60a5fa' },
  { id: 'content', name: 'Content Production', color: '#a3e635' },
] as const

export const DIFFICULTY_LEVELS = [
  { value: 'beginner', label: 'Beginner', description: 'Straightforward tasks with clear outcomes' },
  { value: 'intermediate', label: 'Intermediate', description: 'Requires some judgment and context' },
  { value: 'advanced', label: 'Advanced', description: 'Complex strategic work with multiple dependencies' },
] as const

export const FREEDOM_LEVELS = [
  { value: 'high', label: 'High Freedom', description: 'Multiple valid approaches — give direction, trust the model' },
  { value: 'medium', label: 'Medium Freedom', description: 'Preferred pattern exists — allow some variation' },
  { value: 'low', label: 'Low Freedom', description: 'Specific sequence required — be explicit and exact' },
] as const
