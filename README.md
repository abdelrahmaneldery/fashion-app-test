# SEAM — fashion discovery (Fekra)

React 19 · Vite 7 · React Router · Framer Motion · Figtree · TypeScript (strict)

A mobile-first web app. The design is drawn as a phone canvas; the layout widens with the screen
rather than being redrawn for it.

## Run it

```bash
npm install
npm run dev
```

Opens on <http://localhost:8081>. Checks: `npm run typecheck` · `npm run lint` · `npm run test:db` · `npm run build`
(all run by CI on every push).

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server with hot module replacement |
| `npm run build` | Typecheck, then a production bundle in `dist/` |
| `npm run preview` | Serve the built bundle locally |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint over `src/` |
| `npm run images` | Redraw the stand-in catalogue images |
| `npm run seed` | Rebuild `supabase/seed.sql` from the catalogue |
| `npm run test:db` | Schema, access-rule and function tests (pglite) |

## Build plan status

| Phase | Status |
|---|---|
| 0 · Foundations: environments, crash reporting, analytics, CI | **Done**; needs account keys (below) |
| 1 · Backend: schema, access rules, storage, seed | **Schema done and tested**; next: sign-in and moving the app onto the API |
| 2 · Product data and Arabic | Not started |
| 3 · AI layer: embeddings, photo search, auto-tagging | Schema ready (vector columns and indexes) |
| 4 · Closed beta | Not started |

## Environments

Configuration comes from environment variables. Copy `.env.example` to `.env.local` for local work;
in CI and on your host, set the same names per environment. Only `VITE_`-prefixed values reach the
browser, and they are inlined at build time — so a staging and a production bundle are built separately.

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Supabase project. The anon key is public by design; row-level security protects the data. |
| `VITE_SENTRY_DSN` | Crash and performance reporting. Only active in production builds. |
| `VITE_APP_VARIANT` | `development` \| `staging` \| `production`. Tags Sentry events and sets the trace sample rate. |
| `VITE_ANALYTICS_DEBUG` | `1` prints analytics events to the console. |
| `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | Build-time only, for uploading source maps. |

Everything is optional locally. Without Supabase keys the app runs on the bundled demo catalogue.

**Analytics:** typed product events in `src/lib/analytics.ts`, covering Look viewed, piece opened, save,
filing, shop click and follow. Each one is also a crash-report breadcrumb. Plug in a vendor with
`addAnalyticsSink`.

## Deploying

`npm run build` produces a static `dist/` — any static host will serve it (Netlify, Vercel, Cloudflare
Pages, S3 + CloudFront, nginx). One requirement: the app uses real URLs, so the host must **rewrite
unknown paths to `/index.html`** or a refresh on `/look/<id>` will 404. Hashed asset filenames mean
`dist/assets/` can be cached indefinitely while `index.html` is not.

## Backend

See [`supabase/README.md`](supabase/README.md) for the schema, the rules it enforces and project setup.

## The design system

One typeface, six radii, warm neutrals, one accent. `src/theme/tokens.ts` is the single source of
truth; `src/theme/cssVars.ts` emits every token as a CSS custom property, so stylesheets read
`var(--c-textPrimary)`, `var(--radius-card)`, `var(--space-16)`.

**Type — Figtree**, variable 300–900. Hierarchy is carried by weight (800 for display and titles,
600 for labels, 400 for body) rather than by switching family. Sizes live in `typeScale`, applied
inline by `<Text variant>` so a variant always beats a class.

**Radius** — `xs` 4 · `sm` 12 (thumbnails inside a card) · `button` 14 (floating squares on a photo)
· `card` 16 (pins, tiles, list cards — the default) · `hero` 24 (the foot of a full-bleed photo) ·
`sheet` 28 (top of sheets and menus) · `full` (buttons, chips, tags, discs).

**Colour** — Paper, Bone, Linen and Ink as before, plus `surfaceCard` for cards that lift off the
ground and `accent` for the one saturated action on a screen: Brick `#A8362B` in light, Ember
`#CC4436` in dark, both at AA against white.

The app follows **the device** by default, and stays wherever it is put from Appearance in the
Profile settings sheet — System, Light or Dark. The choice persists alongside saves and follows.

- **System** (default): whatever the phone or desktop is set to, live — flip the device and the app
  follows without a reload.
- **Light:** Paper surfaces.
- **Dark:** Coal surfaces — `#17171B`, held well off black so a full-screen page does not glare
  against its own text, with every surface above it a measured step brighter.
- **Product Detail:** Bone under a light app, the dark surfaces under a dark one. It has its own
  surface for product facts, but never a lit page in a dark app.
- **On photos:** controls (Eyelets, Save, tags) always use the dark treatment, so they read on any image.
- **Bottom navigation is icon-only**, the pattern the reference app uses; state is carried by glyph
  weight rather than colour. Every tab carries an `aria-label`, so screen readers are unaffected —
  but it does cost discoverability for first-time sighted users. Put the labels back by rendering
  `tab.label` in `TabBar.tsx` if that trade stops being worth it.

