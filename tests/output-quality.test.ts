import { describe, expect, it } from 'vitest'

import { validateDeliverableQuality } from '@/lib/output-quality'

const request =
  'create a blog post for victory genomics, about the importance of Whole Genome Sequencing for horse owners. use Whole Genome Sequencing as the primary focus keyword and Horse DNA testing as the secondary keyword'

describe('validateDeliverableQuality blog articles', () => {
  it('flags short blog outputs that skip the full SEO checklist', () => {
    const weakOutput = [
      '# Blog Post',
      '## Objective',
      'Educate horse owners.',
      '## SEO Package',
      'Primary Keyword: Whole Genome Sequencing',
      '## Article Outline',
      'H1: Why WGS matters',
      '## Key Takeaways',
      '- WGS is useful.',
      '## Article Draft',
      '# Why WGS Matters',
      'Whole Genome Sequencing helps horse owners understand genetics.',
      '## FAQ',
      'Q: Is it useful? A: Yes.',
      '## Schema & Publishing Checklist',
      '- Article schema',
    ].join('\n\n')

    const result = validateDeliverableQuality('blog-article', weakOutput, request)

    expect(result.ok).toBe(false)
    expect(result.issues).toContain('Missing required section: Table of Contents.')
    expect(result.issues.some((issue) => issue.includes('Article Draft is too short'))).toBe(true)
    expect(result.issues).toContain('Missing linked Table of Contents with anchor-style links.')
    expect(result.issues).toContain('Article Draft must include linked Quick Navigation inside the copyable post content.')
  })
})
