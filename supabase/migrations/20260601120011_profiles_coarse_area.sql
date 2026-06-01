-- ============================================================================
-- 0011 — coarse area label + slug on profiles (Phase 2 fix).
-- The onboarding type-ahead stores a canonical UK town/city: `area_label` (the
-- display name, e.g. "Cardiff") + `area_slug` (the normalized reconciliation
-- key, e.g. "cardiff"). Selecting from the bundled list guarantees consistent
-- values so casing can't fragment. `area_id` (FK to the slugged `areas` table)
-- stays nullable and is populated later in the Activity Finder phase by matching
-- area_slug -> areas.slug. This is the COARSE town/city shown to others — never
-- precise location.
-- ============================================================================

alter table public.profiles
  add column area_label text,
  add column area_slug  text;

create index profiles_area_slug_idx on public.profiles (area_slug);
