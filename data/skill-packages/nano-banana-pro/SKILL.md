---
name: nano-banana-pro
description: Generate, edit, and transform images using Google's Nano Banana Pro (gemini-3-pro-image-preview). Use when creating or editing images, infographics, diagrams, product mockups, brand visuals, character sheets, or any visual content. Supports text rendering, multi-image blending, style transfer, brand-consistent visuals, and reference image analysis. Always activate when image generation or editing is requested.
allowed-tools: Bash(uv:*), Write, Read, ImageAnalyz*
---

# Nano Banana Pro — Advanced Image Generation Skill

Generate professional-grade images using Google's **Nano Banana Pro** model (`gemini-3-pro-image-preview`).

---

## Brand Identity & Layout Compliance

**CRITICAL — Check for brand assets FIRST:**

When the user provides reference images, attachments, or brand guidelines:
1. **Analyze the reference image(s)** for: color palette, typography style, layout patterns, logo placement rules, spacing, and visual tone
2. **Extract brand elements**: dominant colors (as hex codes), font suggestions, compositional rules, logo usage guidelines
3. **Comply strictly**: Apply the exact brand colors, typography direction, and layout proportions to all generated outputs
4. **If brand identity is provided**: Reference it explicitly in your prompt — e.g., "Apply the brand colors #XXXXXX and typography guidelines from the attached reference"

**When brand layout is provided as an image:**
- Analyze the composition grid and element placement
- Match the proportions and spacing in your output
- Preserve logo positions, text placement zones, and visual hierarchy
- Use the reference image's style, lighting, and color grade

---

## Model Capabilities

Nano Banana Pro excels at:
- **Text rendering** in multiple languages (sharp, legible)
- **Accurate infographics** with real data (uses Google Search grounding)
- **Image editing and transformation** from input images
- **Multi-image blending** (up to 14 reference images)
- **Style transfer** preserving subject consistency
- **Brand-consistent visuals** matching provided references
- **Cartographic visualizations** and maps
- **Detailed instruction following**
- **Chain-of-thought reasoning** for complex visual tasks

---

## Professional Prompt Framework

### The VISUAL Brief (Follow Every Time)

Structure every prompt with these elements:

| Element | What to Include | Example |
|---------|----------------|---------|
| **Subject** | Who/what is in the image | "A stoic robot barista with glowing blue optics" |
| **Composition** | How it's framed | "Extreme close-up", "wide shot", "low angle" |
| **Action** | What's happening | "Mid-stride running through a field" |
| **Location** | Setting/environment | "A futuristic cafe on Mars" |
| **Style** | Aesthetic direction | "Photorealistic", "1990s product photography" |
| **Lighting** | Lighting setup | "Golden hour backlighting", "cinematic color grading" |
| **Format** | Aspect ratio, resolution | "9:16 vertical poster", "2K" |

### Text Rendering Prompts

For sharp, legible text in images:
- Clearly state exact text content and placement
- Specify font style: "bold white sans-serif font"
- Example: "Headline 'SUMMER SALE' in bold white sans-serif at top of poster"

### Brand/Logo Application

For consistent brand visuals:
1. Use provided reference images for brand elements
2. Apply logos/patterns to 3D objects while preserving natural lighting
3. Maintain brand styling across all outputs
4. Match texture and material quality from references

---

## Image Editing & Transformation

When editing an existing image:
1. **Be direct and specific**: "Change the man's tie to green"
2. **Specify what NOT to change**: Preserve identity, lighting, composition
3. **Reference specific areas**: "Focus on the flowers"
4. **Chain edits**: Multiple sequential transformations when needed

---

## Workflow

### Standard Generation

1. **Analyze request** — Identify subject, style, format, and any reference images
2. **Check for brand assets** — If reference images provided, analyze brand compliance first
3. **Build VISUAL brief** — Structure prompt with all 7 elements
4. **Select parameters** — Choose aspect ratio, resolution
5. **Generate** — Run script with full prompt
6. **Verify output** — Check against brand guidelines and request
7. **Iterate if needed** — Refine prompt based on results

### Reference Image Analysis

For multi-image prompts:
1. **List each reference**: "Use Image A for pose, Image B for style, Image C for background"
2. **Define roles clearly**: Each image has specific purpose
3. **Blend instructions**: How to combine elements

---

## Script Usage

### Basic Generation

```bash
uv run /path/to/scripts/generate_image.py "A modern office space" -o output.png
```

### With Brand Reference

```bash
uv run generate_image.py "Generate a marketing banner using the brand colors and layout from the attached reference" -i brand_guide.png -o banner.png --aspect-ratio 16:9
```

### Style Transfer

```bash
uv run generate_image.py "Transform this product photo to match the watercolor style reference" -i product.png -i style_reference.png -o watercolor_product.png
```

### High-Resolution with Specific Text

```bash
uv run generate_image.py "Poster with headline 'SUMMER COLLECTION' in bold white serif font, model wearing spring fashion, soft natural lighting" -o poster.png --aspect-ratio 2:3 --size 2K
```

---

## Output Parameters

| Parameter | Options | Default |
|-----------|---------|---------|
| `--aspect-ratio` | 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9 | 1:1 |
| `--size` | 1K, 2K, 4K | 1K |
| `-i, --image` | Image paths (can repeat for multiple) | None |

---

## Limitations to Communicate

- Small text rendering may not be perfect
- Always verify factual accuracy of data visualizations
- Multilingual text may have grammar nuances
- Complex edits may produce artifacts
- Character consistency across edits varies

---

## File Outputs

Script prints:
- Progress message while generating
- Path to saved image on success  
- Any text response from the model
- Error message if generation fails

**Output location**: User-specified path, or `./outputs/` folder in project directory.
