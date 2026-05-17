# Mission Control — Production & Monetization Audit
## Final Report

> **Date:** 2026-05-15
> **Scope:** Full code-grounded audit of 188 TypeScript/TSX files (~48,000 LOC), 19 DB tables, 52 API routes, 28 pages, 10 agent configs, 7 pipelines, 162 skills, Docker deploy, and live VPS state.
> **Companion file:** `MemoryForAudit.md` contains all 100+ findings with file:line precision.

---

## Part 1 — What the app actually does (from code, not docs)

Mission Control is a **multi-tenant Next.js 16 SaaS** for marketing agencies. A user signs up at `/register`, which creates a `users` row + `profiles` row + an `agencies` row (the "tenant") + a free `subscriptions` row, then issues a 7-day JWT with `tenantId` embedded. Every subsequent API call resolves auth via `resolveAuthContextFromToken`, which UPSERTs the profile and auto-provisions a tenant if missing.

Inside the workspace, the user lands on a `dashboard` and interacts primarily with **Iris** — a right-rail chat overlay (`IrisChat.tsx`, 2,315 LOC) that drives almost everything. When the user types a request:

1. **Classify.** `inferDeliverableType()` runs on both client and server (isomorphic module). It uses a 23-entry deliverable registry — each entry has a regex pattern array, default lead agent, supporting collaborators, optional pipeline link, priority, and complexity tag. Score-based with explicit short-circuits (e.g., "Instagram post" always → `campaign-copy`, never `creative-asset`).
2. **Route.** `inferRoutingContext()` returns `{routedAgentId, collaboratorAgentIds, pipelineId, deliverableType, confidence, clientId}`. 10 named agents — atlas, dex, echo, finn, iris, lyra, maya, nova, piper, sage — each defined by 10 markdown/JSON files (IDENTITY, SOUL, STYLE, RULES, MEMORY, HEARTBEAT, CONTEXT, SKILL_SELECTION, HANDOFFS, agent.json).
3. **Generate.** `executeAutonomousTask()` dispatches one of three paths:
   - `creative-asset` → Finn (concept) + Echo (copy) + Lyra (Nano Banana prompt) compose a 13-section "Creative Asset Production Pack"; optionally generates a real image via Gemini.
   - `content-calendar` → 5-stage JSON pipeline (ideas → hooks → posts → visuals → schedule) with retry+salvage logic for truncated LLM responses.
   - Everything else → optional pipeline phases × activities × N collaborator handoffs + final lead-agent assembly.
4. **Validate.** `validateDeliverableQuality()` checks for H1 title, required sections per type, and pipe-table presence for calendars. Failures trigger a single repair pass; skill-checklist validation runs in parallel.
5. **Persist.** Task + output stored in `tasks` and `outputs` tables; token usage logged to `token_usage`; conversation thread saved to `conversations/messages`.

The provider layer supports **Ollama (default, local), Gemini, Anthropic, OpenAI** — each user configures their own keys per-tenant under Settings; keys are stored unencrypted in `data/provider-secrets.json` on a Docker volume. Routing logic in `resolveTaskRuntime` picks provider+model based on deliverable type (content tasks prefer Ollama→Gemini, thinking tasks prefer Gemini), agent overrides, runtime mode (`fast`/`thinking`/`compare`), and explicit user settings.

Side capabilities the code reveals:

- **Office system** — Konva-based visual builder (`OfficeBuilder.tsx`) where users design their "agency office" with placeable tiles/zones, tracked in `office_layouts` table (which is **on prod DB but missing from the repo schema**) with `mc_credits INT` and `owned_assets TEXT[]` columns — implying an in-app credits/asset-shop monetization model.
- **Mission system** — `mission-stage.ts` + `/mission` page treat tasks as "missions" with stages and stage progression.
- **Skills system** — 162 skill folders in `data/skills/`, each with `SKILL.md` (frontmatter + workflow + checklist + output template). Skill scoring (`scoring.ts`) picks the best skill per activity from the agent's assigned skill IDs.
- **Pipelines** — 7 JSON-defined pipelines (ad-creative, campaign-brief, competitor-research, content-calendar, media-plan, seo-audit, plus an index). Each defines phases × activities × assigned roles + checklists.
- **Scheduled tasks** — Cron-driven via `GET /api/scheduled-tasks/tick` (requires `CRON_SECRET`). Daily/weekly/monthly/once. The first user in the tenant's API keys are used (a privacy/billing bug, see H-60).
- **Integrations** — Meta Graph API for ad insights/campaigns/optimization, Higgsfield for video generation, Google OAuth for Docs/Sheets/Drive/AdWords (Google flow is broken, see C-10), per-tenant provider keys.
- **Admin** — Super-admin pages for `/admin/tenants`, `/admin/plans`, `/admin/backups`. Tenant-admin can manage members via `/users`. Backup endpoint creates hand-rolled tar.gz archives of DB+uploads.
- **Plans** — `free` (3 agents, $0) / `starter` (10, $49) / `growth` (25, $99) / `enterprise` (unlimited, $299). Enforcement via `canAddAgent()` on agent upsert; **no other plan-tier gating exists**.
- **Billing** — Stripe-scaffolded but unwired. `/api/billing/upgrade` directly mutates the DB without payment. `/api/billing/webhook` has signature verification commented out.
- **Output** — Generated content is stored as markdown + an optional rendered HTML; `output-html.ts` builds artifact HTML with inline styles. Sharing is via `/share/output/[id]` — **a public page that loads any output by ID, no auth, no scope** (C-25).

