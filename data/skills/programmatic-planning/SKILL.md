---
id: programmatic-planning
name: Programmatic Planning
description: Plans and structures programmatic advertising campaigns including DSP selection, audience segments, bidding strategies, deal types, and inventory sources for maximum efficiency and brand safety.
category: media
difficulty: advanced
freedom: medium
agents: [nova]
pipelines: [media-plan]
tools: [analytics, spreadsheet, document]
tags: [media, planning, programmatic-planning]
version: 1.0
author: agency
---

# Programmatic Planning

Plans and structures programmatic advertising campaigns including DSP selection, audience segments, bidding strategies, deal types, and inventory sources for maximum efficiency and brand safety.

## When to use

Use this skillany time planning programmatic display, video, or audio campaigns including dsp setup, audience strategy, deal structures, and bid optimization.

## Context

You are a programmatic media specialist who plans data-driven automated media buys. You understand DSP platforms, audience segments, bidding algorithms, deal types (open exchange, PMP, PG), brand safety, and viewability standards.

## Instructions

## Programmatic Planning

1. **Campaign Structure** — Design campaign hierarchy in DSP
   - ✓ Done when: Structure supports optimization granularity

2. **DSP Selection** — Select DSP based on requirements
   - ✓ Done when: DSP access matches inventory and data needs

3. **Audience Strategy** — Build layered targeting approach
   - ✓ Done when: Audience layers avoid over-narrowing

4. **Inventory Strategy** — Select deal types and exchanges
   - ✓ Done when: Inventory quality matches brand requirements

5. **Bidding Strategy** — Set bid types and targets per line item
   - ✓ Done when: Bid strategy aligns with objectives

6. **Brand Safety** — Configure safety and viewability measures
   - ✓ Done when: Brand safety is comprehensive

7. **Creative Mapping** — Map creatives to segments and placements
   - ✓ Done when: Creative relevance maximized

8. **Optimization Plan** — Define pacing, triggers, and rules
   - ✓ Done when: Optimization triggers are automated where possible

## Key Inputs
- client_name: Client or brand name
- campaign_objective: Campaign objective (awareness, traffic, conversions)
- budget: Programmatic budget
- target_audience: Target audience segments
- ad_formats: Ad formats (display, video, native, audio)
- dsp_platform: Preferred DSP platform (DV360, TTD, Amazon DSP)

## Output template

## Programmatic Plan: {{client_name}}

### Campaign Structure
| Level | Name | Objective | Budget | Dates |
|-------|------|-----------|--------|-------|
| Campaign | | | | |
| Line Item 1 | | | | |
| Line Item 2 | | | | |

### DSP Selection
| DSP | Rationale | Unique Inventory | Data Access |
|-----|-----------|-----------------|-------------|
| | | | |

### Audience Strategy
| Layer | Source | Segment | Est. Size | Priority |
|-------|--------|---------|-----------|----------|
| 1st Party | CRM / Pixel | | | High |
| 2nd Party | Publisher | | | Medium |
| 3rd Party | Data Provider | | | Low |
| Contextual | Keywords / Topics | | | |

### Inventory Strategy
| Deal Type | Publishers / Exchanges | Format | CPM Range |
|-----------|----------------------|--------|----------|
| PG | | | |
| PMP | | | |
| Open Exchange | | | |

### Bidding Strategy
| Line Item | Bid Type | Target | Cap |
|-----------|----------|--------|-----|
| | Target CPA / vCPM / Max Conv | | |

### Brand Safety Configuration
| Measure | Setting | Tool |
|---------|---------|------|
| Pre-bid | | IAS / DV |
| Viewability | | |
| Exclusion lists | | |

### Optimization Triggers
| Trigger | Threshold | Action |
|---------|-----------|--------|
| Low viewability | < 60% | Pause placement |
| High CPA | > {{target_cpa}} | Reduce bid |

## Checklist

- Structure supports optimization granularity
- DSP access matches inventory and data needs
- Audience layers avoid over-narrowing
- Inventory quality matches brand requirements
- Bid strategy aligns with objectives
- Brand safety is comprehensive
- Creative relevance maximized
- Optimization triggers are automated where possible

## Workflow

1. Campaign Structure — Design campaign hierarchy in DSP (verify: Structure supports optimization granularity)
2. DSP Selection — Select DSP based on requirements (verify: DSP access matches inventory and data needs)
3. Audience Strategy — Build layered targeting approach (verify: Audience layers avoid over-narrowing)
4. Inventory Strategy — Select deal types and exchanges (verify: Inventory quality matches brand requirements)
5. Bidding Strategy — Set bid types and targets per line item (verify: Bid strategy aligns with objectives)
6. Brand Safety — Configure safety and viewability measures (verify: Brand safety is comprehensive)
7. Creative Mapping — Map creatives to segments and placements (verify: Creative relevance maximized)
8. Optimization Plan — Define pacing, triggers, and rules (verify: Optimization triggers are automated where possible)
