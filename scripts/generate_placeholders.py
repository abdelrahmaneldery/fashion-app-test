"""Generate SEAM placeholder imagery from src/data/catalog.json.

Look images are now real photographs, kept in assets/images/looks, and avatars
are cut from them by scripts/crop_avatars.py; this script leaves any file it
finds in either folder alone. Packshots are still flat stand-ins, redrawn every run.

To add a Look: drop its photograph in as <look-id>.jpg, set the look's "ratio"
to the photograph's own, author each piece's "x"/"y" against it in
catalog.json, then re-run this to refresh src/data/images.generated.ts.

Usage: python3 scripts/generate_placeholders.py [--force]
       --force redraws the flat stand-in figures over the photographs.
"""
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
CAT = json.loads((ROOT / "src/data/catalog.json").read_text(encoding="utf-8"))
OUT = ROOT / "assets/images"
LINEN = "#E9E5DE"


def hex2rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def shade(h, f):
    r, g, b = hex2rgb(h)
    if f >= 0:
        return tuple(round(c + (255 - c) * f) for c in (r, g, b))
    return tuple(round(c * (1 + f)) for c in (r, g, b))


def vgradient(img, top, bottom, y0=0, y1=None):
    y1 = img.height if y1 is None else y1
    draw = ImageDraw.Draw(img)
    for y in range(y0, y1):
        t = (y - y0) / max(1, y1 - y0 - 1)
        c = tuple(round(a + (b - a) * t) for a, b in zip(top, bottom))
        draw.line([(0, y), (img.width, y)], fill=c)


PRODUCTS = {p["id"]: p for p in CAT["products"]}

# Anchor positions relative to figure centre (x) and figure top (y), in units of figure height.
ANCHORS = {"outer": (-0.113, 0.368), "top": (0.004, 0.242), "bottom": (-0.025, 0.717),
           "shoes": (-0.035, 0.978), "bag": (0.173, 0.586)}


