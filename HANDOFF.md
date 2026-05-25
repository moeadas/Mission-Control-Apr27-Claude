# Mission Control — Handoff Document

> Standalone briefing for an AI agent picking up this project cold.
> Read this top-to-bottom on day one. Cross-reference with `CLAUDE.md`
> (operational map), `ARCHITECTURE.md`, `AGENTS.md`, `FIX_LOG.md`.

---

## 1. What Mission Control is

A multi-tenant AI agency SaaS. Each "agency" (tenant) gets a roster of 10 specialised AI agent personas (`atlas`, `dex`, `echo`, `finn`, `iris`, `lyra`, `maya`, `nova`, `piper`, `sage`) that collaborate on marketing deliverables: content calendars, creative assets, campaign copy, email sequences, etc. An orchestrator agent (`iris`) routes prompts to pipelines and stitches output.

Production runs on **one VPS** at `72.62.33.12` (Hostinger). Single-instance Docker Compose stack: `mc_app` (Next.js) + `mc_db` (Postgres 16). Host-level nginx terminates TLS and reverse-proxies. The system is pre-launch — Tier-1 hardening just completed (Batches AA through P).

The platform owner is **Mohammed Abu-Adas** (moeabuadas@googlemail.com). He is the production super-admin (matched via `SUPER_ADMIN_EMAIL` env var). His primary live client is **Victory Genomics**, an equine DNA testing company (Arabian horse breed focus).

## 2. What you need to ask Mohammed for

You can't proceed without these — request them on day one:

1. **SSH private key** for the VPS. The key file lives at `/Users/moe/.ssh/contentforge_deploy` on Mohammed's Mac. You'll need the file content or your own public key added to `/root/.ssh/authorized_keys` on the VPS.
2. **GitHub repo access** — `github.com/moeadas/Mission-Control-Apr27-Claude`. You either need write access on your own account or a deploy token.
3. **`.env` values from prod** — they're on the VPS at `/opt/mission-control/.env`. The most important ones (you'll need them whenever you change cryptographic behavior):
   - `JWT_SECRET` (≥32 chars)
   - `PROVIDER_SECRETS_MASTER_KEY` (32-byte base64 or hex) — **losing this bricks every tenant's provider secrets**
   - `DB_PASSWORD`, `DATABASE_URL`
   - `SUPER_ADMIN_EMAIL`
   - `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_CLIENT_ID/SECRET`, `META_APP_ID/SECRET`
   - `CRON_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`
4. **The super-admin's app password** (only if you need to log into the UI as Mohammed). Otherwise you can reset it directly in the DB (see §6).

## 3. Quick access reference

```bash
# Repo (local on Mohammed's Mac)
/Users/moe/Desktop/Mission Control Remake

# GitHub
git clone git@github.com:moeadas/Mission-Control-Apr27-Claude.git

# Production
ssh -i /Users/moe/.ssh/contentforge_deploy root@72.62.33.12
cd /opt/mission-control

# Production DB shell
ssh -i /Users/moe/.ssh/contentforge_deploy root@72.62.33.12 \
  "docker compose -f /opt/mission-control/docker-compose.yml exec -T db \
   psql -U mc_user -d mission_control"

# Tail app logs
ssh -i /Users/moe/.ssh/contentforge_deploy root@72.62.33.12 \
  "docker compose -f /opt/mission-control/docker-compose.yml logs --tail 100 app"

# Public URL
https://72.62.33.12     # self-signed cert with IP SAN; browser warning expected
```

