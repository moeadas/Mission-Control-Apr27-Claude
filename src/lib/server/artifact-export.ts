import ExcelJS from 'exceljs'
import {
  AlignmentType,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  BorderStyle,
} from 'docx'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import PptxGenJS from 'pptxgenjs'

import { formatDeliverableLabel, slugifyFilePart } from '@/lib/artifacts'
import { htmlToPlainText } from '@/lib/output-html'
import { Artifact, ArtifactExport } from '@/lib/types'

interface ExportArtifactInput {
  artifact: Artifact
  clientName?: string
  missionTitle?: string
  agentName?: string
  format: ArtifactExport['format']
}

type ExportBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'subheading'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'table'; rows: string[][] }

type ExportSection = {
  heading: string
  blocks: ExportBlock[]
}

type ExportImageAsset = {
  buffer: Buffer
  extension: 'png' | 'jpg'
}

type ExportViewModel = {
  title: string
  recap: Array<{ label: string; value: string }>
  sections: ExportSection[]
  image?: ExportImageAsset
}

const GENERATED_ROOT = path.join(process.cwd(), 'public', 'generated', 'artifacts')
const A4_WIDTH = 595.28
const A4_HEIGHT = 841.89
const DOC_A4_WIDTH = 11906
const DOC_A4_HEIGHT = 16838
const EXCLUDED_EXPORT_HEADINGS = new Set([
  'execution prompt',
  'output metadata',
  'creative production pack',
  'execution log',
  'reference assets',
  'nano banana master prompt',
  'negative prompt / guardrails',
  'brand identity lock',
  'concept direction',
  'production notes',
])

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

function buildBaseName(artifact: Artifact) {
  return `${slugifyFilePart(artifact.title || artifact.deliverableType)}-${nowStamp()}`
}

function cleanText(value: string) {
  return value
    .replace(/\r/g, '')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .trim()
}

