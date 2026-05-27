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
      'Primary Keyword: Whole Genome Sequencing',
      'Secondary Keywords: Horse DNA testing',
      'SEO Title: Whole Genome Sequencing for Horse Owners',
      'URL Slug: /whole-genome-sequencing-horse-owners',
      'Meta Description: Learn how Whole Genome Sequencing helps horse owners make smarter health and breeding decisions.',
      '## Article Outline',
      'H1 and H2 plan.',
      '## Table of Contents',
      '- [Why it matters](#why-it-matters)',
      '## Key Takeaways',
      '- WGS gives deeper insight.',
      '## Article Draft',
      '# Whole Genome Sequencing for Horse Owners',
      'Whole Genome Sequencing helps owners understand health and performance risks.',
      '<a id="why-it-matters"></a>',
      '## Why It Matters',
      'Useful body copy.',
      '## FAQ',
      '### Is WGS useful?',
      'Yes.',
      '## CTA',
      'Explore VGnome.',
    ].join('\n\n')

    const result = splitBlogArticleArtifacts(source)

    expect(result?.settings).toContain('# Blog SEO Summary')
    expect(result?.settings).toContain('| Focus keyword | Whole Genome Sequencing |')
    expect(result?.settings).toContain('| SEO title | Whole Genome Sequencing for Horse Owners |')
    expect(result?.settings).not.toContain('## Article Draft')
    expect(result?.settings).not.toContain('## SEO Package')
    expect(result?.combined).toContain('# Blog Post Package')
    expect(result?.combined).toContain('## Post Settings')
    expect(result?.combined).toContain('## Blog Post')
    expect(result?.draft).toContain('## Quick Navigation')
    expect(result?.draft).not.toContain('<a id=')
    expect(result?.draft).toContain('# Whole Genome Sequencing for Horse Owners')
    expect(result?.draft).toContain('## FAQ')
    expect(result?.draft).toContain('## CTA')
  })
})
