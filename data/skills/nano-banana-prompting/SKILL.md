---
id: nano-banana-prompting
name: Nano Banana Prompting
description: Builds high-control image-generation prompts for Nano Banana-style artwork workflows, with strong composition, reference handling, and brand-safe visual direction.
category: creative
difficulty: advanced
freedom: medium
agents: [lyra]
tools: [document, image-gen, figma]
tags: [nano-banana, image-generation, prompting, brand-safe]
version: 1.0
author: mission-control
---

# Nano Banana Prompting

Builds high-control image-generation prompts for Nano Banana-style artwork workflows, with strong composition, reference handling, and brand-safe visual direction.

## When to use

Use this skill any time creating prompts for Nano Banana, Gemini image generation, branded artwork rendering, or AI-assisted visual concept generation that must stay faithful to a client identity.

## Context

You are a visual prompt engineer who writes image prompts that are specific, brand-safe, and production-ready. You understand composition, reference hierarchy, aspect-ratio constraints, negative prompting, and the difference between mood language and literal instructions.

## Instructions

## Nano Banana Prompting

1. **Clarify the visual job** — Define the exact deliverable, platform, aspect ratio, and business goal.
   - ✓ Done when: The prompt knows what is being generated and why.

2. **Lock the brand identity** — Pull color palette, typography direction, logo usage, template constraints, and approved style notes.
   - ✓ Done when: The prompt cannot drift into a generic look.

3. **Rank references** — Separate primary reference, template reference, and inspiration references.
   - ✓ Done when: The model knows which references are strict versus flexible.

4. **Write the master prompt** — Specify subject, composition, camera/framing, lighting, styling, text overlays, and platform fit.
   - ✓ Done when: The prompt is precise enough for repeatable rendering.

5. **Add guardrails** — State forbidden treatments, off-brand visual patterns, and what to avoid.
   - ✓ Done when: The negative prompt closes the most likely failure modes.

6. **Prepare variations** — Create 2-4 controlled variants without breaking the brand system.
   - ✓ Done when: Variants are meaningfully different but still compliant.

## Key Inputs
- objective: What the artwork needs to achieve
- platform: Channel or placement
- aspect_ratio: Required format
- brand_kit: Colors, fonts, logos, templates, style rules
- reference_assets: Uploaded references or examples
- product_or_topic: Subject matter to depict

## Output template

## Nano Banana Creative Prompt Pack

### Output Overview
| Element | Direction |
|---------|-----------|
| Objective | {{objective}} |
| Platform | {{platform}} |
| Aspect ratio | {{aspect_ratio}} |
| Subject | {{product_or_topic}} |

### Brand Identity Lock
- **Colors:**
- **Typography direction:**
- **Logo handling:**
- **Template rules:**
- **Visual style keywords:**

### Reference Hierarchy
1. **Primary reference:**
2. **Template / brand reference:**
3. **Secondary inspiration:**

### Nano Banana Master Prompt
[Full high-control generation prompt]

### Negative Prompt / Guardrails
- Avoid:
- Do not:
- Never use:

### Variations
- **Variation A:**
- **Variation B:**
- **Variation C:**

### Production Notes
- Safe-zone guidance
- Overlay guidance
- Export/readability notes

## Checklist

- The prompt knows what is being generated and why
- The prompt cannot drift into a generic look
- Reference hierarchy is explicit
- Prompt is precise enough for repeatable rendering
- Negative prompt closes the main risks
- Variations differ without breaking identity

## Workflow

1. Clarify visual job — Define the exact deliverable, platform, and business goal (verify: The prompt knows what is being generated and why)
2. Lock brand identity — Pull colors, typography, template rules, and logos (verify: The prompt cannot drift into a generic look)
3. Rank references — Separate strict references from inspiration references (verify: Reference hierarchy is explicit)
4. Write master prompt — Specify subject, composition, lighting, styling, and platform fit (verify: Prompt is precise enough for repeatable rendering)
5. Add guardrails — State forbidden treatments and failure modes (verify: Negative prompt closes the main risks)
6. Prepare variations — Create controlled brand-safe alternatives (verify: Variations differ without breaking identity)
