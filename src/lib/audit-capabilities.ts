import { DeliverableType, ProviderSettings } from '@/lib/types'

export type AuditMode = 'seo' | 'ui' | 'browser'
export type AuditConnectorId = 'browserInspector' | 'seoCrawler' | 'searchConsole' | 'accessibilityProbe'

export interface AuditConnectorDefinition {
  id: AuditConnectorId
  name: string
  shortName: string
  description: string
}

export interface AuditExecutionProfile {
  mode: AuditMode
  title: string
  summary: string
  requiredConnectors: AuditConnectorDefinition[]
  evidenceChecklist: string[]
  preferredLead: string
  preferredSupport: string[]
}

export const AUDIT_CONNECTORS: Record<AuditConnectorId, AuditConnectorDefinition> = {
  browserInspector: {
    id: 'browserInspector',
    name: 'Browser Inspector MCP',
    shortName: 'Browser Inspector',
    description: 'Captures pages, DOM structure, screenshots, and interaction states for UI and content reviews.',
  },
  seoCrawler: {
    id: 'seoCrawler',
    name: 'SEO Crawler MCP',
    shortName: 'SEO Crawler',
    description: 'Collects crawl data, metadata, headings, canonicals, links, and technical SEO issues.',
  },
  searchConsole: {
    id: 'searchConsole',
    name: 'Search Console MCP',
    shortName: 'Search Console',
    description: 'Adds query, indexation, coverage, and performance evidence from Google Search Console.',
  },
  accessibilityProbe: {
    id: 'accessibilityProbe',
    name: 'Accessibility Probe MCP',
    shortName: 'Accessibility Probe',
    description: 'Checks contrast, keyboard states, aria structure, and common WCAG UI issues.',
  },
}

export function inferAuditMode(request: string, deliverableType?: DeliverableType): AuditMode | null {
  const lower = request.toLowerCase()
  if (deliverableType === 'seo-audit') return 'seo'
  if (deliverableType === 'ui-audit') return 'ui'
  if (/(ui audit|ux audit|website audit|page audit|landing page audit|accessibility audit)/.test(lower)) return 'ui'
  if (/(browser audit|page review|screen review|interaction audit)/.test(lower)) return 'browser'
  if (/(seo audit|technical seo|search console|crawl audit|indexation audit)/.test(lower)) return 'seo'
  return null
}

export function getAuditExecutionProfile(request: string, deliverableType?: DeliverableType): AuditExecutionProfile | null {
  const mode = inferAuditMode(request, deliverableType)
  if (!mode) return null

  if (mode === 'seo') {
    return {
      mode,
      title: 'SEO Audit',
      summary: 'Atlas leads a technical/content search audit with browser evidence, crawl findings, and prioritised fixes.',
      requiredConnectors: [AUDIT_CONNECTORS.seoCrawler, AUDIT_CONNECTORS.browserInspector, AUDIT_CONNECTORS.searchConsole],
      evidenceChecklist: [
        'Crawl/indexation findings',
        'Metadata and headings review',
        'Internal linking and canonical issues',
        'Content/search opportunity map',
        'Priority-ranked remediation plan',
      ],
      preferredLead: 'atlas',
      preferredSupport: ['maya', 'echo'],
    }
  }

  if (mode === 'ui') {
    return {
      mode,
      title: 'UI / UX Audit',
      summary: 'Finn leads a browser-backed interface review with accessibility checks, flow findings, and fix priorities.',
      requiredConnectors: [AUDIT_CONNECTORS.browserInspector, AUDIT_CONNECTORS.accessibilityProbe],
      evidenceChecklist: [
        'Multi-screen browser captures',
        'Responsive and navigation findings',
        'Accessibility issues and severity',
        'Interaction or usability friction',
        'Priority-ranked UI fixes',
      ],
      preferredLead: 'finn',
      preferredSupport: ['lyra', 'echo', 'dex'],
    }
  }

  return {
    mode,
    title: 'Browser Review',
    summary: 'Finn leads a browser review focused on page state, messaging clarity, and interaction quality.',
    requiredConnectors: [AUDIT_CONNECTORS.browserInspector],
    evidenceChecklist: [
      'Page-state captures',
      'Messaging and hierarchy issues',
      'Interaction friction points',
      'Recommended UI improvements',
    ],
    preferredLead: 'finn',
    preferredSupport: ['echo'],
  }
}

export function getAuditConnectorStatus(providerSettings?: ProviderSettings | null) {
  const mcp = providerSettings?.mcp
  return {
    browserInspector: Boolean(mcp?.browserInspector?.enabled && mcp?.browserInspector?.endpoint),
    seoCrawler: Boolean(mcp?.seoCrawler?.enabled && mcp?.seoCrawler?.endpoint),
    searchConsole: Boolean(mcp?.searchConsole?.enabled && mcp?.searchConsole?.endpoint),
    accessibilityProbe: Boolean(mcp?.accessibilityProbe?.enabled && mcp?.accessibilityProbe?.endpoint),
  }
}
