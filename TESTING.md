# Testing the sandbox

The Mission Control Remake dev server is running on **http://localhost:3050**.

## Login

The app gates everything behind Supabase auth. Sign in with the super-admin
account (`moeadas@yahoo.com`). After login you'll land on `/dashboard?refresh=…`.

If you're testing as a different Supabase user, you'll only see your own
clients/tasks/outputs (ownership filter is active for non-admins).

## What changed in this round — what to check

### 1. Content calendar — no more horse-genetics fallbacks

Trigger the content calendar pipeline for **a non-equine client** to confirm
the AI-only path produces industry-appropriate content.

**Steps:**
1. Open Iris (FAB bottom-right).
2. Pick or add a client that is clearly NOT in equine/horse genomics — e.g. a
   coffee brand, SaaS startup, fashion label, restaurant. Set their
   industry/niche to something specific.
3. Tell Iris: *"create a 30-day content calendar for <client> focused on
   awareness across instagram and linkedin, 3 posts per week"*.
4. Iris will ask the briefing questions inline (objective, platforms, etc.).
   Fill them in.
5. Wait for the generation to complete.

**Expected:**
- Every post body, hook, and visual brief mentions the client's actual
  industry — coffee/SaaS/etc., NOT "horses" or "breeders" or "equine".
- Hashtags reflect the client's industry.
- If the AI fails (e.g. Ollama not running), you get an explicit
  `[content-calendar:posts] model failed to draft a post for "X" after retry.
  Retry the calendar request.` error rather than a horse-themed fallback.

**Regression check:** trigger the same pipeline with the seeded
**Victory Genomics** client. Equine content is correct here because that's
the client's actual industry, not because of code-baked templates.

### 2. Skills as folders with SKILL.md

Skills now live in `data/skills/<id>/` with `SKILL.md` as the primary file
(Claude format with YAML frontmatter).

**Verify on disk:**
```bash
ls data/skills/ | wc -l           # expect 162
ls data/skills/brand-strategy/    # SKILL.md, skill.json, INSTRUCTIONS.md, etc.
head -15 data/skills/brand-strategy/SKILL.md
```

**Verify via API (super-admin only):**
- Visit `/skills` in the browser. All categories and skills should still load.
- Open any skill detail page. The skill should render.
- Edit the description in the UI and save. The change persists in Supabase
  and shows up immediately. (Note: the on-disk SKILL.md does NOT update — see
  the "what's still pending" notes below.)

**Verify the legacy directory is decommissioned:**
```bash
ls src/config/skills/    # only README.md should remain
```

### 3. Agents actually use skills per activity

This is harder to "see" without inspecting prompts, but you can validate it via
task execution.

**Steps:**
1. From Iris, ask: *"draft a strategy brief for <client> on positioning
   their <product> against the top three competitors"*.
2. Open `/tasks/<id>` once the task lands.
3. Look at the **execution steps** panel. Each step should show `skillsUsed`
   with the right per-activity skill (e.g. `deep-research` for Atlas's
   research activity, `positioning-framework` for Maya's strategic activity).
4. The final deliverable should follow the structure of the lead skill's
   output template — sections like `Objective`, `Situation / Context`,
   `Recommendations` for a strategy brief.

**Verify in code:**
- `src/lib/server/autonomous-task.ts` exports `buildSkillContextForActivity`,
  `buildSkillContextForLead`, `buildSkillContextForSupport`. These are the
  three call sites where full SKILL.md instructions get injected into the
  agent prompt.

## What's intentionally still broken (audit follow-ups)

These items from the original audit were NOT fixed in this round. Fix in this
order if you want to keep going:

1. **🚨 CRITICAL — rotate the Gemini key.** `data/provider-secrets.json`
   contained a real Google API key. The file is now `.gitignored` and
   untracked, but past commits still expose it. Rotate the key in Google
   Cloud and rewrite git history with `git filter-repo` or BFG.
2. **🔴 Fake execution queue.** `src/lib/server/execution-queue.ts` is a
   `Map` + `setTimeout` — won't survive serverless or restarts. Replace with
   Supabase pg-cron, BullMQ, Inngest, or Trigger.dev.
3. **🔴 Workflow status bug.** `src/app/api/chat/route.ts` line 935-946
   has three branches that all return `'paused'`. Tasks completed via Iris
   chat never show as `completed` in the workflow tracker.
4. **🔴 Deliverable classifier drift.** Same logic exists in 4 places:
   `server/ai.ts`, `agents-store.ts`, `IrisChat.tsx`, `pipeline-execution.ts`.
   Consolidate to one shared module.
5. **🟠 Avatar uploads.** `next.config.mjs` pins `outputFileTracingRoot` so
   uploads to `public/uploads/agents/` work locally. They will fail on
   serverless. Migrate to the existing Supabase Storage `agent-avatars`
   bucket.

## Sandbox commands

```bash
# Stop the sandbox
kill $(cat .sandbox.pid 2>/dev/null) 2>/dev/null
rm -f .sandbox.pid

# Restart on 3050
PORT=3050 npx next dev -p 3050 > .sandbox.log 2>&1 &
echo $! > .sandbox.pid

# Tail logs
tail -f .sandbox.log

# Re-run skill migration (idempotent — preserves existing folders)
node scripts/migrate-skills-to-folders.js --write
node scripts/upgrade-skills-add-skill-md.js --write
```
