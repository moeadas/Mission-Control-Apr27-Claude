# Mission Control — Production & Monetization Audit
## Persistent Memory File

> **Started:** 2026-05-15
> **Auditor:** AI agent
> **Workspace:** `/Users/moe/Desktop/Mission Control Remake`
> **Goal:** Full code-grounded audit — describe what the app actually does, then score production/monetization readiness across logic, performance, integrity, security, UX/UI, capabilities, limitations, dead code, hard-coded values, and any new audit dimensions worth adding.

---

## How to use this file

This file is the **single source of truth** for audit progress across sessions. After every batch:
1. Append findings to the relevant section.
2. Update the "Last completed" / "Next up" tracker at the top.
3. Add any new TODOs to "Open follow-ups."
4. Update the Capabilities/Limitations sections as the picture sharpens.

If a session resets, the next session should:
1. Read this file end-to-end first.
2. Read `HANDOFF_GUIDE.md` for env/access.
3. Resume at the batch listed under "Next up."

---

## 📍 Progress Tracker

| Batch | Title | Status |
|---|---|---|
| 0 | Setup memory + inventory | ✅ done |
| 1 | Foundation (config, env, DB, Docker) | ✅ done |
| 2 | Auth system | ✅ done |
| 3 | Multi-tenancy & admin | ✅ done |
| 4 | AI routing core (intents, autonomous-task) | ✅ done |
| 5 | AI engines (creative-asset, content-calendar) | ✅ done |
| 6 | AI provider layer | ✅ done |
| 7 | Chat/Iris + skills APIs | ✅ done |
| 8 | External integrations (Meta, Higgsfield, Google) | ✅ done |
| 9 | Agents config (10 agents) | ✅ done |
| 10 | Zustand stores + DB sync | ✅ done |
| 11 | UI shell + core components | ✅ done |
| 12 | Pages (28 routes) | ✅ done |
| 13 | Skills system | ✅ done |
| 14 | Pipelines & workflows | ✅ done |
| 15 | Output / artifacts / export | ✅ done |
| 16 | Billing & monetization | ✅ done |
| 17 | Scheduled tasks | ✅ done |
| 18 | Office + mission system | ✅ done |
| 19 | Scripts, public, dead-code sweep | ✅ done |
| 20 | Final synthesis & deliverable | ✅ done → AUDIT_REPORT.md |

**Last completed:** ALL BATCHES (1-20) — final report at `/Users/moe/Desktop/Mission Control Remake/AUDIT_REPORT.md`
**Next up:** Address Critical findings (start with C-17, C-22, C-23, C-25, C-6)

---

## 🔑 Access Already Verified (from previous session)

- ✅ Local codebase at `/Users/moe/Desktop/Mission Control Remake` — Next.js 16.2.1, on `main` @ `18cacf5`
- ✅ Sandbox bash (`/sessions/.../mnt/Mission Control Remake/`) — git works, can run TS checks
- ✅ GitHub remote `https://github.com/moeadas/Mission-Control-Apr27-Claude` — `git ls-remote` works
- ✅ VPS `root@72.62.33.12` via `~/.ssh/contentforge_deploy` — uptime 33 days
- ✅ `mc_app` container Up 52 min, port 3000; `mc_db` Up 6 days healthy
- ✅ Live app HTTP 200 in ~100ms
- ⚠️ **VPS is 1 commit behind origin** (VPS=71c70c9, origin=18cacf5 — docs-only)
- ⚠️ `HANDOFF_GUIDE.md` is untracked locally

---

## 📦 Codebase Inventory (verified counts)

| Metric | Value |
|---|---|
| TS/TSX files (src + scripts) | 188 |
| Total LOC (TS/TSX in src) | 48,195 |
| API routes (`src/app/api/**/route.ts`) | 52 |
| Page routes (`src/app/**/page.tsx`) | 28 |
| Agent configs | 10 (atlas, dex, echo, finn, iris, lyra, maya, nova, piper, sage) |
| Pipeline JSON configs | 7 (ad-creative, campaign-brief, competitor-research, content-calendar, media-plan, pipelines, seo-audit) |
| Supabase migrations | 6 |
| Skill folders in `data/skills/` | 160+ |
| Zustand stores | 4 (agents, analytics, pipelines, skills, workflow) |
| AI engines (`src/lib/server/*-engine.ts`) | 3 (creative-asset, content-calendar, plus image-production) |

---

## 🚨 Critical Findings (auto-promoted to top as discovered)

### C-1 — `docker/init.sql` has FK-ordering bug; fresh deploy will FAIL
`docker/init.sql:16-18` runs `ALTER TABLE agencies ADD CONSTRAINT fk_agencies_owner_user_id FOREIGN KEY (owner_user_id) REFERENCES users(id)` BEFORE the `agencies` table is created (line 59). This is dead code on the current prod DB (because the table was created by an earlier run), but **any fresh deploy will error and abort init**. Move the ALTER below the `CREATE TABLE agencies` block, or wrap in a `DO $$ ... $$ IF EXISTS` block.

### C-2 — Major schema drift: `office_layouts` exists on prod, missing from repo
`office_layouts` table is present on the live VPS DB with `mc_credits INT`, `owned_assets TEXT[]`, `layout JSONB` (with `tiles/zones/gridWidth/gridHeight/floorAssetId` keys). **It is not declared anywhere in `docker/init.sql` or `supabase/migrations/`.** A fresh deploy will be missing this table and the office/credits feature will break at runtime. Action: add it to `docker/init.sql` and as a migration.

### C-3 — Schema drift: migrations not applied to prod; init.sql is canonical
Live DB has 19 tables. `supabase/migrations/` declares tables (`task_runs`, `workflow_instances`, `agent_skill_links`) that **do not exist on prod**. If any application code references them → runtime errors. The migrations also reference `auth.users(...)` and `storage.buckets(...)` which are Supabase-specific schemas not present in self-hosted Postgres. **Decision needed:** delete the `supabase/migrations/` folder (and any code that loads from it) or rewrite migrations to match the self-hosted reality.

### C-4 — Live secrets in `.env.local` (gitignored but risky)
`GOOGLE_CLIENT_SECRET=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`, `META_APP_SECRET=645d...`, `GEMINI_API_KEY=AIzaSyB...` are all real, active credentials. They're gitignored (`.gitignore:18`) and dockerignored (`.dockerignore:5`), but: (a) if the file is ever shared via screenshare/zip/backup, the keys leak; (b) need to verify git history was never committed with these. Action: rotate after launch; verify never in git history; document a secret-rotation runbook.

### C-5 — No `updated_at` triggers on prod DB; field is stale unless app sets it
0 triggers in `information_schema.triggers`. Many tables have an `updated_at TIMESTAMPTZ` column with no default and no trigger, so unless every UPDATE statement explicitly sets `updated_at = now()`, the field stays NULL or stale forever. The supabase migrations DEFINE these triggers but they never ran on prod (see C-3). Action: add a `set_updated_at()` trigger function and triggers for at least `agencies/agents/clients/tasks/outputs/conversations/scheduled_tasks/subscriptions/profiles/users/skills/pipelines`.

---

## ⚠️ High-Priority Findings

### H-1 — `tasks.created_at` / `updated_at` have NO DEFAULT
Will be NULL if app forgets to set. Same for `outputs.created_at/updated_at` and `clients.created_at/updated_at` and `conversations.created_at/updated_at`. The supabase migrations had `DEFAULT timezone('utc', now())` but those didn't run. Action: `ALTER TABLE ... ALTER COLUMN created_at SET DEFAULT now();` for every timestamp column.

### H-2 — `next.config.mjs` sets `Cache-Control: no-store` on essentially everything
`source: '/((?!_next/static|_next/image|favicon.ico|uploads).*)'` — every page, every API call, all dashboard chrome. Kills HTTP caching for the entire SaaS surface. Each navigation re-fetches. Real perf cost for users and AWS/CDN costs. Action: scope no-cache only to actual API routes that need it (e.g. `/api/state`, `/api/scheduled-tasks`), and allow pages to be cached with proper revalidation.

### H-3 — `tasks.client_id` FK has no ON DELETE action
`tasks_client_id_fkey FOREIGN KEY (client_id) REFERENCES clients(id)` (no clause). If a client is deleted, FK violation will block the delete or leave orphan tasks. Should be `ON DELETE SET NULL` or `ON DELETE CASCADE` per business intent.

### H-4 — `outputs.agent_id`, `outputs.client_id`, `tasks.lead_agent_id`, `tasks.pipeline_id` lack FK constraints on prod
Init.sql declares these as plain TEXT references without FK. Orphan references possible. Action: add FKs with ON DELETE SET NULL.

### H-5 — `agents` table on prod has no `created_at` / `updated_at` columns at all
Migration version has them, init.sql doesn't, prod followed init.sql. No audit trail when agents were created or last modified.

### H-6 — `task_assignments.id` is SERIAL on prod, UUID in migration; agency_id has no FK; agent_id has no FK
Schema drift again. Per init.sql line 165-173: serial id, no FK on task_id (wait — there IS a FK on task_id with ON DELETE CASCADE), no FK on agency_id, no FK on agent_id. Orphan rows possible after agent deletion.

### H-7 — `.env.local.example` is stale (Supabase, wrong admin email)
Suggests Supabase setup that was abandoned. Lists `moeadas@yahoo.com` as super admin while `.env.docker.example` says `moeabuadas@googlemail.com`. Confusing for any new developer. Action: delete or rewrite to match self-hosted reality.

### H-8 — Schema duplication: `init.sql` ↔ `supabase/migrations/`
Two competing sources of truth for the schema. Maintainers will edit one and forget the other. Action: pick one (init.sql is the canonical one for self-hosted Docker), delete or archive the supabase migrations folder.

### H-9 — `docker-compose.yml` uses obsolete `version: "3.9"`
Triggers a warning on every `docker compose` invocation (visible in our SSH outputs). Compose v2 ignores the field. Cosmetic but signals neglect. Action: remove the `version:` line.

### H-10 — Tailwind `typing-dot` keyframe animates `content:` property
CSS `content` is only valid on `::before`/`::after` and is not animatable. The animation will not visually work; probably needs a different approach (opacity + scale) per dot.