---

## Part 2 — Production-readiness verdict

**Not production-ready. Significant work needed before paying customers.**

The architecture is **substantial and ambitious** — a real multi-tenant SaaS with proper JWT auth, custom Postgres schema, multi-provider AI routing, a credible Iris/agent abstraction, and a real product surface (clients, tasks, missions, skills, pipelines, integrations, office, schedules, admin). The intent classifier and deliverable routing are well-organized. The codebase is internally consistent and the engineer clearly knows the domain.

But against a production checklist, it fails on several layers at once:

### Security: Multiple launch-blocking issues
- **C-17 — Path-traversal LFI in `image-production.ts`:** any tenant admin can craft a client brief that, when used in a creative-asset task, reads any file on the container (`/etc/passwd`, `/proc/self/environ`). Combined with C-19 (plaintext keys on disk), this leaks every tenant's API keys + JWT_SECRET → total platform takeover.
- **C-19 — All API keys (Anthropic/OpenAI/Gemini/Meta/Higgsfield) stored in plaintext** in `data/provider-secrets.json`. No encryption-at-rest.
- **C-6 — JWT in `localStorage`:** any XSS bug across 188 TSX files gives an attacker a 7-day token. Should be httpOnly cookie.
- **C-9 — No rate limiting** anywhere. Login brute-force, register spam, chat-cost abuse all open.
- **C-7, C-8 — No email verification on signup; no password reset flow at all.** Self-serve onboarding is broken.
- **C-18 — Prompt-injection defenses are anemic.** Trivially bypassed; combined with C-25/C-26 enables stored XSS via AI output.
- **C-23, C-24 — Asset and photo file-serving endpoints are unauthenticated and not tenant-scoped.** Filename-guessing reveals other tenants' brand assets.
- **C-25 — Shared output page is public for any output ID** — no token, no auth, no scope. Direct UUID enumeration reveals every tenant's content.
- **C-26 — Output pages render LLM HTML via `dangerouslySetInnerHTML`** without sanitization. Stored XSS waiting to happen.

### Reliability / data integrity: Schema is drifting
- **C-1 — `docker/init.sql` has an FK-ordering bug** that will abort a fresh deploy. The current prod DB was created in an older state and won't reproduce.
- **C-2 — `office_layouts` table exists on prod but isn't in any repo schema file.** Recreating the deployment loses the office/credits feature.
- **C-3 — `supabase/migrations/` is dead** (references `auth.users` and `storage.buckets` from Supabase, never ran on self-hosted Postgres). Two competing schema sources.
- **C-5 — No `updated_at` triggers on prod DB**; fields stay stale unless the app remembers to set them.
- **H-1, H-3, H-4 — Multiple FK gaps**: no `ON DELETE` clauses, orphan-ref-prone TEXT fields where FKs should exist, `created_at/updated_at` have no defaults.
- **C-12 — Backups are written inside the container at `/app/backups`, NOT to a Docker volume.** Every redeploy wipes the entire backup history. The backup feature looks functional but is actually destructive.
- **C-13 — Backups contain plaintext `password_hash`** for every user — offline-crackable.
- **C-14, C-15, C-16 — Custom hand-rolled tar implementation** silently truncates filenames, silently skips files >50MB, and silently excludes any table not in a hardcoded list (including `office_layouts`).

