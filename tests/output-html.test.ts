import { describe, expect, it } from 'vitest'

import { buildArtifactHtml } from '@/lib/output-html'

describe('buildArtifactHtml', () => {
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
