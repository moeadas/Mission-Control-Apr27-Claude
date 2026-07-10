import { Artifact, ArtifactFormat, DeliverableType } from '@/lib/types'

export function slugifyFilePart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export function getArtifactFamily(deliverableType: DeliverableType) {
  if (deliverableType === 'creative-asset') return 'creative'
  if (['media-plan', 'budget-sheet', 'kpi-forecast', 'financial-report', 'financial-operations'].includes(deliverableType)) return 'media'
  return 'document'
}

export function getSupportedExportFormats(artifact: Artifact): Extract<ArtifactFormat, 'docx' | 'pdf' | 'pptx' | 'xlsx' | 'csv'>[] {
  if (getArtifactFamily(artifact.deliverableType) === 'media') return ['xlsx', 'csv', 'pdf', 'pptx']
  return ['docx', 'pdf', 'pptx']
}

export function getDefaultCreativeSpec(artifact: Artifact) {
  return (
    artifact.creative || {
      assetType: 'social-post' as const,
      visualDirection: 'Brand-safe Nano Banana production pack with premium editorial polish and strict visual guardrails.',
      imagePrompt: artifact.content || '',
      aspectRatio: '4:5' as const,
      referenceNotes: '',
      deliverableSpecs: [],
      assetUrl: '',
      assetPath: '',
    }
  )
}

export function formatDeliverableLabel(deliverableType: DeliverableType) {
  return deliverableType.replace(/-/g, ' ')
}
