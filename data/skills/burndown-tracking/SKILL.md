---
id: burndown-tracking
name: Burndown Tracking
description: Monitors sprint progress using burndown charts to track remaining work versus ideal progress, identifying risks to delivery and enabling data-driven scope and timeline decisions.
category: project-management
difficulty: beginner
freedom: low
agents: [piper]
pipelines: [agile-sprint]
tools: [spreadsheet, document]
tags: [project-management, agile, sprint, burndown]
version: 1.0
author: agency
---

# Burndown Tracking

Monitors sprint progress using burndown charts to track remaining work versus ideal progress, identifying risks to delivery and enabling data-driven scope and timeline decisions.

## When to use

Use this skillany time tracking sprint or project progress with burndown charts — to monitor velocity, identify scope creep, and predict whether the sprint will complete on time.

## Context

You are a Scrum master or project tracker who uses burndown charts to keep sprints on track and surface delivery risks before they become problems.

## Instructions

## Burndown Tracking

1. **Baseline Setup** — Establish ideal burndown line
   - ✓ Done when: Baseline is realistic and committed

2. **Daily Tracking** — Update actual progress daily
   - ✓ Done when: Chart reflects current state

3. **Deviation Analysis** — Compare actual to ideal and diagnose causes
   - ✓ Done when: Causes are understood

4. **Course Correction** — Adjust scope or resources to stay on track
   - ✓ Done when: Sprint goal is achievable

## Key Inputs
- sprint_goal: Sprint goal or name
- total_story_points: Total story points committed
- sprint_length: Sprint length in days or weeks
- daily_updates: Daily progress updates
- sprint_name: Sprint name/number

## Output template

## Burndown Report: {{sprint_goal}}

### Sprint Overview
| Field | Value |
|-------|-------|
| Sprint | {{sprint_name}} |
| Start date | |
| End date | |
| Total story points | {{total_story_points}} |
| Days remaining | |

### Burndown Status
| Day | Ideal remaining | Actual remaining | Delta |
|-----|---------------|-----------------|-------|
| 0 | | {{total_story_points}} | 0 |
| 1 | | | |
| 2 | | | |
| ... | | | |

### Velocity Analysis
| Metric | Value |
|--------|-------|
| Average daily burn | |
| Projected completion | |
| On track? | ✅ / ⚠️ / ❌ |

### Issues Identified
| Issue | Impact | Resolution |
|-------|--------|------------|
| | | |

### Recommendations
| Action | By who | By when |
|--------|--------|---------|
| | | |

### Sprint Goal Forecast
**Status:** ✅ On track / ⚠️ At risk / ❌ Not achievable
**Notes:**

## Checklist

- Baseline is realistic and committed
- Chart reflects current state
- Causes are understood
- Sprint goal is achievable

## Workflow

1. Baseline Setup — Establish ideal burndown line (verify: Baseline is realistic and committed)
2. Daily Tracking — Update actual progress daily (verify: Chart reflects current state)
3. Deviation Analysis — Compare actual to ideal and diagnose causes (verify: Causes are understood)
4. Course Correction — Adjust scope or resources to stay on track (verify: Sprint goal is achievable)
