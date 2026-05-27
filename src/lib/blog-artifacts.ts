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

function cleanValue(value: string) {
  return value
    .replace(/^[-*]\s+/, '')
    .replace(/^\d+[.)]\s+/, '')
    .replace(/\*\*/g, '')
    .trim()
}

function extractLabeledValue(text: string, labels: string[]) {
  for (const label of labels) {
    const escaped = escapeRegExp(label)
    const match = text.match(new RegExp(`(?:^|\\n)\\s*(?:[-*]\\s*)?(?:\\*\\*)?${escaped}(?:\\*\\*)?\\s*[:\\-–]\\s*([^\\n]+)`, 'i'))
    if (match?.[1]) return cleanValue(match[1])
  }
  return ''
}

function extractTitle(seoPackage: string) {
  return (
    extractLabeledValue(seoPackage, ['Meta Title', 'SEO Title', 'Recommended Title', 'Final Title', 'Title']) ||
    extractLabeledValue(seoPackage, ['Title Option 1', 'Option 1']) ||
    cleanValue(seoPackage.split('\n').find((line) => /title/i.test(line)) || '')
  )
}

function compactSummary(...parts: string[]) {
  return parts
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(' ')
    .slice(0, 700)
}

function buildSeoSummaryArtifact(source: string) {
  const objective = getMarkdownSection(source, 'Objective')
  const serpNotes = getMarkdownSection(source, 'Search Intent & SERP Notes')
  const seoPackage = getMarkdownSection(source, 'SEO Package')
  const outline = getMarkdownSection(source, 'Article Outline')

  const summary = compactSummary(objective, serpNotes)
  const focusKeyword = extractLabeledValue(seoPackage, ['Primary Keyword', 'Primary Focus Keyword', 'Focus Keyword'])
  const secondaryKeywords = extractLabeledValue(seoPackage, ['Secondary Keywords', 'Secondary Keyword'])
  const title = extractTitle(seoPackage)
  const slug = extractLabeledValue(seoPackage, ['URL Slug', 'Slug', 'Recommended URL Slug'])
  const metaDescription = extractLabeledValue(seoPackage, ['Meta Description', 'SEO Description'])

  return [
    '# Blog SEO Summary',
    '',
    '| Field | Value |',
    '|---|---|',
    `| Summary | ${summary || 'Not specified.'} |`,
    `| Focus keyword | ${focusKeyword || 'Not specified.'} |`,
    `| Secondary keyword(s) | ${secondaryKeywords || 'Not specified.'} |`,
    `| SEO title | ${title || 'Not specified.'} |`,
    `| URL slug | ${slug || 'Not specified.'} |`,
    `| Meta description | ${metaDescription || 'Not specified.'} |`,
    outline ? `\nArticle structure: ${outline.replace(/\s+/g, ' ').trim().slice(0, 500)}` : '',
  ].filter(Boolean).join('\n').trim()
}

export function splitBlogArticleArtifacts(content: string) {
  const source = (content || '').trim()
  const articleDraft = getMarkdownSection(source, 'Article Draft')
  if (!source || !articleDraft) return null

  const planning = buildSeoSummaryArtifact(source)

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