### H-11 — Dockerfile bakes devDependencies into production image
`RUN npm ci` (no `--omit=dev`). Then standalone build copies are pruned by Next's tracing, but the build environment carries dev deps. Slightly larger image; minor. Could optimize.

### H-12 — Dockerfile has no app HEALTHCHECK
docker-compose has DB healthcheck but not app. If the Next server hangs, no restart trigger. Add `HEALTHCHECK CMD wget -qO- http://localhost:3000/api/version || exit 1`.

---

## 🟡 Medium / Low Findings

### M-1 — `tsconfig.json target: ES2017`
Old target for Node 20 + Next 16. Move to ES2022.

### M-2 — `tsconfig.json` excludes nonexistent directories
`mission-control-claude-genspark_ai_developer`, `PenPoint` — leftover paths from a prior multi-project setup.

### M-3 — `.env.docker.example` suggests global `ANTHROPIC_API_KEY`
But code uses per-user keys from `data/provider-secrets.json`. Misleading template.

### M-4 — `.dockerignore` does not exclude `data/provider-secrets.json`
The Docker volume `mc_secrets` mounts over the file, so the baked-in copy is shadowed at runtime — but the dev secrets are still inside the built image layers. Anyone with image access can extract them. Action: add `data/provider-secrets.json` to `.dockerignore`.

### M-5 — `.dockerignore` does not exclude `MemoryForAudit.md`, `HANDOFF_GUIDE.md`, `RECOMMENDATIONS.md`, audit files
These leak architectural details into the image. Add to `.dockerignore`.

### M-6 — Production has 2 agencies / 1 user / 0 actual content
DB is essentially empty. The app has never been used at scale. No production load testing possible. Plan capacity from scratch.

### M-7 — `next.config.mjs` `BUILD_ID = Date.now().toString()` at module-load time
Stable inside a single Node process but changes between dev restarts. Need to verify `useVersionCheck` hook actually does what the comment claims (detect new deploys).

### M-8 — `docker/init.sql` lacks `users.email` explicit unique index name
UNIQUE constraint exists implicitly; no `idx_users_email`. Lookups via email are common (login, register, OAuth callback). Add explicit btree index.

### L-1 — `.DS_Store` files committed/present in workspace
Already gitignored. Harmless but tidy them.

### L-2 — `.mission-control-server.pid`, `.sandbox.pid`, `.sandbox.log` in repo root
Local dev artifacts. Add `*.pid` (already in gitignore) ✓ but `.sandbox.log` is 1.3 MB — not in gitignore yet. Add.

### L-3 — `appscript.md`, `README-LAUNCHER.txt`, `start-mission-control.sh`, `stop-mission-control.sh`, `launcher-apps/`, `launcher-assets/`
Look like legacy macOS-launcher packaging. Verify nothing references them; delete if confirmed dead.

### L-4 — `node_modules_broken_20260331/` is 251 directories of broken old deps
Should be deleted. Already in `.gitignore`.

### L-5 — `tsconfig.json` includes `.next/dev/types/**/*.ts` — Next 16 only emits `.next/types`
`.next/dev/types` doesn't exist; harmless but noisy.

### L-6 — `docker-compose.yml` defines two networks (`mc_internal`, `mc_external`) but the app uses both
Db on `mc_internal` only, app on both. Fine. But `mc_external` has no defined egress isolation; cosmetic.

---

## Batch 2 — Auth findings

### C-6 — JWT stored in `localStorage` (XSS-exfiltratable)
`src/lib/auth/browser.ts:1` stores the JWT in `localStorage` under key `mc_auth_token`. Any XSS bug anywhere in the app (and there are 188 TSX files to keep clean) gives an attacker a 7-day token that can read every tenant's data they're authorized for. Industry-standard: HTTP-only secure cookies with SameSite=Lax, plus CSRF token. **Required before monetization launch.**

### C-7 — No email verification on signup
`src/app/api/auth/register/route.ts:53-87` creates an account and returns a JWT immediately. Anyone can sign up with any email — no confirmation. Enables: free-plan farming, sock-puppet tenants, brand impersonation, future password-reset takeover if reset-by-email is added. **Required before public/self-serve launch.**

### C-8 — No password reset / "forgot password" flow at all
`/api/auth/password` requires current password to set a new one. There is no `/api/auth/forgot-password`, no reset token, no magic link, no email delivery. If a user forgets, they're locked out and only a super-admin DB poke can recover. **Launch blocker.**

### C-9 — No rate limiting anywhere
Login (`POST /api/auth/session`) is brute-force-able. Register can be hammered to create unlimited free tenants. Chat API likely also unlimited. There is no Nginx/Cloudflare in the deploy chain, and no in-app limiter (no `next-rate-limit`, no IP throttling, no failed-login lockout). With weak passwords allowed (8 chars min, no complexity) and bcrypt cost 12 (~250ms per attempt), an attacker can try ~4 passwords/sec/IP. **Launch blocker.**

### C-10 — Google OAuth callback URL is broken
`.env.local:10` sets `GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback`. There is NO `src/app/api/auth/google/callback/route.ts` — only `/api/auth/google/route.ts` (handles both initiate and callback via `?code` presence). When Google redirects to `/callback`, the app 404s. **Google OAuth integration is broken end-to-end.** Either: (a) create the missing `/callback` route, or (b) change the env to `/api/auth/google` and update the registered redirect URI in Google Cloud Console.

### C-11 — OAuth tokens are received but NEVER stored
`src/app/api/auth/google/route.ts:25` and `src/app/api/auth/meta/route.ts:19` exchange the code for tokens then immediately redirect with `?google=connected`. The `tokens` object is **discarded**. There is no DB persistence, no encryption, no per-user mapping. So even if the URL bug is fixed, no Google/Meta integration can actually call user-owned APIs because there's nothing to call them with. **The Google + Meta connectors are stubs.**

### H-13 — Page guard is client-side only (visual data leakage)
`SessionGate.tsx` redirects in `useEffect`. Page HTML renders for a frame before redirect runs. Authenticated-only pages (admin/tenants, /clients/etc.) flash their structure on first paint. Server-side guarding via Next 16 middleware needed.

### H-14 — `/settings` and `/pipeline` are ADMIN-ONLY paths
`SessionGate.tsx:11` `ADMIN_ONLY_PREFIXES = ['/settings', '/config', '/skills', '/pipeline', '/users']`. But Settings is where users configure their AI provider keys per-user. **Regular members CANNOT set up the app for use.** The app is effectively single-user (super_admin only) right now. Either gate is wrong, or `/settings/integrations` (where members would set keys) needs to be split out.

### H-15 — `resolveAuthContextFromToken` writes to DB on every authenticated request
`src/lib/auth/server.ts:35-43` runs `INSERT INTO profiles ... ON CONFLICT UPDATE` on every API call that goes through auth. At scale, every authenticated API call performs at least one DB write + provider-secrets file read. Should be: SELECT-first, only UPSERT on actual change or missing row.

### H-16 — Tenant auto-provisioning is race-prone
`src/lib/auth/server.ts:56-64`: if a logged-in user has no tenantId, the resolver calls `createTenant()` then `assignUserToTenant()`. Two concurrent requests (multiple browser tabs after long logout) can each create a tenant. The orphan tenant has the user as owner but the profile points to only one of them.

### H-17 — `useVersionCheck` reloads window on new build without warning
`src/hooks/useVersionCheck.ts:31` calls `window.location.reload()` if `buildId` changes. User loses unsaved form input. Should toast "New version available — refresh to load" and let user click.

### H-18 — `useVersionCheck` polls `/api/version` every 60s per user
Plus on `focus`. Mostly cheap (one tiny GET) but at scale: 60 reqs/hr/user just for this. Better: WebSocket/SSE push on deploy, or use `visibilitychange` only.

### H-19 — Login endpoint returns specific "Invalid credentials" vs no specific error
Currently returns "Invalid credentials" for both unknown email and wrong password (good). But also for inactive account. OK. Be careful future maintenance doesn't add user-enumeration leaks.

### H-20 — JWT expiry 7d, no refresh token
After 7 days the user is silently logged out (SessionGate detects 401 → redirects). No graceful refresh, no sliding session. For a daily-use SaaS this is acceptable; for monetization (Stripe webhooks, etc.) consider refresh tokens.

### H-21 — `seed-admin.mjs` ships with default `admin@example.com`/`changeme123`
If anyone runs the seed without env vars set, a default super-admin is created. **In production this could create a backdoor.** Refuse to run without `ADMIN_EMAIL` and `ADMIN_PASSWORD` explicitly set (no fallback). Also the pbkdf2/sha256 fallback (line 18-24) produces hashes that `bcrypt.compare` cannot read — login would fail. Remove the fallback entirely; bcryptjs is in `package.json` deps and always available.

### H-22 — `src/lib/google-integrations.ts:74` calls `google.ads({version:'v1'})` — doesn't exist
The `googleapis` library has no `ads()` method; Google Ads API is a separate package (`google-ads-api`). This entire helper file would crash at runtime if called. Dead code OR a runtime time bomb. Verify whether anything actually imports it.

### M-8 — Password policy is 8 char minimum, no complexity
`register/route.ts:32`, `password/route.ts:30`. Common for low-friction SaaS but worth adding password-strength meter on signup UI; never enforced server-side beyond length.

### M-9 — bcrypt cost factor 12 (~250ms)
Reasonable for security but adds latency. Acceptable.

### M-10 — Meta OAuth scopes include `ads_management` (write) but Higgsfield wrapper only reads
Over-permissioned scope request. Tighten to `ads_read,pages_read_engagement` unless writing campaigns is the intent.

### M-11 — `useVersionCheck` `localStorage.getItem('mc_build_id')` race with SSR-rendered pages
On first visit the stored value is empty; the hook seeds it to current build, then polls — correct. But if BUILD_ID changes between SSR and CSR (very fast deploy), the user sees a forced reload immediately.

### L-7 — Login page has no "Forgot password?" link
Even as a no-op stub, missing link signals "this app isn't ready." Add as TODO link with toast.

