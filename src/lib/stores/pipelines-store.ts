import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getSupabaseBrowserClient } from '@/lib/supabase/browser'

export interface ClientProfileField {
  id: string
  label: string
  type: string
  required: boolean
  options?: string[]
}

export interface Activity {
  id: string
  name: string
  description: string
  assignedRole: string
  inputs: string[]
  outputs: string[]
  checklist: string[]
  prompts?: {
    en: string
    ar?: string
  }
  batching?: {
    batchSize: number
    parallel: boolean
  }
}

export interface Phase {
  id: string
  name: string
  color: string
  activities: Activity[]
}

export interface Pipeline {
  id: string
  name: string
  description: string
  version: string
  isDefault: boolean
  estimatedDuration: string
  clientProfileFields: ClientProfileField[]
  weeklyArc?: string
  phases: Phase[]
}

interface PipelinesState {
  pipelines: Pipeline[]
  isLoaded: boolean
  loadPipelines: (force?: boolean) => Promise<void>
  getPipeline: (id: string) => Pipeline | undefined
  addPipeline: (pipeline: Pipeline) => Promise<boolean>
  updatePipeline: (id: string, updates: Partial<Pipeline>) => Promise<boolean>
  deletePipeline: (id: string) => Promise<boolean>
}

export const usePipelinesStore = create<PipelinesState>()(
  persist(
    (set, get) => ({
      pipelines: [],
      isLoaded: false,

      loadPipelines: async (force = false) => {
        if (get().isLoaded && !force) return
        try {
          const {
            data: { session },
          } = await getSupabaseBrowserClient().auth.getSession()
          const response = await fetch('/api/pipelines', {
            headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
          })
          const pipelines = response.ok ? await response.json() : []
          set({ pipelines: Array.isArray(pipelines) ? pipelines : [], isLoaded: true })
        } catch (error) {
          console.error('Failed to load pipelines:', error)
          set({ isLoaded: true })
        }
      },

      getPipeline: (id) => get().pipelines.find(p => p.id === id),

      addPipeline: async (pipeline) => {
        const {
          data: { session },
        } = await getSupabaseBrowserClient().auth.getSession()
        const response = await fetch('/api/pipelines', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify(pipeline),
        })
        if (!response.ok) return false
        await get().loadPipelines(true)
        return true
      },

      updatePipeline: async (id, updates) => {
        const current = get().pipelines.find(p => p.id === id)
        if (!current) return false
        const nextPipeline = { ...current, ...updates }
        const {
          data: { session },
        } = await getSupabaseBrowserClient().auth.getSession()
        const response = await fetch(`/api/pipelines/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify(nextPipeline),
        })
        if (!response.ok) return false
        await get().loadPipelines(true)
        return true
      },

      deletePipeline: async (id) => {
        const {
          data: { session },
        } = await getSupabaseBrowserClient().auth.getSession()
        const response = await fetch(`/api/pipelines/${id}`, {
          method: 'DELETE',
          headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
        })
        if (!response.ok) return false
        await get().loadPipelines(true)
        return true
      },
    }),
    {
      name: 'mission-control-pipelines',
      version: 1,
    }
  )
)
