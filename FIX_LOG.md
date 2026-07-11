# Mission Control — Fix Log

> **Started:** 2026-05-15
> **Reference docs:** `AUDIT_REPORT.md` (executive summary) and `MemoryForAudit.md` (full findings catalog).
> **Approach:** Apply fixes in coherent batches; log each one with finding ID → file(s) changed → outcome.

---

## 2026-07-11 · Runtime wiring repair · v1.0.77

- Made pipeline/skill IDs tenant scoped with composite keys and foreign keys.
- Removed the legacy default-agency behavior from all skill APIs.
- Made agent role routing clone-aware across every department and backfilled the complete roster.
- Validated AI-authored pipeline roles/prompts and marked specialized pipelines with their real dedicated runtime engines.
- Replaced the process-memory task queue with durable PostgreSQL jobs, locking, heartbeats, restart recovery, and visible failures.
- Routed manual and cron scheduled tasks through the canonical task orchestrator.
- Added runtime and optional database integration tests; upgraded Vitest; enabled ESLint.
- Validation: PostgreSQL 16 clean install and legacy migration passed; 91 tests passed; typecheck, lint (0 errors), and production build passed.

## 🎯 Product reframe (per user direction, 2026-05-15)

- App is for **any company doing AI-assisted workflows**, not just marketing agencies. Iris is the central knowledge agent who knows the company setup.
- The 10 current agents (atlas, dex, echo, finn, iris, lyra, maya, nova, piper, sage) are **templates/seeds**, not hardcoded. Each tenant can clone them, customize them, start blank, or build their own via Iris.
- Skills library will **keep growing**. Users + Iris must be able to add new skills.
- Users + Iris must be able to **create and configure pipelines** for their business.
- **Team collaboration**: tenant members share clients/pipelines/assets; tenant admin assigns access per resource.
- **Stripe** = deferred (proof-of-concept phase). Make plug-and-play, leave disabled.
- **Backup + staging** = deferred until ready for production launch.
- **Supabase** = completely removed from the ecosystem. Purge every reference: `supabase/migrations/` folder, `.env.local.example` Supabase keys, any `@supabase/*` imports, the `db/config.ts` Supabase helpers, the legacy comments. Self-hosted Postgres is the only DB.
- **Meta + Google + 3rd party integrations** = solidify NOW.
- **Long-term vision**: virtual companies where AI employees learn over time, understand client context, follow pipelines/skills → super-customized ChatGPT/Claude alternative.

---

## 📋 Batch order

| Batch | Focus | Status |
|---|---|---|
| A | Critical security (path traversal, file-serving auth, share token, HTML sanitize, disable open billing) | ✅ done (JWT-cookie split into A8, moved to its own ticket) |
| B | DB schema integrity (FK fix, office_layouts, triggers, drift reconcile) **+ full Supabase removal** | ✅ done |
| C | Team collaboration (tenant-shared, ACL, open settings to members) | ✅ done |
| D | De-hardcode agents/pipelines/skills (DB-backed, Iris-assisted) | ✅ done (scaffolding) |
| E | Auth hardening (verify, reset, rate limit, email invites) | ✅ done (JWT→cookies split to follow-up) |
| F | Provider secrets encryption | ✅ done |
| G | Integration solidification (Meta, Google OAuth, Higgsfield, email) | ✅ done |
| H | AI engine robustness (injection defense, budgets, i18n) | ✅ done (i18n deferred to follow-up) |
| I | Code quality + dead code | ✅ done |
| J | Stripe scaffold (plug-and-play, deferred) | ✅ done |
| K | Tests + CI | ✅ done |
| L | Backup + staging (deferred per user) | ⬜ deferred |

---

## Batch A — Critical security fixes

### Status legend
- ✅ done
- 🟡 in progress
- ⬜ pending
- ⏭️ deferred / not applicable

### A1 — Path-traversal LFI in image-production.ts (C-17)
**Status:** ✅ done
**What changed:** Added `isPathInsideAllowedRoot()` and `safeJoin()` helpers in `src/lib/server/image-production.ts`. Every path returned by `resolveAssetPath()` is now `path.resolve`-normalized and verified to live inside `CLIENT_UPLOADS_DIR` or `GENERATED_UPLOADS_DIR`. Absolute paths get the same check. Closes the `../../../etc/passwd` and `/proc/self/environ` exfiltration vector.

### A2 — Disable open /api/billing/upgrade until Stripe wired (C-22)
**Status:** ✅ done
**What changed:** Added `STRIPE_ENABLED` feature flag. When off, non-super-admin callers get 503 + `code: BILLING_DISABLED`. Super-admins can still change plans directly for testing/comping. When on, builds a Stripe Checkout session (dynamic `import('stripe')`) and returns `checkoutUrl`; the webhook commits the DB change post-payment. Free-plan downgrade always direct.