### Infrastructure / operations
- **Single VPS** (`72.62.33.12`), no DR plan, no read replicas, no load balancer, no TLS termination (`http://72.62.33.12:3000` direct).
- **No CI/CD** — deploys are manual `ssh && git pull && docker compose build && up -d`. No test gate (and **zero tests in the entire codebase** — H-74).
- **No app healthcheck**, no log shipping, no error monitoring (Sentry, etc.), no metrics.
- **No staging env** — main branch is prod.
- **H-2 — `Cache-Control: no-store` on essentially every URL** kills HTTP caching and CDN viability.

### Code quality
- **48,000 LOC of TypeScript with 0 tests.**
- **Mega-components**: IrisChat 2,315 LOC, settings 1,649 LOC, tasks-detail 1,116 LOC, clients 1,104 LOC.
- **Hand-rolled implementations** in critical paths: PDF extraction (H-63), DOCX extraction (H-64), tar archives (C-14), JWT verify is fine (uses `jose`), but prompt-safety regex defense is weak (C-18).
- **String-matching heuristics** to detect "AI returned coordination boilerplate" appear in 4 different files — drift-prone.
- **Duplicate model lists** (`providers.ts` ↔ `model-pricing.ts`), duplicate `escapeHtml` (5+ copies), duplicate schema sources (init.sql ↔ migrations).
- **Stale/dead files** — `node_modules_broken_20260331/` (704MB), `launcher-apps/`, `launcher-assets/`, `start-mission-control.sh`, `appscript.md`. `google-integrations.ts` calls a `google.ads()` method that doesn't exist in the `googleapis` library (broken code).

### Multi-tenant correctness
- **H-72 — `/api/state` filters by `ownerUserId`, not tenant** — members of the same tenant can't see each other's clients/missions. Team collaboration is broken or intentionally siloed (unclear).
- **H-73 — Two fallbacks to `default-agency`** (in chat-route and relational-sync). If `auth.tenantId` is null, queries land in/from a shared tenant — cross-tenant data co-mingling possible.
- **H-23, H-24 — `backfill-ownership` and `assignments` admin routes** are not tenant-scoped — super-admin actions can corrupt other tenants' data.

