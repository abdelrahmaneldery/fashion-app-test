-- Where Visit site goes. A creator attaches a link to a Look when posting it (their blog post, their
-- shop), and can keep a website on their profile. Both are optional, and both must be a real web
-- address: nothing else can be opened from a Look.

create or replace function public.is_web_address(p_url text)
returns boolean
language sql immutable set search_path = '' as $$
  select p_url ~ '^https?://[^\s/?#]+\.[^\s/?#]+([/?#]\S*)?$' and char_length(p_url) <= 2048
$$;

alter table public.looks
  add column link text check (link is null or public.is_web_address(link));

alter table public.profiles
  add column website text check (website is null or public.is_web_address(website));

-- Profiles are edited column by column; a website is the person's own to set.
grant update (website) on public.profiles to authenticated;
