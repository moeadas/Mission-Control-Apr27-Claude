# Mission Control Prompt Inventory And Review

Generated: 14 June 2026, Madrid time

This document maps the prompt surfaces that make Mission Control work: Iris chat routing, task execution, agent personas, skills, pipelines, scheduled tasks, content calendar generation, creative asset production, SEO/blog outputs, client brief extraction, and performance marketing analysis.

My view: yes, the prompts are a large part of the app's brain. But the real "brain" is not only the wording of the prompts. It is the combination of:

- intent detection and missing-input gates
- client context assembly
- agent persona prompts
- skill prompt packs
- pipeline phase prompts
- final execution/output contracts
- quality validators and repair prompts
- artifact splitting/rendering rules

Improving prompts will help, but the biggest gains will come from centralizing, versioning, testing, and evaluating the prompt system.

## Executive Summary

The app currently has three prompt layers:

1. Hard-coded runtime prompts in TypeScript.
   These control Iris chat, autonomous task execution, scheduled tasks, client brief extraction, Meta optimization, content calendar generation, creative asset production, and final output formatting.

2. Configurable prompt assets.
   These are agent persona packs, pipeline JSON prompts, and 162 skill packs stored under `data/skills`.

3. Prompt-adjacent rules.
   Intent classification, routing, skill scoring, output quality validation, prompt sanitization, and artifact splitting strongly shape the AI output even when they are not LLM prompts themselves.

The strongest current patterns are:

- Strict JSON prompts in the content calendar engine.
- Dedicated client brief extraction and enrichment prompts.
- Agent and skill activation blocks in autonomous execution.
- Output quality validators and repair prompts for long-form content.
- Prompt injection sanitization for user/client/document input.

The biggest risks are:

- Prompt definitions are scattered across many files.
- Scheduled task prompts duplicate logic and are weaker than the main autonomous runner.
- Some prompts rely on huge context concatenation rather than a structured prompt contract.
- Agent persona prompt packs are powerful but long, making final effective prompts hard to inspect.
- Skills are prompt assets, but there is no single prompt registry or prompt version history.
- Long-form deliverables rely on one large output prompt plus repair rather than staged generation and evaluator loops.

## Core Runtime Prompts

### 1. Iris Conversational System Prompt

Source:

- `src/app/api/chat/route.ts`

Runtime purpose:

- Makes Iris the Chief of Staff and strategic brain.
- Gives Iris awareness of agents, clients, active missions, and capabilities.
- Controls normal chat behavior.
- Contains the special rule for client brief intake.

Prompt shape:

```text
You are Iris - Chief of Staff, strategic brain, and operational lead of Mission Control...

== YOUR CAPABILITIES ==
Marketing strategy, copywriting, creative direction, brand analysis, business strategy, technical guidance, data analysis...

== AGENCY TEAM ==
[dynamic agent list]

== CLIENTS ==
[dynamic client list]

== ACTIVE WORK ==
[dynamic mission list]

== HOW TO RESPOND ==
1. Answer with expert depth and confidence...
...
8. CLIENT BRIEF RULE...
```

Main inputs:

- active agents
- clients
- missions
- recent chat messages
- model/provider settings

Review:

- This is a strong agency-level persona.
- It is good for conversational answers, but broad enough that it can drift into "expert assistant" mode instead of enforcing Mission Control workflows.
- The client brief rule is very specific and useful, but it lives inside the general chat prompt rather than a formal state machine.

Recommended improvements:

- Move the client brief rule into a deterministic handler first, prompt second.
- Add a short "source of truth" hierarchy: user request > current selected client > client database > attached docs > web research > model knowledge.
- Add "When asked to execute work, prefer structured app artifacts over plain chat unless the user asks for a quick answer."

### 2. Non-Conversational Context Prompt

Source:

- `src/app/api/chat/route.ts`

Runtime purpose:

- Builds the large system prompt for task execution before handing to `generateText` or the autonomous runner.
- Includes agency roster, routing reason, pipeline context, skills context, artifacts, clients, mission context, and the execution prompt.