### A3 — Disable unsigned Stripe webhook (C-21)
**Status:** ✅ done
**What changed:** Same `STRIPE_ENABLED` gate. When on, the route requires `STRIPE_WEBHOOK_SECRET` + `STRIPE_SECRET_KEY` and verifies the signature via `stripe.webhooks.constructEvent()` before dispatching. Event handlers now correctly handle the `string | Subscription` vs `Subscription` union types.

### A4 — Sanitize HTML in share-output render (C-26)
**Status:** ✅ done
**What changed:** Added `isomorphic-dompurify` dep; the share page sanitizes `rendered_html` with a strict whitelist (no `<script>`, `iframe`, `object`, etc.; no event-handler attributes; `javascript:` URIs blocked) before `dangerouslySetInnerHTML`.

### A5 — Require share token for /share/output/[id] (C-25)
**Status:** ✅ done
**What changed:**
- Added `share_token UUID`, `share_expires_at TIMESTAMPTZ`, `share_created_at`, `share_created_by` columns to `outputs` (via `docker/migrations/20260515_share_tokens.sql` for existing prod DB + updated `docker/init.sql` for fresh deploys).
- New API: `POST /api/outputs/[id]/share` generates a token (1–365 day expiry, default 30); `DELETE` revokes.
- Share page now requires `?t=<token>` and checks token + expiry. Without a token it 404s — UUID enumeration alone reveals nothing.

### A6 — Auth + tenant-scope file-serving routes (C-23, C-24)
**Status:** ✅ done
**What changed:**
- `/api/agent-photos/file/[filename]`: requires auth (Bearer header OR `?token=` query param so `<img>` works); checks that the photo is referenced by an agent in the caller's tenant; adds defense-in-depth path-traversal check.
- `/api/agent-photos` GET: filters returned photo map to the caller's tenant's agents.
- `/api/client-assets/file/[filename]`: same auth pattern; checks that the filename is referenced by a client in the caller's tenant (LIKE match on `brief::text`, `metadata::text`, `knowledge_summary`); searches both legacy flat layout and new per-client subdir layout; SVG responses get a strict CSP header.

### A7 — Strip secrets from /api/providers/settings GET (M-37)
**Status:** ✅ done
**What changed:** Both `GET` and `POST` responses now run through `stripProviderSecrets()`. Real keys never cross the network — clients receive masked versions only. POST `mergePersistedProviderSettings` preserves real keys on the server side even when the client sends empty `apiKey` fields.

### A8 — JWT into httpOnly cookies (C-6) — DEFERRED to Batch E
**Why:** Moving JWT storage requires changes across all client fetch sites (~50+ files) and SessionGate, plus CSRF tokens. It's better done as a focused batch alongside email-verification + password-reset work (Batch E) so all auth changes ship together.

---

## Pending batches — to be detailed when reached

Batches B–L will be expanded with concrete plans as each is started.

---

## Change log (chronological)

### 2026-05-17 · Batch K complete · typecheck ✅ · 55/55 tests passing · CI configured

**First test suite — 55 passing tests covering the security-critical seams:**

