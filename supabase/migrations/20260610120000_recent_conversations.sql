-- ============================================================================
-- 0021 — recent_conversations(): one-round-trip feed for the web side rails.
--
--   Returns the caller's matches with the other dad's public profile fields,
--   the latest message (if any) and the unread count, ordered by most recent
--   activity. Today the same data needs listMatches() + unread_counts() + a
--   per-match latest-message query (N+1); the desktop "friends / new
--   messages" rail wants it in one call.
--
--   SECURITY: SECURITY INVOKER — RLS does ALL the gating, same model as
--   unread_counts():
--     * matches:        matches_select_participants (participants only)
--     * messages:       messages_select_participants (participant + no block)
--     * message_reads:  message_reads_select_own
--     * profiles:       profiles select policy (self + active, non-blocked)
--   A non-participant simply sees zero rows. Nothing privileged, no new
--   policies, no table changes.
-- ============================================================================
create function public.recent_conversations(p_limit integer default 8)
returns table (
  match_id       uuid,
  other_id       uuid,
  display_name   text,
  avatar_url     text,
  area_label     text,
  last_body      text,
  last_at        timestamptz,
  last_sender_id uuid,
  unread         bigint
)
language sql stable security invoker set search_path = public
as $$
  select m.id,
         p.id,
         p.display_name,
         p.avatar_url,
         p.area_label,
         lm.body,
         lm.created_at,
         lm.sender_id,
         coalesce(un.cnt, 0)::bigint
  from public.matches m
  join public.profiles p
    on p.id = case when m.user_a = (select auth.uid()) then m.user_b else m.user_a end
  left join lateral (
    select msg.body, msg.created_at, msg.sender_id
    from public.messages msg
    where msg.match_id = m.id
    order by msg.created_at desc
    limit 1
  ) lm on true
  left join lateral (
    select count(*) as cnt
    from public.messages msg
    where msg.match_id = m.id
      and msg.sender_id <> (select auth.uid())
      and msg.created_at > coalesce(
        (select r.last_read_at from public.message_reads r
         where r.match_id = m.id and r.user_id = (select auth.uid())),
        'epoch'::timestamptz)
  ) un on true
  where (select auth.uid()) in (m.user_a, m.user_b)
  order by coalesce(lm.created_at, m.created_at) desc
  limit greatest(1, least(coalesce(p_limit, 8), 50));
$$;

revoke execute on function public.recent_conversations(integer) from public, anon;
grant  execute on function public.recent_conversations(integer) to authenticated;

comment on function public.recent_conversations(integer) is
  'Caller''s matches + other-profile fields + latest message + unread count in one call, newest activity first. SECURITY INVOKER: RLS on matches/messages/message_reads/profiles does all the gating (same model as unread_counts).';
