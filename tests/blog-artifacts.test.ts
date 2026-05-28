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
      '## Post SEO Settings',
      '1. SUGGESTED SEO TITLE TAG: Whole Genome Sequencing Guide 2026',
      '2. SUGGESTED META DESCRIPTION: Whole Genome Sequencing helps horse owners understand health, performance, ancestry, and breeding insights.',
      '3. SUGGESTED URL SLUG: /whole-genome-sequencing-horse-owners',
      '4. PRIMARY FOCUS KEYWORD: Whole Genome Sequencing',
      '5. SECONDARY KEYWORDS USED: Horse DNA testing',
      '6. ESTIMATED WORD COUNT: 2,800',
      '7. IMAGE PLACEMENT NOTES: Hero image alt text.',
      '8. INTERNAL LINK SUGGESTIONS: VGnome page.',
      '9. SCHEMA MARKUP NOTES: Article and FAQ schema.',
    ].join('\n\n')

    const result = splitBlogArticleArtifacts(source)

    expect(result?.settings).toContain('# Post SEO Settings')
    expect(result?.settings).toContain('| Primary focus keyword | Whole Genome Sequencing |')
    expect(result?.settings).toContain('| Suggested SEO title tag | Whole Genome Sequencing Guide 2026 |')
    expect(result?.settings).not.toContain('## Article Draft')
    expect(result?.settings).not.toContain('## SEO Package')
    expect(result?.combined).toContain('# Blog Post Package')
    expect(result?.combined).toContain('## Full Blog Post')
    expect(result?.combined).toContain('## Post SEO Settings')
    expect(result?.combined.indexOf('## Full Blog Post')).toBeLessThan(result?.combined.indexOf('## Post SEO Settings') || 0)
    expect(result?.draft).toContain('## Quick Navigation')
    expect(result?.draft).not.toContain('<a id=')
    expect(result?.draft).toContain('# Whole Genome Sequencing for Horse Owners')
    expect(result?.draft).toContain('## FAQ')
  })
})
