-- ============================================================================
-- 0002 — profiles, roles, blocks, append-only audit log, and the
--        privileged-column (role/status) self-escalation guard.
-- RLS default-deny on every table; auth.uid() wrapped in (select ...) for the
-- initplan optimiser; SECURITY DEFINER helpers are caller-scoped.
-- ============================================================================

create type public.user_role as enum ('user', 'verified_expert', 'moderator', 'admin');

-- ---- profiles (public-facing, owner-managed) -------------------------------
create table public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  display_name    text not null,
  bio             text,
  avatar_url      text,
  parenting_stage text,
  area_id         uuid references public.areas (id) on delete set null,
  interests       text[] not null default '{}',
  role            public.user_role not null default 'user',
  status          text not null default 'active',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  constraint profiles_display_name_len check (char_length(display_name) between 1 and 50),
  constraint profiles_bio_len          check (bio is null or char_length(bio) <= 500),
  constraint profiles_parenting_stage  check (parenting_stage is null or parenting_stage in
    ('expecting','newborn','infant','toddler','child','multiple')),
  constraint profiles_status_check     check (status in ('active','suspended','banned'))
);

create index profiles_area_idx            on public.profiles (area_id);
create index profiles_parenting_stage_idx on public.profiles (parenting_stage);
create index profiles_active_idx          on public.profiles (status) where deleted_at is null;

-- ---- blocks (safety) -------------------------------------------------------
-- A block hides both users from each other everywhere. Only the blocker can
-- read the row (the blocked party must not learn it exists from this table).
create table public.blocks (
  id         uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id),
  constraint blocks_not_self check (blocker_id <> blocked_id)
);

create index blocks_blocked_idx on public.blocks (blocked_id);

-- ---- audit log (append-only, separable safety/accountability record) -------
-- NOT FK'd to profiles so it survives account anonymisation / hard purge.
-- Written ONLY by SECURITY DEFINER functions; read only by moderators/admins;
-- never updated, deleted, or truncated.
create table public.audit_log (
  id           uuid primary key default gen_random_uuid(),
  actor_id     uuid,
  action       text not null,
  target_table text,
  target_id    uuid,
  detail       jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index audit_log_actor_idx  on public.audit_log (actor_id);
create index audit_log_action_idx on public.audit_log (action);
create index audit_log_target_idx on public.audit_log (target_table, target_id);

-- ---- caller-scoped helpers (used by RLS) -----------------------------------
-- SECURITY DEFINER so they read past RLS for the lookup, but each only reveals
-- data about the CALLER (auth.uid()), so they are safe to expose to the
-- authenticated role (which RLS evaluation requires).
create function public.current_app_role()
returns public.user_role
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

create function public.is_moderator()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(public.current_app_role() in ('moderator','admin'), false);
$$;

-- True iff the caller and p_other have a block in EITHER direction. One side is
-- always auth.uid(), so it cannot be used to probe arbitrary user pairs.
create function public.has_block_with(p_other uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.blocks b
    where (b.blocker_id = (select auth.uid()) and b.blocked_id = p_other)
       or (b.blocker_id = p_other and b.blocked_id = (select auth.uid()))
  );
$$;

revoke execute on function public.current_app_role()     from public;
revoke execute on function public.is_moderator()         from public;
revoke execute on function public.has_block_with(uuid)   from public;
grant  execute on function public.current_app_role()     to authenticated;
grant  execute on function public.is_moderator()         to authenticated;
grant  execute on function public.has_block_with(uuid)   to authenticated;

-- ---- updated_at maintenance ------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke execute on function public.set_updated_at() from public;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---- privileged-column guard (role self-escalation defence) ----------------
-- role + status are server-authoritative. A normal owner UPDATE may change
-- profile fields but NOT role/status. Only an admin may, and every such change
-- is written to the audit log.
create function public.guard_profile_privileged_columns()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if (new.role is distinct from old.role) or (new.status is distinct from old.status) then
    if coalesce(public.current_app_role(), 'user'::public.user_role) <> 'admin'::public.user_role then
      raise exception 'not authorized to change role or status' using errcode = '42501';
    end if;
    insert into public.audit_log (actor_id, action, target_table, target_id, detail)
    values ((select auth.uid()), 'profile.privileged_update', 'profiles', new.id,
      jsonb_build_object('old_role', old.role, 'new_role', new.role,
                         'old_status', old.status, 'new_status', new.status));
  end if;
  return new;
end;
$$;
revoke execute on function public.guard_profile_privileged_columns() from public;

create trigger profiles_guard_privileged
  before update on public.profiles
  for each row execute function public.guard_profile_privileged_columns();

-- ---- admin-only role setter (the sanctioned path to change a role) ---------
create function public.set_user_role(p_user uuid, p_role public.user_role)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if coalesce(public.current_app_role(), 'user'::public.user_role) <> 'admin'::public.user_role then
    raise exception 'only admins may set roles' using errcode = '42501';
  end if;
  update public.profiles set role = p_role where id = p_user;
  -- the guard trigger writes the audit row for the change.
end;
$$;
revoke execute on function public.set_user_role(uuid, public.user_role) from public;
grant  execute on function public.set_user_role(uuid, public.user_role) to authenticated;

-- ---- append-only enforcement for audit_log ---------------------------------
create function public.audit_log_block_mutations()
returns trigger
language plpgsql set search_path = public
as $$
begin
  raise exception 'audit_log is append-only';
end;
$$;
revoke execute on function public.audit_log_block_mutations() from public;

create trigger audit_log_no_update   before update   on public.audit_log
  for each row execute function public.audit_log_block_mutations();
create trigger audit_log_no_delete   before delete   on public.audit_log
  for each row execute function public.audit_log_block_mutations();
create trigger audit_log_no_truncate before truncate on public.audit_log
  for each statement execute function public.audit_log_block_mutations();

-- ============================================================================
-- RLS
-- ============================================================================
alter table public.profiles  enable row level security;
alter table public.blocks    enable row level security;
alter table public.audit_log enable row level security;

-- profiles: read own + read other ACTIVE, non-deleted, non-blocked profiles
-- (single combined SELECT policy to avoid multiple-permissive-policy overhead).
-- No client INSERT (signup trigger creates the row); no client DELETE (deletion
-- is the soft-delete/anonymise RPC in migration 0007).
grant select, update on public.profiles to authenticated;

create policy "profiles_select"
  on public.profiles for select
  to authenticated
  using (
    (select auth.uid()) = id
    or (deleted_at is null and status = 'active' and not public.has_block_with(id))
  );

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- blocks: a user manages and sees ONLY their own blocks (as blocker).
grant select, insert, delete on public.blocks to authenticated;

create policy "blocks_select_own"
  on public.blocks for select to authenticated
  using ((select auth.uid()) = blocker_id);

create policy "blocks_insert_own"
  on public.blocks for insert to authenticated
  with check ((select auth.uid()) = blocker_id);

create policy "blocks_delete_own"
  on public.blocks for delete to authenticated
  using ((select auth.uid()) = blocker_id);

-- audit_log: moderators/admins read; NO client writes (definer funcs only).
grant select on public.audit_log to authenticated;

create policy "audit_log_select_moderator"
  on public.audit_log for select to authenticated
  using (public.is_moderator());
