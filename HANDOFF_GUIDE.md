# Mission Control — AI Developer Handoff Guide

> **Created:** 2026-05-15
> **Purpose:** Complete onboarding guide for any AI agent (or developer) picking up this project. Covers codebase location, architecture, credentials, deployment workflow, and how changes are made end-to-end.

---

## 1. What Is This App?

**Mission Control** is a multi-tenant SaaS agency management platform built in Next.js 16. It lets agencies manage clients, AI agents, tasks, and content production. The centrepiece is **Iris** — a conversational AI assistant that classifies user requests and routes them to the right content-generation engine (social posts, strategy documents, content calendars, etc.).

---

## 2. Local Codebase

| Item | Value |
|---|---|
| **Mac folder** | `/Users/moe/Desktop/Mission Control Remake` |
| **Bash path (sandbox)** | `/sessions/nifty-beautiful-wright/mnt/Mission Control Remake/` |
| **Framework** | Next.js 16.2.1, React 19, TypeScript, Tailwind CSS |
| **State** | Zustand (client) + PostgreSQL via postgres.js (server) |
| **Auth** | Custom JWT (jose HS256 + bcryptjs) — no Supabase, no third-party auth |

### ⚠️ Rule
Only ever read/write files inside `/Users/moe/Desktop/Mission Control Remake`. Never touch files outside this folder.

### Key Source Files

| File | Purpose |
|---|---|
| `src/lib/agents-store.ts` | Zustand store — single source of truth for client state |
| `src/components/ClientShell.tsx` | App shell (Sidebar, TopBar, IrisChat FAB) |
| `src/components/layout/Sidebar.tsx` | Nav sections (PRIMARY_NAV, COMPANY_SETUP_NAV, etc.) |
| `src/components/agents/IrisChat.tsx` | Right-panel Iris overlay — main user-facing chat |
| `src/app/api/chat/route.ts` | Chat API — classifies request, routes to task engine |
| `src/lib/intents/intent-classifier.ts` | `inferDeliverableType` — score-based request classifier |
| `src/lib/intents/deliverable-registry.ts` | Pattern/priority definitions for each deliverable type |
| `src/lib/server/autonomous-task.ts` | Task execution router — dispatches to sub-engines |
| `src/lib/server/creative-asset-engine.ts` | Produces "Creative Asset Production Pack" (visual briefs only) |
| `src/lib/task-output.ts` | Output formatters — campaign-copy, social posts, etc. |
| `src/lib/auth/server.ts` | JWT auth context (userId, email, role, tenantId, providerSettings) |
| `src/lib/db/relational-sync.ts` | DB sync (scoped by agency_id / tenantId) |
| `src/lib/server/provider-secrets.ts` | Per-user AI provider settings in `data/provider-secrets.json` |
| `src/lib/provider-settings.ts` | Normalises provider settings, resolves which AI model to use |
| `docker/init.sql` | Full DB schema (run once on first deploy) |
| `ARCHITECTURE.md` | Living architecture document — always update after code changes |

---

## 3. GitHub Repository

| Item | Value |
|---|---|
| **Repo URL** | `https://github.com/moeadas/Mission-Control-Apr27-Claude` |
| **Branch** | `main` |
| **Auth** | Stored Git credentials on the Mac (no token needed for push) |

---

## 4. VPS / Server

