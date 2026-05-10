# Mission Control — Architecture

> **Last Updated:** 2026-05-10 (Virtual Office Builder v2 — Konva.js canvas, drag-to-move, zoom toward cursor, per-item color picker, agent-to-item assignment, 6 templates, undo/redo)
> **Rule for contributors:** Update this file after every code change. Add new pages to the Page Structure table, new components to the Component Library, new store shape changes to State Management, etc.

## Overview

Mission Control is a Next.js 16.2.1-based agency management application designed to orchestrate virtual AI agents through configurable workflows. The system follows a config-first philosophy where all business logic is stored as editable JSON.

Current practical model:
- the live app manages clients, tasks, outputs, and Iris chat
- the config layer manages skills, pipelines, workflows, tools, and templates
- task execution now supports autonomous multi-agent runs inside the chat request lifecycle
- when a suitable pipeline exists, the task runner executes activities phase by phase and passes outputs between agents
- outputs are rendered in the app as designed HTML artifacts and can still be exported as DOCX, PDF, or XLSX

## Tech Stack

- **Framework**: Next.js 16.2.1 (App Router, Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom design system
- **Animation**: CSS animations, Framer Motion patterns
- **State**: Zustand (local persistence for structural app state) + postgres.js-backed shared state (synced via `/api/state`)
- **Auth**: Custom JWT (jose, HS256) + bcryptjs — no Supabase, no third-party auth service
- **Database**: PostgreSQL via postgres.js tagged template literals (no ORM)
- **Icons**: Lucide React
- **AI Providers**: Anthropic, OpenAI, Google Gemini, Ollama (local) — per-agent model selection supported
- **Token Tracking**: `token_usage` DB table; `generateTextWithUsage()` captures input/output tokens; `logTokenUsage()` fire-and-forget logger; `/api/token-usage` endpoint returns 30d summary, byAgent, byModel

## Design System

### Visual Direction: "Command Center Meets Gaming HQ"
- Inspired by Apple Intelligence, Linear, Discord, Notion
- Dark theme with glass morphism effects
- Clean, spacious layouts with personality
- Game-like 2D virtual office workspace
- Smooth micro-animations throughout

### Color Palette
```
Background Base:    #09090b (zinc-950)
Background Card:    #252530 (elevated surface)
Background Panel:   #111115
Border:            #27272a
Border Glow:       #3f3f46
Text Primary:      #fafafa (zinc-50)
Text Secondary:    #a1a1aa (zinc-400)
Text Dim:          #52525b (zinc-600)

Accent Purple:     #a78bfa
Accent Blue:       #60a5fa
Accent Cyan:       #2dd4bf
Accent Green:      #4ade80
Accent Yellow:     #fbbf24
Accent Orange:     #fb923c
Accent Pink:       #f472b6
```

### Typography
- **Headings**: Space Grotesk (bold, 700)
- **Body**: DM Sans (regular, 400)
- **Mono**: JetBrains Mono (code, logs)

### Spacing Scale
- xs: 4px | sm: 8px | md: 16px | lg: 24px | xl: 32px | 2xl: 48px

### Border Radius
- sm: 6px | md: 8px | lg: 12px | xl: 16px | card: 12px

### Animation Timings
- Micro (hover, focus): 150ms ease
- Standard transitions: 200ms ease
- Page transitions: 300ms ease-out
- Staggered reveals: 400ms ease-out

## Agent Roster

| Agent | Role | Division | Workload | Status |
|-------|------|----------|----------|--------|
| **Iris** | Operations Lead | Orchestration | 76% | 🟢 Active |
| **Lyra** | Visual Production Lead | Creative | 65% | 🟢 Active |
| **Piper** | Project & Traffic Manager | Orchestration | 80% | 🟢 Active |
| **Sage** | Client Services Director | Client Services | 55% | 🟢 Active |
| **Maya** | Brand & Campaign Strategist | Client Services | 68% | 🟢 Active |
| **Finn** | Creative Director | Creative | 72% | 🟢 Active |
| **Echo** | Copy & Content Lead | Creative | 63% | 🟢 Active |
| **Nova** | Media Planning Lead | Media | 70% | 🟢 Active |
| **Dex** | Performance & Analytics Lead | Media | 58% | 🟢 Active |
| **Atlas** | Research & Insights Lead | Research | 60% | 🟢 Active |

> **Note**: Agents can be edited via the Agents page — names, roles, and details are editable and persist to localStorage.

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                        UI Layer                             │
│  (Pages, Components, Layouts)                             │
├─────────────────────────────────────────────────────────────┤
│                      State Layer                           │
│  (Zustand Stores: agents-store, analytics-store)          │
├─────────────────────────────────────────────────────────────┤
│                      Config Layer                          │
│  (TypeScript templates: agent-templates.ts)                │
│  (JSON configs: pipelines/*.json, skills/*.json)          │
├─────────────────────────────────────────────────────────────┤
│                    Integration Layer                        │
│  (OAuth: Google Docs/Sheets/Ads, Meta Ads)               │
│  (AI: Ollama, Gemini)                                     │
└─────────────────────────────────────────────────────────────┘
```

## Configuration Files

### Core Configs

| File/Directory | Purpose |
|----------------|---------|
| `src/lib/agent-templates.ts` | Agent definitions (DEFAULT_AGENTS array) |
| `src/config/agents/*.json` | Individual agent configs (backup/reference) |
| `src/config/pipelines/*.json` | Individual pipeline configs |
| `src/config/skills/*.json` | Individual skill files (~140 skills) |
| `src/config/tools/tools-config.json` | Tool registry |

## Page Structure

| Route | Purpose |
|-------|---------|
| `/dashboard` | Main command center with agency stats, agent strip, activity feed, Getting Started checklist |
| `/mission` | Start a Mission hub — plain-language brief input, category prompt starters, routes to IrisChat |
| `/office` | Virtual Office Builder — Konva.js canvas, 30×20 tile grid (1 tile = 50 cm), drag-to-move furniture, zoom toward cursor, per-item color + agent assignment, 6 templates, undo/redo |
| `/agents` | Agent roster; "Add Agent" opens multi-step AgentEditor drawer |
| `/clients` | Client management |
| `/tasks` | Task list and mission tracking |
| `/pipeline` | Pipeline templates browser |
| `/pipeline/[id]` | Pipeline editor |
| `/pipeline/run` | Pipeline execution runner |
| `/skills` | Skills library browser |
| `/skills/[id]` | Individual skill editor |
| `/analytics` | Analytics dashboards |
| `/outputs` | Saved deliverables |
| `/schedules` | Scheduled task CRUD — DB-backed, real agent execution, cron-ready (see Schedules section) |
| `/users` | Super admin user management (invite, role, activate/suspend) |
| `/settings` | App settings with OAuth integrations |
| `/settings/integrations` | OAuth integrations (Google, Meta) |
| `/support` | Support contact form (mailto-based) |
| `/config` | JSON config editor |
| `/login` | Custom JWT login — POST `/api/auth/session` → JWT stored in `localStorage` via `getStoredToken()` |
| `/admin/tenants` | Super-admin tenant management: list all tenants, usage stats, manual provisioning (super_admin only) |

## Virtual Office Builder

The `/office` page is a Konva.js-powered interactive office builder. Users drag-and-place SVG furniture on a 30×20 tile canvas (1 tile = 50 cm), paint named zones, and assign agents to specific items (desks, chairs).

### Scale & Renderer
- **1 tile = 50 cm** — all furniture sized realistically (standard desk = 3×2 tiles = 150×100 cm)
- **Konva.js** (`react-konva`) renders a 3-layer Stage: floor/zones, furniture, UI
- **SVG assets** loaded as blob URLs via `use-image`; colors tinted at runtime with `tintSvg()`
- Grid: 30 tiles wide × 20 tiles tall

### Features
- **Drag-to-move** — placed items draggable with grid snapping (Konva native drag)
- **Zoom toward cursor** — scroll wheel, Figma-style (scale + offset adjustment around pointer)
- **Pan** — drag the canvas background when no item placing is active
- **Rotation** — R key or inspector buttons (0/90/180/270°)
- **Per-item color picker** — 16 presets + custom color input; stored as `primaryColor` on `PlacedTile`; SVG re-tinted on change
- **Agent assignment** — assign any agent to assignable tiles (desks, chairs) via inspector dropdown; stored as `assignedAgentId` on `PlacedTile`; agents not zone-locked
- **Zones** — visual space labeling only; painted tile-by-tile in zone tool mode; no agent restrictions
- **50-step undo/redo** — Cmd/Ctrl+Z / Cmd/Ctrl+Shift+Z
- **Delete** key removes selected item; **Arrow keys** nudge by 1 tile
- **6 starter templates** — Startup Garage (10), Creative Studio (20), Scale-up (30), Tech Company (40), Corporate Floor (60), Coworking Space (50)
- **LocalStorage auto-save** — layout saved on every change; server save via PUT /api/office-layout
- **Export/Import JSON** — download/upload raw OfficeLayout JSON

### Key Files
| File | Role |
|------|------|
| `src/components/office/OfficeBuilder.tsx` | Main Konva canvas component |
| `src/lib/office-assets.ts` | SVG asset catalog + `tintSvg()` |
| `src/lib/office-templates.ts` | 6 pre-built OfficeLayout presets |
| `src/lib/office-types.ts` | `PlacedTile`, `OfficeZone`, `OfficeLayout` interfaces |
| `src/app/api/office-layout/route.ts` | GET/PUT layout via `office_layouts` DB table |
| `src/app/office/page.tsx` | Page wrapper with `isSuperAdmin` detection |

### DB Schema (`office_layouts`)
```sql
CREATE TABLE office_layouts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id   UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE UNIQUE,
  layout      JSONB NOT NULL,
  mc_credits  INT NOT NULL DEFAULT 0,
  owned_assets TEXT[] NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Agent Assignment Model
- Agents are assigned to **specific items** (desks, chairs) via `PlacedTile.assignedAgentId`
- Zones are for visual labeling only — agents can freely communicate across zones
- `OfficeFurnitureAsset.assignable = true` flags items that support agent assignment

## State Management

### Agents Store (`agents-store.ts`)
Manages:
- `agents[]` - All 10 agency agents (loaded from DEFAULT_AGENTS)
- `missions[]` - Active tasks/projects
- `clients[]` - Client profiles
- `conversations[]` - Chat history with Iris
- `providerSettings` - Ollama/Gemini configuration
- `agencySettings` - Theme, defaults
- `artifacts[]` - Saved output registry
- execution metadata on tasks:
  - `leadAgentId`
  - `collaboratorAgentIds`
  - `pipelineId`
  - `pipelineName`
  - `qualityChecklist`
  - `handoffNotes`

Persistence: Zustand with localStorage (local) + server sync via `/api/state` PUT/GET (remote). Auth token stored via `getStoredToken()` / `setStoredToken()` in `src/lib/auth/browser.ts`.

### Auth Flow
1. `POST /api/auth/session` → validates email/bcrypt hash in DB → returns signed JWT (now includes `tenantId`)
2. `POST /api/auth/register` → self-serve signup: creates `users` row, `profiles` row, tenant (`agencies`), free `subscriptions` row, then returns JWT with `tenantId`
3. JWT stored in `localStorage` via `setStoredToken()`
4. `ClientShell` reads token on mount, fetches `/api/auth/session` (GET) to verify, then `/api/state` to hydrate Zustand
5. All authenticated API calls pass `Authorization: Bearer <token>` header
6. Server routes verify JWT with `jose` `jwtVerify()` via `resolveAuthContextFromToken()`
7. `AuthContext` now carries `{ userId, email, role, providerSettings, tenantId }`

### Multi-Tenant Architecture

Every account belongs to a **tenant** (backed by the `agencies` table). All entity data is scoped by `agency_id` (= `tenant_id`).

#### Database Tables (multi-tenant additions)

| Table | Purpose |
|-------|---------|
| `plans` | Seeded plan tiers: free (3 agents), starter (10/$49), growth (25/$99), enterprise (unlimited/$299) |
| `subscriptions` | One row per tenant. Tracks `plan_id`, `status`, `agent_limit`, `current_agent_count`, Stripe stub fields |
| `agencies` | Existing table — now also stores `owner_user_id`, `plan_id`, `is_active`. Used as the tenant record |
| `profiles` | Now has `tenant_id UUID → agencies(id)` — links a user to their tenant |
| `tenants` view | `CREATE OR REPLACE VIEW tenants AS SELECT ... FROM agencies LEFT JOIN subscriptions` — convenience alias |

#### Key files

| File | Role |
|------|------|
| `src/lib/server/tenants.ts` | `createTenant`, `getTenantIdForUser`, `assignUserToTenant`, `canAddAgent`, `syncAgentCount`, `getTenantById` |
| `src/lib/auth/server.ts` | `AuthContext.tenantId` — resolved from JWT claim → profile row → auto-provision for legacy users |
| `src/lib/db/relational-sync.ts` | `resolveAgencyId(tenantId?)` — uses `tenantId` when present, falls back to `DEFAULT_AGENCY_SLUG` |
| `src/lib/db/app-state.ts` | `loadSharedAppState`, `saveSharedAppState`, `saveSharedAppStateDelta` all accept optional `tenantId` |
| `src/app/api/auth/register/route.ts` | Self-serve signup endpoint |
| `src/app/api/billing/subscription/route.ts` | GET current plan + agent count |
| `src/app/api/billing/upgrade/route.ts` | POST to change plan (direct DB now; Stripe checkout when `STRIPE_SECRET_KEY` is set) |
| `src/app/api/billing/webhook/route.ts` | POST Stripe webhook handler (skeleton — handles checkout.session.completed, subscription.updated/deleted, invoice.payment_failed) |
| `src/app/api/admin/tenants/route.ts` | GET list all tenants / POST provision tenant (super_admin only) |
| `src/app/admin/tenants/page.tsx` | Superadmin tenant dashboard UI |

#### Plan enforcement

- `PUT /api/state` with `entityPatch.agents.upserts` triggers `canAddAgent(tenantId)` before writing
- Returns `HTTP 402` with `{ code: "AGENT_LIMIT_EXCEEDED", limit, current }` when plan is full
- `syncAgentCount(tenantId)` refreshes `subscriptions.current_agent_count` after every agent mutation
- Enterprise plan uses `agent_limit = -1` (unlimited)

#### Stripe integration (ready, not wired)

The billing skeleton is complete. To activate Stripe:
1. Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` env vars
2. Uncomment the Stripe Checkout session block in `/api/billing/upgrade/route.ts`
3. Uncomment the `stripe.webhooks.constructEvent()` verification in `/api/billing/webhook/route.ts`
4. Add `stripe_price_id` to each plan row in the DB
5. Pass `metadata: { tenant_id, plan_id }` in Checkout session creation

#### Backward compatibility

Legacy single-user deployments (no tenant) continue to work: `resolveAgencyId(null)` falls back to `getDefaultAgencyId()` which upserts the `default-agency` slug as before. Existing users get a tenant auto-provisioned on first login if none exists.

### Deployment
- Docker multi-stage build: `deps` → `builder` (Next.js standalone) → `runner` (node:20-alpine)
- Production VPS: `72.62.33.12` (Hostinger KVM 1, Ubuntu 24.04, 4 GB RAM)
- Docker Compose: `postgres` (pg 16-alpine) + `app` (Next.js on port 3000)
- `.env` on VPS holds `DB_PASSWORD`, `JWT_SECRET`, `SUPER_ADMIN_EMAIL`, `NEXT_PUBLIC_APP_URL`

### Iris Intelligence Layers

Iris now has two coordinated decision layers and they should be treated together when upgrading task intelligence:

- `src/components/agents/IrisChat.tsx`
  - client-side intake logic
  - mission vs chat detection
  - follow-up brief questions
  - provisional lead/support routing shown in the UI
- `src/lib/server/ai.ts`
  - server-side deliverable inference
  - server-side routing context
  - pipeline inference
  - execution prompt construction for the model

Important current rule:

- the server and client now both use registry-style deliverable inference across the expanded deliverable model
- the current shared deliverable set includes:
  - short-form copy
  - email campaigns
  - blog/articles
  - website copy
  - video scripts
  - presentations
  - brand guidelines
  - data / analytics reports
  - PR / communications
  - event plans
  - general substantive tasks
- new deliverable classes should not be added in only one place
- if a new deliverable type is introduced, it must also be added to:
  - `src/lib/types.ts`
  - `src/lib/server/task-channeling.ts`
  - `src/lib/task-output.ts`
  - `src/lib/output-quality.ts`
  - any routing/channeling logic that depends on deliverable type

Task intelligence responsibilities are now split as follows:

- `src/lib/types.ts`
  - single source of truth for the deliverable union and related mission/channeling metadata
- `src/lib/server/task-channeling.ts`
  - skill-driven lead/support assignment
  - collaborator injection from request signals
  - channeling confidence scoring
- `src/lib/task-output.ts`
  - deliverable-specific title generation, output spec, and quality checklist defaults
- `src/lib/output-quality.ts`
  - deliverable-specific structural validation before a draft is treated as usable

### Task Save Flow

For chat-created tasks, the save lifecycle is:

1. `IrisChat.tsx` opens or updates the mission locally
2. `/api/chat` generates the deliverable and returns orchestration metadata
3. `IrisChat.tsx` creates the artifact, updates the mission, and now persists the refreshed app state back through `/api/state`
4. `src/app/tasks/[id]/page.tsx` reads the mission and related artifacts to render task progress and saved output

This persistence step matters because a mission can appear to reach review-stage progress even when the task page cannot yet see the saved artifact unless the updated state has been synced.

Artifact compatibility notes:

- Older artifact records are normalized on hydration so the Outputs screen can safely render mixed legacy/current data
- Missing artifact fields now default to:
  - `deliverableType: client-brief`
  - `status: draft`
  - `format: html`
- Older `executionPrompt` values are folded into `sourcePrompt` during hydration
- This prevents the Outputs route from crashing when shared state contains artifacts created before the current output schema

### Shared Persistence (Supabase Migration In Progress)

The app now uses a hybrid shared persistence model.

- Local Zustand persistence still exists as a browser fallback/cache
- Shared runtime state is exposed through `src/app/api/state/route.ts`
- Server-side Supabase access is wrapped in:
  - `src/lib/supabase/config.ts`
  - `src/lib/supabase/server.ts`
  - `src/lib/supabase/app-state.ts`
  - `src/lib/supabase/relational-sync.ts`
- The bridge migration stores the full agency snapshot in `mission_control_state`
- The bridge SQL migration lives at `supabase/migrations/20260325_create_mission_control_state.sql`
- `ClientShell` now:
  - hydrates the app from `/api/state` on load
  - sends bearer-authenticated sync writes back to `/api/state`
  - sets `appStateReady` so direct links wait for shared state hydration
  - self-heals `409 Conflict` sync races by refetching the latest shared state and rehydrating the store instead of silently drifting

### Relational Supabase Schema (Now Started)

The proper relational schema migration now exists at:

- `supabase/migrations/20260325_create_mission_control_relational_core.sql`

This migration introduces first-class tables for:

- `agencies`
- `agents`
- `clients`
- `skills`
- `agent_skill_links`
- `pipelines`
- `tasks`
- `task_assignments`
- `task_runs`
- `outputs`
- `conversations`
- `messages`
- `workflow_instances`
- `knowledge_assets`
- `profiles`

It also creates storage buckets for:

- `agent-avatars`
- `knowledge-docs`
- `task-exports`
- `creative-assets`

Important status note:

- Snapshot saves still exist as a bridge, but runtime reads for core entities now come from relational tables first
- Snapshot saves also write through to the relational Supabase tables
- Core entities currently synced from runtime state:
  - `agents`
  - `clients`
  - `tasks`
  - `task_assignments`
  - `outputs`
  - `conversations`
  - `messages`
  - `knowledge_assets`
- Agency-wide settings still bridge through `agencies.settings` / snapshot merge:
  - `agencySettings`
  - `providerSettings`
  - `campaigns`

## State Sync Model

Mission Control now uses a hybrid but more granular sync model:

- browser-local Zustand persistence is only a fast structural cache
- shared state still has a full snapshot row for recovery
- core mutable collections now sync as entity deltas:
  - `agents`
  - `clients`
  - `missions`
  - `artifacts`
  - `conversations`
- each client sync computes:
  - per-record `upserts`
  - per-record `deletes`
  - smaller top-level `statePatch` updates for settings-like data
- relational Supabase tables are updated from those deltas so the backend is no longer dependent on full-state overwrite behavior

Conflict handling:

- `/api/state` rejects stale writes with `409 Conflict`
- `ClientShell` responds by re-fetching the latest shared state and hydrating the local store, rather than continuing with a stale snapshot

## Task Execution Model

Task execution now has three layers:

1. **Direct chat execution**
   - Iris can still execute work during the original `/api/chat` request
   - execution steps, provider info, and quality outcomes are written onto the task/output records

2. **Persisted execution state**
   - `workflow_instances` stores the latest task workflow status, phase, and progress
   - `task_runs` stores discrete execution-stage events with timestamps and status

3. **Retry / resume execution route**
   - `/api/tasks/[id]/execution` supports `GET` for live execution state and `POST` for retry/resume actions
   - execution is queued through `src/lib/server/execution-queue.ts`
   - the queue is currently in-process, not yet a detached worker service

Task detail UI now surfaces:

- workflow status
- current phase
- execution progress
- runner/job status
- recent run history
- richer autonomous execution audit steps
  - `activities`
  - `agentMemories`
- `skills` and `pipelines` are now database-backed catalogs for both editor reads/writes and server-side runtime loading
- Config JSON remains seed/fallback content only when the database tables are empty

### Auth And Access

- Authentication now uses Supabase Auth as the app entry gate
- Browser session management uses `src/lib/supabase/browser.ts`
- `src/components/auth/SessionGate.tsx` blocks the app when no Supabase session exists and redirects unauthenticated users to `/login`
- `src/app/login/page.tsx` performs a **hard post-login redirect** to `/dashboard?refresh=...` so successful sign-in always loads a fresh document instead of relying on a potentially stale client bundle after rebuilds
- `src/app/api/auth/session/route.ts` verifies the Supabase access token and upserts a `profiles` row
- `moeadas@yahoo.com` is elevated to `super_admin`
- `/api/state`, `/api/skills`, and `/api/pipelines` all require a bearer token
- Admin-only route prefixes are:
  - `/settings`
  - `/config`
  - `/skills`
  - `/pipeline`
  - `/users`
- The sidebar hides those admin surfaces for non-admin users
- `/api/state` applies ownership filtering for non-admin users and preserves global configuration on scoped saves
- Ownership fields are being added to:
  - `clients.ownerUserId`
  - `missions.ownerUserId`
  - `artifacts.ownerUserId`
  - `conversations.ownerUserId`
- Non-admin users only receive their own clients/tasks/outputs/conversations from the shared state API
- Non-admin saves only update their owned records; shared/global state is preserved server-side
- `currentUser` is now tracked in the client store so new clients, tasks, outputs, and conversations inherit the authenticated owner id by default

### Admin User Management

- Super admin now has a dedicated `/users` page
- Admin APIs:
  - `GET /api/admin/users`
  - `POST /api/admin/users`
  - `PATCH /api/admin/users`
  - `POST /api/admin/backfill-ownership`
  - `POST /api/admin/assignments`
- The Users page can:
  - inspect workspace users and roles
  - create direct users with a temporary password
  - send Supabase email invites
  - change user role between `member` and `super_admin`
  - activate or suspend users
  - backfill legacy unowned records to the super admin
  - reassign client ownership
  - reassign task ownership
- Client/task reassignment cascades ownership to related outputs and conversations in Supabase
- `resolveAuthContextFromToken` now resolves role and active state from `profiles`, while reserving `moeadas@yahoo.com` as `super_admin`

### Shared State Readiness

- `ClientShell` loads shared state from `/api/state` on startup
- `appStateReady` is used by task/detail pages so direct URLs do not treat “state still hydrating” as “record not found”
- Persisted missions are normalized on hydration so older tasks missing newer fields like `assignedAgentIds` or `leadAgentId` can still open safely

### Supabase Environment

Required environment variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`

Current behavior:

- If those values are missing, the app falls back to browser-local persistence only
- Settings now shows whether shared persistence is connected or not configured
- Once connected, newly created tasks and other persisted agency state are written back through `/api/state` and can be seen across browsers

### Task Deletion

- Tasks can now be deleted from both the task list and the single task detail page
- Deleting a task also removes any artifacts linked to that task
- Store logic lives in `src/lib/agents-store.ts` via `deleteMission`

### Analytics Store
Manages:
- Campaign metrics
- Agent performance
- Learned patterns
- A/B tests

## Skills System

Skills are now stored in Supabase and edited through authenticated API routes:

- `GET /api/skills`
- `POST /api/skills`
- `GET /api/skills/[id]`
- `PUT /api/skills/[id]`
- `DELETE /api/skills/[id]`

The client-side skill library is backed by `src/lib/stores/skills-store.ts`, which loads from Supabase with the current bearer token. The JSON config under `src/config/skills` now acts as seed/fallback content, but the server runtime also merges full config definitions into DB-backed skills via `src/lib/server/skills-catalog.ts` so agents receive rich instructions, output templates, workflow steps, and checklists even when the database row began as a thin stub.

As of the latest hardening pass, the previously weak skill set has been rewritten so the current audit baseline is:

- `157` config skills reviewed
- `0` remaining below the minimum structural quality threshold used for instructions, output templates, checklist depth, and workflow-step coverage

### Skill Schema
Each skill row follows:
```typescript
interface Skill {
  id: string           // kebab-case unique ID
  name: string         // Display name
  description: string  // Third-person description
  category: string     // strategy|creative|media|research|operations|client-services|content
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  freedom: 'high' | 'medium' | 'low'
  prompts: {
    en: { trigger, context, instructions, output_template }
    ar?: { ... }
  }
  variables: Array<{ name, type, required, description }>
  workflow?: { steps: Array<{ step, name, action, verify }> }
  examples?: Array<{ input, output }>
  checklist: string[]
  tools?: string[]
  agents?: string[]
  pipelines?: string[]
  metadata: { version, author, tags, lastUpdated }
}
```

### Categories
1. **Strategy & Planning** - Brand strategy, campaign planning
2. **Creative & Copy** - Visual production, copywriting
3. **Media & Advertising** - Media planning, ad creative
4. **Research & Analytics** - SEO, competitive analysis
5. **Operations & Workflow** - Project management, coordination
6. **Client Services** - Account management, briefings
7. **Content Production** - Content calendars, social media

## Pipeline System

### Core Pipelines
1. **Content Calendar** - 30-day social content planning
2. **Campaign Brief** - Full campaign strategy
3. **Ad Creative** - Advertising production
4. **SEO Audit** - Technical SEO analysis
5. **Competitor Research** - Market intelligence
6. **Media Plan** - Media strategy
7. **Strategy Brief** - Brand and messaging strategy development
8. **Client Brief** - Agency-ready intake and strategic framing

### Pipeline Structure
```typescript
interface Pipeline {
  id: string
  name: string
  description: string
  phases: Phase[]
  isDefault: boolean
  estimatedDuration: string
  clientProfileFields: Field[]
}
```

## OAuth Integrations

### Google (Docs, Sheets, Ads)
- Route: `/api/auth/google`
- Scopes: documents, spreadsheets, drive, adwords

### Meta (Facebook/Instagram Ads)
- Route: `/api/auth/meta`
- Scopes: ads_management, ads_read, pages_read_engagement

### Settings Page
OAuth connections shown in Settings with connect/disconnect buttons and status badges.

## AI Integration

### Providers
- **Ollama** - Local AI (default: `minimax-m2.7:cloud`)
- **Gemini** - Google Cloud AI

### Chat API
- Endpoint: `POST /api/chat`
- Features:
  - bearer-token authentication
  - client-context injection
  - deliverable inference
  - agent routing
  - pipeline inference
  - execution-plan generation
  - autonomous multi-agent execution
  - pipeline phase execution with role-to-agent mapping
  - skill-aware prompts per assigned agent
  - HTML artifact rendering payloads
  - no-hallucination output rules
- Iris is the default chat interface
- `/api/chat` now refuses unauthenticated requests, which closes the biggest compute-exposure route in the app

### Current Task Execution Logic

When a user gives Iris a task:
1. the client task is created immediately in the main store
2. the API infers:
   - deliverable type
   - lead agent
   - collaborator agents
   - optional pipeline hint
   - quality checklist
3. if a suitable pipeline exists, the autonomous runner executes pipeline phases in order:
   - each activity is mapped to the best-fit agent by role
   - that agent receives its assigned skills and tools in prompt context
   - activity outputs are stored and passed forward as handoff context
4. if no pipeline exists, collaborator agents produce specialist handoffs and the lead agent assembles the deliverable
5. the lead agent generates the actual deliverable, not a status note
6. the output is transformed into designed HTML for in-app viewing and saved as an artifact tied to that task
7. the task page shows:
   - request
   - visible output
   - execution prompt
   - team assignment
   - execution steps
   - quality steps
   - exports

- Client knowledge assets now feed directly into the main `/api/chat` client context block, so uploaded brand docs and research are no longer write-only metadata during generation

If the final lead-model pass returns no visible output:
- the server synthesizes a fallback deliverable from pipeline outputs and execution steps
- this guarantees the task still has a visible draft in the app

### Standalone Pipeline Runner Safeguards

- `src/lib/pipeline-execution.ts` now calls the real authenticated `/api/chat` runtime instead of returning a fake hardcoded agent response
- `createPipelineInstance()` seeds client data from the selected client profile, so the runner no longer starts with an empty prompt context
- `validatePipelineClientData()` now checks:
  - required `clientProfileFields`
  - all `{{template_variables}}` referenced in prompt templates and activity descriptions
- `/pipeline/run` now blocks execution and shows a setup error when the selected client is missing required pipeline data, instead of silently substituting `TBD`
- The standalone pipeline executor now injects:
  - assigned agent skill instructions and output-template hints
  - client knowledge asset summaries and extracted insights
- `executeActivityBatch()` now respects activity batching metadata (`batchSize` + `parallel`) so the runner can execute eligible activities in parallel slices instead of always forcing one-by-one execution
- Pipeline activity execution now carries richer execution-step metadata, including:
  - phase / activity identifiers
  - provider and model used
  - produced output ids
  - per-step quality issues when applicable

### How The Autonomous Runner Works

Main file:
- `src/lib/server/autonomous-task.ts`

Execution flow:
1. build a client profile map from the client brief context
2. select a matching pipeline when available
3. iterate each pipeline activity in sequence
4. map the activity role to a real agent
5. inject that agent's assigned skills and tools into the prompt
6. save the activity output into the pipeline output register
7. pass prior outputs into later phase prompts as handoff context
8. run the lead agent for final assembly
9. append a quality-control step from Iris

The execution trace is stored on the artifact as `executionSteps`, which powers the autonomous execution panels in Tasks and Outputs.
- Execution steps now function as a more explicit audit trail instead of just freeform summaries.

### HTML Output Logic

Main files:
- `src/lib/output-html.ts`
- `src/components/outputs/ArtifactOutputView.tsx`

How it works:
- the model is instructed to return structured content using `#` and `##` headings
- the server converts markdown-like structure into semantic HTML (`h1`, `h2`, `h3`, `p`, `ul`, `table`)
- the artifact stores both the source content and the rendered HTML
- task and output pages render the HTML view by default
- export services convert HTML back to plain text as needed for DOCX/PDF/XLSX generation

## Component Library

### Core Components
- `AgentBot` / `RobotFace` - Agent avatar with status indicator (SVG robot faces)
- `Badge` - Status/category badges
- `Button` - Primary/secondary/ghost variants
- `Card` - Container with shadow, hover lift effect
- `Input` / `Select` / `Textarea` - Form controls
- `Modal` - Overlay dialogs
- `Toast` - Notifications

### Layout Components
- `ClientShell` - Main app wrapper; mounts global overlays (IrisChat, ToastContainer, OnboardingWizard); hydrates from `/api/state`; sets `appStateReady`
- `Sidebar` - Navigation sidebar (collapsible); three sections: PRIMARY_NAV, COMPANY_SETUP_NAV, SETTINGS_NAV; admin-only items hidden for non-super_admin users
- `TopBar` - Header with actions, hard-refresh control
- `IrisChat` - Right-panel overlay chat widget; triggered by FAB in ClientShell or `openIris()` store action

### Onboarding Components
- `src/components/onboarding/OnboardingWizard.tsx` - Full-screen overlay wizard for new users; 6 steps: Configure Agency → Add Client → Meet Agents → Add Skill → Create Pipeline → Start Mission; dismissable; tracks progress via `agencySettings.onboardingComplete` and `agencySettings.onboardingStep`; shown only when `onboardingComplete === false` (strict equality avoids triggering for existing users whose persisted state lacks the key)

### Dashboard Components
- `MetricsCards` - Stats display with clean card design
- `AgentStrip` - Horizontal agent list
- `ActivityFeed` - Recent activity with timestamps
- `MissionQueue` - Active tasks

### Office Components
- `OfficeBuilder` — full office builder UI (replaces OfficeFloor)
  - props: `{ isSuperAdmin?: boolean }`
  - grid canvas with floor tiles, zone overlays, furniture SVGs, agent dots
  - left panel: category tabs + asset grid with lock/star/crown indicators
  - right panel: Zones tab (add/rename/delete/paint/assign) + Agents tab (status view)
  - bottom bar: hint strip + selected tile info + remove button
  - roaming commons paths for idle agents
  - room roster and selected-agent detail panel

## Key Libraries

| Library | Purpose |
|---------|---------|
| `skill-schema.ts` | Skill TypeScript interfaces |
| `pipeline-execution.ts` | Pipeline routing engine |
| `agent-roles.ts` | Shared role-to-agent and deliverable-to-agent mapping |
| `skill-import.ts` | Import skills from markdown |
| `server/ai.ts` | AI text generation |
| `server/autonomous-task.ts` | Autonomous task runner and phase-by-phase agent execution |
| `output-html.ts` | HTML rendering helpers for in-app outputs |
| `providers.ts` | AI model definitions |
| `agents-store.ts` | Zustand store with persistence |

## Design Patterns

### Current Gaps To Keep In Mind

- Multiple config systems now coexist:
  - TypeScript agent templates
  - JSON agent role configs
  - JSON pipeline configs
  - JSON workflow configs
  This gives flexibility, but it also means contributor changes should be made carefully to avoid drift.

- Autonomous execution currently runs inside the request lifecycle, not as a detached background worker queue.
- That means long multi-phase tasks are slower but still synchronous from the user’s point of view.
- A future upgrade path would move `autonomous-task.ts` into persisted background jobs with resumable runs and real pause/cancel checkpoints.

### Card Design
- No accent stripes or gradients at top
- Clean border with subtle glow on hover
- Hover lift animation (translate-y)
- Strong shadow for depth

### Glass Morphism
```css
background: rgba(24, 24, 27, 0.8);
backdrop-filter: blur(12px);
border: 1px solid rgba(63, 63, 70, 0.5);
```

### Glow Effects
```css
box-shadow: 0 0 20px rgba(155, 109, 255, 0.3);
```

### Staggered Animations
```css
animation: fadeInUp 400ms ease-out forwards;
animation-delay: calc(var(--i) * 100ms);
```

## Agent Edit System

Agents are editable via the `/agents` page:
- Click any agent card to open edit modal
- Editable fields: name, role, bio, specialty, prompts, tools, skills, and personal photo
- Changes now flow through shared app state and are written into Supabase-backed tables
- Agent positions and statuses are also editable
- All UI components react to changes in real-time

### Agent Photo Logic

- `Agent.photoUrl` now stores a shared public path like `/uploads/agents/<file>`
- The shared avatar component is `src/components/agents/AgentBot.tsx`
- If `photoUrl` exists, the personal image is shown everywhere the agent appears
- If `photoUrl` is missing or fails to load, the app falls back to the default robot icon
- Photo upload and reset controls live in `src/components/agents/AgentEditor.tsx`
- The upload control uses a dedicated button wired to a visually hidden file input via `ref`, which is more reliable than styling the file input directly
- Uploaded avatar files are written to `public/uploads/agents`
- The shared server-side avatar map is stored in `data/agent-photos.json`
- `GET /api/agent-photos` hydrates avatar URLs into the client store on app load, so avatars are shared across browsers instead of being tied to one browser's localStorage
- `POST /api/agent-photos/upload` saves the uploaded image file, updates the shared avatar map immediately, syncs the `agents.photo_url` column in Supabase, and returns the shared public URL
- `PUT /api/agent-photos/[id]` persists the selected avatar URL for a specific agent and syncs that value into Supabase
- `GET /api/agent-photos/file/[filename]` serves uploaded agent images dynamically from the local uploads folder so newly uploaded avatars work immediately without requiring a server restart
- The agent editor also updates the in-memory agent record immediately after upload so the new portrait appears before the modal is closed
- The agent editor now blocks Save while an avatar upload is still in progress, which prevents a just-selected image from being overwritten by an early save
- The editor header and preview both now use the just-uploaded image instead of the older stored avatar, so the user sees the selected portrait immediately
- Saving the agent now triggers an immediate authenticated `/api/state` sync so the new avatar becomes visible across browsers without waiting for the normal debounced persistence loop
- The last root-cause fix was replacing fragile `/uploads/agents/...` static URLs with dynamic `/api/agent-photos/file/...` URLs, because fresh runtime uploads were being written correctly but were not always served immediately by the production server
- Large avatar uploads are compressed client-side before upload so oversized images do not silently fail
- `next.config.mjs` now pins both `turbopack.root` and `outputFileTracingRoot` to this project so uploaded files under `public/uploads` are actually served correctly

### Cache / Refresh Behavior

- HTML responses are now served with `Cache-Control: no-store` via `next.config.mjs` so page shells pick up the latest build more reliably
- The top bar includes a hard refresh control that clears browser cache storage when possible and reloads the current URL with a cache-busting query string
- Static hashed Next assets still use their normal immutable caching behavior

## Editor Theme System

Pipeline and skill editing surfaces now use a shared editor theme layer from `src/styles/globals.css`.

### Shared Editor Tokens
- `.editor-theme` sets the overall surface and text colors
- `.editor-panel` and `.editor-panel-muted` provide card/container styles
- `.editor-input`, `.editor-textarea`, and `.editor-select` standardize field appearance
- `.editor-button-primary` and `.editor-button-secondary` standardize action buttons
- `.editor-tab` and `.editor-tab-active` keep tab styling consistent across editors

### Purpose
- Keeps `/pipeline/[id]`, `/skills/[id]`, and modal editing surfaces visually aligned with the rest of Mission Control
- Allows the same editor UI to switch cleanly between light mode and dark mode using the global theme variables

## Unified Form Modal System

All modals and dialogs use a shared set of CSS classes from `src/styles/globals.css` (section: "Unified Form Modal System"). This eliminates the glass bleed issue where semi-transparent `--bg-panel` (72% opacity) leaked the colorful background through modal surfaces.

### Classes
| Class | Purpose |
|---|---|
| `.form-backdrop` | Fixed overlay: `rgba(8,12,24,0.82)` + subtle `blur(3px)`. Dark enough to eliminate background bleed |
| `.form-panel` | Fully solid `#ffffff` panel with `border-radius: 1.5rem` and strong shadow |
| `.form-header` | `#f8fafc` header strip with bottom border — contains title + close button |
| `.form-footer` | `#f8fafc` footer strip with top border — contains action buttons |
| `.form-body` | Scrollable content area with `1.5rem` padding |
| `.form-label` | Standardised field label (13px, 600 weight, `#374151`) |
| `.form-hint` | Muted helper text below a label |
| `.form-input` / `.form-textarea` / `.form-select` | Solid `#f8fafc` fields, `1.5px #e2e8f0` border, purple focus ring |
| `.form-pill` / `.form-pill-active` | Pill selector buttons (frequency, division, provider, etc.) |
| `.form-step-tab` / `-active` / `-done` | Step indicator tabs in multi-step forms |
| `.form-close-btn` | Standardised close (X) button |
| `.form-info-card` | Muted info/summary card inside a form body |

### Files using this system
- `src/components/agents/AgentEditor.tsx` — full multi-step agent creation/edit modal
- `src/app/schedules/page.tsx` — `ScheduleModal` + `OutputModal`
- `src/components/ui/Modal.tsx` — shared generic modal (used by clients page and support)

## Office Experience

- `src/components/office/OfficeBuilder.tsx` — the interactive office builder (replaced OfficeFloor)
- Layout state is persisted to `office_layouts` DB table (per-tenant, JSONB), loaded on mount, autosaved on change
- `occupiedMap: Map<cellKey, tileId>` — O(1) collision detection for placement validation
- `zoneMap: Map<cellKey, zoneId>` — used for zone color overlays and agent-dot rendering
- `previewCells` — cells the hovered asset would occupy; highlighted green (valid) or red (blocked/OOB)
- `isAssetUnlocked(asset, isSuperAdmin, ownedAssets)` — free always unlocked; premium requires ownership or superadmin flag
- `ZONE_COLORS` — 8-color palette cycling for new zones
- The right-side detail rail shows the selected room and live agent roster from shared app state

## Agent Cards

- `src/components/agents/AgentCard.tsx` now uses a stronger profile-card structure with a top rarity/header strip, clearer stats, and a unified action bar
- Cards keep the same agent actions as before: activate/pause, clone, remove, and open edit
- The card surface is now theme-aware and reads correctly in both light mode and dark mode
- Text, chip, and stat-tile contrast now follow global theme tokens instead of hardcoded dark-only values
- Visual emphasis is now split into:
  - identity block
  - completion/status block
  - runtime/output/workload stat tiles
  - current mission panel
  - consistent bottom action strip
- The styling stays within Mission Control’s current theme but pushes further toward “playable roster card” presentation

## Reliability Notes

- `src/components/ClientShell.tsx` is the hydration gate for the authenticated app shell:
  - it loads shared state from `/api/state`
  - it applies authenticated user context
  - it sets `appStateReady` only after the shared payload is resolved or explicitly failed
- `src/app/tasks/page.tsx`, `src/app/tasks/[id]/page.tsx`, and `src/app/outputs/page.tsx` now wait for `appStateReady` before rendering empty-state fallbacks, which prevents false “not found” or empty registry flashes during Supabase hydration
- `src/components/agents/IrisChat.tsx` now distinguishes between:
  - a usable deliverable
  - a coordination/status-only response
  - a provider failure
- If Iris returns only routing/correction language, the task is now marked `blocked` instead of pretending a real output exists
- If the chat request fails outright, the task is also marked `blocked` and stores the provider error in `handoffNotes`
- Tasks only create saved output artifacts when the response looks like a real deliverable, not when it is just boilerplate status language
- `src/app/tasks/[id]/page.tsx` now uses client-side router navigation after deletion instead of forcing a full-page reload
- `/api/chat` now returns provider-aware service statuses (for example `503` for unavailable AI runtime) instead of flattening availability problems into generic `500` errors
- `src/app/api/chat/route.ts` now also guards artifact-truth checks against missing artifact arrays, so a null-ish artifact payload no longer crashes the response assembly
- `/api/state` now performs optimistic concurrency checks using the last known `updatedAt` value and returns `409 Conflict` if a stale browser tab tries to overwrite a newer shared-state snapshot
- **Bug fixed**: `src/lib/supabase/app-state.ts` normalizes the `updated_at` column to ISO string after DB reads — postgres.js returns `TIMESTAMPTZ` as a `Date` object, which caused the 409 conflict check (`body.updatedAt !== currentRow.updated_at`) to always be `true` (string vs Date), blocking every PUT from ever committing. This was silently swallowed by `.catch(() => {})` in ClientShell, causing theme/settings changes to never persist.
- **Bug fixed**: relational sync in `saveSharedAppState` / `saveSharedAppStateDelta` is now wrapped in try-catch (non-fatal) — a sync error no longer causes the PUT to return 500 and lose the already-committed JSON blob update
- `src/components/ClientShell.tsx` now skips redundant `/api/state` writes when the serialized persistence snapshot has not actually changed
- `src/components/ClientShell.tsx` now sends top-level `statePatch` payloads for changed collections/settings instead of always posting the full snapshot, which reduces unnecessary sync volume even though the server still stores a merged shared snapshot
- Browser local persistence now stores a lighter snapshot:
  - artifact bodies, HTML, and source prompts are stripped
  - execution-step summaries are truncated
  - conversation history is reduced to the latest 6 trimmed messages
  Shared Supabase state remains the full source of truth for complete records
- `src/components/layout/TopBar.tsx` exposes a "Refresh latest app version" control that clears browser caches and reloads with a timestamped URL when a user gets stuck on an old build
- Deliverable quality is now evaluated before a task/output is treated as usable:
  - missing required sections
  - coordination/status boilerplate
  - weak deliverable structure
  will now fail the quality gate and keep the task blocked instead of pretending the output is ready

## Provider Runtime Model

- Provider settings are now treated as **user-scoped runtime preferences**, not a shared agency-wide secret store
- Each authenticated user keeps their own:
  - Ollama base URL
  - Ollama verification state and discovered models
  - Gemini API key, masked key, verification state, and preferred Gemini model
  - runtime routing preferences
- Runtime routing preferences now include:
  - primary runtime
  - fallback runtime
  - a `useGeminiForThinking` toggle for strategy/research/heavier reasoning tasks
- `src/app/api/state/route.ts` now:
  - loads provider settings from the authenticated user’s Supabase auth metadata
  - returns those user-scoped settings into the app state
  - saves updated provider settings back to that same authenticated user profile
- Shared agency state still stores:
  - agency settings
  - clients
  - tasks
  - outputs
  - conversations
  - activities/campaigns/memories bridge data
- Provider secrets are therefore no longer conceptually shared across all users of the workspace
- Raw Gemini keys are no longer persisted into browser localStorage snapshots; only masked/provider-safe values remain in browser persistence
- The authenticated server-side provider profile is now the trusted source for runtime selection

## Security Notes

- `SUPER_ADMIN_EMAIL` is now configurable through environment variables instead of being hardcoded as an unchangeable code constant
- `.env.local.example` now documents the required runtime variables, including `SUPER_ADMIN_EMAIL`
- Client-supplied brand/context values now pass through prompt-safety sanitization before they are injected into AI prompts or template interpolation
- The remaining planned security hardening items are:
  - deeper entity-level sync beyond the current core collections
  - fuller background execution infrastructure beyond request/response lifecycles

### Runtime Selection Rules

- Ollama is intended to be the primary default runtime
- Gemini is intended to be:
  - the fallback runtime
  - the preferred runtime for thinking-heavy deliverables when enabled and verified
- Thinking-heavy deliverables currently include:
  - strategy briefs
  - campaign strategy
  - research briefs
  - SEO audits
  - client briefs
  - KPI forecasts
- `src/app/api/chat/route.ts` now resolves the actual runtime from user-scoped provider settings instead of blindly trusting a hardcoded default provider
- If the selected runtime fails, the route now attempts the configured fallback runtime before returning an error
- `src/lib/server/ai.ts` now prioritizes content/social routing keywords before generic client-service phrases so requests like Instagram carousels route cleanly to `Echo` instead of being misclassified by words such as `client-ready`

### User Expectation

- Super admin can rely on their own local Ollama setup plus optional Gemini
- Other users are expected to install/run Ollama locally on their own machines if they want local-first generation
- Gemini only becomes active after the user saves and successfully verifies a valid API key from `/settings`

## QA Snapshot

- Authenticated super-admin flow has been verified through Supabase auth plus the `/users` admin APIs
- Shared state API has been verified with bearer-authenticated reads for:

## State Sync Model

- Shared state still keeps a full `mission_control_state.state` snapshot in Supabase for recovery and hydration
- The client no longer syncs only top-level slice replacements:
  - `agents`
  - `clients`
  - `missions`
  - `artifacts`
  - `conversations`
  are now tracked as **record-level entity deltas**
- `src/components/ClientShell.tsx` now computes:
  - per-record `upserts`
  - per-record `deletes`
  for the core entity collections
- `/api/state` now accepts:
  - `entityPatch`
  - `statePatch`
  - `updatedAt`
- `updatedAt` is used for optimistic concurrency, so stale tabs receive `409 Conflict` instead of silently overwriting newer shared state
- `src/lib/supabase/app-state.ts` now applies entity deltas to the snapshot and syncs those same deltas into relational tables
- `src/lib/supabase/relational-sync.ts` now supports targeted relational updates for:
  - agents
  - clients
  - missions/tasks
  - outputs
  - conversations/messages
  - knowledge assets for changed clients
- Non-entity bridge data still syncs as top-level patches:
  - `agencySettings`
  - `providerSettings`
  - `campaigns`
  - `activities`
  - `agentMemories`

## Task Execution Model

- A task can now execute through two paths:
  - immediate request-driven execution from `src/app/api/chat/route.ts`
  - explicit retry/resume execution from `src/app/api/tasks/[id]/execution/route.ts`
- The second path is important because it removes the “only during the original chat request” limitation
- Persisted execution data now lives in Supabase tables:
  - `workflow_instances`
  - `task_runs`
- `src/lib/server/task-execution.ts` is the server helper responsible for:
  - loading a saved task
  - loading its client context, knowledge assets, agents, pipelines, and skills
  - selecting the runtime from user-scoped provider settings
  - running autonomous execution
  - persisting workflow status and task-run records
  - saving/updating the output artifact row
- `src/lib/server/autonomous-task.ts` now supports execution hooks so the caller can persist:
  - phase start
  - activity completion
  - runtime/provider/model per activity
- `src/app/tasks/[id]/page.tsx` now reads persisted execution state and shows:
  - workflow status
  - current phase
  - progress
  - recent task-run records
  - retry/resume controls

## Skills And Pipelines In Runtime

- Skills and pipelines are not just editable config surfaces anymore; they are now part of the live execution path
- `src/app/api/chat/route.ts` loads:
  - pipelines from Supabase first, config fallback second
  - skills from Supabase first, config fallback second
- `src/lib/pipeline-execution.ts` now:
  - validates required client fields
  - validates unresolved `{{template_variables}}`
  - injects assigned skill context for the executing agent
  - injects client knowledge-asset context
  - respects pipeline batching settings
- `src/lib/server/autonomous-task.ts` now:
  - builds per-agent skill context
  - runs pipeline activities through the assigned role/agent mapping
  - records per-activity execution metadata for auditability
- This means the live generation path now actually uses:
  - pipeline definitions
  - assigned agent skills
  - client knowledge assets
  instead of only storing them in the database/UI
  - `/api/state`
  - `/api/admin/users`
- Current runtime caveat:
  - Iris/task generation still depends on at least one actually available AI provider
  - if Ollama is selected but not running, `/api/chat` returns a friendly failure and the task is blocked instead of silently pretending it completed

## Pipeline & Skill Execution Fixes (2026-05-04)

Four systemic issues were fixed to make pipelines and skills actually fire during generation:

### 1. Aggressive Pipeline Matching (`src/lib/intents/deliverable-registry.ts` + `src/lib/intents/intent-classifier.ts`)
- Expanded `pipelineKeywords` arrays for all pipeline-backed deliverable types with natural-language synonyms (e.g. "plan my social content", "research competitors", "launch strategy")
- Added **deliverable-type bridge** in `inferPipelineHint`: after keyword matching, if `inferDeliverableType` resolves to a type with a `pipelineId`, that pipeline is now always used — even without keyword matches
- Lowered user-defined pipeline fallback threshold from `matchCount >= 2` to `>= 1` so single-keyword pipeline names still trigger

### 2. Skill Injection Resilience (`src/lib/server/autonomous-task.ts`)
- `resolveAgentSkillRefs` now creates **synthetic SkillRef objects** when `skillCategories` fails to load (Supabase/config failure)
- Synthetic refs convert raw skill IDs (`'seo-writing'`) to human-readable names (`'SEO Writing'`) and inject minimal context/instructions so the LLM still receives skill guidance
- `loadSkills()` in `route.ts` now logs a warning when config skill categories are empty, making failures visible

### 3. Visible Pipeline Indicator (`src/components/agents/IrisChat.tsx`)
- `activePipelineInfo` state (`{ name, deliverableType }`) tracks the active pipeline
- Set provisionally from `buildProvisionalMissionRouting` (client-side, instant) then confirmed from the server's NDJSON `pipeline_start` chunk
- Displayed in the Thinking/Streaming bubble: `Pipeline: [Name]` badge + `Routing to specialists…` status text
- Cleared 1.2s after the response arrives (smooth UX, doesn't linger)

### 4. NDJSON Streaming Wire Format (`src/app/api/chat/route.ts` + `src/components/agents/IrisChat.tsx`)
- Deliverable execution path now returns `Content-Type: application/x-ndjson` instead of `application/json`
- Response has two chunks: `{ type: 'pipeline_start', pipelineName, phases, deliverableType }` then `{ type: 'done', response, meta }`
- `requestChat()` in IrisChat detects `Content-Type`, parses NDJSON line-by-line, calls `onPipelineStart` callback on first chunk (updates indicator from server source), then `onChunk`/`onDone` on the done chunk
- Conversational path still returns plain JSON (fast, no pipeline overhead)
- _TODO_: For genuine concurrent streaming (pipeline_start before execution starts), move `executeAutonomousTask` calls inside a `ReadableStream.start` async callback

### Quality Gate Fix — Simple Social Posts (`src/lib/output-quality.ts`)
- `isSimpleSocialPostRequest` regex expanded to catch natural phrasings: `"a post for facebook"`, `"write a post on linkedin"`, `"single instagram post"`, etc.
- `LIGHTWEIGHT_TYPES` set introduced: `campaign-copy`, `short-form-copy`, `status-report`, `general-task`, `pr-comms` — these types skip the H1 title check entirely
- Simple social posts (`isSimplePost = true`) now require **zero** structural H2 headers — a plain caption passes cleanly
- Minimum word count check (≥ 8 words) still catches genuinely empty outputs
- `short-form-copy` (bios, taglines) also emptied of required sections — these are prose, not documents

## Build & Deployment

```bash
cd /path/to/Mission\ Control\ Ready
npm run dev  # Start development server
npm run build  # Production build
```

Access at: http://localhost:3000

## Git Status

- **40 commits ahead** of origin/main
- All changes committed locally
- Build passes with Next.js 16.2.1/Turbopack

## Constraints

- All configs stored as editable JSON in `src/config/`
- Agent definitions in `src/lib/agent-templates.ts`
- No hardcoded values — everything editable
- Skills follow Claude best practices format
- Build must pass before commits (`npm run build`)

- `IrisChat` now distinguishes between conversational chat and task intake: greetings, questions, and normal back-and-forth stay in the chat thread only, while explicit work requests open missions and persist deliverables as artifacts.
- The Iris chat shell self-heals stale conversation state: if the active conversation id points to a missing thread, it creates a fresh chat automatically before sending so messages never vanish into an invalid local session reference.
- The imported `mission-control-claude-genspark_ai_developer` variant was merged selectively rather than copied wholesale:
  - `ClientShell`, `TopBar`, and `AgentEditor` now memoize the Supabase browser client to avoid client-side hydration instability
  - the app shell now exposes a skip-to-content link and stronger focus-visible states on shared buttons
  - `/api/chat` now defaults to larger generation budgets and uses a lightweight conversational path for normal Iris chat
  - Ollama calls now use `/api/chat` with structured messages and a larger context window instead of flattening everything into one prompt string
  - the Nova media skill set was expanded with 16 detailed media-planning skills and corrected skill ids
  - server-side skill loading now merges Supabase-backed skills with full JSON config definitions, so missing config-only skills still appear in the UI/runtime and missing config skills are inserted into Supabase on later relational sync without overwriting edited DB rows

## Onboarding Flow

New users see a full-screen overlay wizard on their first visit. Existing users (whose persisted state predates the onboarding system) never see it because the condition uses strict equality (`=== false`) rather than a falsy check.

### Key Files
- `src/components/onboarding/OnboardingWizard.tsx` — the overlay component
- `src/lib/agents-store/defaults.ts` — `INITIAL_AGENCY_SETTINGS` seeds `onboardingComplete: false, onboardingStep: 0`
- `src/lib/types.ts` — `AgencySettings` interface has optional `onboardingComplete?: boolean` and `onboardingStep?: number`
- `src/components/ClientShell.tsx` — mounts `<OnboardingWizard />` when `appStateReady && onboardingComplete === false`

### Wizard Steps
1. **Configure Agency** (`/settings`) — name, logo, theme
2. **Add Client** (`/clients`) — first client profile
3. **Meet Agents** (`/agents`) — explore the roster
4. **Add Skill** (`/skills`) — unlock agent capabilities
5. **Create Pipeline** (`/pipeline`) — build repeatable workflows
6. **Start Mission** (`/mission`) — first real brief to Iris

### Behaviour
- Left column: clickable step nav with done/active/upcoming states
- Right panel: large icon, headline, bullets, contextual tip
- "Go there now" CTA navigates to the relevant page and closes the wizard
- "Next step" advances within the wizard without leaving
- Dismiss (×) sets `onboardingComplete: true` without losing step progress
- Progress bar fills as steps are completed

## Getting Started Checklist (Dashboard)

A styled card on the `/dashboard` page shows onboarding step progress for users who have been through the new-user flow.

- Only shown when `typeof agencySettings.onboardingStep === 'number'` (avoids showing for existing users)
- Clicking any step tile highlights it with its accent color
- "Open wizard" button re-launches the onboarding overlay
- Uses the same `ONBOARDING_STEPS` color/icon/href data as the wizard

## Sidebar Navigation Structure

`src/components/layout/Sidebar.tsx` organizes nav into three sections:

```
PRIMARY_NAV          — Start a Mission, Dashboard, Virtual Office, Tasks, Analytics, Output
COMPANY_SETUP_NAV    — Agents, Clients, Skills, Pipelines, Schedules, Users
SETTINGS_NAV         — Settings, Support
```

- Admin-only IDs (`pipeline`, `skills`, `users`, `settings`, `schedules`) are hidden for non-`super_admin` users
- "Start a Mission" uses a purple gradient highlight variant that stays on one line (no badge text)
- Active non-highlight items use a green-tinted active state

## Agent Editor (Multi-Step Drawer)

`src/components/agents/AgentEditor.tsx` is a side-drawer modal opened from the Agents page.

### Opening Logic
The editor is mounted conditionally in `src/app/agents/page.tsx`:
```tsx
{isEditorOpen && <AgentEditor agentId={editingAgentId} onClose={closeEditor} />}
```
This prevents the editor from rendering on every page load. With `isEditorOpen: false` (initial state), the drawer does not mount at all.

### Modes
- **Create mode**: `agentId === null` — all fields empty, Save calls `createAgent()`
- **Edit mode**: `agentId = string` — prefilled, Save calls `updateAgent()`

### Steps
1. Identity — name, role, division, status
2. Personality — bio, specialty, tone
3. Capabilities — tools, skills
4. AI Config — provider, model, system prompt

### Delete Agent
- Delete button appears in the footer only in edit mode
- Clicking it shows a confirmation overlay inside the modal (`confirmingDelete` state)
- Confirmed delete calls `deleteAgent(agentId)` then closes the drawer

## Mission Page (`/mission`)

`src/app/mission/page.tsx` — A clean brief-input hub. Does NOT auto-open IrisChat when visited.

### How It Works
1. User types a brief in the textarea (or clicks a prompt starter to prefill it)
2. Clicking "Brief Iris" or pressing Enter:
   - calls `openIris()` if the panel isn't already open
   - dispatches a `CustomEvent('iris:prefill', { detail: { text } })` after 150ms delay
3. IrisChat listens for `iris:prefill` and sets the input value

### Prompt Starters
Three categories (Content & Copy, Strategy & Research, Creative & Campaigns) with text-only pill buttons — no emojis, no icons.

### Design Notes
- Dark headline text using `var(--text-primary)` explicitly — not gradient-text that bleeds into surrounding elements
- Input area is a light glass card with explicit color tokens
- Three-step footer explains the workflow (Describe → Iris routes → Review output)

## Schedules Page (`/schedules`)

`src/app/schedules/page.tsx` — Full API-backed scheduled task system.

### DB Table
`scheduled_tasks` — tenant-scoped. Columns: `id`, `tenant_id`, `agent_id`, `name`, `description`, `task_type`, `prompt`, `frequency`, `day_of_week`, `day_of_month`, `time_hour`, `time_minute`, `status`, `next_run_at`, `last_run_at`, `last_run_status`, `last_run_output`, `run_count`, `created_at`, `updated_at`.

Migration: `supabase/migrations/20260509_scheduled_tasks.sql`

### API Endpoints
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/scheduled-tasks` | GET | List all tasks for tenant |
| `/api/scheduled-tasks` | POST | Create task (requires `name`, `prompt`) |
| `/api/scheduled-tasks/[id]` | PATCH | Update task fields / toggle status |
| `/api/scheduled-tasks/[id]` | DELETE | Delete task |
| `/api/scheduled-tasks/[id]/run` | POST | Execute task immediately via `generateText` |
| `/api/scheduled-tasks/tick` | GET | Cron endpoint — runs all due tasks (auth: `CRON_SECRET` header) |

### Execution Engine (`/run` and `/tick`)
1. Loads the scheduled task + assigned agent from DB
2. Loads tenant owner's `providerSettings` from `provider-secrets.json`
3. Resolves provider/model via `resolveTaskRuntime()`
4. Calls `generateText()` with a system prompt built from the agent's role + task type
5. Stores `last_run_output`, `last_run_status`, increments `run_count`, recomputes `next_run_at`

### VPS Cron Setup
```bash
# Add to VPS crontab (crontab -e as root):
* * * * * curl -sf -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/scheduled-tasks/tick >> /tmp/cron-tick.log 2>&1
```
Set `CRON_SECRET` in `/opt/mission-control/.env.local`.

---

## Office Layouts DB

### Table: `office_layouts`
```sql
CREATE TABLE IF NOT EXISTS office_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  layout jsonb NOT NULL DEFAULT '{"version":1,"gridWidth":26,"gridHeight":18,"floorAssetId":"floor-hardwood","tiles":[],"zones":[]}',
  mc_credits integer NOT NULL DEFAULT 0,
  owned_assets text[] NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id)
);
```

### API
- `GET /api/office-layout` — returns `{ layout, mcCredits, ownedAssets }` (defaults if no row)
- `PUT /api/office-layout` — upserts on `tenant_id` conflict; updates `layout` + `updated_at`

### Key Types (`src/lib/office-types.ts`)
- `PlacedTile` — `{ id, assetId, x, y, rotation }`
- `OfficeZone` — `{ id, name, color, tiles: [{x,y}][], agentIds: string[] }`
- `OfficeLayout` — `{ version:1, gridWidth, gridHeight, floorAssetId, tiles, zones }`

### Asset Catalog (`src/lib/office-assets.ts`)
31 SVG assets across 6 categories; tier `free` (20) or `premium` (11, priced 60–300 MC$).
`isAssetUnlocked(asset, isSuperAdmin, ownedAssets)` — superadmin bypasses all locks.

---

## Token Usage Tracking

### Overview
Every AI generation call now captures token counts and estimated cost, stored in the `token_usage` table and surfaced in the UI.

### Key Files
- `src/config/model-pricing.ts` — pricing table for all models, `calculateCost()`, `formatCost()`, `formatTokens()`, `MODEL_CATALOG` (for UI pickers)
- `src/lib/server/ai.ts` — `generateTextWithUsage()` returns `{ text, usage: TokenUsage }` with per-provider token extraction; `generateText()` is a backward-compatible thin wrapper
- `src/lib/server/token-logger.ts` — `logTokenUsage(db, entry)` fire-and-forget insert (errors swallowed)
- `src/app/api/token-usage/route.ts` — `GET /api/token-usage?period=7d|30d|all&agentId=<optional>` returns `{ summary, byAgent, byModel, recent }`

### DB Table
`token_usage` — Columns: `id`, `tenant_id`, `agent_id`, `source_type` (chat/scheduled), `source_id`, `provider`, `model`, `input_tokens`, `output_tokens`, `total_tokens`, `cost_usd`, `created_at`.

Migration: `supabase/migrations/20260509_token_usage.sql`

### Provider/Model Priority in resolveTaskRuntime
Added Priority 0: if the agent has an assigned `provider`+`model`, those are used first, before any task-type routing logic. This allows fine-grained model assignment per agent (e.g. powerful model for research, fast model for social posts).

### UI
- **Agent Editor** Step 3 (AI Config): provider selector (Anthropic / OpenAI / Gemini / Ollama) + model picker using `MODEL_CATALOG`. Provider/model saved on agent record.
- **Agent Cards** (`/agents`): cost badge (30d spend) + model name shown per card, fetched from `/api/token-usage`.

### `computeNextRunAt` Logic (server-side)
- **daily**: next occurrence of `time_hour:time_minute` (advances by 1 day if already past today's window)
- **weekly**: next occurrence of `day_of_week` at `time_hour:time_minute` (corrects for target weekday, not naive +7d)
- **monthly**: next occurrence of `day_of_month` at `time_hour:time_minute` (advances month if past)
- **once**: returns null (task moves to `completed` after first run)

### Frontend Features
- Loads tasks from API on mount; no localStorage
- Agent selector (assigns any configured agent, falls back to Iris)
- Prompt / instructions field with task-type-aware placeholder
- Run Now button triggers `/run` and shows output immediately in a modal
- Output viewer (FileText icon) shows `last_run_output` + error state
- Pause / resume via PATCH `{ status }`
- Fixed `computeNextRun` weekly logic

## Client Asset Uploads

### Upload API — `POST /api/client-assets/upload`
- Accepts `multipart/form-data` with `file`, `clientId`, `assetType`
- **Brand assets** (`logos`, `templates`, `referenceImages`, `fontFiles`): stored to `public/uploads/client-assets/[clientId]/[assetType]/[timestamp-filename]`, served statically via Next.js (Docker volume `mc_uploads`). Max 10MB.
- **Knowledge documents** (`documents`): same storage, PLUS text is extracted and returned as `extractedText` / `extractedPreview`. Max 20MB.
- **Text extraction by type**:
  - `.pdf` — BT…ET block parser, extracts literal and hex PDF strings (no native library)
  - `.txt`, `.md`, `.csv`, `.json`, `.html` — `buffer.toString('utf-8')`
  - `.docx` — scans `<w:t>` XML tags inside the DOCX ZIP (no unzip library needed)
- Extracted text is capped at 50,000 characters
- URL format: `/uploads/client-assets/[clientId]/[assetType]/[filename]` (static, no proxying needed)

### Legacy File Serving — `GET /api/client-assets/file/[filename]`
- Reads from `public/uploads/clients/` flat directory (old structure)
- Kept for backward compatibility with existing assets

### Knowledge Hub — Document Upload UX (clients page)
- "Upload Document" button in Knowledge Hub Assets section opens a file picker (`.pdf,.txt,.md,.csv,.json,.docx,.doc`)
- On upload: title auto-filled from filename, `extractedInsights` auto-filled with full extracted text, summary auto-filled from preview, path set to URL, type detected from extension, status set to `synced`
- User reviews and clicks "Add Asset" to commit — the `extractedInsights` field is what flows into AI prompts via `buildClientContext()`

### How Client Data Reaches the AI
`chat/route.ts` → `buildClientContext(client)` injects:
- All brand kit properties (colors, fonts, visual keywords, look & feel, etc.)
- All brand asset URLs (logos, templates, reference images)
- All knowledge assets: `[title] ([type]): [summary] | Insights: [extractedInsights]`
- The `extractedInsights` field from uploaded documents is the most powerful field — it injects raw document content directly into every AI prompt

## Support Page (`/support`)

`src/app/support/page.tsx` — Contact form that composes a mailto: link.

- Fields: name, email, subject (dropdown), message
- Submit opens the user's mail client with pre-filled subject/body
- No backend required; no data is stored

## IrisChat Enhancements

- **No auto-open on Mission page**: the `useEffect(() => openIris(), [])` that previously ran on every visit to `/mission` has been removed. Iris only opens when the user explicitly clicks "Brief Iris" or the FAB.
- **`iris:prefill` event**: Mission page dispatches `new CustomEvent('iris:prefill', { detail: { text } })` on the window. IrisChat listens and populates its input field. 150ms delay ensures the panel is open before the event fires.
- **Task failure notification**: `ClientShell` subscribes to `useAgentsStore` and watches for newly-blocked tasks, showing a toast notification when one is detected.

## Folder Organization

```
src/
├── app/                     Next.js App Router pages
│   ├── dashboard/           Main command center
│   ├── mission/             Brief-input hub (new)
│   ├── office/              Virtual office floor
│   ├── agents/              Agent roster + editor
│   ├── clients/             Client management
│   ├── tasks/               Task list + detail [id]
│   ├── pipeline/            Pipeline browser + editor [id] + runner
│   ├── skills/              Skills library + editor [id]
│   ├── analytics/           Analytics dashboards
│   ├── outputs/             Saved deliverables
│   ├── schedules/           Scheduled task CRUD (new)
│   ├── users/               Super admin user management
│   ├── support/             Contact form (new)
│   ├── settings/            App settings + integrations
│   ├── config/              JSON config editor
│   ├── login/               Supabase Auth login gate
│   └── api/                 API routes
│       ├── chat/            Iris AI generation endpoint
│       ├── state/           Shared state read/write
│       ├── auth/            Session verification
│       ├── skills/          Skills CRUD
│       ├── pipelines/       Pipelines CRUD
│       ├── agent-photos/    Avatar upload + serving
│       ├── tasks/[id]/      Task execution retry/resume
│       └── admin/           User management (super_admin only)
│
├── components/
│   ├── agents/              AgentCard, AgentEditor, AgentBot, IrisChat
│   ├── auth/                SessionGate
│   ├── dashboard/           MetricsCards, AgentStrip, ActivityFeed, MissionQueue
│   ├── layout/              Sidebar, TopBar, ClientShell
│   ├── office/              OfficeBuilder (replaced OfficeFloor)
│   ├── onboarding/          OnboardingWizard (new)
│   ├── outputs/             ArtifactOutputView
│   └── ui/                  Toast, Modal, shared primitives
│
├── lib/
│   ├── agents-store.ts      Main Zustand store (all app state)
│   ├── agents-store/        Store slice files (defaults, actions, etc.)
│   ├── types.ts             All TypeScript interfaces (single source of truth)
│   ├── providers.ts         AI model/provider definitions
│   ├── agent-templates.ts   DEFAULT_AGENTS seed data
│   ├── agent-roles.ts       Role-to-agent and deliverable-to-agent mapping
│   ├── task-output.ts       Deliverable title/output-spec/checklist generation
│   ├── output-quality.ts    Structural quality validation before artifact save
│   ├── output-html.ts       Markdown → HTML rendering for in-app outputs
│   ├── pipeline-execution.ts Pipeline routing engine
│   ├── skill-schema.ts      Skill TypeScript interfaces
│   ├── skill-import.ts      Import skills from markdown
│   ├── stores/
│   │   ├── skills-store.ts  Skills store (Supabase-backed)
│   │   └── analytics-store.ts
│   ├── supabase/
│   │   ├── browser.ts       Client-side Supabase + access token helper
│   │   ├── server.ts        Server-side Supabase client
│   │   ├── config.ts        Supabase env helpers
│   │   ├── app-state.ts     Shared state read/write via Supabase
│   │   └── relational-sync.ts Entity-level delta sync to relational tables
│   └── server/
│       ├── ai.ts            Text generation (Ollama + Gemini)
│       ├── autonomous-task.ts Multi-agent autonomous task runner
│       ├── task-channeling.ts Skill-driven lead/support assignment
│       ├── task-execution.ts  Retry/resume execution helper
│       ├── skills-catalog.ts  Merge config skills into Supabase
│       └── execution-queue.ts In-process execution queue
│
├── config/
│   ├── agents/              Individual agent JSON configs (seed/reference)
│   ├── pipelines/           Pipeline JSON definitions
│   ├── skills/              ~157 skill JSON files (seed/fallback)
│   └── tools/               Tool registry JSON
│
└── styles/
    └── globals.css          Design tokens, editor theme, glass morphism, animations
```
