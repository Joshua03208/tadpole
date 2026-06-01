-- ============================================================================
-- Phase 1 — RLS / security assertion harness.
--
-- Encodes every Phase 1 verification point. Runs inside ONE transaction that is
-- ROLLED BACK at the end, so it leaves the database untouched. Any failed
-- assertion RAISEs (aborting with a descriptive message); if it reaches the end,
-- every check passed and it returns a single 'PHASE 1: ALL ASSERTIONS PASSED' row.
--
-- Run it two ways:
--   * locally / CI:  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/phase1_assertions.sql
--   * via MCP:       execute_sql with the file contents
--
-- Structure note: it does all superuser setup + the 18+ gate tests FIRST (as the
-- session/postgres role), then switches to `authenticated` for the RLS tests and
-- never switches back (a non-superuser cannot escalate to postgres mid-txn).
--
-- STATUS: authored against the migrations in supabase/migrations; pending first
-- execution. The auth.users insert column set is the most likely thing to need a
-- small tweak on the very first run against a real Supabase project.
-- ============================================================================

begin;

-- Fixed test identities -------------------------------------------------------
-- A=1111  B=2222  C=3333  MOD=4444  ADMIN=5555  U18=6666  NODOB=7777
-- areas:  area1=a1a1…  area2=a2a2…

-- ---- SETUP (as the session/postgres role) ----------------------------------
insert into public.areas (id, slug, name, region) values
  ('a1a1a1a1-0000-0000-0000-000000000001', 'kentish-town', 'Kentish Town', 'London'),
  ('a2a2a2a2-0000-0000-0000-000000000002', 'rhyl',         'Rhyl',         'Wales');

-- Adult test users. The on_auth_user_created trigger creates profiles +
-- profile_private from raw_user_meta_data (valid DOB => passes the 18+ gate).
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('11111111-1111-1111-1111-111111111111','00000000-0000-0000-0000-000000000000','authenticated','authenticated','a@test.dev','{"date_of_birth":"1990-01-01","display_name":"Al"}', now(), now()),
  ('22222222-2222-2222-2222-222222222222','00000000-0000-0000-0000-000000000000','authenticated','authenticated','b@test.dev','{"date_of_birth":"1988-05-05","display_name":"Bo"}', now(), now()),
  ('33333333-3333-3333-3333-333333333333','00000000-0000-0000-0000-000000000000','authenticated','authenticated','c@test.dev','{"date_of_birth":"1992-09-09","display_name":"Cy"}', now(), now()),
  ('44444444-4444-4444-4444-444444444444','00000000-0000-0000-0000-000000000000','authenticated','authenticated','m@test.dev','{"date_of_birth":"1985-01-01","display_name":"Mo"}', now(), now()),
  ('55555555-5555-5555-5555-555555555555','00000000-0000-0000-0000-000000000000','authenticated','authenticated','admin@test.dev','{"date_of_birth":"1980-01-01","display_name":"Ad"}', now(), now());

-- Same area + stage so they surface in each other's deck.
update public.profiles
   set area_id = 'a1a1a1a1-0000-0000-0000-000000000001', parenting_stage = 'toddler'
 where id in ('11111111-1111-1111-1111-111111111111',
              '22222222-2222-2222-2222-222222222222',
              '33333333-3333-3333-3333-333333333333');

-- Seed moderator + admin roles (the guard trigger blocks role changes for
-- non-admins, so disable it just for this privileged seed — the production
-- first-admin is seeded the same way via a service-role migration).
alter table public.profiles disable trigger profiles_guard_privileged;
update public.profiles set role = 'moderator' where id = '44444444-4444-4444-4444-444444444444';
update public.profiles set role = 'admin'     where id = '55555555-5555-5555-5555-555555555555';
alter table public.profiles enable trigger profiles_guard_privileged;

-- B opts into precise location (used to prove it never leaks).
insert into public.profile_locations (id, lat, lng)
values ('22222222-2222-2222-2222-222222222222', 51.5500, -0.1400);