function formatDateTime(value?: string) {
  const date = value ? new Date(value) : new Date()
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getRequestRecap(input: ExportArtifactInput) {
  return [
    { label: 'Client', value: input.clientName || 'General Ops' },
    { label: 'Mission', value: input.missionTitle || 'Unlinked mission' },
    { label: 'Deliverable', value: formatDeliverableLabel(input.artifact.deliverableType) },
    { label: 'Lead Agent', value: input.agentName || 'Iris' },
    { label: 'Status', value: input.artifact.status },
    { label: 'Generated', value: formatDateTime(input.artifact.updatedAt || input.artifact.createdAt) },
  ]
}

function parseMarkdownSections(content?: string) {
  const cleaned = cleanText(content || '')
  if (!cleaned) return { title: '', sections: [] as Array<{ heading: string; body: string }> }

  const titleMatch = cleaned.match(/^#\s+(.+)$/m)
  const title = titleMatch?.[1]?.trim() || ''
  const body = titleMatch ? cleaned.replace(titleMatch[0], '').trim() : cleaned
  const chunks = body.split(/\n(?=##\s+)/g).map((chunk) => chunk.trim()).filter(Boolean)

  if (!chunks.length) {
    return {
      title,
      sections: [{ heading: 'Final Output', body: body || cleaned }],
    }
  }

  return {
    title,
    sections: chunks.map((chunk) => {
      const lines = chunk.split('\n')
      return {
        heading: lines[0].replace(/^##\s+/, '').trim(),
        body: lines.slice(1).join('\n').trim(),
      }
    }),
  }
}

function parseBodyToBlocks(body: string): ExportBlock[] {
  const lines = body
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !/^---+$/.test(line))

  const blocks: ExportBlock[] = []

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]

    if (/^\|.*\|$/.test(line)) {
      const tableLines = [line]
      while (index + 1 < lines.length && /^\|.*\|$/.test(lines[index + 1])) {
        tableLines.push(lines[index + 1])
        index += 1
      }
      const rows = tableLines
        .map((tableLine) => tableLine.split('|').slice(1, -1).map((cell) => cleanText(cell.trim())))
      if (rows.length > 2) {
        blocks.push({ type: 'table', rows: [rows[0], ...rows.slice(2)] })
      }
      continue
    }

    if (/^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line)) {
      const items = [line]
      while (index + 1 < lines.length && (/^[-*]\s+/.test(lines[index + 1]) || /^\d+\.\s+/.test(lines[index + 1]))) {
        items.push(lines[index + 1])
        index += 1
      }
      blocks.push({
        type: 'list',
        items: items
          .map((item) => cleanText(item.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '').trim()))
          .filter(Boolean),
      })
      continue
    }

    if (/^###\s+/.test(line)) {
      blocks.push({ type: 'subheading', text: cleanText(line.replace(/^###\s+/, '')) })
      continue
    }

    const paragraphLines = [line]
    while (
      index + 1 < lines.length &&
      !/^\|.*\|$/.test(lines[index + 1]) &&
      !/^[-*]\s+/.test(lines[index + 1]) &&
      !/^\d+\.\s+/.test(lines[index + 1]) &&
      !/^###\s+/.test(lines[index + 1])
    ) {
      paragraphLines.push(lines[index + 1])
      index += 1
    }

    blocks.push({ type: 'paragraph', text: cleanText(paragraphLines.join(' ')) })
  }

  return blocks
}

function findSection(sections: Array<{ heading: string; body: string }>, heading: string) {
  return sections.find((section) => section.heading.toLowerCase() === heading.toLowerCase())?.body || ''
}

function extractLabeledBlock(text: string, label: string) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = text.match(new RegExp(`${escaped}:\\s*([\\s\\S]*?)(?=\\n\\n[A-Z][^\\n]*:|\\n[A-Z][^\\n]*:|$)`, 'i'))
  return cleanText(match?.[1]?.trim() || '')
}

function firstMeaningfulLine(text: string) {
  return cleanText(
    text
      .split('\n')
      .map((line) => line.replace(/^[-*]\s+/, '').trim())
      .find(Boolean) || ''
  )
}

function resolveCreativeImageUrl(artifact: Artifact) {
  const directUrl = artifact.creative?.assetUrl?.trim() || artifact.link?.trim() || ''
  if (directUrl) return directUrl

  const savedPath = artifact.creative?.assetPath?.trim() || artifact.path?.trim() || ''
  if (savedPath.includes('/uploads/generated/')) {
    const index = savedPath.indexOf('/uploads/generated/')
    return savedPath.slice(index)
  }
  if (savedPath.startsWith('public/uploads/generated/')) {
    return `/${savedPath.replace(/^public\//, '')}`
  }
  return ''
}

async function loadExportImage(artifact: Artifact): Promise<ExportImageAsset | undefined> {
  const imageUrl = resolveCreativeImageUrl(artifact)
  if (!imageUrl) return undefined

  try {
    if (imageUrl.startsWith('/')) {
      const localPath = path.join(process.cwd(), 'public', imageUrl.replace(/^\//, ''))
      const buffer = await readFile(localPath)
      return { buffer, extension: imageUrl.toLowerCase().endsWith('.png') ? 'png' : 'jpg' }
    }

    if (/^https?:\/\//i.test(imageUrl)) {
      const response = await fetch(imageUrl)
      if (!response.ok) return undefined
      const arrayBuffer = await response.arrayBuffer()
      const contentType = response.headers.get('content-type') || ''
      const extension = contentType.includes('png') || imageUrl.toLowerCase().includes('.png') ? 'png' : 'jpg'
      return { buffer: Buffer.from(arrayBuffer), extension }
    }
  } catch (error) {
    console.error('Failed to load export image', error)
  }

  return undefined
}

async function buildExportViewModel(input: ExportArtifactInput): Promise<ExportViewModel> {
  const recap = getRequestRecap(input)
  const parsed = parseMarkdownSections(input.artifact.content)
  const title = parsed.title || input.artifact.title

  if (input.artifact.deliverableType === 'creative-asset') {
    const copyOverlays = findSection(parsed.sections, 'Copy Overlays')
    const captionDraft = findSection(parsed.sections, 'Caption Draft')
    const cta =
      extractLabeledBlock(copyOverlays, 'CTA Options') ||
      firstMeaningfulLine(copyOverlays.split(/CTA Options:/i)[1] || '') ||
      firstMeaningfulLine(captionDraft)

    const sections: ExportSection[] = []
    if (captionDraft) {
      sections.push({ heading: 'Caption', blocks: parseBodyToBlocks(captionDraft) })
    }
    if (cta) {
      sections.push({ heading: 'Call To Action', blocks: [{ type: 'paragraph', text: cta }] })
    }
    if (!sections.length) {
      sections.push({
        heading: 'Final Output',
        blocks: [{ type: 'paragraph', text: htmlToPlainText(input.artifact.content || 'No content available.') }],
      })
    }

    return {
      title,
      recap,
      sections,
      image: await loadExportImage(input.artifact),
    }
  }

  const sections = (parsed.sections.length ? parsed.sections : [{ heading: 'Final Output', body: input.artifact.content || '' }])
    .filter((section) => !EXCLUDED_EXPORT_HEADINGS.has(section.heading.trim().toLowerCase()))
    .map((section) => ({
      heading: section.heading,
      blocks: parseBodyToBlocks(section.body),
    }))
    .filter((section) => section.blocks.length > 0)

  return {
    title,
    recap,
    sections: sections.length
      ? sections
      : [{ heading: 'Final Output', blocks: [{ type: 'paragraph', text: htmlToPlainText(input.artifact.content || 'No content available.') }] }],
  }
}

function getContentParagraphs(content?: string) {
  return htmlToPlainText(content || 'No content was stored for this artifact.')
    .split(/\n\s*\n/)
    .map((chunk) => chunk.replace(/\r/g, '').trim())
    .filter(Boolean)
}

function getBulletLines(content?: string) {
  return htmlToPlainText(content || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '').trim())
    .filter(Boolean)
}

function splitMarkdownTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim().replace(/<br\s*\/?>/gi, '\n'))
}

function isMarkdownDividerRow(line: string) {
  const cells = splitMarkdownTableRow(line)
  return cells.length > 1 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s/g, '')))
}

