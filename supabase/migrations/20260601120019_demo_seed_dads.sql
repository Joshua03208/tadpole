-- ============================================================================
-- 0019 — Demo seed: dummy dad profiles + system-account exclusion from the deck.
--
--   PURPOSE (investor-demo prep): the swipe -> match -> chat core can't be shown
--   with only the founder + the attribution-only "Tadpole Wellbeing Team" account
--   in the DB. This migration:
--     1. adds profiles.account_type ('member' | 'system' | 'seed') so any
--        non-human/system account is excluded from the swipe deck via a FLAG,
--        not a hardcoded id;
--     2. tags the Wellbeing Team account as 'system' (so it can never surface as
--        a swipeable match candidate);
--     3. seeds 10 realistic, varied UK dummy dads (account_type='seed') aligned
--        to the seeded Activity Finder areas, respecting the 18+ gate and all
--        existing triggers/constraints (server-side seed, security model intact);
--     4. pre-likes the founder from every seed dad, so a founder right-swipe in
--        the demo INSTANTLY matches (handle_swipe) -> chat opens. No second
--        device, no second login.
--
--   SECURITY MODEL RESPECTED (nothing bypassed):
--     * dummy dads are created the normal way — inserting auth.users fires
--       handle_new_user, which enforces 18+ and creates profile + profile_private
--       inside the signup transaction (same path as the 0017 team seed).
--     * account_type is NOT a privileged column (the profiles_guard_privileged
--       trigger only guards role/status), so no trigger is disabled here.
--     * matches are still created ONLY by the handle_swipe trigger; we seed
--       swipes, never matches. No match exists until the founder swipes back.
--     * RLS unchanged: anon still cannot read profiles; account_type is never
--       returned by get_swipe_deck and never exposed to anon.
--
--   PURGE (when real users arrive — removes every trace, leaves real users
--   untouched because no real user is ever 'seed'):
--
--       delete from auth.users
--       where id in (select id from public.profiles where account_type = 'seed');
--
--   The auth.users -> profiles -> swipes/matches/messages FKs are ON DELETE
--   CASCADE, so that single statement cleans up everything.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. profiles.account_type — the durable classification flag.
--    'member' (default) = real user; 'system' = non-human/attribution account
--    (excluded from the deck); 'seed' = demo dummy profile (swipeable + purgeable).
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists account_type text not null default 'member';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_account_type_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_account_type_check
      check (account_type in ('member', 'system', 'seed'));
  end if;
end $$;

comment on column public.profiles.account_type is
  'Account classification. member = real user (default). system = non-human/attribution-only account (e.g. Tadpole Wellbeing Team) — EXCLUDED from get_swipe_deck. seed = demo dummy profile (swipeable; purge with: delete from auth.users where id in (select id from public.profiles where account_type = ''seed'')). Not a privileged column; not exposed to anon; never returned by get_swipe_deck.';

-- ---------------------------------------------------------------------------
-- 2. Tag the institutional Wellbeing Team account as a system account so it is
--    excluded from the deck. Resolved by its email (self-documenting); role and
--    status are untouched, so the privileged-columns guard does not fire.
-- ---------------------------------------------------------------------------
update public.profiles p
set account_type = 'system'
from auth.users u
where u.id = p.id
  and u.email = 'wellbeing-team@tadpole.app';