-- ---- 18+ GATE (as postgres; auth.users insert is superuser-only) -----------
do $$
declare v_threw boolean := false;
begin
  begin
    insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
    values ('66666666-6666-6666-6666-666666666666','00000000-0000-0000-0000-000000000000','authenticated','authenticated','u18@test.dev','{"date_of_birth":"2015-01-01","display_name":"Kid"}', now(), now());
  exception when others then v_threw := true;
  end;
  if not v_threw then raise exception 'FAIL[18+]: under-18 signup did NOT roll back'; end if;
  if exists (select 1 from auth.users        where id = '66666666-6666-6666-6666-666666666666') then raise exception 'FAIL[18+]: auth.users row persisted for under-18'; end if;
  if exists (select 1 from public.profiles        where id = '66666666-6666-6666-6666-666666666666') then raise exception 'FAIL[18+]: profile persisted for under-18'; end if;
  if exists (select 1 from public.profile_private where id = '66666666-6666-6666-6666-666666666666') then raise exception 'FAIL[18+]: DOB row persisted for under-18'; end if;
  raise notice 'PASS[18+]: under-18 signup left no auth user / profile / DOB row';
end $$;

do $$
declare v_threw boolean := false;
begin
  begin
    insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
    values ('77777777-7777-7777-7777-777777777777','00000000-0000-0000-0000-000000000000','authenticated','authenticated','nodob@test.dev','{"display_name":"NoDob"}', now(), now());
  exception when others then v_threw := true;
  end;
  if not v_threw then raise exception 'FAIL[18+]: missing-DOB signup did NOT roll back'; end if;
  if exists (select 1 from auth.users where id = '77777777-7777-7777-7777-777777777777') then raise exception 'FAIL[18+]: auth.users row persisted for missing-DOB'; end if;
  raise notice 'PASS[18+]: missing-DOB signup rejected, no rows persisted';
end $$;

-- ---- deck masking is structural (catalog check; role-independent) ----------
do $$
declare v_res text;
begin
  select pg_get_function_result(p.oid) into v_res
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'get_swipe_deck';
  if v_res ilike '%lat%' or v_res ilike '%lng%' then
    raise exception 'FAIL[deck-mask]: get_swipe_deck result exposes coordinates: %', v_res;
  end if;
  raise notice 'PASS[deck-mask]: get_swipe_deck returns no lat/lng column (%).', v_res;
end $$;

-- ============================================================================
-- Switch to the authenticated role for the RLS tests (no going back).
-- ============================================================================
set local role authenticated;

-- helper: act as A
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

-- B likes A first (sets up the reciprocal). Act as B for this insert.
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
insert into public.swipes (swiper_id, target_id, direction)
values ('22222222-2222-2222-2222-222222222222','11111111-1111-1111-1111-111111111111','like');

-- A likes B -> handle_swipe trigger must create exactly ONE match.
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
insert into public.swipes (swiper_id, target_id, direction)
values ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','like');

do $$
declare v_cnt int;
begin
  -- as A, matches_select_participants exposes the A-B match.
  select count(*) into v_cnt from public.matches
   where user_a = least('11111111-1111-1111-1111-111111111111'::uuid,'22222222-2222-2222-2222-222222222222'::uuid)
     and user_b = greatest('11111111-1111-1111-1111-111111111111'::uuid,'22222222-2222-2222-2222-222222222222'::uuid);
  if v_cnt <> 1 then raise exception 'FAIL[match]: expected exactly 1 trigger-created match, got %', v_cnt; end if;
  raise notice 'PASS[match]: mutual like created exactly one match via the trigger';
end $$;

-- A must NOT be able to read B's swipes (own-swipes-only).
do $$
declare v_cnt int;
begin
  select count(*) into v_cnt from public.swipes where swiper_id = '22222222-2222-2222-2222-222222222222';
  if v_cnt <> 0 then raise exception 'FAIL[swipe-privacy]: A can read % of B''s swipes', v_cnt; end if;
  raise notice 'PASS[swipe-privacy]: A cannot see B''s swipes';
end $$;

-- Client-forged match insert must be DENIED.
do $$
declare v_threw boolean := false;
begin
  begin
    insert into public.matches (user_a, user_b)
    values (least('11111111-1111-1111-1111-111111111111'::uuid,'33333333-3333-3333-3333-333333333333'::uuid),
            greatest('11111111-1111-1111-1111-111111111111'::uuid,'33333333-3333-3333-3333-333333333333'::uuid));
  exception when others then v_threw := true;
  end;
  if not v_threw then raise exception 'FAIL[forge]: client INSERT into matches was allowed'; end if;
  raise notice 'PASS[forge]: client-forged match insert denied';
end $$;

