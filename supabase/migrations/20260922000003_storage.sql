-- Image storage. Files live under <bucket>/<user id>/..., so ownership is the first folder.
insert into storage.buckets (id, name, public) values
  ('looks', 'looks', true),
  ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "upload into own folder" on storage.objects for insert to authenticated
  with check (bucket_id in ('looks', 'avatars') and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "replace own files" on storage.objects for update to authenticated
  using (bucket_id in ('looks', 'avatars') and owner = (select auth.uid()))
  with check ((storage.foldername(name))[1] = (select auth.uid())::text);
create policy "delete own files" on storage.objects for delete to authenticated
  using (bucket_id in ('looks', 'avatars') and owner = (select auth.uid()));
