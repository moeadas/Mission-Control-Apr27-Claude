# /// script
# dependencies = ["google-genai"]
# ///
"""
Nano Banana Pro Advanced Image Generator
Enhanced version with multi-image support, brand analysis, and reference detection.

Usage:
    # Basic generation
    uv run generate_image.py "your prompt" -o output.png

    # With single reference image
    uv run generate_image.py "prompt" -i reference.png -o output.png

    # With multiple reference images (up to 14)
    uv run generate_image.py "prompt" -i img1.png -i img2.png -i img3.png -o output.png

    # With aspect ratio and size
    uv run generate_image.py "prompt" -o output.png --aspect-ratio 16:9 --size 2K

    # Analyze reference image for brand compliance
    uv run generate_image.py --analyze reference.png
"""

import argparse
import mimetypes
import sys
from pathlib import Path
from google import genai
from google.genai import types


def get_mime_type(file_path: str) -> str:
    """Get MIME type for an image file."""
    mime_type, _ = mimetypes.guess_type(file_path)
    if mime_type and mime_type.startswith("image/"):
        return mime_type
    ext = Path(file_path).suffix.lower()
    mime_map = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".webp": "image/webp",
    }
    return mime_map.get(ext, "image/jpeg")


def load_image_bytes(file_path: str) -> bytes:
    """Load image file as bytes."""
    with open(file_path, "rb") as f:
        return f.read()


def print_reference_info(images: list) -> None:
    """Print information about loaded reference images."""
    print(f"\n📎 Loaded {len(images)} reference image(s):")
    for i, img_path in enumerate(images, 1):
        path = Path(img_path)
        size_kb = path.stat().st_size / 1024
        print(f"   [{i}] {path.name} ({size_kb:.1f} KB)")


def analyze_brand_image(image_path: str, client) -> dict:
    """Analyze a brand reference image and extract key elements."""
    print(f"\n🎨 Analyzing brand reference: {image_path}")
    
    image_bytes = load_image_bytes(image_path)
    mime_type = get_mime_type(image_path)
    
    prompt = """Analyze this brand reference image and extract:
1. Dominant colors (as hex codes)
2. Typography style (serif, sans-serif, modern, classic)
3. Color palette mood (warm, cool, professional, playful)
4. Layout patterns (grid-based, organic, centered, asymmetric)
5. Visual style (minimalist, detailed, photographic, illustrated)
6. Any logo placement rules or brand element positions

Provide a structured summary for applying these elements to new images."""

    response = client.models.generate_content(
        model="gemini-3-pro-image-preview",
        contents=[
            types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
            prompt
        ],
    )
    
    return response.text


def main():
    parser = argparse.ArgumentParser(
        description="Nano Banana Pro — Advanced Image Generator with multi-image support"
    )
    parser.add_argument("prompt", nargs="?", help="Text description of the image to generate")
    parser.add_argument("-o", "--output", required=True, help="Output filename")
    parser.add_argument("-i", "--image", action="append", dest="images",
                        help="Reference image(s) for editing/transformation/style reference")
    parser.add_argument("--aspect-ratio", 
                        choices=["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"],
                        default="1:1", help="Aspect ratio (default: 1:1)")
    parser.add_argument("--size", choices=["1K", "2K", "4K"], default="1K",
                        help="Image size (default: 1K)")
    parser.add_argument("--analyze", metavar="IMAGE",
                        help="Analyze a brand/reference image and extract brand elements")
    parser.add_argument("--verbose", "-v", action="store_true",
                        help="Enable verbose output")
    
    args = parser.parse_args()
    
    # Brand analysis mode
    if args.analyze:
        client = genai.Client()
        result = analyze_brand_image(args.analyze, client)
        print("\n" + "="*60)
        print("BRAND ANALYSIS RESULTS")
        print("="*60)
        print(result)
        return
    
    # Normal generation mode
    if not args.prompt:
        parser.print_help()
        sys.exit(1)
    
    client = genai.Client()
    
    # Build contents list
    contents = []
    
    # Add reference images if provided
    if args.images:
        for image_path in args.images:
            path = Path(image_path)
            if not path.exists():
                print(f"Error: Image file not found: {image_path}", file=sys.stderr)
                sys.exit(1)
            
            image_bytes = load_image_bytes(image_path)
            mime_type = get_mime_type(image_path)
            contents.append(
                types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
            )
        
        print_reference_info(args.images)
    
    print(f"\n🎨 Generating image...")
    if args.verbose:
        print(f"   Prompt: {args.prompt[:200]}...")
        print(f"   Aspect Ratio: {args.aspect_ratio}")
        print(f"   Size: {args.size}")
    
    response = client.models.generate_content(
        model="gemini-3-pro-image-preview",
        contents=contents + [args.prompt] if contents else [args.prompt],
        config=types.GenerateContentConfig(
            response_modalities=["TEXT", "IMAGE"],
            image_config=types.ImageConfig(
                aspect_ratio=args.aspect_ratio,
                image_size=args.size,
            ),
        ),
    )
    
    image_saved = False
    text_response = []
    
    for part in response.candidates[0].content.parts:
        if hasattr(part, "inline_data") and part.inline_data:
            output_path = Path(args.output)
            output_path.parent.mkdir(parents=True, exist_ok=True)
            image = part.as_image()
            image.save(str(output_path))
            print(f"\n✅ Image saved to: {output_path.absolute()}")
            image_saved = True
        elif hasattr(part, "text") and part.text:
            text_response.append(part.text)
    
    if text_response:
        print(f"\n📝 Model response: {' '.join(text_response)}")
    
    if not image_saved:
        print("Warning: No image was generated in the response", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
