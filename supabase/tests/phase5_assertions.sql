-- ============================================================================
-- Phase 5 — messaging assertion harness (rolled back).
-- Must-pass checks:
--   1. non-participant CANNOT read messages (RLS) and CANNOT insert.
--   2. the messages SELECT RLS is the realtime gate (table in publication; NO
--      separate realtime.messages channel policy) — non-participant SELECT=0 is
--      exactly what gates postgres_changes delivery.
--   3. NO moderator read policy on messages (exactly 2 policies, none moderator).
--   4. report_message snapshots message + ~15 context + sender atomically BEFORE
--      block+delete, and the snapshot SURVIVES the match/conversation cascade.
--   5. block (has_block_with) blocks read+write; unmatch cascades the thread away.
--   6. rate ceiling fires (>10/10s and >1000/24h rejected); 2000-char CHECK.
--
-- Acts as different users via the request.jwt.claims GUC (auth.uid()); RLS table
-- tests run under `set local role authenticated`, privileged setup/asserts as the
-- session role. now() is constant within the tx, so the time windows are exact.
-- A=..01 B=..02 (match AB); C=..03 D=..04 (match CD); C is the non-participant for AB.
-- ============================================================================

begin;

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('05000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','p5a@test.dev','{"date_of_birth":"1990-01-01","display_name":"Al"}', now(), now()),
  ('05000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','p5b@test.dev','{"date_of_birth":"1988-02-02","display_name":"Bo"}', now(), now()),
  ('05000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','p5c@test.dev','{"date_of_birth":"1991-03-03","display_name":"Cy"}', now(), now()),
  ('05000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','p5d@test.dev','{"date_of_birth":"1987-04-04","display_name":"Di"}', now(), now());

-- Mutual likes create the matches (handle_swipe trigger).
insert into public.swipes (swiper_id, target_id, direction) values
  ('05000000-0000-0000-0000-000000000001','05000000-0000-0000-0000-000000000002','like'),
  ('05000000-0000-0000-0000-000000000002','05000000-0000-0000-0000-000000000001','like'),
  ('05000000-0000-0000-0000-000000000003','05000000-0000-0000-0000-000000000004','like'),
  ('05000000-0000-0000-0000-000000000004','05000000-0000-0000-0000-000000000003','like');

select set_config('test.ab', (select id::text from public.matches
  where user_a='05000000-0000-0000-0000-000000000001' and user_b='05000000-0000-0000-0000-000000000002'), false);
select set_config('test.cd', (select id::text from public.matches
  where user_a='05000000-0000-0000-0000-000000000003' and user_b='05000000-0000-0000-0000-000000000004'), false);

do $$
begin
  if current_setting('test.ab') is null or current_setting('test.cd') is null then
    raise exception 'setup: matches were not created';
  end if;
end $$;

-- 16 backdated messages in AB, alternating A(odd)/B(even), strictly increasing ts.
insert into public.messages (match_id, sender_id, body, created_at)
select current_setting('test.ab')::uuid,
       (case when g % 2 = 1 then '05000000-0000-0000-0000-000000000001'
                            else '05000000-0000-0000-0000-000000000002' end)::uuid,
       'setup ' || g,
       now() - interval '2 hours' + (g || ' minutes')::interval
from generate_series(1, 16) g;

-- The message we'll report = the latest A message in setup (g=15). Capture now,
-- before any later inserts, so context (<= its ts) is a deterministic 15.
select set_config('test.msg', (select id::text from public.messages
  where match_id = current_setting('test.ab')::uuid
    and sender_id = '05000000-0000-0000-0000-000000000001'
  order by created_at desc limit 1), false);

-- ---- TEST 1: read gate ------------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"05000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
set local role authenticated;
do $$ declare v int;
begin
  select count(*) into v from public.messages where match_id = current_setting('test.ab')::uuid;
  if v <> 0 then raise exception 'FAIL[read-gate]: non-participant C saw % messages', v; end if;
end $$;
reset role;

