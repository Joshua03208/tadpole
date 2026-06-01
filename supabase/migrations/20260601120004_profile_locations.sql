-- ============================================================================
-- 0004 — profile_locations (owner-only precise coordinates).
-- Precise lat/lng is opt-in and is NEVER exposed to other users: every policy
-- is owner-only and there is deliberately no other-user read path. The swipe
-- deck returns a masked projection and never joins this table. Coarse "area"
-- (profiles.area_id) is the only location shown to others.
-- ============================================================================

create table public.profile_locations (
  id         uuid primary key references public.profiles (id) on delete cascade,
  lat        double precision not null,
  lng        double precision not null,
  updated_at timestamptz not null default now(),
  constraint profile_locations_lat_range check (lat between -90  and 90),
  constraint profile_locations_lng_range check (lng between -180 and 180)
);

alter table public.profile_locations enable row level security;

grant select, insert, update, delete on public.profile_locations to authenticated;

create policy "profile_locations_select_own"
  on public.profile_locations for select to authenticated
  using ((select auth.uid()) = id);

create policy "profile_locations_insert_own"
  on public.profile_locations for insert to authenticated
  with check ((select auth.uid()) = id);

create policy "profile_locations_update_own"
  on public.profile_locations for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "profile_locations_delete_own"
  on public.profile_locations for delete to authenticated
  using ((select auth.uid()) = id);

create trigger profile_locations_set_updated_at
  before update on public.profile_locations
  for each row execute function public.set_updated_at();