def draw_look(look):
    # Real photography has replaced the stand-ins, so a file that is already here is never
    # redrawn. Delete one (or pass --force) to get a drawn figure back.
    path = OUT / "looks" / f"{look['id']}.jpg"
    if path.exists() and "--force" not in sys.argv:
        return None

    rw, rh = look["ratio"]
    W = 1179
    H = round(W * rh / rw)
    s = look["scene"]
    u = s["figH"] * H
    y0 = s["figTop"] * H
    cx = s["cx"] * W

    def P(rx, ry):
        return (cx + rx * u, y0 + ry * u)

    colors, long_coat, dress = {}, False, False
    for pc in look["pieces"]:
        prod = PRODUCTS.get(pc["product"]) if pc["product"] else None
        colors[pc["slot"]] = prod["color"] if prod else pc["color"]
        if prod and prod.get("long"):
            long_coat = True
        if prod and prod["category"] == "dress":
            dress = True
    bottom = colors.get("bottom") or s.get("bottomColor") or colors.get("top")
    torso = colors.get("outer") or colors.get("top")
    skin, hair = s["skin"], s["hair"]

    img = Image.new("RGB", (W, H), hex2rgb(s["wall"]))
    floor_y = int(y0 + 0.93 * u)
    vgradient(img, shade(s["wall"], 0.07), shade(s["wall"], -0.05), 0, floor_y)
    vgradient(img, shade(s["floor"], 0.04), shade(s["floor"], -0.08), floor_y, H)
    d = ImageDraw.Draw(img)
    if s.get("doorway"):
        d.rectangle([0.07 * W, 0.04 * H, 0.19 * W, floor_y], fill=hex2rgb(s["doorway"]))

    shadow = Image.new("L", (W, H), 0)
    sd = ImageDraw.Draw(shadow)
    sx, sy = P(0.03, 0.99)
    sd.ellipse([sx - 0.24 * u, sy - 0.03 * u, sx + 0.24 * u, sy + 0.03 * u], fill=120)
    shadow = shadow.filter(ImageFilter.GaussianBlur(0.02 * u))
    img.paste(Image.new("RGB", (W, H), shade(s["floor"], -0.35)), (0, 0), shadow)
    d = ImageDraw.Draw(img)

    # Legs or column
    if dress or long_coat:
        d.polygon([P(-0.11, 0.45), P(0.11, 0.45), P(0.125, 0.945), P(-0.125, 0.945)], fill=hex2rgb(bottom))
    else:
        d.polygon([P(-0.115, 0.45), P(-0.004, 0.45), P(-0.01, 0.945), P(-0.135, 0.945)], fill=hex2rgb(bottom))
        d.polygon([P(0.004, 0.45), P(0.115, 0.45), P(0.135, 0.945), P(0.01, 0.945)], fill=shade(bottom, -0.06))
    # Shoes
    for ex, f in ((-0.06, 0), (0.065, -0.08)):
        x, y = P(ex, 0.975)
        d.ellipse([x - 0.05 * u, y - 0.018 * u, x + 0.05 * u, y + 0.018 * u], fill=shade(colors.get("shoes", "#222222"), f))
    # Torso and sleeves
    hem = 0.85 if long_coat else 0.47
    hw = 0.15 if long_coat else 0.125
    d.polygon([P(-0.135, 0.13), P(0.135, 0.13), P(hw, hem), P(-hw, hem)], fill=hex2rgb(torso))
    d.polygon([P(-0.135, 0.135), P(-0.10, 0.16), P(-0.14, 0.46), P(-0.185, 0.455)], fill=shade(torso, -0.07))
    d.polygon([P(0.135, 0.135), P(0.10, 0.16), P(0.155, 0.47), P(0.195, 0.46)], fill=shade(torso, -0.1))
    for hx, hy in ((-0.163, 0.475), (0.176, 0.485)):
        x, y = P(hx, hy)
        d.ellipse([x - 0.022 * u, y - 0.022 * u, x + 0.022 * u, y + 0.022 * u], fill=hex2rgb(skin))
    if colors.get("outer"):
        inner = colors.get("top") or skin
        d.polygon([P(-0.05, 0.135), P(0.05, 0.135), P(0, 0.38)], fill=hex2rgb(inner))
        lw = max(2, int(0.004 * u))
        d.line([P(-0.05, 0.135), P(0, 0.38)], fill=shade(torso, -0.22), width=lw)
        d.line([P(0.05, 0.135), P(0, 0.38)], fill=shade(torso, -0.22), width=lw)
    else:
        d.line([P(-0.04, 0.14), P(0, 0.17), P(0.04, 0.14)], fill=shade(torso, -0.2), width=max(2, int(0.004 * u)))
    # Neck and head
    d.rectangle([*P(-0.025, 0.1), *P(0.025, 0.145)], fill=hex2rgb(skin))
    if s.get("scarf"):
        x, y = P(0, 0.075)
        d.ellipse([x - 0.062 * u, y - 0.08 * u, x + 0.062 * u, y + 0.085 * u], fill=hex2rgb(hair))
        d.ellipse([x - 0.033 * u, y - 0.04 * u, x + 0.033 * u, y + 0.045 * u], fill=hex2rgb(skin))
    else:
        x, y = P(0, 0.05)
        d.ellipse([x - 0.052 * u, y - 0.052 * u, x + 0.052 * u, y + 0.058 * u], fill=hex2rgb(hair))
        x, y = P(0, 0.07)
        d.ellipse([x - 0.042 * u, y - 0.045 * u, x + 0.042 * u, y + 0.05 * u], fill=hex2rgb(skin))
    # Bag in the far hand
    if colors.get("bag"):
        hx, hy = P(0.176, 0.485)
        a, b = P(0.14, 0.50), P(0.23, 0.68)
        d.line([(hx, hy), a], fill=shade(colors["bag"], -0.2), width=max(2, int(0.005 * u)))
        d.line([(hx, hy), (b[0], a[1])], fill=shade(colors["bag"], -0.2), width=max(2, int(0.005 * u)))
        d.rectangle([a, b], fill=hex2rgb(colors["bag"]))

    img.save(OUT / "looks" / f"{look['id']}.jpg", quality=86)

    anchors = {}
    for pc in look["pieces"]:
        if "x" in pc and "y" in pc:
            anchors[pc["slot"]] = [pc["x"], pc["y"]]
        else:
            ax, ay = P(*ANCHORS[pc["slot"]])
            anchors[pc["slot"]] = [round(ax / W, 4), round(ay / H, 4)]
    return anchors


