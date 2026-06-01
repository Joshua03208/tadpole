-- ============================================================================
-- 0009 — avatars Storage bucket (Phase 2).
-- Public-read (avatars are shown to other dads in the deck/profile) but
-- writes are owner + folder-scoped: an object's first path segment must equal
-- the uploader's auth.uid(), so a user can only write under `avatars/<their id>/...`.
-- Size + MIME limits enforced at the bucket. EXIF-GPS is stripped client-side
-- (re-encode on upload) before the file ever reaches Storage.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Public read of avatar objects.
create policy "avatars_read_public"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Owner + folder-scoped writes (folder = uploader's user id).
create policy "avatars_insert_own_folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "avatars_update_own_folder"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "avatars_delete_own_folder"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
