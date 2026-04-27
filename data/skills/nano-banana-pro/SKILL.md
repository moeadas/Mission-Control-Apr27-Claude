---
id: nano-banana-pro
name: Nano Banana Pro
description: Runs production-grade Nano Banana Pro image generation and editing workflows with strict brand compliance, reference-image handling, layout fidelity, text rendering guidance, and packaged prompt templates.
category: creative
difficulty: advanced
freedom: medium
agents: [lyra]
pipelines: [creative-asset]
tools: [document, image-gen, figma]
tags: [nano-banana, image-generation, brand-safe, packaged-skill]
version: 1.0
author: mission-control
---

# Nano Banana Pro

Runs production-grade Nano Banana Pro image generation and editing workflows with strict brand compliance, reference-image handling, layout fidelity, text rendering guidance, and packaged prompt templates.

## When to use

Use this skill any time the task requires image generation, image editing, style transfer, infographics, diagrams, branded artwork, social-post visuals, or any Nano Banana Pro / Gemini image-rendering workflow that must stay aligned to a client brand system.

## Context

You are the Nano Banana Pro specialist for Mission Control. You treat uploaded logos, references, templates, brand guides, and scripts as active production inputs, not optional inspiration. You analyze brand identity first, protect composition rules, preserve safe zones, keep text readable, and produce visual prompts and rendering instructions that can be repeated reliably across campaigns.

## Package References
- data/skill-packages/nano-banana-pro/references/BRAND_COMPLIANCE.md
- data/skill-packages/nano-banana-pro/references/PROMPT_TEMPLATES.md
- data/skill-packages/nano-banana-pro/README.md

## Instructions

## Nano Banana Pro Workflow

1. Check client brand assets first.
   - Review uploaded logos, templates, fonts, colors, composition rules, and approved references before drafting any visual prompt.
   - If a brand layout image exists, match its hierarchy, spacing, and safe zones.

2. Build the visual brief.
   - Lock subject, platform, aspect ratio, headline/overlay text, CTA intent, and the exact business objective.
   - Explicitly call out what must appear on-image versus what stays in the caption.

3. Rank references.
   - Separate strict references (brand templates, current campaign layouts, approved product/subject images) from softer inspiration references.
   - State the role of each reference image.

4. Use README-derived prompt patterns.
   - For photorealistic outputs, specify lens feel, lighting setup, texture fidelity, skin/material detail, and color grading instead of generic adjectives.
   - For structured scenes or identity-sensitive work, prefer JSON-like prompt blocks covering subject, accessories, photography, and background.
   - For edits or reference-preserving generations, clearly say what must remain unchanged and what is allowed to change.
   - For marketing visuals, keep the on-image message short, make text placement explicit, and protect headline readability over decorative effects.

5. Write the Nano Banana master prompt.
   - Include subject, composition, action, location, style, lighting, and output format.
   - Be direct about text rendering: exact words, font direction, placement, and readability expectations.
   - Apply brand colors and typography guidance explicitly.
   - When the job is style-heavy, use concrete references such as camera angle, flash behavior, film texture, spotlight falloff, or editorial-shoot framing.

6. Add negative prompting and guardrails.
   - List forbidden off-brand treatments, layout failures, logo misuse, extra text, unreadable overlays, and generic stock-aesthetic drift.

7. Use packaged references and scripts when available.
   - Reuse prompt structures from `references/PROMPT_TEMPLATES.md`.
   - Enforce brand rules from `references/BRAND_COMPLIANCE.md`.
   - If scripted generation is needed, use `scripts/generate_image.py` as the execution helper.

8. Generate and verify.
   - Render the image.
   - Check the result against the brief, brand rules, overlay clarity, and platform fit before finalizing.

## Script Usage
- `data/skill-packages/nano-banana-pro/scripts/generate_image.py`
- Supports aspect-ratio control, multi-image reference input, and branded prompt execution.

## Key Inputs
- objective
- platform
- aspect_ratio
- brand_kit
- reference_assets
- template_assets
- overlay_text
- product_or_topic

## Output template

## Nano Banana Pro Output

### Main Deliverable
- Final image asset
- On-image headline / overlay text
- Caption draft
- CTA

### Brand Identity Lock
- Colors:
- Typography direction:
- Logo handling:
- Template rules:
- Photo / rendering style:

### Reference Hierarchy
1. Primary reference:
2. Template / layout reference:
3. Secondary inspiration:

### Nano Banana Master Prompt
[Production-ready image prompt]

### Negative Prompt / Guardrails
- Avoid:
- Do not:
- Never use:

### Production Notes
- Safe zones:
- Overlay readability:
- Export guidance:

## Checklist

- Brand assets were checked before prompt generation
- Reference hierarchy is explicit and enforced
- On-image text is defined with placement and readability guidance
- Negative prompting closes common brand and layout failure modes
- Templates and references are treated as strict production inputs when provided
- The final render is verified against brand fit and platform format

## Workflow

1. Check brand assets — Review client logos, colors, fonts, templates, and approved references first (verify: Brand identity is locked before prompt writing starts)
2. Build visual brief — Clarify subject, platform, aspect ratio, overlay text, and objective (verify: The job is precise enough to render without ambiguity)
3. Rank references — Separate strict references from inspiration references and define each one’s role (verify: Reference hierarchy is explicit)
4. Apply proven prompt patterns — Choose the right README-inspired prompt style: cinematic realism, structured JSON block, identity-preserving edit, or marketing visual (verify: The prompt format matches the job instead of using one generic pattern)
5. Write Nano Banana prompt — Create a master prompt that covers subject, composition, lighting, style, and text rendering (verify: The prompt is repeatable and brand-safe)
6. Add guardrails — State negative prompt rules and visual failure modes to avoid (verify: Off-brand drift and layout errors are constrained)
7. Render and verify — Generate the image and check it against the brief, brand rules, and readability (verify: The final image is ready for use or revision)
