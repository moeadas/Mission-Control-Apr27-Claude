import { describe, expect, it } from 'vitest'

import { buildArtifactHtml } from '@/lib/output-html'

describe('buildArtifactHtml', () => {
  it('renders blog post packages as one artifact without the generic grid splitter', () => {
    const html = buildArtifactHtml(
      [
        '# Blog Post Package',
        '## Post Settings',
        '# Blog SEO Summary',
        '| Field | Value |',
        '|---|---|',
        '| SEO title | Whole Genome Sequencing for Horse Owners |',
        '## Blog Post',
        '# Whole Genome Sequencing for Horse Owners',
        '## Quick Navigation',
        '- [What is WGS?](#what-is-wgs)',
        '## What is WGS?',
        'Whole Genome Sequencing gives horse owners a complete genetic picture.',
        '## FAQ',
        '### Is WGS useful?',
        'Yes.',
      ].join('\n\n')
    )

    expect(html).toContain('artifact-blog-package')
    expect(html).toContain('Post Settings')
    expect(html).toContain('Blog Post')
    expect(html).not.toContain('artifact-grid')
  })

  it('renders blog article drafts as one continuous copyable article', () => {
    const html = buildArtifactHtml(
      [
        '# Whole Genome Sequencing for Horse Owners',
        'Last Updated: May 2026 | By Victory Genomics | Reading Time: 12 minutes',
        '## Quick Navigation',
        '- [What is WGS?](#what-is-wgs)',
        '<a id="what-is-wgs"></a>',
        '## What is WGS?',
        'Whole Genome Sequencing gives horse owners a complete genetic picture.',
        '## FAQ',
        '### Is WGS useful?',
        'Yes.',
      ].join('\n\n')
    )

    expect(html).toContain('artifact-copyable-article')
    expect(html).toContain('Quick Navigation')
    expect(html).not.toContain('artifact-grid')
    expect(html).not.toContain('&lt;a id=')
  })
})
