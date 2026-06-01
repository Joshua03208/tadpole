-- ============================================================================
-- 0017 — Knowledge Hub (guides): GENERAL-INFORMATION content for dads.
--
--   Mirrors the Activity Finder (0015): anon reads PUBLISHED only, server-
--   authoritative (seeded / service-role; takedown via status='hidden'), no
--   client write policy. RLS default-deny.
--
--   SAFETY (this is the most sensitive surface — build to docs/SAFETY_POLICY.md):
--   * All content is GENERAL INFORMATION, NOT medical/clinical advice. The app
--     renders a prominent "not medical advice" disclaimer + persistent crisis
--     signposting (999 / Samaritans 116 123 / CALM 0800 58 58 58 / Shout SHOUT
--     to 85258 / NHS 111) on every guide.
--   * Authorship is honest: guides are attributed to a clearly-INSTITUTIONAL
--     verified_expert account ("Tadpole Wellbeing Team") — never a fabricated
--     named clinician. The disclaimer applies even to expert-attributed content.
--   * PUBLIC LAUNCH IS GATED EXTERNALLY (not by this migration): qualified
--     safeguarding/legal sign-off of the crisis wording, helpline re-verification
--     (policy numbers were "verified May 2026"), and a DPIA update for special-
--     category (mental-health) data must clear before this goes live to real users.
--
--   Decisions (founder, 2026-06-01): attribute via a verified_expert team profile;
--   five categories; flat globally-unique /guides/<slug>; editorial takedown only
--   (no reports.target_type change — guides are not user-generated content).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- guide_categories — reference table (mirrors public.categories).
-- ---------------------------------------------------------------------------
create table public.guide_categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now(),
  constraint guide_categories_slug_len   check (char_length(slug) between 1 and 80),
  constraint guide_categories_slug_kebab check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

alter table public.guide_categories enable row level security;

create policy "guide_categories_select_public" on public.guide_categories
  for select to anon, authenticated using (true);

grant select on public.guide_categories to anon, authenticated;
revoke insert, update, delete, truncate on public.guide_categories from anon, authenticated;

