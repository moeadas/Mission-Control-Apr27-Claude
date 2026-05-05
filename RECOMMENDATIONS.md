# Mission Control — Recommendations after Phase 1–7

The dev team report's 11 line items have all been addressed in this session.
This document captures (a) what shipped, (b) what's intentionally still open
for a future round, and (c) further recommendations to push the platform
further.

## What shipped

### Foundation
1. **Unified intent classifier** (`src/lib/intents/`) — single source of truth
   for deliverable detection, conversational vs. task detection, pipeline
   matching, and `inferRoutingContext`. Replaced 5 drifting implementations
   (chat route, server/ai.ts, agents-store, IrisChat, pipeline-execution).
2. **Single skill-relevance scorer** (`src/lib/skills/scoring.ts`) — both
   channeling-time skill assignment and per-activity primary-skill picking
   now share one core. Tuning one place tunes everywhere.
3. **Post-generation skill-checklist enforcement**
   (`src/lib/skills/checklist-validator.ts`) — concrete checklist items
   ("Include CTA", "Show character counts") are now actually verified and
   feed the existing repair-pass loop. Soft items ("be specific", "engaging")
   are skipped to avoid false positives.

### Runtime
4. **Provider/model routing centralized** — hardcoded
   `'minimax-m2.7:cloud'`/`'gemini-2.5-pro'` strings eliminated from four
   sites. `DEFAULT_CONTENT_TASK_MODELS` + `resolveContentTaskModel(settings,
   provider)` honor user-scoped settings (`routing.contentModels.{ollama,
   gemini}`).
5. **Execution paths unified** — `/api/pipelines/run` creates a task and
   queues `runTaskExecution` (which uses `executeAutonomousTask`).
   `pipeline-execution.ts`'s dead browser-side activity loop is gone.

### Maintainability
6. **`agents-store.ts` decomposed** — types live in `src/lib/types/persistence.ts`,
   defaults in `src/lib/agents-store/defaults.ts`, normalizers in
   `src/lib/agents-store/normalizers.ts`. The store file shrank 40% (1096 →
   667 lines). All 27 consumer imports keep working unchanged via
   back-compat re-exports.

### Front-end flexibility
7. **Skills cache invalidation** — POST/PUT/DELETE on `/api/skills` now
   call `invalidateSkillRegistry()` so newly created/edited skills are
   visible in the runtime immediately, no restart, no 60-second wait.
8. **Pipeline runner uses DB pipelines** — `/pipeline/run` was reading
   bundled config only; now uses `usePipelinesStore` (DB-first). New
   user-created pipelines show up here automatically.

## What's intentionally still open (and why)