Prompt components:

- `Agency mode`
- `Default response style`
- `Real agency roster`
- `Truthfulness rule`
- routing reason
- pipeline routing context
- pipeline library
- available skills
- execution plan
- execution prompt
- agent memories
- current client/campaign
- active missions
- known artifacts
- known clients

Review:

- This is context-rich, which is good.
- It is also a high-risk "context soup" because many concerns are concatenated into one prompt.
- The truthfulness rule is excellent and should stay.

Recommended improvements:

- Use XML-like sections or JSON blocks for every context type.
- Add an explicit "Client Context Is Mandatory" rule for all deliverables.
- Store an effective prompt preview/hash per task for debugging.

### 3. Execution Brief Prompt

Source:

- `src/lib/server/ai.ts`
- function: `buildExecutionPrompt`

Runtime purpose:

- Converts detected deliverable type, selected agent, client context, pipeline, and output spec into a final execution brief.

Prompt shape:

```text
# Execution Brief
Lead specialist: ...
Supporting team:
Client: ...
Deliverable type: ...
Pipeline: ...

## Client Context
...

## Output Specification
[from getDeliverableOutputSpec]

## Quality Guidelines
...

## Execution Rules
Do not answer with "task routed"...
Produce the actual draft output itself...
Make the result specific to the client...

## User Request
...
```

Review:

- This is one of the most important prompt assembly points in the app.
- It correctly tells the model to produce the actual deliverable, not internal workflow language.
- It relies on `getDeliverableOutputSpec` for the detailed output contract.

Recommended improvements:

- Add prompt IDs and versions per deliverable type.
- Add a compact "must include/must not include" table.
- Add examples for highly sensitive deliverables, especially blog articles and analytics reports.

## Deliverable Output Specifications

Source:

- `src/lib/task-output.ts`
- function: `getDeliverableOutputSpec`

Runtime purpose:

- Provides exact output structure by deliverable type.
- This is the main output-format brain for general tasks.

Covered deliverables include:

- short-form copy
- email campaign
- blog article
- website copy
- video script
- presentation
- campaign copy
- carousel/social post
- and other downstream deliverable types

Important blog article prompt:

- Requires actual long-form article, not a planning note.
- Requires primary focus keyword and brand/company name.
- Requires 2,500+ words, ideally 3,000-4,000 for competitive topics.
- Requires exactly two top-level sections:
  - `## Article Draft`
  - `## Post SEO Settings`
- Requires the full long-form article structure:
  - header block
  - Quick Navigation
  - Key Takeaways
  - definition/hook
  - step-by-step process
  - core value section
  - brand differentiation
  - FAQ part 1
  - FAQ part 2
  - comparison table
  - case studies
  - getting started
  - future/innovation
  - technical FAQ
  - urgency
  - CTA
  - summary
  - about brand/author
  - footer

Review:

- The blog output prompt is now much stronger than the original version.
- This file is a priority review point whenever output shape is wrong.
- The prompt is doing too much in one pass. It may produce better results if split into:
  1. research and outline
  2. article draft
  3. SEO settings
  4. evaluator/repair

Recommended improvements:

- Convert each output spec into a versioned prompt asset.
- Add snapshot tests for key deliverables.
- For blog articles, use a staged generation engine similar to the content calendar engine.

## Autonomous Task Execution Prompts

Source:

- `src/lib/server/autonomous-task.ts`

### 1. Activity Prompt

Function:

- `buildActivityPrompt`

Runtime purpose:

- Runs each pipeline activity with assigned agent, skill activation, previous outputs, activity checklist, and global quality checkpoints.

Prompt shape:

```text
[agent.systemPrompt or default role prompt]
You are autonomously executing a pipeline activity for Mission Control.
Pipeline: ...
Phase: ...
Activity: ...
Original task request: ...
Client context: ...
--- Skill activation ---
[primary skill context, instructions, workflow, checklist, output template]
--- end skill activation ---
Previous pipeline outputs...
Activity checklist...
Global quality checkpoints...
Base pipeline prompt...
Execute the activity now without asking the user for approval.
Return one concise but useful specialist output...
```