function stripHtml(value: string) {
  return cleanText(
    value
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
  )
}

function extractHtmlTables(content?: string) {
  const html = String(content || '')
  const tableMatches = html.match(/<table[\s\S]*?<\/table>/gi) || []
  return tableMatches
    .map((tableHtml) => {
      const rowMatches = tableHtml.match(/<tr[\s\S]*?<\/tr>/gi) || []
      return rowMatches
        .map((rowHtml) => {
          const cellMatches = rowHtml.match(/<t[hd][\s\S]*?<\/t[hd]>/gi) || []
          return cellMatches.map(stripHtml).filter((cell) => cell.length > 0)
        })
        .filter((row) => row.length > 1)
    })
    .filter((table) => table.length >= 2)
}

function isPotentialMarkdownTableLine(line: string) {
  const pipeCount = (line.match(/\|/g) || []).length
  if (pipeCount < 2) return false
  const cells = splitMarkdownTableRow(line)
  return cells.length > 1
}

function hasLikelyTableHeader(row: string[]) {
  const headerText = row.join(' ').toLowerCase()
  return (
    (headerText.includes('channel') && headerText.includes('budget')) ||
    (headerText.includes('country') && headerText.includes('kpi')) ||
    (headerText.includes('campaign') && headerText.includes('funnel'))
  )
}

function extractMarkdownTables(content?: string) {
  const htmlTables = extractHtmlTables(content)
  const lines = String(content || '').replace(/\r/g, '').split('\n')
  const tables: string[][][] = []
  let current: string[] = []

  const flush = () => {
    if (current.length >= 2) {
      const hasDivider = current.some(isMarkdownDividerRow)
      const rows = current
        .filter((line) => !isMarkdownDividerRow(line))
        .map(splitMarkdownTableRow)
        .filter((row) => row.length > 1)
      if (rows.length >= 2 && (hasDivider || hasLikelyTableHeader(rows[0]))) tables.push(rows)
    }
    current = []
  }

  for (const line of lines) {
    if (isPotentialMarkdownTableLine(line)) current.push(line)
    else flush()
  }
  flush()

  return [...tables, ...htmlTables]
}

function getTableCell(headers: string[], row: string[], aliases: string[]) {
  const index = headers.findIndex((header) => aliases.some((alias) => header.includes(alias)))
  return index >= 0 ? row[index] || '' : ''
}

