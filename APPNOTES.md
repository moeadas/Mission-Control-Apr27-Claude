# Mission Control App Notes

Durable working memory for understanding this app. Keep this file current as code is reviewed or changed.

Last updated: 2026-05-25

## Purpose

This file records how Mission Control is wired: app structure, runtime flows, key files, data model, deployment flow, invariants, and open questions. It is intentionally written for future AI/dev handoffs so context survives long sessions.

## Review Status

Legend:
- `Reviewed` means the file/area was read enough to understand behavior and ownership.
- `Inventoried` means listed/classified but not deeply read.
- `Deferred` means generated, vendored, binary, schema bulk, or low-behavior data where deep reading is not useful unless touched.

| Area | Status | Notes |
|---|---|---|
| Root operational docs | Reviewed | `HANDOFF.md`, parts of `CLAUDE.md`, `ARCHITECTURE.md`, deployment docs. |
| Root build/config files | Reviewed | Package, Next, TS, Vitest, Tailwind/PostCSS, Docker, compose, ignores, env examples reviewed. |
| `src/app` routes/pages | Pending | Needs route-by-route review. |
| `src/components` | Pending | Needs component flow review. |
| `src/lib` backend/client logic | In progress | Auth, DB client, state persistence, tenant helpers, provider settings, execution queue, key task execution path partially reviewed. |
| `src/config` agents/pipelines/skills | Pending | Need generated/template/config map. |
| `data/skills` | Inventoried | Large skill library; review structure and loader behavior first, then spot-check representative skills. |
| `data/skill-packages` | Inventoried | Includes bundled skill packages and large Office XML schemas; many files are support assets. |
| `public` assets | Pending | Need classify images/uploads/static assets. |
| `scripts` | Reviewed | Migration/import/bootstrap utilities reviewed. |
| `tests` | Pending | Need test coverage map. |

## High-Level App Model

Mission Control is a multi-tenant AI agency SaaS built with Next.js App Router, React, TypeScript, Tailwind, Zustand, and Postgres via `postgres.js`. Each tenant is an agency with clients, agents, tasks, outputs, skills, pipelines, provider settings, and office layout.

Core production topology:
- Local workspace: `/Users/moe/Desktop/Mission Control Remake`
- GitHub remote: `https://github.com/moeadas/Mission-Control-Apr27-Claude.git`
- VPS: `root@72.62.33.12`
- VPS app path: `/opt/mission-control`
- Runtime: host nginx on 80/443 proxies to Docker `mc_app` on `127.0.0.1:3000`; Postgres runs as Docker `mc_db`.

## File Inventory Snapshot

Initial inventory outside `.git`, `.next`, and `node_modules`: 2,079 files.

Top-level distribution:
- `data`: 1,596 files. Mostly skill markdown/json plus bundled skill packages.
- `src`: 360 files. Main app behavior.
- `public`: 57 files. Static assets/uploads.
- `docker`: 11 files. Init SQL and nginx/deploy support.
- `DOCs`: 10 files. Historical/generated docs.
- `scripts`: 7 files. Migration/import/bootstrap utilities.
- `tests`: 5 files. Vitest tests.
- Root docs/config/build files: remaining small set.

## Critical Invariants

- Work only inside `/Users/moe/Desktop/Mission Control Remake`.
- Tenant isolation is by `agency_id`; most app data must be scoped to `auth.tenantId`.
- Auth source of truth is the httpOnly `mc_session` cookie. Browser helpers return a non-secret `cookie-session` sentinel for legacy guards.
- `SUPER_ADMIN_EMAIL` env match creates super-admin behavior; do not add a DB-column concept for it.
- Agent IDs are global text IDs. Legacy tenants may use literal `maya`; cloned tenants use IDs like `maya-<suffix>`. Use `findAgentByTemplate`, never direct literal ID checks in engine code.
- `office_layouts.layout` is JSONB. Write raw objects via postgres.js/`db.json`, never `JSON.stringify`.
- LLM-generated HTML must pass through `sanitizeHtml`.
- `provider_secrets` are AES-256-GCM envelopes requiring `PROVIDER_SECRETS_MASTER_KEY`. Losing/changing this key breaks tenant provider secrets.
- `tasks` has no `error_message`; failures belong in `task_runs.error_message`.
- `task_runs` has no `progress`; progress events belong in `task_events` and workflow/task progress fields.
- Host nginx already owns 80/443 on the VPS; do not add an nginx reverse-proxy container to compose.

## Deployment Memory

Local-to-prod flow:
1. Commit locally on `main`.
2. Push `origin main`.
3. SSH to VPS with `/Users/moe/.ssh/contentforge_deploy`.
4. `cd /opt/mission-control`
5. `git pull origin main`
6. For code/runtime changes: `docker compose build app --no-cache && docker compose up -d app`
7. Verify logs and smoke probes.

Access confirmed on 2026-05-25:
- GitHub push to `origin/main` succeeded.
- VPS SSH succeeded.
- VPS repo pulled docs commit `e0f059dfda2d2c80771e3bcff2c19e22038def0c`.

## Root Build And Runtime Files

### `package.json`

- App name: `agency-mission-control`.
- Node engine: `>=20 <23`.
- Scripts:
  - `npm run dev`: Next dev server.
  - `npm run build`: Next production build.
  - `npm run start`: Next start.
  - `npm run typecheck`: `tsc --noEmit`.
  - `npm run test`: Vitest.
  - `npm run lint`: `next lint` (note: Next 16 may not support this old command shape; verify when needed).
- Core deps: Next 16.2.4, React 19.2.5, TypeScript 5.9.3, `postgres`, `jose`, `bcryptjs`, Zustand, Tailwind, DOMPurify, document/export libs, Google APIs, Meta SDK.
- Optional Stripe dependency exists but billing is scaffolded/off by env unless enabled.

### `Dockerfile`

- Multi-stage Node 20 Alpine build.
- `deps`: `npm ci`.
- `builder`: copies deps and full repo, sets `DOCKER_BUILD=1`, `NEXT_PUBLIC_APP_URL`, disables telemetry, raises heap with `NODE_OPTIONS=--max-old-space-size=3072`, runs `npm run build`.
- `runner`: copies standalone Next output plus static/public, creates non-root `nextjs`, exposes 3000, runs `node server.js`.
- Standalone output means runtime container does not preserve normal `node_modules`; ad-hoc in-container Node `require(...)` can fail unless bundled.

### `docker-compose.yml`

- Services:
  - `db`: `postgres:16-alpine`, container `mc_db`, volume `mc_db_data`, init script `docker/init.sql`, healthcheck via `pg_isready`.
  - `app`: built from `Dockerfile`, container `mc_app`, waits for healthy DB, maps host `3000:3000`, mounts `mc_uploads` to `/app/public/uploads` and `mc_secrets` to `/app/data`.
- App env includes `DATABASE_URL`, `JWT_SECRET`, `SUPER_ADMIN_EMAIL`, `NEXT_PUBLIC_APP_URL`, provider keys, `PROVIDER_SECRETS_MASTER_KEY`, `CRON_SECRET`, Resend, Stripe flags.
- `host.docker.internal:host-gateway` is configured so app can reach host Ollama.
- Compose deliberately has no nginx service; host nginx handles TLS/proxying.

### `next.config.mjs`

- Stamps each build with `NEXT_PUBLIC_BUILD_ID = Date.now().toString()` so client code can detect new deploys.
- `reactStrictMode: true`.
- Uses standalone output only when `DOCKER_BUILD=1`; local builds do not necessarily create standalone output.
- Adds `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate` to most routes except `_next/static`, `_next/image`, `favicon.ico`, and `uploads`.
- Externalizes Konva-related packages server-side and aliases `konva` to browser build in webpack. This supports the office builder/history with old Konva dependencies still present.
- Turbopack root set to repo root.

### `tsconfig.json`

- Strict TS, `moduleResolution: bundler`, target `ES2022`, JSX `react-jsx`.
- Allows JS (`allowJs: true`) because scripts/config ecosystem includes JS.
- Path alias: `@/* -> ./src/*`.
- Includes all `**/*.ts` and `**/*.tsx`, plus `.next/types`.

### `vitest.config.ts`

- Node test environment.
- Includes `tests/**/*.test.ts`.
- Uses fork pool.
- Alias `@` to `./src`.
- Comment says tests are currently pure-function smoke tests, no DB/Next runtime.