-- Role self-escalation blocked; ordinary edits still work.
do $$
declare v_threw boolean := false; v_role public.user_role; v_name text;
begin
  begin
    update public.profiles set role = 'admin' where id = '11111111-1111-1111-1111-111111111111';
  exception when others then v_threw := true;
  end;
  if not v_threw then raise exception 'FAIL[escalate]: self role escalation was allowed'; end if;
  select role into v_role from public.profiles where id = '11111111-1111-1111-1111-111111111111';
  if v_role <> 'user' then raise exception 'FAIL[escalate]: role changed to %', v_role; end if;

  update public.profiles set display_name = 'Alan' where id = '11111111-1111-1111-1111-111111111111';
  select display_name into v_name from public.profiles where id = '11111111-1111-1111-1111-111111111111';
  if v_name <> 'Alan' then raise exception 'FAIL[escalate]: normal edit did not apply (got %)', v_name; end if;
  raise notice 'PASS[escalate]: role self-escalation blocked; normal edit works';
end $$;

-- Cross-user precise-location read = 0 rows.
do $$
declare v_cnt int;
begin
  select count(*) into v_cnt from public.profile_locations where id = '22222222-2222-2222-2222-222222222222';
  if v_cnt <> 0 then raise exception 'FAIL[location]: A read B''s precise location (% rows)', v_cnt; end if;
  raise notice 'PASS[location]: A cannot read B''s precise location';
end $$;

-- Block hides profiles BOTH ways. A blocks C.
insert into public.blocks (blocker_id, blocked_id)
values ('11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333');

do $$
declare v_cnt int;
begin
  -- still acting as A: A cannot see C
  select count(*) into v_cnt from public.profiles where id = '33333333-3333-3333-3333-333333333333';
  if v_cnt <> 0 then raise exception 'FAIL[block]: blocker A can still see C'; end if;
  raise notice 'PASS[block]: A (blocker) no longer sees C';
end $$;

select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
do $$
declare v_cnt int;
begin
  -- acting as C: C cannot see A either
  select count(*) into v_cnt from public.profiles where id = '11111111-1111-1111-1111-111111111111';
  if v_cnt <> 0 then raise exception 'FAIL[block]: blocked C can still see A'; end if;
  raise notice 'PASS[block]: C (blocked) no longer sees A — hidden both ways';
end $$;

-- Unmatch removes the match (act as A).
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
select public.unmatch('22222222-2222-2222-2222-222222222222', false);
do $$
declare v_cnt int;
begin
  select count(*) into v_cnt from public.matches
   where user_a = least('11111111-1111-1111-1111-111111111111'::uuid,'22222222-2222-2222-2222-222222222222'::uuid)
     and user_b = greatest('11111111-1111-1111-1111-111111111111'::uuid,'22222222-2222-2222-2222-222222222222'::uuid);
  if v_cnt <> 0 then raise exception 'FAIL[unmatch]: match still present after unmatch (% rows)', v_cnt; end if;
  raise notice 'PASS[unmatch]: unmatch removed the match';
end $$;

-- Reports readable only by reporter + moderators. A reports B.
insert into public.reports (reporter_id, reported_profile_id, target_type, target_id, reason, detail)
values ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','profile','22222222-2222-2222-2222-222222222222','harassment','test');

do $$
declare v_cnt int;
begin
  -- reporter A sees their own report
  select count(*) into v_cnt from public.reports where reporter_id = '11111111-1111-1111-1111-111111111111';
  if v_cnt < 1 then raise exception 'FAIL[report]: reporter cannot see own report'; end if;
  raise notice 'PASS[report]: reporter sees own report';
end $$;

select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', true);
do $$
declare v_cnt int;
begin
  -- moderator sees the report
  select count(*) into v_cnt from public.reports where reported_profile_id = '22222222-2222-2222-2222-222222222222';
  if v_cnt < 1 then raise exception 'FAIL[report]: moderator cannot see report'; end if;
  raise notice 'PASS[report]: moderator sees the report';
end $$;

select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
do $$
declare v_cnt int;
begin
  -- unrelated, non-moderator C sees nothing
  select count(*) into v_cnt from public.reports;
  if v_cnt <> 0 then raise exception 'FAIL[report]: unrelated user can read % reports', v_cnt; end if;
  raise notice 'PASS[report]: unrelated user sees no reports';
end $$;

-- All assertions passed.
reset role;
select 'PHASE 1: ALL ASSERTIONS PASSED' as result;

rollback;