function extractMediaTableRows(content?: string) {
  const tables = extractMarkdownTables(content)
  for (const table of tables) {
    const headers = table[0].map((header) => header.toLowerCase().replace(/[^a-z0-9%]+/g, ' ').trim())
    const headerText = headers.join(' ')
    if (!headerText.includes('channel') || !headerText.includes('budget')) continue
    if (!headerText.includes('kpi') && !headerText.includes('funnel')) continue

    return table.slice(1).map((row) => ({
      country: getTableCell(headers, row, ['country', 'market']),
      industry: getTableCell(headers, row, ['industry', 'vertical']),
      campaignObjective: getTableCell(headers, row, ['campaign objective', 'objective']),
      funnelStage: getTableCell(headers, row, ['funnel stage', 'funnel role', 'role']),
      channel: getTableCell(headers, row, ['channel']),
      platformObjective: getTableCell(headers, row, ['platform objective', 'platform campaign objective']),
      audience: getTableCell(headers, row, ['audience segment', 'audience']),
      targeting: getTableCell(headers, row, ['targeting notes', 'targeting']),
      format: getTableCell(headers, row, ['format placement', 'placement', 'format']),
      buyingType: getTableCell(headers, row, ['buying type', 'buying']),
      flightStart: getTableCell(headers, row, ['flight start', 'start']),
      flightEnd: getTableCell(headers, row, ['flight end', 'end']),
      duration: getTableCell(headers, row, ['duration']),
      schedulingModel: getTableCell(headers, row, ['scheduling model', 'schedule model']),
      budget: getTableCell(headers, row, ['budget']),
      budgetPercent: getTableCell(headers, row, ['budget %', 'budget percent']),
      benchmarkCostType: getTableCell(headers, row, ['benchmark cost type', 'cost type']),
      benchmarkCost: getTableCell(headers, row, ['benchmark cost']),
      estimatedImpressions: getTableCell(headers, row, ['est impressions', 'estimated impressions', 'impressions']),
      estimatedClicks: getTableCell(headers, row, ['est clicks', 'estimated clicks', 'clicks']),
      estimatedOutcomes: getTableCell(headers, row, ['est outcomes', 'estimated outcomes', 'outcomes', 'actions']),
      primaryKpi: getTableCell(headers, row, ['primary kpi', 'kpi']),
      secondaryKpis: getTableCell(headers, row, ['secondary kpis', 'secondary kpi']),
      frequencyCap: getTableCell(headers, row, ['frequency cap', 'frequency pacing', 'pacing', 'frequency']),
      trackingRequirement: getTableCell(headers, row, ['tracking requirement', 'tracking']),
      notes: getTableCell(headers, row, ['notes rationale', 'optimization notes', 'rationale', 'notes']),
      sourceAssumption: getTableCell(headers, row, ['source assumption', 'source', 'assumption']),
    })).filter((row) => row.channel || row.budget || row.primaryKpi)
  }
  return []
}

function inferMediaRows(content?: string) {
  const tableRows = extractMediaTableRows(content)
  if (tableRows.length) return tableRows

  const bullets = getBulletLines(content)
  const defaults = ['Meta / Instagram', 'Google Search', 'YouTube', 'Email / CRM']

  return (bullets.length ? bullets : defaults).slice(0, 6).map((line, index) => ({
    country: '',
    industry: '',
    campaignObjective: '',
    funnelStage: '',
    channel: defaults[index] || `Channel ${index + 1}`,
    platformObjective: '',
    audience: '',
    targeting: '',
    format: '',
    buyingType: '',
    flightStart: '',
    flightEnd: '',
    duration: '',
    schedulingModel: '',
    budget: index === 0 ? 5000 : index === 1 ? 3000 : 1500,
    budgetPercent: '',
    benchmarkCostType: '',
    benchmarkCost: '',
    estimatedImpressions: '',
    estimatedClicks: '',
    estimatedOutcomes: '',
    primaryKpi: '',
    secondaryKpis: '',
    frequencyCap: '',
    trackingRequirement: '',
    notes: line,
    sourceAssumption: '',
  }))
}