select set_config('request.jwt.claims', '{"sub":"05000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
do $$ declare v int;
begin
  select count(*) into v from public.messages where match_id = current_setting('test.ab')::uuid;
  if v <> 16 then raise exception 'FAIL[read-gate]: participant A saw % messages (expected 16)', v; end if;
  raise notice 'PASS[read-gate]: non-participant sees 0, participant sees 16';
end $$;
reset role;

-- ---- TEST 2: insert gate ----------------------------------------------------
select set_config('request.jwt.claims', '{"sub":"05000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
set local role authenticated;
do $$ declare v_threw boolean := false;
begin
  begin
    insert into public.messages (match_id, sender_id, body)
    values (current_setting('test.ab')::uuid, '05000000-0000-0000-0000-000000000003', 'sneaky');
  exception when others then v_threw := true; end;
  if not v_threw then raise exception 'FAIL[insert-gate]: non-participant C inserted a message'; end if;
end $$;
reset role;

select set_config('request.jwt.claims', '{"sub":"05000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
do $$
begin
  insert into public.messages (match_id, sender_id, body, created_at)
  values (current_setting('test.ab')::uuid, '05000000-0000-0000-0000-000000000001', 'hi from A', now() - interval '1 hour');
  raise notice 'PASS[insert-gate]: non-participant denied, participant insert allowed';
end $$;
reset role;

-- ---- TEST 3: realtime gate = the messages SELECT RLS (no channel policy) -----
do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname='supabase_realtime' and schemaname='public' and tablename='messages') then
    raise exception 'FAIL[realtime]: messages not added to supabase_realtime publication';
  end if;
  if exists (select 1 from pg_policies where schemaname='realtime' and tablename='messages') then
    raise exception 'FAIL[realtime]: a separate realtime.messages channel policy exists (should rely on messages SELECT RLS)';
  end if;
  raise notice 'PASS[realtime]: messages in publication; postgres_changes gated by the messages SELECT RLS (non-participant SELECT=0 => no live stream)';
end $$;

-- ---- TEST 4: NO moderator read policy; exactly the two participant policies --
do $$ declare v_count int; v_mod int;
begin
  select count(*) into v_count from pg_policies where schemaname='public' and tablename='messages';
  if v_count <> 2 then raise exception 'FAIL[two-party]: expected exactly 2 messages policies, found %', v_count; end if;
  select count(*) into v_mod from pg_policies where schemaname='public' and tablename='messages'
    and (coalesce(qual,'') ilike '%moderator%' or coalesce(with_check,'') ilike '%moderator%');
  if v_mod <> 0 then raise exception 'FAIL[two-party]: a messages policy grants moderator access'; end if;
  raise notice 'PASS[two-party]: exactly 2 participant policies, no moderator read on live messages';
end $$;

-- ---- TEST 5: block (has_block_with) gates read + write ----------------------
insert into public.blocks (blocker_id, blocked_id)
values ('05000000-0000-0000-0000-000000000001','05000000-0000-0000-0000-000000000002');
select set_config('request.jwt.claims', '{"sub":"05000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
set local role authenticated;
do $$ declare v int; v_threw boolean := false;
begin
  select count(*) into v from public.messages where match_id = current_setting('test.ab')::uuid;
  if v <> 0 then raise exception 'FAIL[block-gate]: blocked participant still read % messages', v; end if;
  begin
    insert into public.messages (match_id, sender_id, body)
    values (current_setting('test.ab')::uuid, '05000000-0000-0000-0000-000000000001', 'blocked');
  exception when others then v_threw := true; end;
  if not v_threw then raise exception 'FAIL[block-gate]: blocked participant inserted a message'; end if;
  raise notice 'PASS[block-gate]: has_block_with blocks read + write';
end $$;
reset role;
delete from public.blocks where blocker_id='05000000-0000-0000-0000-000000000001' and blocked_id='05000000-0000-0000-0000-000000000002';

-- ---- TEST 6: 2000-char CHECK ------------------------------------------------
do $$ declare v_threw boolean := false;
begin
  begin
    insert into public.messages (match_id, sender_id, body, created_at)
    values (current_setting('test.ab')::uuid, '05000000-0000-0000-0000-000000000001', repeat('x', 2001), now() - interval '1 hour');
  exception when others then v_threw := true; end;
  if not v_threw then raise exception 'FAIL[char]: 2001-char body accepted'; end if;
  insert into public.messages (match_id, sender_id, body, created_at)
  values (current_setting('test.ab')::uuid, '05000000-0000-0000-0000-000000000001', repeat('y', 2000), now() - interval '1 hour');
  raise notice 'PASS[char]: 2001 rejected, 2000 accepted';
end $$;

-- ---- TEST 7: rate ceiling — burst (>10/10s) ---------------------------------
insert into public.messages (match_id, sender_id, body, created_at)
select current_setting('test.ab')::uuid, '05000000-0000-0000-0000-000000000001', 'burst ' || g, now()
from generate_series(1, 10) g;
do $$ declare v_threw boolean := false;
begin
  begin
    insert into public.messages (match_id, sender_id, body, created_at)
    values (current_setting('test.ab')::uuid, '05000000-0000-0000-0000-000000000001', 'burst 11', now());
  exception when others then v_threw := true; end;
  if not v_threw then raise exception 'FAIL[rate-burst]: 11th message within 10s not rejected'; end if;
  raise notice 'PASS[rate-burst]: 11th message in 10s rejected';
end $$;

-- ---- TEST 7b: rate ceiling — daily (>1000/24h), sender D in CD --------------
insert into public.messages (match_id, sender_id, body, created_at)
select current_setting('test.cd')::uuid, '05000000-0000-0000-0000-000000000004', 'day ' || g, now() - interval '1 hour'
from generate_series(1, 1000) g;
do $$ declare v_threw boolean := false;
begin
  begin
    insert into public.messages (match_id, sender_id, body, created_at)
    values (current_setting('test.cd')::uuid, '05000000-0000-0000-0000-000000000004', 'day 1001', now());
  exception when others then v_threw := true; end;
  if not v_threw then raise exception 'FAIL[rate-daily]: 1001st message in 24h not rejected'; end if;
  raise notice 'PASS[rate-daily]: 1001st message in 24h rejected';
end $$;

-- ---- TEST 8: report_message — snapshot BEFORE block+delete, survives cascade -
select set_config('request.jwt.claims', '{"sub":"05000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select public.report_message(current_setting('test.msg')::uuid, 'harassment', 'abusive message');
do $$ declare v_rep public.reports; v_ctx int;
begin
  select * into v_rep from public.reports
   where target_type='message' and target_id = current_setting('test.msg')::uuid;
  if not found then raise exception 'FAIL[report]: no message report row'; end if;
  if v_rep.reporter_id <> '05000000-0000-0000-0000-000000000002'
     or v_rep.reported_profile_id <> '05000000-0000-0000-0000-000000000001' then
    raise exception 'FAIL[report]: wrong reporter/reported'; end if;
  if v_rep.snapshot is null then raise exception 'FAIL[report]: snapshot is null'; end if;
  if v_rep.snapshot->'reported_message'->>'body' is null then
    raise exception 'FAIL[report]: snapshot missing reported message body'; end if;
  if (v_rep.snapshot->'sender'->>'id') <> '05000000-0000-0000-0000-000000000001' then
    raise exception 'FAIL[report]: snapshot sender id wrong'; end if;
  v_ctx := jsonb_array_length(v_rep.snapshot->'context');
  if v_ctx <> 15 then raise exception 'FAIL[report]: expected 15 context messages, got %', v_ctx; end if;
  -- block + cascade
  if exists (select 1 from public.matches
             where user_a='05000000-0000-0000-0000-000000000001' and user_b='05000000-0000-0000-0000-000000000002') then
    raise exception 'FAIL[report]: match not deleted'; end if;
  if exists (select 1 from public.messages where match_id = current_setting('test.ab')::uuid) then
    raise exception 'FAIL[report]: live messages not cascaded away'; end if;
  if not exists (select 1 from public.blocks
                 where blocker_id='05000000-0000-0000-0000-000000000002' and blocked_id='05000000-0000-0000-0000-000000000001') then
    raise exception 'FAIL[report]: block not created'; end if;
  -- snapshot SURVIVED the cascade (re-read; bodies still present)
  if jsonb_array_length((select snapshot->'context' from public.reports where id = v_rep.id)) < 1 then
    raise exception 'FAIL[report]: snapshot did not survive deletion'; end if;
  raise notice 'PASS[report]: snapshot(% context)+block+cascade atomic; snapshot survived the delete', v_ctx;
end $$;

-- ---- TEST 9: unmatch cascades the conversation away -------------------------
select set_config('request.jwt.claims', '{"sub":"05000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
select public.unmatch('05000000-0000-0000-0000-000000000004', false);
do $$
begin
  if exists (select 1 from public.matches
             where user_a='05000000-0000-0000-0000-000000000003' and user_b='05000000-0000-0000-0000-000000000004') then
    raise exception 'FAIL[unmatch]: CD match not deleted'; end if;
  if exists (select 1 from public.messages where match_id = current_setting('test.cd')::uuid) then
    raise exception 'FAIL[unmatch]: CD messages not cascaded'; end if;
  raise notice 'PASS[unmatch]: unmatch deleted the conversation (cascade)';
end $$;

select 'PHASE 5 MESSAGING ASSERTIONS PASSED' as result;

rollback;
