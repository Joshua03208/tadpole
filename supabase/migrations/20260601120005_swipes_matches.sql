-- ============================================================================
-- 0005 — swipes, matches, the match-creation trigger, the masked swipe deck,
--        and unmatch. (blocks already exist from migration 0002.)
--
-- Non-negotiables enforced here:
--   * matches are created ONLY by the handle_swipe trigger — there is NO client
--     insert/update/delete policy or grant on matches, ever.
--   * a user can read ONLY their own swipes (never who passed on them).
--   * get_swipe_deck returns a MASKED projection (no lat/lng) and never reads
--     profile_locations.
-- ============================================================================

-- ---- swipes ----------------------------------------------------------------
create table public.swipes (
  id         uuid primary key default gen_random_uuid(),
  swiper_id  uuid not null references public.profiles (id) on delete cascade,
  target_id  uuid not null references public.profiles (id) on delete cascade,
  direction  text not null,
  created_at timestamptz not null default now(),
  unique (swiper_id, target_id),
  constraint swipes_not_self   check (swiper_id <> target_id),
  constraint swipes_direction  check (direction in ('like','pass'))
);

create index swipes_target_like_idx
  on public.swipes (target_id, swiper_id) where direction = 'like';

-- ---- matches (trigger-only) ------------------------------------------------
create table public.matches (
  id         uuid primary key default gen_random_uuid(),
  user_a     uuid not null references public.profiles (id) on delete cascade,
  user_b     uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint matches_canonical check (user_a < user_b),
  unique (user_a, user_b)
);

create index matches_user_b_idx on public.matches (user_b);

-- ---- match creation: in the DB, never trusting the client ------------------
-- On a reciprocal 'like' (and only if neither has blocked the other), insert
-- the canonical (least, greatest) match. SECURITY DEFINER so it can write to
-- matches even though no client can.
create function public.handle_swipe()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_reciprocal boolean;
  v_blocked    boolean;
begin
  if new.direction = 'like' then
    select exists (
      select 1 from public.swipes s
      where s.swiper_id = new.target_id
        and s.target_id = new.swiper_id
        and s.direction = 'like'
    ) into v_reciprocal;

    if v_reciprocal then
      select exists (
        select 1 from public.blocks b
        where (b.blocker_id = new.swiper_id and b.blocked_id = new.target_id)
           or (b.blocker_id = new.target_id and b.blocked_id = new.swiper_id)
      ) into v_blocked;

      if not v_blocked then
        insert into public.matches (user_a, user_b)
        values (least(new.swiper_id, new.target_id), greatest(new.swiper_id, new.target_id))
        on conflict (user_a, user_b) do nothing;
      end if;
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.handle_swipe() from public;

create trigger on_swipe_insert
  after insert on public.swipes
  for each row execute function public.handle_swipe();

-- ---- the swipe deck: masked projection (no lat/lng) ------------------------
create function public.get_swipe_deck(
  p_limit           int  default 20,
  p_parenting_stage text default null,
  p_area_id         uuid default null
)
returns table (
  id              uuid,
  display_name    text,
  bio             text,
  avatar_url      text,
  parenting_stage text,
  area_id         uuid,
  interests       text[],
  created_at      timestamptz
)
language sql stable security definer set search_path = public
as $$
  select p.id, p.display_name, p.bio, p.avatar_url, p.parenting_stage,
         p.area_id, p.interests, p.created_at
  from public.profiles p
  where p.id <> (select auth.uid())
    and p.deleted_at is null
    and p.status = 'active'
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
    and (p_area_id is null or p.area_id = p_area_id)
  order by
    (p.area_id is not distinct from
      (select area_id from public.profiles where id = (select auth.uid())))::int desc,
    (p.parenting_stage is not distinct from
      (select parenting_stage from public.profiles where id = (select auth.uid())))::int desc,
    p.created_at desc
  limit greatest(1, least(coalesce(p_limit, 20), 100));
$$;
revoke execute on function public.get_swipe_deck(int, text, uuid) from public;
grant  execute on function public.get_swipe_deck(int, text, uuid) to authenticated;

-- ---- unmatch (optionally block) -------------------------------------------
create function public.unmatch(p_other uuid, p_block boolean default false)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  delete from public.matches
  where user_a = least(v_uid, p_other) and user_b = greatest(v_uid, p_other);

  if p_block then
    insert into public.blocks (blocker_id, blocked_id)
    values (v_uid, p_other)
    on conflict (blocker_id, blocked_id) do nothing;
  end if;
end;
$$;
revoke execute on function public.unmatch(uuid, boolean) from public;
grant  execute on function public.unmatch(uuid, boolean) to authenticated;

-- ============================================================================
-- RLS
-- ============================================================================
alter table public.swipes  enable row level security;
alter table public.matches enable row level security;

-- swipes: insert own; read ONLY own (never who passed on you). No update/delete.
grant select, insert on public.swipes to authenticated;

create policy "swipes_insert_own"
  on public.swipes for insert to authenticated
  with check ((select auth.uid()) = swiper_id);

create policy "swipes_select_own"
  on public.swipes for select to authenticated
  using ((select auth.uid()) = swiper_id);

-- matches: read-only for the two participants. NO insert/update/delete policy
-- and NO write grant => a client can never forge or tamper with a match.
grant select on public.matches to authenticated;

create policy "matches_select_participants"
  on public.matches for select to authenticated
  using ((select auth.uid()) = user_a or (select auth.uid()) = user_b);
