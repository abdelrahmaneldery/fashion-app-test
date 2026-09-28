# SEAM backend (Supabase)

Postgres with row-level security, auth and storage. The app talks to the database directly, so the
**access rules in `migrations/` are the security boundary**, and they're tested in `tests/`.

## What's here

| File | Contents |
|---|---|
| `migrations/…01_core_schema.sql` | Markets, price bands, profiles, retailers, brands, products (with image embeddings), Looks, pieces, follows, saves, Lookbooks, blocks, reports, outbound clicks |
| `migrations/…02_functions_and_security.sql` | Feed, price bands, alternatives (vector search), Lookbook contents, account deletion, triggers, all access rules |
| `migrations/…03_storage.sql` | `looks` and `avatars` buckets; uploads only into your own folder |
| `migrations/20260928000001_look_links.sql` | A Look's `link` (where Visit site goes) and a profile's `website`; both must be web addresses |
| `migrations/20260927000001_look_audience.sql` | Who a Look is for (Everyone, Followers, Only me), enforced on the Look, its pieces, the feed, Lookbooks and its photo |
| `seed.sql` | Generated from `src/data/catalog.json` by `npm run seed`, so the backend starts with today's app content |
| `tests/` | 43 tests on real Postgres 18 + pgvector (PGlite) with Supabase's roles and grants: `npm run test:db` |

## Rules the database enforces

- **One Save rule:** a save is exactly one Look or product, once per person. Lookbooks hold saves, so removing a save removes it from every Lookbook.
- **Privacy:** saves and private Lookbooks are visible only to their owner. Public Lookbooks expose their contents, never the saves behind them.
- **Filing:** only your own saves, and only into your own Lookbooks.
- **Catalogue:** read-only from the app; only the ingestion pipeline (service role) writes to it.
- **Creator status:** people can't make themselves creators (column-level permission).
- **Who a Look is for:** chosen when it is posted. *Everyone*: anyone. *Followers*: only people who follow
  the creator (unfollowing loses access at once). *Only me*: the creator alone, and never in any feed. Its
  pieces, saves of it, public Lookbooks listing it and its photo file all follow the same rule
  (`can_view_look`), and only the creator can change it.
- **Look photos are private files:** the `looks` bucket is not public, so a Followers or Only me photo cannot
  be fetched by address. The app loads Look photos through signed URLs (`createSignedUrl`). Avatars stay public.
- **Links out:** a Look's `link` and a profile's `website` are optional, and when present must be an `http`
  or `https` web address with a real host (no `javascript:`, `data:` or bare words). People set only their own.
- **Blocks:** blocking hides that creator's Looks from you, and only from you.
- **Account deletion:** in-app deletion cascades through everything the person owns (App Store requirement).
- **Outbound clicks:** anyone can log them; nobody can read them from the app.

## Set up a project (once per environment: staging, production)

1. Create the project in the Supabase dashboard, in the region closest to launch users.
2. In this repo:
   ```bash
   npx supabase init                          # adds supabase/config.toml; keeps migrations
   npx supabase link --project-ref <ref>
   npx supabase db push                       # applies migrations
   ```
3. Staging only: load the demo content by running `seed.sql` in the dashboard's SQL editor.
   Then upload `assets/images/looks/*` to the `looks` bucket under `<creator id>/<look id>.jpg`,
   matching `looks.image_path`.
4. Point the app at it:
   ```bash
   VITE_SUPABASE_URL=https://<ref>.supabase.co     # in .env.local, or your host's env settings
   VITE_SUPABASE_ANON_KEY=<anon key>
   ```
   Use `.env.local` (see `.env.example`) for local development.
5. Generate typed queries for the app: `npm run db:types`.

## Open decisions

- **Price-band thresholds** for EGP and SAR in `seed.sql` are placeholders (roughly $50 / $150 / $400 converted). They need commercial sign-off.
- **Launch market and Arabic:** the schema supports both markets and has Arabic fields. What ships first decides the sign-in methods, currency and when RTL work starts.