| File | Coverage |
|---|---|
| `tests/prompt-safety.test.ts` (18) | Injection bypass attempts (override, role-switch, prompt-extraction, template interpolation, fenced code, boundary-tag escape, pasted API keys, control chars). |
| `tests/text-utils.test.ts` (8) | `escapeHtml`, `truncate`, `looksLikeBoilerplateResponse` (the canonical detector reused across chat/route + autonomous-task). |
| `tests/secret-crypto.test.ts` (8) | AES-256-GCM round-trip, fresh-IV per call, tamper detection on tag and ciphertext, envelope-shape validation. |
| `tests/agent-templates.test.ts` (10) | `isOrchestratorAgent` + `findAgentByTemplate` against legacy `id='iris'`, new `id='iris-<suffix>'`, metadata-driven, and prefix-only forms. |
| `tests/intent-classifier.test.ts` (11) | Conversational vs work-request routing; social-post-vs-creative-asset regression (Fix #91); content-calendar / strategy-brief detection. |

**Real bug caught and fixed during test authoring:**
- `prompt-safety.ts` `INSTRUCTION_OVERRIDE_PATTERNS[0]` didn't match phrasings with intervening determiners (e.g. "Override the above directives"). Strengthened the regex to allow 0-2 optional words between the verb and the temporal modifier — so "ignore the above", "disregard all prior", "forget any earlier", "skip the past" all now redact correctly.

**Test framework:** Vitest 2.1 (Node environment, pure-function tests so no Next.js runtime / DB needed). Runs in ~1.3s.

**Scripts in package.json:** `npm test` (single run, CI gate) and `npm run test:watch` (dev).

**CI workflow added:** `.github/workflows/ci.yml`
- Triggers: every push + every PR against `main`.
- Steps: install (`npm ci`), `npm run typecheck`, `npm test`. Plus a `npm run build` step that only runs on direct pushes to `main` (slow Next build is skipped on PRs but still catches build regressions before deploy).
- Build step uses stub env vars so the build doesn't need real secrets in CI.

**Validation:** `npx tsc --noEmit` clean; `npm test` → 55/55 passing in 1.3s.

### 2026-05-17 · Batch J complete · typecheck ✅

**Stripe scaffold consolidated — plug-and-play when you're ready to launch:**

The Stripe-touching surface (upgrade, webhook) was already gated on `STRIPE_ENABLED` from Batch A. This batch cleaned up the duplication and added the missing pieces:

- **New `src/lib/server/stripe.ts`** — single source of truth:
  - `STRIPE_API_VERSION = '2024-12-18.acacia'` pinned in one place.
  - `isStripeEnabled()` / `hasStripeSecret()` checks the routes call before touching Stripe.
  - `getStripe()` — lazy, dynamic-import client (so `stripe` stays in `optionalDependencies` and the dep doesn't bloat dev installs).
  - `getStripePriceIdForPlan(planId)` — resolves a plan's `stripe_price_id` from the DB.
  - `getStripeCustomerIdForTenant(tenantId)` — looks up the tenant's existing customer.
- **New endpoint `POST /api/billing/portal`** — opens a Stripe Customer Portal session so customers can update their card, cancel, download invoices. Restricted to tenant admins. Returns `code: BILLING_DISABLED` (503) when the flag is off, `code: NO_STRIPE_CUSTOMER` (409) when the tenant hasn't upgraded yet.
- `/api/billing/upgrade` and `/api/billing/webhook` refactored to import the shared helpers — no more inline `new Stripe(secret, { apiVersion })` calls or duplicate env-var validation.

**To enable billing in production:**
1. Set in `/opt/mission-control/.env`: `STRIPE_ENABLED=true`, `STRIPE_SECRET_KEY=sk_live_…`, `STRIPE_WEBHOOK_SECRET=whsec_…`.
2. In Stripe Dashboard, create products + recurring prices for `starter`, `growth`, `enterprise`. Copy the `price_…` ids into `plans.stripe_price_id` via the existing `/admin/plans` UI.
3. Add webhook endpoint `https://<your-domain>/api/billing/webhook` in Stripe Dashboard subscribed to `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`.
4. Restart the app.

**No DB migrations needed** — all columns were already in place from Batch B.

**Validation:** `npx tsc --noEmit` clean.

### 2026-05-17 · Batch I complete · typecheck ✅

**Dead files removed (~706 MB reclaimed):**
- `node_modules_broken_20260331/` (704 MB)
- `launcher-apps/` (1.7 MB) · `launcher-assets/` (700 KB) · `start-mission-control.sh` · `stop-mission-control.sh` · `README-LAUNCHER.txt`
- `appscript.md` (legacy Google Apps Script note)
- `.sandbox.log` (1.3 MB) · `.sandbox.pid` · `.mission-control-server.pid` · `.playwright-cli/`
- Stray `.DS_Store` files in root, `src/`, `data/`, `public/`

**Code de-duplication:**
- **New** `src/lib/server/text-utils.ts` — centralised `escapeHtml()`, `truncate()`, and `looksLikeBoilerplateResponse()` (the canonical "AI returned coordination boilerplate" detector).
- Removed 4 inline `escapeHtml()` copies from `output-html.ts`, `creative-asset-engine.ts`, `content-calendar-engine.ts`. Left the client-side copy in `ArtifactOutputView.tsx` (server-only modules can't be imported there) with a comment explaining why.
- Replaced `autonomous-task.ts:isInvalidFinalDeliverable` body with `looksLikeBoilerplateResponse()`.
- Collapsed `chat/route.ts:enforceDeliverableDraft` + `looksLikeUsableDeliverable` onto the same helper. Inline string-match lists are gone.

**Iris-id lookup hardened (Batch D follow-up):**
- `task-channeling.ts` cap lookup + orchestration-trace skip now treat both `'iris'` (legacy) and `'iris-<suffix>'` (new tenant clones) as the orchestrator. Closes the two remaining `agentId === 'iris'` holdouts the audit flagged.

**Config cleanup:**
- `tsconfig.json`: removed stale `mission-control-claude-genspark_ai_developer` and `PenPoint` excludes (those directories never existed in this repo); upgraded `target` from ES2017 → ES2022 (Node 20+ Next 16 ergonomics); removed the dangling `.next/dev/types/**/*.ts` include path.
- `docker-compose.yml`: dropped the obsolete `version: "3.9"` line (every compose call had warned about it); added env wiring for `CRON_SECRET`, `PROVIDER_SECRETS_MASTER_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`, `STRIPE_ENABLED`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `META_GRAPH_API_VERSION`, `HIGGSFIELD_BASE_URL` (Batches E–J groundwork).
- `.gitignore`: removed entries for now-deleted dirs (`node_modules_broken_20260331/`, `playwright-cli/`); added `.sandbox.log`, `.sandbox.pid`, and `.claude/` (auto-memory dir is per-machine).

**Validation:** `npx tsc --noEmit` clean.

### 2026-05-17 · Batch H complete · typecheck ✅ · prod DB migrated ✅

**Per-tenant token budgets (H-56 fixed):**
- **New columns** on `subscriptions`: `monthly_token_budget_usd NUMERIC(10,2)` (NULL = unlimited) and `monthly_token_warning_pct INT` (default 80, CHECK 10–100).
- **New helper** `src/lib/server/token-budgets.ts` — `getTokenBudgetStatus(tenantId)` and `assertTokenBudget(tenantId)`. Sums `token_usage.cost_usd` within the billing cycle (or calendar month when Stripe isn't wired yet). Throws `TokenBudgetExceededError` with `code: 'TOKEN_BUDGET_EXCEEDED'` for callers to convert into 402.
- **Wired into** `/api/chat` and `/api/iris/create-{agent,pipeline,skill}` — every LLM-burning endpoint now hard-stops at the cap.
- **`/api/token-usage`** surfaces `budget: { budgetUsd, usedUsd, remainingUsd, warningThresholdPct, exceeded, warning, cycleStart, cycleEnd }` for dashboards.

**Prompt-injection defence hardened (C-18 fixed):**
- **Rewrote** `src/lib/server/prompt-safety.ts`:
  - `sanitizePromptValue()` now strips a broader set of injection phrasings (ignore/disregard/override/forget/skip prior instructions, role overrides like "act as", "you are now", mode-switches, prompt-extraction attempts like "reveal your system prompt"), neutralises template interpolation `{{}}`, removes accidental fenced-code markers, and redacts pasted OpenAI / Gemini API keys.
  - **New** `wrapUserInput(value, tag)` returns the value wrapped in `<user_input>…</user_input>` (or `<client_brief>` / `<uploaded_document>`) with a leading instruction telling the model the content is DATA, not commands. This is the boundary the AI engines should use everywhere external text flows into a prompt.
  - **New** `quoteInline()` for short inline quoting.

**Tenant-configurable content defaults (H-47, H-48 fixed):**
- **New helper** `src/lib/server/content-defaults.ts` — `getTenantContentDefaults(tenantId)` reads `agencies.settings.contentDefaults` JSONB with a 60s in-memory cache; falls back to generic "TBD — confirm with the client" placeholders rather than agency-specific hardcodes.
- **`autonomous-task.ts`** `buildClientProfileMap()` now accepts an optional `tenantDefaults` arg; `executeAutonomousTask()` plumbs `tenantContentDefaults` through from the chat route.
- **`/api/chat/route.ts`** loads tenant defaults alongside pipelines + skills.
- **`content-calendar-engine.ts`** `getPostingFrequencySummary()` + `getPlatforms()` + the platforms line in the calendar prompt now use upstream-supplied defaults; engine-level fallbacks are intentionally generic.

**Migrations applied on live VPS:**
- `docker/migrations/20260517_token_budgets.sql` ✓

**Deferred to a follow-up batch (logged as H-bis):**
- **i18n classifier (H-32)** — Arabic translation of `TASK_KEYWORDS`, `STRATEGIC_TASK_SIGNALS`, etc. in `src/lib/intents/intent-classifier.ts`. Best done with native speakers.
- **DB-backed deliverable registry (H-33)** — the 23 deliverable types are still hardcoded; moving to DB-backed entries is a substantial refactor and tenants can already extend via custom pipelines + skills.

**Validation:** `npx tsc --noEmit` clean. Migration verified on prod.

### 2026-05-17 · Batch G complete · typecheck ✅ · prod DB migrated ✅

**Real OAuth-token storage (no more stub redirects):**
- **New table** `oauth_tokens` — per `(user_id, provider)`, holds AES-256-GCM envelopes for access + refresh tokens, plus scope, accountEmail, expires_at. Trigger keeps `updated_at` fresh.
- **`src/lib/server/oauth-tokens.ts`** — `saveOAuthToken / getOAuthToken / deleteOAuthToken / isAccessTokenExpired`. Returns plaintext to callers, transparently encrypted at rest. Refresh-token preservation: `ON CONFLICT … COALESCE(EXCLUDED.refresh_token_encrypted, oauth_tokens.refresh_token_encrypted)` so Google's "only-on-first-consent" refresh-token doesn't get wiped on subsequent connects.

**Google OAuth fixed end-to-end (C-10, C-11):**
- **New** `/api/auth/google/callback/route.ts` — Google's redirect target now exists. Exchanges code for tokens, fetches userinfo for `accountEmail`, persists encrypted.
- **`/api/auth/google`** — initiator only; signs a short-lived state JWT containing the calling user id; uses `access_type: offline` + `prompt: consent` so a refresh token is always issued.
- **`src/lib/google-integrations.ts`** — `getGoogleClientForUser(userId)` returns a fully-credentialled OAuth2 client, auto-refreshing the access token + rewriting the stored row when expired. The broken `getGoogleAdsData()` (H-22) is gone.

**Meta OAuth fixed (C-10, C-11, H-69, H-68):**
- **`/api/auth/meta`** — single route, both legs. Signs state JWT. Exchanges code, upgrades to long-lived (~60d) token, fetches `/me` for accountEmail, persists encrypted.
- Meta Graph version moved to `META_GRAPH_API_VERSION` env (default `v20.0`).
- **All Meta integration routes (`insights`, `accounts`, `campaigns`)** now read the token via `getOAuthToken(userId, 'meta')` first, fall back to legacy `providerSettings.meta.accessToken`, and pass the token as `Authorization: Bearer` — NOT in the URL query string (H-69).

**Higgsfield (H-70):**
- `HIGGSFIELD_BASE_URL` env override added to `/generate` and `/status` routes; default unchanged.

**Email dispatcher (the Batch E stub is now Batch G-ready):**
- `src/lib/server/email.ts` Resend path is wired and conditional on `RESEND_API_KEY`. To go live: set `RESEND_API_KEY` + `EMAIL_FROM` in `/opt/mission-control/.env` and restart. No code changes needed; the stub keeps logging in dev.

**Migrations applied on live VPS:**
- `docker/migrations/20260517_oauth_tokens.sql` ✓

**To enable the encrypted-tokens path in prod:**
1. Set `PROVIDER_SECRETS_MASTER_KEY` (see Batch F notes).
2. (Optional) Set `RESEND_API_KEY` + `EMAIL_FROM` for real email delivery.
3. (Optional) Set `META_GRAPH_API_VERSION`, `HIGGSFIELD_BASE_URL` if upstream versions change.
4. Restart: `docker compose up -d app`.

**Validation:** `npx tsc --noEmit` clean. Migration verified on prod.

### 2026-05-17 · Batch F complete · typecheck ✅

**Provider secrets encrypted at rest:**
- **`src/lib/server/secret-crypto.ts`** — AES-256-GCM envelope encryption using Node's built-in `crypto`. Master key from `PROVIDER_SECRETS_MASTER_KEY` (base64 or hex, 32 bytes). Each save generates a fresh 12-byte IV; auth tag verified on read. Tamper or wrong key → decrypt throws (no silent data loss).
- **`src/lib/server/provider-secrets.ts`** — reads transparently detect plaintext vs envelope (legacy files keep working); writes upgrade the file to an encrypted envelope when the master key is set; without the key, falls back to plaintext with a one-time `console.warn` so dev/POC keeps working.
- **C-20 fixed**: removed `readLocalEnvGeminiKey` env merge that leaked `process.env.GEMINI_API_KEY` into every user's settings. Each tenant manages their own keys.
- **H-52 fixed**: removed `writeLocalEnvGeminiKey` — Docker filesystem dropped it on rebuild anyway, and it was a confusing source-of-truth duplication.

**Iris-authoring cost guardrails:**
- Added 20-req/hour/user rate limits to `/api/iris/create-{agent,pipeline,skill}` so a runaway client can't burn through LLM credit drafting endless agents.

**To enable encryption on the live VPS:**
1. Generate a master key: `openssl rand -base64 32`
2. Add `PROVIDER_SECRETS_MASTER_KEY=<value>` to `/opt/mission-control/.env`
3. Restart the app: `docker compose up -d app`
4. First write after restart upgrades the file in-place. No data migration required.

**Validation:** `npx tsc --noEmit` clean.

### 2026-05-17 · Batch E complete · typecheck ✅ · prod DB migrated ✅

**Self-serve onboarding is now real.** The four giant gaps (no email verification, no password reset, no rate limiting, no real invitations) all closed.

**New tables (migration `20260517_auth_tokens.sql`, mirrored in init.sql):**
- `email_verification_tokens` — single-use, 24h default expiry.
- `password_reset_tokens` — single-use, 1h default expiry.
- `tenant_invitations` — single-use, 7d default expiry, CHECK on role.
- `rate_limit_buckets` — durable counter store for auth-endpoint limits.

**New helpers:**
- `src/lib/server/email-tokens.ts` — token generation/validation/consumption primitives reused by every auth flow.
- `src/lib/server/email.ts` — pluggable transactional-email dispatcher. Stub (server-log) by default, swaps to Resend when `RESEND_API_KEY` is set. Pre-built templates for verification / reset / tenant-invite.
- `src/lib/server/rate-limit.ts` — two-tier limiter: in-memory token bucket (fast) + durable DB counter (auth endpoints, survives restarts). `getClientIp()` reads `x-forwarded-for` / `x-real-ip`.

**Auth endpoints:**
- **`POST /api/auth/register`** — sends verification email + rate-limit 5/hour/IP. Returns JWT immediately but with `emailVerified: false` so the UI can show a banner.
- **`POST /api/auth/session` (login)** — two-axis rate limit: 30/10min per IP + 10/10min per email. Returns `emailVerified` flag on the user object.
- **`POST /api/auth/verify-email`** — consumes the token, marks `users.email_verified_at`. Body can be `{ token }` to verify or `{ email }` to request a fresh link. Idempotent (consumed tokens → 410 Gone).
- **`POST /api/auth/forgot-password`** — generates a reset token + emails it. Generic 200 response regardless of email existence (prevents account enumeration). Per-IP + per-email rate limits.
- **`POST /api/auth/reset-password`** — consumes the token, updates password_hash, invalidates all other outstanding reset tokens for the user.

**Tenant invitations (replaces the old temp-password-in-JSON flow):**
- **`GET    /api/tenant/invitations`** — list active invites for caller's tenant.
- **`POST   /api/tenant/invitations`** — admin invites an email; backend generates token + sends email; never returns a password.
- **`DELETE /api/tenant/invitations?token=…`** — revoke pending invite.
- **`POST   /api/tenant/invitations/accept`** — three-flow handler: (a) authenticated user joins, (b) email already has an account → 401 with `SIGN_IN_REQUIRED`, (c) brand-new user creates account + auto-verifies + joins + receives JWT.

**Chat rate limit:** 60 messages / 5 min per user on `/api/chat`. Returns 429 + `Retry-After` header instead of letting one user burn through the tenant owner's API budget.

**Validation:** `npx tsc --noEmit` clean. Migration applied on prod (`20260517_auth_tokens.sql`).

**Scope split out — JWT in httpOnly cookies (C-6):** moved to its own follow-up batch. It requires changing ~50 client fetch sites + SessionGate + adding CSRF tokens. Better done as a focused refactor once the rest of the auth surface stabilizes. Recorded as **Batch E2** in `MemoryForAudit.md`.

### 2026-05-17 · Batch D complete · typecheck ✅ · prod DB migrated ✅

**The product reframe lands.** Mission Control is no longer "an agency app with 10 named agents." The 10 bundled agents are now TEMPLATES that each tenant clones (or ignores) when building their own virtual company.

**Templates registry (`src/lib/server/agent-templates.ts`):**
- `listAgentTemplates()` exposes the catalogue of starter agents.
- `cloneAgentTemplates(tenantId, templateIds[])` inserts namespaced clones (`<templateId>-<short-uuid>`) into the tenant. Idempotent — already-cloned templates are skipped via `metadata.templateId` tracking.
- `seedTenantRequiredAgents()` wraps `cloneAgentTemplates` for the bootstrap-required set (currently `['iris']`).
- `isOrchestratorAgent(agent)` and `findAgentByTemplate(agents, templateId)` — template-aware lookups that work for legacy single-tenant rows AND new namespaced clones.

**Auto-seed Iris on tenant creation (`src/lib/server/tenants.ts`):**
- `createTenant()` now calls `seedTenantRequiredAgents(tenantId)` after subscription provisioning. Failure is logged but non-fatal — admins can manually re-seed via the API.

**New endpoints:**
- `GET /api/agent-templates` — catalogue of starter templates (auth required, app-wide).
- `POST /api/agent-templates/clone` — clone one or more templates into the caller's tenant; plan-tier capacity check; returns `insertedIds` + `skipped`.
- `POST /api/iris/create-agent` — natural-language brief → LLM-drafted agent definition → DB row. `autoPersist=false` returns the draft only.
- `POST /api/iris/create-pipeline` — same pattern for pipelines (phases/activities/role assignments/checklists/clientProfileFields).
- `POST /api/iris/create-skill` — same pattern for skills (prompts/checklist/workflow/output template).
- New helper module `src/lib/server/iris-authoring.ts` houses the LLM-draft + persist logic for all three endpoints; reuses `generateText` + `resolveTaskRuntime` + `sanitizePromptValue`.

**Engine call sites updated (`autonomous-task.ts`, `creative-asset-engine.ts`, `content-calendar-engine.ts`):**
- Replaced ~10 `agentMap.get('templateId')` lookups with `findAgentByTemplate(agentMap.values(), 'templateId')` so engines work for both legacy and namespaced clones.
- Replaced `agent.id === 'iris'` with `isOrchestratorAgent(agent)` in the autonomous-task lead-finder and step-role classifier.

**Live prod migration applied (`docker/migrations/20260517_backfill_iris.sql`):**
- Backfilled Iris into the real `mission-control` tenant (1 agent, has_iris=true).
- Subscription `current_agent_count` refreshed.
- The legacy `default-agency` placeholder tenant didn't receive a row due to the global `agents.id` PK colliding with `mission-control`'s 'iris' (correct behaviour — `default-agency` is an unused fallback to be cleaned up later).

**Validation:** `npx tsc --noEmit` clean. Migration committed to prod.

**Out of scope, deferred:**
- Onboarding wizard UI: detect "tenant has only Iris" → guide the user to clone other templates or ask Iris to create something custom. Spec'd, will land in Batch I (UX cleanup) once the security work is done.
- Live UI buttons calling the new `/api/iris/create-*` endpoints — the routes exist server-side; UI hooks are a follow-up.
- The two minor `agentId === 'iris'` string comparisons in `task-channeling.ts` (caps lookup + trace skip) — non-breaking, will tidy in Batch I.

### 2026-05-16 · Batch C complete · typecheck ✅ · prod DB migrated ✅

**Team collaboration model (tenant-shared with optional per-resource ACL):**
- **H-72 fixed**: `filterStateForUser(state, userId)` replaced with `filterStateForCaller(state, userId, isTenantAdmin)`. Tenant members now see ALL their tenant's clients/missions/artifacts by default. Per-resource `assignedUserIds` array gates access when populated.
- **H-23 / H-24 fixed**: `/api/admin/assignments` and `/api/admin/backfill-ownership` now tenant-scoped. Cross-tenant ownership reassignment blocked; new owner must belong to same tenant (super-admin bypass for platform ops). Backfill optionally takes `?tenantId=X` for super-admin; otherwise scoped to caller's tenant.
- **H-14 fixed**: `SessionGate` rewritten — `/settings` `/skills` `/pipeline` are now open to all authenticated members. `/admin` and `/config` reserved for super_admin; `/users` reserved for tenant admins.
- **H-73 fixed**: `default-agency` fallback removed from chat route (`loadPipelines(tenantId)` / `loadSkills(tenantId)` require explicit tenantId) and from `relational-sync.loadRelationalAppState` (returns null without tenantId). The legacy `getDefaultAgencyId` function is gone.
- **New** `assigned_user_ids UUID[]` columns on clients/tasks/outputs with GIN indexes — empty = tenant-shared, non-empty = restricted to listed users + tenant admins.
- **New** `/api/admin/resource-access` endpoint (GET / PUT) for tenant admins to manage per-resource ACL. Validates that all assigned users belong to the same tenant.
- **New file** `docker/migrations/20260516_resource_acl.sql` — applied successfully on prod.
- `init.sql` updated with the same columns + indexes for fresh deploys.

**Files changed:**
- `src/app/api/state/route.ts` — new `canSeeResource()`, `filterStateForCaller()`, `mergeTenantCollection()`, `mergeScopedState()` (signature change, plumb `isTenantAdmin`).
- `src/components/auth/SessionGate.tsx` — split path prefixes into super_admin-only vs tenant-admin-only.
- `src/app/api/admin/assignments/route.ts` — tenant-scoped queries, validates new owner in same tenant.
- `src/app/api/admin/backfill-ownership/route.ts` — opens to tenant admin, accepts `?tenantId=` for super-admin.
- `src/app/api/chat/route.ts` — `loadPipelines(tenantId)`, `loadSkills(tenantId)`; removed `getDefaultAgencyId()`.
- `src/lib/db/relational-sync.ts` — `loadRelationalAppState` returns null without tenantId; row visibility filtering moved to api/state layer (was previously user-siloed).
- `src/app/api/admin/resource-access/route.ts` — new endpoint.

**Validation:** `npx tsc --noEmit` clean. Migration applied on prod.

### 2026-05-16 · Batch B complete · typecheck ✅ · prod DB migrated ✅

**Schema integrity (init.sql rewrite + prod migration applied):**
- **C-1 fixed**: FK ordering bug — `init.sql` now creates `users` → `plans` → `agencies` (with inline owner_user_id FK) → `profiles` in correct order; no more broken `ALTER TABLE agencies ADD CONSTRAINT` before the table exists.
- **C-2 fixed**: `office_layouts` table now in `init.sql` with `mc_credits INT` + `owned_assets TEXT[]` + correct defaults. Confirmed on prod.
- **C-5 fixed**: 15 `updated_at` triggers installed on prod via the new `set_updated_at_timestamp()` function. Verified via `information_schema.triggers`.
- **H-1 fixed**: `tasks.client_id` FK now `ON DELETE SET NULL` (was no-clause).
- **H-3 fixed**: `created_at` / `updated_at` defaults added to tasks, outputs, clients, conversations, agents, skills, pipelines.
- **H-4 fixed**: Added FK constraints with `ON DELETE SET NULL`/`CASCADE` to `tasks.lead_agent_id`, `tasks.pipeline_id`, `outputs.agent_id`, `outputs.client_id`, `outputs.task_id`, `outputs.owner_user_id`, `task_assignments.agent_id`, `task_assignments.agency_id`, `conversations.client_id`, `conversations.task_id`. Orphan refs nulled before FK addition.
- **H-5 fixed**: `agents.created_at` / `updated_at` columns added on prod.
- **H-6 fixed**: `scheduled_tasks` now has `CHECK` constraints on `frequency` and `status` + `created_by_user_id UUID` for proper billing attribution (Batch G/H will read this).
- **New**: `audit_events` table added (groundwork for Batch E audit log).
- **New**: `users.email_verified_at` column added (groundwork for Batch E email verification).

**Full Supabase removal:**
- Deleted `supabase/` folder (6 migrations + .DS_Store).
- Removed `hasSupabaseServerConfig` / `hasSupabaseBrowserConfig` exports; `db/config.ts` now exposes only `hasDatabaseConfig`.
- `/api/state/route.ts` updated to use `hasDatabaseConfig` and "DATABASE_URL is not configured" copy.
- Settings page "Shared Persistence" card rewritten — no Supabase URL/key fields, copy now references `DATABASE_URL`.
- Users page "Supabase email invite will be used" copy replaced with generic "Email invite will be sent once email is configured" (Batch G implements it).
- Stale comments scrubbed in `pipeline/run/page.tsx`, `api/pipelines/run/route.ts`, `agents-store/defaults.ts`, `server/skills-catalog.ts`.
- `.env.local` and `.env.local.example` rewritten — Supabase keys removed; new vars documented (JWT_SECRET, DATABASE_URL, CRON_SECRET, STRIPE_ENABLED, PROVIDER_SECRETS_MASTER_KEY).
- `HANDOFF_GUIDE.md` updated — env section trimmed, migrations folder corrected to `docker/migrations/`, runbook updated to use scp+ssh.

**Migrations applied on live VPS:**
- `docker/migrations/20260515_share_tokens.sql` ✓
- `docker/migrations/20260516_schema_integrity.sql` ✓
- Verified: 20 tables (added `audit_events`), 15 triggers active, outputs table has all share-token columns + `created_at/updated_at` `DEFAULT now()`.

**Validation:** `npx tsc --noEmit` passes cleanly. Prod DB schema verified via `\dt` + `\d outputs` + `SELECT FROM information_schema.triggers`.

### 2026-05-15 · Batch A complete · typecheck ✅
- **C-17 fixed** in `src/lib/server/image-production.ts` — path-traversal LFI closed
- **C-22 fixed** in `src/app/api/billing/upgrade/route.ts` — feature-flagged; non-super-admin gets 503 when Stripe disabled
- **C-21 fixed** in `src/app/api/billing/webhook/route.ts` — signature verification required; gated by `STRIPE_ENABLED`
- **M-37 fixed** in `src/app/api/providers/settings/route.ts` — secrets stripped from both GET and POST responses
- **C-26 fixed** in `src/app/share/output/[id]/page.tsx` — DOMPurify sanitization with strict whitelist
- **C-25 fixed** via:
  - new `docker/migrations/20260515_share_tokens.sql` (apply to prod DB)
  - schema added to `docker/init.sql`
  - new `src/app/api/outputs/[id]/share/route.ts` (POST creates, DELETE revokes)
  - share page now requires `?t=<token>` + checks expiry
- **C-23 / C-24 fixed** in `src/app/api/agent-photos/{route.ts, file/[filename]/route.ts}` and `src/app/api/client-assets/file/[filename]/route.ts` — auth required, tenant-scoped, path-traversal-safe
- **Deps added:** `isomorphic-dompurify`, `pdf-parse` + `@types/pdf-parse`, `mammoth`, `stripe` (optionalDependencies)
- **Scripts added:** `npm run typecheck` (`tsc --noEmit`)

**Validation:** `npx tsc --noEmit` passes cleanly across the whole project.
**Required ops on VPS:** apply `docker/migrations/20260515_share_tokens.sql` to the running mc_db so existing prod gets the new columns.