Review:

- Strong because it activates one primary skill and keeps handoffs short.
- Pipeline prompts are interpolated with client profile fields.
- Good guardrails against boilerplate and fake delivery.

Recommended improvements:

- Use `wrapUserInput()` around original requests and client docs more consistently.
- Add "this activity output is not the final deliverable" for intermediate phases.
- Track which skill checklist was active in the task artifact metadata.

### 2. Supporting Specialist Prompt

Function:

- `buildSupportPrompt`

Runtime purpose:

- Produces specialist handoff sections:
  - `## Specialist Angle`
  - `## Recommendations`
  - `## Quality Risks`
  - `## Inputs for Lead Agent`

Review:

- Good structure for multi-agent collaboration.
- Works best when the lead pass actually uses the handoffs.

Recommended improvements:

- Add role-specific constraints, for example Atlas must provide evidence, Echo must provide copy angles, Lyra must provide visual constraints.

### 3. Lead Final Assembly Prompt

Function:

- `buildLeadPrompt`

Runtime purpose:

- Produces one final deliverable from skills, client context, pipeline outputs, support handoffs, and execution prompt.

Important rules:

- Use supporting handoffs and pipeline outputs.
- Produce one clean final deliverable.
- Do not mention routing, internal workflow, or task management.
- Deliver output now.

Review:

- This is a critical prompt because it decides what the user actually sees.
- It is generally strong, but for long-form content it is asked to synthesize too much at once.

Recommended improvements:

- For long-form/blog, use a specialized final assembly prompt that only combines generated article and SEO settings, not all intermediate artifacts.
- Add a contract that "top-level artifact sections must match exactly" when UI splitting depends on headings.

### 4. Quality Repair Prompt

Function:

- `buildQualityRepairPrompt`

Runtime purpose:

- Rewrites a deliverable when quality validation fails.

Prompt shape:

```text
Your previous draft did not meet the required output structure.
Original request: ...
Deliverable type: ...
Quality issues to fix: ...
Rewrite the deliverable now...
Do not explain the fixes. Return only the improved deliverable.
Previous draft:
...
```

Review:

- Strong and necessary.
- Could be more deliverable-specific.

Recommended improvements:

- Add separate repair prompts for blog, content calendar, analytics, SEO audit, and creative asset outputs.
- Save repair attempts to a debug trail.

### 5. SERP Research Context Prompt

Function:

- `fetchSerperSearchContext`

Runtime purpose:

- Fetches Serper search results for blog requests and injects live SERP context.

Prompt contribution:

- Top organic results
- People Also Ask
- Related searches
- Instructions not to invent rankings or claims beyond the sample

Review:

- This is a good move toward evidence-backed blog content.
- It currently injects SERP results into the main generation request rather than creating a structured research artifact.

Recommended improvements:

- Store SERP evidence separately.
- Add a SERP summary/evaluator step before drafting.
- Use title/snippet patterns to infer search intent and content gaps explicitly.

## Content Calendar Engine Prompts

Source:

- `src/lib/server/content-calendar-engine.ts`

This is one of the best prompt systems in the app because it uses staged JSON generation and normalization.

Prompt builders:

1. `buildIdeasPrompt`
   - Agent voice: Maya, Strategy Lead.
   - Produces compact JSON ideas across content pillars.
   - Enforces brand/category specificity.

2. `buildIdeaSelectionPrompt`
   - Agent voice: Maya.
   - Selects the strongest ideas for production.
   - Returns JSON with selected IDs and selection summary.

3. `buildHooksPrompt`
   - Agent voice: Echo.
   - Produces 4 hooks per idea.
   - Uses formulas such as Question, Statistic, Bold Statement, Story Opening, How-To, Number List, Controversy, Curiosity Gap.

4. `buildHookSelectionPrompt`
   - Agent voice: Echo.
   - Chooses the strongest hook per idea.

