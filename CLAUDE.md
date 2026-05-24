# CLAUDE.md — Operational Map for AI Assistants

> Read this first, every session. It exists to keep me from re-archaeology-ing the
> codebase before every change. Cite file paths + line numbers from this map when
> reasoning about changes — don't trust memory, trust the code.
>
> Sibling docs: `ARCHITECTURE.md` (human-oriented), `AGENTS.md` (agent registry
> detail), `FIX_LOG.md` (historical bug log), `SPEC.md`, `DOCKER_DEPLOY.md`.

---

## 1. Stack

- **Next.js 16.2.4** (standalone Docker build), **React 19.2**, **TypeScript 5.9** strict.
- **Postgres 16** via `postgres@3.4.5` (tagged-template SQL — `db\`SELECT … WHERE x = ${val}\``).
- **Tailwind 3.4** + custom components in `src/components/`.
- **Zustand 4.5** stores in `src/lib/store/*` (mirror server state).
- **Auth**: JOSE-signed JWT in `Authorization: Bearer <token>` header. **No cookies yet** (Batch P pending — biggest remaining Tier-1 blocker).
- **AI providers**: anthropic, openai, gemini, ollama, higgsfield (visual), meta-ads. Per-tenant verified keys in `provider_secrets` (encrypted at rest, see `secret-crypto.ts`).
- **Tests**: Vitest. `npm run typecheck`, `npm run test`, `npm run lint`.

## 2. Repo layout

```
src/
  app/                       Next App Router pages + API routes
    api/<area>/route.ts      All HTTP endpoints
  components/                React UI
  config/agents/generated.ts All 10 agent templates (atlas, dex, echo, finn,
                             iris, lyra, maya, nova, piper, sage) — the source
                             of truth for cloning into tenants
  lib/
    auth/server.ts           AuthContext + JWT verification
    db/
      client.ts              postgres.js singleton (getDb())
      relational-sync.ts     app_state JSONB → relational tables sync
    intents/                 intent-classifier (routes prompts → deliverable type)
    office-types.ts          Virtual office data model
    server/                  ALL server-only business logic (engines, runners)
    store/                   Zustand stores (client state)
    types.ts                 DeliverableType, AIProvider, AgentModel
  middleware.ts              Edge middleware: CSP, HSTS, X-Frame-Options
docker/
  nginx-mission-control.conf nginx server block on the VPS (TLS termination)
  init.sql                   Initial schema (read on container first-boot)
docker-compose.yml           db + app (host nginx is OUT of compose, on VPS)
scripts/                     Migration + utility scripts
```

## 3. Multi-tenant model

Everything is keyed by `agency_id uuid` (also called "tenant"). The chain is:

- `users(id uuid)` ── `tenant_memberships` → `agencies(id uuid, slug)`
- `agents(id text, agency_id uuid)` — `id` is a GLOBAL primary key
- `tasks`, `clients`, `pipelines`, `outputs`, `task_runs`, `task_events`, `workflow_instances`, `office_layouts`, `provider_secrets`, `audit_events` — ALL include `agency_id`.

### Agent id conventions (the trap that caused Batch GG)

`agents.id` is namespaced two ways depending on history:

1. **Legacy single-tenant rows**: `id = 'maya'` (just the template id). The very first agency the system ever had.
2. **New tenant clones**: `id = '<template>-<short-uuid>'`, e.g. `'maya-a8f3c1d2'`, with `metadata.templateId = 'maya'`.

Use `findAgentByTemplate(agents, 'maya')` from `src/lib/server/agent-templates.ts:92` — it handles BOTH. **NEVER** check `agent.id === 'maya'` directly in engine code.

**Iterator gotcha** — `findAgentByTemplate` accepts `Iterable<T>` but internally does **three passes** (metadata match, literal id, prefix). It materialises to an Array at line ~98 (Batch GG). If you write a similar helper, always materialise iterables before multi-pass iteration.

### Agent template registry

`src/config/agents/generated.ts` exports `AGENT_ARCHITECTURE_BUNDLES` — 10 templates:

| Template | Specialty                       | Notes |
|----------|---------------------------------|-------|
| `iris`   | Orchestrator                    | The default lead / fallback (`isOrchestratorAgent`). Every pipeline can degrade to iris. |
| `maya`   | Strategy / content planning     | Required by content-calendar engine. |
| `echo`   | Copy drafting                   | Required by creative-asset + content-calendar. |
| `nova`   | Channel / distribution planning | Required by content-calendar. |
| `lyra`   | Visual brief / art direction    | Required by creative-asset + content-calendar. |
| `finn`   | Creative concept                | Required by creative-asset. |
| `atlas`  | Research                        | |
| `dex`    | KPIs / measurement              | |
| `piper`  | Timeline / project ops          | |
| `sage`   | Client narrative                | |

