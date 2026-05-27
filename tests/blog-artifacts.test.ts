import { describe, expect, it } from 'vitest'

import { splitBlogArticleArtifacts } from '@/lib/blog-artifacts'

describe('splitBlogArticleArtifacts', () => {
  it('separates planning notes from one copyable article draft', () => {
    const source = [
      '# Blog Output',
      '## Objective',
      'Educate horse owners.',
      '## Search Intent & SERP Notes',
      'Informational intent.',
      '## SEO Package',
      'Title Option 1: Whole Genome Sequencing for Horse Owners',
      '## Article Outline',
      'H1 and H2 plan.',
      '## Table of Contents',
      '- [Why it matters](#why-it-matters)',
      '## Key Takeaways',
      '- WGS gives deeper insight.',
      '## Article Draft',
      '# Whole Genome Sequencing for Horse Owners',
      'Whole Genome Sequencing helps owners understand health and performance risks.',
      '## Why It Matters',
      'Useful body copy.',
      '## FAQ',
      '### Is WGS useful?',
      'Yes.',
      '## CTA',
      'Explore VGnome.',
    ].join('\n\n')

    const result = splitBlogArticleArtifacts(source)

    expect(result?.planning).toContain('## SEO Package')
    expect(result?.planning).not.toContain('## Article Draft')
    expect(result?.draft).toContain('## Table of Contents')
    expect(result?.draft).toContain('# Whole Genome Sequencing for Horse Owners')
    expect(result?.draft).toContain('## FAQ')
    expect(result?.draft).toContain('## CTA')
  })
})