def draw_packshot(prod, path, zoom=False):
    W, H = 900, 1200
    img = Image.new("RGB", (W, H), hex2rgb(LINEN))
    d = ImageDraw.Draw(img)
    c = prod["color"]
    cat = prod["category"]
    dark = shade(c, -0.18)
    sh = Image.new("L", (W, H), 0)
    ImageDraw.Draw(sh).ellipse([240, 1070, 660, 1110], fill=90)
    sh = sh.filter(ImageFilter.GaussianBlur(18))
    img.paste(Image.new("RGB", (W, H), shade(LINEN, -0.2)), (0, 0), sh)
    d = ImageDraw.Draw(img)
    if cat in ("outer", "top", "dress"):
        hem = 1040 if (cat == "dress" or prod.get("long")) else (830 if cat == "outer" else 800)
        d.polygon([(260, 230), (640, 230), (620, hem), (280, hem)], fill=hex2rgb(c))
        d.polygon([(260, 235), (310, 280), (270, 760), (200, 745)], fill=shade(c, -0.07))
        d.polygon([(640, 235), (590, 280), (630, 760), (700, 745)], fill=shade(c, -0.1))
        if cat == "outer":
            d.polygon([(380, 232), (520, 232), (450, 560)], fill=shade(c, 0.12))
            d.line([(380, 232), (450, 560)], fill=dark, width=6)
            d.line([(520, 232), (450, 560)], fill=dark, width=6)
            for by in (600, 690):
                d.ellipse([440, by, 460, by + 20], fill=dark)
        else:
            d.line([(400, 235), (450, 290), (500, 235)], fill=dark, width=6)
    elif cat == "bottom":
        d.rectangle([300, 170, 600, 215], fill=dark)
        d.polygon([(300, 210), (448, 210), (440, 1060), (270, 1060)], fill=hex2rgb(c))
        d.polygon([(452, 210), (600, 210), (630, 1060), (460, 1060)], fill=shade(c, -0.06))
    elif cat == "shoes":
        d.rounded_rectangle([170, 760, 740, 800], radius=14, fill=dark)
        d.polygon([(170, 770), (200, 690), (300, 640), (470, 610), (620, 560), (720, 590), (740, 770)], fill=hex2rgb(c))
        d.line([(330, 650), (560, 600)], fill=dark, width=8)
    elif cat == "bag":
        d.arc([330, 330, 570, 640], start=180, end=360, fill=dark, width=18)
        d.rounded_rectangle([250, 480, 650, 880], radius=10, fill=hex2rgb(c))
        d.line([(250, 560), (650, 560)], fill=dark, width=5)
    if zoom:
        img = img.crop((150, 200, 750, 1000)).resize((W, H), Image.LANCZOS)
    img.save(path, quality=86)


def draw_avatar(cr):
    # Profile pictures are cut from the creators' own Look photographs (scripts/crop_avatars.py), so
    # one that is already here is never redrawn. Delete one (or pass --force) to get a drawn face back.
    path = OUT / "avatars" / f"{cr['id']}.jpg"
    if path.exists() and "--force" not in sys.argv:
        return
    a = cr["avatar"]
    S = 300
    img = Image.new("RGB", (S, S), hex2rgb(a["bg"]))
    d = ImageDraw.Draw(img)
    d.ellipse([40, 210, 260, 420], fill=hex2rgb(a["top"]))
    d.rectangle([132, 170, 168, 225], fill=hex2rgb(a["skin"]))
    d.ellipse([95, 50, 205, 170], fill=hex2rgb(a["hair"]))
    d.ellipse([105, 72, 195, 190], fill=hex2rgb(a["skin"]))
    img.save(path, quality=88)


def main():
    for sub in ("looks", "products", "avatars"):
        (OUT / sub).mkdir(parents=True, exist_ok=True)
    for look in CAT["looks"]:
        draw_look(look)
    hero = {pc["product"] for pc in CAT["looks"][0]["pieces"] if pc["product"]}
    product_files = {}
    for p in CAT["products"]:
        files = [f"{p['id']}.jpg"]
        draw_packshot(p, OUT / "products" / files[0])
        if p["id"] in hero:
            files.append(f"{p['id']}-detail.jpg")
            draw_packshot(p, OUT / "products" / files[1], zoom=True)
        product_files[p["id"]] = files
    for cr in CAT["creators"]:
        draw_avatar(cr)

    lines = ["/* Generated by scripts/generate_placeholders.py. Do not edit by hand. */", "",
             "export const lookFiles: Record<string, string> = {"]
    lines += [f"  '{l['id']}': '{l['id']}.jpg'," for l in CAT["looks"]]
    lines += ["};", "", "export const productFiles: Record<string, string[]> = {"]
    for pid, files in product_files.items():
        names = ", ".join(f"'{f}'" for f in files)
        lines.append(f"  '{pid}': [{names}],")
    lines += ["};", "", "export const avatarFiles: Record<string, string> = {"]
    lines += [f"  '{c['id']}': '{c['id']}.jpg'," for c in CAT["creators"]]
    lines += ["};", ""]
    (ROOT / "src/data/images.generated.ts").write_text("\n".join(lines), encoding="utf-8")
    print(f"{len(CAT['looks'])} looks, {sum(len(v) for v in product_files.values())} packshots, {len(CAT['creators'])} avatars")


if __name__ == "__main__":
    main()