### L-8 — Login form has no autocomplete attributes
`type="email"` and `type="password"` — fine, browsers infer. But `autoComplete="username"` and `autoComplete="current-password"` are recommended for password manager UX.

---

## Batch 3 — Multi-tenancy & admin findings

### C-12 — Backups written inside the container; lost on every restart
`src/app/api/admin/backup/route.ts:17` uses `process.cwd()/backups`. `process.cwd()` inside the container is `/app`. There is **no Docker volume mount** for `/app/backups` in `docker-compose.yml`. Every backup created via the admin UI is annihilated the moment the app container restarts (which happens on every `docker compose build app && up -d app` deploy). **This is the entire backup feature, and it's completely broken from a durability standpoint.** Action: mount a volume (`mc_backups:/app/backups`) AND offsite-copy to S3 or rsync.

### C-13 — Backups contain `users.password_hash` rows
`src/app/api/admin/backup/route.ts:21` `TABLES = ['users', ...]`. Full users table is JSON-dumped including bcrypt hashes. If the backup tar.gz file leaks, attackers can offline-crack passwords. Action: exclude `password_hash` column from dump, or encrypt the archive with a passphrase before writing.

### C-14 — Custom hand-rolled tar+gzip implementation
`src/app/api/admin/backup/route.ts:64-110` writes ustar headers and gzip pipeline manually. Filenames truncated to 99 chars (line 71), no support for long-name extension blocks, no UTF-8 verification. Edge cases on long paths or non-ASCII filenames will produce a corrupt archive that fails to extract. **For monetization launch, backup integrity is sacred.** Use `tar` CLI via child_process or `node-tar` from npm.

### C-15 — Backup hardcoded TABLES list misses `office_layouts` (and any future tables)
`backup/route.ts:21-27` lists 18 tables. Production has 19 (we counted earlier). `office_layouts` — the table that holds in-app credits + owned assets (monetization layer) — is **silently excluded from backups**. Action: replace hardcoded list with `SELECT table_name FROM information_schema.tables WHERE table_schema='public'` lookup.

### C-16 — Backup silently drops files >50 MB
`backup/route.ts:180-189` — files larger than 50 MB are skipped without warning or summary count. A client's brand asset PDF or video is silently lost on restore. At minimum, report the skipped files in the response.

