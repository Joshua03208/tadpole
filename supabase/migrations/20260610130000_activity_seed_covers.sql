-- ============================================================================
-- 0022 — Activity seed covers: point the 15 seeded activities at their uploaded
--   cover photos in the public activity-photos bucket.
--
--   Photos are uploaded out-of-band (service-role / dashboard) to
--   activity-photos/seed/<slug>.jpg — see docs/activity-photo-credits.md for
--   sources + licences (all CC0 / public-domain). cover_path is bucket-relative;
--   packages/core activities.coverUrl() turns it into a public URL.
--
--   DO NOT APPLY until the 15 files exist in the bucket, or the cards will try
--   to render 404 images. Re-runnable; only touches the seeded rows by slug.
-- ============================================================================
update public.activities
set cover_path = 'seed/' || slug || '.jpg'
where slug in (
  'ashton-court-meadows',
  'harbourside-hideout-soft-play',
  'little-otters-swim-school',
  'bay-bouncers-soft-play',
  'bute-park-riverside',
  'sleepy-otter-cafe',
  'crumb-and-cushion-cafe',
  'hunslet-dads-and-toddlers',
  'woolly-mammoth-play-barn',
  'forbury-gardens-play-area',
  'thames-splash-swim-classes',
  'the-buggy-stop-cafe',
  'marine-lake-play-park',
  'rhyl-seafront-stay-and-play',
  'seaside-scramblers-soft-play'
);
