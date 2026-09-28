This is a React + Vite web application (migrated from Expo/React Native). Prioritize mobile-first
patterns, performance, and accessibility. There is no native app: do not add React Native, Expo or
EAS packages, and do not reintroduce `StyleSheet`, `View`, `Text` from `react-native`, or `expo-*`
modules.

## Commands

```bash
npm install
npm run dev          # Vite dev server on :8081
npm run build        # typecheck + production bundle into dist/
npm run preview      # serve the built bundle
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run test:db      # Supabase schema/rules tests
npm run images       # redraw the stand-in catalogue images
npm run avatars      # cut creators' profile pictures from their Look photos
npm run seed         # rebuild supabase/seed.sql from the catalogue
```

Run `npm run lint` and `npm run typecheck` before declaring any task done.

## Routing

- **React Router** (`react-router-dom`), configured in `src/App.tsx`. Screens live in `src/screens/`,
  one file per route; everything else stays in `src/components/`, `src/hooks/` or `src/lib/`.
- Use `Link` / `NavLink` for navigation and `useNavigate`, `useParams` for imperative work.
- `/create` renders as a modal over the current screen when opened from the tab bar (it passes
  `state.background`), and as a full screen when opened directly by URL.

## Styling and theming

- `src/theme/tokens.ts` is the single source of truth for colour, spacing, radius, type and
  breakpoints. Never hard-code a value that exists there.
- `src/theme/cssVars.ts` emits those tokens as CSS custom properties at startup. Stylesheets read
  `var(--c-textPrimary)`, `var(--space-16)`, `var(--layout-margin)` and so on.
- Components carry a sibling `*.module.css` (CSS Modules). Use inline styles only for values computed
  at runtime, such as a measured width.
- `<ThemeScope name="bone">` re-declares the colour set for a subtree via `data-theme`; it renders a
  `display: contents` wrapper, so it never affects layout.
- The app-wide mode is `useSeamStore(selectTheme)`. The stored preference is `themeMode` —
  `'system'` by default, persisted, changed from the Profile settings sheet — and `selectTheme`
  resolves it against the device. `watchSystemTheme()` (started once in `App`) keeps the device's
  answer current. `prefers-color-scheme` belongs in exactly two places: that watcher, and the
  `:root:not([data-theme])` block in `cssVars.ts` that paints the first frame before React mounts.
  Read the mode, never the media query.
- `Switch` draws a toggle's appearance only; the caller owns the `<button role="switch">` around it.
- Type comes from the `<Text>` component's `variant` prop, which applies the scale inline so it always
  wins over a class. One family (Figtree); hierarchy is weight, never a second typeface.
- Radius is a vocabulary, not a number: `card` (16) is the default for anything on the feed, `sheet`
  (28) for sheets, `hero` (24) for the foot of a full-bleed photo, `full` for buttons, chips and discs.
  Reach for `var(--radius-card)` before inventing a value.
- `accent` is the only saturated colour and belongs to one action per screen — Save, or Shop. Never
  use it for decoration, and never use `error` as a stand-in for it.
- Lists are detached cards on `surfaceCard`, not rows divided by hairlines. If you are about to write
  `border-bottom`, you probably want a card.

## Conventions

- Each screen owns its scroll container (`className="scroll"`), the way the native screens did; the
  page body itself does not scroll. Horizontal rails use `className="hscroll"`.
- Layout maths that used the screen width now measure a container with `useElementSize`. Use
  `useViewport` only for things genuinely sized against the window (sheet detents, the hero cap).
- Safe-area insets come from `useSafeAreaInsets` (reads `env(safe-area-inset-*)`), so the phone layout
  still reserves room for a notch and home indicator.
- Animation is **Framer Motion**. Prefer `animate` props; reach for motion values only when a gesture
  drives them, as in `BottomSheet`.
- Platforms a creator can import a Look from (Post a Look's switch) are listed once, in
  `src/data/importSources.ts`. A platform's logo goes in `assets/logos/`: the SVG it supplies, unedited
  except for a `viewBox` if it lacks one (without it an `<img>` crops instead of scaling), or a PNG
  cut out onto transparency. `<SourceLogo>` draws it in the brand's own colours (mark a black logo
  `mono` so it turns light on dark surfaces, and a wordmark `spellsName` so the name is not written
  beside it); add an entry and Post a Look's list picks it up.
- Signing in to a platform and reading its photos go through `src/lib/imports.ts`: one adapter per
  platform (demo accounts today). Screens never call a platform directly, and SEAM never shows a
  password field for another service; a real adapter opens the platform's own sign-in page.
- Icons come from `src/components/icons.ts`, which deep-imports from `@phosphor-icons/react` to keep
  the bundle to the icons actually used. Add new ones there.
- Never nest one interactive element inside another. Cards use a stretched link (`.link::after`) with
  the Save button as a sibling above it.
- Platform capabilities (share, haptics, opening a retailer) live in `src/lib/platform.ts`.

## Data

- `src/data/catalog.json` is the content source; `catalog.ts` derives the typed model from it.
- `src/data/images.generated.ts` is written by `scripts/generate_placeholders.py` and holds file names
  only. `src/data/images.ts` resolves those to hashed URLs via `import.meta.glob`, whose arguments must
  be written out literally at each call site.
