---
id: trend-analysis
name: Trend Analysis
description: Identifies, monitors, and interprets emerging and declining patterns in advertising performance, consumer behavior, and market dynamics to inform strategic decisions.
category: research
difficulty: intermediate
freedom: high
agents: [maya]
pipelines: [analytics-pipeline]
tools: [spreadsheet, document, "## Strategy"]
tags: [trends, time-series, analytics, performance]
version: 1.0
author: agency
---

# Trend Analysis

Identifies, monitors, and interprets emerging and declining patterns in advertising performance, consumer behavior, and market dynamics to inform strategic decisions.

## When to use

Use this skillany time tracking campaign performance over time, identifying seasonal patterns, spotting early signals of market shifts, or needing to explain performance changes to stakeholders.

## Context

You are a trend analysis specialist with expertise in time-series data interpretation for advertising and marketing. You identify meaningful signals amid noise and connect trends to business outcomes.

## Instructions

## Trend Analysis

1. **Collect data** — Gather time-series data for relevant metrics
   - ✓ Done when: Data is complete with no unexplained gaps

2. **Visualize** — Plot the data to see overall shape and patterns
   - ✓ Done when: Visualization reveals clear trend direction

3. **Decompose** — Separate trend, seasonality, and residual noise
   - ✓ Done when: Components are statistically meaningful

4. **Correlate events** — Match inflection points to known events and campaigns
   - ✓ Done when: Causal links are plausible

5. **Conclude** — Synthesize findings into business recommendations
   - ✓ Done when: Recommendations are supported by the data

## Key Inputs
- metrics: Key performance metrics to analyze (ROAS, CTR, CPA, impressions, etc.)
- time_range: Time period for analysis: last 3 months, past year, 2-year trend
- granularity: Data frequency: daily, weekly, monthly (default: monthly)
- industry_context: Any known market events, seasonality, or competitive activity during the period

## Output template

## Trend Analysis Report

### Overview
[2-3 sentence summary of the overall trend story]

### Trend Decomposition
| Component | Description | Significance |
|-----------|-------------|---------------|
| Long-term Trend | [Upward/downward/stable] | [Growth rate or decline %] |
| Seasonality | [Pattern type] | [Repeating cycle] |
| Noise/Volatility | [Short-term fluctuations] | [Variance measure] |

### Key Inflection Points
| Date | Event | Impact on Metric |
|------|-------|-----------------|
| | | |

### Industry Context
[How market events correlate with trend changes]

### Forecast
[Extrapolation of trend into near-term future]

### Recommendations
- [ ] Strategic recommendation based on trend direction

## Checklist

- Data is complete with no unexplained gaps
- Visualization reveals clear trend direction
- Components are statistically meaningful
- Causal links are plausible
- Recommendations are supported by the data

## Workflow

1. Collect data — Gather time-series data for relevant metrics (verify: Data is complete with no unexplained gaps)
2. Visualize — Plot the data to see overall shape and patterns (verify: Visualization reveals clear trend direction)
3. Decompose — Separate trend, seasonality, and residual noise (verify: Components are statistically meaningful)
4. Correlate events — Match inflection points to known events and campaigns (verify: Causal links are plausible)
5. Conclude — Synthesize findings into business recommendations (verify: Recommendations are supported by the data)
