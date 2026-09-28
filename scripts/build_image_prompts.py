"""Derive one image-generation prompt per asset from the catalogue and the art direction.

Nothing here is hand-maintained. `src/data/catalog.json` supplies the garments, their colours and
each Look's hotspots; `src/data/art-direction.json` supplies the character references, per-Look
pose and composition, and the packshot presentation rules. Change those, re-run this.

    python3 scripts/build_image_prompts.py              # the validation set only (default)
    python3 scripts/build_image_prompts.py --all        # the whole catalogue

Writes assets/images/prompts.json (to batch) and assets/images/PROMPTS.md (to read or paste).
"""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CAT = json.loads((ROOT / "src/data/catalog.json").read_text(encoding="utf-8"))
ART = json.loads((ROOT / "src/data/art-direction.json").read_text(encoding="utf-8"))
OUT = ROOT / "assets/images"

PRODUCTS = {p["id"]: p for p in CAT["products"]}
CREATORS = {c["id"]: c for c in CAT["creators"]}

# How a garment is worn, so the prompt reads as clothing rather than as a catalogue row.
SLOT_PHRASE = {
    "outer": "worn open over the top",
    "top": "on the upper body",
    "dress": "as a full-length dress",
    "bottom": "on the legs",
    "shoes": "on the feet",
    "bag": "carried",
}


def section(label: str, body: str) -> str:
    return f"{label}: {body.rstrip('.')}."


def wardrobe(look: dict) -> str:
    """Each garment with its exact colour, in the order it is worn."""
    parts = []
    for piece in look["pieces"]:
        pid = piece.get("product")
        how = SLOT_PHRASE.get(piece["slot"], "worn")
        if pid and pid in PRODUCTS:
            product = PRODUCTS[pid]
            parts.append(f"{product['colorName']} {product['name'].lower()} {how}")
        else:
            # An unidentified piece still has to be in the photograph — the app crops into it.
            noun = str(piece.get("label", "accessory")).lower()
            colour = piece.get("colorName", "warm neutral")
            parts.append(f"a plain {colour} {noun} {how}")
    return ", ".join(parts)


def readability_note(look: dict) -> str:
    """
    What the photograph has to show, in plain visual terms.

    The app puts a tap marker on every piece, so each garment must be readable on its own. That is
    a composition requirement, not a coordinate one: the numeric x/y in catalog.json is app
    metadata and is deliberately never sent to the image generator, which would only flatten the
    pose into the same frame every time.
    """
    outer = next((PRODUCTS[p["product"]] for p in look["pieces"]
                  if p["slot"] == "outer" and p.get("product") in PRODUCTS), None)
    lapelled = outer is not None and any(w in outer["name"].lower() for w in ("blazer", "coat", "jacket"))

    wants = []
    for piece in look["pieces"]:
        pid = piece.get("product")
        noun = PRODUCTS[pid]["name"].lower() if pid and pid in PRODUCTS else str(piece.get("label", "piece")).lower()
        slot = piece["slot"]
        if slot == "outer":
            wants.append(f"the {noun} clearly visible across the chest and shoulders")
        elif slot == "top" and outer is not None:
            through = f"the open {outer['name'].lower()} lapels" if lapelled else f"the open front of the {outer['name'].lower()}"
            wants.append(f"the {noun} visible at the chest between {through}")
        elif slot == "top":
            wants.append(f"the {noun} fully visible on the upper body")
        elif slot == "dress":
            wants.append(f"the {noun} reading as one unbroken line from shoulder to hem")
        elif slot == "bottom":
            wants.append(f"the {noun} silhouette unobstructed from waist to hem")
        elif slot == "shoes":
            wants.append(f"both {noun} completely visible and not cropped by the frame")
        elif slot == "bag":
            wants.append(f"the {noun} separated from the body rather than pressed against it")
        else:
            wants.append(f"the {noun} clearly visible")

    return ("Every garment is tagged individually in the app, so each one must read on its own: "
            + "; ".join(wants))


def look_prompt(look: dict) -> str:
    direction = ART["looks"][look["id"]]
    creator = ART["creators"][look["creator"]]
    w, h = look["ratio"]

    lines = [
        section("Format", f"{w}:{h} portrait, full-length editorial fashion photograph"),
        section("Subject", creator["reference"]),
        section("Wardrobe", wardrobe(look)),
        section("Pose", direction["pose"]),
        section("Composition", direction["composition"]),
        section("Camera", direction["camera"]),
        section("Setting", direction["setting"]),
        section("Grade", f'{ART["grade"]}, {ART["gradeSubject"]}'),
    ]
    for rule in direction.get("constraints", []):
        lines.append(section("Requirement", rule))
    lines.append(section("Readability", readability_note(look)))
    lines.append(section("Exclude", ART["exclusions"]))
    return "\n".join(lines)


def packshot_prompt(product: dict) -> str:
    presentation = ART["packshot"]["byCategory"].get(product["category"], ART["packshot"]["byCategory"]["top"])
    return "\n".join([
        section("Format", "3:4 portrait, premium e-commerce product photograph, the garment alone with no person"),
        section("Product", f"{product['colorName']} {product['name'].lower()}"),
        section("Colour", f"exactly {product['colorName']}, matching hex {product['color']}, consistent under the studio light"),
        section("Presentation", presentation),
        section("Framing", ART["packshot"]["shared"]),
        section("Grade", ART["grade"]),
        section("Exclude", ART["exclusions"]),
    ])