| Item | Value |
|---|---|
| **IP** | `72.62.33.12` |
| **SSH user** | `root` |
| **SSH key** | `~/.ssh/contentforge_deploy` (on Moe's Mac) |
| **App path on VPS** | `/opt/mission-control` |
| **App container** | `mc_app` — port 3000 |
| **DB container** | `mc_db` — postgres:16-alpine |
| **App URL** | `http://72.62.33.12:3000` |
| **Build log** | `/tmp/mc_build_mt.log` (on VPS) |
| **Docker version** | v2 — use `docker compose` (NOT `docker-compose`) |

> **Note:** Hostinger's browser terminal connects to `92.113.16.86` (different routing). Always SSH directly via the key above — the browser terminal cannot reach the same host.

### SSH Command
```bash
ssh -i ~/.ssh/contentforge_deploy -o StrictHostKeyChecking=no root@72.62.33.12
```

---

## 5. Environment Variables

### VPS `.env` — at `/opt/mission-control/.env`

```
DB_PASSWORD=OXtygjiN1xkZZKv9xJGRcsIT4gO6LYrOY0XpaDKk
JWT_SECRET=wOSpehER9ziacYHuDBj3inhmKzrvxgSykbnCN7AYdGL9zF7ISubCkEVebFpuB66X
SUPER_ADMIN_EMAIL=moeabuadas@googlemail.com
NEXT_PUBLIC_APP_URL=http://72.62.33.12:3000
ANTHROPIC_API_KEY=          ← set per-user via Settings page, not here
OPENAI_API_KEY=             ← set per-user via Settings page
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
META_APP_ID=
META_APP_SECRET=
```

> **AI provider keys** (Anthropic, OpenAI, Gemini, Ollama) are stored **per user** in `data/provider-secrets.json` (Docker volume `mc_secrets`) and managed through the app's Settings → AI Providers page. They are NOT set globally in `.env`.

### Local `.env.local` — at `/Users/moe/Desktop/Mission Control Remake/.env.local`

See `.env.local.example` for the canonical list. Current dev values include the
JWT_SECRET, DATABASE_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI,
META_APP_ID, META_APP_SECRET, CRON_SECRET, STRIPE_ENABLED=false, and an optional
GEMINI_API_KEY fallback. Supabase has been fully removed from the stack — all
persistence is via self-hosted PostgreSQL through `DATABASE_URL`.

---

## 6. Database

| Item | Value |
|---|---|
| **Engine** | PostgreSQL 16 (Docker container `mc_db`) |
| **Database name** | `mission_control` |
| **DB user** | `mc_user` |
| **DB password** | `OXtygjiN1xkZZKv9xJGRcsIT4gO6LYrOY0XpaDKk` |
| **Connection (inside Docker)** | `postgresql://mc_user:<password>@db:5432/mission_control` |
| **Connection (from VPS host)** | `postgresql://mc_user:<password>@localhost:5432/mission_control` |
| **Schema file** | `docker/init.sql` — applied automatically on first container start |
| **Migrations folder** | `docker/migrations/` — apply manually after deploy with the helper below |

### Run a DB migration
```bash
scp -i ~/.ssh/contentforge_deploy "docker/migrations/YOUR_MIGRATION.sql" root@72.62.33.12:/tmp/
ssh -i ~/.ssh/contentforge_deploy root@72.62.33.12 \
  "docker compose -f /opt/mission-control/docker-compose.yml exec -T db psql -U mc_user -d mission_control < /tmp/YOUR_MIGRATION.sql"
```

### Open a DB shell
```bash
ssh -i ~/.ssh/contentforge_deploy root@72.62.33.12 \
  "docker compose -f /opt/mission-control/docker-compose.yml exec db psql -U mc_user -d mission_control"
```

---

## 7. Super Admin Account

| Item | Value |
|---|---|
| **Email** | `moeabuadas@googlemail.com` |
| **Role** | `super_admin` (set by `SUPER_ADMIN_EMAIL` env var) |
| **Admin page** | `/admin/tenants` — view all tenants, users, plans |

---

## 8. How Code Changes Work — End-to-End Workflow

This is the exact sequence used for every fix or feature:

```
1. Edit files  →  /Users/moe/Desktop/Mission Control Remake  (local Mac folder)
2. TypeScript check  →  run in sandbox: npm run build --no-emit (or tsc --noEmit)
3. Commit  →  git add -A && git commit -m "Fix #XX: description"
4. Push  →  git push origin main  (uses Mac's stored GitHub credentials)
5. VPS pull  →  ssh root@72.62.33.12 "cd /opt/mission-control && git pull"
6. Docker build  →  docker compose build app
7. Restart  →  docker compose up -d app
8. Update ARCHITECTURE.md  →  document what changed, commit + push again
```

### How the AI agent (me) executes this

- **File edits:** I use the `Read`, `Edit`, and `Write` tools directly on the local Mac folder. I never touch VPS files directly.
- **TypeScript check:** I run `tsc --noEmit` or `npm run build` in the sandbox (`mcp__workspace__bash`) against the local folder.
- **Git commit:** I use `mcp__workspace__bash` with the sandbox path.
- **Git push:** The sandbox can't authenticate to GitHub, so I use `mcp__Desktop_Commander__start_process` to run the push on the actual Mac (which has stored credentials).
- **VPS deploy:** I SSH from the Mac via `mcp__Desktop_Commander__start_process` using the `contentforge_deploy` SSH key.
- **Long builds:** Docker builds take 2–5 minutes. I fire them with `nohup ... &` in the background and poll `/tmp/build.log` to check progress.

---

## 9. Multi-Tenant Architecture

The app is a full multi-tenant SaaS. Every user belongs to a **tenant** (agency).

- Registration at `/register` creates a user + tenant + free plan subscription automatically.
- All DB queries are scoped by `agency_id` (= `tenantId` in JWT).
- Plans: `free` (3 agents), `starter` (10 agents / $49), `growth` (25 / $99), `enterprise` (unlimited / $299).
- Billing is Stripe-ready but not wired — the subscription routes exist at `/api/billing/*`.

---

## 10. AI Routing — How Iris Classifies Requests

This is the most complex part of the app. Understanding it prevents the biggest class of bugs.

```
User message
    ↓
inferDeliverableType()  (src/lib/intents/intent-classifier.ts)
    — score-based: each deliverable type has patterns, priorities, dampers
    — early-return guards: social post patterns → always 'campaign-copy'
    ↓
deliverableType  (e.g. 'campaign-copy', 'content-strategy', 'creative-asset')
    ↓
executeAutonomousTask()  (src/lib/server/autonomous-task.ts)
    — 'creative-asset'  → executeCreativeAssetTask()  [only for image/visual briefs]
    — 'content-calendar' → executeAutomatedContentCalendar()
    — everything else   → general agent path
    ↓
task-output.ts  formats the result
    — campaign-copy + isSimpleSocialPost → clean 4-section format (Objective / Post Copy / CTA / Hashtags)
    — creative-asset → 12-section Creative Asset Production Pack
```

**Critical rule:** `executeCreativeAssetTask` must NEVER be called for text-only social post requests. Fix #91 (commit `71c70c9`) added three layers of protection against this.

---

## 11. Docker Volumes (Persistent Data)

| Volume | Contents |
|---|---|
| `mc_db_data` | PostgreSQL data |
| `mc_uploads` | Uploaded files (agent photos, client brand assets) → `/app/public/uploads` |
| `mc_secrets` | Per-user AI provider keys → `/app/data/provider-secrets.json` |

---

## 12. Current Status (as of 2026-05-15)

- **Latest commit:** `18cacf5` — Update ARCHITECTURE.md — Fix #90 + Fix #91 documented
- **Live on VPS:** Yes — `mc_app` running, port 3000
- **Open tasks:**
  - 🔲 **Task #84** — Fix Create Client: validate + force-persist after `addClient`
- **Recent fixes:**
  - ✅ Fix #91 — Instagram/social post requests no longer route to creative-asset engine
  - ✅ Fix #90 — `maxTokens` is now optional throughout; providers use model defaults
  - ✅ Fix #89b — Client brief parser raises token limit, adds partial JSON recovery

---

## 13. How to Run Locally

```bash
cd "/Users/moe/Desktop/Mission Control Remake"
npm install
npm run dev
# App at http://localhost:3000
```

You'll need a local Postgres instance or a tunnel to the VPS DB. Set `DATABASE_URL` in `.env.local` accordingly.

---

## 14. Full Architecture Reference

See `ARCHITECTURE.md` in the project root — it is updated after every code change and is the authoritative source of truth for all pages, components, API routes, DB schema, and design decisions.

---

*This guide was generated on 2026-05-15 and reflects the current live state of the application.*
