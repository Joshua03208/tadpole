# Desktop side rails for the authenticated app shell

**Date:** 2026-06-10 · **Status:** approved (founder, this session)

## Problem

On desktop widths the authenticated pages look empty: the deck is a 384px card
centred on a 1200px+ viewport; matches and profile are similar narrow columns.
The user asked for "stuff on the sides — friends, new messages, places to go."

## Decision

Shared side rails on all standard app pages (deck, matches, profile), rendered
once from a nested route-group layout. The chat thread keeps its focused
full-height layout (no rails). Rails are desktop-only (`hidden lg:block`);
below `lg` nothing changes. Chosen over deck-only rails and per-page
full-width redesigns (founder picked option A of three).

## Layout

- New route group `apps/web/app/(app)/(rails)/` containing `home/`, `matches/`,
  `profile/` (URLs unchanged). Its `layout.tsx` renders, on `lg+`:
  `mx-auto max-w-6xl grid lg:grid-cols-[260px_minmax(0,1fr)_260px] gap-6`.
- Each rail is sticky below the 57px `SiteHeader` and scrolls independently.
- `/messages/[matchId]` stays directly under `(app)` — untouched.

## Left rail — friends & new messages

- One card listing recent conversations: avatar (or initial circle), first
  name, last-message snippet ("you: …" when the viewer sent it), accent unread
  badge. Rows link to `/messages/[matchId]`; footer links to `/matches`.
- Data: **new DB function `recent_conversations(p_limit)`** — `security
  invoker` (RLS gates everything: `matches_select_participants`,
  `messages_select_participants`, `message_reads_select_own`, profiles policy),
  `stable`, revoked from `public`/`anon`, granted to `authenticated`. Returns
  match + other-profile fields + last message (lateral, newest-first limit 1)
  + unread count (same expression as `unread_counts()`), ordered by last
  activity. One round trip instead of 3+.
- Core wrapper `listRecentConversations(client, { limit })` in
  `packages/core/src/messages.ts`; generated types regenerated after the
  migration (CLAUDE.md rule).

## Right rail — places to go

- "Places to go" card: 3 published activities in the signed-in dad's area
  (`getMyProfile()` → `listActivities({ areaSlug, limit: 3 })`), falling back
  to newest anywhere when the area has none. Rows link into the Activity
  Finder; footer links to `/activities`.
- Below it, one wellbeing guide card (`listGuides({ limit: 1 })`) linking to
  `/guides/[slug]`.
- No new backend.

## Behaviour

- Rails are client components (same pattern as the deck): fetch on mount,
  refetch on window focus so unread badges stay honest.
- Fail soft: a rail that errors renders nothing — a rail can never break the
  page.
- Warm empty states ("your matches will appear here — say hi on the deck",
  "we're still adding places near you") instead of blank boxes.
- Existing styling patterns only (`rounded-2xl border-ink/10 bg-white/50`
  cards, avatar/initial circles, accent unread dot). No new tokens or deps.

## Testing

No JS test runner exists in the repo yet; verification = `pnpm typecheck` +
`pnpm lint` + build, plus manual desktop/mobile-width check. The new SQL
function is RLS-gated by construction (security invoker).

## Risks

- Rails may feel cramped at exactly 1024px; mitigation is a one-class change
  (`lg:` → `xl:`).
- Additive migration only (one function; no table/RLS changes).