def avatar_prompt(creator: dict) -> str:
    direction = ART["avatar"]
    reference = ART["creators"][creator["id"]]["reference"]
    return "\n".join([
        section("Format", "1:1 square portrait. This is the canonical character reference for this creator"),
        section("Subject", reference),
        section("Pose", direction["pose"]),
        section("Composition", direction["composition"]),
        section("Camera", direction["camera"]),
        section("Lighting", direction["lighting"]),
        section("Background", direction["background"]),
        section("Grade", f'{ART["grade"]}, {ART["gradeSubject"]}'),
        section("Exclude", ART["exclusions"]),
    ])


def build() -> list[dict]:
    entries = []
    for look in CAT["looks"]:
        w, h = look["ratio"]
        entries.append({
            "key": f"looks/{look['id']}",
            "file": f"looks/{look['id']}.jpg",
            "kind": "look",
            "aspect": f"{w}:{h}",
            "creator": look["creator"],
            "referenceImage": f"assets/images/avatars/{look['creator']}.jpg",
            "prompt": look_prompt(look),
        })
    for product in CAT["products"]:
        entries.append({
            "key": f"products/{product['id']}",
            "file": f"products/{product['id']}.jpg",
            "kind": "product",
            "aspect": "3:4",
            "prompt": packshot_prompt(product),
        })
    for creator in CAT["creators"]:
        entries.append({
            "key": f"avatars/{creator['id']}",
            "file": f"avatars/{creator['id']}.jpg",
            "kind": "avatar",
            "aspect": "1:1",
            "creator": creator["id"],
            "prompt": avatar_prompt(creator),
        })
    return entries


def write(entries: list[dict], scope: str) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "prompts.json").write_text(json.dumps(entries, indent=2, ensure_ascii=False), encoding="utf-8")

    lines = [
        f"# Image prompts - {scope}",
        "",
        "Generated by `python3 scripts/build_image_prompts.py` from `src/data/catalog.json` and",
        "`src/data/art-direction.json`. Do not edit by hand - change those and re-run.",
        "",
        "## Order of work",
        "",
        "1. Generate each **creator reference** first (the avatars below).",
        "2. Treat that output as canonical for that person - keep the file, do not regenerate it.",
        "3. Generate that creator's Look **supplying the reference as an image reference**, wherever",
        "   the model supports one. Never rebuild a face from text alone if a reference can be passed.",
        "4. Preserve across the pair: face structure, skin tone, hair or hijab, approximate age, and",
        "   any distinguishing feature named in the prompt.",
        "5. Let clothing, pose, location and expression change freely.",
        "",
        "## Composition",
        "",
        "Poses and compositions vary on purpose - the feed needs editorial variety. Hotspots are",
        "authored per Look in `catalog.json`, so nothing has to stand in the same place twice. The",
        "only requirement on a photograph is that each tagged garment reads on its own; the numeric",
        "`x`/`y` values are app metadata and are never sent to the generator.",
        "",
        "After importing a Look, open it in the app and nudge that Look's piece `x`/`y` if a marker",
        "sits slightly off its garment.",
        "",
        "Save each result at the path in its heading, then run `python3 scripts/import_photos.py <folder>`.",
        "",
    ]
    for kind, title in (("avatar", "Creator references"), ("look", "Looks"), ("product", "Packshots")):
        group = [e for e in entries if e["kind"] == kind]
        if not group:
            continue
        lines += [f"## {title} ({len(group)})", ""]
        for e in group:
            lines += [f"### `assets/images/{e['file']}` — {e['aspect']}", ""]
            if e.get("referenceImage"):
                lines += [f"Character reference: `{e['referenceImage']}`", ""]
            lines += ["```", e["prompt"], "```", ""]

    (OUT / "PROMPTS.md").write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--all", action="store_true", help="the whole catalogue, not just the validation set")
    args = parser.parse_args()

    entries = build()
    if not args.all:
        wanted = set(ART["validationSet"])
        missing = wanted - {e["key"] for e in entries}
        if missing:
            raise SystemExit(f"validationSet names assets that are not in the catalogue: {sorted(missing)}")
        # Emit in validationSet order: a reference always precedes the Looks that use it, so a
        # batch run cannot reach a Look before the face it is supposed to match exists.
        order = {key: i for i, key in enumerate(ART["validationSet"])}
        entries = sorted((e for e in entries if e["key"] in wanted), key=lambda e: order[e["key"]])

    scope = "full catalogue" if args.all else "validation set"
    write(entries, scope)
    counts = {k: sum(e["kind"] == k for e in entries) for k in ("avatar", "look", "product")}
    print(f"{len(entries)} prompts ({scope}): {counts['avatar']} references, {counts['look']} Looks, {counts['product']} packshots")
    print("-> assets/images/prompts.json and assets/images/PROMPTS.md")
    if not args.all:
        print("Run with --all once the validation set is approved.")


if __name__ == "__main__":
    main()
