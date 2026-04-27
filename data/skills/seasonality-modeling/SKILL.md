---
id: seasonality-modeling
name: Seasonality Modeling
description: Models seasonal media spending patterns, audience behavior shifts, and demand fluctuations to optimize campaign timing and budget pacing across the calendar year.
category: media
difficulty: advanced
freedom: medium
agents: [nova]
pipelines: [media-plan]
tools: [analytics, spreadsheet, document]
tags: [media, planning, seasonality-modeling]
version: 1.0
author: agency
---

# Seasonality Modeling

Models seasonal media spending patterns, audience behavior shifts, and demand fluctuations to optimize campaign timing and budget pacing across the calendar year.

## When to use

Use this skillany time planning media spend across seasons, optimizing budget pacing by quarter, or adjusting strategies for seasonal demand patterns.

## Context

You are a media planning analyst who models seasonal patterns in consumer behavior, media costs, and competitive activity. You optimize budget allocation across the calendar year to maximize impact during peak periods and maintain presence during valleys.

## Instructions

## Seasonality Modeling

1. **Historical Analysis** — Review past performance by month
   - ✓ Done when: Data covers at least 12 months

2. **Demand Mapping** — Map consumer demand seasonality
   - ✓ Done when: Demand index is evidence-based

3. **Cost Modeling** — Model media cost fluctuations
   - ✓ Done when: Cost indices reflect actual market data

4. **Cultural Calendar** — Integrate regional events and holidays
   - ✓ Done when: All relevant cultural moments included

5. **Budget Pacing** — Create monthly budget allocation model
   - ✓ Done when: Pacing weights toward high-ROI periods

6. **Risk Planning** — Identify disruptions and contingencies
   - ✓ Done when: Contingency reserve is adequate

## Key Inputs
- client_name: Client or brand name
- industry: Industry for category benchmarks
- market: Geographic market
- budget: Annual media budget
- key_periods: Key seasonal periods to consider

## Output template

## Seasonality Model: {{client_name}}

### Demand Seasonality Index
| Month | Demand Index | Category Trend | Key Events |
|-------|-------------|----------------|------------|
| Jan | 80 | Low | New Year |
| Feb | 85 | Building | |
| Mar-Apr | 120 | Peak | Ramadan |
| ... | | | |

### Media Cost Index
| Month | CPM Index | Inventory Availability | Cost Pressure |
|-------|-----------|----------------------|---------------|
| | 100 = baseline | High / Med / Low | |

### Budget Pacing Model
| Month | Budget % | Budget Amount | Strategy | Rationale |
|-------|----------|---------------|----------|----------|
| Jan | 6% | | Always-on | Low demand, low cost |
| Mar | 12% | | Burst | Ramadan peak |
| Nov | 14% | | Burst | Black Friday |

### Always-On vs. Burst
| Period | Type | Budget % | Objective |
|--------|------|----------|----------|
| Jan-Feb | Always-on | 12% | Maintain presence |
| Mar-Apr | Burst | 24% | Ramadan peak |

### Contingency & Risk
| Risk Factor | Impact | Contingency | Reserve |
|------------|--------|-------------|--------|
| | High / Med | | % of budget |

## Checklist

- Data covers at least 12 months
- Demand index is evidence-based
- Cost indices reflect actual market data
- All relevant cultural moments included
- Pacing weights toward high-ROI periods
- Contingency reserve is adequate

## Workflow

1. Historical Analysis — Review past performance by month (verify: Data covers at least 12 months)
2. Demand Mapping — Map consumer demand seasonality (verify: Demand index is evidence-based)
3. Cost Modeling — Model media cost fluctuations (verify: Cost indices reflect actual market data)
4. Cultural Calendar — Integrate regional events and holidays (verify: All relevant cultural moments included)
5. Budget Pacing — Create monthly budget allocation model (verify: Pacing weights toward high-ROI periods)
6. Risk Planning — Identify disruptions and contingencies (verify: Contingency reserve is adequate)
