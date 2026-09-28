-- SEAM core schema: markets, catalogue, content, people, saving, safety, tracking.
-- Market-agnostic by design: Egypt and Saudi Arabia (and USD-listed retailers) coexist;
-- Arabic copy lives beside English so RTL can ship without a migration.

create extension if not exists vector with schema extensions;

-- ─────────────────────────────────────────── Enums
create type public.garment_slot   as enum ('outer', 'top', 'bottom', 'dress', 'shoes', 'bag', 'accessory');
create type public.stock_state    as enum ('in', 'low', 'out');
create type public.look_status    as enum ('draft', 'published', 'hidden', 'removed');
create type public.piece_source   as enum ('creator', 'model', 'editor');
create type public.report_reason  as enum ('spam', 'nudity', 'harassment', 'hate', 'counterfeit', 'ip', 'other');
create type public.report_status  as enum ('open', 'actioned', 'dismissed');

-- ─────────────────────────────────────────── Markets and money
create table public.markets (
  code            char(2) primary key,                 -- ISO 3166-1: EG, SA
  name            text not null,
  default_currency char(3) not null,                   -- ISO 4217
  default_locale  text not null check (default_locale in ('en', 'ar')),
  active          boolean not null default false
);

-- Price-band thresholds per currency, in minor units ($ / $$ / $$$ / $$$$ boundaries).
create table public.price_bands (
  currency char(3) primary key,
  t1 bigint not null, t2 bigint not null, t3 bigint not null,
  check (0 < t1 and t1 < t2 and t2 < t3)
);

-- ─────────────────────────────────────────── People
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  handle        text not null check (handle ~ '^[a-z0-9._]{3,30}$'),
  display_name  text not null check (char_length(display_name) between 1 and 60),
  bio           text check (char_length(bio) <= 160),
  avatar_path   text,
  market_code   char(2) references public.markets (code),
  locale        text not null default 'en' check (locale in ('en', 'ar')),
  is_creator    boolean not null default false,
  taste_styles  text[] not null default '{}',
  budget_band   smallint check (budget_band between 1 and 4),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index profiles_handle_key on public.profiles (lower(handle));

-- ─────────────────────────────────────────── Catalogue (written by the ingestion pipeline only)
create table public.retailers (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  domain            text not null unique,
  markets           char(2)[] not null default '{}',
  affiliate_network text,
  active            boolean not null default true,
  created_at        timestamptz not null default now()
);

create table public.brands (
  id    uuid primary key default gen_random_uuid(),
  name  text not null,
  slug  text not null unique check (slug ~ '^[a-z0-9-]+$')
);

