import { describe, expect, it } from 'vitest'

import pipelinesConfig from '@/config/pipelines/pipelines.json'
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

  it('uses the real length of a named month before stale profile defaults', () => {
    const brief = resolveContentCalendarBrief(
      'Create a content calendar for Victory Genomics for August 2026.',
      { campaign_duration: '30 days', timeline: '30 days' }
    )

    expect(brief.periodLabel).toBe('August 2026')
    expect(brief.timeframeDays).toBe(31)
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
    const prompts: string[] = []
    const activities: string[] = []
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
      pipeline: pipelinesConfig.pipelines.find((entry) => entry.id === 'content-calendar') as any,
      skillGuidanceByAgent: Object.fromEntries(Array.from(agents.keys()).map((id) => [id, `${id} skill instructions`])),
      generateStage: async ({ prompt, stage }) => {
        stages.push(stage)
        prompts.push(prompt)
        if (stage.startsWith('ideas:')) {
          const pillar = stage.split(':')[1]
          return {
            provider: 'ollama', model: 'test',
            text: JSON.stringify({ ideas: Array.from({ length: 4 }, (_, index) => ({
              title: `${pillar} gender reveal angle ${index + 1}`,
              pillar,
              description: `Victory Genomics gender reveal ${pillar} idea ${index + 1}`,
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
          const count = (prompt.match(/^\d+\. \[/gm) || []).length
          return {
            provider: 'ollama', model: 'test',
            text: JSON.stringify({ posts: Array.from({ length: count }, (_, index) => ({
              ideaNumber: index + 1,
              platform: 'LinkedIn',
              hook: `Test hook ${index + 1}`,
              body: 'Victory Genomics helps horse owners understand equine genomics with clear educational content.',
              cta: 'Learn more from Victory Genomics.',
              hashtags: { primary: ['#VictoryGenomics'] },
            })) }),
          }
        }
        if (stage === 'hashtags') {
          const count = (prompt.match(/^\d+\. \[/gm) || []).length
          return {
            provider: 'ollama', model: 'test',
            text: JSON.stringify({ hashtags: Array.from({ length: count }, (_, index) => ({
              postNumber: index + 1,
              primary: ['#VictoryGenomics'],
              niche: ['#EquineGenomics'],
              trending: [],
              seoKeywords: ['horse genetics'],
            })) }),
          }
        }
        if (stage === 'calendar') {
          const ids = Array.from(prompt.matchAll(/^([^\s|]+) \| [^|]+ \|/gm)).map((match) => match[1])
          return {
            provider: 'ollama', model: 'test',
            // Deliberately repeat the first post. The engine must retain each
            // post exactly once and fill any missing IDs deterministically.
            text: JSON.stringify({ calendar: { 1: [ids[0], ids[0]], 2: ids.slice(1) } }),
          }
        }
        throw new Error(`Unexpected generation stage: ${stage}`)
      },
      hooks: {
        onActivityComplete: async ({ activity }) => { activities.push(activity.id) },
      },
    })

    expect(result.qualityResult).toMatchObject({ ok: true, score: 100 })
    expect(stages.some((stage) => stage.startsWith('visuals'))).toBe(false)
    expect(stages).not.toContain('calendar')
    expect(stages.filter((stage) => stage === 'posts')).toHaveLength(5)
    expect((result.response.match(/^\| Day \d+/gm) || [])).toHaveLength(15)
    expect(result.response).toContain('Primary goal: awareness.')
    expect(result.response).not.toContain('LinkedIn')
    expect(result.response).not.toMatch(/Visual Mood|Visual Format/)
    expect(prompts.some((prompt) => prompt.includes('maya skill instructions'))).toBe(true)
    expect(prompts.some((prompt) => prompt.includes('Content Calendar > Post Drafting > Review & Adjust Posts'))).toBe(true)
    expect(prompts.some((prompt) => prompt.includes('Content Calendar > Cross-Platform > Adapt for All Platforms'))).toBe(true)
    expect(prompts.some((prompt) => prompt.includes('Content Calendar > Hashtags & SEO > Generate Hashtags & Keywords'))).toBe(true)
    expect(activities).toEqual(expect.arrayContaining([
      'profile-review', 'review-posts', 'adapt-posts', 'generate-hashtags', 'export-calendar',
    ]))
  })

  it('accepts high-risk claims only when they exist in approved client evidence', () => {
    const content = `# Victory Genomics Content Calendar
## Strategy Summary
Primary goal: awareness.
## Content Pillars
| Pillar | Purpose |
| --- | --- |
| Educational | Teach |
## Calendar
| Day | Platform | Pillar | Post Idea | Hook |
| --- | --- | --- | --- | --- |
${Array.from({ length: 15 }, (_, index) => `| Day ${index + 1} | ${['Instagram', 'Facebook', 'Email'][index % 3]} | Educational | Guaranteed insight ${index + 1} | Hook |`).join('\n')}
## Post Details
Victory Genomics offers guaranteed profile updates.`
    expect(validateDeliverableQuality('content-calendar', content, request).issues)
      .toContain('Potentially unsupported factual claim requires client evidence: Guaranteed.')
    expect(validateDeliverableQuality('content-calendar', content, request, {
      approvedEvidence: 'Victory Genomics provides guaranteed profile updates.',
    }).issues.some((issue) => issue.includes('unsupported factual claim'))).toBe(false)
  })
})
