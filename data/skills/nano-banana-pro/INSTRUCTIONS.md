# Nano Banana Pro — Instructions

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
