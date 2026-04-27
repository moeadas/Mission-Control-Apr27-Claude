# Skills moved

This directory used to contain one JSON file per skill. Skills now live in a
single canonical location with one folder per skill, following the Claude
skill-package format.

**New location:** `data/skills/<skill-id>/`

Each skill folder contains:

| File | Purpose |
|---|---|
| `SKILL.md` | **Primary** — YAML frontmatter (id, name, description, category, agents, pipelines, tools, tags, …) followed by a markdown body with `## When to use`, `## Context`, `## Instructions`, `## Output template`, `## Checklist`, `## Workflow` sections. |
| `skill.json` | Optional sidecar — structured fields YAML doesn't carry well (variables, inputs/outputs, workflow steps with `verify` clauses, examples). |
| `INSTRUCTIONS.md` | Optional long-form instructions. Overrides the `## Instructions` body section when present. |
| `CONTEXT.md` | Optional persona / agent-context block. |
| `TRIGGER.md` | Optional "when to use" block. |
| `OUTPUT_TEMPLATE.md` | Optional output template. |
| `CHECKLIST.md` | Optional verification checklist (one bullet per line). |
| `WORKFLOW.md` | Optional workflow steps. |
| `EXAMPLES.md` | Optional input/output examples. |
| `references/` | Optional reference docs the skill can cite. |
| `scripts/` | Optional helper scripts. |

**Loader:** `src/lib/skills/registry.ts` is the single source of truth.
Anything that needs skills (chat route, autonomous-task runner,
task-execution runner, the `/api/skills` endpoint, the client-side skills
store) goes through that registry.

**To add a skill:** create a new folder under `data/skills/<your-skill-id>/`
with at minimum a `SKILL.md` file. The registry will pick it up on the next
request (cached for 60 seconds).

**To edit a skill:** edit the SKILL.md (or any of the supporting files) and
the registry will refresh on its next read.

The migration that produced the current set of folders lives in
`scripts/migrate-skills-to-folders.js` and `scripts/upgrade-skills-add-skill-md.js`.