5. `buildPostsPrompt`
   - Agent voice: Echo.
   - Produces platform-native posts with hook, body, CTA, character count, and hashtag groups.
   - Enforces strict body/CTA/hashtag limits.

6. `buildCalendarPrompt`
   - Agent voice: Nova.
   - Schedules posts across the timeframe.

7. `buildVisualsPrompt`
   - Agent voice: Lyra.
   - Produces visual briefs for each post.

Shared client block:

- brand
- industry/niche
- audience demographics
- audience psychographics
- pain points
- tone
- platforms
- posting frequency
- content goal
- product/service
- topics to avoid
- client request
- month/period
- explicit anti-generic rule

Review:

- Very solid.
- This should be the model for future engines.
- It avoids one giant prompt and lets the app validate each stage.

Recommended improvements:

- Add a final evaluator prompt to catch generic content before rendering.
- Allow platform-specific prompt variants.
- Add a brand evidence field for each idea/post so the user can see why it fits the client.

## SEO Audit Engine

Source:

- `src/lib/server/seo-audit-engine.ts`

Runtime purpose:

- Mostly deterministic rather than prompt-based.
- Fetches pages, sitemap/internal links, PageSpeed Insights, HTML metadata, headings, links, forms, images, schema, security headers, etc.
- Builds report categories and rendered HTML directly from evidence.

Prompt status:

- There is no main LLM prompt in this engine at the moment.
- The "intelligence" is rule/scoring logic plus report composition.

Review:

- This is good for reliability.
- SEO audit is evidence-backed and less hallucination-prone.

Recommended improvements:

- Add an optional LLM summarizer after deterministic scoring, but feed it only the evidence JSON and require citations to evidence fields.
- Add a prompt that converts findings into "client executive summary" and "developer fix ticket list" as separate artifacts.

## Creative Asset Engine Prompts

Source:

- `src/lib/server/creative-asset-engine.ts`

Prompt builders:

1. `buildConceptPrompt`
   - Agent voice: Finn.
   - Sections:
     - `## Concept Direction`
     - `## Visual Story`
     - `## Art Direction Guardrails`
     - `## Template Alignment`

2. `buildCopyPrompt`
   - Agent voice: Echo.
   - Sections:
     - `## Primary Hook`
     - `## Supporting Overlay Lines`
     - `## Caption Draft`
     - `## CTA Options`
     - `## Copy Guardrails`

3. `buildNanoBananaPrompt`
   - Agent voice: Lyra.
   - Sections:
     - `## Reference Assets`
     - `## Visual Composition`
     - `## Nano Banana Master Prompt`
     - `## Negative Prompt / Guardrails`
     - `## Variations`
     - `## Production Notes`

Review:

- Good multi-stage creative workflow.
- Strong use of brand identity lock and uploaded assets.

Recommended improvements:

- Add an image prompt QA step before generation.
- Add "do not invent uploaded assets" to the Lyra prompt.
- Add platform/ad-placement spec extraction before concepting.

## Client Brief Extraction Prompts

Source:

- `src/app/api/iris/parse-client-brief/route.ts`

### 1. Extraction Prompt

Runtime purpose:

- Extracts structured client profile fields from user text and attached document text.

Output contract:

- JSON only.
- Fields:
  - name
  - industry
  - website
  - description
  - missionStatement
  - brandPromise
  - targetAudiences
  - productsAndServices
  - usp
  - competitiveLandscape
  - keyMessages
  - toneOfVoice
  - operationalDetails
  - objectionHandling
  - brandIdentityNotes
  - strategicPriorities
  - competitors
  - notes

Review:

- Strong structured extraction prompt.
- Good use of attached file context.
- Partial JSON recovery is helpful.

Recommended improvements:

- Add confidence per field.
- Add source citation per field: attached doc, website, model-inferred.
- Add "do not infer if the source contradicts it" rule.

### 2. Enrichment Prompt

Runtime purpose:

- Fills missing client fields using company/industry knowledge and optional website context.

