# NanoBananaProSkill

Enhanced Nano Banana Pro image generation skill with brand compliance, reference image analysis, and professional prompt frameworks.

---

## What's Included

```
NanoBananaProSkill/
├── SKILL.md                    # Main skill file (drop this into Claude Desktop)
├── README.md                   # This file
├── scripts/
│   └── generate_image.py       # Python script for image generation
└── references/
    ├── BRAND_COMPLIANCE.md     # Brand identity extraction & compliance guide
    └── PROMPT_TEMPLATES.md    # Quick-copy prompt templates
```

---

## Quick Start

### 1. Install the Skill

Copy `NanoBananaProSkill/` folder to your Claude Desktop skills directory:
- **Mac**: `~/Library/Application Support/Claude/skills/`
- **Windows**: `%APPDATA%\Claude\skills\`
- **Zip & Install**: Zip the folder and drag into Claude Desktop → Settings → Skills

### 2. Set Up API Key

```bash
export GEMINI_API_KEY="your-key-here"
```

Or use the `google-genai` library with your API key configured.

### 3. Install Dependencies

```bash
uv pip install google-genai
```

---

## Usage Examples

### Basic Image Generation
```bash
uv run generate_image.py "A modern office space" -o output.png
```

### With Brand Reference
```bash
uv run generate_image.py "Marketing banner using brand colors from reference" -i brand.png -o banner.png --aspect-ratio 16:9
```

### Analyze Brand Reference
```bash
uv run generate_image.py --analyze brand_guide.png
```

### High-Resolution Portrait
```bash
uv run generate_image.py "Professional portrait, soft lighting, 85mm lens" -o portrait.png --aspect-ratio 3:4 --size 2K
```

---

## Key Features

### ✅ Brand Compliance
- Extracts colors, typography, and layout patterns from reference images
- Ensures generated images match brand guidelines
- Verification checklist before delivery

### ✅ Multi-Image Support
- Blend up to 14 reference images
- Style transfer between images
- Character consistency across generations

### ✅ Professional Prompt Framework
- VISUAL brief structure (Subject, Composition, Action, Location, Style, Lighting, Format)
- Text rendering optimized prompts
- Brand marketing templates

### ✅ Image Editing
- Transform existing images with specific instructions
- Chain multiple edits sequentially
- Preserve identity/composition while enhancing

---

## Prompt Templates

See `references/PROMPT_TEMPLATES.md` for:
- Product photography prompts
- Brand marketing banners
- Social media posts
- Character/portrait prompts
- Infographic/diagram prompts
- Text rendering prompts
- Style transfer prompts
- Quick aspect ratio reference

---

## Based On

This skill combines best practices from:
- **Google's Nano Banana Pro prompting guide** (blog.google)
- **LTX Studio Nano Banana prompt techniques** (ltx.studio)
- **Anthropic's Agent Skills format**
- **Professional photography and brand design principles**

---

## Limitations

- Small text rendering may not be perfect
- Always verify factual accuracy of data visualizations
- Complex edits may produce artifacts
- Character consistency varies across edits

---

## Requirements

- Python 3.10+
- `google-genai` library
- Valid `GEMINI_API_KEY` with Nano Banana Pro access
