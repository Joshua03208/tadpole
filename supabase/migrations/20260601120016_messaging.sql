-- ============================================================================
-- 0016 — Phase 5 messaging: realtime two-party chat, gated on a match.
--
--   THE MATCH IS THE GATE (RLS, not just UI): a message is readable/insertable
--   ONLY by the two participants of its match, and only while a match exists and
--   there is no block between them. A third/unmatched user can never read or
--   write. The SAME messages SELECT policy gates the Realtime (postgres_changes)
--   stream — one gate, no separate channel policy.
--
--   TWO-PARTY ONLY: there is deliberately NO moderator read policy on messages.
--   Moderators work solely from report snapshots (see report_message below).
--
--   DELETE-ON-UNMATCH / SNAPSHOT-ON-REPORT: messages.match_id cascades on match
--   delete, so unmatch / block_user / report_and_block (all of which DELETE the
--   canonical match) take the live thread with them. report_message snapshots
--   the reported message + recent context + sender into reports.snapshot BEFORE
--   it blocks + deletes the match, so the evidence survives the cascade.
--
--   Decisions (founder, 2026-06-01): Realtime = Postgres Changes; lightweight
--   unread via message_reads.last_read_at; body <= 2000 chars; rate ceiling
--   ~10/10s + ~1000/day; snapshot = reported message + ~15 context + sender.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- messages — the conversation IS the match (match_id), no separate table.
-- ---------------------------------------------------------------------------
create table public.messages (
  id         uuid primary key default gen_random_uuid(),
  match_id   uuid not null references public.matches(id)  on delete cascade,
  sender_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now(),
  constraint messages_body_len check (char_length(body) between 1 and 2000)
);
create index messages_match_created_idx  on public.messages (match_id, created_at);
create index messages_sender_created_idx on public.messages (sender_id, created_at); -- rate-ceiling window

alter table public.messages enable row level security;

-- Participant-only read. The EXISTS against matches is the gate; has_block_with
-- is defence-in-depth (block_user already deletes the match). This very policy
-- is what Realtime re-checks per row, so non-participants never receive the
-- live stream either.
create policy "messages_select_participants" on public.messages
  for select to authenticated
  using (
    exists (
      select 1 from public.matches m
      where m.id = messages.match_id
        and ((select auth.uid()) = m.user_a or (select auth.uid()) = m.user_b)
        and not public.has_block_with(
          case when m.user_a = (select auth.uid()) then m.user_b else m.user_a end
        )
    )
  );

-- Sender-only insert, and only into a match you are a participant of (and not
-- blocked). No client UPDATE/DELETE: edits/redactions aren't a thing, and
-- removal happens via match-delete cascade.
create policy "messages_insert_own" on public.messages
  for insert to authenticated
  with check (
    (select auth.uid()) = sender_id
    and exists (
      select 1 from public.matches m
      where m.id = messages.match_id
        and ((select auth.uid()) = m.user_a or (select auth.uid()) = m.user_b)
        and not public.has_block_with(
          case when m.user_a = (select auth.uid()) then m.user_b else m.user_a end
        )
    )
  );

grant select, insert on public.messages to authenticated;
revoke update, delete, truncate on public.messages from authenticated;
revoke all on public.messages from anon;

-- ---------------------------------------------------------------------------
-- message rate ceiling (abuse-only, BEFORE INSERT, un-bypassable).
-- ---------------------------------------------------------------------------
create function public.enforce_message_ceiling()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_burst int;
  v_day   int;
begin
  select count(*) into v_burst
  from public.messages
  where sender_id = new.sender_id and created_at > now() - interval '10 seconds';
  if v_burst >= 10 then
    raise exception 'message rate limit reached (slow down)' using errcode = 'P0001';
  end if;

  select count(*) into v_day
  from public.messages
  where sender_id = new.sender_id and created_at > now() - interval '24 hours';
  if v_day >= 1000 then
    raise exception 'daily message limit reached' using errcode = 'P0001';
  end if;

  return new;
end;
$$;
revoke execute on function public.enforce_message_ceiling() from public, anon, authenticated;

create trigger messages_enforce_ceiling
  before insert on public.messages
  for each row execute function public.enforce_message_ceiling();

-- ---------------------------------------------------------------------------
-- message_reads — lightweight per-conversation read marker for unread counts.
-- ---------------------------------------------------------------------------
create table public.message_reads (
  match_id     uuid not null references public.matches(id)  on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (match_id, user_id)
);

alter table public.message_reads enable row level security;

create policy "message_reads_select_own" on public.message_reads
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "message_reads_insert_own" on public.message_reads
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.matches m
      where m.id = match_id
        and ((select auth.uid()) = m.user_a or (select auth.uid()) = m.user_b)
    )
  );

create policy "message_reads_update_own" on public.message_reads
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update on public.message_reads to authenticated;
revoke delete, truncate on public.message_reads from authenticated;
revoke all on public.message_reads from anon;

