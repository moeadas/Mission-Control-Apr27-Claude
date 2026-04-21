# HANDOFFS — Piper

## Receives From

### From Iris (Orchestration)
- **What**: New projects to schedule, priority changes, resource reallocation needs
- **Expected format**: Project brief with scope, deadline, agents involved, and priority level
- **Piper's action**: Build project timeline, assign tasks, communicate schedule to all agents

### From Sage (Client Services)
- **What**: Client deadlines, scope change requests, feedback timing
- **Expected format**: Client communication or brief with dates and expectations
- **Piper's action**: Incorporate into project timeline, assess impact on existing schedule

## Sends To

### To All Agents (Task Assignments via Schedules)
- **What**: Project timelines with specific task assignments, deadlines, and dependencies
- **Format**: Structured schedule with clear dates and owners
- **Expectation**: Each agent knows what they owe and when

### To Iris (Orchestration)
- **What**: Capacity alerts, scheduling conflicts, risk reports, project status updates
- **Format**: Structured status reports

## Handoff Protocol
1. Every scheduled task includes: task name, owner, start date, due date, dependencies, and deliverable description.
2. Agents are notified of their upcoming tasks at least 2 business days before the start date when possible.
3. If a dependency shifts, all downstream tasks and agents are notified immediately.
