"""Generate SEAM's app icons, splash images and favicon.

The mark is the Eyelet (SEAM's hotspot: ring + core) on a dashed stitch line.
Usage: python3 scripts/generate_brand_assets.py
"""
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets"
INK, BONE = (11, 11, 12, 255), (242, 239, 234, 255)
# @fontsource ships web formats only, which Pillow cannot read. Point SEAM_SERIF_TTF at a
# Bodoni Moda TTF, or drop one at assets/fonts/BodoniModa-Regular.ttf, to regenerate the wordmark.
FONT_ENV = os.environ.get("SEAM_SERIF_TTF")
FONT = Path(FONT_ENV) if FONT_ENV else ROOT / "assets/fonts/BodoniModa-Regular.ttf"
SS = 4  # supersampling for clean edges


def mark(size, fg, bg, scale=1.0):
    """The Eyelet on a stitch line, centred. scale < 1 shrinks it into a safe zone."""
    S = size * SS
    img = Image.new("RGBA", (S, S), bg)
    d = ImageDraw.Draw(img)
    c = S / 2
    r = 0.20 * S * scale          # ring radius
    ring_w = 0.028 * S * scale    # ring stroke
    core = 0.055 * S * scale      # core radius
    stitch_h = 0.014 * S * scale  # stitch thickness
    dash, gap = 0.05 * S * scale, 0.035 * S * scale
    reach = 0.40 * S * scale      # how far the stitch runs from centre
    clear = r + 0.06 * S * scale  # gap left around the ring
    for side in (-1, 1):
        x = clear
        while x < reach:
            x2 = min(x + dash, reach)
            a, b = c + side * x, c + side * x2
            d.rectangle([min(a, b), c - stitch_h / 2, max(a, b), c + stitch_h / 2], fill=fg)
            x = x2 + gap
    d.ellipse([c - r, c - r, c + r, c + r], outline=fg, width=int(ring_w))
    d.ellipse([c - core, c - core, c + core, c + core], fill=fg)
    return img.resize((size, size), Image.LANCZOS)


def wordmark(size, fg):
    S = size * SS
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if not FONT.exists():
        raise SystemExit(
            f"Serif font not found at {FONT}.\n"
            "Set SEAM_SERIF_TTF to a Bodoni Moda TTF, or place one at assets/fonts/BodoniModa-Regular.ttf."
        )
    font = ImageFont.truetype(str(FONT), int(S * 0.24))
    text = "SEAM"
    tracking = S * 0.03
    widths = [d.textbbox((0, 0), ch, font=font)[2] for ch in text]
    total = sum(widths) + tracking * (len(text) - 1)
    bbox = d.textbbox((0, 0), text, font=font)
    y = S / 2 - (bbox[1] + bbox[3]) / 2
    x = S / 2 - total / 2
    for ch, w in zip(text, widths):
        d.text((x, y), ch, font=font, fill=fg)
        x += w + tracking
    return img.resize((size, size), Image.LANCZOS)


def main():
    clear = (0, 0, 0, 0)
    mark(1024, BONE, INK).convert("RGB").save(OUT / "icon.png")                 # iOS default + store icon (no alpha)
    mark(1024, BONE, clear).save(OUT / "icon-dark.png")                          # iOS 18 dark appearance
    mark(1024, (255, 255, 255, 255), clear).save(OUT / "icon-tinted.png")       # iOS 18 tinted appearance
    mark(1024, BONE, clear, scale=0.72).save(OUT / "android-icon-foreground.png")  # inside the 66% safe zone
    mark(1024, (255, 255, 255, 255), clear, scale=0.72).save(OUT / "android-icon-monochrome.png")
    wordmark(1024, INK).save(OUT / "splash-icon.png")
    wordmark(1024, BONE).save(OUT / "splash-icon-dark.png")
    mark(48, BONE, INK).convert("RGB").save(OUT / "favicon.png")
    stale = OUT / "android-icon-background.png"
    if stale.exists():
        stale.unlink()
    print("brand assets written")


if __name__ == "__main__":
    main()
