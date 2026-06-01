-- ============================================================================
-- 0006 — reports (safety). Every report lands in a queue and is readable only
-- by its reporter and by moderators/admins. A child-safety report auto-escalates
-- to 'immediate' (preserve + escalate). Every report also writes a separable
-- audit_log entry (which survives account anonymisation / sender deletion).
-- ============================================================================

create table public.reports (
  id                  uuid primary key default gen_random_uuid(),
  reporter_id         uuid references public.profiles (id) on delete set null,
  reported_profile_id uuid references public.profiles (id) on delete set null,
  target_type         text not null,
  target_id           uuid,
  reason              text not null,
  detail              text,
  status              text not null default 'open',
  severity            text not null default 'normal',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint reports_target_type check (target_type in ('profile','message','activity')),
  constraint reports_reason check (reason in
    ('harassment','hate','sexual_solicitation','spam','scam','impersonation',
     'self_harm','child_safety','other')),
  constraint reports_status   check (status   in ('open','triaged','actioned','dismissed')),
  constraint reports_severity check (severity in ('immediate','serious','normal'))
);

create index reports_status_idx   on public.reports (status);
create index reports_reporter_idx on public.reports (reporter_id);
create index reports_reported_idx on public.reports (reported_profile_id);

-- Preserve + escalate: stamp severity for child-safety and record every report
-- in the append-only audit log. SECURITY DEFINER so it can write audit_log.
create function public.reports_on_insert()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.reason = 'child_safety' then
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
revoke execute on function public.reports_on_insert() from public;

create trigger reports_before_insert
  before insert on public.reports
  for each row execute function public.reports_on_insert();

create trigger reports_set_updated_at
  before update on public.reports
  for each row execute function public.set_updated_at();

-- ============================================================================
-- RLS
-- ============================================================================
alter table public.reports enable row level security;

grant select, insert, update on public.reports to authenticated;

-- File a report as yourself.
create policy "reports_insert_own"
  on public.reports for insert to authenticated
  with check ((select auth.uid()) = reporter_id);

-- Readable ONLY by the reporter or a moderator/admin.
create policy "reports_select_reporter_or_moderator"
  on public.reports for select to authenticated
  using ((select auth.uid()) = reporter_id or public.is_moderator());

-- Only moderators/admins may triage.
create policy "reports_update_moderator"
  on public.reports for update to authenticated
  using (public.is_moderator())
  with check (public.is_moderator());
