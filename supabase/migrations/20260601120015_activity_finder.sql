-- ============================================================================
-- 0015 — Activity Finder (Phase 4): the public SEO surface.
--
--   First ANON-readable data in the project. Adds two tables (categories,
--   activities), opens anon SELECT on areas/categories/published-activities,
--   creates a public storage bucket for activity covers, and seeds a few real
--   UK areas + ~15 realistic published activities.
--
--   Decisions locked with the founder (2026-06-01):
--     * Activity slugs are unique PER AREA  -> unique (area_id, slug).
--     * Venue geo stored as plain lat/lng (no PostGIS this phase).
--     * One category per activity           -> category_id FK.
--     * profiles.area_id backfilled additively (free-text area_slug/area_label,
--       onboarding and the deck are left untouched).
--
--   RLS posture (matches the project): default-deny is automatic (an event
--   trigger enables RLS on every new public table); we add explicit anon SELECT
--   policies for the public read, write NO client write policies (content is
--   seeded / service-role only, mirroring `areas`), and REVOKE the default-
--   granted write privileges from anon/authenticated for least-privilege
--   (consistent with the 0008/0014 function-hardening migrations). Anon already
--   holds a table-level SELECT grant by Supabase default; the explicit grants
--   below are for intent/clarity.
--
--   Moderation: report-on-activity already works (reports.target_type='activity'
--   from 0006). Hiding a reported activity is done via service-role/SQL for now
--   (status -> 'hidden'); a moderator write policy + dashboard arrive in Phase 10.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- categories — small reference table. `schema_type` drives the schema.org
-- @type used in JSON-LD on the web detail pages.
-- ---------------------------------------------------------------------------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  schema_type text not null default 'LocalBusiness'
              check (schema_type in ('LocalBusiness', 'Place', 'Park', 'CafeOrCoffeeShop', 'SportsActivityLocation')),
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now(),
  constraint categories_slug_len   check (char_length(slug) between 1 and 80),
  constraint categories_slug_kebab check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

alter table public.categories enable row level security;

-- public read (reference data, no sensitivity); no client writes.
create policy "categories_select_public" on public.categories
  for select to anon, authenticated using (true);

grant select on public.categories to anon, authenticated;
revoke insert, update, delete, truncate on public.categories from anon, authenticated;

-- ---------------------------------------------------------------------------
-- activities — the indexable evergreen places. Anon reads PUBLISHED only.
-- ---------------------------------------------------------------------------
create table public.activities (
  id           uuid primary key default gen_random_uuid(),
  area_id      uuid not null references public.areas(id)      on delete restrict,
  category_id  uuid not null references public.categories(id) on delete restrict,
  slug         text not null,
  title        text not null,
  summary      text not null,            -- one line; used on cards + meta description
  description  text,                     -- longer body for the detail page
  address      text,                     -- human-readable venue address (a public place)
  lat          double precision,         -- optional venue coords (a place, NOT a user)
  lng          double precision,
  cost_tier    text not null default 'free' check (cost_tier in ('free', 'low', 'mid', 'high')),
  website_url  text,
  booking_url  text,
  cover_path   text,                     -- object path in the activity-photos bucket; null -> designed fallback
  status       text not null default 'draft' check (status in ('draft', 'published', 'hidden')),
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint activities_slug_len    check (char_length(slug) between 1 and 120),
  constraint activities_slug_kebab  check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint activities_area_slug_uniq unique (area_id, slug),
  constraint activities_lat_chk     check (lat is null or lat between  -90 and  90),
  constraint activities_lng_chk     check (lng is null or lng between -180 and 180)
);

create index activities_area_idx      on public.activities (area_id);
create index activities_category_idx  on public.activities (category_id);
create index activities_published_idx on public.activities (published_at desc) where status = 'published';

alter table public.activities enable row level security;

-- public read of PUBLISHED rows only; no client writes (seed/service-role only).
create policy "activities_select_published" on public.activities
  for select to anon, authenticated using (status = 'published');

grant select on public.activities to anon, authenticated;
revoke insert, update, delete, truncate on public.activities from anon, authenticated;

-- ---------------------------------------------------------------------------
-- areas — additively expose to anon for SEO. The Phase-1 areas_select_authenticated
-- policy is left in place; RLS policies are OR'd, so this only widens read.
-- ---------------------------------------------------------------------------
create policy "areas_select_anon" on public.areas
  for select to anon using (true);

grant select on public.areas to anon;
revoke insert, update, delete, truncate on public.areas from anon;

