-- Functions, triggers and row-level security.
-- Rule of thumb: the client talks to Postgres directly, so every table is locked by default
-- and each policy states exactly who may read or change what.

-- ─────────────────────────────────────────── Housekeeping triggers
create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_updated_at  before update on public.profiles  for each row execute function public.set_updated_at();
create trigger products_updated_at  before update on public.products  for each row execute function public.set_updated_at();
create trigger looks_updated_at     before update on public.looks     for each row execute function public.set_updated_at();
create trigger lookbooks_updated_at before update on public.lookbooks for each row execute function public.set_updated_at();

-- Filing into a Lookbook bumps it to the top of "Suggested" in the Save sheet.
create or replace function public.touch_lookbook() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.lookbooks set updated_at = now()
  where id = coalesce(new.lookbook_id, old.lookbook_id);
  return null;
end $$;
create trigger lookbook_items_touch after insert or delete on public.lookbook_items
  for each row execute function public.touch_lookbook();

-- Every new account gets a profile. The handle is a placeholder the person can change in onboarding.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, handle, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'handle', 'user' || substr(replace(new.id::text, '-', ''), 1, 10)),
    coalesce(new.raw_user_meta_data ->> 'display_name', 'New member')
  );
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────── Pricing
create or replace function public.price_band(amount_minor bigint, cur char(3)) returns smallint
language sql stable set search_path = '' as $$
  select case
    when amount_minor < b.t1 then 1
    when amount_minor < b.t2 then 2
    when amount_minor < b.t3 then 3
    else 4 end::smallint
  from public.price_bands b where b.currency = cur
$$;

-- $–$$$$ for a Look: band of the median identified piece (same rule the app used with mock data).
create or replace function public.look_price_band(p_look uuid) returns smallint
language sql stable set search_path = '' as $$
  select public.price_band(
           percentile_cont(0.5) within group (order by p.price_minor)::bigint,
           min(p.currency))
  from public.look_pieces lp
  join public.products p on p.id = lp.product_id
  where lp.look_id = p_look
$$;

-- Alternatives in one price band: nearest by image embedding when both sides have one, else by price.
-- Lower < 85% of the reference price, Higher > 115%, Similar in between.
create or replace function public.similar_products(p_product uuid, p_band text default null, p_limit int default 24)
returns table (id uuid, brand_id uuid, name text, price_minor bigint, currency char(3), stock public.stock_state,
               image_urls text[], band text, distance double precision)
language sql stable set search_path = '' as $$
  with ref as (select * from public.products where id = p_product)
  select c.id, c.brand_id, c.name, c.price_minor, c.currency, c.stock, c.image_urls,
         case when c.price_minor < ref.price_minor * 0.85 then 'lower'
              when c.price_minor > ref.price_minor * 1.15 then 'higher'
              else 'similar' end as band,
         case when c.embedding is not null and ref.embedding is not null
              then (c.embedding operator(extensions.<=>) ref.embedding)::double precision end as distance
  from public.products c, ref
  where c.active and c.id <> ref.id and c.slot = ref.slot and c.currency = ref.currency
    and (p_band is null or p_band = case when c.price_minor < ref.price_minor * 0.85 then 'lower'
                                         when c.price_minor > ref.price_minor * 1.15 then 'higher'
                                         else 'similar' end)
  order by distance nulls last, abs(c.price_minor - ref.price_minor)
  limit least(greatest(p_limit, 1), 100)
$$;

-- ─────────────────────────────────────────── Feed (Phase 1: newest first; ranking arrives in Phase 3)
-- Security invoker: row-level security below decides what each caller can see, including blocks.
create or replace function public.get_feed(p_limit int default 20, p_before timestamptz default null,
                                           p_style text default null, p_following_only boolean default false)
returns table (id uuid, creator_id uuid, image_path text, width int, height int, style text,
               is_ai boolean, published_at timestamptz, piece_count bigint, price_band smallint)
language sql stable security invoker set search_path = '' as $$
  select l.id, l.creator_id, l.image_path, l.width, l.height, l.style, l.is_ai, l.published_at,
         (select count(*) from public.look_pieces lp where lp.look_id = l.id),
         public.look_price_band(l.id)
  from public.looks l
  where l.status = 'published'
    and (p_before is null or l.published_at < p_before)
    and (p_style is null or l.style = p_style)
    and (not p_following_only or exists (
          select 1 from public.follows f where f.follower_id = (select auth.uid()) and f.creator_id = l.creator_id))
  order by l.published_at desc, l.id desc
  limit least(greatest(p_limit, 1), 50)
$$;

