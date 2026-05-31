-- ============================================================
-- Tadpole — Swipe / Match data model
-- "Bumble BFF for dads": swipe, mutual like = match, then chat.
-- Run as a Supabase migration. Assumes the `profiles` table from
-- the main plan already exists.
-- ============================================================

-- ------------------------------------------------------------
-- PROFILES  (recap — already in your schema, shown for context)
-- ------------------------------------------------------------
-- create table profiles (
--   id uuid primary key references auth.users on delete cascade,
--   display_name text not null,
--   bio text,
--   avatar_url text,
--   parenting_stage text check (parenting_stage in
--     ('expecting','newborn','infant','toddler','child','multiple')),
--   area text,
--   lat double precision,
--   lng double precision,
--   interests text[],
--   created_at timestamptz default now()
-- );


-- ------------------------------------------------------------
-- SWIPES  — one row per swipe. The raw input to matching.
-- ------------------------------------------------------------
create table swipes (
  id          uuid primary key default gen_random_uuid(),
  swiper_id   uuid not null references profiles(id) on delete cascade,
  target_id   uuid not null references profiles(id) on delete cascade,
  direction   text not null check (direction in ('like','pass')),
  created_at  timestamptz not null default now(),
  unique (swiper_id, target_id),        -- can't swipe the same dad twice
  check  (swiper_id <> target_id)       -- can't swipe yourself
);

-- Fast lookups for "has X already liked me?" (the reciprocity check)
create index swipes_target_like_idx
  on swipes (target_id, swiper_id)
  where direction = 'like';


-- ------------------------------------------------------------
-- MATCHES  — created automatically when both dads swipe 'like'.
-- user_a < user_b is enforced so (A,B) and (B,A) can't both exist.
-- ------------------------------------------------------------
create table matches (
  id          uuid primary key default gen_random_uuid(),
  user_a      uuid not null references profiles(id) on delete cascade,
  user_b      uuid not null references profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  check  (user_a < user_b),
  unique (user_a, user_b)
);


-- ------------------------------------------------------------
-- BLOCKS  — safety. A block hides both dads from each other.
-- ------------------------------------------------------------
create table blocks (
  id          uuid primary key default gen_random_uuid(),
  blocker_id  uuid not null references profiles(id) on delete cascade,
  blocked_id  uuid not null references profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (blocker_id, blocked_id),
  check  (blocker_id <> blocked_id)
);


-- ============================================================
-- MATCH CREATION  — runs in the DB, never trusts the client.
-- On every 'like' swipe, check for a reciprocal 'like'. If found,
-- create the match (canonical ordering). SECURITY DEFINER lets the
-- trigger write to matches even though clients can't insert there.
-- ============================================================
create or replace function handle_swipe()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  reciprocal boolean;
begin
  if new.direction = 'like' then
    select exists (
      select 1 from swipes
      where swiper_id = new.target_id
        and target_id = new.swiper_id
        and direction = 'like'
    ) into reciprocal;

    if reciprocal then
      insert into matches (user_a, user_b)
      values (
        least(new.swiper_id, new.target_id),
        greatest(new.swiper_id, new.target_id)
      )
      on conflict (user_a, user_b) do nothing;
    end if;
  end if;
  return new;
end;
$$;

create trigger on_swipe_insert
  after insert on swipes
  for each row execute function handle_swipe();


-- ============================================================
-- THE SWIPE DECK  — the cards a dad sees. Excludes himself,
-- anyone he's already swiped, and anyone blocked either way.
-- Prioritises same area + same parenting stage, then random.
-- Filters are optional (null = ignore that filter).
-- ============================================================
create or replace function get_swipe_deck(
  p_limit          int     default 20,
  p_parenting_stage text   default null,
  p_area           text    default null
)
returns setof profiles
language sql
security definer
stable
set search_path = public
as $$
  select p.*
  from profiles p
  where p.id <> auth.uid()
    -- not already swiped
    and not exists (
      select 1 from swipes s
      where s.swiper_id = auth.uid() and s.target_id = p.id
    )
    -- not blocked in either direction
    and not exists (
      select 1 from blocks b
      where (b.blocker_id = auth.uid() and b.blocked_id = p.id)
         or (b.blocker_id = p.id and b.blocked_id = auth.uid())
    )
    -- optional filters
    and (p_parenting_stage is null or p.parenting_stage = p_parenting_stage)
    and (p_area is null or p.area = p_area)
  order by
    (p.area = (select area from profiles where id = auth.uid()))::int desc,
    (p.parenting_stage = (select parenting_stage from profiles where id = auth.uid()))::int desc,
    random()
  limit p_limit;
$$;


-- ============================================================
-- UNMATCH  — removes the match. Optionally also block.
-- ============================================================
create or replace function unmatch(p_other uuid, p_block boolean default false)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from matches
  where (user_a = least(auth.uid(), p_other)
         and user_b = greatest(auth.uid(), p_other));

  if p_block then
    insert into blocks (blocker_id, blocked_id)
    values (auth.uid(), p_other)
    on conflict do nothing;
  end if;
end;
$$;


-- ============================================================
-- ROW LEVEL SECURITY  — the actual security boundary.
-- ============================================================
alter table swipes  enable row level security;
alter table matches enable row level security;
alter table blocks  enable row level security;

-- SWIPES: you may record your own swipes, and read ONLY your own.
-- (Critical privacy rule: you must NOT be able to see who passed on you.)
create policy "insert own swipes" on swipes
  for insert with check (auth.uid() = swiper_id);

create policy "read own swipes" on swipes
  for select using (auth.uid() = swiper_id);

-- MATCHES: read-only for the two people in the match.
-- No insert/update/delete policy => clients can't forge or tamper.
-- Rows are created by the trigger and removed via the unmatch() function.
create policy "read own matches" on matches
  for select using (auth.uid() = user_a or auth.uid() = user_b);

-- BLOCKS: you manage your own blocks.
create policy "insert own blocks" on blocks
  for insert with check (auth.uid() = blocker_id);

create policy "read own blocks" on blocks
  for select using (auth.uid() = blocker_id);

create policy "delete own blocks" on blocks
  for delete using (auth.uid() = blocker_id);


-- ============================================================
-- NOTES / EXTENSIONS (not built here, but designed for):
--   • Daily swipe limits for the freemium tier: add a function that
--     counts today's swipes for auth.uid() and rejects past N unless
--     the user has an active premium subscription. Premium = unlimited.
--   • "Super like" / priority: add a 'direction' value or a separate
--     boost flag; the trigger logic is unchanged.
--   • Distance-based deck: once PostGIS is enabled, replace the area
--     match with a radius filter on a geography column.
--   • Messaging (phase 2): a messages table keyed on match_id, with an
--     RLS policy that only lets the two matched users read/write. The
--     match is the gate — no match, no chat.
-- ============================================================
