-- ============================================================================
-- Phase 3 — swipe + match + safety assertion harness (rolled back).
-- Verifies: report_and_block is atomic (block + unmatch + report + audit);
-- immediate-risk reasons escalate to 'immediate' and appear in the triage view;
-- the per-reporter cap rejects over-limit report_and_block ATOMICALLY (no block);
-- standalone block_user works; self-report is rejected; the swipe ceiling
-- trigger is installed.
--
-- Runs as the session role and acts as different users by setting the
-- request.jwt.claims GUC (auth.uid()), since the safety RPCs are SECURITY
-- DEFINER and key off auth.uid() — this lets the assertions read freely.
-- ============================================================================

begin;

-- A=...01  B=...02  C=...03  D=...04
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at) values
  ('0a000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','p3a@test.dev','{"date_of_birth":"1990-01-01","display_name":"Al"}', now(), now()),
  ('0a000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','p3b@test.dev','{"date_of_birth":"1988-02-02","display_name":"Bo"}', now(), now()),
  ('0a000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','p3c@test.dev','{"date_of_birth":"1991-03-03","display_name":"Cy"}', now(), now()),
  ('0a000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','p3d@test.dev','{"date_of_birth":"1987-04-04","display_name":"Di"}', now(), now());

-- Mutual like A<->B creates a match (handle_swipe).
insert into public.swipes (swiper_id, target_id, direction) values
  ('0a000000-0000-0000-0000-000000000002','0a000000-0000-0000-0000-000000000001','like'),
  ('0a000000-0000-0000-0000-000000000001','0a000000-0000-0000-0000-000000000002','like');

do $$
begin
  if not exists (select 1 from public.matches
    where user_a='0a000000-0000-0000-0000-000000000001' and user_b='0a000000-0000-0000-0000-000000000002') then
    raise exception 'setup: A-B match was not created';
  end if;
end $$;

-- Ceiling setup: 15 reports by reporter D (the cap is 15/24h).
insert into public.reports (reporter_id, reported_profile_id, target_type, target_id, reason)
  select '0a000000-0000-0000-0000-000000000004', '0a000000-0000-0000-0000-000000000001', 'profile',
         '0a000000-0000-0000-0000-000000000001', 'spam'
  from generate_series(1, 15);

-- ---- TEST 1: report_and_block is atomic (as A on B) ------------------------
select set_config('request.jwt.claims', '{"sub":"0a000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select public.report_and_block('0a000000-0000-0000-0000-000000000002', 'harassment', 'test');

do $$
begin
  if not exists (select 1 from public.blocks
    where blocker_id='0a000000-0000-0000-0000-000000000001' and blocked_id='0a000000-0000-0000-0000-000000000002') then
    raise exception 'FAIL[atomic]: no block created';
  end if;
  if exists (select 1 from public.matches
    where user_a='0a000000-0000-0000-0000-000000000001' and user_b='0a000000-0000-0000-0000-000000000002') then
    raise exception 'FAIL[atomic]: match not removed';
  end if;
  if not exists (select 1 from public.reports
    where reporter_id='0a000000-0000-0000-0000-000000000001'
      and reported_profile_id='0a000000-0000-0000-0000-000000000002' and reason='harassment') then
    raise exception 'FAIL[atomic]: report not filed';
  end if;
  if not exists (select 1 from public.audit_log
    where action='report.created' and actor_id='0a000000-0000-0000-0000-000000000001') then
    raise exception 'FAIL[atomic]: no audit row';
  end if;
  raise notice 'PASS[atomic]: report_and_block blocked + unmatched + filed report + wrote audit';
end $$;

-- ---- TEST 2: immediate-risk escalation + triage view (as A on C) -----------
select public.report_and_block('0a000000-0000-0000-0000-000000000003', 'child_safety', null);

do $$
begin
  if not exists (select 1 from public.reports
    where reporter_id='0a000000-0000-0000-0000-000000000001'
      and reported_profile_id='0a000000-0000-0000-0000-000000000003'
      and reason='child_safety' and severity='immediate') then
    raise exception 'FAIL[escalate]: child_safety report not escalated to immediate';
  end if;
  if not exists (select 1 from public.immediate_risk_reports
    where reported_profile_id='0a000000-0000-0000-0000-000000000003') then
    raise exception 'FAIL[escalate]: not visible in immediate_risk_reports view';
  end if;
  raise notice 'PASS[escalate]: child_safety -> immediate and surfaced in the triage view';
end $$;

-- ---- TEST 3: report cap rejects over-limit report_and_block ATOMICALLY -----
select set_config('request.jwt.claims', '{"sub":"0a000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
do $$
declare v_threw boolean := false;
begin
  begin
    perform public.report_and_block('0a000000-0000-0000-0000-000000000001', 'spam', null);
  exception when others then v_threw := true;
  end;
  if not v_threw then raise exception 'FAIL[report-cap]: 16th report was not rejected'; end if;
  if exists (select 1 from public.blocks
    where blocker_id='0a000000-0000-0000-0000-000000000004' and blocked_id='0a000000-0000-0000-0000-000000000001') then
    raise exception 'FAIL[report-cap]: block persisted despite cap (NOT atomic)';
  end if;
  raise notice 'PASS[report-cap]: over-cap report_and_block rejected, no block left behind';
end $$;

-- ---- TEST 4: standalone block_user (as B on C) -----------------------------
select set_config('request.jwt.claims', '{"sub":"0a000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select public.block_user('0a000000-0000-0000-0000-000000000003');
do $$
begin
  if not exists (select 1 from public.blocks
    where blocker_id='0a000000-0000-0000-0000-000000000002' and blocked_id='0a000000-0000-0000-0000-000000000003') then
    raise exception 'FAIL[block]: standalone block_user did not create a block';
  end if;
  raise notice 'PASS[block]: standalone block_user works (no report needed)';
end $$;

-- ---- TEST 5: self-report rejected (as A) -----------------------------------
select set_config('request.jwt.claims', '{"sub":"0a000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
do $$
declare v_threw boolean := false;
begin
  begin
    perform public.report_and_block('0a000000-0000-0000-0000-000000000001', 'spam', null);
  exception when others then v_threw := true;
  end;
  if not v_threw then raise exception 'FAIL[self]: self-report was allowed'; end if;
  raise notice 'PASS[self]: cannot report yourself';
end $$;

-- ---- TEST 6: swipe ceiling trigger installed -------------------------------
do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'swipes_enforce_ceiling' and not tgisinternal) then
    raise exception 'FAIL[swipe-ceiling]: enforce_swipe_ceiling trigger not installed';
  end if;
  raise notice 'PASS[swipe-ceiling]: swipe abuse-ceiling trigger installed (threshold 200/24h)';
end $$;

select 'PHASE 3 SAFETY ASSERTIONS PASSED' as result;

rollback;
