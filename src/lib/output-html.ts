function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function formatInline(value: string) {
  let safe = escapeHtml(value)
  safe = safe.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
  safe = safe.replace(/`([^`]+)`/g, '<code>$1</code>')
  safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  safe = safe.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  return safe
}

function renderImage(line: string) {
  const match = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/)
  if (!match) return ''
  const [, alt, src] = match
  return `
    <figure class="artifact-figure">
      <img class="artifact-image" src="${escapeHtml(src)}" alt="${escapeHtml(alt || 'Output image')}" />
      ${alt ? `<figcaption class="artifact-figcaption">${formatInline(alt)}</figcaption>` : ''}
    </figure>
  `
}

function renderTable(lines: string[]) {
  const rows = lines
    .filter((line) => /^\|.*\|$/.test(line))
    .map((line) => line.split('|').slice(1, -1).map((cell) => cell.trim()))
  const header = rows[0] || []
  const bodyRows = rows.slice(2)

  return `
    <div class="artifact-table-wrap">
      <table class="artifact-table">
        <thead><tr>${header.map((cell) => `<th>${formatInline(cell)}</th>`).join('')}</tr></thead>
        <tbody>${bodyRows
          .map((row) => `<tr>${row.map((cell) => `<td>${formatInline(cell)}</td>`).join('')}</tr>`)
          .join('')}</tbody>
      </table>
    </div>
  `
}

function renderList(lines: string[]) {
  return `<ul class="artifact-list">${lines
    .map((line) => line.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '').trim())
    .filter(Boolean)
    .map((item) => `<li>${formatInline(item)}</li>`)
    .join('')}</ul>`
}

function renderSectionBody(body: string) {
  const lines = body
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !/^---+$/.test(line))

  if (!lines.length) return '<p class="artifact-empty">No content available.</p>'

  const htmlParts: string[] = []

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]

    if (/^\|.*\|$/.test(line)) {
      const tableLines = [line]
      while (index + 1 < lines.length && /^\|.*\|$/.test(lines[index + 1])) {
        tableLines.push(lines[index + 1])
        index += 1
      }
      htmlParts.push(renderTable(tableLines))
      continue
    }

    if (/^!\[([^\]]*)\]\(([^)]+)\)$/.test(line)) {
      htmlParts.push(renderImage(line))
      continue
    }

    if (/^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
      const listLines = [line]
      while (index + 1 < lines.length && (/^[-*]\s+/.test(lines[index + 1]) || /^\d+\.\s+/.test(lines[index + 1]))) {
        listLines.push(lines[index + 1])
        index += 1
      }
      htmlParts.push(renderList(listLines))
      continue
    }

    if (/^###\s+/.test(line)) {
      htmlParts.push(`<h3 class="artifact-subheading">${formatInline(line.replace(/^###\s+/, ''))}</h3>`)
      continue
    }

    if (/^slide\s+\d+/i.test(line)) {
      const [label, ...rest] = line.split(':')
      htmlParts.push(
        `<div class="artifact-slide"><div class="artifact-slide-label">${formatInline(label)}</div><div class="artifact-slide-copy">${formatInline(
          rest.join(':').trim()
        )}</div></div>`
      )
      continue
    }

    htmlParts.push(`<p class="artifact-paragraph">${formatInline(line)}</p>`)
  }

  return htmlParts.join('')
}

function buildTitleFromContent(cleaned: string) {
  if (cleaned.startsWith('# ')) {
    const [titleLine, ...rest] = cleaned.split('\n')
    return {
      title: titleLine.replace(/^#\s+/, '').trim(),
      body: rest.join('\n').trim(),
    }
  }

  return { title: '', body: cleaned }
}

export function buildArtifactHtml(content: string) {
  const cleaned = content.replace(/\r/g, '').trim()
  if (!cleaned) {
    return `
      <article class="artifact-document">
        <div class="artifact-grid">
          <section class="artifact-section">
            <div class="artifact-section-head">Output</div>
            <div class="artifact-section-body"><p class="artifact-empty">No content available.</p></div>
          </section>
        </div>
      </article>
    `
  }

  if (/<article[\s>]|<section[\s>]|<div[\s>].*artifact-/i.test(cleaned)) {
    return cleaned
  }

  const { title, body } = buildTitleFromContent(cleaned)
  const rawSections = body
    ? body.split(/\n(?=##\s+)/g).map((chunk) => chunk.trim()).filter(Boolean)
    : []

  const sections = rawSections.length
    ? rawSections.map((section) => {
        const sectionLines = section.split('\n')
        const heading = sectionLines[0].replace(/^##\s+/, '').trim()
        const bodyText = sectionLines.slice(1).join('\n').trim()
        return { heading, bodyText }
      })
    : [{ heading: 'Output', bodyText: body || cleaned }]

  return `
    <article class="artifact-document">
      ${title ? `<header class="artifact-header"><p class="artifact-kicker">Mission Output</p><h1>${formatInline(title)}</h1></header>` : ''}
      <div class="artifact-grid">
        ${sections
          .map(
            (section) => `
              <section class="artifact-section">
                <h2 class="artifact-section-head">${formatInline(section.heading)}</h2>
                <div class="artifact-section-body">${renderSectionBody(section.bodyText)}</div>
              </section>
            `
          )
          .join('')}
      </div>
    </article>
  `
}

export function htmlToPlainText(content?: string) {
  if (!content) return ''
  if (!/<[a-z][\s\S]*>/i.test(content)) {
    return content
      .replace(/\*\*/g, '')
      .replace(/^---+$/gm, '')
      .trim()
  }

  return content
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<\/(p|div|section|article|header|h1|h2|h3|h4|li|tr|table)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