-- ---------------------------------------------------------------------------
-- 3. get_swipe_deck — exact live body + ONE predicate: exclude system accounts.
--    Any future account tagged 'system' is auto-excluded; seed dads stay in the
--    deck (account_type='seed' is intentionally NOT excluded). Signature and
--    masked projection are unchanged.
-- ---------------------------------------------------------------------------
create or replace function public.get_swipe_deck(
  p_limit           integer default 20,
  p_parenting_stage text    default null,
  p_area_slug       text    default null
)
returns table (
  id              uuid,
  display_name    text,
  bio             text,
  avatar_url      text,
  parenting_stage text,
  area_label      text,
  area_slug       text,
  interests       text[],
  created_at      timestamptz
)
language sql stable security definer set search_path to 'public'
as $function$
  select p.id, p.display_name, p.bio, p.avatar_url, p.parenting_stage,
         p.area_label, p.area_slug, p.interests, p.created_at
  from public.profiles p
  where p.id <> (select auth.uid())
    and p.deleted_at is null
    and p.status = 'active'
    and p.account_type <> 'system'
    and not exists (
      select 1 from public.swipes s
      where s.swiper_id = (select auth.uid()) and s.target_id = p.id
    )
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = (select auth.uid()) and b.blocked_id = p.id)
         or (b.blocker_id = p.id and b.blocked_id = (select auth.uid()))
    )
    and (p_parenting_stage is null or p.parenting_stage = p_parenting_stage)
    and (p_area_slug is null or p.area_slug = p_area_slug)
  order by
    (p.area_slug is not distinct from
      (select area_slug from public.profiles where id = (select auth.uid())))::int desc,
    (p.parenting_stage is not distinct from
      (select parenting_stage from public.profiles where id = (select auth.uid())))::int desc,
    p.created_at desc
  limit greatest(1, least(coalesce(p_limit, 20), 100));
$function$;

