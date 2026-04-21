// Pipeline Loader - Loads predefined pipelines from config

export interface PipelineActivity {
  id: string
  name: string
  description: string
  assignedRole: string
  inputs: string[]
  outputs: string[]
  checklist: string[]
}

export interface PipelinePhase {
  id: string
  name: string
  color: string
  activities: PipelineActivity[]
}

export interface Pipeline {
  id: string
  name: string
  description: string
  version: string
  isDefault: boolean
  estimatedDuration: string
  phases: PipelinePhase[]
}

// Dynamic import for pipelines
export async function loadPipelines(): Promise<Pipeline[]> {
  try {
    const pipelinesJson = await import('@/config/pipelines/pipelines.json')
    return pipelinesJson.default.pipelines as Pipeline[]
  } catch (error) {
    console.error('Failed to load pipelines:', error)
    return []
  }
}

export async function getPipelineById(id: string): Promise<Pipeline | null> {
  const pipelines = await loadPipelines()
  return pipelines.find(p => p.id === id) || null
}

export async function getDefaultPipelines(): Promise<Pipeline[]> {
  const pipelines = await loadPipelines()
  return pipelines.filter(p => p.isDefault)
}
