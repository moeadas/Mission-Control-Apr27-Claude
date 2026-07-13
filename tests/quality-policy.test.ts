import { describe, expect, it } from 'vitest'

import { scoreQualityIssues, selectApplicableQualitySkills } from '@/lib/quality-policy'

describe('shared quality policy', () => {
  it('excludes unrelated collaborator skills from a content-calendar quality gate', () => {
    const selected = selectApplicableQualitySkills({
      deliverableType: 'content-calendar',
      request: 'Create an Instagram and email content calendar for an equine genomics client.',
      skills: [
        { id: 'content-calendars', name: 'Content Calendars', checklist: ['Calendar includes a publishing schedule'] },
        { id: 'organic-social-planning', name: 'Organic Social Planning', checklist: ['Platforms are assigned'] },
        { id: 'audio-production', name: 'Audio Production', checklist: ['Audio mix has a loudness target'] },
        { id: 'paid-social-budgeting', name: 'Paid Social Budgeting', checklist: ['Budget is allocated by channel'] },
      ],
      preferredSkillIds: ['content-calendars'],
    })

    expect(selected.map((skill) => skill.id)).toContain('content-calendars')
    expect(selected.map((skill) => skill.id)).toContain('organic-social-planning')
    expect(selected.map((skill) => skill.id)).not.toContain('audio-production')
    expect(selected.map((skill) => skill.id)).not.toContain('paid-social-budgeting')
  })

  it('weights unsupported claims more heavily than presentation polish', () => {
    const result = scoreQualityIssues([
      'Potentially unsupported factual claim requires client evidence: guaranteed.',
      'Output still contains routing boilerplate.',
    ])

    expect(result.score).toBe(65)
    expect(result.ok).toBe(false)
  })
})