### `tailwind.config.ts` / `postcss.config.mjs`

- Tailwind scans `src/pages`, `src/components`, and `src/app`.
- Theme is CSS-variable driven with custom semantic colors, font families, shadows, radii, and animation keyframes.
- PostCSS only runs Tailwind and Autoprefixer.

### `.gitignore`

- Ignores dependencies/build outputs/env files/IDE/macOS/logs/coverage/tsbuildinfo.
- Explicitly ignores `data/provider-secrets.json`.
- Ignores `.claude/` local memory.

### `.dockerignore`

- Excludes `.git`, `.gitignore`, env files, node/build output, and several docs from Docker build context.
- Note: `.env.docker.example` is ignored in Docker context; runtime uses VPS `.env`, not image copy.

### Env Examples

- `.env.local.example` is the current local reference: `JWT_SECRET`, `SUPER_ADMIN_EMAIL`, `DATABASE_URL`, `NEXT_PUBLIC_APP_URL`, `CRON_SECRET`, `PROVIDER_SECRETS_MASTER_KEY`, OAuth IDs, optional `GEMINI_API_KEY`, email, Stripe.
- `.env.docker.example` is shorter/older and lacks newer vars like `PROVIDER_SECRETS_MASTER_KEY`, `CRON_SECRET`, Resend, Stripe. Treat `docker-compose.yml` as canonical for production env names.

## Docker Support Files

### `docker/nginx-mission-control.conf`

- Host-level nginx config for the VPS; proxies `https://72.62.33.12` to `http://127.0.0.1:3000`.
- HTTP on the IP redirects to HTTPS.
- Uses self-signed cert paths `/etc/nginx/ssl/mission-control.{crt,key}`.
- HSTS is commented until real domain/Let's Encrypt.
- Sets edge security headers plus 20 MB upload size.
- Disables proxy buffering/request buffering and sets 5-minute read/send timeouts for long tasks and SSE.
- Blocks common probing paths like `.env`, `.git`, WordPress routes.

### `docker/init.sql`

- First-boot schema only; existing production schema changes must be applied manually with `docker/migrations/*.sql`.
- Extension: `pgcrypto`.
- Shared trigger function updates `updated_at`.
- Tables include:
  - Auth/tenant: `users`, `plans`, `agencies`, `profiles`, `subscriptions`, `tenants` view.
  - Legacy state: `mission_control_state`.
  - Domain: `agents`, `clients`, `skills`, `pipelines`, `tasks`, `task_assignments`, `outputs`, `conversations`, `messages`, `knowledge_assets`, `office_layouts`.
  - Scheduler/usage/auth support: `scheduled_tasks`, `token_usage`, `email_verification_tokens`, `password_reset_tokens`, `tenant_invitations`, `oauth_tokens`, `rate_limit_buckets`.
  - Execution/audit: `task_events`, `workflow_instances`, `task_runs`, `audit_events`.
- ACL model: `assigned_user_ids uuid[]` exists on `clients`, `tasks`, and `outputs`; empty means tenant-shared.
- `outputs` has optional public share token fields.
- `office_layouts.layout` default JSON uses `tiles`, `zones`, `version`, `gridWidth`, `gridHeight`, `floorAssetId`.
- `task_events` is the SSE progress trail.
- `workflow_instances` and `task_runs` are required by `task-execution.ts`.

### `docker/migrations`

- Migrations are idempotent SQL files applied manually to existing DBs.
- `20260515_share_tokens.sql`: adds output sharing columns and unique partial index.
- `20260516_resource_acl.sql`: adds `assigned_user_ids` ACL arrays.
- `20260516_schema_integrity.sql`: aligns existing prod schema with init SQL, adds constraints/triggers/defaults.
- `20260517_auth_tokens.sql`: email verification, password reset, tenant invitations, rate-limit buckets.
- `20260517_backfill_iris.sql`: historical Iris backfill. Warning: it inserts literal `id='iris'` for tenants with `ON CONFLICT(id) DO NOTHING`; because `agents.id` is global, this can only insert one global literal Iris. Do not reuse this pattern for tenant seeding.
- `20260517_oauth_tokens.sql`: encrypted OAuth token storage.
- `20260517_task_events.sql`: creates SSE progress events table.
- `20260517_token_budgets.sql`: token budgets and content-defaults support.
- `20260519_workflow_and_task_runs.sql`: creates missing workflow/task-run tables.

## Scripts

### `scripts/seed-admin.mjs`

- Seeds `default-agency`, a super-admin user, and profile.
- Uses `bcryptjs` if import works; falls back to a non-bcrypt `sha256:` scheme for dev only. Production login expects bcrypt-style hashes, so prefer real `bcryptjs`/host Python bcrypt when resetting prod passwords.
- Env: `DATABASE_URL`, optional `ADMIN_EMAIL`, `ADMIN_PASSWORD`.

### `scripts/encrypt-provider-secrets.js`

- One-shot migration for `/app/data/provider-secrets.json` into AES-256-GCM envelope format.
- Requires `PROVIDER_SECRETS_MASTER_KEY`.
- Accepts hex or base64 32-byte key.
- Backs up plaintext before overwriting.
- Idempotent if file is already envelope-shaped.

### `scripts/migrate-auth-to-cookie-aware.js`

- Batch P.2 codemod for API routes.
- Walks `src/app/api/**/route.ts`.
- Rewrites local `getBearerToken(...)` helper bodies to delegate to `getAuthTokenFromRequest(...)`.
- Adds/updates import from `@/lib/auth/server`.
- Idempotent and minimal-diff, but it writes source files directly.

### `scripts/generate-agent-architecture.js`

- Canonical generation script for `src/config/agents/generated.ts`.
- Reads each folder under `src/config/agents/<agent>/`.
- Requires `agent.json`, `SOUL.md`, `IDENTITY.md`, `STYLE.md`, `RULES.md`, `CONTEXT.md`, `SKILL_SELECTION.md`, `HANDOFFS.md`, `MEMORY.md`, `HEARTBEAT.md`.
- Combines those docs into each agent's `systemPrompt`.
- Adds runtime metadata from hardcoded `RUNTIME_META`.
- Exports `AGENT_ARCHITECTURE_BUNDLES`, `CONFIG_AGENT_IDS`, `CONFIG_AGENTS`, and helpers.

### Skill Migration Scripts

- `scripts/import-mission-control-skills.js`: parses a monolithic `MISSION_CONTROL_SKILLS.md`, writes legacy JSON skill files under `src/config/skills`, and refreshes `skills-library.json`.
- `scripts/migrate-skills-to-folders.js`: migrates legacy `src/config/skills/*.json` into folder layout under `data/skills/<id>/`; dry-run by default, `--write` to mutate.
- `scripts/upgrade-skills-add-skill-md.js`: adds Claude-format `SKILL.md` into existing `data/skills/<id>/` folders that have sidecars but no `SKILL.md`; dry-run by default, `--write` to mutate.

## Core Runtime Flow

Main task execution path:

```text
POST /api/tasks/[id]/execution
  -> queueTaskExecution(...)
  -> runTaskExecution(taskId, auth, action, options)
  -> loads task, agents, agency settings, pipelines, skills
  -> builds client context/profile if task.client_id exists
  -> builds runtime agents, channeling plan, progress plan, office context
  -> executeAutonomousTask(...)
  -> dispatches to creative asset engine, content calendar engine, or generic pipeline
```

Specialist engine gates:
- Content calendar requires template agents `maya`, `echo`, `nova`, `lyra`, `iris`.
- Creative asset requires `finn`, `echo`, `lyra`, `iris`.
- Gates use `findAgentByTemplate(input.agentsById.values(), templateId)`, which materializes iterables to avoid iterator drain.

## Key Files Read So Far

### `src/lib/db/client.ts`

- Exports singleton `getDb()`.
- Reads `DATABASE_URL`.
- Creates `postgres(connectionString, { max: 10, idle_timeout: 20, connect_timeout: 10 })`.
- Pool size is intentionally conservative; handoff notes mention possible future bump after concurrency stabilizes.

### `src/lib/types.ts`

- Central product/domain types: agents, deliverables, missions, artifacts, provider settings, workflow/task run records.
- `AIProvider`: `ollama | gemini | anthropic | openai`.
- `DeliverableType` drives routing across store, chat, task execution, and engines.
- `Mission` is the client/store shape for a task row; maps to DB `tasks`.
- `Artifact` is the client/store shape for an output row; maps to DB `outputs`.
- Provider settings include routing, Ollama, Gemini, Anthropic, OpenAI, visual generation, MCP, Meta ads, Higgsfield.

