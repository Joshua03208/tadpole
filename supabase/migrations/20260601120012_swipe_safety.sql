-- ============================================================================
-- 0012 — Phase 3 swipe + match + launch-blocking safety.
--   * report_and_block(): atomic report + block + unmatch (one transaction).
--   * block_user(): standalone block + remove any match.
--   * abuse ceilings (NOT the freemium limit): swipes 200/24h, reports 15/24h,
--     enforced server-side via BEFORE-INSERT (un-bypassable).
--   * immediate-risk reasons (child_safety / self_harm / threats) auto-escalate
--     to severity 'immediate' so serious reports are never invisible, with a
--     partial index + a security_invoker view for trivial interim triage.
-- ============================================================================

-- ---- reasons: add 'threats' -------------------------------------------------
alter table public.reports drop constraint reports_reason;
alter table public.reports add constraint reports_reason check (reason in (
  'harassment','hate','sexual_solicitation','spam','scam','impersonation',
  'self_harm','child_safety','threats','other'
));

-- ---- reports_on_insert: per-reporter daily cap + immediate-risk escalation --
-- (the reports_before_insert trigger from 0006 already calls this function.)
create or replace function public.reports_on_insert()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_recent int;
begin
  -- Abuse ceiling: at most 15 reports per reporter per 24h (mass-reporting is a
  -- harassment vector because a report auto-blocks). Over the cap, the report
  -- (and, via report_and_block, the coupled block) is rejected atomically.
  if new.reporter_id is not null then
    select count(*) into v_recent
    from public.reports
    where reporter_id = new.reporter_id
      and created_at > now() - interval '24 hours';
    if v_recent >= 15 then
      raise exception 'report limit reached (too many reports in 24 hours)'
        using errcode = 'P0001';
    end if;
  end if;

  -- Immediate-risk reasons are escalated so they surface promptly for triage.
  if new.reason in ('child_safety', 'self_harm', 'threats') then
    new.severity := 'immediate';
  end if;

  insert into public.audit_log (actor_id, action, target_table, target_id, detail)
  values (new.reporter_id, 'report.created', 'reports', new.id,
    jsonb_build_object('reason', new.reason, 'severity', new.severity,
                       'target_type', new.target_type,
                       'reported_profile_id', new.reported_profile_id));
  return new;
end;
$$;
revoke execute on function public.reports_on_insert() from public, anon, authenticated;

-- ---- immediate-risk triage surface -----------------------------------------
-- Fast filter of open immediate-risk reports.
create index reports_immediate_open_idx on public.reports (created_at)
  where severity = 'immediate' and status = 'open';

-- Convenience view for interim triage (SQL editor / service-role until the
-- Phase 10 dashboard). security_invoker => respects reports RLS, so via the API
-- only moderators/admins see rows.
create view public.immediate_risk_reports
  with (security_invoker = true) as
  select id, created_at, reason, severity, status, reported_profile_id, reporter_id, target_type, detail
  from public.reports
  where severity = 'immediate' and status = 'open'
  order by created_at desc;
revoke all on public.immediate_risk_reports from anon;
grant select on public.immediate_risk_reports to authenticated;

-- ---- swipe abuse ceiling (BEFORE INSERT) -----------------------------------
create function public.enforce_swipe_ceiling()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_recent int;
begin
  select count(*) into v_recent
  from public.swipes
  where swiper_id = new.swiper_id
    and created_at > now() - interval '24 hours';
  if v_recent >= 200 then
    raise exception 'swipe limit reached (too many swipes in 24 hours)'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke execute on function public.enforce_swipe_ceiling() from public, anon, authenticated;

create trigger swipes_enforce_ceiling
  before insert on public.swipes
  for each row execute function public.enforce_swipe_ceiling();

-- Indexes supporting the trailing-window ceiling counts.
create index swipes_swiper_created_idx   on public.swipes  (swiper_id, created_at);
create index reports_reporter_created_idx on public.reports (reporter_id, created_at);

-- ---- block_user: block + remove any match (atomic, standalone) -------------
create function public.block_user(p_other uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if p_other = v_uid then raise exception 'cannot block yourself' using errcode = '22023'; end if;

  insert into public.blocks (blocker_id, blocked_id)
  values (v_uid, p_other)
  on conflict (blocker_id, blocked_id) do nothing;

  delete from public.matches
  where user_a = least(v_uid, p_other) and user_b = greatest(v_uid, p_other);
end;
$$;
revoke execute on function public.block_user(uuid) from public;
grant  execute on function public.block_user(uuid) to authenticated;

-- ---- report_and_block: report + block + unmatch in ONE transaction ---------
create function public.report_and_block(
  p_reported uuid,
  p_reason   text,
  p_detail   text default null
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_report_id uuid;
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;
  if p_reported = v_uid then raise exception 'cannot report yourself' using errcode = '22023'; end if;

  insert into public.blocks (blocker_id, blocked_id)
  values (v_uid, p_reported)
  on conflict (blocker_id, blocked_id) do nothing;

  delete from public.matches
  where user_a = least(v_uid, p_reported) and user_b = greatest(v_uid, p_reported);

  -- reports_on_insert enforces the reporter cap + escalates immediate-risk +
  -- writes the audit row; an over-cap report rolls back the block too.
  insert into public.reports (reporter_id, reported_profile_id, target_type, target_id, reason, detail)
  values (v_uid, p_reported, 'profile', p_reported, p_reason, p_detail)
  returning id into v_report_id;

  return v_report_id;
end;
$$;
revoke execute on function public.report_and_block(uuid, text, text) from public;
grant  execute on function public.report_and_block(uuid, text, text) to authenticated;