create table public.products (
  id              uuid primary key default gen_random_uuid(),
  retailer_id     uuid not null references public.retailers (id),
  brand_id        uuid not null references public.brands (id),
  external_id     text not null,                        -- the retailer's SKU / feed id
  slot            public.garment_slot not null,
  name            text not null,
  name_ar         text,
  description     text,
  description_ar  text,
  materials       text,
  fit             text,
  color_hex       char(7) check (color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  price_minor     bigint not null check (price_minor >= 0),
  currency        char(3) not null references public.price_bands (currency),
  stock           public.stock_state not null default 'in',
  product_url     text not null,
  image_urls      text[] not null default '{}',         -- retailer CDN URLs
  embedding       extensions.vector(768),               -- FashionSigLIP image embedding (Phase 3)
  active          boolean not null default true,
  last_seen_at    timestamptz not null default now(),   -- stale rows are deactivated by the pipeline
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (retailer_id, external_id)
);
create index products_slot_idx on public.products (slot) where active;
create index products_embedding_idx on public.products using hnsw (embedding extensions.vector_cosine_ops) where active;

-- ─────────────────────────────────────────── Content
create table public.looks (
  id            uuid primary key default gen_random_uuid(),
  creator_id    uuid not null references public.profiles (id) on delete cascade,
  image_path    text not null,
  width         int not null check (width > 0),
  height        int not null check (height > 0),
  caption       text check (char_length(caption) <= 500),
  caption_ar    text check (char_length(caption_ar) <= 500),
  style         text,
  occasion      text,
  season        text,
  status        public.look_status not null default 'draft',
  is_ai         boolean not null default false,          -- AI-modified imagery is labelled, never hidden
  market_code   char(2) references public.markets (code),
  embedding     extensions.vector(768),
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check (status <> 'published' or published_at is not null)
);
create index looks_feed_idx on public.looks (published_at desc, id desc) where status = 'published';
create index looks_creator_idx on public.looks (creator_id, published_at desc);
create index looks_embedding_idx on public.looks using hnsw (embedding extensions.vector_cosine_ops) where status = 'published';

-- A hotspot on a Look. Unidentified pieces keep product_id null and show "Find similar".
create table public.look_pieces (
  id          uuid primary key default gen_random_uuid(),
  look_id     uuid not null references public.looks (id) on delete cascade,
  position    smallint not null check (position >= 1),
  slot        public.garment_slot not null,
  label       text not null,
  x           numeric(5, 4) not null check (x between 0 and 1),
  y           numeric(5, 4) not null check (y between 0 and 1),
  product_id  uuid references public.products (id) on delete set null,
  source      public.piece_source not null default 'creator',
  confidence  real check (confidence between 0 and 1),
  unique (look_id, position)
);
create index look_pieces_product_idx on public.look_pieces (product_id);

create table public.follows (
  follower_id uuid not null references public.profiles (id) on delete cascade,
  creator_id  uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (follower_id, creator_id),
  check (follower_id <> creator_id)
);
create index follows_creator_idx on public.follows (creator_id);

-- ─────────────────────────────────────────── Saving: one rule, enforced by the database
-- A save is a Look or a Product. Lookbooks hold saves, so removing a save removes it everywhere.
create table public.saves (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  look_id     uuid references public.looks (id) on delete cascade,
  product_id  uuid references public.products (id) on delete cascade,
  created_at  timestamptz not null default now(),
  check (num_nonnulls(look_id, product_id) = 1)
);
create unique index saves_user_look_key on public.saves (user_id, look_id) where look_id is not null;
create unique index saves_user_product_key on public.saves (user_id, product_id) where product_id is not null;
create index saves_user_recent_idx on public.saves (user_id, created_at desc);

create table public.lookbooks (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 40),
  is_private  boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index lookbooks_owner_idx on public.lookbooks (owner_id, updated_at desc);

create table public.lookbook_items (
  lookbook_id uuid not null references public.lookbooks (id) on delete cascade,
  save_id     uuid not null references public.saves (id) on delete cascade,
  added_at    timestamptz not null default now(),
  primary key (lookbook_id, save_id)
);
create index lookbook_items_save_idx on public.lookbook_items (save_id);

-- ─────────────────────────────────────────── Safety (App Store guideline 1.2 for user content)
create table public.blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid not null references public.profiles (id) on delete cascade,
  look_id      uuid references public.looks (id) on delete cascade,
  profile_id   uuid references public.profiles (id) on delete cascade,
  reason       public.report_reason not null,
  note         text check (char_length(note) <= 500),
  status       public.report_status not null default 'open',
  created_at   timestamptz not null default now(),
  check (num_nonnulls(look_id, profile_id) = 1)
);
create index reports_open_idx on public.reports (created_at) where status = 'open';

-- ─────────────────────────────────────────── Commerce tracking (affiliate revenue)
create table public.outbound_clicks (
  id          bigint generated always as identity primary key,
  user_id     uuid references public.profiles (id) on delete set null,
  product_id  uuid not null references public.products (id) on delete cascade,
  look_id     uuid references public.looks (id) on delete set null,
  surface     text not null check (surface in ('piece_sheet', 'product_detail', 'sticky_bar', 'alternatives')),
  created_at  timestamptz not null default now()
);
create index outbound_clicks_product_idx on public.outbound_clicks (product_id, created_at desc);
