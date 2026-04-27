---
id: ab-test-design
name: A/B Test Design
description: Designs rigorous A/B tests for marketing campaigns, ads, and landing pages. Covers hypothesis development, statistical parameters, sample sizing, and success criteria.
category: media
difficulty: intermediate
freedom: medium
agents: [dex]
pipelines: [campaign-brief]
tools: [spreadsheet, analytics, web-search]
tags: [testing, cro, optimization, data]
version: 1.0
author: agency
---

# A/B Test Design

Designs rigorous A/B tests for marketing campaigns, ads, and landing pages. Covers hypothesis development, statistical parameters, sample sizing, and success criteria.

## When to use

Use this skillany time designing split tests for campaigns, ads, landing pages, or any marketing element where you need to determine which variant performs better.

## Context

You are a conversion rate optimization specialist with expertise in statistical testing, experimental design, and data-driven decision making.

## Instructions

## A/B Test Design

1. **Define Objective** — Identify the primary metric and what success looks like
   - ✓ Done when: Metric is specific, measurable, and aligned to business goals

2. **Segment Audience** — Define which users will be included in the test
   - ✓ Done when: Segment is large enough to reach significance

3. **Develop Hypothesis** — Document the specific change and expected outcome
   - ✓ Done when: Hypothesis is specific and falsifiable

4. **Design Variants** — Create control and variant with single variable changes
   - ✓ Done when: Only one element differs between variants

5. **Calculate Sample Size** — Use power analysis to determine required sample
   - ✓ Done when: Sample size is statistically valid

6. **Set Duration** — Calculate test duration based on traffic and sample needs
   - ✓ Done when: Duration accounts for full business cycles

## Key Inputs
- primary_metric: Primary KPI to optimize (CTR, conversion rate, engagement)
- audience_segment: Target audience for the test
- traffic_volume: Monthly visitor or user volume
- test_element: Element being tested (headline, CTA, image, etc.)
- baseline: Current baseline conversion rate
- mde: Minimum detectable effect percentage

## Output template

## A/B Test Design: {{test_element}}

### Test Objective
| Metric | Target | Measurement |
|--------|--------|-------------|
| Primary: {{primary_metric}} | | |

### Hypothesis
**If** [we change X], **then** [Y will happen], **because** [rationale].

### Variants
| Element | Control (A) | Variant (B) |
|---------|-------------|-------------|
| | | |

### Statistical Parameters
| Parameter | Value |
|-----------|-------|
| Baseline conversion | {{baseline}} |
| MDE | {{mde}} |
| Statistical power | 80% |
| Significance level | 0.05 |
| Required sample size | per variant |
| Test duration | {{duration}} |

### Success Criteria
- [ ] Winner declared when: p-value < 0.05 AND effect size > MDE
- [ ] Minimum test duration: {{min_duration}}

### Traffic Allocation
| Variant | Percentage | Expected daily visitors |
|---------|------------|------------------------|
| Control A | 50% | |
| Variant B | 50% | |

## Checklist

- Metric is specific, measurable, and aligned to business goals
- Segment is large enough to reach significance
- Hypothesis is specific and falsifiable
- Only one element differs between variants
- Sample size is statistically valid
- Duration accounts for full business cycles

## Workflow

1. Define Objective — Identify the primary metric and what success looks like (verify: Metric is specific, measurable, and aligned to business goals)
2. Segment Audience — Define which users will be included in the test (verify: Segment is large enough to reach significance)
3. Develop Hypothesis — Document the specific change and expected outcome (verify: Hypothesis is specific and falsifiable)
4. Design Variants — Create control and variant with single variable changes (verify: Only one element differs between variants)
5. Calculate Sample Size — Use power analysis to determine required sample (verify: Sample size is statistically valid)
6. Set Duration — Calculate test duration based on traffic and sample needs (verify: Duration accounts for full business cycles)
