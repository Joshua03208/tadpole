-- ============================================================================
-- 0014 — Phase 3 security-advisor follow-ups.
--   * anon must not execute the new safety RPCs. (Supabase default-grants
--     EXECUTE to anon directly, so the revoke-from-public in 0012 left it.)
--   * Drop the broad public SELECT policy on the avatars bucket: public-bucket
--     object URLs still resolve without it, but clients can no longer LIST /
--     enumerate every avatar path (paths embed user ids). Owner folder-scoped
--     insert/update/delete policies remain.
-- ============================================================================

revoke execute on function public.block_user(uuid) from anon;
revoke execute on function public.report_and_block(uuid, text, text) from anon;

drop policy "avatars_read_public" on storage.objects;