## 4. The execution surface — request → output

The path that fails most often. Memorise this. Each arrow is one function boundary.

```
POST /api/tasks/<id>/execution       src/app/api/tasks/[id]/execution/route.ts
  └─ runTaskExecution(taskId, auth)  src/lib/server/task-execution.ts:463
       ├─ resolveAgencyId(auth)              line 41   (tenantId > slug='default-agency' > first agency with agents)
       ├─ load task, agents, agency, pipelines, skills    line 488
       ├─ runtimeAgents = agents.map(...)    line 533   ⚠ does NOT carry agent.metadata into runtime shape
       ├─ buildTaskChannelingPlan            line 545
       ├─ buildProgressPlan
       ├─ load office_layouts row (JSONB)   line 645   ⚠ Batch FF: defensively JSON.parse if string
       ├─ buildOfficeContextForAgent(...)    line 675   (per-agent system-prompt prefix)
       └─ executeAutonomousTask({agents: runtimeAgents, ...})    line 681
              src/lib/server/autonomous-task.ts:868
            ├─ agentMap = new Map(input.agents.map(a => [a.id, a]))   line 910
            └─ dispatch by deliverableType:
                 if (input.deliverableType === 'creative-asset' && !isSocialPostRequest)
                   → executeCreativeAssetTask(...)        creative-asset-engine.ts
                 if (input.deliverableType === 'content-calendar')
                   → executeAutomatedContentCalendar(...) content-calendar-engine.ts
                 else
                   → runPipelineExecution(...) line 734    (generic pipeline runner for everything else)
```

Each engine validates required template agents at its top:

- **content-calendar-engine.ts:1048** requires `maya`, `echo`, `nova`, `lyra`, `iris`. Throws `'Required specialist agents are not available for content-calendar automation.'` if any are missing.
- **creative-asset-engine.ts:334** requires `finn`, `echo`, `lyra`, `iris`. Throws the parallel error.

When debugging "Required specialist agents are not available":
1. Confirm the task's `agency_id` matches the agents' `agency_id` (`SELECT agency_id FROM tasks WHERE id=...; SELECT id, agency_id FROM agents WHERE agency_id=...`).
2. Confirm `findAgentByTemplate(runtimeAgents, '<template>')` returns a hit for each required template.
3. If both look fine but the gate still fires, suspect a multi-pass iterator drain (Batch GG).

## 5. Office layout (the data shape that caused Batch FF)

`office_layouts.layout` is a **jsonb** column. Its TypeScript shape is `OfficeLayout` in `src/lib/office-types.ts`:

```ts
{ version: number, tiles: PlacedTile[], zones: OfficeZone[], org?: OfficeOrgStructure, ... }
```

### JSONB write pattern (rule, not suggestion)

**Always** write objects directly through postgres.js — DO NOT `JSON.stringify` first:

```ts
// ✅ CORRECT
await db`INSERT INTO office_layouts (agency_id, layout) VALUES (${id}, ${db.json(layout)})`
// or
await db`INSERT INTO office_layouts (agency_id, layout) VALUES (${id}, ${layout})`

// ❌ WRONG — stores a JSON-encoded string, comes back as string on read
await db`INSERT INTO office_layouts (layout) VALUES (${JSON.stringify(layout)})`
```

Why this matters: a `JSON.stringify`-into-jsonb stores a *quoted JSON string*, which postgres.js returns as a JS string on read. Code that does `layout.tiles.find(...)` then throws "Cannot read properties of undefined (reading 'find')". See `src/app/api/office-layout/route.ts:71` for the canonical pattern.

If you suspect a jsonb column was written wrong, repair with:

```sql
UPDATE <table> SET <col> = (<col> #>> '{}')::jsonb WHERE jsonb_typeof(<col>) = 'string';
```

`task-execution.ts:646-670` carries defensive parse + `Array.isArray` guards on `tiles` and `zones` because legacy rows existed in prod. Keep those defensive checks in place even after the write-side fix.

## 6. Auth, secrets, security

### AuthContext

`src/lib/auth/server.ts:26` — `resolveAuthContextFromToken(token)` returns `{ userId, tenantId, role: 'super_admin' | 'admin' | 'member', email }` or null.

Every API route MUST call this with the bearer token from `Authorization: Bearer <token>`. Pattern:

```ts
const auth = await resolveAuthContextFromToken(getBearerToken(req))
if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```

### Super admin escape hatch

`SUPER_ADMIN_EMAIL` env var. If a user's email matches (case-insensitive), they:
- Bypass the `email_verified_at` login gate (Batch DD — `src/app/api/auth/session/route.ts`)
- Get auto-verified on register (`src/app/api/auth/register/route.ts`)
- Can read any tenant's tasks (Batch V)

### Encrypted-at-rest secrets

`PROVIDER_SECRETS_MASTER_KEY` (32-byte base64 or hex) wraps the provider-secrets file with AES-256-GCM. Envelope shape: `{ v: 1, alg: 'aes-256-gcm', iv, tag, ciphertext }`. See `src/lib/server/secret-crypto.ts`. The migration script lives at `scripts/encrypt-provider-secrets.js` (idempotent — skips if already envelope shape).

### Security headers

Edge middleware in `src/middleware.ts` sets CSP, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy. HSTS only when `x-forwarded-proto=https` so dev (http) still works.

### HTML sanitization

Anywhere we render `task.executionPlan`, artifact HTML, or any LLM-produced HTML: route it through `sanitizeHtml(rawHtml)` from `src/lib/html-sanitizer.ts`. Don't write inline DOMPurify configs — use the shared one.

### Bearer tokens in `<img>` URLs

`<img>` can't send `Authorization` headers. Photo routes accept `?token=<jwt>` query as a fallback. Helper: `withAuthToken(url)` in `src/components/agents/AgentBot.tsx` (Batch Y). Use this pattern for any auth-required asset that's rendered as `<img src=...>`.

## 7. relational-sync upsert pattern (the gotcha from Batch Z)

`src/lib/db/relational-sync.ts` has an `upsert(table, rows, conflictCol)` helper that mirrors `app_state` JSONB into proper relational tables. The naive `db.unsafe(\`INSERT INTO "${t}" ${db(rows).toString()}\`)` renders as `[object Object]` and SILENTLY fails (caught with "non-fatal" log). When user edits revert mysteriously, suspect this helper.

The current implementation does per-row `INSERT … VALUES ($1, $2, …) ON CONFLICT …` with `JSON.stringify` on object values (jsonb columns) before binding. If you add a new field to a synced table, verify the column is in the upsert call's column list AND that object values still get stringified.

## 8. Deploy workflow (production)

Production = single VPS at **72.62.33.12**. Stack: host-level nginx → Docker (`mc_app` container) → Docker (`mc_db` container).

### Deploy a code change

```bash
# 1. From local Mac
cd "/Users/moe/Desktop/Mission Control Remake"
git add -A && git commit -m "..."  &&  git push origin main

# 2. On VPS
ssh -i /Users/moe/.ssh/contentforge_deploy root@72.62.33.12
cd /opt/mission-control
git pull origin main
docker compose build app --no-cache    # ~4 min
docker compose up -d app
docker compose logs --tail 30 app      # should see "✓ Ready in 0ms"
```

### Run DB queries

```bash
ssh -i /Users/moe/.ssh/contentforge_deploy root@72.62.33.12 \
  "docker compose -f /opt/mission-control/docker-compose.yml exec -T db \
   psql -U mc_user -d mission_control -c '<sql>'"
```

### TLS

nginx host config: `docker/nginx-mission-control.conf` (template) → deployed at `/etc/nginx/sites-enabled/mission-control`. Self-signed cert `/etc/nginx/ssl/mission-control.{crt,key}` valid 10 years, IP SAN for 72.62.33.12. HSTS in nginx config is commented until a real domain + Let's Encrypt is in place.

### Env vars (the canonical list lives in `docker-compose.yml`)

Critical ones to remember when debugging:

- `DATABASE_URL`, `JWT_SECRET`, `SUPER_ADMIN_EMAIL`
- `NEXT_PUBLIC_APP_URL` (set to https://72.62.33.12 in prod)
- `OLLAMA_BASE_URL` (defaults to `host.docker.internal:11434` so the container reaches the host's Ollama)
- `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_CLIENT_ID/SECRET`, `META_APP_ID/SECRET`
- `PROVIDER_SECRETS_MASTER_KEY` — REQUIRED, breaks all provider-secret reads if missing/changed
- `CRON_SECRET` — used by `src/lib/server/rate-limit.ts` and cron-style endpoints
- `RESEND_API_KEY`, `EMAIL_FROM` — transactional email
- `STRIPE_*` — off by default (`STRIPE_ENABLED=false`)

## 9. Known invariants & gotchas

Pin these in your head. Each one has bitten us.

| # | Invariant | Reference |
|---|-----------|-----------|
| 1 | `jsonb` columns receive raw objects via postgres.js, NEVER `JSON.stringify`. | §5, FF |
| 2 | Multi-pass iteration over `Iterable<T>` requires `Array.from` first. | §3, GG |
| 3 | `agents.id` is global and may be legacy literal OR `<template>-<suffix>`. Use `findAgentByTemplate`. | §3 |
| 4 | Engines require a fixed set of template agents. Always go through `findAgentByTemplate`, never literal id checks. | §4 |
| 5 | `runtimeAgents` shape in `task-execution.ts:533` does NOT carry `metadata`. If you need `metadata.templateId`, fetch it from `agentRows`, not `runtimeAgents`. | §4 |
| 6 | LLM-produced HTML (task outputs, artifacts) MUST go through `sanitizeHtml`. | §6 |
| 7 | `<img>` tags can't send Authorization headers — use `?token=` query fallback. | §6, Y |
| 8 | `provider_secrets` are AES-256-GCM envelopes. Reading them requires `PROVIDER_SECRETS_MASTER_KEY`. Lose the key → lose all secrets. Migration script is idempotent. | §6, EE |
| 9 | `super_admin` is determined by `email === SUPER_ADMIN_EMAIL`, not by a DB column. Don't add a DB column for it. | §6, DD |
| 10 | nginx on the VPS already owns 80/443 for other services. Don't add a reverse-proxy container to the compose stack. | §8, BB |
| 11 | `tasks` table has NO `error_message` column. Errors live in `task_runs.error_message` (stage='task-execution', status='failed'). | §4 |
| 12 | The `relational-sync` upsert helper has a history of silently swallowing errors. If saves appear to revert, check `[app-state] relational sync failed (non-fatal)` lines in app logs. | §7, Z |
| 13 | `Iris` is the orchestrator and the universal fallback. Every engine should degrade to iris if its specialist is missing — that's why the gate uses `||` chains before throwing. | §3, §4 |
| 14 | Standalone Next.js Docker build STRIPS `node_modules`. `bcryptjs` is bundled (so login works), but ad-hoc `node -e "require('bcryptjs')"` inside the container fails. Use the host's Python `bcrypt` for ad-hoc password hashing. | §8 |

## 10. Verification routine — what "done" means

A code change isn't done until ALL of these pass:

1. `npm run typecheck` → exit 0
2. `npm run test` → all green (when touching anything tested)
3. Read the call sites of the function you changed. If your change affects the signature, semantics, or invariants, trace at LEAST one level deeper into every caller.
4. **Pipeline changes** specifically: trace the dispatch path through `autonomous-task.ts` → engine → required-agent gate. The engine throw at `content-calendar-engine.ts:1049` and `creative-asset-engine.ts:335` are silent landmines if you only test "container starts."
5. Deploy → `docker compose ps app` shows `Up` + healthy. `docker compose logs --tail 30 app` shows `Ready in 0ms`.
6. Smoke test the actual user flow (run an actual task end-to-end against the dev DB or via a curl probe). "Container starts" ≠ "feature works."

For multi-step debug sessions, write a DB query that confirms the desired state, not just the container state.

## 11. Pending Tier-1 launch blockers (live state)

- **Batch P**: JWT httpOnly cookies + CSRF. Biggest remaining. Bearer-in-JS is XSS-exposed today.
- **Batch L**: Backup volume rotation + staging env.

## 12. Tier-2 follow-ups

- `audit_events` table is created but few endpoints write to it. Wire up auth events, admin actions, secret reads.
- `/api/health` endpoint for nginx + monitor.
- Structured logging (currently `console.log` with ad-hoc prefixes).
- Postgres pool size: default 10. Bump to 30 once concurrent task runs stabilise.
- Sentry / error reporting.

## 13. Documentation index

- `CLAUDE.md` (this file) — operational map for AI assistants
- `ARCHITECTURE.md` — human-oriented architecture overview
- `AGENTS.md` — agent template catalog detail
- `FIX_LOG.md` — chronological bug + fix log (the source of "Batch X did Y")
- `DOCKER_DEPLOY.md` — Docker deployment runbook
- `HOSTINGER_DEPLOY.md` — VPS-specific notes
- `TESTING.md` — test strategy
- `SPEC.md` — product spec
- `AUDIT_REPORT.md` / `RECOMMENDATIONS.md` — historical dev-team audits
