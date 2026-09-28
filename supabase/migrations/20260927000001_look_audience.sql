-- Who a Look is for, chosen when it is posted: everyone, the creator's followers, or only the creator.
-- The database enforces it. The app shows the choice; these rules decide what each caller can read,
-- down to the photo file itself.

create type public.look_audience as enum ('everyone', 'followers', 'only_me');

alter table public.looks add column audience public.look_audience not null default 'everyone';

-- One definition of "may this caller see this Look", shared by the table's rule, the photo files and
-- the Lookbook contents. Creators always see their own; everyone else needs a published Look from
-- someone they have not blocked, whose audience includes them.
create or replace function public.can_view_look(p_creator uuid, p_status public.look_status, p_audience public.look_audience)
returns boolean
language sql stable security invoker set search_path = '' as $$
  select p_creator = (select auth.uid())
      or (p_status = 'published'
          and not exists (select 1 from public.blocks b
                          where b.blocker_id = (select auth.uid()) and b.blocked_id = p_creator)
          and (p_audience = 'everyone'
               or (p_audience = 'followers'
                   and exists (select 1 from public.follows f
                               where f.follower_id = (select auth.uid()) and f.creator_id = p_creator))))
$$;

drop policy "see published looks" on public.looks;
create policy "see looks meant for you" on public.looks for select to anon, authenticated
  using (public.can_view_look(creator_id, status, audience));

-- The feed never carries an Only me Look, not even the creator's own: it lives on their profile.
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
    and l.audience <> 'only_me'
    and (p_before is null or l.published_at < p_before)
    and (p_style is null or l.style = p_style)
    and (not p_following_only or exists (
          select 1 from public.follows f where f.follower_id = (select auth.uid()) and f.creator_id = l.creator_id))
  order by l.published_at desc, l.id desc
  limit least(greatest(p_limit, 1), 50)
$$;

-- A public Lookbook lists only the Looks its viewer may see; a Look saved before it went private drops out.
create or replace function public.lookbook_contents(p_lookbook uuid)
returns table (look_id uuid, product_id uuid, added_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select s.look_id, s.product_id, li.added_at
  from public.lookbook_items li
  join public.lookbooks lb on lb.id = li.lookbook_id
  join public.saves s on s.id = li.save_id
  left join public.looks l on l.id = s.look_id
  where li.lookbook_id = p_lookbook
    and (lb.owner_id = (select auth.uid()) or not lb.is_private)
    and (s.look_id is null or public.can_view_look(l.creator_id, l.status, l.audience))
  order by li.added_at desc
$$;

-- Look photos follow their Look. A public bucket would serve a Followers or Only me photo to anyone
-- holding its address, so the bucket is private and each file is readable only by those who may see the
-- Look it belongs to, plus its owner (who needs it before the Look is saved). The app reads them
-- through signed URLs. Avatars stay public.
update storage.buckets set public = false where id = 'looks';

create policy "see photos of looks meant for you" on storage.objects for select to anon, authenticated
  using (bucket_id = 'looks'
         and ((storage.foldername(name))[1] = (select auth.uid())::text
              or exists (select 1 from public.looks l where l.image_path = name)));
create policy "avatars are public" on storage.objects for select to anon, authenticated
  using (bucket_id = 'avatars');