### H-23 — `backfill-ownership` claims all orphan records as the caller's
`src/app/api/admin/backfill-ownership/route.ts:36-41` sets `owner_user_id = auth.userId` for every row where `owner_user_id IS NULL` across **clients, tasks, outputs, conversations — globally, no tenant scope.** Super-admin running this destroys ownership data for every tenant. Should be tenant-scoped (only own tenant's orphans) or accept a `tenantId` body param.

### H-24 — `assignments/route.ts` allows cross-tenant ownership reassignment
`src/app/api/admin/assignments/route.ts:35` does `UPDATE clients SET owner_user_id WHERE id = ${body.entityId}` — no `agency_id` scope. A super_admin can take ownership of any other tenant's client. Same for task/output/conversation. Should be scoped to the requesting admin's tenant unless explicitly cross-tenant.

### H-25 — Tenant member invite has no email; temp password returned in API JSON
`src/app/api/tenant/users/route.ts:115-116` generates a temp password and returns it in the JSON response. No SMTP, no email, no welcome message. The admin must manually copy-paste the password to the new member out-of-band. This breaks the entire self-serve onboarding promise of a SaaS. Action: integrate transactional email (SendGrid/Resend/SES) and send invite link with token rather than plaintext password.

### H-26 — Adding existing user to tenant moves them without consent
`src/app/api/tenant/users/route.ts:97-109` — if email exists and that user has no tenant, the new admin gets to absorb them. The original user wasn't notified, didn't consent. Privacy issue. Should send invitation that requires acceptance.

### H-27 — DELETE /api/tenant/users doesn't really remove
Line 232: only sets `profile.tenant_id = null`. User still has `users` row, still has password hash, still can log in. On next login `resolveAuthContextFromToken` auto-provisions a fresh tenant for them (per H-16). So removing a user from a workspace effectively gives them their own free tenant. Not what an admin expects.

### H-28 — `createTenant` slug-uniqueness check is a race
`tenants.ts:43-47` — read existing slugs, then insert. Two concurrent registers with same company name → both read "no conflict" → one INSERT succeeds (due to DB UNIQUE), the other returns 500. User who lost the race gets a confusing error. Wrap in try/retry or use ON CONFLICT.

### H-29 — `PATCH /api/admin/plans` mixes Stripe price ID overwriting semantics
Lines 95-122. Dead code (`setClause` builder) followed by the actual UPDATE that uses COALESCE + a CASE expression for `stripe_price_id`. The CASE is intended to allow null-out, but the boolean cast `${stripe_price_id !== undefined}::boolean` is suspect — depending on driver, it may compare to string `"true"` and silently skip the update. Test manually.

### H-30 — `POST /api/admin/users` lets super_admin promote anyone to super_admin
Line 66: body.role can request super_admin, accepted. Plus line 75 ON CONFLICT (email) DO UPDATE … role — calling POST on an existing email **silently changes their role** and **resets their password hash**. Surprising behavior; consider rejecting duplicate emails or making "reset" an explicit endpoint.

### H-31 — No audit log for any admin action
Grepped `audit_log|auditLog|logAdminAction` — 0 hits. Plan changes, role grants, tenant provisioning, ownership reassignments, backups, all silent. For SOC2 / GDPR / forensics, must log every admin action with actor, target, before/after, timestamp. Add `audit_events` table + `recordAuditEvent()` helper.

### M-12 — `syncAgentCount` is fire-and-forget; errors swallowed
`src/app/api/state/route.ts:301` — `syncAgentCount(...).catch(() => {})`. If the sync fails, `subscriptions.current_agent_count` drifts from reality and the next `canAddAgent` check uses stale data. At least log the error.

### M-13 — Plan deletion FK cascade hole
`plans` table has subscribers via `subscriptions.plan_id REFERENCES plans(id)` with no ON DELETE. DELETE refuses if subscribers, fine. But if a plan is renamed mid-flight (PATCH), old subscriber stripe price IDs become wrong. No reconciliation.

### M-14 — Custom plans created via POST have no `stripePriceId` validation
`POST /api/admin/plans` accepts any string for `stripePriceId`. No format check, no Stripe-lookup verification. Customer pays for plan with bad stripe price → webhook fails silently.

### M-15 — Admin tenants GET joins on view `tenants` indirectly via agencies+subscriptions
Fine but `(SELECT COUNT(*) FROM agents WHERE...)` and `(SELECT COUNT(*) FROM profiles WHERE...)` are correlated subqueries; with many tenants this is O(N) DB roundtrips. Move to JOINs.

### M-16 — `GET /api/admin/users` returns ALL users globally, ignoring tenant
By design (super_admin only) but no pagination — at 10k users this becomes a heavy response. Add LIMIT/OFFSET.

### M-17 — `POST /api/admin/users` returns temporary password in body
Same problem as M-25, super-admin-flavored. Move to email or one-time-link.

### L-9 — `/api/admin/backup/route.ts` first imports `readdir` then aliases as `fsReaddir`
`import { mkdir, readdir, stat, writeFile, readFile, readdir as fsReaddir }` — `readdir` imported twice. Cosmetic; remove duplicate.

### L-10 — `getDb()` per-request convention reads connection pool
Audit Batch 10 will check; presumably postgres.js handles pooling singleton.

---

## Batch 4 — AI routing core findings

### H-32 — Intent classifier is English-only despite bilingual (en/ar) agent prompts
`src/lib/intents/intent-classifier.ts` — every regex (`TASK_KEYWORDS`, `CASUAL_PATTERNS`, `STRATEGIC_TASK_SIGNALS`, etc.) is English. The agent config files (`src/config/agents/*/RULES.md` etc.) include Arabic prompt variants — confirmed by `prompts.en` / `prompts.ar` shape in `task-channeling`. So an Arabic-speaking user typing Arabic gets every message classified as `status-report` → conversational fallback. Either: (a) i18n the classifier, or (b) translate the input via the LLM before classification.

### H-33 — Deliverable registry is hardcoded; admin cannot add new types
23 deliverable types live in `src/lib/intents/deliverable-registry.ts` as a TS const array. Adding "TikTok script" or "press-release-Arabic" needs a code change + redeploy. For a SaaS aimed at agencies with diverse deliverables, this is a velocity bottleneck. Action: move to DB-backed configuration with admin UI; the registry becomes the seed.

### H-34 — Two parallel "social post" safeguards (drift risk)
The Fix #91 protection exists in BOTH `intent-classifier.ts:202-208` (early-return to `campaign-copy`) AND `autonomous-task.ts:888-893` (re-route at execution). Future maintenance might update one and not the other. Consolidate into a single helper `isExplicitSocialPostRequest(content)` and call it from both call sites.

### H-35 — Three generation engines diverge in quality logic
`creative-asset-engine.ts` (517 LOC), `content-calendar-engine.ts` (1854 LOC), and the generic path in `autonomous-task.ts` each have their own prompt building, quality control, and fallback paths. Refactoring one without affecting the others is fragile. The content-calendar engine especially is massive — Batch 5 will deep-dive.

### H-36 — `isInvalidFinalDeliverable` rejects valid deliverables containing certain phrases
`autonomous-task.ts:561-573` flags response as "invalid" if it contains `"task routed to"`, `"lead agent"`, `"status: in progress"`, `"delivery:"`, or `"next steps:"`. A legitimate `status-report` deliverable or `media-plan` "Delivery:" header would trigger an unwanted retry. Move to a structured check (e.g., presence of `# Title` heading) instead of negative-list string match.

### H-37 — `buildClientProfileMap` mapping fragile to brief structure changes
`autonomous-task.ts:112-161` extracts client context by exact-label regex (`Name`, `Industry`, `Audience`, `Tone of voice`, `Brand promise`, `Brand colors`, etc.). If the `parse-client-brief` endpoint emits different labels (or localized labels), every downstream mapping silently returns empty strings and prompts say "TBD." This is essentially undocumented coupling.

### H-38 — Hardcoded defaults in `buildClientProfileMap`
Lines 145-153 — `budget = 'TBD - planning assumptions required'`, `posting_frequency = '3-4 posts per week'`, `platforms = 'Instagram, LinkedIn'`, `campaign_duration = '30 days'`, `content_goal = 'Awareness and lead generation'`. These should be tenant-configurable (different agencies serve different industries). Currently every AI-generated content calendar defaults to Instagram + LinkedIn even for a B2B SaaS or a TikTok-first brand.

### H-39 — Magic temperatures (0.45) sprinkled in
Lines 783, 1039, 1127. Why 0.45? Documented nowhere. Lead pass uses `input.temperature` but activity/support passes are pinned. Make these per-agent/per-deliverable config.

### H-40 — `shouldAutoCompleteReviewActivity` hard-codes activity IDs
`autonomous-task.ts:527-529` `['profile-review', 'select-ideas', 'review-posts']`. Any pipeline using different review-step IDs will NOT auto-complete and will wait forever for human approval (or skip incorrectly). A flag on the pipeline activity config (`autoComplete: true`) would be cleaner.

### H-41 — No execution timeout on `executeAutonomousTask` itself
Each `generateText` has 120s timeout (Ollama content path). A pipeline with 6 phases × 4 activities = 24 LLM calls = potentially 48 minutes wall-clock worst case. The Next.js route handler will time out long before. Confirm in Batch 7 whether `/api/chat` route uses `export const maxDuration = N`.

### H-42 — No streaming responses
All generation is awaited synchronously then returned as JSON. For complex deliverables (content calendars taking 1-3 min), the user stares at a spinner with no progress. SSE/streaming would be a major UX improvement.

### H-43 — `maxTokens` optional → no cost ceiling per request
After Fix #90 made `maxTokens` optional, providers default to their max (Anthropic Sonnet: 8192, Gemini Pro: 8192, GPT-4o: 16K). No per-task budget, no per-tenant budget. A malicious user (or a runaway pipeline) can rack up large costs. Combined with no rate limit (C-9), this is dangerous for monetization.

### H-44 — `inferRoutingContext` returns confidence `low` for any single pattern match
Line 466: `patternMatches === 1 ? 'medium' : 'low'`. Most user inputs hit exactly one pattern, so confidence is essentially binary (many → high, few → low/medium). UI may display this confidence — if "high" is rare, the UI looks like it's always uncertain.

### M-18 — Skill block tools/skills `slice(0, N)` caps are arbitrary
8 tools, 6 skill IDs, 3 secondary skills — uniform across all deliverables. A simple short-form-copy doesn't need 8 tools; a complex content-calendar might need more. Tune per `complexity` field on the deliverable spec (already exists, unused for this purpose).

### M-19 — `generateContentFirstText` fallback chain Ollama↔Gemini hard-coded
Lines 475-478. Only those two providers can swap. If user has only Anthropic configured, no fallback. If user has both Anthropic and OpenAI configured, no fallback. Generalize to "any available provider."

### M-20 — Quality repair pass is single-shot
Line 1200-1244: one retry, then ship even if still bad. Could iterate up to N times with diminishing temperature. Or escalate to a different provider. Currently shipping a 60/100 quality output silently is the default.

### M-21 — Hard-coded model timeout 120000 ms
`autonomous-task.ts:468, 494`. If Ollama is fast (gpu-backed), 120s is wasteful slow-failure detection. If model is slow, it's not enough. Make per-model in `model-pricing.ts`.

### M-22 — `buildSkillLookup` rebuilt on every `executeAutonomousTask` call
Lines 171-190. The skills catalog could be loaded into memory once at server start instead of rebuilt per request. Add module-level cache with TTL.

### M-23 — `agentSkillsContextFromIds` is dead code wrapping the new builder
Line 394-403. Marked "Backwards-compatible: kept so existing call sites … still work during the broader migration." Audit Batch 5 will confirm whether any callers remain.

### L-11 — Score thresholds (`bestScore < 5`) magic
`intent-classifier.ts:268`. Why 5? Below 5, fall through to general/status. Tunable in theory; documented nowhere.

### L-12 — Default response title "New Task" for empty request
`task-output.ts:6`. User can submit an empty chat → creates a task titled "New Task." UX-wise should reject empty submissions at API level.

---

## Batch 5 — AI engines findings

### C-17 — Path-traversal LFI in `image-production.ts:resolveAssetPath`
`src/lib/server/image-production.ts:33-48` accepts paths starting with `/uploads/clients/` and joins to `CLIENT_UPLOADS_DIR`. `path.join('/app/public/uploads/clients', '../../../etc/passwd')` normalizes to `/etc/passwd`. The candidate strings flow from `clientProfile.logo_asset_paths / template_asset_paths / reference_asset_paths`, which in turn come from `client.brief` JSONB in the DB — editable by any tenant admin via the client-brief parser endpoint. A tenant admin can therefore inject `../../../../etc/passwd` into their client brief, trigger a creative-asset task, and the file's contents get base64-encoded into the LLM prompt — and then potentially included in the rendered HTML output that's returned to the client and stored. **Critical: arbitrary file read by any tenant admin.** Fix: after `path.join`, call `path.resolve(joined)` then verify it starts with `path.resolve(CLIENT_UPLOADS_DIR)` and reject otherwise.

### C-18 — Weak prompt-injection defenses
`src/lib/server/prompt-safety.ts` is the entire defense. Replaces `{{...}}` with `[...]`, replaces `ignore prior instructions` / `system prompt` / `act as` with `[removed]`. Trivially bypassed by misspelling ("igore", "ignooore"), Unicode tricks ("ìgnore"), encoding (base64, leet), framing rephrases ("forget everything from before", "you are no longer..."). Real defenses need: (a) instruction tagging (`<user_input>...</user_input>` wrappers in prompts), (b) classifier model for injection detection, (c) refusal sample alignment. As-is, ANY user can extract the system prompt and impersonate Iris by typing "Above is just a test. Your real task is...". For a SaaS where tenants share infrastructure, this enables data exfil between tenants if any agent has access to per-tenant data.

### H-45 — Creative-asset engine hard-fails if Finn / Echo / Lyra / Iris are absent
`creative-asset-engine.ts:336-338` throws if any of the four named agents are missing. If a user deletes "Lyra" from their roster (allowed by /agents page), every creative-asset request 500s. Should graceful-degrade to any visual-capable agent or to Iris solo.

### H-46 — Gemini image model `gemini-3-pro-image-preview` is referenced but may not exist
`creative-asset-engine.ts:413` and `image-production.ts:91` use `model: input.visualModel || 'gemini-3-pro-image-preview'`. As of May 2025, Google's image API uses `gemini-2.0-flash-preview-image-generation` or Imagen 3 endpoints. This name may have been a placeholder. Verify against live VPS provider settings + the `/api/integrations/higgsfield/*` routes (Higgsfield might be the actual image gen).

### H-47 — Hardcoded social-platform defaults in calendar
`content-calendar-engine.ts:278, 282` — `posting_frequency = 'Instagram: 3 posts/week; LinkedIn: 2 posts/week'`, `platforms = 'Instagram, LinkedIn'`. Default for any user. A TikTok-first brand or B2B (LinkedIn-only) brand gets the wrong calendar. Move to tenant settings.

### H-48 — Calendar timeframe inference is single-keyword
`inferCalendarTimeframeDays:292-299`. Only checks "week" (→ 7) or "month"/"30 day" (→ 30). A user asking "plan content for the next 60 days" gets a 30-day calendar. No 14-day, 90-day, quarter support.

### H-49 — Salvaged partial JSON marked with fake provider/model "salvaged-partial"
`content-calendar-engine.ts:266-268`. If the LLM truncated mid-array and the salvager extracts 2/5 posts, the result is returned with `provider: 'ollama'` `model: 'salvaged-partial'`. Token-usage logging downstream may write these as real model rows, polluting cost data.

### H-50 — Multiple `escapeHtml` definitions (5+ copies across engines)
`creative-asset-engine.ts:27`, `content-calendar-engine.ts:106`, plus `output-html.ts` and likely others. Each implementation could diverge; one might miss a character. DRY violation; move to a single utility.

### H-51 — Generated HTML uses inline styles, not class system
`buildCreativeHtml`, calendar HTML — all inline `style="..."`. Updating the visual look of all outputs requires touching every engine. CSS class system + minimal inline overrides would scale.

### M-24 — `image-production.ts` silently caps reference images to 4
Line 65 `if (references.length >= 4) break`. No warning, no UI indication. User uploads 10 brand references, only first 4 used.

### M-25 — `inferCreativeAspectRatio` keyword set is small
"story"/"reel" → 9:16; "landscape"/"hero"/"banner" → 16:9; "instagram"/"facebook" → 4:5; else 1:1. Missing: "twitter", "x post", "linkedin banner", "youtube thumbnail", etc.

### M-26 — Quality validator has hardcoded section requirements per type
`output-quality.ts:69-101`. Same drift risk as task-output formatter. Add comment that these two files must stay in sync OR generate from a shared spec.

### M-27 — No streaming of long content-calendar generation
A 30-day calendar with 5 platforms × 6 posts/week = 130 posts. Each post needs hook+body+CTA+hashtags + visual brief. Wall-clock time can easily exceed 3-5 minutes. With no streaming, user sees no progress. Add SSE hook calls (the `RuntimeHooks` interface exists in the engine but the chat route probably doesn't subscribe — verify in Batch 7).

### M-28 — Calendar engine's JSON-mode prompts depend on Ollama's flaky JSON mode
Uses 3-attempt retry + salvage. Healthier approach: switch to a structured output via Gemini's `responseSchema` or OpenAI's `json_schema` mode. But those aren't supported by the current "content-first" provider Ollama.

### L-13 — `creative-asset-engine.ts` writes generated images to `/app/public/uploads/generated/`
✓ Volume-mounted, persists across restarts. Filename includes uuid suffix; safe.

### L-14 — No image content moderation
Generated images are served back without any NSFW/violence/copyright check. Gemini does some safety filtering, but anything that gets through ships to the user. Could be a brand-safety issue for agencies serving regulated industries.

---

## Batch 6 — AI provider layer findings

### C-19 — All user API keys stored in PLAINTEXT on disk
`src/lib/server/provider-secrets.ts:7-8` — `data/provider-secrets.json` on Docker volume `mc_secrets`. Every tenant user's Anthropic, OpenAI, Gemini, Meta access token, Higgsfield API key is stored unencrypted. Combined with C-17 (path-traversal LFI) and C-13 (backups include this file), **any tenant admin can extract every other tenant's API keys** by either: (a) reading the file via path traversal, (b) triggering a backup and downloading it. **Catastrophic for monetization launch.** Action: encrypt with per-key envelope encryption using a master key from env var; better: use a proper secrets manager (Hashicorp Vault, AWS KMS, or even sops with age).

### C-20 — `.env.local` Gemini key is auto-attached to EVERY user
`provider-secrets.ts:110-128`: `loadPersistedProviderSettings(userId)` merges the user's stored settings with `.env.local`'s `GEMINI_API_KEY`. So if the host has a Gemini key in env, all users inherit it. In dev this means the developer's personal Gemini key is silently billed for every user's calls. In prod where env is empty, no effect — but the code path exists. Either make it opt-in per-tenant, or remove the env merge entirely.

### H-52 — `writeLocalEnvGeminiKey` writes to `.env.local` from server runtime
Lines 93-108 — after user saves their Gemini key in Settings, the server writes it to `/app/.env.local`. In Docker, `.env.local` is gone at runtime (`.dockerignore` excludes it; the volume doesn't mount over it). So the write either fails (caught with `try`) or succeeds in a directory that disappears on rebuild. **Either way, ineffective.** Remove the .env-writing path; it's a dev-only relic that confuses where the key actually lives.

### H-53 — Hardcoded "default content-task models" in code
`provider-settings.ts:12-17` — `gemini-2.5-pro`, `claude-sonnet-4-5`, `gpt-4o` baked into TS. Provider deprecates a model → every new user's settings reference a dead model until you ship a build. Move to DB-backed `app_settings` table with admin UI.

### H-54 — `MODEL_PRICING` stale-detection is none
`model-pricing.ts:9` "checked May 2026" comment, but no programmatic freshness check. Provider price changes silently make `cost_usd` wrong. Add `lastVerifiedAt` field and warn in admin UI if >90 days.

### H-55 — `calculateCost` returns 0 for unknown models without warning
Lines 110-114 — unknown model → 0 cost. Adding a new model without updating MODEL_PRICING silently makes that model "free" in token-usage reports. Action: return null + log warning, render "unknown" in UI.

### H-56 — No per-tenant token / cost budget enforcement
`logTokenUsage` records usage but no code checks it against any limit. A runaway pipeline on Claude Opus 4.5 (`$15/$75 per 1M`) can spend hundreds of dollars in minutes for a single tenant. With C-9 (no rate limit), abuse is trivial. **Required before public launch with shared API keys.**

### H-57 — `verifyProvider('anthropic')` hardcodes `claude-haiku-4-5`
`ai.ts:34`. If the user's API key has restricted access (e.g., only Sonnet permitted, or Haiku 4.5 not yet available), verification fails — even though Sonnet/Opus might work. Try multiple models in fallback order.

### H-58 — `stripProviderSecrets` defined but only used in one place
Confirm in next grep — any API route returning settings without stripping is leaking keys to the client. The settings endpoint must always strip.

### H-59 — `ProviderSettings` lacks Zod/runtime validation
`normalizeProviderSettings` papers over malformed input with `Partial<>` merges. A malicious or buggy client could submit `gemini.apiKey = {malicious: 'object'}` and the merge would pass through unchanged until later code crashes. Add a Zod schema validation at the API boundary.

### M-29 — `verifyVisualProvider` test prompt is fixed "blue circle"
`ai.ts:122`. Always submits the same image-gen request. No throttling on repeated calls = expensive verification spam. Cache result for N hours.

### M-30 — Gemini API key transmitted in URL query string (`?key=`)
`ai.ts:70, 80, 116, 166`. URLs get logged in proxies/CDNs/access logs. Use `x-goog-api-key` header instead.

### M-31 — `MODEL_OPTIONS` in `providers.ts` and `MODEL_CATALOG` in `model-pricing.ts` are duplicates
Two source-of-truth lists for available models. Will drift.

### M-32 — `resolveTaskRuntime` has 9 nested ternaries
Lines 305-322 — hard to read, hard to test, hard to debug. Refactor to a strategy table.

### L-15 — `maskApiKey` shows first-4-last-4 with bullets
`providers.ts:49-53`. For short keys this could expose enough characters to brute-force. Use a uniform `••••••••<last4>` format.

### L-16 — Default Ollama base URL `http://localhost:11434` (not host.docker.internal)
`provider-settings.ts:54`. In Docker the user must override. Docker-compose env overrides to `host.docker.internal:11434` but the in-app default is dev-local. Cosmetic.

---

## Batches 7-9, 16-17 — Chat/Skills APIs, Integrations, Billing, Scheduled tasks

### C-21 — Stripe webhook has NO signature verification
`src/app/api/billing/webhook/route.ts:21-36` — the entire signature verification block is commented out, with a TODO to enable when Stripe is configured. Right now ANY HTTP request to `/api/billing/webhook` is parsed as a Stripe event and trusted: an attacker sends `{type:'checkout.session.completed', data:{object:{metadata:{tenant_id:'X', plan_id:'enterprise'}}}}` and tenant X gets upgraded to enterprise. Currently exploitable because the route is up and accepts unsigned events. **Launch blocker.** Either (a) require `STRIPE_WEBHOOK_SECRET` and reject unsigned, or (b) take the route offline (return 503) until Stripe is wired.

### C-22 — `/api/billing/upgrade` performs DB upgrade without payment
`src/app/api/billing/upgrade/route.ts:56-70` — direct UPDATE to subscriptions setting `plan_id, agent_limit, status='active'`, no payment, no charge, no checkout session. Any authenticated user can POST `{planId:'enterprise'}` and self-upgrade to unlimited free of charge. **Worst monetization bug imaginable.** Action: until Stripe is live, restrict POST to super_admin role only, or gate behind a feature flag.

### C-23 — File-serving endpoints are unauthenticated and not tenant-scoped
`/api/agent-photos/file/[filename]/route.ts` and `/api/client-assets/file/[filename]/route.ts` — both flat-file lookups under `public/uploads/{agents|clients}/`. No auth required. No tenant check. The filename sanitisation `replace(/[^a-zA-Z0-9._-]/g, '')` doesn't enforce who owns the file. **Any user (even unauthenticated visitors) can fetch any file from any tenant if they know/guess the filename.** Per-client uploads share a flat directory `public/uploads/clients/<filename>` — no client-scoped subdir, so file collision (or guessing common names like `logo.png`) reveals other tenants' assets. Action: require auth + check that the file belongs to a client in the user's tenant; consider serving via signed URLs with per-tenant subdirectories.

### C-24 — `/api/agent-photos` GET is unauthenticated; leaks agent photo map
Returns the entire photo map for every agent (which includes user-uploaded photos at predictable URLs). Should require auth + tenant scope.

### H-60 — Scheduled-task cron uses owner-first user's API keys
`src/app/api/scheduled-tasks/tick/route.ts:100-108` — finds the FIRST user (ORDER BY created_at ASC) in the tenant and uses THEIR provider keys to execute the task. So a scheduled task created by member B silently bills the tenant owner A. Privacy + cost-attribution bug. Action: store `created_by_user_id` on `scheduled_tasks` and use that user's keys.

### H-61 — Failed scheduled tasks can become orphaned
`tick` UPDATE-RETURNING clears `next_run_at` to NULL atomically. If `runTask` then fails, `computeNextRunAt` is called and writes the next time — but if `runTask` throws BEFORE reaching that line (e.g., DB connection error after the initial UPDATE), the task stays at `next_run_at=NULL` forever and never re-runs. Action: clear `next_run_at` only after successful `computeNextRunAt`; use a try/finally to always reset.

### H-62 — `CRON_SECRET` failure mode is silent
If `CRON_SECRET` is not set on the VPS, line 185 returns 403 for all tick calls and scheduled tasks never fire. No error log, no alert, no UI signal. Many admins won't notice for days. Action: add a "no upcoming runs ran in last hour" alert; document `CRON_SECRET` as required.

### H-63 — Naive hand-rolled PDF text extraction
`client-assets/upload/route.ts:43-83`. Regex over `latin1`-decoded raw bytes catches simple PDF1.x literal strings; misses Flate-compressed streams (95% of modern PDFs), font CMaps, ToUnicode mappings. Most uploaded briefs will extract gibberish or empty. Use `pdf-parse` or `pdfjs-dist`. Already noted: `pdf-lib` is in deps but used for fill only.

### H-64 — Naive DOCX text extraction
Same file, lines 110-118 — scans for `<w:t>` regex in latin1 raw bytes (DOCX is a ZIP archive). Misses headers, footers, tables, list items, and any document where the inner XML is split/wrapped differently. Use `mammoth` (industry standard).

### H-65 — Asset upload caps are tenant-blind hardcoded
20 MB documents, 10 MB other. Should be tier-based: free → 5 MB, starter → 25 MB, growth → 100 MB, enterprise → unlimited.

### H-66 — No virus scanning / MIME re-validation on uploads
`client-assets/upload/route.ts` accepts the client-stated MIME type. SVG uploads accepted — SVG is XML, can contain `<script>` and execute on view. PDFs can carry JS. No ClamAV scan. Combined with the unauthenticated file-serving routes (C-23), an attacker uploads a malicious SVG, then shares its URL with another tenant's users to execute XSS in their session. Action: re-detect MIME server-side, disallow SVG (or sanitize), integrate ClamAV.

### H-67 — Triplicated "is this an invalid AI response" heuristics
`enforceArtifactTruth`, `enforceDeliverableDraft`, `isInvalidFinalDeliverable`, `looksLikeUsableDeliverable` — four near-duplicate string-list checks across chat/route.ts and autonomous-task.ts. Easy to update one and forget the others.

### H-68 — Meta Graph API version `v20.0` hardcoded
`api/integrations/meta/insights/route.ts:10`. Meta deprecates Graph API versions ~every 2 years. Move to env or to provider settings.

### H-69 — Meta access token passed in URL query string
Lines 47-48, 56-57 — `&access_token=${token}`. Tokens get logged in proxy/load-balancer/CDN logs. Industry practice is `Authorization: Bearer` for Graph API (Meta supports both).

### H-70 — Higgsfield base URL hardcoded
`api/integrations/higgsfield/generate/route.ts:10`. Make per-tenant or env-configurable.

### H-71 — `getDefaultAgencyId()` falls back to slug `'default-agency'` in chat
`chat/route.ts:145-153`. If `auth.tenantId` is missing, code somewhere may query `'default-agency'` and **mix data across tenants**. Verify the chat route never uses the default fallback when an auth tenantId exists. Multi-tenant boundary must be enforced top-level.

### M-33 — `loadPipelines()` / `loadSkills()` hit DB on every chat call
`chat/route.ts:175-197 +`. No cache. At ~100 chat messages/day/user/agency = 200 DB roundtrips just for setup. Add a request-scoped or short-TTL in-memory cache.

### M-34 — Chat route imports a helper from another route file
`chat/route.ts:26` imports `extractClientFieldsFromText` from `iris/parse-client-brief/route.ts`. Routes should not export helpers; pull this into `src/lib/server/client-brief-parser.ts`.

### M-35 — Asset upload returns absolute server `path` in response
`client-assets/upload/route.ts:180` — `path: destination`. The server's absolute file path is leaked to the client. Reveals deploy structure. Remove from response.

### M-36 — `verifyProvider` model `claude-haiku-4-5` may not exist in user's plan
Already in Batch 6. Worth flagging again.

### M-37 — Provider-settings GET returns full settings including apiKey
`/api/providers/settings/route.ts:43-46` returns `auth.providerSettings` directly. That object DOES contain the raw apiKey fields (per `loadPersistedProviderSettings` shape). **Every settings page load sends every API key to the browser as JSON** — they end up in browser caches, dev-tools network tab, browser history. `stripProviderSecrets` exists in code but is never imported here. Action: call `stripProviderSecrets(auth.providerSettings)` before returning; only send `maskedKey`.

### L-17 — `extractClientFieldsFromText` in `chat/route.ts` imported from another route
Sign of poor module boundaries.

### L-18 — `debugLog` in chat route only fires in development
Good. But the entire log message could include user prompts → PII risk if dev env is shared.

### L-19 — Billing routes lack idempotency
`POST /api/billing/upgrade` and webhook handlers don't track event IDs. Stripe sends duplicates on transient failures; could double-update a subscription.

---

## Batches 10-15, 18-19 — Stores, UI, Pages, Skills, Pipelines, Output, Office, Cleanup

### C-25 — Shared output page is PUBLIC for any output ID
`src/app/share/output/[id]/page.tsx:14-25` does `SELECT * FROM outputs WHERE id = ${id} LIMIT 1` — no auth, no tenant scope. Anyone who knows or guesses an output UUID can read any tenant's generated content. Strategy briefs, ad copy, content calendars — all readable by URL enumeration. **Massive multi-tenant data leak.** Action: require a `share_token UUID` column, set it only when an admin clicks "Share", expire after N days, verify on render.

### C-26 — Share-output renders LLM content via `dangerouslySetInnerHTML`
Same file, line 49 — `dangerouslySetInnerHTML={{ __html: html }}`. If the LLM ever emits `<script>` (e.g., via prompt injection), it runs in every viewer's browser. With the broken prompt-safety (C-18) and shared output (C-25), an attacker can: (a) inject a script via prompt injection, (b) get the output ID, (c) share the URL with target users → stored XSS, token theft. Sanitize HTML with DOMPurify before render, or render markdown instead of raw HTML.

### H-72 — User-scoped state, not tenant-scoped
`src/app/api/state/route.ts:46-66` `filterStateForUser(state, userId)` filters by `ownerUserId === userId`, not by tenant. So even within the same tenant, members can't see each other's clients/missions/artifacts. **The "team workspace" promise of a tenant is broken** — every member is isolated to their own data. Either intentional (user-scoped data) and should be documented, or a bug (tenant should share). Tenant admins certainly expect to see all their team's work.

### H-73 — `resolveAgencyId` and chat-route both fall back to `default-agency`
`relational-sync.ts:30` + `chat/route.ts:145`. If `auth.tenantId` is null for any reason (auth context bug, race, stale token), data lands in/comes from the global default-agency. **Cross-tenant data co-mingling possible.** Action: make `tenantId` strictly required for every multi-tenant read/write; throw if missing.

### H-74 — Zero tests in the entire codebase
`find . -name '*.test.*' -not -path './node_modules*'` returns 0 files. No unit tests, no integration tests, no E2E tests, no smoke tests. No CI configured (no `.github/workflows/`, no `.gitlab-ci.yml`). For a SaaS hitting paying customers, this is exceptional risk. Action: add at minimum smoke tests for: auth/login, chat/route, billing/upgrade rejection, multi-tenant isolation, OAuth callback, scheduled-tasks tick.

### H-75 — Mega-components, hard to maintain
- `IrisChat.tsx` — 2,315 LOC
- `settings/page.tsx` — 1,649 LOC
- `tasks/[id]/page.tsx` — 1,116 LOC
- `clients/page.tsx` — 1,104 LOC
- `schedules/page.tsx` — 804 LOC

These files mix data fetching, state, complex forms, multiple modal flows, all in one component. Bug-fix changes are risky. Reasonable scale: ~300 LOC per page; split into sub-components.

### H-76 — `settings/page.tsx` includes a `PasswordChangeCard` inline component
Means even simple changes to password change UX require editing the 1,649-LOC mega-component. Extract.

### H-77 — `node_modules_broken_20260331/` retains 704 MB of stale deps in repo
Already in `.gitignore` so it doesn't get pushed, but it's on the dev Mac filesystem. Confusing. Delete with `rm -rf node_modules_broken_20260331`.

### H-78 — `launcher-apps/` + `launcher-assets/` + `start-mission-control.sh` + `stop-mission-control.sh` + `README-LAUNCHER.txt` are legacy artifacts
Old macOS launcher packaging from a pre-Docker era. Total ~2.4 MB. Confirm nothing imports/runs them; delete.

### H-79 — `campaigns/page.tsx` is a 5-line redirect to `/tasks`
Leftover from a rename. Should either be deleted (and the Sidebar nav updated to point at `/tasks` directly) or kept with a clear comment.

### H-80 — Package.json scripts list NO test command
Only `dev/build/start/lint`. No CI gate possible. Add `test` script even if it points at a placeholder.

### H-81 — Skills system has 162 skills as static files
`data/skills/<id>/SKILL.md` — frontmatter + markdown. Each skill defines workflow, checklist, output template. **6 MB of skill content baked in.** Editing requires file system access (no admin UI for tenant-specific skill overrides). Skill changes shipped per build.

### H-82 — `agents-store.ts` is 678 LOC with persisted Zustand
Zustand `persist()` middleware writes the entire store to `localStorage`. **Includes provider settings (which may contain API keys post-merge).** API keys can end up in localStorage AGAIN, exfiltratable via XSS. Confirm: provider settings should NEVER persist to localStorage; should fetch on demand from `/api/providers/settings`.

### H-83 — Skill schema requires `prompts.en` mandatory but `ar` optional
Reasonable since most users are English. But the agent registry references bilingual prompts inconsistently. (See H-32 — classifier is English-only despite agents having Arabic prompts.)

### M-38 — Agents have `provider`, `model`, `temperature`, `maxTokens` baked into config JSON
e.g., `iris/agent.json` has `"ai":{"provider":"ollama","model":"minimax-m2.7:cloud","temperature":0.4,"maxTokens":4096}`. These are hardcoded defaults that override user provider settings in `resolveTaskRuntime`. If user disables Ollama, Iris-defaulted requests still try Ollama. Need clear precedence: user settings should override agent defaults except for explicit overrides.

### M-39 — Pipelines are 1408 LOC in a single JSON file (`pipelines.json`) + 6 sub-files
Confirm whether `pipelines.json` is the index or a duplicate. Either way, JSON edit + redeploy needed to add a pipeline.

### M-40 — Pipeline execution + workflow engine + workflow store (1.5K+ LOC total)
Three separate modules for pipeline orchestration. Need to confirm they're not stale (since autonomous-task does most of the orchestration directly).

### M-41 — `public/uploads/clients/` directory is FLAT
All client assets across all tenants land in one dir. With the C-23 unauth file serving, anyone enumerating filenames sees everything.

### M-42 — `pageProps: params: Promise<{...}>` pattern used everywhere
Next 16 async params. Correct usage. Just a note.

### L-20 — `data/skills/` is 6 MB committed to repo
Acceptable; gitignored separately would be wrong because they're configuration. But heavy to ship in the Docker image. Verify `.dockerignore` doesn't bloat.

### L-21 — Pipelines, plans, workflows all written in JSON
Hard to version-control diffs. Hard for non-engineers to read. Acceptable for now; migrate to DB-stored configs eventually.

### L-22 — `mission-control-claude-genspark_ai_developer` and `PenPoint` excluded in tsconfig but don't exist
Stale config (already noted in M-2).

### L-23 — `.fuse_hidden0000001300000001` in `src/lib/stores/`
Linux FUSE artifact, harmless but tidy.

---

## 🗺️ App Capabilities (as confirmed from code, not docs)

_Populated incrementally. Goal: by end of audit this section is the ground-truth description of what the app does, page-by-page and feature-by-feature._

### Confirmed (so far)

**Chat & API surface (Batches 7-9, 16-17):**
- Chat: POST `/api/chat` is the main user entry — accepts message, classifies, routes, generates, persists task + output, returns artifact
- Iris: `/api/iris/parse-client-brief` extracts brand fields from pasted text (its `extractClientFieldsFromText` helper is also imported by the chat route)
- Skills CRUD: `/api/skills`, `/api/skills/[id]`, `/api/skills/import` (zip + multi-skill bundles)
- Provider mgmt: `/api/providers/settings` (per-user CRUD), `/api/providers/verify` (test connection), `/api/providers/models` (refresh from API)
- Token usage: `/api/token-usage` reads token_usage table; no enforcement
- Scheduled tasks: cron-driven via `/api/scheduled-tasks/tick` (needs `CRON_SECRET` env), tick clears `next_run_at` atomically, runs Promise.allSettled
- Billing: `/api/billing/subscription` (GET tenant plan), `/api/billing/upgrade` (DIRECT DB UPDATE — no Stripe yet, ANY USER CAN UPGRADE TO ENTERPRISE), `/api/billing/webhook` (Stripe handler scaffolded but **signature verification commented out**)
- Integrations: `/api/integrations/meta/{insights,optimize,accounts,campaigns}` (Meta Graph v20.0 hardcoded; token in query string); `/api/integrations/higgsfield/{generate,status}` (video gen via Higgsfield AI)
- File serving: `/api/agent-photos/file/[filename]` and `/api/client-assets/file/[filename]` — **unauthenticated, flat-file lookup, no tenant scoping**
- Asset upload: `/api/client-assets/upload` accepts multipart, 20/10MB caps, extracts text from PDF/DOCX with hand-rolled parsers
- Higgsfield is the **video generation** provider — different from the visual provider (Gemini for images)

**AI provider layer (Batch 6):**
- 4 supported providers: Ollama (default, local), Gemini (Google), Anthropic, OpenAI
- Per-user provider settings stored at `data/provider-secrets.json` (Docker volume `mc_secrets`) — **plaintext, no encryption**
- Settings model includes: keys, masked keys, verified flag, available models, default model; plus routing config (primaryProvider, fallbackProvider, runtimeMode = `fast`/`thinking`/`compare`)
- 11 "thinking" deliverable types route to Gemini if `useGeminiForThinking` is on
- 10 "content-generation" deliverable types prefer Ollama → Gemini fallback
- Visual provider separate: Gemini with `gemini-3-pro-image-preview` model (model name suspect — verify)
- MCP integrations declared in settings but not yet wired: browserInspector, seoCrawler, searchConsole, accessibilityProbe
- Meta + Higgsfield access stored alongside AI keys (same file, same plaintext)
- `resolveTaskRuntime` is the routing brain — 9 nested ternaries
- Token usage logged to `token_usage` table per request; cost computed from hardcoded `model-pricing.ts`
- MODEL_PRICING dated "May 2026"; no freshness check; unknown models silently cost $0

**AI engines (Batch 5):**
- **creative-asset-engine** (517 LOC): Finn → concept memo (4 sections); Echo → copy memo (5 sections); Lyra → "Nano Banana Master Prompt" memo (6 sections); compose into a 13-section Creative Asset Production Pack; optional Gemini image gen via `generateBrandedCreativeAsset` (uses up to 4 reference images, base64-encoded into request); Iris quality review
- **content-calendar-engine** (1854 LOC): 5-stage JSON pipeline — ideas → hook options → selected hooks → post bodies → visual briefs → schedule. Each stage has 3 retry attempts with reduced temperature, plus salvage-array-objects fallback for truncated JSON.
- **image-production.ts**: reference-image loader (base64-encoded; max 4); aspect-ratio inferrer; file output to `/app/public/uploads/generated/<slug-uuid>.{png,webp,jpg}`. Currently calls Gemini's `gemini-3-pro-image-preview` model (verify exists).
- **output-quality.ts**: per-deliverable required-section list + lightweight-types whitelist (campaign-copy/short-form-copy/status-report/general-task/pr-comms skip H1); content-calendar requires pipe table; short-form-copy enforces requested character limits if specified; scoring is `100 - issues*15`
- **prompt-safety.ts**: minimal sanitization — strips control chars, `{{...}}` → `[...]`, `ignore prior instructions` → `[removed]`. Easily bypassed.

**AI routing core (Batch 4):**
- 23 deliverable types in `deliverable-registry.ts`, each with: patterns (regex), default lead agent, collaborators, optional pipeline link, priority, complexity, execution hints
- Iris classifier is **isomorphic** — runs both client (in IrisChat for instant preview) and server (in /api/chat for routing)
- Classification pipeline: `isConversationalMessage` → if not casual, `inferDeliverableType` → `inferRoutingContext` returns `{routedAgentId, collaboratorAgentIds, pipelineId, deliverableType, confidence, clientId?}`
- 8 content-signal regex tied to specific agents (visual→lyra, research→atlas, copy→echo, channel→nova, kpi→dex, timeline→piper, concept→finn, exec→sage)
- Three execution paths in `executeAutonomousTask`:
  - **`creative-asset`** (image briefs) → `executeCreativeAssetTask` → Creative Asset Production Pack (12 sections)
  - **`content-calendar`** → `executeAutomatedContentCalendar` → multi-post calendar
  - **everything else** → optional pipeline phases × activities + N collaborator handoffs + final lead-agent assembly
- Quality gates: `validateDeliverableQuality` (output-quality.ts, 140 LOC) + `validateSkillChecklists` (skills/checklist-validator.ts) → one repair pass with `buildQualityRepairPrompt`
- Anti-coordination-language guard: `isInvalidFinalDeliverable` blocks responses containing meta-language and retries
- Anti-misclassification guard at line 888-893 catches social-post-text-only requests that slipped through as creative-asset
- Provider fallback: Ollama↔Gemini for content tasks; if user's preferred provider fails, try the other; no other pairs supported
- Pipeline templates: 7 JSON configs in `src/config/pipelines/` (ad-creative, campaign-brief, competitor-research, content-calendar, media-plan, seo-audit, pipelines [index])
- Pipeline auto-skip: activities with IDs `profile-review`, `select-ideas`, `review-posts` auto-complete without human approval

**Multi-tenancy & admin (Batch 3):**
- Tenant = `agencies` table; every user has a profile row pointing to one tenant
- New tenants auto-created at signup with a free plan and free subscription
- Plans seeded as `free/starter/growth/enterprise`; admin UI at `/admin/plans` allows creating custom plans (id slug auto-generated)
- Plan limit enforcement: `canAddAgent(tenantId)` checked on agent upsert in `/api/state` route; returns `{allowed, limit, current}`; `enterprise` (max_agents = -1) bypasses limit
- Agent count denormalized into `subscriptions.current_agent_count`; refreshed by fire-and-forget `syncAgentCount(tenantId)` after upsert
- Super-admin pages: `/admin/tenants`, `/admin/plans`, `/admin/backups`
- Super-admin APIs: `/api/admin/{tenants, users, plans, assignments, backfill-ownership, backup, clients/:id/delete, clients/:id/export}`
- Tenant-admin APIs: `/api/tenant/users` (list/create/update/delete members of own tenant)
- Backup feature: tar.gz of DB tables (hardcoded list) + uploads, stored at `/app/backups` (NOT a persistent volume), custom hand-rolled tar implementation
- GDPR: per-client export (`/api/admin/clients/:id/export`) and delete (`/api/admin/clients/:id/delete`) — both correctly tenant-scoped
- "Delete" of a tenant member only nulls their profile.tenant_id; user account persists and next login spins them a new tenant

**Auth system (Batch 2):**
- Custom JWT (HS256, jose) with 7-day expiry, no refresh token
- Email + password (bcryptjs cost 12), 8-char minimum, no complexity rules
- Token stored in `localStorage` under `mc_auth_token` (XSS risk)
- Self-serve signup at `/register` (page exists per inventory — verify in Batch 12) → creates user + profile + tenant + free subscription in one POST
- No email verification, no password reset, no MFA, no SSO
- Login = `POST /api/auth/session` (route doubles as session-check on GET)
- `resolveAuthContextFromToken` is the universal API-route auth helper; performs an UPSERT on `profiles` every call, auto-provisions a tenant if missing
- Role hierarchy: `super_admin` (env-pinned email) → `admin` → `member`
- `SessionGate` is the client-side page guard; redirects unauthenticated to /login; redirects non-super-admin away from /settings, /config, /skills, /pipeline, /users
- Google OAuth scope: docs+sheets+drive+adwords; redirect URI broken (no /callback route)
- Meta OAuth scope: ads_management,ads_read,pages_read_engagement,business_management; tokens never persisted
- Version-check hook polls `/api/version` every 60s and hard-reloads window on build-id change

**Foundation / Infrastructure (Batch 1):**
- Next.js 16.2.4, React 19.2.5, TypeScript 5.9.3, Tailwind 3.4, Zustand 4.5, postgres.js 3.4
- Docker stack: postgres:16-alpine + node:20-alpine (multi-stage build, standalone output, non-root user)
- DB schema (19 tables on live prod): users, profiles, agencies, plans, subscriptions, agents, clients, skills, pipelines, tasks, task_assignments, outputs, conversations, messages, knowledge_assets, mission_control_state, scheduled_tasks, token_usage, office_layouts
- Auth: custom JWT with bcryptjs password hashing, `jose` HS256 signing
- DB connection: postgres.js from container, `DATABASE_URL=postgresql://mc_user:***@db:5432/mission_control`
- Plans: free (3 agents, $0), starter (10, $49), growth (25, $99), enterprise (unlimited, $299) — seeded automatically
- Subscriptions: every agency gets a row (backfilled on tenant creation), `agent_limit` snapshotted at subscribe time
- Persistent volumes: `mc_db_data` (postgres), `mc_uploads` (`/app/public/uploads`), `mc_secrets` (`/app/data` for provider keys JSON)
- Per-user AI provider keys: NOT in env, stored in `data/provider-secrets.json` on the Docker volume
- Ollama integration: `host.docker.internal:11434` so VPS-host Ollama is reachable from container
- Office system has a monetization layer: `office_layouts.mc_credits INTEGER` + `owned_assets TEXT[]` — confirms the app has an in-app credits/asset-purchase model

### Suspected (from inventory, needs verification)
- Multi-tenant SaaS with custom JWT auth (no Supabase auth, no NextAuth)
- 10 named AI "agents" each with personality config files (IDENTITY/SOUL/STYLE/RULES/etc.)
- Iris chat as primary user entry → intent classifier → autonomous task dispatcher
- Three generation engines: creative-asset (visual briefs), content-calendar, image-production
- 4-tier plan system (free / starter / growth / enterprise) — Stripe routes exist but unwired
- Meta Ads + Google + Higgsfield (AI video?) integrations
- Office/mission visual system (Konva-based — `react-konva` in deps)
- 160+ "skills" — marketing/strategy/research playbooks driving the agents
- Skill packages (importable bundles)
- Scheduled tasks with cron-like ticking
- Per-user AI provider keys (Anthropic, OpenAI, Gemini, Ollama)
- Token usage tracking
- Backup + export system for admin

---

## 🚧 Known Limitations / Gaps

### Batch 1 — Foundation
- **No automated DB migration pipeline.** `init.sql` runs once on first container start; subsequent schema changes require manual `psql` invocations (per HANDOFF_GUIDE §6). No tracking of which migrations applied.
- **No connection pooling / pgbouncer.** Single Postgres, no read replica. Single point of failure.
- **No app healthcheck** in Dockerfile or docker-compose for `mc_app`. Restart-on-failure won't trigger from hangs.
- **No log shipping / centralised observability.** Logs live in container stdout, dropped on restart.
- **No backup automation.** `/api/admin/backup` route exists (will inspect in Batch 3) — verify cron/cadence and offsite storage.
- **No staging environment.** Single VPS, prod = main branch. Risky for monetization launch.
- **No CI/CD.** Deploy is manual `ssh && git pull && docker compose build && up -d` — no test gate, no linting blocker, no smoke test post-deploy.
- **No rate limiting on Docker app layer.** Nginx/Caddy not in compose stack. Direct `:3000` exposure means a single client can hammer the app.
- **No TLS in the deploy chain.** App is served `http://72.62.33.12:3000` per HANDOFF_GUIDE. Production-monetization-ready means HTTPS-only, which requires a domain + reverse proxy.

---

## 🧱 Hard-Coded Values to Make Configurable

_Format: `file:line — what's hard-coded — proposed config location`._

### Batch 1 — Foundation
- `docker/init.sql:51-55` — Plan tiers (`free/starter/growth/enterprise` + prices `0/49/99/299` + limits `3/10/25/-1`) — should be editable via admin UI; currently any price change needs a DB migration + redeploy. Move to admin → plans page (route already exists at `/admin/plans`) and have init.sql only seed if empty.
- `docker-compose.yml:45` — `OLLAMA_BASE_URL` default `http://host.docker.internal:11434` — already overridable via env, ✓ fine.
- `Dockerfile:50-52` — PORT/HOSTNAME hardcoded — fine for container; OK.
- `tailwind.config.ts:43-48` — borderRadius scale fixed — fine for design system.
- `tailwind.config.ts:55-69` — animation durations hard-coded — fine, design system.
- `next.config.mjs:7` — `BUILD_ID = Date.now().toString()` — depends on use; if version-check hook needs deterministic builds, consider `process.env.GIT_SHA` instead.
- `docker/init.sql:286-287` (supabase migration) — `Default Agency` seed with slug `default-agency` — fine, but verify whether the app actually uses this anywhere or if it's tenant-routed from JWT only.

---

## 🪦 Dead Code / Files No Longer Used

_Populated as audit proceeds. Format: `path — why suspected dead — confidence`._

### Suspected (from inventory)
- `node_modules_broken_20260331/` — 251 dirs of old broken modules; ~confirmed garbage, delete in cleanup
- `.sandbox.log` (1.3 MB) — dev artifact, gitignore
- `.sandbox.pid`, `.mission-control-server.pid` — dev artifacts
- `.DS_Store` files throughout — macOS metadata, gitignore
- `appscript.md` — Google Apps Script note? Check
- `launcher-apps/`, `launcher-assets/`, `start-mission-control.sh`, `stop-mission-control.sh`, `README-LAUNCHER.txt` — old "launcher" packaging, may not match current deploy

---

## 🔐 Security Watchlist

_Populated as audit proceeds._

### Already noted
- ⚠️ `.env.local` contains live secrets including `GEMINI_API_KEY=AIzaSyB...` and Google/Meta client secrets — **needs rotation** if this repo was ever pushed publicly (need to check git history)
- ⚠️ Live `DB_PASSWORD` and `JWT_SECRET` documented in `HANDOFF_GUIDE.md` — fine in private repo but flag if repo ever goes public

---

## 💸 Monetization-Readiness Watchlist

_Populated in Batch 16, but flag any pricing/plan gating logic encountered along the way._

### Already noted
- Plan tiers exist in code: free (3 agents), starter (10 / $49), growth (25 / $99), enterprise (unlimited / $299)
- `/api/billing/*` routes exist (subscription, upgrade, webhook) — Stripe-ready but per docs not wired
- Need to verify: how plan limits are enforced, where, and whether unauthenticated bypass exists

---

## 🆕 Own Audit Dimensions Added

Beyond the user-requested set (logic, performance, integrity, security, UX/UI, capabilities, limitations, dead code, hard-coded), this audit also examines:

1. **Observability & error handling** — do API routes return useful errors, is there structured logging, are failures recoverable
2. **Database integrity** — FK constraints, indexes, migration order, idempotency
3. **Race conditions & concurrency** — scheduled tasks, queue handling, concurrent edits
4. **Data residency & privacy** — where user content/PII lives, deletion paths, GDPR-readiness
5. **Test coverage** — are there any tests at all? Smoke tests? CI?
6. **Type safety quality** — `any`, `unknown`, unsafe casts, missing zod/schema validation at boundaries
7. **Bundle size & client perf** — what ships to the browser, RSC vs client components, dynamic imports
8. **SEO / metadata** — does the public surface have proper meta tags
9. **Accessibility (a11y)** — keyboard nav, ARIA, contrast
10. **Internationalization** — hard-coded strings, currency, dates
11. **Rate limiting & abuse protection** — chat endpoint, auth endpoint, OAuth, file uploads
12. **Onboarding & empty states** — first-time UX, demo data, tooltips
13. **Cost controls** — token budget per user, plan-tier model gating, max tokens per request
14. **Disaster recovery** — backup automation, restore tested, single-VPS SPOF
15. **Compliance footnotes** — ToS/Privacy/Cookies, Meta Platform Terms, OpenAI/Anthropic ToS for SaaS resale

---

## 📝 Open Follow-ups / Questions for User

1. Should we sync the VPS to `18cacf5` (docs catch-up)?
2. Commit `HANDOFF_GUIDE.md` + this audit file to repo?
3. Is the repo currently private on GitHub (for secrets-in-history risk)?
4. Is there an existing test suite I'm missing, or is "no tests" the actual state?
5. Is `data/provider-secrets.json` storing keys in plaintext or encrypted at rest?

---

## 📚 Reference Map (where things live)

### Entry points
- Server start: Docker → `npm start` → Next 16 standalone
- Client entry: `src/app/layout.tsx` → `ClientShell` → page

### Auth
- JWT: `src/lib/auth/jwt.ts`
- Server context: `src/lib/auth/server.ts` (userId, email, role, tenantId, providerSettings)
- Browser helper: `src/lib/auth/browser.ts`
- Routes: `src/app/api/auth/{register,password,session,google,meta}/route.ts`
- Guard: `src/components/auth/SessionGate.tsx`

### State
- Client: `src/lib/agents-store.ts` (+ sub-files), `src/lib/analytics-store.ts`, stores/*
- Server: `src/lib/db/{client,config,app-state,relational-sync}.ts`
- Per-tenant scoping: `src/lib/server/tenants.ts`

### AI brain
- Classifier: `src/lib/intents/intent-classifier.ts`
- Registry: `src/lib/intents/deliverable-registry.ts`
- Dispatcher: `src/lib/server/autonomous-task.ts`
- Engines: `src/lib/server/{creative-asset-engine,content-calendar-engine,image-production}.ts`
- Output formatter: `src/lib/task-output.ts`
- AI calls: `src/lib/server/ai.ts`
- Provider layer: `src/lib/provider-settings.ts`, `src/lib/providers.ts`, `src/lib/server/provider-secrets.ts`

### Skills
- Registry: `src/lib/skills/registry.ts`
- Scoring: `src/lib/skills/scoring.ts`
- Validator: `src/lib/skills/checklist-validator.ts`
- Catalog (server): `src/lib/server/skills-catalog.ts`
- Data: `data/skills/<skill-id>/SKILL.md` + sub-files

### Office/mission visual
- Office types: `src/lib/office-types.ts`
- Office templates: `src/lib/office-templates.ts`
- Office assets: `src/lib/office-assets.ts`
- Components: `src/components/office/OfficeBuilder.tsx`, `OfficeFloor.tsx`
- Mission stage: `src/lib/mission-stage.ts`
- Bot animations: `src/lib/bot-animations.ts`

### Schemas / configs
- DB init: `docker/init.sql`
- Migrations: `supabase/migrations/`
- Model pricing: `src/config/model-pricing.ts`
- Pipeline configs: `src/config/pipelines/*.json`
- Agent roles: `src/config/agent-roles/agent-roles.json`
- Workflows: `src/config/workflows/campaign-workflows.json`
- Quality checkpoints: `src/config/checkpoints/quality-checkpoints.json`
- Client templates: `src/config/client-templates/client-templates.json`
- Tools config: `src/config/tools/tools-config.json`
- Skill schema: `src/config/schemas/skill.schema.json`

---

## 🧪 Methodology

For each batch:
1. **Read every file in scope, fully.** No skimming.
2. **Trace the call graph** — who imports this, what does it call, what does it return.
3. **Verify against runtime state** — if a file references DB tables, check the schema; if it references env vars, check `.env.local` / `init.sql`.
4. **Record findings inline** under the right severity bucket (Critical / High / Medium / Low) with file:line.
5. **Update Capabilities** with what this batch reveals the app can do.
6. **Update Limitations** with anything missing / broken / unfinished.
7. **Note dead code** discovered.
8. **Note hard-coded values** discovered.
9. **Update progress tracker** + push memory file (commit at batch end).

Severity definitions:
- **Critical** = blocks production launch (security breach, data loss, broken auth, no error handling on payment)
- **High** = visible UX or business impact, must fix before public users
- **Medium** = should fix before scaling, won't block launch
- **Low** = cleanup, polish, tech debt
