# Mission Control — Product Specification

## Overview

Mission Control is a Next.js-based agency management application for orchestrating virtual AI agents through configurable workflows.

## Vision

A production-grade agency command center that feels like mission control at NASA — every agent, task, and deliverable tracked with precision and clarity.

---

## Phase 1: Config-Driven Agency System ✅

### What's Built

**Core Infrastructure**
- `src/lib/config-loader.ts` — Central utility for loading all JSON configs
- `src/config/` directory with all editable configs
- No hardcoded values — everything editable via JSON

**Agent System**
- 10 agents with individual JSON configs in `src/config/agents/`
- 5 divisions: orchestration, client-services, creative, media, research
- Skills-based configuration with 100+ predefined skills
- Tool registry with 40+ tools
- AI config (Ollama, model: minimax-m2.7:cloud)

**Workflow Templates**
- 3 workflow templates: `campaign-brief`, `social-content`, `ad-creative`
- 5 phases per workflow: Intake → Strategy → Creative → Review → Delivery
- Quality checkpoints at each phase transition
- Activity-level checklists

**Client Templates**
- 4 client templates: default, ecommerce, saas, healthcare
- Preconfigured tool sets per template

**Quality Checkpoints**
- Q1-Q5 phase gates ensuring deliverables meet standards before progression

---

## Phase 2: Production Pipeline ✅

### What's Built

**Core Files**
- `src/lib/workflow-engine.ts` — Task generation, phase gates, checklist tracking, prompt builder
- `src/lib/workflow-store.ts` — Zustand store for workflow instances, tasks, handoffs
- `src/lib/pipeline-loader.ts` — Loads predefined pipelines from JSON
- `src/lib/agents-from-config.ts` — Builds agents from individual JSON configs

**Predefined Pipelines** (`src/config/pipelines/pipelines.json`)
- Campaign Brief (14 days) — 5 phases, 12 activities
- Social Content Pipeline (30 days) — 4 phases, 7 activities
- Ad Creative Production (7 days) — 4 phases, 6 activities
- SEO Audit & Strategy (10 days) — 4 phases, 7 activities
- Competitor Research Report (5 days) — 3 phases, 5 activities
- Media Plan Development (7 days) — 4 phases, 7 activities

**Agent Configs** (`src/config/agents/*.json`)
- 10 individual agent JSON files: iris, sage, piper, maya, finn, echo, nova-studio, nova, atlas, dex
- Each agent has: skills, responsibilities, handoffs, quality checkpoints, tools, AI config

**Skills Library** (`src/config/skills/skills-library.json`)
- 7 skill categories with 100+ individual skills
- Full reference in `docs/skills.md`
- Skills organized: Strategy, Creative, Project Management, Media, Research, Client Services, Operations

**Pipeline UI** (`/pipeline`)
- Kanban-style columns per phase with activity cards
- Status indicators: pending, in-progress, completed, blocked
- Progress tracking per phase and overall
- Mission selector dropdown
- Pipeline selector dropdown

**Agent Editor** (`/agents`)
- Form-based editor for all agent properties
- Add/remove skills with reference to skills.md
- Add/remove responsibilities
- Division selector with color coding
- AI settings (temperature, max tokens)
- System prompt editor

**Config Editor** (`/config`)
- Organized by category: Workflows & Skills, Agents & Tools, Templates
- In-app JSON viewer for all config files
- Save to localStorage as backup
- Links to GitHub for each file

### Pending

- [ ] Phase 3: Tool Integrations (OAuth, external APIs)
- [ ] Phase 4: Intelligence (analytics, AI learning)

---

## Phase 3: Tool Integrations

### Goals

Connect to external tools and platforms for a fully functional virtual agency.

### Planned

**OAuth Connections**
- Google Workspace (Drive, Docs, Sheets)
- Notion API
- Linear
- Figma
- Slack