async function createXlsxBuffer(input: ExportArtifactInput) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Mission Control'
  workbook.created = new Date()
  workbook.modified = new Date()

  const mediaRows = inferMediaRows(input.artifact.content)

  const overview = workbook.addWorksheet('Summary', {
    views: [{ state: 'frozen', ySplit: 5 }],
  })

  overview.mergeCells('A1:H1')
  overview.getCell('A1').value = input.artifact.title
  overview.getCell('A1').font = { name: 'Aptos Display', size: 18, bold: true, color: { argb: 'FF1F2937' } }
  overview.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F6FB' } }
  overview.getRow(1).height = 28

  getRequestRecap(input).forEach((line, idx) => {
    overview.getCell(`A${idx + 3}`).value = line.label
    overview.getCell(`B${idx + 3}`).value = line.value
    overview.getCell(`A${idx + 3}`).font = { bold: true, color: { argb: 'FF4B5563' } }
  })

  overview.mergeCells('A10:H18')
  overview.getCell('A10').value = htmlToPlainText(input.artifact.content) || 'No content was stored for this artifact.'
  overview.getCell('A10').alignment = { wrapText: true, vertical: 'top' }
  overview.getCell('A10').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }
  overview.getCell('A10').border = {
    top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
  }
  overview.columns = [
    { width: 18 },
    { width: 20 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
  ]

  const countrySummary = new Map<string, { rows: number; budget: number }>()
  for (const row of mediaRows) {
    const country = row.country || 'Unspecified'
    const numericBudget = Number(String(row.budget || '').replace(/[^0-9.-]+/g, '')) || 0
    const existing = countrySummary.get(country) || { rows: 0, budget: 0 }
    countrySummary.set(country, { rows: existing.rows + 1, budget: existing.budget + numericBudget })
  }
  let summaryRow = 20
  overview.getCell(`A${summaryRow}`).value = 'Country Summary'
  overview.getCell(`A${summaryRow}`).font = { bold: true, color: { argb: 'FF1F2937' } }
  summaryRow += 1
  overview.addRow([])
  const summaryHeader = overview.getRow(summaryRow)
  summaryHeader.values = ['Country', 'Line Items', 'Planned Budget']
  summaryHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  summaryHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } }
  for (const [country, summary] of countrySummary) {
    summaryRow += 1
    overview.getRow(summaryRow).values = [country, summary.rows, summary.budget || '']
  }

  const plan = workbook.addWorksheet('Media Plan')
  const headers = [
    'Country',
    'Industry',
    'Campaign Objective',
    'Funnel Stage',
    'Channel',
    'Platform Objective',
    'Format / Placement',
    'Buying Type',
    'Flight Start',
    'Flight End',
    'Duration',
    'Scheduling Model',
    'Budget',
    'Budget %',
    'Benchmark Cost Type',
    'Benchmark Cost',
    'Est. Impressions',
    'Est. Clicks',
    'Est. Outcomes',
    'Primary KPI',
    'Secondary KPIs',
    'Frequency Cap',
    'Tracking Requirement',
    'Notes / Rationale',
    'Source / Assumption',
  ]
  plan.addRow(headers)
  plan.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  plan.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } }
  plan.views = [{ state: 'frozen', ySplit: 1 }]

  mediaRows.forEach((row) => {
    plan.addRow([
      row.country,
      row.industry,
      row.campaignObjective,
      row.funnelStage,
      row.channel,
      row.platformObjective,
      row.format,
      row.buyingType,
      row.flightStart,
      row.flightEnd,
      row.duration,
      row.schedulingModel,
      row.budget,
      row.budgetPercent,
      row.benchmarkCostType,
      row.benchmarkCost,
      row.estimatedImpressions,
      row.estimatedClicks,
      row.estimatedOutcomes,
      row.primaryKpi,
      row.secondaryKpis,
      row.frequencyCap,
      row.trackingRequirement,
      row.notes,
      row.sourceAssumption,
    ])
  })

  plan.columns = [
    { width: 16 },
    { width: 22 },
    { width: 22 },
    { width: 16 },
    { width: 20 },
    { width: 24 },
    { width: 26 },
    { width: 16 },
    { width: 14 },
    { width: 14 },
    { width: 14 },
    { width: 18 },
    { width: 14 },
    { width: 12 },
    { width: 18 },
    { width: 16 },
    { width: 18 },
    { width: 16 },
    { width: 18 },
    { width: 18 },
    { width: 28 },
    { width: 16 },
    { width: 30 },
    { width: 42 },
    { width: 30 },
  ]
  plan.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    row.alignment = { wrapText: true, vertical: 'top' }
  })

  const benchmarks = workbook.addWorksheet('Benchmarks')
  benchmarks.addRow(['Country', 'Benchmark Cost Type', 'Benchmark Cost', 'Confidence / Source'])
  benchmarks.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  benchmarks.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } }
  mediaRows.forEach((row) => benchmarks.addRow([row.country, row.benchmarkCostType, row.benchmarkCost, row.sourceAssumption]))
  benchmarks.columns = [{ width: 18 }, { width: 24 }, { width: 18 }, { width: 60 }]

  const assumptions = workbook.addWorksheet('Assumptions')
  assumptions.addRow(['Area', 'Assumption / Note'])
  assumptions.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  assumptions.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } }
  assumptions.addRow(['Planning basis', 'Benchmarks are planning estimates and should be validated in platform planners before final media buying.'])
  assumptions.addRow(['Formula guidance', 'Impressions = budget / CPM * 1000. Clicks = impressions * CTR or budget / CPC. Outcomes = clicks * CVR or budget / benchmark cost per result.'])
  assumptions.addRow(['Quality gate', 'Budget percentages should sum to 100%, and every row should have an objective, KPI, tracking requirement, and source/assumption.'])
  assumptions.columns = [{ width: 24 }, { width: 90 }]
  assumptions.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    row.alignment = { wrapText: true, vertical: 'top' }
  })

  const optimization = workbook.addWorksheet('Optimization Rules')
  optimization.addRow(['Channel', 'Primary KPI', 'Tracking Requirement', 'Optimization Notes'])
  optimization.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  optimization.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEA580C' } }
  mediaRows.forEach((row) => optimization.addRow([row.channel, row.primaryKpi, row.trackingRequirement, row.notes]))
  optimization.columns = [{ width: 22 }, { width: 22 }, { width: 36 }, { width: 70 }]
  optimization.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return
    row.alignment = { wrapText: true, vertical: 'top' }
  })

  return workbook.xlsx.writeBuffer()
}

