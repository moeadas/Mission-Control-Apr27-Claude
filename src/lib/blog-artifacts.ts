const BLOG_PLANNING_SECTIONS = [
  'Objective',
  'Search Intent & SERP Notes',
  'SEO Package',
  'Article Outline',
  'Internal & External Link Suggestions',
  'Visual & Alt Text Suggestions',
  'Schema & Publishing Checklist',
  'Post-Publish Plan',
]

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function getMarkdownSection(content: string, heading: string) {
  const match = (content || '').match(
    new RegExp(`^##\\s+${escapeRegExp(heading)}\\s*$([\\s\\S]*?)(?=^##\\s+|(?![\\s\\S]))`, 'im')
  )
  return match?.[1]?.trim() || ''
}

function hasHeading(content: string, heading: string) {
  return new RegExp(`^##\\s+${escapeRegExp(heading)}\\s*$`, 'im').test(content || '')
}

function injectAfterFirstHeading(markdown: string, block: string) {
  const lines = markdown.split('\n')
  const index = lines.findIndex((line) => /^#\s+.+/.test(line.trim()))
  if (index === -1) return `${block}\n\n${markdown}`.trim()
  return [...lines.slice(0, index + 1), '', block, '', ...lines.slice(index + 1)].join('\n').trim()
}

export function splitBlogArticleArtifacts(content: string) {
  const source = (content || '').trim()
  const articleDraft = getMarkdownSection(source, 'Article Draft')
  if (!source || !articleDraft) return null

  const planning = [
    '# Blog Planning & SEO Package',
    ...BLOG_PLANNING_SECTIONS.flatMap((heading) => {
      const section = getMarkdownSection(source, heading)
      return section ? [`## ${heading}`, section] : []
    }),
  ].join('\n\n').trim()

  const toc = getMarkdownSection(source, 'Table of Contents')
  const keyTakeaways = getMarkdownSection(source, 'Key Takeaways')
  const faq = getMarkdownSection(source, 'FAQ')
  const cta = getMarkdownSection(source, 'CTA')

  let draft = articleDraft.trim()
  if (toc && !hasHeading(draft, 'Table of Contents')) {
    draft = injectAfterFirstHeading(draft, `## Table of Contents\n\n${toc}`)
  }
  if (keyTakeaways && !hasHeading(draft, 'Key Takeaways')) {
    draft = injectAfterFirstHeading(draft, `## Key Takeaways\n\n${keyTakeaways}`)
  }
  if (faq && !hasHeading(draft, 'FAQ')) {
    draft = `${draft}\n\n## FAQ\n\n${faq}`.trim()
  }
  if (cta && !hasHeading(draft, 'CTA')) {
    draft = `${draft}\n\n## CTA\n\n${cta}`.trim()
  }

  return {
    planning,
    draft,
  }
}
