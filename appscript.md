# Mission Control — Application Script & Architecture

## 🚀 Overview
**Mission Control** is a sophisticated, production-grade agency management platform designed to orchestrate virtual AI agents through complex, multi-phase workflows. It functions as a digital "Command Center" where different AI specialist agents (Strategy, Creative, Media, Research) collaborate under the guidance of **Iris**, the Chief of Staff.

The app uses a **Config-First** philosophy—meaning the agency's brain (agent personas, skills, and workflow pipelines) is defined in editable JSON/TypeScript files, making the entire system highly flexible and modular.

---

## 🏗️ Architecture & Wiring

### 1. State & Persistence Layer
- **Zustand (Frontend State)**: The primary engine for client-side state. It manages agents, active missions, clients, and chat history.
- **Supabase (Backend Sync)**: The app performs a "Relational Sync." Local state changes (Zustand) are converted into entity deltas and pushed to Supabase relational tables (`agents`, `clients`, `missions`, `artifacts`).
- **Hydration**: On load, the app hydrates local state from Supabase, ensuring a seamless experience across devices.

### 2. The "Brain" (AI Logic)
- **Iris (The Orchestrator)**: The entry point for all requests. Iris uses keyword and semantic analysis to decide if a request is just a "chat" or a "mission" (task).
- **Dual Runtime**:
    - **Local (Ollama)**: Used for standard tasks and conversational chat.
    - **Cloud (Gemini)**: Triggered for high-complexity, strategic tasks (e.g., SEO audits, strategy briefs, research).
- **Task Channeling**: Requests are routed to a **Lead Agent** based on their specialty (e.g., Nova for Media, Sage for Creative). **Collaborators** are injected if the task is multi-disciplinary.

### 3. Workflow Engine
- **Pipelines**: Predefined templates (e.g., "30-Day Social Content Pipeline") divided into **Phases** (Intake → Strategy → Creative → Review → Delivery).
- **Phase Gates**: Quality checkpoints (Q1-Q5) ensure that a deliverable is structurally sound before moving to the next phase.
- **Autonomous Execution**: When a mission starts, the system generates an execution plan, maps skills to agents, and can run through activities autonomously or via user-guided turns.

---

## 🗺️ Site Map & Navigation

| Route | Description | Key Components |
|:--- |:--- |:--- |
| `/dashboard` | The "Command Center" view. Metrics, active agent pulses, and high-level mission status. | `MetricsCards`, `AgentStrip` |
| `/office` | An isometric 2D floor plan view of the agency. Shows agents at their desks or roaming. | `OfficeMap`, `AgentFloorAvatar` |
| `/agents` | The Roster. Manage agent personas, system prompts, skills, and AI settings. | `AgentRoster`, `AgentEditor` |
| `/tasks` | Mission Control list. Track progress per phase, checklist items, and task logs. | `TaskBoard`, `PipelineRunner` |
| `/clients` | CRM for AI. Contains rich brand context (Brand Kit, USP, Tone) used by agents. | `ClientList`, `BrandKitView` |
| `/pipeline` | Browse and execute pipeline templates. | `PipelineLibrary` |
| `/outputs` | The "Artifact Gallery." Access finalized strategy documents, copy, and reports. | `ArtifactGrid`, `OutputHtmlView` |
| `/config` | Advanced JSON editor for tweaking the system's foundational configs directly. | `ConfigEditor` |
| `/settings` | System-wide settings and OAuth integrations (Google, Meta). | `IntegrationsPanel` |

---

## ⚡ Core Logic & Flow

### Mission Creation Flow
1. **Intake**: A user makes a request to Iris in the `/dashboard` or `/office` sidebar.
2. **Inference**: `/api/chat` determines the **Deliverable Type** and identifies the required **Specialist Agent**.
3. **Drafting**: The AI builds a **Task Execution Plan** including a quality checklist and specific instructions.
4. **Execution**: If it's a mission, a `Mission` record is created. Specialist agents generate content which is saved as an `Artifact`.
5. **Review**: The content is validated against `output-quality.ts` requirements.
6. **Persistence**: The new mission and artifact are synced to Supabase and become visible in the `/tasks` and `/outputs` screens.

### Navigation Logic
The app uses a **Shared Sidebar** (`src/components/layout/Sidebar.tsx`) that routes users through the specialized agency units:
- **Operations (Orchestration)**: Dashboard and Tasks.
- **Client Services**: Clients and Strategy.
- **Creative**: Design and Content.
- **Media**: Planning and Analytics.

---

## 🛠️ Tech Stack
- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Framer Motion (for office/agent animations)
- **Icons**: Lucide React
- **Persistence**: Supabase (PostgreSQL + Auth)
- **State Management**: Zustand + Persistence Middleware
- **AI**: Ollama SDK & Google Generative AI (Gemini)
