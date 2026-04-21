import { create } from 'zustand'

import { type Skill, SKILL_CATEGORIES } from '@/lib/skill-schema'
import { getSupabaseAccessToken } from '@/lib/supabase/browser'

export interface SkillDefinition extends Skill {}

export interface SkillCategory {
  id: string
  name: string
  skills: SkillDefinition[]
}

interface SkillsState {
  categories: SkillCategory[]
  skillsMap: Record<string, SkillDefinition>
  isLoaded: boolean

  loadSkills: (force?: boolean) => Promise<void>
  getSkill: (id: string) => SkillDefinition | undefined
  getSkillsByCategory: (categoryId: string) => SkillDefinition[]
  addSkill: (skill: SkillDefinition) => Promise<boolean>
  updateSkill: (id: string, updates: Partial<SkillDefinition>) => Promise<boolean>
  deleteSkill: (id: string) => Promise<boolean>
  addCategory: (category: Omit<SkillCategory, 'skills'>) => void
  getAllSkills: () => SkillDefinition[]
}

function buildCategoryName(id: string) {
  return SKILL_CATEGORIES.find((category) => category.id === id)?.name || id
}

function buildCollections(skills: SkillDefinition[]) {
  const categoriesMap = new Map<string, SkillCategory>()
  const skillsMap: Record<string, SkillDefinition> = {}

  for (const category of SKILL_CATEGORIES) {
    categoriesMap.set(category.id, {
      id: category.id,
      name: category.name,
      skills: [],
    })
  }

  for (const skill of skills) {
    skillsMap[skill.id] = skill
    if (!categoriesMap.has(skill.category)) {
      categoriesMap.set(skill.category, {
        id: skill.category,
        name: buildCategoryName(skill.category),
        skills: [],
      })
    }
    categoriesMap.get(skill.category)?.skills.push(skill)
  }

  const categories = Array.from(categoriesMap.values()).filter((category) => category.skills.length > 0)
  return { categories, skillsMap }
}

async function authorizedFetch(input: string, init: RequestInit = {}) {
  const token = await getSupabaseAccessToken()
  return fetch(input, {
    ...init,
    headers: {
      ...(init.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
}

export const useSkillsStore = create<SkillsState>()((set, get) => ({
  categories: [],
  skillsMap: {},
  isLoaded: false,

  loadSkills: async (force = false) => {
    if (get().isLoaded && !force) return

    try {
      const response = await authorizedFetch('/api/skills')
      const payload = response.ok ? await response.json() : []
      const skills = Array.isArray(payload) ? (payload as SkillDefinition[]) : []
      const { categories, skillsMap } = buildCollections(skills)
      set({ categories, skillsMap, isLoaded: true })
    } catch (error) {
      console.error('Failed to load skills:', error)
      set({ isLoaded: true })
    }
  },

  getSkill: (id) => get().skillsMap[id],

  getSkillsByCategory: (categoryId) => get().categories.find((category) => category.id === categoryId)?.skills || [],

  addSkill: async (skill) => {
    try {
      const response = await authorizedFetch('/api/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(skill),
      })
      if (!response.ok) return false
      await get().loadSkills(true)
      return true
    } catch (error) {
      console.error('Failed to add skill:', error)
      return false
    }
  },

  updateSkill: async (id, updates) => {
    const current = get().skillsMap[id]
    if (!current) return false

    try {
      const nextSkill = { ...current, ...updates }
      const response = await authorizedFetch(`/api/skills/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nextSkill),
      })
      if (!response.ok) return false
      await get().loadSkills(true)
      return true
    } catch (error) {
      console.error('Failed to update skill:', error)
      return false
    }
  },

  deleteSkill: async (id) => {
    try {
      const response = await authorizedFetch(`/api/skills/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) return false
      await get().loadSkills(true)
      return true
    } catch (error) {
      console.error('Failed to delete skill:', error)
      return false
    }
  },

  addCategory: (category) => {
    set((state) => ({
      categories: [...state.categories, { ...category, skills: [] }],
    }))
  },

  getAllSkills: () => Object.values(get().skillsMap),
}))
