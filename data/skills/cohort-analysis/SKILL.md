---
id: cohort-analysis
name: Cohort Analysis
description: Compares user groups (cohorts) over time to understand retention patterns, lifetime value differences, and the long-term impact of acquisition channels and campaigns on customer behavior.
category: analytics
difficulty: intermediate
freedom: medium
agents: [dex]
pipelines: [analytics]
tools: [spreadsheet, document]
version: 1.0
author: agency
---

# Cohort Analysis

Compares user groups (cohorts) over time to understand retention patterns, lifetime value differences, and the long-term impact of acquisition channels and campaigns on customer behavior.

## When to use

Use this skillany time analyzing user behavior over time — to understand how different acquisition cohorts behave differently, where retention drops off, and what drives long-term customer value.

## Context

You are a data analyst who uses cohort analysis to uncover patterns in user behavior that simple conversion metrics miss, revealing the true value of acquisition channels and campaigns.

## Instructions

## Cohort Analysis

1. **Cohort Definition** — Choose the cohort dimension
   - ✓ Done when: Dimension is meaningful for the business question

2. **Metric Selection** — Choose metrics that answer the business question
   - ✓ Done when: Metrics are measurable and comparable

3. **Table Building** — Build cohort retention or revenue tables
   - ✓ Done when: Tables are accurate and comparable

4. **Pattern Analysis** — Identify what drives cohort differences
   - ✓ Done when: Insights are evidenced

5. **Recommendations** — Derive actionable steps from findings
   - ✓ Done when: Recommendations are specific and prioritized

## Key Inputs
- cohort_dimension: Dimension for cohort grouping (e.g., acquisition date, source)
- metrics: Metrics to analyze per cohort (e.g., retention, revenue)
- time_period: Time period for analysis
- data_sources: Data sources available for analysis

## When Not to Use
This skill overlaps with: attribution-modeling, predictive-analytics. Use those instead when: you need to predict future outcomes rather than analyze past behavior

`analytics` `cohort-analysis` `retention` `lTV`

## Output template

## Cohort Analysis Report

### Analysis Details
| Field | Value |
|-------|-------|
| Cohort dimension | {{cohort_dimension}} |
| Metrics | {{metrics}} |
| Period | {{time_period}} |
| Date | {{date}} |

### Cohort Retention Table
| Cohort | Size | Week 0 | Week 1 | Week 2 | Week 3 | Week 4 |
|--------|------|--------|--------|--------|--------|--------|
| Jan | | | | | | |
| Feb | | | | | | |
| Mar | | | | | | |

### Key Patterns
**Best performing cohort:**
**Why:**

**Worst performing cohort:**
**Why:**

### Revenue Cohort Table
| Cohort | Size | Month 1 | Month 3 | Month 6 | Month 12 | LTV |
|--------|------|---------|---------|---------|---------|------|
| | | | | | | |

### Segment Deep-Dive
| Segment | Behavior | Insight |
|---------|----------|--------|
| | | |

### Recommendations
| Action | Expected impact | Priority |
|--------|----------------|----------|
| | | |

## Checklist

- Dimension is meaningful for the business question
- Metrics are measurable and comparable
- Tables are accurate and comparable
- Insights are evidenced
- Recommendations are specific and prioritized

## Workflow

1. Cohort Definition — Choose the cohort dimension (verify: Dimension is meaningful for the business question)
2. Metric Selection — Choose metrics that answer the business question (verify: Metrics are measurable and comparable)
3. Table Building — Build cohort retention or revenue tables (verify: Tables are accurate and comparable)
4. Pattern Analysis — Identify what drives cohort differences (verify: Insights are evidenced)
5. Recommendations — Derive actionable steps from findings (verify: Recommendations are specific and prioritized)
