---
id: critical-path-analysis
name: Critical Path Analysis
description: Identifies the longest sequence of dependent tasks in a project — the critical path — to determine the minimum possible project duration and which tasks have zero float (cannot slip without delaying the project).
category: project-management
difficulty: intermediate
freedom: low
agents: [piper]
pipelines: [project-management]
tools: [spreadsheet, document]
tags: [project-management, critical-path, scheduling, planning]
version: 1.0
author: agency
---

# Critical Path Analysis

Identifies the longest sequence of dependent tasks in a project — the critical path — to determine the minimum possible project duration and which tasks have zero float (cannot slip without delaying the project).

## When to use

Use this skillany time analyzing project schedules to identify the critical path — to understand which tasks cannot slip without delaying the project and where to focus management attention.

## Context

You are a project planning specialist who applies critical path analysis to identify the sequence of tasks that determines minimum project duration and where float exists.

## Instructions

## Critical Path Analysis

1. **Task Listing** — List all project tasks
   - ✓ Done when: Tasks are comprehensive

2. **Network Diagram** — Build the task dependency network
   - ✓ Done when: Dependencies are correct

3. **Forward Pass** — Calculate earliest start and finish times
   - ✓ Done when: Forward pass is correct

4. **Backward Pass** — Calculate latest start and finish times
   - ✓ Done when: Backward pass is correct

5. **Float Calculation** — Calculate float and identify critical path
   - ✓ Done when: Critical path is correctly identified

6. **Compression Analysis** — Identify options to compress the schedule
   - ✓ Done when: Compression options are feasible

## Key Inputs
- project_name: Project being analyzed
- task_list: List of project tasks
- dependencies: Task dependencies
- constraints: Project constraints

## Output template

## Critical Path Analysis: {{project_name}}

### Project Overview
| Field | Value |
|-------|-------|
| Project | {{project_name}} |
| Total tasks | |
| Estimated duration | |
| Critical path length | |
| Date | {{date}} |

### Task List
| Task ID | Task name | Duration | Early start | Early finish | Late start | Late finish | Float | Critical? |
|---------|-----------|----------|------------|-------------|-----------|-------------|-------|-----------|
| | | | | | | | | |

### Critical Path Tasks
| Sequence | Task | Duration | Cumulative |
|----------|------|----------|-----------|
| 1 | | | |
| 2 | | | |
| 3 | | | |

**Critical path duration:**

### Non-Critical Tasks with Float
| Task | Float (days) | How float can be used |
|------|-------------|----------------------|
| | | |

### Project Float Analysis
| Scenario | Impact on duration |
|----------|-----------------|
| Task A slips 2 days | |
| Task B slips 3 days | |
| Task C slips 1 day | |

### Schedule Compression Options
| Technique | Task | Time saved | Cost/trade-off |
|-----------|------|-----------|---------------|
| Crashing | | | |
| Fast-tracking | | | |

### Risk: Critical Path Slippage
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| | | | |

## Checklist

- Tasks are comprehensive
- Dependencies are correct
- Forward pass is correct
- Backward pass is correct
- Critical path is correctly identified
- Compression options are feasible

## Workflow

1. Task Listing — List all project tasks (verify: Tasks are comprehensive)
2. Network Diagram — Build the task dependency network (verify: Dependencies are correct)
3. Forward Pass — Calculate earliest start and finish times (verify: Forward pass is correct)
4. Backward Pass — Calculate latest start and finish times (verify: Backward pass is correct)
5. Float Calculation — Calculate float and identify critical path (verify: Critical path is correctly identified)
6. Compression Analysis — Identify options to compress the schedule (verify: Compression options are feasible)