### UX
- **H-14 — `/settings`, `/skills`, `/pipeline`, `/users` are gated to super_admin only.** Regular tenant members **cannot configure their own AI provider keys** → the app is unusable for non-super-admin users in its current state.
- **H-17 — Version-check hook force-reloads the window** on deploy without warning; user loses unsaved input.
- **H-42 — No streaming responses.** Content-calendar generation can take 3+ minutes with no progress indicator.
- **No "Forgot password" link**; no onboarding wizard for new tenants (one exists at `OnboardingWizard.tsx` — need to verify it's reachable).

---

## Part 3 — Monetization-readiness verdict

**Not monetization-ready.** The Stripe wiring is scaffolded but every billing surface is currently open-by-default:

| Issue | Severity | Impact |
|---|---|---|
| **C-21 — Stripe webhook signature verification is commented out** | 🚨 | Anyone can fake `checkout.session.completed` events and upgrade any tenant to any plan once Stripe is wired |
| **C-22 — `/api/billing/upgrade` updates the DB without payment** | 🚨 | Any authenticated user can self-upgrade to Enterprise for $0 today |
| **H-56 — No per-tenant token / cost budget enforcement** | ⚠️ | A runaway pipeline or malicious user can rack up unlimited Claude Opus charges on the tenant owner's key |
| **H-55 — Unknown models silently cost $0** in `model-pricing.ts` | ⚠️ | Adding any new model bypasses cost tracking until pricing entry added |
| **H-54 — Model pricing is hardcoded and stale-detection is none** | ⚠️ | Provider price changes silently make `cost_usd` wrong |
| **H-60 — Scheduled tasks bill the tenant OWNER's API key, not the creator's** | ⚠️ | Member B creates a scheduled task → tenant owner pays |
| **H-25 — Tenant member invitation returns temp password in API JSON, no email** | ⚠️ | Inviting a teammate manually copy-pastes a password to them out-of-band — kills the onboarding promise |
| **C-23/C-25 — File and output-share endpoints publicly readable** | 🚨 | Customer data is exposed to anyone with a URL guess — guaranteed breach within weeks of paying-customer launch |
| **Plans only gate `max_agents`** | ⚠️ | No other paid-feature gating exists. Free users get the same product as Enterprise (other than agent count) |
| **No usage dashboards for tenants** | ⚠️ | Customers can't see what they're consuming |
| **No "view plan / upgrade" CTA in app** | ⚠️ | Tenants in `/admin/plans` is super-admin only |
| **No GDPR cookie consent, no ToS, no Privacy Policy** | ⚠️ | EU users can't legally pay |
| **No invoice/receipt generation** | ⚠️ | Required for B2B sales |

The monetization layer is **at-best ~30% complete**. Stripe scaffolding exists, plans are seeded, an `office_layouts.mc_credits` column hints at a credits economy, but every gate that would protect revenue is either disabled, missing, or trivially bypassable.

---

## Part 4 — Prioritized fix roadmap

### 🚨 Critical — block any public launch (must fix)
1. **Patch the path-traversal LFI** in `image-production.ts:resolveAssetPath` — verify resolved path stays inside `CLIENT_UPLOADS_DIR`. (C-17)
2. **Encrypt `data/provider-secrets.json` at rest** with envelope encryption (master key in env, per-tenant data keys). (C-19)
3. **Disable `/api/billing/upgrade`** until Stripe is wired (return 503) OR restrict to super_admin. (C-22)
4. **Disable or fully verify `/api/billing/webhook`** — uncomment signature verification and require `STRIPE_WEBHOOK_SECRET`. (C-21)
5. **Add tenant-scoping + auth to `/api/agent-photos/file/[filename]` and `/api/client-assets/file/[filename]`.** Move uploads to per-tenant subdirectories. (C-23, C-24)
6. **Make `/share/output/[id]` require a `share_token`** column with expiration; sanitize HTML before render. (C-25, C-26)
7. **Move JWT from localStorage to httpOnly secure cookies** with SameSite=Lax + CSRF token. (C-6)
8. **Add rate limiting** (login, register, chat, OAuth) — at minimum via a Cloudflare-style edge or `express-rate-limit` equivalent at app layer. (C-9)
9. **Add email verification + password reset** with transactional email (Resend/SendGrid). (C-7, C-8)
10. **Fix `docker/init.sql` FK-ordering bug** + add `office_layouts` table + add `updated_at` triggers. Move ALTER to after CREATE TABLE agencies. (C-1, C-2, C-5)
11. **Mount a persistent volume for `/app/backups`** + integrate offsite copy (S3); exclude `password_hash` from backups. (C-12, C-13)
12. **Replace hand-rolled tar implementation** with `node-tar`; replace hand-rolled PDF/DOCX extractors with `pdf-parse`/`mammoth`. (C-14, H-63, H-64)
13. **Fix Google OAuth callback URL** OR create `/api/auth/google/callback/route.ts` + actually persist OAuth tokens per-user. (C-10, C-11)
14. **Reconcile schema drift**: pick init.sql as the canonical source, delete or rewrite `supabase/migrations/`, add `office_layouts` to init.sql. (C-3)
15. **Patch prompt-safety** with instruction tagging + Zod-validated user input + sanitize any HTML in LLM output. (C-18)

### ⚠️ High — must fix before monetization or 10+ paying tenants
- Add **per-tenant token budgets** + check before each generation call. (H-56)
- Add **server-side page guards** (Next 16 middleware) — not just client-side. (H-13)
- Open `/settings` to all tenant members (otherwise non-admins can't add API keys). (H-14)
- Add **audit log** table + helper for all admin actions. (H-31)
- Implement Stripe Checkout for plan upgrades. (depends on C-22)
- **Add tests** — at minimum auth/login, multi-tenant isolation, billing rejection, chat smoke. (H-74)
- **Set up CI** (GitHub Actions or similar) — lint, typecheck, test gate. (H-80)
- **Refactor mega-components** (IrisChat, settings page) into 200-LOC sub-components. (H-75)
- **Tenant-scope all admin routes** (assignments, backfill-ownership). (H-23, H-24)
- **Don't return `temporaryPassword` in API JSON** — send via email. (H-25, M-17)
- **Move plan limits, deliverable types, prompts to DB-backed config** with admin UI. (H-33, H-53)
- **Add app healthcheck** in Dockerfile, log shipping, error monitoring. (H-12)
- **Set up TLS** (Caddy / nginx reverse proxy + Let's Encrypt) — no production launch over plain HTTP.
- **Stream long generations** via SSE; add progress hooks. (H-42)
- Fix scheduled-tasks billing attribution (`created_by_user_id`). (H-60)
- Fix the user-vs-tenant scope decision in `/api/state`. (H-72)

### 🟡 Medium — clean up before scaling
- Add password-reset flow with email tokens
- Replace `node_modules_broken_20260331/`, `launcher-apps/`, `launcher-assets/`, `start-mission-control.sh`, `stop-mission-control.sh`, `appscript.md`, `RECOMMENDATIONS.md`, `campaigns/page.tsx` (dead files)
- Consolidate duplicate code: `escapeHtml`, model lists, deliverable-validity heuristics
- Replace string-matching heuristics in autonomous-task with structured output validation
- Move `escapeHtml`, masking helpers, file-path validation into `src/lib/utils/`
- Replace hardcoded prompts/defaults (`platforms = 'Instagram, LinkedIn'`, `posting_frequency = '3 posts/week'`) with tenant settings
- Migrate hardcoded model lists to a `models` table
- Pricing freshness check (alert if >90 days stale)
- Improve Iris classifier i18n (Arabic support)
- Remove dead `google-integrations.ts:getGoogleAdsData` (calls nonexistent method)

### 🟢 Low — polish & tech debt
- Delete `.DS_Store`, `.sandbox.log`, `.sandbox.pid`, `.mission-control-server.pid`
- Update tsconfig target to ES2022
- Remove stale `tsconfig.json` excludes
- Add login-page `autoComplete` attributes and "Forgot password" link
- Move `docker-compose.yml` away from obsolete `version: "3.9"`
- Remove Tailwind `typing-dot` animation that animates `content` (non-functional)

---

## Part 5 — Quantitative summary

**Findings count:**
- 🚨 **26 Critical** (launch blockers — security, data loss, billing exploits, schema corruption)
- ⚠️ **~83 High** (must fix before scale)
- 🟡 **~42 Medium**
- 🟢 **~23 Low**

**Estimated effort to production-ready** (informed estimate, not a quote):
- **Critical fixes**: 3–4 engineer-weeks (concentrated security + billing hardening)
- **High fixes**: 6–8 engineer-weeks
- **Medium + Low cleanup**: 2–3 engineer-weeks
- **Plus**: tests + CI setup (~2 weeks), TLS/infra (~1 week), email + Stripe (~2 weeks)

**Total: ~16–20 focused engineer-weeks** to take this from current state to production-monetization-ready, assuming no scope expansion. With a single engineer, that's 4–5 months; with two engineers running parallel tracks (security + billing), 2.5–3 months.

---

## Part 6 — Final verdict

Mission Control is a **legitimately impressive product surface** with a strong domain model and a real AI-routing architecture. The 23-deliverable registry, 10-agent constellation, 162-skill library, and pipeline orchestration are not vaporware — they're meaningfully implemented and would deliver value to users today. The Iris experience, judging from the IrisChat component's size and the registry's depth, is the kind of thing that would impress a buyer in a demo.

What it isn't is a **production-monetization-ready SaaS**. The same engineer who built a coherent multi-tenant model also left the billing endpoint open and the file-serving routes unauthenticated. The codebase reads like a fast-moving solo-developer project that got 80% of the way to a real product but skipped the boring 20% that protects revenue, customer data, and reputation. The good news: most of the critical fixes are well-scoped and tractable. The bad news: there are a lot of them, and shipping to paying customers before they're done will result in either a breach, a billing exploit, or both.

Recommended next steps, in order:
1. **Sit with the C-list (critical findings) for a day** and confirm severity / exploitability with hands-on testing.
2. **Triage which Cs you can fix this week** — start with C-22 (billing upgrade), C-17 (path traversal), C-23/C-25 (data leak via URLs), C-6 (JWT in localStorage). These four alone close most attack surface.
3. **Set up a staging environment** before any further deploys — current "main = prod" is too risky for this volume of fix work.
4. **Add a minimal smoke-test suite + CI gate.** Even 10 tests covering auth/billing/multi-tenancy gives an early warning system.
5. **Decide what's in scope for v1 launch.** Cutting features (e.g., Office, Higgsfield video, Meta integration) to focus on the core Iris-driven content workflow may halve the audit surface.

The hardest part of this audit is **not** identifying problems — it's that the product is genuinely promising, and the gap between "shipping demos" and "shipping to paying customers" is wider than it appears. Closing that gap is mostly mechanical work; the real question is whether to do it now (before launch) or after a launch incident forces it.

---

*See `MemoryForAudit.md` for the full 100+ finding catalog with file:line references for every issue.*
