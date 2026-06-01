-- ============================================================================
-- 0007 — account deletion model: soft-delete + anonymise.
-- "Delete my account" does NOT hard-delete the user (which would cascade away
-- swipes/matches/blocks/reports — the very safety evidence we must keep). It
-- soft-deletes + anonymises the public profile and drops precise location,
-- while preserving the separable safety/abuse records. A later, retention-bound
-- hard purge handles full GDPR erasure.
-- ============================================================================

create function public.request_account_deletion()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  update public.profiles
     set deleted_at   = now(),
         display_name = 'deleted dad',
         bio          = null,
         avatar_url   = null,
         interests    = '{}',
         area_id      = null
   where id = v_uid
     and deleted_at is null;

  -- Precise location is removed immediately (privacy).
  delete from public.profile_locations where id = v_uid;

  insert into public.audit_log (actor_id, action, target_table, target_id, detail)
  values (v_uid, 'account.soft_delete', 'profiles', v_uid, '{}'::jsonb);
end;
$$;
revoke execute on function public.request_account_deletion() from public;
grant  execute on function public.request_account_deletion() to authenticated;