-- What a Lookbook contains, for anyone allowed to see that Lookbook (saves themselves stay private).
create or replace function public.lookbook_contents(p_lookbook uuid)
returns table (look_id uuid, product_id uuid, added_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select s.look_id, s.product_id, li.added_at
  from public.lookbook_items li
  join public.lookbooks lb on lb.id = li.lookbook_id
  join public.saves s on s.id = li.save_id
  where li.lookbook_id = p_lookbook
    and (lb.owner_id = (select auth.uid()) or not lb.is_private)
  order by li.added_at desc
$$;

-- In-app account deletion (App Store requirement). Cascades remove everything the person owns.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  delete from auth.users where id = (select auth.uid());
end $$;
revoke execute on function public.delete_my_account() from public, anon;

-- ─────────────────────────────────────────── Row-level security
alter table public.markets         enable row level security;
alter table public.price_bands     enable row level security;
alter table public.profiles        enable row level security;
alter table public.retailers       enable row level security;
alter table public.brands          enable row level security;
alter table public.products        enable row level security;
alter table public.looks           enable row level security;
alter table public.look_pieces     enable row level security;
alter table public.follows         enable row level security;
alter table public.saves           enable row level security;
alter table public.lookbooks       enable row level security;
alter table public.lookbook_items  enable row level security;
alter table public.blocks          enable row level security;
alter table public.reports         enable row level security;
alter table public.outbound_clicks enable row level security;

-- Reference data and the catalogue: readable by everyone, written only by the service role (pipeline).
create policy "markets are public"     on public.markets     for select to anon, authenticated using (true);
create policy "price bands are public" on public.price_bands for select to anon, authenticated using (true);
create policy "retailers are public"   on public.retailers   for select to anon, authenticated using (active);
create policy "brands are public"      on public.brands      for select to anon, authenticated using (true);
create policy "active products are public" on public.products for select to anon, authenticated using (active);

-- Profiles: public; people edit only their own, and only the columns they own.
create policy "profiles are public" on public.profiles for select to anon, authenticated using (true);
create policy "edit own profile" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke update on public.profiles from anon, authenticated;
grant update (handle, display_name, bio, avatar_path, market_code, locale, taste_styles, budget_band)
  on public.profiles to authenticated;   -- is_creator is granted by the team, not self-assigned

-- Looks: published and not from someone you blocked; creators always see their own.
create policy "see published looks" on public.looks for select to anon, authenticated using (
  (status = 'published' and not exists (
     select 1 from public.blocks b
     where b.blocker_id = (select auth.uid()) and b.blocked_id = looks.creator_id))
  or creator_id = (select auth.uid()));
create policy "post own looks"   on public.looks for insert to authenticated with check (creator_id = (select auth.uid()));
create policy "edit own looks"   on public.looks for update to authenticated
  using (creator_id = (select auth.uid())) with check (creator_id = (select auth.uid()));
create policy "delete own looks" on public.looks for delete to authenticated using (creator_id = (select auth.uid()));

-- Pieces follow their Look.
create policy "see pieces of visible looks" on public.look_pieces for select to anon, authenticated
  using (exists (select 1 from public.looks l where l.id = look_id));
create policy "tag own looks" on public.look_pieces for all to authenticated
  using (exists (select 1 from public.looks l where l.id = look_id and l.creator_id = (select auth.uid())))
  with check (exists (select 1 from public.looks l where l.id = look_id and l.creator_id = (select auth.uid())));

-- Follows: public graph, you control your own edges.
create policy "follows are public" on public.follows for select to anon, authenticated using (true);
create policy "follow as yourself"   on public.follows for insert to authenticated with check (follower_id = (select auth.uid()));
create policy "unfollow as yourself" on public.follows for delete to authenticated using (follower_id = (select auth.uid()));

-- Saves: private to their owner; you can only save Looks you're allowed to see.
create policy "own saves" on public.saves for select to authenticated using (user_id = (select auth.uid()));
create policy "save visible things" on public.saves for insert to authenticated with check (
  user_id = (select auth.uid())
  and (look_id is null or exists (select 1 from public.looks l where l.id = look_id)));
create policy "remove own saves" on public.saves for delete to authenticated using (user_id = (select auth.uid()));

-- Lookbooks: owner has full control; public ones are readable by everyone.
create policy "see own or public lookbooks" on public.lookbooks for select to anon, authenticated
  using (owner_id = (select auth.uid()) or not is_private);
create policy "create own lookbooks" on public.lookbooks for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "edit own lookbooks"   on public.lookbooks for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "delete own lookbooks" on public.lookbooks for delete to authenticated using (owner_id = (select auth.uid()));

-- Filing: only your own saves, only into your own Lookbooks.
create policy "see own lookbook items" on public.lookbook_items for select to authenticated
  using (exists (select 1 from public.lookbooks lb where lb.id = lookbook_id and lb.owner_id = (select auth.uid())));
create policy "file own saves" on public.lookbook_items for insert to authenticated with check (
  exists (select 1 from public.lookbooks lb where lb.id = lookbook_id and lb.owner_id = (select auth.uid()))
  and exists (select 1 from public.saves s where s.id = save_id and s.user_id = (select auth.uid())));
create policy "unfile own saves" on public.lookbook_items for delete to authenticated
  using (exists (select 1 from public.lookbooks lb where lb.id = lookbook_id and lb.owner_id = (select auth.uid())));

-- Safety tools.
create policy "own blocks" on public.blocks for all to authenticated
  using (blocker_id = (select auth.uid())) with check (blocker_id = (select auth.uid()));
create policy "file reports" on public.reports for insert to authenticated with check (reporter_id = (select auth.uid()));
create policy "see own reports" on public.reports for select to authenticated using (reporter_id = (select auth.uid()));

-- Outbound clicks: write-only, anonymous allowed; never readable from the app.
create policy "log clicks" on public.outbound_clicks for insert to anon, authenticated
  with check (user_id is null or user_id = (select auth.uid()));
