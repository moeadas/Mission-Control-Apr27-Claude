---
id: funnel-analysis
name: Funnel Analysis
description: Analyzes user behavior through conversion funnels to identify where users drop off, understand why they leave, and recommend changes that improve conversion rates at each stage.
category: analytics
difficulty: intermediate
freedom: medium
agents: [dex]
pipelines: [analytics]
tools: [spreadsheet, document]
version: 1.0
author: agency
---

# Funnel Analysis

Analyzes user behavior through conversion funnels to identify where users drop off, understand why they leave, and recommend changes that improve conversion rates at each stage.

## When to use

Use this skillany time analyzing conversion funnels — to identify where users drop off, understand the causes of abandonment, and recommend changes that improve conversion rates at each stage.

## Context

You are a funnel analysis specialist who uses data to identify exactly where users abandon the conversion process and prescribes targeted fixes to improve conversion rates.

## Instructions

## Funnel Analysis

1. **Funnel Mapping** — Define every step in the conversion funnel
   - ✓ Done when: Funnel is complete

2. **Drop-off Measurement** — Calculate drop-off at each stage
   - ✓ Done when: Drop-off rates are accurate

3. **Cause Diagnosis** — Identify why users drop at each stage
   - ✓ Done when: Causes are evidenced

4. **Hypothesis Generation** — Generate hypotheses for improvement
   - ✓ Done when: Hypotheses are specific and testable

5. **Prioritization** — Rank fixes by impact and effort
   - ✓ Done when: Priority is clear

6. **Recommendations** — Make specific, data-backed recommendations
   - ✓ Done when: Recommendations are actionable

## Key Inputs
- funnel_name: Name of the funnel
- funnel_stages: Funnel stages to analyze
- traffic_source: Traffic source or campaign
- time_period: Time period for analysis
- device_segments: Device segments to analyze

## When Not to Use
This skill overlaps with: conversion-optimization, attribution-modeling. Use those instead when: you need to optimize a specific conversion metric rather than analyze the full journey

`analytics` `funnel-analysis` `conversion` `CRO`

## Output template

## Funnel Analysis: {{funnel_name}}

### Funnel Overview
| Field | Value |
|-------|-------|
| Funnel | {{funnel_name}} |
| Traffic source | {{traffic_source}} |
| Period | {{time_period}} |
| Date | {{date}} |

### Funnel Stages
| Step | Stage name | Users entering | Users completing | Drop-off rate |
|------|-----------|--------------|----------------|---------------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |
| 4 | | | | |
| 5 | | | | |

**Overall conversion rate:**

### Drop-off Analysis
| Stage | Drop-off rate | Severity | Rank |
|-------|--------------|---------|------|
| | | High/Med/Low | |

### Device/Segment Analysis
| Segment | Conversion rate | vs. average | Notes |
|---------|----------------|-------------|------|
| Desktop | | | |
| Mobile | | | |
| Tablet | | | |

### Drop-off Causes
| Stage | Suspected cause | Evidence |
|-------|----------------|---------|
| | | |

### Hypotheses
| Hypothesis | Change | Expected impact | Effort | Priority |
|-----------|--------|---------------|--------|----------|
| | | | | |

### Recommendations
| Change | Stage | Expected lift | Effort | Owner |
|--------|-------|--------------|-------|-------|
| | | | | |

### Expected Impact
| Metric | Before | After |
|--------|--------|-------|
| Conversion rate | | |
| Users converting | | |

## Checklist

- Funnel is complete
- Drop-off rates are accurate
- Causes are evidenced
- Hypotheses are specific and testable
- Priority is clear
- Recommendations are actionable

## Workflow

1. Funnel Mapping — Define every step in the conversion funnel (verify: Funnel is complete)
2. Drop-off Measurement — Calculate drop-off at each stage (verify: Drop-off rates are accurate)
3. Cause Diagnosis — Identify why users drop at each stage (verify: Causes are evidenced)
4. Hypothesis Generation — Generate hypotheses for improvement (verify: Hypotheses are specific and testable)
5. Prioritization — Rank fixes by impact and effort (verify: Priority is clear)
6. Recommendations — Make specific, data-backed recommendations (verify: Recommendations are actionable)