Prompt behavior:

- Fill only missing fields.
- Use industry-informed estimates when precise data is unavailable.
- Return JSON only.

Review:

- Useful, but risky because it can blur extracted facts and inferred facts.

Recommended improvements:

- Split output into `value`, `confidence`, `sourceType`, and `notes`.
- In the UI, mark inferred fields differently from document-extracted fields.

## Iris Authoring Prompts

Source:

- `src/lib/server/iris-authoring.ts`
- API users:
  - `/api/iris/create-agent`
  - `/api/iris/create-pipeline`
  - `/api/iris/create-skill`

System prompt:

```text
You are a structured-data drafting assistant. Return ONLY valid JSON. No prose, no markdown fences.
```

Authoring prompts:

1. Agent authoring
   - Creates name, role, division, specialty, skills, tools, systemPrompt, colors, temperature.

2. Pipeline authoring
   - Creates id, name, description, estimatedDuration, phases, activities, clientProfileFields.

3. Skill authoring
   - Creates id, name, category, description, difficulty, freedom, prompts, checklist, workflow, tools, tags.

Review:

- This is a strong scaffolding tool.
- It generates new prompt assets, so its output quality affects the future prompt library.

Recommended improvements:

- Validate generated skill IDs against existing skills.
- Add prompt style guidelines when generating `systemPrompt`.
- Add a second pass that checks generated pipelines for missing outputs, circular phases, and weak client field requirements.

## Meta Ads Optimization Prompt

Source:

- `src/app/api/integrations/meta/optimize/route.ts`

Runtime purpose:

- Produces JSON optimization recommendations from campaign data, insights, market, client context, and rule-engine findings.

Prompt shape:

```text
You are a senior performance marketing strategist. Analyse the following Meta Ads campaign data and produce concise, actionable optimisation recommendations.

Important:
- Respect each campaign objective family...
- Use market benchmarks and rule findings as primary evidence...
- Prioritize platform-rule issues, tracking issues, objective mismatch...

Respond with JSON:
summary
recommendations[]
quickWins[]
watchOut[]
```

Review:

- Good JSON contract.
- The rule-engine findings are essential and should remain primary.
- This endpoint may be less important now if the UI has moved toward immediate campaign-specific findings.

Recommended improvements:

- Add objective/conversion-location specific prompt instructions.
- Require every recommendation to cite a metric and a target.
- Reject generic recommendations in parser/evaluator.

## Scheduled Task Prompts

Sources:

- `src/app/api/scheduled-tasks/[id]/run/route.ts`
- `src/app/api/scheduled-tasks/tick/route.ts`

Runtime purpose:

- Runs scheduled tasks manually or via cron.

Prompt builder:

- `buildAgentSystemPrompt`

Task-specific contexts:

- competitor research
- SEO audit
- content calendar
- performance report
- social posts
- campaign brief
- email campaign
- custom

Review:

- This prompt path is weaker than the main autonomous task runner.
- The logic is duplicated between manual run and cron tick.
- It does not activate skills, pipelines, or the full client context system in the same way as chat-created tasks.

Recommended improvements:

- Route scheduled tasks through the same autonomous execution engine.
- De-duplicate the two `buildAgentSystemPrompt` functions.
- Add client context and skill activation to scheduled tasks.

## Agent Persona Prompt Packs

Sources:

- `src/config/agents/generated.ts`
- `src/config/agents/[agent]/SOUL.md`
- `src/config/agents/[agent]/IDENTITY.md`
- `src/config/agents/[agent]/STYLE.md`
- `src/config/agents/[agent]/RULES.md`
- `src/config/agents/[agent]/CONTEXT.md`
- `src/config/agents/[agent]/SKILL_SELECTION.md`
- `src/config/agents/[agent]/HANDOFFS.md`
- `src/config/agents/[agent]/HEARTBEAT.md`
- `src/config/agents/[agent]/MEMORY.md`
- `src/config/agents/[agent]/agent.json`

Agents found:

- Atlas
- Dex
- Echo
- Finn
- Iris
- Lyra
- Maya
- Nova
- Piper
- Sage

Runtime purpose:

- Defines each agent's identity, expertise, style, rules, operating rhythm, handoff behavior, and skill selection logic.
- `generated.ts` combines these files into the seeded `systemPrompt` values.

Review:

- These are high-quality persona prompts and create the feeling of a real agency.
- They are very long, which can crowd out task-specific instructions in small-context models.
- Some rules may conflict with runtime behavior. Example: Iris persona says she does not produce client-facing deliverables, while Iris chat prompt says she can answer/directly execute many tasks.

Recommended improvements:

- Create short and long variants per agent:
  - short runtime prompt
  - full personality/reference prompt
- Add conflict checks between persona rules and runtime routing.
- Add an agent prompt changelog.

## Skill Prompt Packs

Source:

- `data/skills/[skill-id]/skill.json`
- `data/skills/[skill-id]/SKILL.md`
- `data/skills/[skill-id]/INSTRUCTIONS.md`
- `data/skills/[skill-id]/OUTPUT_TEMPLATE.md`
- `data/skills/[skill-id]/CHECKLIST.md`

Total skills found:

- 162 skill directories

Runtime purpose:

- Skills become "skill activation" prompt blocks during autonomous execution.
- The runner injects:
  - skill description
  - trigger
  - context
  - step-by-step instructions
  - workflow steps
  - checklist
  - output template

Skill list:

1. ab-test-design
2. account-health
3. account-management-framework
4. ad-copy
5. agenda-setting
6. agile-scrum
7. art-direction
8. attribution-modeling
9. audience-persona-creation
10. audience-research
11. audience-targeting
12. audio-advertising
13. benchmarking
14. bid-management
15. bottleneck-identification
16. brand-consistency
17. brand-equity
18. brand-guidelines
19. brand-strategy
20. brand-template-enforcement
21. brand-voice
22. brief-synthesis
23. budget-allocation
24. burndown-tracking
25. campaign-copywriting
26. campaign-planning
27. campaign-setup
28. capacity-planning
29. category-analysis
30. category-design
31. change-control
32. channel-mix-optimization
33. channel-planning
34. channel-selection
35. client-offboarding
36. client-onboarding
37. client-relationship-management
38. cohort-analysis
39. color-theory
40. competitive-analysis
41. competitive-intelligence
42. competitive-media-analysis
43. composition
44. concept-testing
45. connected-tv
46. consumer-insights
47. consumer-journey-mapping
48. content-calendar
49. content-calendars
50. contract-discussion
51. conversion-optimization
52. creative-briefing
53. creative-concept-development
54. creative-iteration
55. creative-quality
56. creative-strategy
57. critical-path-analysis
58. cross-channel
59. cross-channel-adaptation
60. cross-functional-coordination
61. cta-optimization
62. dashboard-creation
63. data-synthesis
64. data-visualization
65. deadline-management
66. deep-research
67. delegation
68. design-systems
69. differentiation-strategy
70. direct-response-copy
71. display-advertising
72. documentation
73. email-copy
74. escalation-management
75. expectation-management
76. feedback-synthesis
77. funnel-analysis
78. funnel-strategy
79. go-to-market-strategy
80. headline-writing
81. hypothesis-testing
82. industry-landscape
83. insight-mining
84. keyword-research
85. knowledge-management
86. kpi-definition
87. landing-page-copy
88. long-form-copy
89. market-research
90. market-segmentation
91. media-brief
92. media-math
93. media-strategy
94. meeting-facilitation
95. nano-banana-pro
96. nano-banana-prompting
97. negotiation
98. operations-management
99. optimization-strategy
100. organic-social-planning
101. ott-connected-tv
102. out-of-home
103. pacing-optimization
104. paid-social-planning
105. performance-analysis
106. persuasion-writing
107. platform-native-content
108. porter-five-forces
109. positioning-framework
110. predictive-analytics
111. presentation-design
112. print-advertising
113. priority-management
114. process-improvement
115. programmatic
116. programmatic-planning
117. project-scheduling
118. public-speaking
119. quality-assurance
120. rapport-building
121. reach-frequency-analysis
122. reference-image-direction
123. report-writing
124. resource-allocation
125. resource-optimization
126. risk-assessment
127. roas-optimization
128. roi-calculation
129. scope-management
130. search-advertising
131. seasonality-modeling
132. seo-audit
133. seo-copywriting
134. seo-research
135. short-form-copy
136. social-advertising
137. social-copy
138. stakeholder-communication
139. stakeholder-management
140. stakeholder-mapping
141. statistical-analysis
142. status-reporting
143. strategic-account-planning
144. strategic-planning
145. survey-design
146. swot-analysis
147. task-triaging
148. timeline-planning
149. tone-adaptation
150. tool-integration
151. traffic-coordination
152. trend-analysis
153. trend-identification
154. typography
155. upselling
156. value-proposition
157. video-advertising
158. visual-leadership
159. visual-storytelling
160. waterfall-planning
161. workflow-design
162. workflow-optimization