### `src/lib/types/persistence.ts`

- Persistence-only types so routes and shell code do not import the whole Zustand store.
- `AppPersistenceSnapshot` is the shape synced through `/api/state`: agents, activities, campaigns, clients, missions, artifacts, conversations, agency settings, provider settings, agent memories.
- `EntityDeltaPatch` supports granular upserts/deletes for agents, clients, missions, artifacts, conversations.
- `ChatMessage.meta` carries task routing, deliverable, artifact, execution, quality, provider/model, compare, and client-brief action metadata.

### `src/lib/agents-store.ts`

- Main Zustand store persisted under localStorage key `moes-mission-control`, version 7.
- Holds agents, activities, campaigns, clients, missions, artifacts, provider settings, agent memories, Iris conversations, current user, and UI state.
- Uses `createMissionFromPrompt` to infer deliverable type and pipeline metadata, then creates queued mission with default assigned agent `iris`.
- Local store updates mission progress to at least 88 when artifacts are added/updated.
- `hydrateAppState` merges server state into store but keeps local onboarding completion once dismissed.
- Provider settings are normalized on hydrate and preserve Gemini API key/masked key carefully.
- Local persistence is intentionally light via normalizers; remote sync/full outputs live outside localStorage.

### `src/lib/agents-store/defaults.ts`

- Loads `CONFIG_AGENTS` from generated agent config and creates `ALL_DEFAULT_AGENTS`.
- `IRIS_AGENT` starts active with current task and workload.
- Initial campaigns/missions/artifacts are empty; initial activities include demo-ish Victory Genomics activity.
- `DEFAULT_CLIENT_BRAND_KIT` normalizes client brand assets.
- Note/risk: `VALID_PROVIDERS` only includes `ollama` and `gemini` for some legacy/store normalization, while `AIProvider` now also includes Anthropic/OpenAI.

### `src/lib/agents-store/normalizers.ts`

- Pure normalization for persisted local/server snapshots.
- `normalizeAgent` merges stale/custom agent records with template defaults.
- `normalizePersistedState` normalizes agents, clients, missions, artifacts, conversations, agency settings, provider settings, agent memories.
- `createRemoteAppPersistenceSnapshot` strips conversations for cross-device/server sync.
- `createLocalPersistenceSnapshot` strips heavy artifact fields and trims conversations to last 6 short messages so localStorage does not blow up.

### `src/lib/client-data.ts`

- Defines `Client`, `ClientBrandKit`, `BrandAsset`, and `KnowledgeAsset` client-side shapes.
- Seeds `DEFAULT_CLIENTS` with Victory Genomics, including detailed brand/product/audience/competitor/voice context and a knowledge asset path.
- This default client is local seed data; production tenant client rows are DB-backed and loaded through `/api/state`.

### `src/lib/provider-settings.ts`

- Central provider defaults, normalization, routing, fallback, and secret stripping.
- `DEFAULT_PROVIDER_SETTINGS` defaults primary provider to Ollama, fallback to Gemini, runtime mode `fast`.
- Content-generation default models: Ollama empty/fallback-to-settings, Gemini `gemini-2.5-pro`, Anthropic `claude-sonnet-4-5`, OpenAI `gpt-4o`.
- `providerIsConfigured`: Ollama is considered configured if not disabled; cloud providers need enabled + verified + key.
- `resolveTaskRuntime` prioritizes explicit agent provider/model, then content-first routing, then compare/thinking/default routing, then requested/fallback provider.
- `shouldRunCompareMode` requires runtime mode `compare` and both Gemini + Ollama configured.
- `stripProviderSecrets` blanks API keys/tokens before returning settings to clients.

### `src/lib/html-sanitizer.ts`

- Single DOMPurify config for LLM/user HTML rendering.
- Runs isomorphically via `isomorphic-dompurify`.
- Allows rich output tags, tables, images, class/style/id, limited ARIA/role, safe URL protocols.
- Forbids script/frame/object/embed/meta/base/link and common event handler attrs.
- Use `sanitizeHtml(rawHtml)` before `dangerouslySetInnerHTML` for untrusted HTML.

### `src/lib/server/prompt-safety.ts`

- Provides prompt-injection defense helpers.
- `sanitizePromptValue` strips control chars, code fences, template braces, internal boundary tags, obvious instruction override phrases, and common API key patterns.
- `wrapUserInput` surrounds user/client/uploaded text with explicit boundary tags and model-facing guidance.
- `sanitizePromptProfile` sanitizes object string fields.
- `quoteInline` wraps a sanitized inline value in `«...…»`.

### `src/lib/server/text-utils.ts`

- Shared text helpers.
- `escapeHtml`, `truncate`, and `looksLikeBoilerplateResponse`.
- Boilerplate detection catches routing/status/project-management phrases that indicate the model did not produce the actual deliverable.

### `src/lib/skill-schema.ts`

- Type schema for canonical skills: metadata, prompts, variables, inputs/outputs, workflow, examples, checklist, tools, agents, pipelines, bundle file metadata.
- Defines category/difficulty/freedom option lists for UI and validation.

### `src/lib/skills/registry.ts`

- Canonical filesystem skill registry.
- Source path: `data/skills/<skill-id>/`.
- Expected layout: required-ish `SKILL.md` or `skill.json`, plus optional `INSTRUCTIONS.md`, `CONTEXT.md`, `TRIGGER.md`, `OUTPUT_TEMPLATE.md`, `CHECKLIST.md`, `WORKFLOW.md`, `EXAMPLES.md`, `references/`, `scripts/`.
- Precedence: `SKILL.md` frontmatter -> `skill.json` for advanced structured fields -> dedicated markdown sidecars for prose blocks.
- Has a minimal YAML frontmatter parser, sidecar readers, markdown checklist/workflow/example parsers.
- Caches registry for 60 seconds; `invalidateSkillRegistry` clears it.
- Exports category loaders, skill map/loaders, agent/ID filters, stats, and prompt renderers.
- Legacy fallback to `src/config/skills` is removed; comments say new edits belong under `data/skills`.

### `src/lib/server/skills-catalog.ts`

- Compatibility shim around `skills/registry.ts`.
- Historical callers still import `loadConfigSkillCategories`, `loadConfigSkillMap`, `mergeDbSkillsWithConfig`.
- DB skill rows override matching on-disk skill fields, but on-disk skill remains structural fallback.
- DB-only skills are added into categories too.

### `src/lib/skill-packages.ts`

- ZIP skill-package importer.
- Uses JSZip to load files safely with normalized non-escaping relative paths.
- Finds `SKILL.md`, parses frontmatter/body, infers category/difficulty/agents, extracts known sections, includes bundled references/templates/scripts in prompt context.
- Produces an `ImportedSkillBundle` with a `Skill` object plus file list.

### `src/lib/intents/deliverable-registry.ts`

- Canonical registry for deliverable types.
- Each deliverable spec includes ID, label, category, regex patterns, default lead/collaborators, pipeline ID/keywords, priority, execution hints, and complexity.
- Used by classifier, task output, routing, chat, store, and execution paths.
- Needs deeper pass later because file is long and only partially read in this batch.

### `src/lib/intents/intent-classifier.ts`

- Canonical classifier for conversational vs task messages, deliverable type, pipeline hints, routing context, and Arabic support.
- Isomorphic: used in browser and server.
- Arabic path normalizes Arabic text, strips diacritics/tatweel, and uses keyword matching because JS word boundaries do not work well for Arabic.
- Needs deeper pass later because only initial sections were read in this batch.

### `src/lib/task-output.ts`

- Builds user-facing task titles and deliverable-specific output instructions.
- The output specs strongly shape model responses: required headings, table requirements, and rules against project-management boilerplate.
- Needs deeper pass later; initial sections were read.

### `src/lib/output-quality.ts`

- Validates generated deliverables.
- Lightweight types like single social posts/status/general tasks do not require H1/H2 structure, but require minimum usable content.
- Structured deliverables require expected sections by deliverable type.
- Content calendars require table layout.
- Short-form copy checks requested character limits when detectable.

### `src/lib/output-html.ts`