-- ---------------------------------------------------------------------------
-- guides — flat, globally-unique slug. author_id -> a verified_expert profile
-- (ON DELETE SET NULL: a removed author leaves the published guide intact).
-- ---------------------------------------------------------------------------
create table public.guides (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid not null references public.guide_categories(id) on delete restrict,
  author_id    uuid references public.profiles(id) on delete set null,
  slug         text not null unique,
  title        text not null,
  summary      text not null,              -- one line; cards + meta description
  body         text,                       -- the guide content (general info)
  cover_path   text,                       -- object path in the guide-images bucket; null -> designed fallback
  schema_type  text not null default 'Article' check (schema_type in ('Article', 'HowTo', 'FAQPage')),
  status       text not null default 'draft' check (status in ('draft', 'published', 'hidden')),
  published_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint guides_slug_len   check (char_length(slug) between 1 and 160),
  constraint guides_slug_kebab check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create index guides_category_idx  on public.guides (category_id);
create index guides_author_idx    on public.guides (author_id);
create index guides_published_idx on public.guides (published_at desc) where status = 'published';

alter table public.guides enable row level security;

create policy "guides_select_published" on public.guides
  for select to anon, authenticated using (status = 'published');

grant select on public.guides to anon, authenticated;
revoke insert, update, delete, truncate on public.guides from anon, authenticated;

-- keep updated_at fresh (reuses the existing trigger fn).
create trigger guides_set_updated_at
  before update on public.guides
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Storage: public bucket for guide cover/inline images. Public bucket => object
-- URLs resolve without a SELECT policy; NO storage.objects policies, so no
-- listing/enumeration and no client upload (added via dashboard/service-role).
-- Seeded guides have null cover_path and render a designed fallback.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('guide-images', 'guide-images', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Seed: five categories.
-- ---------------------------------------------------------------------------
insert into public.guide_categories (slug, name, description, sort_order) values
  ('mental-wellbeing',          'Mental wellbeing',        'Looking after your head — stress, low mood, isolation, and asking for help.', 1),
  ('becoming-a-dad',            'Becoming a dad',          'The early days — the transition to fatherhood, bonding, and finding your feet.', 2),
  ('family-and-relationships',  'Family & relationships',  'Partner support, co-parenting, and keeping relationships strong.', 3),
  ('everyday-fatherhood',       'Everyday fatherhood',     'Practical, general tips for the day-to-day of raising kids.', 4),
  ('looking-after-yourself',    'Looking after yourself',  'Sleep, physical health, work-life balance, and keeping your own mates.', 5)
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Seed: the INSTITUTIONAL verified_expert author. Creating the auth.users row
-- fires handle_new_user (creates profile + profile_private via the 18+ gate);
-- we then promote it to verified_expert (a service-role write — the role column
-- is client-locked). This is an attribution-only team account (no password / no
-- login), deliberately NOT a fabricated individual clinician.
-- ---------------------------------------------------------------------------
insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
values (
  '0e000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  'wellbeing-team@tadpole.app',
  '{"display_name":"Tadpole Wellbeing Team","date_of_birth":"1990-01-01"}',
  now(), now()
)
on conflict (id) do nothing;

-- The role column is client-locked by the profiles_guard_privileged trigger
-- (no self-escalation; only an admin caller may change role/status). A migration
-- is a trusted, version-controlled service-role seed, so disable that ONE guard
-- for this scoped promotion of the institutional team account, then re-enable it.
-- The guard's purpose — blocking client-side self-escalation — is unaffected.
alter table public.profiles disable trigger profiles_guard_privileged;

update public.profiles
set role        = 'verified_expert',
    bio         = 'General wellbeing and parenting information from the Tadpole team. Not medical advice.',
    onboarded_at = coalesce(onboarded_at, now())
where id = '0e000000-0000-0000-0000-000000000001';

alter table public.profiles enable trigger profiles_guard_privileged;

-- ---------------------------------------------------------------------------
-- Seed: ~9 published guides across the five categories. GENERAL INFORMATION
-- only — supportive, signposting, no diagnosis/treatment/methods. Apostrophes
-- are doubled per SQL.
-- ---------------------------------------------------------------------------
insert into public.guides (category_id, author_id, slug, title, summary, body, schema_type, status, published_at)
select c.id, '0e000000-0000-0000-0000-000000000001', v.slug, v.title, v.summary, v.body, 'Article', 'published', now()
from (values
  ('mental-wellbeing', 'feeling-low-after-becoming-a-dad', 'Feeling low after becoming a dad',
    'Low mood is common in early fatherhood — what to look out for, and where to turn.',
    'Becoming a dad is a huge change, and feeling up and down is normal. But if low mood, irritability or feeling numb hangs around for more than a couple of weeks, it''s worth paying attention to — you''re not weak, and you''re far from the only dad who feels it.

Talking helps more than most of us expect: a partner, a mate, or your GP. Getting outside, grabbing sleep where you can, and easing off the pressure all make a difference too. If you''re struggling, your GP is a good first step, and the free helplines on this page are there any time.'),

  ('mental-wellbeing', 'signs-its-more-than-a-rough-patch', 'Signs it might be more than a rough patch',
    'Telling the difference between a hard few weeks and something worth getting help for.',
    'Everyone has rough patches. The things worth noticing are when they don''t lift: losing interest in things you used to enjoy, trouble sleeping even when the baby sleeps, snapping at people you love, or feeling like you''re just going through the motions.

None of this means anything is wrong with you as a dad — it means you''re carrying a lot. Reaching out early makes it easier to turn around. Your GP can talk options through with you, and the free lines on this page are there 24/7 if you need someone now.'),

  ('becoming-a-dad', 'first-few-weeks-as-a-new-dad', 'The first few weeks: what no one tells you',
    'The early days are intense and messy. Here is what tends to catch new dads off guard.',
    'The first few weeks are a blur of broken sleep, big feelings and not much of a routine — and that''s completely normal. You might feel useless one minute and fiercely protective the next. Both are fine.

You don''t have to have it all figured out. Take the night feeds you can, learn by doing, and let people help. The bond grows through the ordinary stuff — carrying, changing, soothing — not one perfect moment.'),

  ('becoming-a-dad', 'bonding-with-your-baby', 'Bonding with your baby',
    'Bonding is not always instant — and that does not make you a bad dad.',
    'Lots of dads expect a lightning-bolt moment and worry when it doesn''t come. For many, the bond builds slowly through skin-to-skin time, talking and singing, bath time and walks — the repetition is the point.

If weeks pass and you still feel distant or flat, that''s worth a gentle chat with your GP or health visitor. It''s common, it''s not your fault, and it''s very workable.'),

  ('family-and-relationships', 'supporting-your-partner-after-birth', 'Supporting your partner after birth',
    'Practical ways to show up for your partner in those first weeks.',
    'The weeks after birth are huge for your partner, physically and emotionally. The most useful things are often the least glamorous: taking the baby so they can sleep or shower, handling meals and chores without being asked, and just listening without trying to fix everything.

Keep an eye on how they''re doing — and on how you''re doing too, because you can both be running on empty. If either of you seems to be struggling more than feels right, encourage a chat with the GP or health visitor.'),

  ('family-and-relationships', 'co-parenting-apart', 'Co-parenting when you are not together',
    'Keeping things steady for your kids when you and their other parent are apart.',
    'Co-parenting after a split is hard, and it rarely looks like the tidy version online. What helps most is consistency for the kids: predictable handovers, not putting them in the middle, and keeping adult disagreements away from them.

Be kind to yourself — this is a genuine loss as well as a logistical puzzle. Leaning on mates, and on the support lines on this page if it gets heavy, is a strength, not a failing.'),

  ('everyday-fatherhood', 'surviving-sleep-deprivation', 'Surviving the sleep-deprived months',
    'General, been-there tips for getting through the worst of the broken nights.',
    'Sleep deprivation makes everything harder — patience, mood, even driving. Where you can, tag-team the nights so each of you gets one longer stretch, nap when the baby naps instead of doing jobs, and lower the bar on everything non-essential for a while.

It does pass. If exhaustion ever tips into feeling unsafe — like nodding off at the wheel — treat that as a reason to ask for help, not to push through.'),

  ('looking-after-yourself', 'keeping-your-mates-as-a-new-dad', 'Keeping your mates when you become a dad',
    'Friendships slip easily after a baby — and they matter more than ever.',
    'It''s easy for mates to drift when your world shrinks to feeds and naps, but isolation is one of the things that wears dads down most. You don''t need big nights out — a walk with the pram, a quick call, or meeting another dad for a coffee all count.

That''s a big part of why Tadpole exists: making it easier to find other dads nearby who get it. Reaching out first is rarely as awkward as it feels.'),

  ('looking-after-yourself', 'making-time-for-yourself', 'Making time for yourself without the guilt',
    'A bit of time for you is not selfish — it is what keeps you going.',
    'When you''re responsible for a small human, your own needs slide to the bottom of the list. But a knackered, depleted dad helps no one. Half an hour for exercise, a hobby, or just quiet is maintenance, not indulgence.

Swap time with your partner so you each get a break, and try not to feel guilty about it. Looking after yourself is part of looking after your family.')
) as v(cat_slug, slug, title, summary, body)
join public.guide_categories c on c.slug = v.cat_slug
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------------
-- Comments.
-- ---------------------------------------------------------------------------
comment on table public.guides is 'Knowledge Hub guides: GENERAL INFORMATION (not medical advice). Anon reads status=''published'' only; no client writes (seed/service-role); takedown via status=''hidden''. The app shows a prominent not-medical-advice disclaimer + persistent crisis signposting.';
comment on table public.guide_categories is 'Knowledge Hub categories (reference data). Anon-readable.';
comment on column public.guides.author_id is 'Attribution to a verified_expert profile (institutional team account for seeded demo content). ON DELETE SET NULL.';