-- ---------------------------------------------------------------------------
-- Storage: a public bucket for activity cover photos. Public bucket => object
-- URLs resolve without a SELECT policy; we add NO storage.objects policies, so
-- there is no listing/enumeration and no client upload (covers are added via
-- dashboard/service-role until an authoring UI exists). next/image is wired to
-- this host; seeded rows have null covers and render a designed fallback.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('activity-photos', 'activity-photos', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Seed: a few real UK areas.
-- ---------------------------------------------------------------------------
insert into public.areas (slug, name, region) values
  ('cardiff', 'Cardiff', 'Wales'),
  ('bristol', 'Bristol', 'South West England'),
  ('leeds',   'Leeds',   'Yorkshire'),
  ('reading', 'Reading', 'South East England'),
  ('rhyl',    'Rhyl',    'Wales')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Seed: categories.
-- ---------------------------------------------------------------------------
insert into public.categories (slug, name, description, schema_type, sort_order) values
  ('soft-play',    'Soft play',                  'Indoor padded play centres for rainy days.',          'LocalBusiness',          1),
  ('parks',        'Parks & playgrounds',        'Free public green space and play areas.',             'Park',                   2),
  ('cafes',        'Dad-friendly cafés',         'Cafés that welcome buggies and little ones.',         'CafeOrCoffeeShop',       3),
  ('swim-classes', 'Swim classes',               'Parent-and-baby and toddler swimming sessions.',      'SportsActivityLocation', 4),
  ('playgroups',   'Playgroups & stay-and-play', 'Drop-in sessions to play and meet other parents.',    'LocalBusiness',          5)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Seed: ~15 published activities across the 5 areas + 5 categories.
-- area_id/category_id resolved by slug. Apostrophes are doubled per SQL.
-- ---------------------------------------------------------------------------
insert into public.activities
  (area_id, category_id, slug, title, summary, description, address, lat, lng, cost_tier, status, published_at)
select a.id, c.id, v.slug, v.title, v.summary, v.description, v.address, v.lat, v.lng, v.cost_tier, 'published', now()
from (values
  ('cardiff', 'soft-play',    'bay-bouncers-soft-play', 'Bay Bouncers Soft Play',
    'Padded play frames, a toddler zone and proper coffee a few minutes from Cardiff Bay.',
    'Three-tier soft play with a separate under-2s area, so younger and older siblings both have somewhere to go. Buggy parking inside and a quiet corner for feeds and naps.',
    'Unit 4, Hemingway Road, Cardiff CF10', 51.462, -3.165, 'low'),

  ('cardiff', 'parks',        'bute-park-riverside', 'Bute Park Riverside Walk',
    'Flat, buggy-friendly riverside paths through Cardiff''s biggest city-centre park.',
    'Wide tarmac paths along the Taff make this an easy pram walk in any weather, with open grass for older kids to run off steam. Public parkland, free to enter all year.',
    'Bute Park, North Road, Cardiff CF10 3ER', 51.487, -3.181, 'free'),

  ('cardiff', 'cafes',        'sleepy-otter-cafe', 'The Sleepy Otter Café',
    'Relaxed café with high chairs, a play nook and a no-rush table policy.',
    'Family-run spot where buggies aren''t a problem and staff don''t mind a long stay. Babyccino on the menu and a small toy box by the window.',
    '12 Wellfield Road, Cardiff CF24', 51.491, -3.166, 'low'),

  ('bristol', 'soft-play',    'harbourside-hideout-soft-play', 'Harbourside Hideout Soft Play',
    'Bright indoor play near Bristol Harbourside with a calm sensory room.',
    'Climbing frames and ball pits for the energetic, plus a low-stimulation sensory space for when it all gets a bit much. Step-free access throughout.',
    'Gas Ferry Road, Bristol BS1', 51.448, -2.611, 'low'),

  ('bristol', 'parks',        'ashton-court-meadows', 'Ashton Court Meadows',
    'Huge open estate with gentle meadow paths and deer to spot.',
    'Acres of public parkland on Bristol''s edge with easy buggy routes near the mansion and bigger walks for confident toddlers. Free entry; pay-and-display parking.',
    'Ashton Court Estate, Long Ashton, Bristol BS41', 51.442, -2.643, 'free'),

  ('bristol', 'swim-classes', 'little-otters-swim-school', 'Little Otters Swim School',
    'Small-group parent-and-baby swim sessions in a warm teaching pool.',
    'Structured classes from a few months old with a maximum of six families per session, so there''s space and a steady water temperature. Changing benches and family cubicles on site.',
    'Easton Leisure Centre, Bristol BS5', 51.461, -2.560, 'mid'),

  ('leeds',   'soft-play',    'woolly-mammoth-play-barn', 'Woolly Mammoth Play Barn',
    'Barn-style soft play on the edge of Leeds with loads of buggy space.',
    'A big open play frame, a dedicated baby area and plenty of seating where you can actually see your kids. Free parking right outside.',
    'Whitehall Road, Leeds LS12', 53.793, -1.571, 'low'),

  ('leeds',   'cafes',        'crumb-and-cushion-cafe', 'Crumb & Cushion Family Café',
    'Café built around families, with a carpeted play area in full view of the tables.',
    'Order a coffee and keep an eye on the little one from your seat. Microwave for warming food and a stack of board books by the sofas.',
    'North Lane, Headingley, Leeds LS6', 53.819, -1.580, 'low'),

  ('leeds',   'playgroups',   'hunslet-dads-and-toddlers', 'Hunslet Dads & Toddlers',
    'Saturday-morning stay-and-play aimed at dads and their under-5s.',
    'A relaxed weekly session with toys, songs and a brew, run specifically so dads have somewhere to bring the kids and meet others. Just turn up; small donation welcome.',
    'Hunslet Community Hub, Leeds LS10', 53.776, -1.539, 'free'),

  ('reading', 'parks',        'forbury-gardens-play-area', 'Forbury Gardens Play Area',
    'Victorian town-centre gardens with a fenced toddler play area.',
    'A small, enclosed playground inside Reading''s historic public gardens — handy for a short stop in town. Free and open daily.',
    'Forbury Gardens, Reading RG1', 51.456, -0.969, 'free'),

  ('reading', 'swim-classes', 'thames-splash-swim-classes', 'Thames Splash Swim Classes',
    'Parent-and-toddler swimming with a focus on water confidence, not lengths.',
    'Gentle weekday sessions for babies and toddlers in a warm pool, with a qualified teacher in the water with you. Family changing and buggy storage available.',
    'Rivermead Leisure Complex, Reading RG1', 51.463, -0.981, 'mid'),

  ('reading', 'cafes',        'the-buggy-stop-cafe', 'The Buggy Stop Café',
    'Step-free café with room to park the pram and a small soft-play corner.',
    'Wide doors, plenty of high chairs and a fenced play corner so you can finish a hot drink. Quieter mid-morning if you''re after calm.',
    'Oxford Road, Reading RG1', 51.456, -0.985, 'low'),

  ('rhyl',    'parks',        'marine-lake-play-park', 'Marine Lake Play Park',
    'Seafront play park beside Rhyl''s Marine Lake with sea views.',
    'Open play equipment a short walk from the prom, with flat paths for buggies and space to picnic. Free public park near the seafront.',
    'Marine Lake, Rhyl LL18', 53.319, -3.499, 'free'),

  ('rhyl',    'soft-play',    'seaside-scramblers-soft-play', 'Seaside Scramblers Soft Play',
    'Indoor play right on the Rhyl seafront for rainy-day backup.',
    'Two-level soft play with a toddler zone and sea-facing windows, handy when the weather turns on the coast. Café on site with high chairs.',
    'East Parade, Rhyl LL18', 53.322, -3.486, 'low'),

  ('rhyl',    'playgroups',   'rhyl-seafront-stay-and-play', 'Rhyl Seafront Stay & Play',
    'Friendly weekday stay-and-play session near the promenade.',
    'Toys, craft and a singalong for under-5s in a welcoming hall a few minutes from the seafront. Parents and carers stay throughout; tea and biscuits provided.',
    'Town Hall, Wellington Road, Rhyl LL18', 53.321, -3.491, 'free')
) as v(area_slug, cat_slug, slug, title, summary, description, address, lat, lng, cost_tier)
join public.areas      a on a.slug = v.area_slug
join public.categories c on c.slug = v.cat_slug
on conflict (area_id, slug) do nothing;

-- ---------------------------------------------------------------------------
-- Additive reconciliation: fill profiles.area_id from the free-text area_slug
-- where it matches a seeded area. Leaves area_slug/area_label, onboarding and
-- the deck untouched. Only fills currently-null area_id.
-- ---------------------------------------------------------------------------
update public.profiles p
set    area_id = a.id
from   public.areas a
where  p.area_slug = a.slug
  and  p.area_id is null;

-- ---------------------------------------------------------------------------
-- Comments.
-- ---------------------------------------------------------------------------
comment on table public.categories is 'Activity categories (reference data). schema_type drives schema.org JSON-LD @type. Anon-readable.';
comment on table public.activities is 'Evergreen places for the Activity Finder SEO surface. Anon reads status=''published'' only; no client writes (seed/service-role).';
comment on column public.activities.cover_path is 'Object path in the public activity-photos storage bucket; null renders a designed fallback.';
comment on column public.activities.lat is 'Venue (place) latitude — safe to expose. Never a user location.';