- Converts markdown-ish model output into artifact HTML.
- Supports headings, H2 sections, pipe tables, lists, images, inline links/code/bold/italic, and slide-like lines.
- If content already looks like artifact HTML, returns it unchanged.
- Also includes `htmlToPlainText` helper for export/plain text conversions.

### `src/lib/db/app-state.ts`

- Persists full shared JSON state in `mission_control_state`.
- Uses `tenantId` as the blob key when available; fallback key is legacy `default-agency`.
- `saveSharedAppState` writes full JSON and then best-effort syncs relational tables.
- `saveSharedAppStateDelta` merges state/entity patches into current blob, writes it, then syncs only touched relational tables where possible.
- Relational sync failures are non-fatal and logged as `[app-state] relational sync failed (non-fatal)`.

### `src/lib/db/relational-sync.ts`

- Mirrors the JSON app state into relational tables and maps relational rows back into app state.
- Strict tenant-scoped resolver returns `tenantId` or null; no implicit default agency for request paths.
- Row builders map `Agent`/`Client`/`Mission`/`Artifact`/`Conversation` into DB rows and also build task assignments, messages, knowledge assets, config skills, and config pipelines.
- Generic `upsert` uses `db.unsafe` with positional params; object values are JSON-stringified for JSONB columns. This was the Batch Z fix for previous `[object Object]` SQL failures.
- Full sync seeds skills if missing and pipelines only if tenant has none.
- Delta sync deletes/reinserts task assignments and messages for touched entities.
- `loadRelationalAppState` loads all tenant rows; ACL filtering happens later in `/api/state`.
- Note/risk: `toAgentRow` writes `metadata: {}` for every agent, which can erase `metadata.templateId` if client-side state sync upserts template agents. Engine runtime survives by prefix/literal matching, but metadata loss weakens the first lookup path.

### `src/lib/auth/server.ts`

- Defines `SESSION_COOKIE_NAME = mc_session`.
- `setSessionCookie` and `clearSessionCookie` set httpOnly, SameSite=Lax cookies. `secure` depends on `x-forwarded-proto` or request protocol.
- `getAuthTokenFromRequest` reads cookie first, then bearer header. It ignores literal bearer sentinel `cookie-session`.
- `getAuthFromRequest` is extract+resolve convenience.
- `resolveAuthContextFromToken` verifies JOSE JWT, upserts profile, resolves role, resolves/backfills tenant, auto-provisions tenants for non-super-admins, seeds required agents, loads provider settings.
- Super-admin role is driven by env email match first.

### `src/lib/auth/browser.ts`

- Browser compatibility shim after cookie migration.
- New sessions do not store JWT in localStorage.
- `getStoredToken()` returns legacy JWT if still present, otherwise returns `cookie-session` sentinel if marker exists.
- `setStoredToken()` removes legacy JWT and stores only `mc_cookie_session` marker.
- `clearStoredToken()` clears both local markers and fire-and-forgets `POST /api/auth/logout`.

### `src/lib/auth/jwt.ts`

- Uses JOSE HS256.
- JWT expiry is 7 days.
- `JWT_SECRET` must exist and be at least 32 chars.
- Payload includes `sub`, `email`, `role`, optional `tenantId`.

### `src/lib/server/execution-queue.ts`

- In-memory queue map keyed by `taskId`.
- Prevents duplicate queued/running jobs for the same task.
- Uses `setTimeout(..., 25)` to run `runTaskExecution` outside the request path.
- Important limitation: jobs are process-local. Container restart loses queue state.

### `src/lib/server/agent-templates.ts`

- Canonical template helper layer for 10 agent templates from generated config.
- `REQUIRED_TEMPLATE_IDS` includes all 10 production templates.
- `STRICTLY_REQUIRED_TEMPLATE_IDS` is only `iris`.
- `isOrchestratorAgent` recognizes `metadata.templateId === 'iris'`, literal `iris`, and prefix `iris-`.
- `findAgentByTemplate` supports metadata, literal legacy IDs, and prefix clone IDs; materializes iterable first.
- `cloneAgentTemplates` inserts cloned template agents using globally unique IDs like `<template>-<shortuuid>` and metadata `{ templateId, clonedFrom, clonedAt }`.

### `src/lib/server/tenants.ts`

- Tenant equals `agencies` row.
- `createTenant` slugifies name, inserts agency, inserts subscription from plan, then calls `seedTenantRequiredAgents`.
- `getTenantIdForUser` reads `profiles.tenant_id`.
- `assignUserToTenant` updates profile.
- `getTenantById`, `getAgentCountForTenant`, `syncAgentCount`, and `canAddAgent` support subscription/admin flows.
- Important doc mismatch: comment says auto-seed orchestrator Iris, but code calls `seedTenantRequiredAgents`, which currently seeds all required templates.

### `src/lib/server/secret-crypto.ts`

- AES-256-GCM envelope crypto for at-rest secrets.
- Env key: `PROVIDER_SECRETS_MASTER_KEY`; accepts base64 or hex 32-byte key.
- Envelope shape: `{ v: 1, alg: 'aes-256-gcm', iv, tag, ciphertext }`.
- If key is unset, `encryptString` returns null and callers may store plaintext for dev/POC; warning logs once.
- `decryptString` throws if key is missing or envelope auth fails.

### `src/lib/server/provider-secrets.ts`

- Stores per-user provider settings in `data/provider-secrets.json`.
- Whole file can be encrypted as one AES-GCM envelope.
- Reads legacy plaintext stores; next save upgrades to encrypted envelope if key exists.
- If an encrypted file cannot decrypt, it throws instead of returning `{}` to avoid wiping secrets on next save.
- No longer merges env-level Gemini key into every user; per-user settings are source of truth.

### `src/lib/server/oauth-tokens.ts`

- Stores Google/Meta OAuth tokens in DB table `oauth_tokens`.
- Access and refresh tokens are encrypted envelopes in JSONB columns, or `{ plaintext }` dev fallback when master key is unset.
- `saveOAuthToken` preserves an existing refresh token if a provider omits refresh token on later consents.
- `getOAuthToken` decrypts and returns plaintext for API calls; returns null and logs on decrypt failure.
- `isAccessTokenExpired` treats unknown expiry as expired.

### `src/lib/server/email-tokens.ts`

- Random 32-byte base64url single-use token helpers for email verification, password reset, and tenant invitations.
- Verification tokens expire by default after 24h, reset after 1h, invites after 7d.
- Tokens are stored directly in DB, not hashed.
- Consuming email verification token also sets `users.email_verified_at`.

### `src/lib/server/email.ts`

- Transactional email helper.
- Uses Resend when `RESEND_API_KEY` is set; otherwise logs a stub email to server console.
- `EMAIL_FROM` defaults to `no-reply@mission-control.local`.
- URL generation uses `NEXT_PUBLIC_APP_URL`.
- Templates exist for verification, password reset, and tenant invite.

### `src/lib/server/rate-limit.ts`

- Two-tier rate limiter.
- Always uses in-memory bucket per process.
- Optional durable mode writes to `rate_limit_buckets`, intended for auth endpoints.
- Bucket key convention: `<route>:<ip-or-userId>`.
- `getClientIp` reads `x-forwarded-for`, then `x-real-ip`, else `unknown`.
- Durable DB errors warn and fall back to memory-only.

### `src/lib/server/token-budgets.ts`

- Enforces per-tenant monthly token budgets from `subscriptions.monthly_token_budget_usd`.
- Billing window uses subscription cycle if set, otherwise current calendar month.
- `assertTokenBudget` throws `TokenBudgetExceededError` with code `TOKEN_BUDGET_EXCEEDED` for route handlers to convert to 402.

### `src/lib/server/token-logger.ts`

- Writes usage rows to `token_usage`.
- Cost computed via `calculateCost` from model pricing config.
- Logging failures are swallowed after console error so LLM execution does not fail due to usage logging.

### `src/config/model-pricing.ts`

- Model pricing catalog for token-cost estimation and UI picker labels.
- Pricing is stored as USD per 1M input/output tokens.
- Ollama/local models are costed at zero.
- `calculateCost`, `formatCost`, `formatTokens`, and `MODEL_CATALOG` live here.
- Header claims pricing was checked May 2026; browse before updating or relying on these numbers for external claims.

### `src/lib/providers.ts`

- Client/shared provider labels, model options, helper filters, model label lookup, and API key masking.
- Model option list covers Ollama, Gemini, Anthropic, and OpenAI.
- `maskApiKey` keeps first/last 4 chars for long values.