function buildDocxTable(rows: string[][]) {
  const columnCount = Math.max(...rows.map((row) => row.length))
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map((row, rowIndex) =>
      new TableRow({
        children: Array.from({ length: columnCount }).map((_, cellIndex) =>
          new TableCell({
            width: { size: Math.floor(100 / columnCount), type: WidthType.PERCENTAGE },
            borders: {
              top: { style: BorderStyle.SINGLE, color: 'D8DEE7', size: 1 },
              bottom: { style: BorderStyle.SINGLE, color: 'D8DEE7', size: 1 },
              left: { style: BorderStyle.SINGLE, color: 'D8DEE7', size: 1 },
              right: { style: BorderStyle.SINGLE, color: 'D8DEE7', size: 1 },
            },
            shading: rowIndex === 0 ? { fill: 'EEF4FF' } : undefined,
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: row[cellIndex] || '',
                    bold: rowIndex === 0,
                  }),
                ],
              }),
            ],
          })
        ),
      })
    ),
  })
}

async function createDocxBuffer(input: ExportArtifactInput) {
  const view = await buildExportViewModel(input)
  const children: Array<Paragraph | Table> = [
    new Paragraph({
      text: view.title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 280 },
    }),
    new Paragraph({
      text: 'Request Recap',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 80, after: 140 },
    }),
    buildDocxTable(view.recap.map((item) => [item.label, item.value])),
  ]

  if (view.image) {
    children.push(
      new Paragraph({
        text: 'Generated Image',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 220, after: 120 },
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new ImageRun({
            data: view.image.buffer,
            type: view.image.extension,
            transformation: { width: 460, height: 280 },
          }),
        ],
      })
    )
  }

  children.push(
    new Paragraph({
      text: 'Final Output',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 220, after: 140 },
    })
  )

  for (const section of view.sections) {
    children.push(
      new Paragraph({
        text: section.heading,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 120, after: 100 },
      })
    )
    for (const block of section.blocks) {
      if (block.type === 'paragraph') {
        children.push(new Paragraph({ text: block.text, spacing: { after: 140 } }))
      } else if (block.type === 'subheading') {
        children.push(
          new Paragraph({
            children: [new TextRun({ text: block.text, bold: true })],
            spacing: { before: 80, after: 100 },
          })
        )
      } else if (block.type === 'list') {
        block.items.forEach((item) => {
          children.push(
            new Paragraph({
              text: item,
              bullet: { level: 0 },
              spacing: { after: 80 },
            })
          )
        })
      } else if (block.type === 'table') {
        children.push(buildDocxTable(block.rows))
      }
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: DOC_A4_WIDTH,
              height: DOC_A4_HEIGHT,
            },
            margin: {
              top: 900,
              right: 900,
              bottom: 900,
              left: 900,
            },
          },
        },
        children,
      },
    ],
  })

  return Packer.toBuffer(doc)
}