**Platform Integrations**
- Google Ads API
- Meta Business API
- LinkedIn Marketing API
- Analytics platforms

**Local Tools**
- Web search
- Document creation
- Spreadsheet generation
- Presentation tools
- Image generation

### Status

Not started

---

## Phase 4: Intelligence

### Goals

Analytics, AI learning, and predictive capabilities.

### Planned

**Performance Analytics**
- Campaign performance dashboards
- Agent productivity metrics
- ROI tracking
- A/B test analysis

**AI Learning**
- Learn from past campaigns
- Pattern recognition
- Success factor identification

**Predictive Timelines**
- Estimated delivery times
- Bottleneck prediction
- Resource optimization

### Status

Not started

---

## Data Model

### Agent

```typescript
interface Agent {
  id: string
  name: string
  role: string
  division: 'orchestration' | 'client-services' | 'creative' | 'media' | 'research'
  skills: string[]
  responsibilities: string[]
  tools: string[]
  systemPrompt: string
  temperature: number
  maxTokens: number
  color: string
  avatar: string | null
  status: 'active' | 'idle' | 'paused'
}
```

### Pipeline

```typescript
interface Pipeline {
  id: string
  name: string
  phases: Phase[]
}

interface Phase {
  id: string
  name: string
  color: string
  activities: Activity[]
}

interface Activity {
  id: string
  name: string
  assignedRole: string
  inputs: string[]
  outputs: string[]
  checklist: string[]
}
```

### Mission

```typescript
interface Mission {
  id: string
  name: string
  clientId: string
  status: MissionStatus
  currentPhase: string
  workflowId: string
  tasks: string[]
  createdAt: number
}
```

### Quality Checkpoint

```typescript
interface QualityCheckpoint {
  id: string
  name: string
  phase: string
  requirements: string[]
  approvableBy: string[]
  status: 'pending' | 'approved' | 'rejected'
}
```

---

## Tech Stack

- **Framework**: Next.js 14/15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animation**: Framer Motion
- **State**: Zustand (localStorage persistence)
- **Icons**: Lucide React

---

## File Structure

```
src/
├── app/
│   ├── agents/page.tsx
│   ├── config/page.tsx
│   ├── dashboard/page.tsx
│   ├── office/page.tsx
│   ├── outputs/page.tsx
│   ├── pipeline/page.tsx
│   └── settings/page.tsx
├── components/
│   ├── agents/
│   │   ├── AgentBot.tsx
│   │   ├── AgentCard.tsx
│   │   └── AgentEditor.tsx
│   ├── dashboard/
│   │   └── MetricsCards.tsx
│   └── layout/
│       └── Sidebar.tsx
├── config/
│   ├── agents/
│   │   ├── iris.json
│   │   ├── sage.json
│   │   └── ...
│   ├── clients/
│   │   └── clients.json
│   ├── pipelines/
│   │   └── pipelines.json
│   ├── skills/
│   │   └── skills-library.json
│   ├── tools/
│   │   └── tools.json
│   ├── quality-checkpoints.json
│   └── workflows/
│       └── workflows.json
├── lib/
│   ├── agents-store.ts
│   ├── config-loader.ts
│   ├── pipeline-loader.ts
│   ├── types.ts
│   └── workflow-engine.ts
│   └── workflow-store.ts
└── config/
    └── ...
```

---

## Constraints

1. **Config-first**: All business logic in editable JSON
2. **No deletion**: Never delete anything without explicit permission
3. **Editable**: No hardcoded values — everything configurable
4. **Opaque identifiers**: Preserve exactly as written
5. **Local first**: All data stored in localStorage
6. **No Git pushes**: Get explicit approval before pushing

---

## Next Steps

1. **Complete Agent Editor** integration
2. **Add task assignment** to specific agents
3. **Implement handoff workflow** with notifications
4. **Build checklist progress** persistence
5. **Create pipeline editing UI**
6. **Phase 3**: Tool integrations