### `src/lib/server/ai.ts`

- Server AI provider adapter and compatibility export layer.
- `verifyProvider` checks Ollama, Anthropic, OpenAI, and Gemini text providers.
- `verifyVisualProvider` and `generateGeminiImage` call Gemini image models and extract inline image data.
- `ProviderError` normalizes provider/status/code failures.
- `generateTextWithUsage` supports Anthropic Messages, OpenAI chat completions, Gemini generateContent, and Ollama `/api/chat`.
- Default model call timeout is 120s unless caller passes `timeoutMs`.
- Anthropic/OpenAI can use env keys if per-user keys are absent; Gemini currently requires explicit `geminiApiKey`; Ollama uses per-user URL, `OLLAMA_BASE_URL`, then localhost.
- Ollama cloud-model 500s get a single retry after 1 second.
- Returns token usage from provider metadata where available.
- `generateText` is the backward-compatible text-only wrapper.
- `getFriendlyProviderError` turns provider/timeouts/quota/auth failures into UI-safe messages.
- Re-exports canonical intent classifier helpers for backward compatibility: deliverable spec, deliverable inference, routing context, pipeline inference.
- `buildExecutionPrompt` assembles a structured execution brief with client context, confirmed brief, output specification, quality guidelines, and anti-boilerplate rules.

### `src/lib/google-integrations.ts`

- Google OAuth2 client helper.
- OAuth routes store encrypted tokens; this module loads/refreshed user tokens via `oauth-tokens.ts`.
- Provides lightweight Docs/Sheets read/create/update wrappers.
- Google Ads helper was removed because `googleapis` does not expose `google.ads()`.

### `src/lib/meta-integrations.ts`

- Lightweight Meta Graph helpers for ad accounts, campaigns, adsets, ads, insights, and campaign performance.
- Uses Graph API v18.0 directly with `access_token` query params.
- Separate route files may use newer version env; check before changing Meta integration behavior.

### `src/lib/server/stripe.ts`

- Feature-flagged by `STRIPE_ENABLED === 'true'`.
- Stripe dependency is optional and dynamically imported.
- Pinned API version: `2024-12-18.acacia`.
- Helpers resolve plan price IDs and tenant Stripe customer IDs.

### `src/lib/server/task-execution.ts`

- Top-level execution runner and task state loader/updaters.
- `runTaskExecution` resolves agency from auth, optionally bootstraps a task row, loads task/agents/agency/pipelines/skills, loads client + knowledge only if `task.client_id` exists, and builds `clientContext` + `clientProfile`.
- Runtime agents omit `metadata`, so code needing template metadata must use source DB rows or ID conventions.
- Builds progress plan via `task-progress.ts`; writes `task_events`, `workflow_instances`, and `task_runs`.
- Loads `office_layouts.layout` defensively, parsing stringified JSON if legacy double-encoded rows exist.
- Calls `executeAutonomousTask` with request, provider runtime, client context/profile, agents, selected skills, pipeline, and office context.
- On success creates/updates output artifacts and task status/progress; on failure writes failed task run, failed task, workflow state, and error event.
- 2026-05-25 fix: `ensureTaskExists` no longer returns early when a stub task row already exists. It now backfills missing `client_id`, summary, deliverable type, pipeline, lead agent, and metadata from bootstrap data. This protects the `/api/state` race/self-heal path where a task could exist but lack client context.
- 2026-05-25 fix: task execution resets live `task_events` and current workflow/task progress at the start of a fresh run, then event and workflow progress are monotonic for that run. This prevents stale terminal events from closing SSE immediately on retry and prevents percent values from bouncing backward during execution.
- 2026-05-25 fix: workflow/task-run writes inside `runTaskExecution` pass the auth-resolved `agencyId`, avoiding legacy `default-agency` writes for multi-tenant executions.

### `src/lib/server/autonomous-task.ts`

- Orchestration dispatcher for task execution.
- Builds `agentMap` from runtime agents.
- Builds client profile map from explicit `clientProfile`, parsed `clientContext`, and optional tenant content defaults.
- Routes `creative-asset` to creative engine unless prompt looks like plain social post/caption without image-generation intent.
- Routes `content-calendar` to automated content calendar engine.
- Other deliverables use generic pipeline execution.
- Falls back to Iris where possible via `findAgentByTemplate(agentMap.values(), 'iris')`.

### `src/app/api/tasks/[id]/execution/route.ts`

- Cookie/bearer aware auth wrapper.
- `GET` returns `loadTaskExecutionState` plus in-memory job state.
- `POST` queues execution with optional action, comment, runtime mode, and bootstrap payload.
- Returns `202` when queued.

### `src/app/api/tasks/[id]/events/route.ts`

- SSE route for task progress.
- Auth via cookie/bearer, with `?token=` fallback for EventSource.
- Verifies task tenant unless super-admin.
- Sends backlog first, then polls `task_events` every 700 ms.
- Closes on `done` or `error`, or after 5 minutes.

### `src/app/api/state/route.ts`

- Cookie/bearer aware state API.
- `GET` loads JSON blob and relational state, merges relational over blob, but keeps blob arrays when relational arrays are empty to avoid treating unsynced tables as deletes.
- Applies resource ACL filtering for non-admins:
  - Empty/missing `assignedUserIds` means tenant-shared.
  - Non-empty ACL restricts visibility to owner or assigned users.
  - Missions/artifacts linked to hidden clients/missions are hidden too.
- `PUT` accepts full `state`, `statePatch`, or `entityPatch`.
- Optimistic conflict check uses `updatedAt`.
- Enforces agent limit on new agent upserts via `canAddAgent`.
- Saves provider settings per-user via `saveUserProviderSettings`; provider settings are not tenant-shared even though present in app state.
- Tenant members cannot set ACLs on new rows and cannot alter ACLs on existing rows; admins can.

### `src/app/api/chat/route.ts`

- Main Iris chat endpoint.
- Auth currently calls `resolveAuthContextFromToken(getBearerToken(req))` where `getBearerToken` wraps `getAuthTokenFromRequest`.
- Applies chat rate limit and token budget.
- Accepts current app state arrays from client (`agents`, `clients`, `missions`, etc.).
- Determines conversational vs deliverable intent, builds routing/execution/channeling, can create/self-heal task rows for `missionId`.
- Has client brief detection/extraction path.
- Emits task events and task runs for mission execution.
- Produces NDJSON-style response chunks at the end, though true streaming of long execution is noted as future work.
- 2026-05-25 fix: mission self-heal inserts now include `owner_user_id`, validated `client_id` when `currentClientId` is present, and initial `progress = 0`. This keeps race-created task rows tied to the active client instead of becoming generic tasks.

### `src/app/api/pipelines/run/route.ts`

- Server-side pipeline runner endpoint.
- Creates a task row and queues canonical `runTaskExecution`.
- 2026-05-25 fix: endpoint now uses `auth.tenantId` directly instead of resolving `slug = 'default-agency'`.

### `src/components/tasks/GlobalTaskTracker.tsx`

- Floating live mission console that polls `/api/tasks/:id/execution` for active tracked missions and displays workflow, runs, assigned squad, client, and output state.
- 2026-05-25 fix: rendered progress now uses the highest known value from local mission progress and server workflow progress, so a slower poll response cannot make the visible dial move backward.

## Open Questions / Suspected Risks

