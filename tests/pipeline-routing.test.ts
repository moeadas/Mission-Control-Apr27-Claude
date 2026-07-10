import { describe, expect, it } from 'vitest'

import { inferDeliverableType, inferRoutingContext } from '@/lib/intents/intent-classifier'
import { CONFIG_AGENTS } from '@/config/agents/generated'

describe('department task routing', () => {
  it('keeps go-to-market strategy with the strategy workflow', () => {
    expect(inferDeliverableType('I need a go-to-market plan for a new B2B service')).toBe('strategy-brief')
  })

  it('routes finance operations to its dedicated deliverable type', () => {
    expect(inferDeliverableType('Create an accounts payable approval workflow')).toBe('financial-operations')
  })

  it('routes people and commercial work to their specialists', () => {
    expect(inferDeliverableType('Build an interview scorecard for a new sales hire')).toBe('talent-acquisition')
    expect(inferDeliverableType('Create a partner program and strategic partnership plan')).toBe('partnership-strategy')
  })

  it('honours an explicit specialist assignment while Iris continues to coordinate the task', () => {
    const routing = inferRoutingContext({
      content: 'Ask Ledger to prepare a budget versus actual report for Q2',
      clientHints: [],
      agents: CONFIG_AGENTS,
    })
    expect(routing.routedAgentId).toBe('ledger')
    expect(routing.routingReason).toContain('assigned this directly')
  })
})
