// Standard Skill Format
// Skills can be imported as .md or .zip packages

export interface SkillDefinition {
  id: string
  name: string
  description: string
  category: string
  prompts: {
    en: string
    ar?: string
  }
  variables?: string[]  // {{variable}} names used in prompts
  inputs?: string[]    // what the skill needs to run
  outputs?: string[]   // what the skill produces
  checklist?: string[]  // step-by-step actions
  examples?: {
    input: string
    output: string
  }[]
  metadata?: {
    author?: string
    version?: string
    tags?: string[]
    difficulty?: 'beginner' | 'intermediate' | 'advanced'
  }
}

// Skill Package (from zip or parsed md)
export interface SkillPackage {
  skill: SkillDefinition
  assets?: {
    name: string
    content: string
    type: 'prompt-template' | 'example' | 'reference' | 'config'
  }[]
}

// Parse skill from markdown content
export function parseSkillFromMarkdown(content: string): SkillPackage | null {
  try {
    // Try to extract frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
    const frontmatter = frontmatterMatch ? parseFrontmatter(frontmatterMatch[1]) : {}
    
    // Extract main sections
    const sections = extractSections(content)
    
    // Build skill definition
    const skill: SkillDefinition = {
      id: frontmatter.id || sections.name?.toLowerCase().replace(/\s+/g, '-') || `skill-${Date.now()}`,
      name: sections.name || frontmatter.name || 'Untitled Skill',
      description: sections.description || frontmatter.description || '',
      category: frontmatter.category || 'uncategorized',
      prompts: {
        en: sections.prompt || frontmatter.prompt_en || '',
        ar: sections.prompt_ar || frontmatter.prompt_ar,
      },
      variables: extractVariables(sections.prompt || ''),
      inputs: sections.inputs ? sections.inputs.split('\n').map(s => s.trim()).filter(Boolean) : [],
      outputs: sections.outputs ? sections.outputs.split('\n').map(s => s.trim()).filter(Boolean) : [],
      checklist: sections.checklist ? sections.checklist.split('\n').map(s => s.replace(/^[-*\d.]\s*/, '').trim()).filter(Boolean) : [],
      examples: sections.examples ? parseExamples(sections.examples) : [],
      metadata: {
        author: frontmatter.author,
        version: frontmatter.version,
        tags: frontmatter.tags ? frontmatter.tags.split(',').map(t => t.trim()) : [],
        difficulty: frontmatter.difficulty as 'beginner' | 'intermediate' | 'advanced' | undefined,
      },
    }
    
    return { skill, assets: [] }
  } catch (error) {
    console.error('Failed to parse skill from markdown:', error)
    return null
  }
}

function parseFrontmatter(text: string): Record<string, string> {
  const result: Record<string, string> = {}
  const lines = text.split('\n')
  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.*)$/)
    if (match) {
      result[match[1]] = match[2].trim()
    }
  }
  return result
}

function extractSections(content: string): Record<string, string> {
  const sections: Record<string, string> = {}
  
  // Remove frontmatter
  const withoutFrontmatter = content.replace(/^---\n[\s\S]*?\n---\n*/, '')
  
  // Extract named sections (## Section Name)
  const sectionPattern = /^##\s+(.+?)\s*\n([\s\S]*?)(?=^##\s+|\n$)/gm
  let match
  while ((match = sectionPattern.exec(withoutFrontmatter)) !== null) {
    sections[match[1].toLowerCase().replace(/\s+/g, '-')] = match[2].trim()
  }
  
  // Fallback: extract first paragraph as description
  if (!sections.description) {
    const firstPara = withoutFrontmatter.match(/^#\s+.+?\n\n([\s\S]+?)(?=\n\n##|$)/)
    if (firstPara) {
      sections.description = firstPara[1].trim()
    }
  }
  
  return sections
}

function extractVariables(prompt: string): string[] {
  const matches = prompt.match(/\{\{(\w+)\}\}/g)
  if (!matches) return []
  return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))]
}

function parseExamples(examplesText: string): SkillDefinition['examples'] {
  const examples: SkillDefinition['examples'] = []
  const blocks = examplesText.split(/\n(?=\d+\.)/)
  for (const block of blocks) {
    const inputMatch = block.match(/Input:?\s*([\s\S]*?)(?=Output:|$)/i)
    const outputMatch = block.match(/Output:?\s*([\s\S]*?)$/i)
    if (inputMatch && outputMatch) {
      examples.push({
        input: inputMatch[1].trim(),
        output: outputMatch[1].trim(),
      })
    }
  }
  return examples
}

// Validate skill has minimum required fields
export function validateSkill(skill: SkillDefinition): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!skill.id) errors.push('Missing skill ID')
  if (!skill.name) errors.push('Missing skill name')
  if (!skill.description) errors.push('Missing skill description')
  if (!skill.category) errors.push('Missing category')
  if (!skill.prompts?.en) errors.push('Missing English prompt')
  
  // Check ID format (lowercase, hyphenated)
  if (skill.id && !/^[a-z0-9-]+$/.test(skill.id)) {
    errors.push('Skill ID must be lowercase with hyphens only')
  }
  
  return { valid: errors.length === 0, errors }
}

// Merge skill into skills library
export function mergeSkillIntoLibrary(
  library: { skillCategories: Array<{ id: string; name?: string; skills: SkillDefinition[] }> },
  newSkill: SkillDefinition
): { success: boolean; message: string } {
  // Find or create category
  let category = library.skillCategories.find(c => c.id === newSkill.category)
  if (!category) {
    // Try to find by category name
    category = library.skillCategories.find(c => 
      (c.name || c.id).toLowerCase() === newSkill.category.toLowerCase()
    )
  }
  
  if (!category) {
    // Create new category
    library.skillCategories.push({
      id: newSkill.category.toLowerCase().replace(/\s+/g, '-'),
      name: newSkill.category.charAt(0).toUpperCase() + newSkill.category.slice(1),
      skills: [],
    })
    category = library.skillCategories[library.skillCategories.length - 1]
  }
  
  // Check for duplicate ID
  const existingIndex = category.skills.findIndex(s => s.id === newSkill.id)
  if (existingIndex >= 0) {
    category.skills[existingIndex] = newSkill
    return { success: true, message: `Updated existing skill: ${newSkill.name}` }
  }
  
  category.skills.push(newSkill)
  return { success: true, message: `Added new skill: ${newSkill.name}` }
}
