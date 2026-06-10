-- ============================================================================
-- 0020 — Demo seed avatars: realistic profile photos for the 10 seed dads.
--
--   The 0019 seed left profiles.avatar_url NULL, so the demo deck only showed
--   the first-letter fallback. For investor-demo realism we give each seed dad
--   a photo. These are hotlinked headshots from randomuser.me (royalty-free,
--   purpose-built for exactly this kind of demo/seed data). The web <img> and
--   mobile <Image> render any https URL, so no client/config changes are needed.
--
--   SAFETY / HYGIENE:
--     * Guarded by account_type = 'seed' — this can NEVER touch a real member's
--       avatar.
--     * Idempotent: re-running just re-sets the same URLs.
--     * Purges automatically with the seed dads (0019 purge / ON DELETE CASCADE).
--
--   To self-host instead of hotlinking, upload each file to the public 'avatars'
--   bucket under avatars/{user-id}/… and swap the URLs below for
--   https://{project}/storage/v1/object/public/avatars/{user-id}/{file}.
-- ============================================================================
update public.profiles p
set avatar_url = v.url
from (values
  ('0d000000-0000-0000-0000-000000000001'::uuid, 'https://randomuser.me/api/portraits/men/32.jpg'), -- Marcus Bell
  ('0d000000-0000-0000-0000-000000000002'::uuid, 'https://randomuser.me/api/portraits/men/54.jpg'), -- Daniel Okafor
  ('0d000000-0000-0000-0000-000000000003'::uuid, 'https://randomuser.me/api/portraits/men/44.jpg'), -- Tom Whitfield
  ('0d000000-0000-0000-0000-000000000004'::uuid, 'https://randomuser.me/api/portraits/men/51.jpg'), -- Aaron Price
  ('0d000000-0000-0000-0000-000000000005'::uuid, 'https://randomuser.me/api/portraits/men/9.jpg'),  -- Liam Hughes
  ('0d000000-0000-0000-0000-000000000006'::uuid, 'https://randomuser.me/api/portraits/men/39.jpg'), -- Sanjay Patel
  ('0d000000-0000-0000-0000-000000000007'::uuid, 'https://randomuser.me/api/portraits/men/3.jpg'),  -- Chris Donnelly
  ('0d000000-0000-0000-0000-000000000008'::uuid, 'https://randomuser.me/api/portraits/men/68.jpg'), -- Mike Roberts
  ('0d000000-0000-0000-0000-000000000009'::uuid, 'https://randomuser.me/api/portraits/men/22.jpg'), -- James Carter
  ('0d000000-0000-0000-0000-000000000010'::uuid, 'https://randomuser.me/api/portraits/men/85.jpg')  -- Owen Davies
) as v(id, url)
where p.id = v.id
  and p.account_type = 'seed';
