-- ============================================================================
-- Phase 2 — auth + onboarding assertion harness.
-- Verifies (and rolls back): adult signup creates a profile; under-18/missing-DOB
-- signup leaves no records; onboarding persists the profile; skipping location
-- leaves NO profile_locations row; avatar writes are owner/folder-scoped.
-- Run via MCP execute_sql or psql -v ON_ERROR_STOP=1 -f.
-- ============================================================================

begin;

-- ---- SETUP (postgres) ------------------------------------------------------
insert into public.areas (id, slug, name, region)
values ('a1a1a1a1-0000-0000-0000-000000000001', 'kentish-town', 'Kentish Town', 'London');

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','p2a@test.dev','{"date_of_birth":"1990-01-01","display_name":"Al"}', now(), now()),
  ('22222222-2222-2222-2222-222222222222','00000000-0000-0000-0000-000000000000','authenticated','authenticated','p2b@test.dev','{"date_of_birth":"1988-02-02","display_name":"Bo"}', now(), now());

-- adult signup must have created the profile + the owner-only DOB row via trigger
do $$
begin
  if not exists (select 1 from public.profiles where id = '11111111-1111-1111-1111-111111111111') then
    raise exception 'FAIL[signup]: adult signup did not create a profile';
  end if;
  if not exists (select 1 from public.profile_private where id = '11111111-1111-1111-1111-111111111111') then
    raise exception 'FAIL[signup]: adult signup did not create a profile_private (DOB) row';
  end if;
  raise notice 'PASS[signup]: adult signup created profile + DOB row';
end $$;

-- under-18 + missing-DOB signups must roll back with no records
do $$
declare v_threw boolean := false;
begin
  begin
    insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
    values ('66666666-6666-6666-6666-666666666666','00000000-0000-0000-0000-000000000000','authenticated','authenticated','p2kid@test.dev','{"date_of_birth":"2015-01-01"}', now(), now());
  exception when others then v_threw := true;
  end;
  if not v_threw then raise exception 'FAIL[18+]: under-18 signup did not roll back'; end if;
  if exists (select 1 from auth.users where id = '66666666-6666-6666-6666-666666666666') then raise exception 'FAIL[18+]: auth user persisted'; end if;
  if exists (select 1 from public.profiles where id = '66666666-6666-6666-6666-666666666666') then raise exception 'FAIL[18+]: profile persisted'; end if;

  v_threw := false;
  begin
    insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
    values ('77777777-7777-7777-7777-777777777777','00000000-0000-0000-0000-000000000000','authenticated','authenticated','p2nodob@test.dev','{"display_name":"NoDob"}', now(), now());
  exception when others then v_threw := true;
  end;
  if not v_threw then raise exception 'FAIL[18+]: missing-DOB signup did not roll back'; end if;
  if exists (select 1 from auth.users where id = '77777777-7777-7777-7777-777777777777') then raise exception 'FAIL[18+]: missing-DOB auth user persisted'; end if;
  raise notice 'PASS[18+]: under-18 and missing-DOB signups left no records';
end $$;

-- ---- act as the authenticated user A ---------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

-- onboarding update (mirrors core.completeOnboarding)
update public.profiles
   set display_name = 'Alan',
       parenting_stage = 'toddler',
       area_label = 'Cardiff',
       area_slug = 'cardiff',
       bio = 'dad of one, into hill walks',
       onboarded_at = now()
 where id = '11111111-1111-1111-1111-111111111111';

do $$
declare p public.profiles;
begin
  select * into p from public.profiles where id = '11111111-1111-1111-1111-111111111111';
  if p.display_name <> 'Alan' then raise exception 'FAIL[onboarding]: display_name not persisted'; end if;
  if p.parenting_stage <> 'toddler' then raise exception 'FAIL[onboarding]: stage not persisted'; end if;
  if p.area_label <> 'Cardiff' or p.area_slug <> 'cardiff' then raise exception 'FAIL[onboarding]: area not persisted'; end if;
  if p.onboarded_at is null then raise exception 'FAIL[onboarding]: onboarded_at not set'; end if;
  raise notice 'PASS[onboarding]: onboarding persisted the profile (name/stage/area/onboarded_at)';
end $$;

-- skipping location must leave NO profile_locations row
do $$
declare v_cnt int;
begin
  select count(*) into v_cnt from public.profile_locations where id = '11111111-1111-1111-1111-111111111111';
  if v_cnt <> 0 then raise exception 'FAIL[location-skip]: a location row exists despite skipping (% rows)', v_cnt; end if;
  raise notice 'PASS[location-skip]: skipping location left no profile_locations row';
end $$;

-- avatar writes are owner/folder-scoped
do $$
declare v_threw boolean := false;
begin
  -- own folder: must succeed
  insert into storage.objects (bucket_id, name)
  values ('avatars', '11111111-1111-1111-1111-111111111111/avatar.jpg');

  -- another user's folder: must be denied by Storage RLS
  begin
    insert into storage.objects (bucket_id, name)
    values ('avatars', '22222222-2222-2222-2222-222222222222/avatar.jpg');
  exception when others then v_threw := true;
  end;
  if not v_threw then raise exception 'FAIL[avatar]: cross-folder upload was allowed'; end if;
  raise notice 'PASS[avatar]: avatar writes owner/folder-scoped (own ok, cross-folder denied)';
end $$;

reset role;
select 'PHASE 2: ALL ASSERTIONS PASSED' as result;

rollback;
