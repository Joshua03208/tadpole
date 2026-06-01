-- ============================================================================
-- 0018 — denormalize a PUBLIC-SAFE guide author byline.
--
--   anon cannot read public.profiles (and must not — no anon-exposure on private
--   tables), so the public guide page can't join the author's profile to show a
--   byline. Denormalize ONLY the public-safe display name + a static label onto
--   the guide row so anon renders the byline straight off the (published) guide,
--   with profiles staying fully private.
--
--   author_id stays as the relational link (provenance; the real verified_expert
--   profile still exists). We copy ONLY display_name from the profile — never
--   bio, area, role, email, or any other column.
-- ============================================================================

alter table public.guides
  add column author_name    text,
  add column author_tagline text;

-- Backfill from the team profile: PUBLIC-SAFE fields only.
--   author_name    <- profiles.display_name (already shown publicly as a byline)
--   author_tagline <- a constant label (NOT sourced from any profile column)
update public.guides g
set author_name    = p.display_name,
    author_tagline = 'Verified expert'
from public.profiles p
where p.id = g.author_id
  and g.author_name is null;

comment on column public.guides.author_name is
  'Denormalized PUBLIC-SAFE author display name (copied from the verified_expert profile.display_name). Lets anon render the byline without exposing the private profiles table.';
comment on column public.guides.author_tagline is
  'Static public byline label (e.g. "Verified expert"). NOT sourced from any private profile column.';