Review:

- This is the largest prompt library in the app.
- It gives the app breadth, but quality will vary by skill.
- Some skills likely overlap heavily, which can confuse skill selection.

Recommended improvements:

- Add a skill audit score: clarity, specificity, output contract, checklist testability, overlap.
- Merge duplicate or near-duplicate skills.
- Add examples to top-priority skills.
- Make every checklist measurable where possible.

## Pipeline Prompt Assets

Sources:

- `src/config/pipelines/ad-creative.json`
- `src/config/pipelines/campaign-brief.json`
- `src/config/pipelines/competitor-research.json`
- `src/config/pipelines/content-calendar.json`
- `src/config/pipelines/media-plan.json`
- `src/config/pipelines/pipelines.json`
- `src/config/pipelines/seo-audit.json`

Pipelines found:

- ad-creative
- blog-post-writing
- campaign-brief
- client-brief
- competitor-research
- content-calendar
- media-plan
- seo-audit
- strategy-brief

Runtime purpose:

- Pipelines define phases, activities, assigned roles, checklists, outputs, and activity prompts.
- Pipeline activity prompts are interpolated with client profile fields in `buildActivityPrompt`.

Review:

- Pipelines are essential for making tasks feel procedural.
- The dedicated engines for content calendar and SEO audit now override or supplement some pipeline behavior.

Recommended improvements:

- Add `promptVersion` and `owner` fields to each pipeline.
- Add required client fields per phase, not only at pipeline level.
- Add a "final artifact contract" per pipeline.

## Legacy Or Secondary Prompt Systems

### Workflow Engine

Sources:

- `src/lib/workflow-engine.ts`
- `src/lib/config-loader.ts`
- `src/config/agent-roles/agent-roles.json`

Runtime purpose:

- Older workflow prompt builder based on role templates from `agent-roles.json`.
- Builds a task prompt with task description, checklist, inputs, outputs, and role methodology.

Review:

- This is still referenced by `src/lib/workflow-store.ts`.
- It appears separate from the main autonomous task path.

Recommended improvements:

- Confirm whether this path is still active in production UI.
- If inactive, mark it deprecated to avoid maintaining two prompt systems.
- If active, align it with the same prompt-safety and skill activation system.

## UI Prompt Helpers

Source:

- `src/components/agents/IrisChat.tsx`

Runtime purpose:

- Client-side prompt helpers for intake flow and user-facing follow-up prompts.
- Includes missing website URL prompt, website audit prompt from URL, missing blog brief prompt, and intake prompt config.

Review:

- These are user-facing prompt flows, not model system prompts.
- They matter because they control what information the app collects before task execution.

Recommended improvements:

- Keep missing-field logic deterministic.
- Sync client-side gates with server-side gates so Iris does not loop or ask twice.

## Prompt Safety

Source:

- `src/lib/server/prompt-safety.ts`

Runtime purpose:

