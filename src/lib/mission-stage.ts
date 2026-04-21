import { Artifact, Mission, WorkflowExecutionRecord } from '@/lib/types'

function hasSavedArtifact(artifact?: Artifact | null) {
  return Boolean(artifact && ['ready', 'delivered'].includes(artifact.status))
}

export function getMissionStageLabel(input: {
  missionStatus?: Mission['status'] | string
  progress?: number
  latestArtifact?: Artifact | null
}) {
  const status = input.missionStatus
  const progress = typeof input.progress === 'number' ? input.progress : 0

  if (status === 'completed' || hasSavedArtifact(input.latestArtifact)) return 'Complete'
  if (status === 'review') return 'Review'
  if (status === 'blocked') return 'Review'
  if (status === 'paused') return 'Review'
  if (progress <= 15) return 'Analyzing'
  if (progress <= 32) return 'Routing'
  return 'Working'
}

export function getWorkflowStageLabel(workflow?: WorkflowExecutionRecord | null) {
  if (!workflow) return 'Working'
  if (workflow.status === 'completed') return 'Complete'
  if (workflow.status === 'paused' || workflow.status === 'cancelled') return 'Review'
  if (workflow.progress <= 15) return 'Analyzing'
  if (workflow.progress <= 32) return 'Routing'
  return 'Working'
}