**Critical tenant ID** (Mohammed's own agency, source of truth for all his data):
```
agency_id = a0934430-5f1a-4668-b449-095837d526ac
```

## 4. Local development

```bash
git clone git@github.com:moeadas/Mission-Control-Apr27-Claude.git
cd Mission-Control-Apr27-Claude
npm install
cp .env.example .env   # or grab a redacted .env from Mohammed
npm run dev            # localhost:3000

# Type-check and tests
npm run typecheck
npm run test           # vitest
npm run lint
```

Node `>=20 <23` required. The standalone Docker build (used in prod) strips `node_modules` so anything depending on `require('bcryptjs')` from a shell session must use the host-installed Python `bcrypt` instead — see CLAUDE.md §9 invariant 14.

## 5. Stack at a glance

| Layer | What | Where |
|---|---|---|
| Runtime | Next.js 16.2.4 + React 19.2 + TypeScript 5.9 (strict) | `next.config.mjs`, `tsconfig.json` |
| UI | Tailwind 3.4 + Zustand 4.5 stores | `src/components/`, `src/lib/stores/` |
| DB | Postgres 16 via `postgres@3.4.5` (tagged-template SQL) | `src/lib/db/client.ts` (singleton via `getDb()`) |
| Auth | JOSE JWT in httpOnly cookie OR bearer header (cookie wins) | `src/lib/auth/{server,browser,jwt}.ts` |
| AI providers | anthropic, openai, gemini, ollama, higgsfield, meta-ads | `src/lib/server/ai.ts`, `src/lib/server/provider-secrets.ts` |
| Tests | Vitest | `tests/`, `npm run test` |
| Edge | CSP, HSTS, X-Frame-Options, nosniff, Permissions-Policy | `src/middleware.ts` |
| TLS | Host nginx + self-signed cert (10y, IP SAN) | `docker/nginx-mission-control.conf` |
| Container | `mc_app` + `mc_db` | `docker-compose.yml`, `Dockerfile` |

## 6. Production database — what you'll actually do

The DB schema is large; you'll mostly grep for table names rather than memorise. Key tables:

| Table | Purpose |
|---|---|
| `users`, `profiles` | Account credentials + per-user profile (role, tenant link) |
| `agencies` | Tenants (slug, owner) |
| `tenant_memberships` | user ↔ agency links |
| `agents` | Per-tenant agent rows. `id` is GLOBAL (text), often `<template>-<suffix>` or legacy literal `'maya'` |
| `tasks` | Each user request becomes a task row. `agency_id` ties it to a tenant. **NO `error_message` column** — errors live in `task_runs.error_message` |
| `task_runs` | Per-stage execution records. `error_message text`. **NO `progress` column** — progress lives in `task_events` |
| `task_events` | Append-only progress + activity trail (server-sent to the UI via SSE) |
| `workflow_instances` | Higher-level pipeline state |
| `outputs` | Materialised artifacts (rendered HTML, files, etc.) |
| `clients`, `knowledge_assets` | Per-tenant client + uploaded brand assets |
| `pipelines`, `skills`, `skill_categories` | Per-tenant pipeline definitions + reusable skill library |
| `office_layouts` | One row per tenant. `layout` is jsonb — see §10 |
| `provider_secrets` | Per-tenant API key storage. **Encrypted at rest** with AES-256-GCM (envelope shape `{v:1,alg:'aes-256-gcm',iv,tag,ciphertext}`). Key = `PROVIDER_SECRETS_MASTER_KEY` env var |
| `audit_events` | Audit trail (sparsely written today — see open items in §14) |

Reset a user's password directly in DB:
```bash
# Hash the password with Python bcrypt on the VPS host (NOT in the
# Docker container — standalone Next.js build strips node_modules so
# `node -e "require('bcryptjs')"` fails inside the container).
ssh -i ~/.ssh/contentforge_deploy root@72.62.33.12
python3 -c "import bcrypt; print(bcrypt.hashpw(b'NEW_PASSWORD', bcrypt.gensalt(12)).decode())"
# Take the output hash and update:
docker compose -f /opt/mission-control/docker-compose.yml exec -T db \
  psql -U mc_user -d mission_control -c \
  "UPDATE users SET password_hash = '\$2a\$12\$...' WHERE email = 'foo@bar.com';"
```

## 7. Repo layout

```
src/
  app/                       Next App Router
    api/<area>/route.ts      All HTTP endpoints (~60 routes)
    <page>/page.tsx          UI pages
  components/                React UI (Tailwind)
  config/agents/generated.ts AGENT_ARCHITECTURE_BUNDLES — 10 agent templates
  lib/
    auth/                    server.ts (auth context + cookie helpers + bearer fallback)
                             browser.ts (sentinel-based session marker, post-P.3)
                             jwt.ts (jose HS256)
    db/
      client.ts              getDb() singleton (postgres.js)
      relational-sync.ts     app_state JSONB → relational tables sync (history of silent failures — see §11)
    intents/                 intent-classifier (prompt → DeliverableType)
    office-types.ts          OfficeLayout shape (jsonb)
    server/                  ALL server-only business logic
      autonomous-task.ts     Pipeline dispatcher
      task-execution.ts      runTaskExecution — top-level runner
      content-calendar-engine.ts   Pipeline for content-calendar deliverables
      creative-asset-engine.ts     Pipeline for creative-asset deliverables
      agent-templates.ts     findAgentByTemplate, isOrchestratorAgent, etc.
      task-channeling.ts, task-progress.ts, task-events.ts   Progress/event plumbing
      secret-crypto.ts       AES-256-GCM envelope crypto
      provider-secrets.ts    Per-tenant key storage
    stores/                  Zustand client stores
    html-sanitizer.ts        Shared DOMPurify config
    types.ts                 DeliverableType, AIProvider, AgentModel
  middleware.ts              Edge middleware (CSP, HSTS, X-Frame-Options)

docker/
  nginx-mission-control.conf  Host nginx config template (deployed to /etc/nginx/sites-enabled/mission-control)
  init.sql                    First-boot schema

scripts/
  migrate-auth-to-cookie-aware.js   Batch P.2 codemod (idempotent, re-runnable)
  encrypt-provider-secrets.js       Batch EE migration (idempotent)
  seed-admin.mjs                    Bootstrap super-admin
  import-mission-control-skills.js  Bulk skill import
  generate-agent-architecture.js    Regenerates src/config/agents/generated.ts
```

## 8. Multi-tenant model

Everything is keyed by `agency_id uuid`.

Chain: `users(id uuid)` ── `tenant_memberships` → `agencies(id uuid, slug)`. Every per-tenant row carries `agency_id`. The super-admin (`email === SUPER_ADMIN_EMAIL`) can read across tenants — see `task-execution.ts:501`.

### Agent ID conventions (Batch GG trap)

`agents.id` is a global text primary key with **two namespacings**:

1. **Legacy single-tenant rows**: `id = 'maya'` (just the template id). The very first agency the system ever had — Mohammed's own agency `a0934430-5f1a-4668-b449-095837d526ac` uses these.
2. **New tenant clones**: `id = '<template>-<short-uuid>'`, e.g. `'maya-a8f3c1d2'`, with `metadata.templateId = 'maya'`.

**ALWAYS** use `findAgentByTemplate(agents, 'maya')` from `src/lib/server/agent-templates.ts:92`. NEVER write `agent.id === 'maya'` in engine code.

⚠️ `findAgentByTemplate` accepts `Iterable<T>` and does three passes (metadata match, literal id, prefix). Callers commonly pass `Map.values()` which is single-use. Batch GG fixed an iterator-drain bug — it now materialises to Array first. If you write similar helpers, **materialise iterables before multi-pass iteration**.

### The 10 agent templates

| Template | Specialty | Required by |
|---|---|---|
| `iris` | Orchestrator | Universal fallback for every engine |
| `maya` | Strategy / content planning | content-calendar |
| `echo` | Copy drafting | creative-asset + content-calendar |
| `nova` | Channel / distribution planning | content-calendar |
| `lyra` | Visual brief / art direction | creative-asset + content-calendar |
| `finn` | Creative concept | creative-asset |
| `atlas` | Research | — |
| `dex` | KPIs / measurement | — |
| `piper` | Timeline / project ops | — |
| `sage` | Client narrative | — |

## 9. The execution surface (memorise this)

```
POST /api/tasks/<id>/execution                   src/app/api/tasks/[id]/execution/route.ts
  └─ runTaskExecution(taskId, auth)              src/lib/server/task-execution.ts:463
       ├─ resolveAgencyId(auth)                  line 41   (tenantId → slug='default-agency' → first agency with agents)
       ├─ load task, agents, agency, pipelines, skills    line 488
       ├─ runtimeAgents = agents.map(...)        line 533   ⚠ does NOT carry agent.metadata
       ├─ buildTaskChannelingPlan, buildProgressPlan      line 545+
       ├─ load office_layouts row (jsonb)        line 645   ⚠ defensively JSON.parse if string (Batch FF)
       ├─ buildOfficeContextForAgent(...)        line 675   (per-agent system-prompt prefix)
       └─ executeAutonomousTask({...})           line 681
              src/lib/server/autonomous-task.ts:868
            ├─ agentMap = new Map(input.agents...)        line 910
            └─ dispatch by deliverableType:
                 'creative-asset' (non-social) → executeCreativeAssetTask    creative-asset-engine.ts
                 'content-calendar'            → executeAutomatedContentCalendar  content-calendar-engine.ts
                 else                          → runPipelineExecution           line 734 (generic)
```

**Engine specialist gates** — each engine throws if required template agents are missing:
- `content-calendar-engine.ts:1048` requires `maya`, `echo`, `nova`, `lyra`, `iris`. Error string: `'Required specialist agents are not available for content-calendar automation.'`
- `creative-asset-engine.ts:334` requires `finn`, `echo`, `lyra`, `iris`. Parallel error.

When this gate fires:
1. `SELECT agency_id FROM tasks WHERE id=...` vs `SELECT id, agency_id FROM agents WHERE agency_id=...` — confirm the task's agency matches the agents'.
2. `findAgentByTemplate(runtimeAgents, '<template>')` should resolve for each required template.
3. If both look fine but the gate fires anyway, suspect an iterator drain (Batch GG class of bug).

## 10. Office layout (Batch FF trap)

`office_layouts.layout` is a jsonb column with TypeScript shape `OfficeLayout` (`src/lib/office-types.ts`):

```ts
{ version: number, tiles: PlacedTile[], zones: OfficeZone[], org?: OfficeOrgStructure, ... }
```

**Write rule** — always pass the raw object through postgres.js. NEVER `JSON.stringify` first:

```ts
// ✅ correct
await db`INSERT INTO office_layouts (agency_id, layout) VALUES (${id}, ${db.json(layout)})`
// or
await db`INSERT INTO office_layouts (agency_id, layout) VALUES (${id}, ${layout})`

// ❌ wrong — produces a JSON-encoded string, returned as JS string on read,
// crashes `layout.tiles.find(...)` with "Cannot read properties of undefined (reading 'find')"
await db`INSERT INTO office_layouts (layout) VALUES (${JSON.stringify(layout)})`
```

If you find a row that's double-encoded, repair with:
```sql
UPDATE <table> SET <col> = (<col> #>> '{}')::jsonb WHERE jsonb_typeof(<col>) = 'string';
```

`task-execution.ts:646-670` carries defensive parse + `Array.isArray` guards on `tiles` and `zones`. Keep them even after fixing the write side.

## 11. Auth — current state (post-Batch P)

Authentication uses a JOSE HS256 JWT that lives in an **httpOnly cookie** (`mc_session`, SameSite=Lax, 7-day Max-Age) PLUS a bearer-header fallback for legacy clients.

Server-side: `src/lib/auth/server.ts`
- `getAuthTokenFromRequest(req)` — reads cookie first, then `Authorization: Bearer` header; short-circuits the literal sentinel `'cookie-session'` (see below)
- `getAuthFromRequest(req)` — convenience: extract + resolve
- `resolveAuthContextFromToken(token)` — verifies and inflates to `AuthContext` (userId, tenantId, role, email, providerSettings)
- `setSessionCookie / clearSessionCookie` — write helpers used by login/logout

Every API route uses one of the above. The 58 routes were migrated by `scripts/migrate-auth-to-cookie-aware.js` — re-runnable for any new routes you add.

Client-side: `src/lib/auth/browser.ts`
- **NEVER stores the JWT in localStorage** (post-Batch P.3). The cookie is the source of truth.
- `getStoredToken()` returns a non-secret sentinel (`'cookie-session'`) when the user is logged in, so the ~50 legacy `if (!token) return` and `Authorization: Bearer ${token}` call sites keep working without modification. The server short-circuits the sentinel before it reaches `verifyToken`.
- `setStoredToken(jwt)` is now a no-op for the JWT — it just sets a non-secret marker so `getStoredToken()` returns truthy.
- `clearStoredToken()` clears the marker AND fires `POST /api/auth/logout` to clear the server cookie.

`SessionGate` (`src/components/auth/SessionGate.tsx`) is cookie-first: it unconditionally calls `/api/auth/session` and lets the server decide.

**Super-admin escape hatch** — `SUPER_ADMIN_EMAIL` env var match grants:
- Login bypass of email-verification gate (Batch DD)
- Auto-verification on register
- Read-across-tenants on tasks (Batch V)

⚠️ super_admin is determined by **env match**, not by a DB column. Don't add a DB column for it.

## 12. Security headers & secret encryption

**Edge middleware** (`src/middleware.ts`) sets CSP, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy. HSTS only when `x-forwarded-proto=https` (so dev http still works).

**HTML sanitization** — anywhere LLM-produced HTML lands in the UI (task outputs, artifacts, shared output pages), route it through `sanitizeHtml(rawHtml)` from `src/lib/html-sanitizer.ts`. Don't write inline DOMPurify configs.

**Provider secrets encryption** — `provider_secrets` rows store API keys wrapped with AES-256-GCM. Envelope shape:
```ts
{ v: 1, alg: 'aes-256-gcm', iv, tag, ciphertext }
```
See `src/lib/server/secret-crypto.ts`. The master key is `PROVIDER_SECRETS_MASTER_KEY` (32 bytes base64 or hex). **Losing this key bricks every tenant's provider secrets — it cannot be recovered.** The migration script `scripts/encrypt-provider-secrets.js` is idempotent.

**`<img>` with auth** — tags can't send Authorization headers. Image/file routes accept `?token=<jwt>` as a query fallback. The cookie ALSO travels automatically with `<img>` requests because of SameSite=Lax + same-origin. Helper: `withAuthToken(url)` in `src/components/agents/AgentBot.tsx`.

## 13. Deploy workflow

Production = ONE VPS at `72.62.33.12`. Stack: host nginx → Docker `mc_app` (:3000) → Docker `mc_db`.

### Deploy a change

```bash
# 1. From local Mac
cd "/Users/moe/Desktop/Mission Control Remake"
git add -A && git commit -m "..."  &&  git push origin main

# 2. On VPS
ssh -i /Users/moe/.ssh/contentforge_deploy root@72.62.33.12
cd /opt/mission-control
git pull origin main
docker compose build app --no-cache    # ~3-5 min
docker compose up -d app
docker compose logs --tail 30 app      # expect "✓ Ready in 0ms"
```

### Smoke probes after deploy

```bash
# Public + redirect
curl -s  -o /dev/null -w "http=%{http_code}\n"   http://72.62.33.12/
curl -sk -o /dev/null -w "https=%{http_code}\n" https://72.62.33.12/
# Protected (expect 401)
curl -sk -o /dev/null -w "%{http_code}\n" https://72.62.33.12/api/office-layout
# Logout endpoint sets a clear-cookie
curl -sk -X POST -i https://72.62.33.12/api/auth/logout | grep -i set-cookie
```

### TLS

`docker/nginx-mission-control.conf` (template) is deployed at `/etc/nginx/sites-enabled/mission-control`. Self-signed cert at `/etc/nginx/ssl/mission-control.{crt,key}` valid 10 years, IP SAN for `72.62.33.12`. HSTS commented until a real domain + Let's Encrypt is in place. **nginx on the VPS already owns 80/443 for other services (n8n etc.) — do NOT add a reverse-proxy container to the compose stack.**

### Env vars (canonical list in `docker-compose.yml`)

Required: `DATABASE_URL`, `JWT_SECRET`, `SUPER_ADMIN_EMAIL`, `PROVIDER_SECRETS_MASTER_KEY`.
Important: `NEXT_PUBLIC_APP_URL`, `OLLAMA_BASE_URL` (defaults to `host.docker.internal:11434` so the container reaches host-installed Ollama), `CRON_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`.
AI providers: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_CLIENT_ID/SECRET`, `META_APP_ID/SECRET`.
Off by default: `STRIPE_*` (`STRIPE_ENABLED=false`).

## 14. Known invariants & gotchas (every one of these has bitten the project)

| # | Invariant | Batch |
|---|---|---|
| 1 | jsonb columns receive raw objects via postgres.js, NEVER `JSON.stringify` | FF |
| 2 | Multi-pass iteration over `Iterable<T>` requires `Array.from` first | GG |
| 3 | `agents.id` is global, may be legacy literal OR `<template>-<suffix>` — use `findAgentByTemplate` | — |
| 4 | Engines require fixed template agents. Always go through `findAgentByTemplate`, never literal id checks | — |
| 5 | `runtimeAgents` shape in `task-execution.ts:533` does NOT carry `metadata`. If you need `metadata.templateId`, fetch it from `agentRows` | — |
| 6 | LLM-produced HTML MUST go through `sanitizeHtml` | CC |
| 7 | `<img>` can't send Authorization — use `?token=` query fallback or rely on cookie | Y |
| 8 | `provider_secrets` are AES-256-GCM envelopes. `PROVIDER_SECRETS_MASTER_KEY` loss = secrets loss | EE |
| 9 | `super_admin` is env-var match (`SUPER_ADMIN_EMAIL`), not a DB column | DD |
| 10 | nginx already owns 80/443 — don't add a reverse-proxy container | BB |
| 11 | `tasks` has NO `error_message` column. Errors live in `task_runs.error_message` (stage='task-execution', status='failed') | — |
| 12 | `relational-sync` upsert helper historically swallowed errors silently. If saves appear to revert, grep logs for `[app-state] relational sync failed (non-fatal)` | Z |
| 13 | `iris` is the orchestrator AND universal fallback. Every engine should degrade to iris if its specialist is missing | — |
| 14 | Standalone Next.js Docker build STRIPS `node_modules`. `node -e "require('bcryptjs')"` fails in-container. Use the VPS host's Python `bcrypt` | — |
| 15 | Auth tokens are in `mc_session` httpOnly cookie. Client-side `getStoredToken()` returns a sentinel `'cookie-session'`, NOT the JWT. Server short-circuits the sentinel | P.3 |
| 16 | `task_runs` has NO `progress` column. Use `task_events` for progress trail | — |

## 15. Recent batch log (Tier-1 hardening)

The project's "FIX_LOG" cadence is a series of small, deploy-and-verify batches lettered A, B, C… Below is the recent stretch (May 2026) that brought the system to Tier-1-ready. Full chronological log is in `FIX_LOG.md`; CLAUDE.md §12 indexes the rest.

| Batch | What it did |
|---|---|
| AA | Edge middleware: CSP, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy, HSTS gated on https |
| BB | Host nginx TLS termination with self-signed cert (10-year IP SAN). HSTS commented until Let's Encrypt. |
| CC | DOMPurify on all task/artifact HTML renders. Shared `sanitizeHtml` in `src/lib/html-sanitizer.ts` |
| DD | Login gated on `email_verified_at`. Register no longer auto-logs in (except super-admin). |
| EE | `provider_secrets` encrypted at rest with AES-256-GCM. Migration script idempotent. |
| FF | Office layout JSONB double-encoding fix. Repair query for existing broken rows. Defensive read guards. |
| GG | `findAgentByTemplate` iterator-drain bug. Pass 1 drained a `Map.values()` iterator, passes 2/3 saw nothing. Materialise to Array first. |
| HH | `CLAUDE.md` operational map + cross-session memory files. |
| P.1 | Server sets `mc_session` httpOnly cookie alongside JSON token. `/api/auth/logout` + `/api/auth/session` DELETE. |
| P.2 | 57 API routes + SSE migrated to cookie-aware helper via `scripts/migrate-auth-to-cookie-aware.js`. |
| P.3 | Client no longer stores JWT in localStorage. Sentinel preserves 50 legacy call sites. SessionGate cookie-first. |

## 16. Open items / known bugs

### Tier-1 (still pending)

- **Batch L** — Backup volume rotation policy + staging environment.
  Currently `mc_db_data`, `mc_uploads`, `mc_secrets` are unrotated Docker volumes. No staging — every change goes straight to prod. Mohammed deferred this earlier.

### Bugs Mohammed reported during the last session (NOT yet investigated)

**Content-calendar pipeline ignoring client brief.** Mohammed ran `create a social media content calendar for Victory Genomics with some focus on Arabian Beauty Product`. Victory Genomics is an **equine** DNA testing company (Arabian horse breed focus). The pipeline produced **human-related** content — meaning `clientContext` / `clientProfile` never made it into the prompt, or made it but was ignored. Likely investigation paths:
- Inspect the actual prompt sent to the LLM for that task. `task_runs.input_payload` and `task_runs.output_payload` for the failed/successful run should show what was rendered.
- `buildClientContext` in `task-execution.ts:519` and `buildClientProfile(client)` at line 520 — confirm the client row is loaded (look at line 505-508: only loads if `task.client_id` is set).
- The most likely root cause: the task may not have been created with a `client_id`. Verify the UI's task-creation flow attaches the selected client.

**Progress tracker oscillates** (37% → 52% → 37% → …). Multiple writers are likely racing on `task_events` / `task_progress` snapshots. Investigation paths:
- `src/lib/server/task-progress.ts` and `src/lib/server/task-events.ts` — find every site that writes a progress number.
- The SSE poller in `src/app/api/tasks/[id]/events/route.ts:768+` may be re-streaming an older `task_events` row.
- Check if a stale `workflow_instances.progress` is being merged in `updateProgressFromInstance` (or similar) after a fresher `task_events` row.

These two are **Batch II / JJ** candidates. Both probably share a root in the progress/state pipeline so they may collapse into one batch.

### Tier-2 follow-ups (deferred)

- Wire `audit_events` writes from auth + admin endpoints (table exists, few writers)
- `/api/health` endpoint for monitoring + nginx upstream check
- Structured logging (replace ad-hoc `console.log` prefixes)
- Bump Postgres pool size from 10 to 30 once concurrency proves stable
- Sentry / error reporting

## 17. Verification routine — what "done" means here

A code change isn't done until ALL pass:

1. `npm run typecheck` exits 0
2. `npm run test` is green (when touching tested code)
3. You've read the call sites of any function you changed. If the change affects the signature/semantics/invariants, trace at LEAST one level deeper into every caller.
4. **Pipeline changes**: trace dispatch through `autonomous-task.ts` → engine → required-agent gate. The engine throw at `content-calendar-engine.ts:1049` and `creative-asset-engine.ts:335` are silent landmines if you only test "container starts."
5. Deploy → `docker compose ps app` shows Up + healthy. `docker compose logs --tail 30 app` shows `Ready in 0ms`.
6. **Smoke test the actual user flow.** "Container starts" ≠ "feature works." Re-run the prompt that motivated the change. Verify end state via DB query, not just HTTP 200.

For multi-step debug sessions, write a DB query that confirms the desired state, not just the container state.

## 18. Mohammed's working style (lessons from the FIX_LOG)

- **Lowest-risk batches first, one at a time.** His standing instruction: *"please focus so as to minimize errors."* Full verification (tsc + container boots + actual smoke) between batches. Don't bundle unrelated work.
- **Trace one level deeper before declaring done.** During the FF → GG debug cycle he pushed back on a "should work" claim that fixed crash N but missed crash N+1 in the same task path. The standard: after fixing stage N, read stage N+1's dispatch/gate logic and confirm it accepts the now-fixed input.
- **Always cite credible sources** for marketing-domain claims (CTRs, channel benchmarks, audience sizes). Search before quoting. Confident unsourced numbers are worse than "let me search."
- **Communication preferences**: skip pleasantries, prose answers for explanations, bullet/table format for technical comparisons, concrete code over abstract description, recommend an option when comparing.
- **Tech preferences**: modern web stack (TS, React/Next.js, Node, Postgres). Production-ready answers; minimal comments (only for complex logic); show modified sections with `// ... existing code ...` markers.

## 19. Sibling documentation in the repo

Listed in increasing depth / decreasing currency:

- **`CLAUDE.md`** — operational map for AI assistants. Read this second after this handoff. Dense, file-path/line-number citations.
- **`ARCHITECTURE.md`** — human-oriented architecture overview.
- **`AGENTS.md`** — agent template catalog.
- **`FIX_LOG.md`** — chronological bug + fix log (source of truth for "Batch X did Y").
- **`DOCKER_DEPLOY.md`** — Docker deployment runbook.
- **`HOSTINGER_DEPLOY.md`** — VPS-specific notes (Hostinger Cloud).
- **`TESTING.md`** — test strategy.
- **`SPEC.md`** — product spec (older, not all of it is current).
- **`AUDIT_REPORT.md`** / **`RECOMMENDATIONS.md`** — historical dev-team audit. The Tier-1 plan was synthesised from this.
- **`HANDOFF_GUIDE.md`** — older handoff (pre-Batch-P).
- **`MemoryForAudit.md`** — internal note from the audit phase.

## 20. First-day checklist for the incoming agent

```
[ ]  1. Request from Mohammed: SSH key, GitHub access, .env values
[ ]  2. Clone the repo locally, run `npm install`, `npm run typecheck`
[ ]  3. Read CLAUDE.md end-to-end
[ ]  4. Skim FIX_LOG.md (most recent 10–15 batches give the current rhythm)
[ ]  5. SSH to the VPS, verify docker compose ps (mc_app + mc_db up)
[ ]  6. Tail logs while you reload the prod URL in a browser — see the request flow
[ ]  7. Run a DB shell, list tables, peek at tasks + agents for Mohammed's tenant
       SELECT id, deliverable_type, status, progress FROM tasks
         WHERE agency_id = 'a0934430-5f1a-4668-b449-095837d526ac'
         ORDER BY created_at DESC LIMIT 10;
[ ]  8. Look at the two open bugs in §16. Pick whichever feels smaller as your first batch.
[ ]  9. Propose your plan to Mohammed in his preferred format BEFORE editing code.
[ ] 10. Use the small-batch deploy-and-verify cadence. Don't bundle.
```

## 21. Access check log

- **2026-05-25** — Codex verified SSH access to `root@72.62.33.12`, confirmed `/opt/mission-control` is reachable, and confirmed `mc_app` + `mc_db` are running via Docker Compose. Git remote read access to `origin/main` was also verified from the local workspace.

---

*This document was assembled at the end of the May 2026 Tier-1 hardening sprint, immediately after Batch P.3 shipped. Update it when the next major batch lands or when any of the invariants in §14 change.*