async function createPdfBuffer(input: ExportArtifactInput) {
  const view = await buildExportViewModel(input)
  const pdfDoc = await PDFDocument.create()
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  let page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT])
  let y = A4_HEIGHT - 56
  const marginX = 46
  const contentWidth = A4_WIDTH - marginX * 2

  const ensureSpace = (heightNeeded: number) => {
    if (y - heightNeeded < 46) {
      page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT])
      y = A4_HEIGHT - 56
    }
  }

  const wrapText = (text: string, font: typeof regular, size: number, maxWidth: number) => {
    const lines: string[] = []
    for (const rawLine of text.split('\n')) {
      const words = rawLine.split(/\s+/).filter(Boolean)
      if (!words.length) {
        lines.push('')
        continue
      }
      let current = ''
      for (const word of words) {
        const trial = current ? `${current} ${word}` : word
        if (font.widthOfTextAtSize(trial, size) > maxWidth && current) {
          lines.push(current)
          current = word
        } else {
          current = trial
        }
      }
      if (current) lines.push(current)
    }
    return lines
  }

  const drawWrapped = (text: string, opts?: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; gap?: number }) => {
    const size = opts?.size || 11
    const font = opts?.bold ? bold : regular
    const color = opts?.color || rgb(0.17, 0.2, 0.27)
    const lines = wrapText(text, font, size, contentWidth)

    for (const line of lines) {
      ensureSpace(size + 10)
      page.drawText(line, { x: marginX, y, size, font, color })
      y -= size + (opts?.gap ?? 4)
    }
  }

  const drawSectionHeading = (text: string) => {
    y -= 8
    ensureSpace(28)
    page.drawText(text, { x: marginX, y, size: 15, font: bold, color: rgb(0.07, 0.12, 0.2) })
    y -= 22
  }

  const drawTable = (rows: string[][]) => {
    const columnCount = Math.max(...rows.map((row) => row.length))
    const columnWidth = contentWidth / columnCount
    const fontSize = columnCount > 3 ? 8.5 : 9.5

    for (const [rowIndex, row] of rows.entries()) {
      const rowLines = row.map((cell) => wrapText(cell || '', rowIndex === 0 ? bold : regular, fontSize, columnWidth - 10))
      const rowHeight = Math.max(...rowLines.map((lines) => lines.length)) * (fontSize + 3) + 10
      ensureSpace(rowHeight + 4)

      let x = marginX
      for (let cellIndex = 0; cellIndex < columnCount; cellIndex += 1) {
        page.drawRectangle({
          x,
          y: y - rowHeight + 6,
          width: columnWidth,
          height: rowHeight,
          borderWidth: 1,
          borderColor: rgb(0.85, 0.88, 0.92),
          color: rowIndex === 0 ? rgb(0.93, 0.96, 1) : rgb(1, 1, 1),
        })
        const lines = rowLines[cellIndex] || ['']
        lines.forEach((line, lineIndex) => {
          page.drawText(line, {
            x: x + 5,
            y: y - 10 - lineIndex * (fontSize + 3),
            size: fontSize,
            font: rowIndex === 0 ? bold : regular,
            color: rgb(0.18, 0.22, 0.3),
          })
        })
        x += columnWidth
      }
      y -= rowHeight + 4
    }
  }

  page.drawRectangle({
    x: marginX,
    y: y - 24,
    width: contentWidth,
    height: 44,
    color: rgb(0.96, 0.97, 1),
    borderWidth: 1,
    borderColor: rgb(0.86, 0.89, 0.95),
  })
  page.drawText(view.title, { x: marginX + 14, y: y - 8, size: 22, font: bold, color: rgb(0.1, 0.14, 0.22) })
  y -= 64

  drawSectionHeading('Request Recap')
  drawTable(view.recap.map((item) => [item.label, item.value]))

  if (view.image) {
    drawSectionHeading('Generated Image')
    const embedded = view.image.extension === 'png' ? await pdfDoc.embedPng(view.image.buffer) : await pdfDoc.embedJpg(view.image.buffer)
    const maxWidth = contentWidth
    const maxHeight = 260
    const scale = Math.min(maxWidth / embedded.width, maxHeight / embedded.height, 1)
    const width = embedded.width * scale
    const height = embedded.height * scale
    ensureSpace(height + 20)
    page.drawImage(embedded, {
      x: marginX + (contentWidth - width) / 2,
      y: y - height,
      width,
      height,
    })
    y -= height + 20
  }

  drawSectionHeading('Final Output')
  for (const section of view.sections) {
    drawWrapped(section.heading, { size: 12.5, bold: true, color: rgb(0.13, 0.17, 0.25), gap: 5 })
    for (const block of section.blocks) {
      if (block.type === 'paragraph') {
        drawWrapped(block.text, { size: 11, gap: 5 })
      } else if (block.type === 'subheading') {
        drawWrapped(block.text, { size: 10.5, bold: true, gap: 4, color: rgb(0.24, 0.34, 0.52) })
      } else if (block.type === 'list') {
        block.items.forEach((item) => drawWrapped(`• ${item}`, { size: 11, gap: 5 }))
      } else if (block.type === 'table') {
        drawTable(block.rows)
      }
    }
    y -= 8
  }

  return Buffer.from(await pdfDoc.save())
}

function textFromBlocks(blocks: ExportBlock[]) {
  return blocks
    .flatMap((block) => {
      if (block.type === 'paragraph' || block.type === 'subheading') return [block.text]
      if (block.type === 'list') return block.items.map((item) => `• ${item}`)
      return block.rows.map((row) => row.join(' | '))
    })
    .join('\n')
}