revoke execute on function public.get_swipe_deck(int, text, text) from public;
grant  execute on function public.get_swipe_deck(int, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Seed 10 dummy dad auth.users. Each insert fires handle_new_user, which
--    enforces 18+ and creates the profile + profile_private(date_of_birth).
--    Fixed 0d…-prefixed UUIDs + @seed.tadpole.test emails (reserved .test TLD)
--    make the demo data unmistakable and trivially greppable. No password /
--    no email confirmation: these accounts can never log in.
-- ---------------------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values
  ('0d000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dad01@seed.tadpole.test', '{"display_name":"Marcus Bell","date_of_birth":"1988-03-14"}',   now(), now()),
  ('0d000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dad02@seed.tadpole.test', '{"display_name":"Daniel Okafor","date_of_birth":"1991-11-02"}', now(), now()),
  ('0d000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dad03@seed.tadpole.test', '{"display_name":"Tom Whitfield","date_of_birth":"1985-06-21"}', now(), now()),
  ('0d000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dad04@seed.tadpole.test', '{"display_name":"Aaron Price","date_of_birth":"1990-09-09"}',   now(), now()),
  ('0d000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dad05@seed.tadpole.test', '{"display_name":"Liam Hughes","date_of_birth":"1993-01-27"}',   now(), now()),
  ('0d000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dad06@seed.tadpole.test', '{"display_name":"Sanjay Patel","date_of_birth":"1986-12-05"}',  now(), now()),
  ('0d000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dad07@seed.tadpole.test', '{"display_name":"Chris Donnelly","date_of_birth":"1987-04-18"}',now(), now()),
  ('0d000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dad08@seed.tadpole.test', '{"display_name":"Mike Roberts","date_of_birth":"1992-08-30"}',  now(), now()),
  ('0d000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dad09@seed.tadpole.test', '{"display_name":"James Carter","date_of_birth":"1994-02-11"}',  now(), now()),
  ('0d000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'dad10@seed.tadpole.test', '{"display_name":"Owen Davies","date_of_birth":"1989-07-23"}',   now(), now())
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 5. Flesh out the seed profiles (handle_new_user only set id + display_name).
--    Sets bio, parenting_stage, coarse area (label + slug, matching the seeded
--    Activity Finder areas), marks them onboarded, and flags account_type='seed'.
--    interests left empty (onboarding doesn't collect them — keeps seed dads
--    identical to real profiles). created_at staggered so the deck order is
--    natural. role/status untouched -> privileged-columns guard does not fire.
-- ---------------------------------------------------------------------------
update public.profiles p
set display_name    = v.display_name,
    bio             = v.bio,
    parenting_stage = v.parenting_stage,
    area_slug       = v.area_slug,
    area_label      = v.area_label,
    onboarded_at    = now(),
    account_type    = 'seed',
    created_at      = now() - make_interval(hours => v.age_hours)
from (values
  ('0d000000-0000-0000-0000-000000000001'::uuid, 'Marcus Bell',    'Dad to a two-year-old who never sits still. Always up for a coffee, a kickabout in the park, or a muddy walk. Keen to meet other dads who get the daily chaos.',                 'toddler',   'bristol', 'Bristol',  2),
  ('0d000000-0000-0000-0000-000000000002'::uuid, 'Daniel Okafor',  'New dad running on very little sleep and a lot of coffee. Would love to find other dads nearby for the odd pint or a pram-walk when the weather behaves.',                      'newborn',   'cardiff', 'Cardiff',  8),
  ('0d000000-0000-0000-0000-000000000003'::uuid, 'Tom Whitfield',  'Two kids and full-on weekends. Big on five-a-side, parkrun and a proper Sunday roast. Looking for a few local dad mates to share the madness with.',                          'child',     'leeds',   'Leeds',   15),
  ('0d000000-0000-0000-0000-000000000004'::uuid, 'Aaron Price',    'First baby on the way and slightly terrified. Would be good to know other dads going through the same. Into cycling, bad puns and tinkering with bikes.',                     'expecting', 'reading', 'Reading', 23),
  ('0d000000-0000-0000-0000-000000000005'::uuid, 'Liam Hughes',    'Dad of one, learning as I go. Big on the outdoors, sea swims and long dog walks. After some easy-going dad company round here.',                                          'infant',    'rhyl',    'Rhyl',    30),
  ('0d000000-0000-0000-0000-000000000006'::uuid, 'Sanjay Patel',   'Two little ones keeping me on my toes. Work in tech, escape to the climbing wall when I can. Happy to meet other dads for a brew and a chat.',                            'child',     'bristol', 'Bristol', 38),
  ('0d000000-0000-0000-0000-000000000007'::uuid, 'Chris Donnelly', 'Twins. Need I say more. Surviving on humour and tea. Looking for dads who know that ''free time'' is a myth but still fancy a catch-up.',                                  'multiple',  'leeds',   'Leeds',   47),
  ('0d000000-0000-0000-0000-000000000008'::uuid, 'Mike Roberts',   'Single dad to a cheeky three-year-old. Love football, cooking and getting out of the house. Keen to build a bit of a dad network locally.',                              'toddler',   'cardiff', 'Cardiff', 55),
  ('0d000000-0000-0000-0000-000000000009'::uuid, 'James Carter',   'A few weeks in and figuring it out one day at a time. Used to run a lot and hoping to again. Would love a couple of dad mates for sanity walks.',                      'newborn',   'reading', 'Reading', 64),
  ('0d000000-0000-0000-0000-000000000010'::uuid, 'Owen Davies',    'Dad to a little girl who rules the house. Into surfing, doing up an old campervan, and quiet pints. Looking for relaxed dad company nearby.',                          'infant',    'rhyl',    'Rhyl',    72)
) as v(id, display_name, bio, parenting_stage, area_slug, area_label, age_hours)
where p.id = v.id;

-- ---------------------------------------------------------------------------
-- 6. Demo match setup: every seed dad has already 'liked' the founder. Because
--    the founder hasn't liked back yet, handle_swipe creates NO match now — but
--    the moment the founder right-swipes a dad in the demo, the reciprocal like
--    is already there, so a match is created instantly and chat unlocks.
--    Founder resolved by email (no hardcoded UUID). If the founder isn't found
--    this inserts zero rows (safe no-op).
-- ---------------------------------------------------------------------------
insert into public.swipes (swiper_id, target_id, direction)
select p.id, f.id, 'like'
from public.profiles p
cross join (select id from auth.users where email = 'joshua.corrigan2020@outlook.com') f
where p.account_type = 'seed'
on conflict (swiper_id, target_id) do nothing;