-- Unread counts per conversation for the signed-in user. SECURITY INVOKER so
-- RLS applies: it can only ever count the caller's own accessible messages.
create function public.unread_counts()
returns table (match_id uuid, unread bigint)
language sql stable security invoker set search_path = public
as $$
  select msg.match_id, count(*)::bigint as unread
  from public.messages msg
  where msg.sender_id <> (select auth.uid())
    and msg.created_at > coalesce(
      (select r.last_read_at from public.message_reads r
       where r.match_id = msg.match_id and r.user_id = (select auth.uid())),
      'epoch'::timestamptz)
  group by msg.match_id;
$$;
revoke execute on function public.unread_counts() from public, anon;
grant  execute on function public.unread_counts() to authenticated;

-- ---------------------------------------------------------------------------
-- report snapshot column — structured, moderator-readable evidence that
-- survives the conversation cascade. (target_type already allows 'message'.)
-- ---------------------------------------------------------------------------
alter table public.reports add column snapshot jsonb;

-- ---------------------------------------------------------------------------
-- report_message — snapshot FIRST (message + ~15 context + sender), then block
-- + delete the match (which cascades the live thread away). Atomic: if the
-- reporter cap (reports_on_insert) rejects, nothing is blocked/deleted.
-- ---------------------------------------------------------------------------
create function public.report_message(
  p_message_id uuid,
  p_reason     text,
  p_detail     text default null
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_uid      uuid := (select auth.uid());
  v_msg      record;
  v_match    record;
  v_other    uuid;
  v_snapshot jsonb;
  v_report_id uuid;
begin
  if v_uid is null then raise exception 'not authenticated' using errcode = '42501'; end if;

  select msg.id, msg.match_id, msg.sender_id, msg.body, msg.created_at
    into v_msg
  from public.messages msg
  where msg.id = p_message_id;
  if not found then raise exception 'message not found' using errcode = 'P0002'; end if;

  select m.id, m.user_a, m.user_b into v_match
  from public.matches m where m.id = v_msg.match_id;
  if not found then raise exception 'conversation not found' using errcode = 'P0002'; end if;

  -- caller must be a participant of the conversation and not the message author.
  if v_uid <> v_match.user_a and v_uid <> v_match.user_b then
    raise exception 'not a participant of this conversation' using errcode = '42501';
  end if;
  if v_uid = v_msg.sender_id then
    raise exception 'cannot report your own message' using errcode = '22023';
  end if;
  v_other := v_msg.sender_id; -- the reported user is the message author

  -- Snapshot: the reported message + the last ~15 messages of context (ending
  -- at the reported one, chronological) + a snapshot of the sender profile.
  v_snapshot := jsonb_build_object(
    'reported_message', jsonb_build_object(
      'id', v_msg.id, 'sender_id', v_msg.sender_id, 'body', v_msg.body, 'created_at', v_msg.created_at),
    'match_id', v_msg.match_id,
    'context', (
      select coalesce(jsonb_agg(c.obj order by c.created_at), '[]'::jsonb)
      from (
        select jsonb_build_object(
                 'id', cm.id, 'sender_id', cm.sender_id, 'body', cm.body, 'created_at', cm.created_at) as obj,
               cm.created_at
        from public.messages cm
        where cm.match_id = v_msg.match_id and cm.created_at <= v_msg.created_at
        order by cm.created_at desc
        limit 15
      ) c
    ),
    'sender', (
      select jsonb_build_object(
               'id', p.id, 'display_name', p.display_name,
               'avatar_url', p.avatar_url, 'area_label', p.area_label)
      from public.profiles p where p.id = v_msg.sender_id
    ),
    'captured_at', now()
  );

  -- Insert the report WITH the snapshot first (reports_on_insert enforces the
  -- reporter cap + escalates child_safety/self_harm/threats + writes audit).
  insert into public.reports
    (reporter_id, reported_profile_id, target_type, target_id, reason, detail, snapshot)
  values
    (v_uid, v_other, 'message', p_message_id, p_reason, p_detail, v_snapshot)
  returning id into v_report_id;

  -- THEN block + delete the match (cascades the live messages away).
  insert into public.blocks (blocker_id, blocked_id)
  values (v_uid, v_other)
  on conflict (blocker_id, blocked_id) do nothing;

  delete from public.matches
  where user_a = least(v_uid, v_other) and user_b = greatest(v_uid, v_other);

  return v_report_id;
end;
$$;
revoke execute on function public.report_message(uuid, text, text) from public, anon;
grant  execute on function public.report_message(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: deliver message INSERTs to participants. Delivery is gated by the
-- messages SELECT RLS above (postgres_changes re-checks it per subscriber), so
-- no separate channel policy is needed. Default replica identity (PK) is enough
-- for INSERT payloads; clients subscribe to INSERT only.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.messages;

-- ---------------------------------------------------------------------------
-- Comments.
-- ---------------------------------------------------------------------------
comment on table public.messages is 'Two-party chat, gated on a match via RLS. No moderator read policy — moderation is via report_message snapshots only. Deleted on unmatch/block via match-delete cascade.';
comment on column public.reports.snapshot is 'Structured moderation evidence (jsonb) captured at report time; for message reports holds the reported message + ~15 messages of context + a sender snapshot, so it survives the conversation cascade.';
comment on function public.report_message(uuid, text, text) is 'Snapshot a reported message + context + sender into reports.snapshot, then block + delete the match (atomic). Snapshot survives the cascade.';
