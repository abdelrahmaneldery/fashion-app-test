"""Cut each creator's profile picture from one of their own Look photographs.

The avatars are the person in the creator's Looks, head and shoulders, so a profile picture always
matches the photographs it sits beside. Each entry below names the Look and the square to take from
it: its centre as fractions of the photo's width and height, and its side as a fraction of the width.

It never upscales: a square smaller than the 400 px target is saved at its own size.

Usage: python3 scripts/crop_avatars.py
"""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
CAT = json.loads((ROOT / "src/data/catalog.json").read_text(encoding="utf-8"))
LOOKS = ROOT / "assets/images/looks"
OUT = ROOT / "assets/images/avatars"
TARGET = 400

# creator: (Look photograph, centre x, centre y, side). Chosen for the sharpest, front-facing face.
CROPS = {
    "amira": ("amira-black-tailoring", 0.45, 0.10, 0.26),
    "lina": ("lina-grey-minimal", 0.455, 0.185, 0.28),
    "omar": ("omar-underpass", 0.45, 0.17, 0.26),
    "nour": ("nour-colonnade", 0.50, 0.21, 0.40),
    "karim": ("karim-street-polo", 0.52, 0.315, 0.26),
    "sara": ("sara-denim-uniform", 0.49, 0.21, 0.28),
}


def crop(look, cx, cy, side):
    img = Image.open(LOOKS / f"{look}.jpg").convert("RGB")
    w, h = img.size
    s = round(side * w)
    # Kept inside the photo, so an avatar is never padded with an edge that was not there.
    x0 = max(0, min(w - s, round(cx * w - s / 2)))
    y0 = max(0, min(h - s, round(cy * h - s / 2)))
    square = img.crop((x0, y0, x0 + s, y0 + s))
    return square.resize((TARGET, TARGET), Image.LANCZOS) if s > TARGET else square


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    creators = {c["id"] for c in CAT["creators"]}
    missing = creators - CROPS.keys()
    if missing:
        raise SystemExit(f"No avatar crop for {', '.join(sorted(missing))}; add one to CROPS.")
    for cid, spec in CROPS.items():
        img = crop(*spec)
        img.save(OUT / f"{cid}.jpg", quality=88, optimize=True, progressive=True)
        print(f"{cid}: {spec[0]} -> {img.size[0]} px")


if __name__ == "__main__":
    main()
