-- ============================================================================
-- 0003 — profile_private (owner-only date_of_birth) + the ATOMIC 18+ gate.
-- The DOB lives in its own table, readable only by its owner, never exposed to
-- other users. The signup trigger enforces 18+ inside the auth.users insert
-- transaction: a missing or under-18 DOB rolls the whole signup back, so no
-- auth user, no profile, and no DOB row can ever persist for an under-18.
-- ============================================================================

create table public.profile_private (
  id            uuid primary key references public.profiles (id) on delete cascade,
  date_of_birth date not null,
  created_at    timestamptz not null default now(),
  -- Defence-in-depth: even a direct write cannot store an under-18 DOB.
  constraint profile_private_adult check (date_of_birth <= (current_date - interval '18 years'))
);

alter table public.profile_private enable row level security;

-- Owner may read ONLY their own DOB. No client insert/update/delete: the row is
-- created atomically by the signup trigger and the DOB is immutable thereafter
-- (corrections go through service-role/support).
grant select on public.profile_private to authenticated;

create policy "profile_private_select_own"
  on public.profile_private for select
  to authenticated
  using ((select auth.uid()) = id);

-- ---- atomic 18+ gate -------------------------------------------------------
-- The client passes date_of_birth (and optional display_name) in the signUp
-- `data` payload; GoTrue stores it in raw_user_meta_data on the INSERT this
-- AFTER trigger fires for. (raw_user_meta_data is user-supplied and is used
-- here ONLY to populate the owner-only DOB + gate age at signup — never for
-- ongoing authorization, which keys off the server-controlled profiles.role.)
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dob          date;
  v_display_name text;
begin
  begin
    v_dob := (new.raw_user_meta_data ->> 'date_of_birth')::date;
  exception when others then
    raise exception 'invalid date_of_birth in signup data';
  end;

  if v_dob is null then
    raise exception 'date_of_birth is required at signup (18+ only)';
  end if;
  if v_dob > (current_date - interval '18 years') then
    raise exception 'must be 18 or older to use Tadpole';
  end if;

  v_display_name := nullif(trim(new.raw_user_meta_data ->> 'display_name'), '');

  insert into public.profiles (id, display_name)
  values (new.id, coalesce(v_display_name, 'dad'));

  insert into public.profile_private (id, date_of_birth)
  values (new.id, v_dob);

  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
