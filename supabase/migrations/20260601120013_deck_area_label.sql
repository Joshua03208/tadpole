-- ============================================================================
-- 0013 — update get_swipe_deck to the coarse-area model (Phase 2 added
-- profiles.area_label / area_slug; the deck still returned the now-unused
-- area_id). The masked projection now returns area_label + area_slug (still NO
-- lat/lng), and same-area sort / the optional filter use area_slug.
-- Changing a function's return type requires drop + recreate.
-- ============================================================================

drop function if exists public.get_swipe_deck(int, text, uuid);

create function public.get_swipe_deck(
  p_limit           int  default 20,
  p_parenting_stage text default null,
  p_area_slug       text default null
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
language sql stable security definer set search_path = public
as $$
  select p.id, p.display_name, p.bio, p.avatar_url, p.parenting_stage,
         p.area_label, p.area_slug, p.interests, p.created_at
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
    and (p_area_slug is null or p.area_slug = p_area_slug)
  order by
    (p.area_slug is not distinct from
      (select area_slug from public.profiles where id = (select auth.uid())))::int desc,
    (p.parenting_stage is not distinct from
      (select parenting_stage from public.profiles where id = (select auth.uid())))::int desc,
    p.created_at desc
  limit greatest(1, least(coalesce(p_limit, 20), 100));
$$;
revoke execute on function public.get_swipe_deck(int, text, text) from public, anon;
grant  execute on function public.get_swipe_deck(int, text, text) to authenticated;
