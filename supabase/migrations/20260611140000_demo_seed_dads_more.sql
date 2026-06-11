-- ============================================================================
-- 0023 — Demo seed: 10 more dummy dads (dad11–dad20) with photos, for testing.
--
--   Same safe path as 0019 (demo_seed_dads): inserting auth.users fires
--   handle_new_user (enforces 18+, creates profile + profile_private), then we
--   flesh out the profile with bio/stage/area, set account_type='seed', and an
--   avatar_url (randomuser.me — royalty-free demo headshots, same host as 0020).
--   Each new dad pre-likes the founder, so a founder right-swipe matches
--   instantly (handle_swipe) and chat opens — no second device needed.
--
--   Nothing bypassed: matches still come only from handle_swipe (we seed swipes,
--   never matches); account_type is not a privileged column; RLS unchanged.
--
--   PURGE (same one-liner removes ALL seed dads, real users untouched):
--     delete from auth.users
--     where id in (select id from public.profiles where account_type = 'seed');
-- ============================================================================

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values
  ('0d000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dad11@seed.tadpole.test', '{"display_name":"Jack Morgan","date_of_birth":"1989-05-12"}',   now(), now()),
  ('0d000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dad12@seed.tadpole.test', '{"display_name":"Ade Adeyemi","date_of_birth":"1990-02-08"}',   now(), now()),
  ('0d000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dad13@seed.tadpole.test', '{"display_name":"Ryan Foster","date_of_birth":"1984-10-19"}',   now(), now()),
  ('0d000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dad14@seed.tadpole.test', '{"display_name":"Paul Sutton","date_of_birth":"1991-07-03"}',   now(), now()),
  ('0d000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dad15@seed.tadpole.test', '{"display_name":"Raj Sharma","date_of_birth":"1987-12-22"}',    now(), now()),
  ('0d000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dad16@seed.tadpole.test', '{"display_name":"Danny O''Connor","date_of_birth":"1992-04-15"}', now(), now()),
  ('0d000000-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dad17@seed.tadpole.test', '{"display_name":"Kwame Mensah","date_of_birth":"1986-09-27"}',  now(), now()),
  ('0d000000-0000-0000-0000-000000000018', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dad18@seed.tadpole.test', '{"display_name":"Scott Wallace","date_of_birth":"1988-01-30"}', now(), now()),
  ('0d000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dad19@seed.tadpole.test', '{"display_name":"Greg Turner","date_of_birth":"1993-06-11"}',   now(), now()),
  ('0d000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dad20@seed.tadpole.test', '{"display_name":"Lee Hamilton","date_of_birth":"1990-11-05"}',  now(), now())
on conflict (id) do nothing;

update public.profiles p
set display_name    = v.display_name,
    bio             = v.bio,
    parenting_stage = v.parenting_stage,
    area_slug       = v.area_slug,
    area_label      = v.area_label,
    avatar_url      = v.avatar_url,
    onboarded_at    = now(),
    account_type    = 'seed',
    created_at      = now() - make_interval(hours => v.age_hours)
from (values
  ('0d000000-0000-0000-0000-000000000011'::uuid, 'Jack Morgan',    'Dad to a wild two-year-old and a soft spot for the local park. Up for coffee, a kickabout or a buggy walk whenever.',                         'toddler',   'bristol', 'Bristol',  3,  'https://randomuser.me/api/portraits/men/12.jpg'),
  ('0d000000-0000-0000-0000-000000000012'::uuid, 'Ade Adeyemi',    'Brand-new dad, running on caffeine and good intentions. Keen to meet other dads nearby for a pint or a pram-walk.',                            'newborn',   'cardiff', 'Cardiff',  9,  'https://randomuser.me/api/portraits/men/53.jpg'),
  ('0d000000-0000-0000-0000-000000000013'::uuid, 'Ryan Foster',    'Two kids, full-on weekends. Five-a-side, parkrun and a proper roast. After a few local dad mates to share the chaos.',                          'child',     'leeds',   'Leeds',   16,  'https://randomuser.me/api/portraits/men/15.jpg'),
  ('0d000000-0000-0000-0000-000000000014'::uuid, 'Paul Sutton',    'First baby due in the spring and slightly terrified. Into cycling and dad jokes. Would love to know others going through it.',                  'expecting', 'reading', 'Reading', 24,  'https://randomuser.me/api/portraits/men/18.jpg'),
  ('0d000000-0000-0000-0000-000000000015'::uuid, 'Raj Sharma',     'Dad of one, learning daily. Work in tech, climb when I can. Happy to meet other dads for a brew and a chat.',                                  'infant',    'bristol', 'Bristol', 33,  'https://randomuser.me/api/portraits/men/38.jpg'),
  ('0d000000-0000-0000-0000-000000000016'::uuid, 'Danny O''Connor','Toddler dad and full-time entertainer. Love the outdoors, sea air and long walks. After easy-going dad company.',                              'toddler',   'rhyl',    'Rhyl',    41,  'https://randomuser.me/api/portraits/men/24.jpg'),
  ('0d000000-0000-0000-0000-000000000017'::uuid, 'Kwame Mensah',   'Twins keeping me very busy. Surviving on humour and tea. Looking for dads who know free time is a myth.',                                      'multiple',  'leeds',   'Leeds',   49,  'https://randomuser.me/api/portraits/men/55.jpg'),
  ('0d000000-0000-0000-0000-000000000018'::uuid, 'Scott Wallace',  'Two little ones at home. Football, cooking and getting out the house. Keen to build a local dad network.',                                    'child',     'cardiff', 'Cardiff', 57,  'https://randomuser.me/api/portraits/men/28.jpg'),
  ('0d000000-0000-0000-0000-000000000019'::uuid, 'Greg Turner',    'A few weeks into newborn life and figuring it out. Used to run a lot, hoping to again. Up for sanity walks.',                                'newborn',   'reading', 'Reading', 66,  'https://randomuser.me/api/portraits/men/33.jpg'),
  ('0d000000-0000-0000-0000-000000000020'::uuid, 'Lee Hamilton',   'Dad to a little one who runs the house. Into surfing and quiet pints. Looking for relaxed dad company nearby.',                              'infant',    'rhyl',    'Rhyl',    74,  'https://randomuser.me/api/portraits/men/41.jpg')
) as v(id, display_name, bio, parenting_stage, area_slug, area_label, age_hours, avatar_url)
where p.id = v.id;

-- Pre-like the founder from every seed dad (idempotent; existing dads no-op).
insert into public.swipes (swiper_id, target_id, direction)
select p.id, f.id, 'like'
from public.profiles p
cross join (select id from auth.users where email = 'joshua.corrigan2020@outlook.com') f
where p.account_type = 'seed'
on conflict (swiper_id, target_id) do nothing;