- Sanitizes user/client/document values.
- Redacts common prompt injection language and API keys.
- Provides `wrapUserInput()` to mark user or document text as data.

Review:

- Very important.
- The code comments correctly state that sanitization is imperfect and should be paired with boundary tagging.

Recommended improvements:

- Use `wrapUserInput()` more consistently in all prompt builders.
- Add tests for prompt injection in client brief documents and skill descriptions.
- Add a debug flag to show sanitized vs original prompt values during development.

## Output Quality And Artifact Splitting

Sources:

- `src/lib/output-quality.ts`
- `src/lib/blog-artifacts.ts`
- `src/lib/output-html.ts`

Runtime purpose:

- Validates deliverables.
- For blog articles, checks:
  - `Article Draft`
  - `Post SEO Settings`
  - minimum 2,500 article words
  - enough H2 sections
  - Quick Navigation
  - Key Takeaways
  - definition section
  - process section
  - FAQ sections
  - case studies
  - urgency
  - summary
  - keyword placement
- Splits blog output into copyable article artifact plus SEO settings artifact.

Review:

- This is a strong quality layer.
- It should be considered part of the prompt system because it tells the repair prompt what failed.

Recommended improvements:

- Add explicit validator for "only two blog artifacts".
- Add heading contract tests for blog output.
- Add word count and section diagnostics visible in task debug mode.

## Highest Priority Prompt Improvements

1. Create a prompt registry.
   Move prompt definitions into versioned files or database records with IDs like `iris.chat.v1`, `task.lead.v2`, `blog.article.v4`.

2. Add prompt snapshot tests.
   For important requests, save expected effective prompt structure and expected artifact headings.

3. Make client context mandatory by contract.
   Every deliverable prompt should include:
   - selected client
   - source of client context
   - missing client fields
   - fallback behavior if client context is absent

4. Split long-form article generation into stages.
   Blog article quality will improve if generated as:
   - brief extraction
   - SERP research
   - outline
   - article sections
   - SEO settings
   - evaluator repair

5. Make analytics and Meta findings evidence-first.
   Recommendation prompts should require:
   - metric
   - current value
   - target/benchmark
   - why it matters
   - recommended action
   - expected impact

6. Strengthen scheduled tasks.
   Scheduled tasks should use the same autonomous task engine and skill prompts as chat tasks.

7. Add prompt observability.
   Store prompt ID/version, model, provider, selected skills, selected pipeline, and a safe prompt hash on each task run.

8. Audit and consolidate the skill library.
   162 skill packs is powerful but may be too broad. Merge duplicates and upgrade the top 30 first.

9. Add evaluator prompts.
   Instead of only asking the same model to repair, use a separate evaluator role:
   - "Does this satisfy the output contract?"
   - "Is this client-specific?"
   - "Is this generic?"
   - "Are claims supported?"

10. Add prompt ownership.
   Each prompt should have:
   - owner
   - purpose
   - last updated
   - examples
   - known failure modes

## Suggested Next Review Order

If we are improving the app's brain, I recommend reviewing prompts in this order:

1. Blog article output spec in `src/lib/task-output.ts`
2. Lead final assembly prompt in `src/lib/server/autonomous-task.ts`
3. Iris conversational prompt in `src/app/api/chat/route.ts`
4. Client brief extraction/enrichment in `src/app/api/iris/parse-client-brief/route.ts`
5. Content calendar stage prompts in `src/lib/server/content-calendar-engine.ts`
6. Meta/analytics recommendation prompts and rules
7. Top 30 skill packs by usage
8. Agent persona conflicts and runtime prompt length
9. Scheduled task prompt path
10. Pipeline activity prompts

## Bottom Line

The app already has a serious prompt foundation. The opportunity now is to make it more systematic:

- fewer scattered prompt definitions
- more versioned prompt contracts
- more deterministic gates before asking the model
- more evaluators after generation
- more evidence-grounded analytics prompts
- more client-context enforcement everywhere

That would make Mission Control feel less like "a chat app with good prompts" and more like a real operating system for agency work.