- Versioning note: `package.json` app version was bumped to `1.0.1` for the 2026-05-25 client-context/progress fix set. Production builds also expose a timestamp build id through `NEXT_PUBLIC_BUILD_ID`, `/api/version`, and the Settings page `BuildVersionBadge`.
- Versioning note: `package.json` app version was bumped to `1.0.2` for the 2026-05-25 follow-up that infers clients from prompt text on new Iris missions, closes matching task-run rows instead of leaving duplicate `in_progress` rows, and honors pipeline-reported progress in task execution hooks.
- Versioning note: `package.json` app version was bumped to `1.0.3` for the 2026-05-25 client-onboarding fix: Iris now preserves attached file names/content as source docs, auto-creates clients for explicit create-client requests, stores attached docs as knowledge assets, and attempts homepage enrichment when a website is known.
- Versioning note: `package.json` app version was bumped to `1.0.4` for the 2026-05-25 relational hydration fix: client `brief`, client `metadata`, and knowledge-asset `metadata` are parsed defensively when Postgres returns legacy stringified JSONB rows.
- Versioning note: `package.json` app version was bumped to `1.0.5` for the 2026-05-25 pipeline library fix: pipeline APIs now use `auth.tenantId`, parse legacy stringified pipeline definitions, write definitions with `db.json`, and the client pipeline store/page normalizes malformed rows instead of crashing.
- Versioning note: `package.json` app version was bumped to `1.0.6` for the 2026-05-25 tasks UX pass: the Tasks page now uses the full content width, expanded tasks span the full task grid, output previews get a full-width reading lane, and task output panels use smaller radii with more internal padding.
- Versioning note: `package.json` app version was bumped to `1.0.7` for the 2026-05-25 pipeline library cache/defaults fix: `/pipeline` forces a fresh load, the persisted pipeline store resets stale `isLoaded`, and pipeline APIs merge bundled defaults with tenant rows so predefined pipelines cannot disappear behind malformed or stale DB/cache state.
- Versioning note: `package.json` app version was bumped to `1.0.8` for the 2026-05-25 SEO audit pipeline upgrade: the default SEO pipeline now mirrors the Pinpointer 10-point website audit structure, Iris asks for a target URL before starting SEO/performance/UX website audits, and config-sourced pipeline rows refresh from bundled defaults so the upgraded pipeline is used even when old seed rows exist in Postgres.
- Versioning note: `package.json` app version was bumped to `1.0.9` for the 2026-05-25 SEO audit URL preflight fix: IrisChat now blocks missing-URL website audits before creating/queuing a mission, `/api/chat` runs the same preflight before mission self-heal, and task execution APIs refuse SEO/UX/performance website audit runs until a target URL is present.
- Versioning note: `package.json` app version was bumped to `1.0.10` for the 2026-05-26 Pinpointer-style SEO report fix: SEO/UX website audits now use `src/lib/server/seo-audit-engine.ts`, which fetches the target URL, extracts metadata/headings/images/links/forms/schema/security evidence, computes 10 weighted category scores, and returns both a dashboard-style rendered HTML artifact and a structured markdown report with critical issues, warnings, fixes, priorities, roadmap, and evidence appendix.
- Versioning note: `package.json` app version was bumped to `1.0.11` for the 2026-05-26 PageSpeed Insights audit upgrade: `seo-audit-engine.ts` now calls Google PageSpeed Insights v5 for both mobile and desktop, uses Lighthouse category scores/metrics/opportunities in the audit, and `docker-compose.yml` exposes `PAGESPEED_API_KEY` / `GOOGLE_PAGESPEED_API_KEY` to the app container.
- Versioning note: `package.json` app version was bumped to `1.0.12` for the 2026-05-26 SEO audit follow-up routing fix: when Iris asks for a missing website URL and the user replies with only the URL, both `IrisChat` and `/api/chat` expand that follow-up into an internal full SEO audit request before mission creation/classification, preventing URL-only replies from becoming generic status-report tasks.
- Versioning note: `package.json` app version was bumped to `1.0.13` for the 2026-05-26 SEO audit report UI fix: `seo-audit-engine.ts` no longer relies on a `<style>` tag inside `renderedHtml` because the artifact sanitizer strips style tags; the report now uses sanitizer-safe inline styles for the score dashboard, PageSpeed table, priority cards, and category deep dives.
- Versioning note: `package.json` app version was bumped to `1.0.14` for the 2026-05-26 multi-page SEO audit upgrade: `seo-audit-engine.ts` now discovers sitemap URLs and internal links, crawls a bounded set of important pages, samples internal link health/redirects, aggregates page-by-page title/meta/H1/word-count/alt/canonical/schema/hreflang signals, and separates public-crawl metrics from metrics requiring Search Console, Analytics, or backlink/rank providers.
- Versioning note: `package.json` app version was bumped to `1.0.15` for the 2026-05-26 Blog Post Writing pipeline: added default `blog-post-writing` pipeline, routed `blog-article` deliverables to it, required Iris to ask for missing blog topic / primary focus keyword before starting, expanded blog output quality requirements to the complete writer checklist, and added optional Google Custom Search context via `GOOGLE_CUSTOM_SEARCH_API_KEY` plus `GOOGLE_CUSTOM_SEARCH_ENGINE_ID` / `GOOGLE_CSE_ID`.
- Versioning note: `package.json` app version was bumped to `1.0.16` for the 2026-05-26 per-user Google Custom Search settings: Settings now stores each user's API key and Search Engine ID in provider secrets, verifies them with a live Custom Search request before enabling, and blog writing tasks require verified search settings before starting live SERP research.
- Versioning note: `package.json` app version was bumped to `1.0.17` for the 2026-05-26 Serper migration: Google Custom Search was replaced with Serper.dev for blog SERP research, Settings now accepts a per-user Serper API key plus country/language/test query, verification calls `https://google.serper.dev/search`, and blog writing tasks require verified Serper settings or `SERPER_API_KEY`.
- Versioning note: `package.json` app version was bumped to `1.0.18` for the 2026-05-26 blog brief follow-up fix: client and server blog preflight now understand natural follow-up replies such as "about X which you can use as the primary keyword" so Iris stops re-asking for topic/keyword after the user provides them.
- Versioning note: `package.json` app version was bumped to `1.0.19` for the 2026-05-26 stronger blog intake fix: blog keyword parsing now accepts quoted phrases followed by "and/as the main focus keyword", educational objective inference catches "importance/why/explain/guide", and client-name prompts continue to infer the matching client so generated posts use client context.
- Versioning note: `package.json` app version was bumped to `1.0.20` for the 2026-05-27 workflow tracking FK fix: `upsertWorkflowExecutionState` now resolves `pipeline_id` against the persisted `pipelines` table and stores missing bundled/default pipeline ids in workflow `context.requestedPipelineId` instead of crashing with a foreign key violation.
- Versioning note: `package.json` app version was bumped to `1.0.21` for the 2026-05-27 blog SEO checklist enforcement fix: blog output specs now require a linked Table of Contents, five title options, a substantive 1,200+ word Article Draft by default, and stronger link/visual/post-publish sections; the quality gate now fails short blog drafts and missing TOCs so the existing repair pass can regenerate them.
- Versioning note: `package.json` app version was bumped to `1.0.22` for the 2026-05-27 provider fallback fix: provider resolution now treats server env-backed Gemini/Anthropic/OpenAI keys as configured fallbacks and `resolveFallbackRuntime` scans all configured fallback providers instead of hard-failing when Ollama returns unauthorized and the saved fallback provider is unavailable.
- Versioning note: `package.json` app version was bumped to `1.0.23` for the 2026-05-27 blog artifact layout fix: blog outputs are split into two artifacts, one planning/SEO package artifact and one copy-ready article draft artifact; the article draft carries the TOC inside the post body and renders as one continuous document instead of separate cards.
- Versioning note: `package.json` app version was bumped to `1.0.24` for the 2026-05-27 simplified blog output format: the first blog artifact is now a compact SEO summary table (summary, focus keyword, secondary keywords, SEO title, slug, meta description) and the second artifact remains one full copy-ready article modeled after a published long-form SEO post.
- Versioning note: `package.json` app version was bumped to `1.0.25` for the 2026-05-27 blog article copy UX fix: copy-ready blog article artifacts now render as one continuous card, use a natural `Quick Navigation` section inside the article instead of `Table of Contents`, strip raw HTML anchor tags, and keep the compact SEO summary separate from the full article draft.
- Versioning note: `package.json` app version was bumped to `1.0.26` for the 2026-05-27 one-artifact blog package fix: blog tasks now save one artifact only, with `Post Settings` first and the full copy-paste `Blog Post` second; the backend no longer creates a separate article artifact, the chat UI no longer creates two local artifacts, and the default long-form blog quality gate now expects at least 2,000 words unless the user asks for a short article.
- Versioning note: `package.json` app version was bumped to `1.0.27` for the 2026-05-28 strict blog writing pipeline/layout fix: blog tasks now require primary focus keyword plus brand/company name, generate a 2,500+ word article using the exact high-scoring 18-section structure, render the full blog post first as one continuous unboxed article, and put all metadata/publishing notes in a separate `Post SEO Settings` part at the end of the same artifact.
- Versioning note: `package.json` app version was bumped to `1.0.28` for the 2026-05-28 blog intake loop fix: blog preflight now treats a selected client, a prompt-matched existing client, and natural "for [brand], about..." phrasing as valid brand/company context, preventing Iris from repeatedly asking for a brand that was already supplied.
- Versioning note: `package.json` app version was bumped to `1.0.29` for the 2026-05-28 two-card blog output fix: blog article outputs now ignore stale saved `renderedHtml`, rebuild the normalized blog package from markdown at view time, and render exactly two cards (`Full Blog Post` and `Post SEO Settings`) while Quick Navigation and all H2/H3 article sections stay inside the single article card as normal copy-paste content.
- Versioning note: `package.json` app version was bumped to `1.0.30` for the 2026-06-04 Meta Ads Intelligence upgrade: `/ads` now uses PinPointer-style campaign search/status filters, campaign cards plus table view, MENA benchmark market selection, objective-family detection, rule-based recommendations, campaign drill-down for ad sets/ads/creatives, paginated Meta account/campaign fetching, and AI optimization that receives deterministic rule findings first. Meta token verification now runs through `/api/providers/verify` server-side and the per-user Settings record stores the primary benchmark market without hardcoded credentials.
- Versioning note: `package.json` app version was bumped to `1.0.31` for the 2026-06-05 Meta campaign KPI card fix: campaign cards now keep Spend, Impressions, and Reach as always-visible top metrics, then render six objective-specific KPI cards starting with the result metric that matches the campaign objective family, such as Leads / Cost per Lead for lead campaigns and Engagements / Cost per Engagement for engagement campaigns.
- Versioning note: `package.json` app version was bumped to `1.0.32` for the 2026-06-05 Analytics and Meta reliability upgrade: Meta Ads date loads now ignore stale responses, campaign selection no longer reloads account data, status filters use Meta `effective_status` / `configured_status`, and selected campaign details show richer status, budget, spend, impression, reach, click, CTR, frequency, and objective KPI data. `/analytics` now uses real GA4 data instead of mock data, with Google Analytics OAuth scope, GA4 property listing, preset dashboards from the GA4 brief, cached server-side Data API reports, and deterministic rule insights.
- Versioning note: `package.json` app version was bumped to `1.0.33` for the 2026-06-05 Google OAuth setup fix: Google OAuth redirects now use `NEXT_PUBLIC_APP_URL` / forwarded host instead of internal `0.0.0.0:3000`, `docker-compose.yml` passes `GOOGLE_REDIRECT_URI` into the container, and the VPS `.env` was populated with Google OAuth client values plus `https://72.62.33.12/api/auth/google/callback`.
- Versioning note: `package.json` app version was bumped to `1.0.34` for the 2026-06-06 Google OAuth domain cutover: the VPS nginx site now serves Mission Control at `https://gem.pinpoint.online` with a Let's Encrypt certificate, and VPS env values `NEXT_PUBLIC_APP_URL` / `GOOGLE_REDIRECT_URI` were updated to the `gem.pinpoint.online` domain so Google OAuth can use a valid public top-level domain.
- Versioning note: `package.json` app version was bumped to `1.0.35` for the 2026-06-06 per-user Google OAuth settings upgrade: Settings now has a Google OAuth App card for Client ID, Client Secret, and the exact callback URI, validates the OAuth Client ID/redirect pairing against Google before saving, stores the secret server-side with provider secrets, and `/api/auth/google` plus the callback prefer the authenticated user's saved OAuth app credentials before falling back to environment variables.
- Versioning note: `package.json` app version was bumped to `1.0.36` for the 2026-06-06 Google Analytics token resilience fix: Google OAuth refresh now uses the saved per-user Client ID/Secret directly against Google's token endpoint, GA4 property/report calls retry once after a forced refresh when Google returns invalid authentication credentials, and the Analytics UI routes expired/invalid Google tokens into a clear reconnect flow instead of a raw API error.
- Versioning note: `package.json` app version was bumped to `1.0.37` for the 2026-06-06 Google OAuth reconnect cleanup: the callback now deletes the existing Google token row before saving a fresh connection so stale refresh tokens from an older OAuth Client ID/Secret cannot survive reconnects, and refresh failures now include Google's returned error code/description instead of the unhelpful `Bad Request` string.
- Versioning note: `package.json` app version was bumped to `1.0.38` for the 2026-06-06 direct GA4 REST fix: GA4 property listing and Data API reports now call Google Analytics REST endpoints with the saved bearer access token directly, avoiding `googleapis` internal refresh behavior that could trigger `invalid_grant` even while the fresh access token was valid; refresh is now only attempted after Mission Control's own expiry check or a real 401 response.
- Versioning note: `package.json` app version was bumped to `1.0.39` for the 2026-06-07 Meta/Google reliability fix: Meta lead-campaign cards now compute Cost / Lead from the same selected-period spend and lead totals shown on the card, while preserving Meta's reported action cost separately; Google Analytics refresh failures with `invalid_grant` now clear the stale Google token and return a clean reconnect state from both properties and dashboard routes.
- Versioning note: `package.json` app version was bumped to `1.0.40` for the 2026-06-07 Meta date-filter and Google connection-state fix: Meta Insights calls now use app-generated Madrid-calendar `time_range` values plus `time_increment=all_days` and `action_report_time=impression` instead of relying on ambiguous preset handling, campaign metadata no longer receives date filters, Google OAuth callback success is logged/validated, and Settings now reads `/api/auth/connections` plus handles `?google=connected` so successful Google connections no longer appear as disconnected.
- Versioning note: `package.json` app version was bumped to `1.0.41` for the 2026-06-07 Madrid Meta/Google follow-up: Settings no longer treats `?google=connected` as proof of a saved token and instead resets OAuth badges from `/api/auth/connections`, Google OAuth callback now read-checks the saved token row before reporting success, and Meta campaign drill-down now fetches daily selected-range insight rows to show delivery evidence/date-range context for cases where a campaign's 7-day and 90-day totals are genuinely identical.
- Versioning note: `package.json` app version was bumped to `1.0.42` for the 2026-06-07 Meta lead-result calculation fix: Meta action parsing now uses a single canonical lead result (`lead`, then explicit lead fallbacks) instead of summing overlapping lead-related action rows, so Leads, Conversions, Cost / Lead, and lead-rate cards no longer double-count the same event.
- Versioning note: `package.json` app version was bumped to `1.0.43` for the 2026-06-07 Google OAuth persistence fallback fix: Google OAuth grants are now saved both to the relational `oauth_tokens` table and to the encrypted per-user provider secret store, and Analytics/connection checks read DB first then the encrypted backup so a disappearing DB row no longer sends users back to the disconnected Analytics screen after a successful consent flow.
- Versioning note: `package.json` app version was bumped to `1.0.44` for the 2026-06-07 Google Analytics retry fix: GA4 property/report calls no longer destroy a freshly issued Google OAuth grant when the Analytics API rejects the access token; refresh-token deletion is limited to genuinely expired grants, and fresh-token API failures are surfaced without bouncing the user back to the disconnected screen.
- Versioning note: `package.json` app version was bumped to `1.0.45` for the 2026-06-07 OAuth JSONB envelope fix: encrypted OAuth token columns are now parsed when Postgres returns JSONB as a string, so Google Analytics receives the decrypted `ya29...` bearer token instead of the raw encrypted JSON envelope.
- Versioning note: `package.json` app version was bumped to `1.0.46` for the 2026-06-07 Analytics storytelling redesign: `/analytics` now follows the seven GA4 dashboard templates from the visualization guide, adds a left AI-powered analysis/recommendation rail, uses executive storytelling panels, and upgrades chart/table widgets into a premium decision dashboard.
- Versioning note: `package.json` app version was bumped to `1.0.47` for the 2026-06-07 Analytics insight engine fix: the left rail now waits for loaded GA4 data, derives storyline panels from actual top channels/sources/pages/campaigns/devices and KPI movement, and replaces generic recommendations with specific evidence-backed actions.
- Versioning note: `package.json` app version was bumped to `1.0.48` for the 2026-06-08 Meta Ads analytics upgrade: `/ads` now extracts purchase value, checkout starts, app installs, messages, and ROAS from Meta insights, shows objective-specific KPI cards for all campaign families, adds a live AI Meta analyst rail with evidence-backed storyline/actions, and makes KPI accent colors meaningful (`healthy`, `watch`, `risk`, `neutral`).
- Versioning note: `package.json` app version was bumped to `1.0.49` for the 2026-06-08 Meta Ads selected-campaign analyst fix: the AI Meta analyst rail now appears as a campaign-specific performance readout only after a campaign is selected, removes the generic Situation/Problem/Answer/Impact storyline labels, and generates strengths, KPI risks, and recommended actions from the selected campaign's own objective KPIs/rule findings instead of mixing account-level or unrelated campaign signals.
- Versioning note: `package.json` app version was bumped to `1.0.50` for the 2026-06-08 Meta Ads interaction/date-range hardening: `/ads` removed the unused manual AI Optimize button/card, clears stale campaigns/summary/selection immediately when account/date range changes, only date-filters Meta Insights requests, waits for selected-campaign detail data before rendering the right-side findings/recommendations, and aligns KPI accent colors with the same market benchmark thresholds used by the recommendation engine.
- Versioning note: `package.json` app version was bumped to `1.0.51` for the 2026-06-08 Meta Ads objective/date-readout fix: aggregate Meta Insights requests now send only explicit `time_range` plus attribution timing, campaign spend cards show campaign start/end context when selected ranges include inactive days, and CTR/CPC are no longer shown or scored as primary findings for awareness/engagement campaigns.
- Versioning note: `package.json` app version was bumped to `1.0.52` for the 2026-06-09 Meta Ads daily campaign verification fix: campaign-card additive KPIs are now rebuilt from `time_increment=1` campaign insights rows filtered to the selected Madrid date range, while aggregate rows are kept for de-duplicated reach/frequency; spend cards also show the active delivery window when daily spend proves why wider ranges can match shorter ranges.
- Versioning note: `package.json` app version was bumped to `1.0.53` for the 2026-06-09 Meta Ads conversion-location KPI fix: campaign and detail APIs now attach ad-set conversion context (`destination_type`, `optimization_goal`, `promoted_object`) to campaigns, Meta action parsing exposes messaging/call results, and `/ads` resolves primary KPI cards/recommendations from objective plus conversion location so WhatsApp lead campaigns use messaging conversations and cost per conversation instead of form leads.
- Versioning note: `package.json` app version was bumped to `1.0.54` for the 2026-06-10 Meta Ads account selector UX fix: `/ads` now sorts Meta ad accounts alphabetically by account name and replaces the native account select with a searchable combobox that filters by name, currency, account id, or internal id.
- Versioning note: `package.json` app version was bumped to `1.0.55` for the 2026-06-10 dev-team audit hardening pass: validated `Mission-Control-Audit.docx`, confirmed and patched SSRF risk in client-brief website enrichment plus SEO crawler fetches with shared public-host/redirect/body-size guards, removed full-session JWT query-token fallback from asset file routes, switched new client asset references to authenticated `/api/client-assets/file/:filename` URLs, replaced loose JSONB substring asset authorization with exact stored asset path matching, and now records relational sync failures into `audit_events` instead of only logging them. The audit's `.fuse_hidden` finding is stale in this checkout; the dual JSONB/relational source-of-truth warning remains a larger architecture item.
- Versioning note: `package.json` app version was bumped to `1.0.56` for the 2026-06-11 virtual office revamp first pass: the Live Office presence engine now routes agents with grid A* around furniture, chooses idle activities from placed amenities (coffee, wellness, seating, tables, IT, decor), exposes pose/facing/activity/progress metadata, and renders agents as animated robot characters with activity bubbles, working progress rings, direct RAF transforms, and visible mood/XP/MC/day-phase HUD instead of simple circular dots.
- Versioning note: `package.json` app version was bumped to `1.0.57` for the 2026-06-11 virtual office visibility fix: `/office` now opens directly into Live Office by default, live mode replaces the editor toolbar with a visible "Live Office active" control bar, and edit mode exposes a clear "Preview Live Office" CTA so the animated agent layer is not hidden behind the builder experience.
- Versioning note: `package.json` app version was bumped to `1.0.58` for the 2026-06-11 virtual office avatar/status fix: live office agents now render with the shared `AgentBot` avatar/photo component used by the rest of the app, the roster uses the same avatars, and presence labels now describe meaningful task work (`Drafting content`, `Researching`, `Studying audience`, `Analyzing data`) or human idle moments (`Drinking tea`, `Chatting strategy`, `Calling friends`) instead of generic movement/system states.
- Versioning note: `package.json` app version was bumped to `1.0.59` for the 2026-06-12 furniture-aware virtual office pass: assets now expose traversal/use contracts (`walkable`, `blocked`, `usable`) and use spots, `office-types.ts` has rotation-aware footprints/use spot helpers, `office-pathfinding.ts` provides shared walk-grid + A* without straight-line fallback, `office-presence.ts` reserves usable spots and routes agents to desks/seating/amenities without walking through furniture, and `OfficeBuilder` rejects overlapping collidable furniture while repairing legacy/template/imported layouts. Regression coverage lives in `tests/office-pathfinding.test.ts`.
- Versioning note: `package.json` app version was bumped to `1.0.60` for the 2026-06-15 Google Ads Intelligence build: the app now requests the Google Ads OAuth scope, stores per-user Google Ads developer token / manager customer / default customer / benchmark market settings, adds Google Ads REST API routes for accounts, campaign metrics, and campaign drill-downs, and introduces `/google-ads` with searchable alphabetized accounts, date/status/campaign filters, campaign-type/objective-aware KPI cards, and a selected-campaign AI analyst rail for Search, Performance Max, Shopping, Video, Display/Demand Gen, App, and sales/lead/traffic/awareness objectives.
- Versioning note: `package.json` app version was bumped to `1.0.61` for the 2026-06-16 Google Ads access diagnostics fix: Google Ads API failures now parse GoogleAdsFailure detail codes, return the real Google HTTP status/request id/code to the UI, show actionable messages for developer-token approval, token validity, missing scope, and customer/MCC permission errors, and account discovery calls `customers:listAccessibleCustomers` without an unnecessary `login-customer-id` header.
- Versioning note: `package.json` app version was bumped to `1.0.62` for the 2026-06-16 Google Ads raw 403 follow-up: Google Ads requests now read and surface raw non-JSON Google error bodies, log sanitized failure diagnostics on the server, Settings verification uses the same raw-body fallback, and `/google-ads` keeps the detailed error card visible instead of replacing account-load failures with the generic connect screen.
- Versioning note: `package.json` app version was bumped to `1.0.63` for the 2026-06-16 Google Ads disabled-customer handling fix: account discovery now parses Google Ads array-shaped error payloads, tests each accessible customer, skips disabled/deactivated or otherwise non-queryable customers instead of selecting placeholder accounts, and only uses a saved default customer if it is actually queryable.
- Versioning note: `package.json` app version was bumped to `1.0.64` for the 2026-06-17 Default Model selector fix: Settings > Agency Profile now builds the Default Model dropdown from each provider's verified saved model inventory plus the built-in catalog, so newly available Ollama/Gemini/Anthropic/OpenAI models appear automatically while unknown custom model ids remain selectable.
- 2026-06-14 prompt review note: `PROMPTS_AUDIT.md` now inventories the app's prompt system across Iris chat, autonomous execution, content calendar, creative asset generation, client brief extraction, Meta optimization, scheduled tasks, agent persona packs, skill packs, pipelines, prompt safety, and output quality/artifact splitting. The audit recommends a versioned prompt registry, prompt snapshot tests, stronger client-context contracts, staged long-form blog generation, evidence-first analytics prompts, scheduled-task unification with the autonomous runner, and a skill-library cleanup pass.
- `CLAUDE.md` has stale auth statements in early sections saying cookies are not live. Current code and `HANDOFF.md` say cookie migration is live.
- `execution-queue.ts` is in-memory/process-local, so production task queue durability depends on no app restart during execution.
- Remaining client-context risk: tasks can still be intentionally generic if no client is selected and no client can be inferred from the prompt. The runner now preserves/infer-fills `client_id` when bootstrap data, active chat client, prompt client-name match, or single-client tenant context exists.
- Remaining progress risk: `execution-queue.ts` is in-memory, so process restarts can still interrupt live task state. Within a single run, event/workflow progress is now monotonic.

## Next Review Batch

1. Root config files: `next.config.mjs`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`, `.dockerignore`, `.gitignore`, env examples.
2. Docker support files, especially `docker/init.sql` and nginx config.
3. Scripts folder.
4. Continue through `src/lib/server` in dependency order.
