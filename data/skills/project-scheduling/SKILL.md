---
id: project-scheduling
name: Project Scheduling
description: Creates and manages project schedules, including task breakdown, dependencies, timelines, resource allocation, and critical path identification.
category: operations
difficulty: intermediate
freedom: medium
agents: [piper]
pipelines: [project-management]
tools: [spreadsheet, document, project-management-tool]
tags: [operations, project-management, scheduling, planning]
version: 1.0
author: agency
---

# Project Scheduling

Creates and manages project schedules, including task breakdown, dependencies, timelines, resource allocation, and critical path identification.

## When to use

Use this skillany time creating a project schedule — breaking down work into tasks, establishing dependencies, setting timelines, and identifying the critical path.

## Context

You are a project manager who builds realistic, achievable schedules that account for dependencies, resources, and constraints while meeting project deadlines.

## Instructions

## Project Scheduling

1. **Work Breakdown** — Decompose project into tasks
   - ✓ Done when: Tasks are discrete and estimable

2. **Dependency Mapping** — Identify task dependencies
   - ✓ Done when: Dependencies are logical

3. **Duration Estimation** — Estimate task durations with team
   - ✓ Done when: Estimates are realistic

4. **Timeline Construction** — Build schedule with dates
   - ✓ Done when: Schedule is achievable

5. **Critical Path Analysis** — Identify critical path and float
   - ✓ Done when: Critical path is clear

6. **Validation** — Review with team and stakeholders
   - ✓ Done when: Schedule is committed

## Key Inputs
- project_name: Project name
- start_date: Project start date
- end_date: Project end date or deadline
- milestones: Key milestones to include
- team_members: Team members available

## Output template

## Project Schedule: {{project_name}}

### Project Overview
| Field | Details |
|-------|---------|
| Start date | {{start_date}} |
| End date | {{end_date}} |
| Duration | |
| Project manager | |

### Key Milestones
| Milestone | Date | Status |
|-----------|------|--------|
| | | |

### Work Breakdown Structure

**Phase 1: [Name]**
| Task | Owner | Duration | Dependencies | Start | End |
|------|-------|---------|-------------|-------|-----|
| | | | | | |

**Phase 2: [Name]**
[Same structure]

### Gantt Chart
```
Task                  | W1 | W2 | W3 | W4 | W5 | W6 |
----------------------|----|----|----|----|----|----|
[Task 1]              |████|    |    |    |    |    |
[Task 2]              |████|████|    |    |    |    |
[Task 3]              |    |████|████|    |    |    |
[Task 4]              |    |    |████|████|    |    |    |
[Task 5]              |    |    |    |████|████|    |
[Task 6]              |    |    |    |    |████|████|
```

### Dependency Map
| Task | Depends on | Blocks |
|------|-----------|-------|
| | | |

### Critical Path
| Task | Duration | Float |
|------|---------|-------|
| | | 0 days |

**Total float in project:**

### Resource Allocation
| Team member | Tasks assigned | Capacity |
|------------|----------------|----------|
| | | |

### Buffer Plan
| Task | Risk | Buffer |
|------|------|--------|
| | | |

### Schedule Contingencies
| Risk | Impact | Contingency |
|------|--------|-------------|
| | | |

### Validation
- [ ] Team has reviewed and committed to schedule
- [ ] Dependencies are realistic
- [ ] Resources have capacity
- [ ] Milestones are achievable
- [ ] Buffer time is appropriate

## Checklist

- Tasks are discrete and estimable
- Dependencies are logical
- Estimates are realistic
- Schedule is achievable
- Critical path is clear
- Schedule is committed

## Workflow

1. Work Breakdown — Decompose project into tasks (verify: Tasks are discrete and estimable)
2. Dependency Mapping — Identify task dependencies (verify: Dependencies are logical)
3. Duration Estimation — Estimate task durations with team (verify: Estimates are realistic)
4. Timeline Construction — Build schedule with dates (verify: Schedule is achievable)
5. Critical Path Analysis — Identify critical path and float (verify: Critical path is clear)
6. Validation — Review with team and stakeholders (verify: Schedule is committed)
