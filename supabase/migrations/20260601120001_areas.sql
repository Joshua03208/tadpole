-- ============================================================================
-- 0001 — areas (first-class location entities)
-- Shared by the swipe deck (same-area sort) and the future Activity Finder
-- (per-area SEO pages). Public reference data: readable by signed-in users;
-- writes happen via migrations / service-role only (NO client write policy).
-- RLS: default-deny, then an explicit authenticated-read policy.
-- ============================================================================

create table public.areas (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null,
  region     text,
  created_at timestamptz not null default now(),
  constraint areas_slug_len   check (char_length(slug) between 1 and 120),
  constraint areas_slug_kebab check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create index areas_region_idx on public.areas (region);

alter table public.areas enable row level security;

-- Data API reachability: signed-in users may read areas (rows still gated by RLS).
grant select on public.areas to authenticated;

create policy "areas_select_authenticated"
  on public.areas
  for select
  to authenticated
  using (true);

-- No insert/update/delete policy => default-deny for clients. Areas are seeded
-- via migration / service-role only. (Anon read for SEO is added in Phase 4.)
