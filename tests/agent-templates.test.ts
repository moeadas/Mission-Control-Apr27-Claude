/**
 * Agent-template detection tests (Batch K)
 *
 * Verifies the helpers that recognise tenant-cloned agents regardless of
 * whether they were created with the legacy literal id (`'iris'`) or with a
 * tenant-suffixed id (`'iris-a1b2c3d4'` + `metadata.templateId='iris'`).
 */
import { describe, expect, it } from 'vitest'

import { findAgentByTemplate, isOrchestratorAgent } from '@/lib/server/agent-templates'

describe('isOrchestratorAgent', () => {
  it('recognises literal id "iris"', () => {
    expect(isOrchestratorAgent({ id: 'iris' })).toBe(true)
  })

  it('recognises tenant-suffixed id like "iris-a1b2c3d4"', () => {
    expect(isOrchestratorAgent({ id: 'iris-a1b2c3d4' })).toBe(true)
  })

  it('recognises metadata.templateId = "iris" regardless of id', () => {
    expect(isOrchestratorAgent({ id: 'whatever', metadata: { templateId: 'iris' } })).toBe(true)
  })

  it('returns false for unrelated ids', () => {
    expect(isOrchestratorAgent({ id: 'echo' })).toBe(false)
    expect(isOrchestratorAgent({ id: 'lyra-abcd' })).toBe(false)
    expect(isOrchestratorAgent({ id: 'iristotle' })).toBe(false)  // similar prefix, not "iris-…"
  })

  it('handles null / empty inputs safely', () => {
    expect(isOrchestratorAgent({} as any)).toBe(false)
    expect(isOrchestratorAgent({ id: null } as any)).toBe(false)
  })
})

describe('findAgentByTemplate', () => {
  const agents = [
    { id: 'iris', name: 'Iris' },
    { id: 'echo-aaaaaaaa', name: 'Echo', metadata: { templateId: 'echo' } },
    { id: 'lyra', name: 'Lyra' },
    { id: 'finn-bbbbbbbb', name: 'Finn' },        // no metadata, prefix-only
  ]

  it('finds an agent by metadata.templateId (highest priority)', () => {
    const found = findAgentByTemplate(agents, 'echo')
    expect(found?.id).toBe('echo-aaaaaaaa')
  })

  it('falls back to exact id match', () => {
    const found = findAgentByTemplate(agents, 'iris')
    expect(found?.id).toBe('iris')
  })

  it('falls back to prefix match when no metadata is set', () => {
    const found = findAgentByTemplate(agents, 'finn')
    expect(found?.id).toBe('finn-bbbbbbbb')
  })

  it('returns undefined when no agent matches', () => {
    expect(findAgentByTemplate(agents, 'nova')).toBeUndefined()
  })

  it('handles undefined / empty iterables', () => {
    expect(findAgentByTemplate(undefined, 'iris')).toBeUndefined()
    expect(findAgentByTemplate([], 'iris')).toBeUndefined()
  })
})