Brand assets are generated by `python3 scripts/generate_brand_assets.py` (the Eyelet mark on a stitch
line, and the Bodoni wordmark). The web app uses `public/favicon.png` and `public/icon.png`; the rest of
`assets/` is kept for future native or store use. The wordmark needs a Bodoni Moda TTF — set
`SEAM_SERIF_TTF` or drop one at `assets/fonts/BodoniModa-Regular.ttf`.

## What works

The core loop, end to end:

1. **Home**: masonry feed, For You / Following, style filters, collapsing chrome, and editorial Wide cards
   placed only where the columns align.
2. **Look Detail**: Eyelet hotspots with a staggered entrance, Pieces toggle, Shop the Look, More from the
   creator, Similar Looks, a sticky Save bar that steps aside at Similar Looks, and a compact top bar.
3. **Piece Sheet**: Medium and Large detents (drag the header or use the grabber), piece-to-piece navigation,
   Lower / Similar / Higher alternatives, and the sold-out and unidentified states. The photo scrolls so the
   chosen piece stays visible above the sheet.
4. **Product Detail**: Bone theme, gallery, accordions, alternatives, Looks with this piece, and a sticky
   Shop bar that appears only once the inline one scrolls away.
5. **Save**: one rule everywhere. Filing into Lookbooks, New Lookbook, remove with Undo, and toasts.
6. **Profile**: follow creators, and the Light / Dark switch.

Saves, Lookbooks, follows and the colour mode all persist between visits (`localStorage`).

Explore, Profile, Create and the Lookbooks tab are simple stand-ins for the next build. Lookbooks already
lists saves and Profile toggles follows.

## Responsive behaviour

The phone layout is the base. Past 680 px the feed goes to three columns and All Saves to four; past
1024 px, four and six. The app column stops growing at 1120 px and centres, so cards and line lengths stay
close to the drawn proportions. Bottom sheets keep a phone width (560 px) and centre rather than stretching
into a band. Anything the platform used to supply has a web counterpart: safe-area insets come from
`env(safe-area-inset-*)`, Share falls back to the clipboard, and Escape closes every sheet and menu.

## Where things live

| Path | Contents |
|---|---|
| `src/App.tsx` | Routes and the app shell |
| `src/screens/` | One file per route: Home, Explore, Lookbooks, Profile, Create, LookDetail, ProductDetail |
| `src/components/` | Design-system components (Eyelet, BottomSheet, PieceSheet, SaveSheetHost, cards, buttons) |
| `src/theme/` | `tokens.ts` (palette, semantic tokens, spacing, type scale), the CSS-variable emitter, global styles |
| `src/hooks/` | Safe-area insets, viewport and breakpoint, element size, Escape |
| `src/lib/` | Environment, Supabase, Sentry, analytics, shop links, platform shims |
| `src/data/catalog.json` | Mock creators, products and Looks: the single source of content |
| `src/store/useSeamStore.ts` | Saves, Lookbooks, follows, sheet and toast state (zustand) |
| `scripts/generate_placeholders.py` | Draws the stand-in images from the catalogue |

Components carry their own styles in a sibling `*.module.css`, addressing tokens through CSS variables.

## Swapping in real photography

The images in `assets/images/` are generated stand-ins. Replacing them is three steps, and the
catalogue drives all of it.

```bash
pip install pillow
python3 scripts/build_image_prompts.py     # 72 prompts, from the catalogue
# generate the images, however you like
python3 scripts/import_photos.py ~/Downloads/seam-photos
```

**1. Build the prompts.** `scripts/build_image_prompts.py` reads `src/data/catalog.json` and writes
one prompt per asset to `assets/images/PROMPTS.md` (to read) and `prompts.json` (to batch). Each
Look prompt names the exact garments that Look contains, so the photograph matches the pieces the
app will tag on it, and each packshot borrows its colour from the Look that wears it.

**2. Generate them.** Any generator will do. Save each result under the file name in its prompt
heading — `amira-soft-tailoring.png`, `halden-linen-blazer.jpg`. A `(1)` suffix and any of
`.jpg/.png/.webp` are fine.

**3. Import.** `scripts/import_photos.py <folder>` centre-crops each image to the aspect ratio the
app expects, resizes it (Looks 1600px, packshots 1000px, avatars 400px), saves progressive JPEGs
into the right folder, and reports anything it could not place. It never upscales.

**Framing matters.** Every Look prompt carries the same framing line — full body, head to toe,
centred, feet visible. The app positions its Eyelet hotspots by garment slot, so a jacket has to
land in the same part of the frame in every photograph. Importing Look photos rewrites
`anchors.generated.json` to the photographic positions in `PHOTO_ANCHORS`; nudge a value there if a
hotspot sits slightly off on a particular Look.

## Known gaps, by design for this build

- Shop links go to `https://example.com/shop/<id>` until retailer feeds exist. Find similar shows a
  "next build" message.
- Not built yet: the card-to-Look zoom transition, the packshot morph into Product Detail, long-press
  "See fewer", and See all alternatives.
- The feed renders every item; virtualise Masonry once real data volume arrives.
- There is no automated UI test suite yet — `npm run test:db` covers the database only.
