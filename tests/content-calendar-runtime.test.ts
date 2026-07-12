import { describe, expect, it } from 'vitest'

import { applyContentCalendarBrief, resolveContentCalendarBrief } from '@/lib/server/content-calendar-brief'
import { validateDeliverableQuality } from '@/lib/output-quality'
import { executeAutomatedContentCalendar } from '@/lib/server/content-calendar-engine'

const request = `prepare a content calendar for Victory Genomics for the month of August, focus on gender reveal product

Task type: Content Calendar

Confirmed brief details:
- Objective: awareness
- Platforms: Instagram + Facebook + Email
- Timeframe: 7-day calendar
- Cadence: 5 posts per platform
- Include artwork: no`

describe('content-calendar confirmed brief', () => {
  it('makes confirmed task values authoritative while preserving the requested month', () => {
    const brief = resolveContentCalendarBrief(request, {
      platforms: 'Instagram, LinkedIn',
      campaign_duration: '30 days',
      content_goal: 'Awareness and lead generation',
    })

    expect(brief).toEqual({
      objective: 'awareness',
      platforms: ['Instagram', 'Facebook', 'Email'],
      timeframeDays: 7,
      periodLabel: `August ${new Date().getFullYear()}`,
      postsPerPlatform: 5,
      totalPosts: 15,
      includeArtwork: false,
    })

    expect(applyContentCalendarBrief({}, brief)).toMatchObject({
      content_goal: 'awareness',
      platforms: 'Instagram, Facebook, Email',
      campaign_duration: '7 days',
      posting_frequency: '5 posts per platform',
      include_artwork: 'no',
    })
  })

  it('rejects schedules that drift from confirmed duration, channels, or cadence', () => {
    const weak = `# Victory Genomics Content Calendar
## Strategy Summary
Primary goal: awareness.
## Content Pillars
| Pillar | Purpose |
| --- | --- |
| Educational | Teach |
## Calendar
| Day | Platform | Pillar | Post Idea | Hook |
| --- | --- | --- | --- | --- |
| Day 1 | Instagram | Educational | A | H |
| Day 28 | LinkedIn | Promotional | B | H |
## Post Details
Copy only.`
    const quality = validateDeliverableQuality('content-calendar', weak, request)
    expect(quality.ok).toBe(false)
    expect(quality.issues).toContain('Calendar day 28 falls outside the confirmed 7-day timeframe.')
    expect(quality.issues.some((issue) => issue.includes('confirmed cadence requires 15'))).toBe(true)
    expect(quality.issues.some((issue) => issue.includes('unconfirmed platforms: LinkedIn'))).toBe(true)
  })

  it('runs the dedicated engine with the confirmed brief and skips visual generation', async () => {
    const stages: string[] = []
    const agents = new Map(['maya', 'echo', 'nova', 'lyra', 'iris'].map((id) => [id, { id, name: id, role: id }]))
    const result = await executeAutomatedContentCalendar({
      request,
      clientProfile: {
        brand_name: 'Victory Genomics',
        industry: 'Equine genomics',
        platforms: 'Instagram, LinkedIn',
        campaign_duration: '30 days',
        content_goal: 'Awareness and lead generation',
        approved_facts: 'Victory Genomics provides equine genomics services.',
      },
      agentsById: agents,
      pipeline: { id: 'content-calendar', name: 'Content Calendar', phases: [] },
      skillGuidanceByAgent: Object.fromEntries(Array.from(agents.keys()).map((id) => [id, `${id} skill instructions`])),
      generateStage: async ({ prompt, stage }) => {
        stages.push(stage)
        if (stage.startsWith('ideas:')) {
          const pillar = stage.split(':')[1]
          return {
            provider: 'ollama', model: 'test',
            text: JSON.stringify({ ideas: Array.from({ length: 4 }, (_, index) => ({
              title: `${pillar} angle ${index + 1}`,
              pillar,
              description: `Victory Genomics ${pillar} idea ${index + 1}`,
              primaryPlatform: 'LinkedIn',
              contentType: 'Static Post',
            })) }),
          }
        }
        if (stage === 'idea-selection') return { provider: 'ollama', model: 'test', text: '{"selectedIds":[]}' }
        if (stage === 'hooks') {
          const count = (prompt.match(/^\d+\. \[/gm) || []).length
          return {
            provider: 'ollama', model: 'test',
            text: JSON.stringify({ hooks: Array.from({ length: count }, (_, index) => ({
              ideaNumber: index + 1,
              options: Array.from({ length: 4 }, (__, option) => ({ formula: 'Question', text: `Hook ${index + 1}-${option + 1}` })),
            })) }),
          }
        }
        if (stage === 'hook-selection') return { provider: 'ollama', model: 'test', text: '{"selectedHooks":[]}' }
        if (stage === 'posts') {
          return {
            provider: 'ollama', model: 'test',
            text: JSON.stringify({ posts: [{
              ideaNumber: 1,
              platform: 'LinkedIn',
              hook: 'Test hook',
              body: 'Victory Genomics helps horse owners understand equine genomics with clear educational content.',
              cta: 'Learn more from Victory Genomics.',
              hashtags: { primary: ['#VictoryGenomics'] },
            }] }),
          }
        }
        if (stage === 'calendar') return { provider: 'ollama', model: 'test', text: '{"calendar":{}}' }
        throw new Error(`Unexpected generation stage: ${stage}`)
      },
    })

    expect(result.qualityResult).toMatchObject({ ok: true, score: 100 })
    expect(stages.some((stage) => stage.startsWith('visuals'))).toBe(false)
    expect((result.response.match(/^\| Day \d+/gm) || [])).toHaveLength(15)
    expect(result.response).toContain('Primary goal: awareness.')
    expect(result.response).not.toContain('LinkedIn')
    expect(result.response).not.toMatch(/Visual Mood|Visual Format/)
  })
})