### From the original dev-team report
- **`output-quality.ts` config-driven schemas (recommendation #7).** Still
  hardcoded per-deliverable. Tractable but separate from this session's
  scope. Move per-deliverable required-section schemas to
  `src/config/schemas/quality/<deliverable-id>.json`. ~half a day.
- **`/api/chat` route decomposition (recommendation #9).** The chat route
  is still big (988 lines after Phase 2). Extract `lib/server/chat/intent.ts`,
  `lib/server/chat/context.ts`, `lib/server/chat/hooks.ts` and shrink to
  ~300. Phase 9 candidate.
- **Iris-skill-cap dial (recommendation #11).** Iris always gets 1 skill
  regardless of complexity; for complex strategy briefs she should arguably
  get more for QA. Easy bump in `getSkillCap`.
- **outputs vs artifacts naming (recommendation #10).** Still inconsistent
  between Supabase schema and in-memory store. A grep-rename pass touching
  ~30 files; could be done atomically once the test surface is bigger.
- **ARCHITECTURE.md drift (recommendation #8).** The doc says skills come
  from `src/config/skills/*.json` but they actually come from
  `data/skills/<id>/SKILL.md`. The doc says agents seed from
  `agent-templates.ts` but the store uses `CONFIG_AGENTS`. A 30-min
  refresh of the doc.

### From the original audit (still open)
- 🚨 **Rotate the leaked Gemini key in Google Cloud.** `.gitignore` blocks
  new commits but past commits still expose the key. Use `git filter-repo`
  or BFG to rewrite history.
- 🔴 **Real execution queue.** `src/lib/server/execution-queue.ts` is still a
  `Map` + `setTimeout`. Won't survive serverless. Migrate to BullMQ +
  Redis, Inngest, Trigger.dev, or Supabase pg-cron.
- 🔴 **Workflow status branch bug** (`src/app/api/chat/route.ts:935`) —
  three branches all return `'paused'`. Tasks completed via Iris chat
  never show as `completed` in the workflow tracker.
- 🟠 **Avatar uploads to public/uploads** — won't work on serverless. Wire
  to the existing Supabase Storage `agent-avatars` bucket.
- 🟠 **Full Zustand store domain-split.** I extracted types + normalizers
  in Phase 6 but stopped short of splitting the Zustand store itself
  (`useClientsStore`, `useMissionsStore`, etc.). That refactor touches the
  persistence sync model (entity deltas, hydration, ClientShell). Worth
  doing but warrants its own focused round.

## Further recommendations to make the app stronger

### Onboarding flexibility (the user's explicit ask)
9. **Client onboarding wizard.** Today `/clients` opens a single tall form.
   For new agency users, a 3-step wizard (basics → audience/USP →
   brand kit + knowledge assets) would surface fields more progressively
   and reduce abandonment. Add per-industry templates that pre-fill
   sensible defaults (SaaS, e-commerce, professional services, consumer
   brand, B2B).
10. **Skill scaffold generator.** A "Create skill from template" action on
    `/skills` that pre-fills the SKILL.md frontmatter + body sections
    from a category-specific template (creative-asset, copywriting,
    research, planning, ops). Reduces friction for non-technical users.
11. **Pipeline visual builder.** `/pipeline/[id]` is currently form-based.
    A drag-and-drop canvas (phases as columns, activities as cards) would
    make pipeline authoring approachable for ops leads. Use react-flow
    or rete.js — they integrate cleanly with the existing JSON shape.

### Quality and reliability
12. **Per-deliverable quality config files.** Move
    `src/lib/output-quality.ts` required-section maps into
    `src/config/schemas/quality/<deliverable>.json` so each deliverable's
    structural gate is editable without touching code.
13. **Telemetry dashboard.** `task_runs` table records per-stage metadata
    (provider, model, timestamps, status, output payload). Build
    `/analytics/runs` showing recent runs, success rate by provider, time
    breakdown by stage, and cost-per-task estimates.
14. **Nightly regression on N seed prompts.** A small suite (10 prompts ×
    each deliverable type) run on Ollama and Gemini, comparing structural
    quality scores. Catches model drift and prompt regressions.
15. **Sentry / error reporting.** Every catch block currently ends with a
    `console.error`. Wire to Sentry or similar so production errors
    surface without log diving.

### Agent intelligence
16. **Per-skill checklist authoring guidance.** The new
    `validateSkillChecklists` heuristic only catches concrete artifact
    keywords. Add inline UI hints ("This item is structural — checklist
    will verify it") vs ("This item is subjective — won't be verified")
    so authors know which items will actually run.
17. **Skill effectiveness telemetry.** Track how often each skill's
    checklist items pass/fail. Skills with consistently failing items
    have a prompt or instruction problem worth fixing.
18. **Agent-on-agent review.** After Iris runs the quality pass, an
    optional `Sage` review pass for stakeholder-facing deliverables
    (decks, briefs, PR comms) could catch tone issues structural quality
    misses.

### Performance
19. **Cache pipelines + skills for 60s** — already done for skills via the
    registry. Apply the same pattern to `loadPipelines` in the chat route.
20. **Stream outputs.** Long pipeline runs currently block until done.
    Stream phase-by-phase results to the task page via Server-Sent Events
    or a Supabase Realtime channel so the user sees progress live.
21. **Background image generation.** Creative-asset image renders are
    serial today. Move to a job queue so the lead text response can
    return immediately and images attach asynchronously.

### Security
22. **API key vault.** Even after rotating the leaked Gemini key, secrets
    are still loaded from a JSON file on disk. Move to a proper vault
    (Doppler, AWS Secrets Manager) or rely on Supabase Vault for
    production.
23. **Per-user rate limits.** No throttle today on `/api/chat`. A
    member-tier user could DoS the Ollama or Gemini quota for the whole
    workspace. Add per-user request quotas keyed off `auth.userId`.