async function createPptxBuffer(input: ExportArtifactInput) {
  const view = await buildExportViewModel(input)
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'
  pptx.author = 'Mission Control'
  pptx.subject = 'Client-ready output export'
  pptx.title = view.title
  pptx.company = 'Mission Control'

  const addSlideChrome = (slide: any, title: string) => {
    slide.background = { color: 'F8FAFC' }
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.3,
      y: 0.3,
      w: 12.7,
      h: 0.7,
      fill: { color: 'EEF4FF' },
      line: { color: 'D9E2F2', pt: 1 },
      radius: 0.18,
    })
    slide.addText(title, {
      x: 0.55,
      y: 0.48,
      w: 7.8,
      h: 0.28,
      fontFace: 'Aptos Display',
      fontSize: 24,
      bold: true,
      color: '172033',
      margin: 0,
    })
  }

  const titleSlide = pptx.addSlide()
  addSlideChrome(titleSlide, view.title)
  titleSlide.addText('Request Recap', {
    x: 0.55,
    y: 1.3,
    w: 2.2,
    h: 0.24,
    fontFace: 'Aptos Display',
    fontSize: 15,
    bold: true,
    color: '334155',
    margin: 0,
  })
  titleSlide.addTable(
    view.recap.map((item) => [item.label, item.value]) as any,
    {
      x: 0.55,
      y: 1.6,
      w: view.image ? 5.2 : 12,
      h: 2.8,
      border: { type: 'solid', color: 'D9E2F2', pt: 1 },
      fill: { color: 'FFFFFF' },
      color: '1F2937',
      fontFace: 'Aptos',
      fontSize: 11,
      rowH: 0.4,
      colW: view.image ? [1.4, 3.8] : [1.8, 10.2],
      margin: 0.08,
      bold: false,
    }
  )

  if (view.image) {
    titleSlide.addText('Generated Image', {
      x: 6.2,
      y: 1.3,
      w: 2.5,
      h: 0.24,
      fontFace: 'Aptos Display',
      fontSize: 15,
      bold: true,
      color: '334155',
      margin: 0,
    })
    titleSlide.addImage({
      data: `data:image/${view.image.extension};base64,${view.image.buffer.toString('base64')}`,
      x: 6.2,
      y: 1.6,
      w: 6.3,
      h: 3.7,
      sizing: { type: 'contain', x: 6.2, y: 1.6, w: 6.3, h: 3.7 },
    })
  }

  const addContentSlide = (sectionTitle: string, body: string, tableRows?: any) => {
    const slide = pptx.addSlide()
    addSlideChrome(slide, sectionTitle)
    if (tableRows) {
      slide.addTable(tableRows as any, {
        x: 0.6,
        y: 1.3,
        w: 12.1,
        h: 5.5,
        border: { type: 'solid', color: 'D9E2F2', pt: 1 },
        fill: { color: 'FFFFFF' },
        color: '1F2937',
        fontFace: 'Aptos',
        fontSize: 11,
        rowH: 0.45,
        margin: 0.08,
      })
      return
    }

    slide.addText(body, {
      x: 0.7,
      y: 1.35,
      w: 12,
      h: 5.6,
      fontFace: 'Aptos',
      fontSize: 16,
      color: '243145',
      valign: 'top',
      margin: 0.06,
      breakLine: false,
      fit: 'shrink',
      bullet: { indent: 18 },
    })
  }

  for (const section of view.sections) {
    const tableBlocks = section.blocks.filter((block) => block.type === 'table') as Array<{ type: 'table'; rows: string[][] }>
    const textBody = textFromBlocks(section.blocks.filter((block) => block.type !== 'table'))

    if (textBody) {
      addContentSlide(section.heading, textBody)
    }
    tableBlocks.forEach((block, index) => {
      addContentSlide(`${section.heading}${tableBlocks.length > 1 ? ` ${index + 1}` : ''}`, '', block.rows as any)
    })
  }

  return Buffer.from(await pptx.write({ outputType: 'nodebuffer' }) as Buffer)
}

async function ensureOutputDir() {
  await mkdir(GENERATED_ROOT, { recursive: true })
}

export async function exportArtifactToFile(input: ExportArtifactInput): Promise<ArtifactExport> {
  await ensureOutputDir()

  const baseName = buildBaseName(input.artifact)
  const fileName = `${baseName}.${input.format}`
  const filePath = path.join(GENERATED_ROOT, fileName)

  let buffer: Buffer
  if (input.format === 'xlsx') {
    buffer = Buffer.from(await createXlsxBuffer(input))
  } else if (input.format === 'docx') {
    buffer = await createDocxBuffer(input)
  } else if (input.format === 'pptx') {
    buffer = await createPptxBuffer(input)
  } else {
    buffer = await createPdfBuffer(input)
  }

  await writeFile(filePath, buffer)

  return {
    id: `${input.artifact.id}-${input.format}-${Date.now()}`,
    format: input.format,
    fileName,
    path: filePath,
    publicUrl: `/api/artifacts/download?fileName=${encodeURIComponent(fileName)}`,
    createdAt: new Date().toISOString(),
    notes:
      input.format === 'xlsx'
        ? 'Structured media workbook generated from the saved artifact.'
        : 'Client-ready export generated from request recap and final output.',
  }
}
