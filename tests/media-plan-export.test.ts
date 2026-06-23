import { rm } from 'node:fs/promises'
import ExcelJS from 'exceljs'
import { describe, expect, it } from 'vitest'

import { exportArtifactToFile } from '@/lib/server/artifact-export'
import type { Artifact } from '@/lib/types'

describe('media plan XLSX export', () => {
  it('populates the Media Plan worksheet from the markdown table', async () => {
    const artifact: Artifact = {
      id: 'media-plan-export-test',
      title: 'Victory Genomics | Jordan and Saudi Arabia Media Plan',
      deliverableType: 'media-plan',
      status: 'ready',
      format: 'markdown',
      createdAt: new Date('2026-06-23T12:00:00.000Z').toISOString(),
      updatedAt: new Date('2026-06-23T12:00:00.000Z').toISOString(),
      content: [
        '# Victory Genomics | Jordan and Saudi Arabia Media Plan',
        '',
        '## Media Plan Strategy',
        'Lead generation plan for equine whole genome sequencing.',
        '',
        '## Excel-Ready Media Plan',
        '| Country | Industry | Campaign Objective | Funnel Stage | Channel | Platform Objective | Format/Placement | Buying Type | Flight Start | Flight End | Duration | Scheduling Model | Budget | Budget % | Benchmark Cost Type | Benchmark Cost | Est. Impressions | Est. Clicks | Est. Outcomes | Primary KPI | Secondary KPIs | Frequency Cap | Tracking Requirement | Notes/Rationale | Source/Assumption |',
        '|---|---|---|---|---|---|---|---|---|---|---|---|---:|---:|---|---:|---:|---:|---:|---|---|---|---|---|---|',
        '| Jordan | Equine genomics | Lead generation | Conversion | Meta Ads | Leads | Reels + lead forms | Auction | 2026-07-01 | 2026-10-31 | 4 months | Always-on with weekly optimization | $30,000 | 30% | CPL | $12 | 1,200,000 | 18,000 | 2,500 | Qualified leads | CPL, CVR, lead quality | 2.5/week | Meta pixel + CRM tagging | Prioritize Arabian horse owners and breeders. | Planner benchmark |',
        '| Saudi Arabia | Equine genomics | Lead generation | Conversion | Google Search | Search leads | Text ads | Auction | 2026-07-01 | 2026-10-31 | 4 months | Demand capture | $70,000 | 70% | CPC | $1.20 | 900,000 | 35,000 | 3,000 | Qualified leads | CPL, CTR, search terms | N/A | GA4 + conversion import | Capture high-intent WGS searches. | Planner benchmark |',
      ].join('\n'),
    }

    const exportRecord = await exportArtifactToFile({
      artifact,
      format: 'xlsx',
      clientName: 'Victory Genomics',
      missionTitle: 'Media Plan',
      agentName: 'Nova',
    })

    try {
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.readFile(exportRecord.path)
      const sheet = workbook.getWorksheet('Media Plan')

      expect(sheet).toBeTruthy()
      expect(sheet?.getCell('A2').value).toBe('Jordan')
      expect(sheet?.getCell('E2').value).toBe('Meta Ads')
      expect(sheet?.getCell('M2').value).toBe('$30,000')
      expect(sheet?.getCell('A3').value).toBe('Saudi Arabia')
      expect(sheet?.getCell('E3').value).toBe('Google Search')
      expect(sheet?.getCell('T3').value).toBe('Qualified leads')
    } finally {
      await rm(exportRecord.path, { force: true })
    }
  })
})
