"""Take a folder of generated photographs and put them into the app.

Generators hand back whatever size and crop they like. This centres each image on the aspect
ratio the app expects, resizes it, and saves it as a progressive JPEG under `assets/images/`.

    python3 scripts/import_photos.py <folder>
    python3 scripts/import_photos.py <folder> --check   # report only, write nothing

Files are matched by stem, so `amira-soft-tailoring.png`, `.jpg` and `amira-soft-tailoring (1).webp`
all land on the right Look. Anything it cannot place is listed and left alone.

Hotspots are NOT touched. They are authored per Look in `src/data/catalog.json`, so every
photograph is free to use its own pose and composition. After importing a Look, open it in the app
and nudge that Look's `x`/`y` values if a marker sits off its garment.
"""
import argparse
import json
import re
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
CAT = json.loads((ROOT / "src/data/catalog.json").read_text(encoding="utf-8"))
OUT = ROOT / "assets/images"

# Longest edge. Look photos run full-bleed on a 3x phone screen; packshots never exceed half width.
MAX_EDGE = {"looks": 1600, "products": 1000, "avatars": 512}
QUALITY = 86


def targets() -> dict[str, tuple[Path, float]]:
    """Every file the app wants, by stem, with the aspect ratio it must be cropped to."""
    out: dict[str, tuple[Path, float]] = {}
    for look in CAT["looks"]:
        w, h = look["ratio"]
        out[look["id"]] = (OUT / "looks" / f"{look['id']}.jpg", w / h)
    for product in CAT["products"]:
        out[product["id"]] = (OUT / "products" / f"{product['id']}.jpg", 3 / 4)
        # Only the hero Look's pieces carry a second, zoomed-in frame.
        out[f"{product['id']}-detail"] = (OUT / "products" / f"{product['id']}-detail.jpg", 3 / 4)
    for creator in CAT["creators"]:
        out[creator["id"]] = (OUT / "avatars" / f"{creator['id']}.jpg", 1.0)
    return out


def crop_to(img: Image.Image, ratio: float, kind: str) -> Image.Image:
    """Centre-crop to `ratio`, keeping as much of the frame as possible."""
    w, h = img.size
    if w / h > ratio:
        new_w = round(h * ratio)
        return img.crop(((w - new_w) // 2, 0, (w - new_w) // 2 + new_w, h))
    new_h = round(w / ratio)
    # A Look must keep its feet: crop the excess off the top. A portrait keeps the eyes high.
    bias = 0.0 if kind == "looks" else 0.35
    top = max(0, min(h - new_h, round((h - new_h) * bias)))
    return img.crop((0, top, w, top + new_h))


def stem_of(path: Path) -> str:
    """`amira-rooftop-edit (2).png` -> `amira-rooftop-edit`."""
    return re.sub(r"\s*\(\d+\)$", "", path.stem).strip().lower()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("folder", help="folder of generated images")
    parser.add_argument("--check", action="store_true", help="report what would happen, write nothing")
    args = parser.parse_args()

    source = Path(args.folder).expanduser()
    if not source.is_dir():
        raise SystemExit(f"not a folder: {source}")

    wanted = targets()
    placed, skipped, looks_touched = 0, [], []

    for path in sorted(source.iterdir()):
        if path.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp"}:
            continue
        target = wanted.get(stem_of(path))
        if target is None:
            skipped.append(path.name)
            continue

        dest, ratio = target
        kind = dest.parent.name
        with Image.open(path) as img:
            img = crop_to(img.convert("RGB"), ratio, kind)
            limit = MAX_EDGE[kind]
            if max(img.size) > limit:
                scale = limit / max(img.size)
                img = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
            if not args.check:
                dest.parent.mkdir(parents=True, exist_ok=True)
                img.save(dest, "JPEG", quality=QUALITY, optimize=True, progressive=True)
            size = f"{img.width}x{img.height}"

        placed += 1
        if kind == "looks":
            looks_touched.append(dest.stem)
        print(f"  {path.name}  ->  assets/images/{kind}/{dest.name}  {size}")

    verb = "would place" if args.check else "placed"
    print(f"\n{placed} {verb}")
    if skipped:
        shown = ", ".join(skipped[:8]) + (" ..." if len(skipped) > 8 else "")
        print(f"{len(skipped)} not recognised: {shown}")
        print("Names must match a catalogue id - see assets/images/PROMPTS.md.")
    if looks_touched and not args.check:
        print(f"\nCheck the hotspots on: {', '.join(looks_touched)}")
        print("Open each Look in the app; adjust that Look's piece x/y in src/data/catalog.json if a marker is off.")


if __name__ == "__main__":
    main()
