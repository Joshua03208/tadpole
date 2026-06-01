# Tadpole — Phases 2–5 Build Plan

*Status: DRAFT for approval. Written overnight after Phase 1. Builds on the reconciled phase order in `TADPOLE_PLAN.md` §13. Nothing in here is built yet — this is the plan to approve in the morning.*

These four phases are the **social core**: get a real, age-gated account (2) → the swipe/match heart with launch-blocking safety (3) → the SEO growth engine (4) → realtime chat (5). The rhythm is unchanged: **backend first, web UI before mobile UI per feature, verify at the DB, then STOP for review** before the next phase. Several **legal/safety sign-offs are hard launch gates** (called out per phase) — engineering can proceed against them, but the app does not go public to real users until they clear.

Phase 1 already shipped the data spine these depend on: `profiles` (roles + soft-delete), `profile_private` (atomic 18+ gate), `profile_locations` (owner-only), `swipes`/`matches`/`blocks` + `handle_swipe` + masked `get_swipe_deck` + `unmatch`, `reports`, append-only `audit_log`, the role self-escalation guard, soft-delete/anonymise deletion, first-class `areas`, default-deny RLS everywhere.

---

## Cross-cutting threads (built incrementally across 2–5, not a separate phase)

- **Background-job runtime + transactional email** — stood up in Phase 2 (email verification needs it); reused for notifications (P5), DSAR export bundles + scheduled purge, and later affiliate sync. Decision: Supabase Edge Functions + `pg_cron`, or a VPS worker (BullMQ + Redis). *Recommend Edge Functions + pg_cron to start (no extra infra on the shared VPS).*
- **DSAR export + erasure as real features** — `data_export_requests` queue + export-bundle generator + the scheduled soft-delete→purge worker (Phase 2). Erasure preserves the separable safety records (audit_log/reports) per `SAFETY_POLICY.md` §8.
- **Audit log extension** — write audit rows at each new sensitive action (content removal, suspend/ban, role change, payments later). Table already exists.
- **Rate-limit store** — decide once (Phase 2): Redis vs DB-counter table vs Cloudflare rules. Applied per surface: account creation (P2), swipes (P3), messages (P5).
- **Image pipeline** — Supabase Storage bucket per use (avatars P2, activity photos P4) with **its own Storage RLS**, size/type limits, **EXIF-GPS stripping** (privacy), and resize-on-serve (never original-res). Storage RLS is separate from table RLS — easy to forget, real leak vector.
- **Analytics behind consent** — cookieless Umami (no banner) + consent-gated PostHog EU, wired with a durable, versioned consent record. No tracking fires before consent.
- **Monitoring** — Sentry (web + mobile) with PII scrubbing + EU region; uptime checks when the VPS deploy target exists.
- **CI** — extend `db-tests` with each phase's new RLS/security assertions; regenerate `packages/types` after every migration.

---

## Phase 2 — Auth & onboarding

**Goal:** a real, email-verified, 18+ account with a complete profile, legally launchable (terms + privacy + consent), and self-service data export/delete.

**Backend / migrations**
- Configure Supabase Auth providers + email templates; enable email confirmation.
- `consent_records` (versioned, timestamped: what was consented to, policy version) — UK GDPR demonstrable consent; `terms_acceptances` (ToS/Privacy version acceptance log, service-role write, user/admin read).
- Avatars: Storage bucket `avatars` + Storage RLS (owner-write, controlled-read), size/type limits, EXIF-GPS strip, resize-on-serve.
- `rate_limits` ledger (or Redis) + `check_and_record_rate_limit()` — account-creation/auth limits.
- DSAR: `data_export_requests` queue + export-bundle generator (background job) + scheduled soft-delete→purge worker (honours the `request_account_deletion()` soft-delete from Phase 1, purges after the retention window while preserving safety records).
- `packages/core`: the `@supabase/ssr` cookie-based server client (web) + SecureStore/AsyncStorage session (mobile), keeping the web stateless.

**Web → Mobile UI**
- Sign-up passing `date_of_birth` (+ `display_name`) in the signUp `data` (this is what the Phase 1 trigger gates on); login; email-verify; password reset.
- Client-side `ageGate` Zod schema (defence-in-depth mirroring the DB gate) in `packages/validation`.
- Onboarding wizard: display_name, parenting_stage, **area** (coarse, from `areas`), bio, interests, avatar upload; **precise-location opt-in OFF by default** with explicit consent copy.
- **Platonic / not-dating framing** front-and-centre in onboarding copy + a one-time "this is for friendship & support" interstitial.
- Bio validation: reject phone numbers / contact details / solicitation (`packages/validation`), with profile guidelines copy.
- Consent banner (cookieless Umami exempt; PostHog gated on opt-in); terms-acceptance gate at sign-up; profile editing; **export my data** + **delete my account** UI.

**Security / invariants**
- 18+ atomic gate (DB, Phase 1) + client mirror. Coarse area only ever shown to others; precise lat/lng owner-only. `service_role` server-only. No non-essential tracking before consent. Stateless web sessions via SSR cookies.

**Verification gate (assert at the DB + e2e)**
- Under-18 / missing-DOB blocked end-to-end (DB already proven). Unverified email can't reach the app. Export produces a machine-readable bundle. Delete soft-deletes + anonymises + schedules purge, preserving audit/reports. No tracker network call before consent. Extend `db-tests` (consent_records RLS, rate_limits).

**Open decisions (need your call before/within Phase 2)**
1. **Age-assurance method.** (a) *Recommended:* self-declared DOB now **+** a `verification_status` field & pluggable provider seam (escalate to ID/age-estimation if OSA/stores demand). (b) Third-party ID/age-estimation at sign-up now (Yoti/Onfido/Stripe Identity) — strongest, adds cost/friction/DPIA + a new processor. (c) Self-declared only — cheapest, weakest; only if the legal reviewer signs it off for v1. *Gated on your legal/safeguarding reviewer.*
2. **Auth providers.** Email+password only to start, or add OAuth (Apple/Google — Apple is required by App Store if you offer other social logins)? *Recommend email+password for v1; add Apple/Google before the mobile store submission in P5.*
3. **Consent-banner scope** — confirm Umami stays cookieless/banner-exempt and PostHog is fully gated; approve the essential-vs-non-essential event split. *Legal/reviewer sign-off.*
4. **DSAR UX** — *Recommended:* hybrid (self-service export + self-service delete for the happy path; complex DSARs routed to a reviewed manual process). Confirm the **purge retention window** + the wording disclosing what safety data is retained.

---

## Phase 3 — Swipe + match + safety  *(launch-blocking safety layer)*

**Goal:** the product's heart, shipped with the full launch-blocking safety capture layer. Most of the schema exists from Phase 1; Phase 3 is mostly UI + the safety surfaces + rate limiting + enforcement wiring.

**Backend / migrations**
- Swipe **rate limiting** (per-surface, using the P2 store); deck pagination/refill helper.
- Daily **swipe-limit seam** (freemium): a counting function gated on subscription state — **built but OFF at launch** (no limit) so it's a later config flip, not a retrofit.
- **Crisis resources** data (`crisis_resources` or static config) powering a persistent "Get help now" surface; **child-safety preserve-and-escalate** already auto-escalates in Phase 1's `reports` trigger — Phase 3 surfaces the moderator path + evidence preservation.
- Account-status enforcement (suspended/banned, Phase 1) wired into every surface; minimal admin/SQL triage view (the full moderator **dashboard** is Phase 10).

**Web → Mobile UI**
- The swipe card-stack: **separate components per platform** (touch-gesture on mobile, click/keyboard + a11y on web) over the shared `get_swipe_deck`/swipe/match core. Match screen; masked profile cards (**no location**).
- **Block / unmatch / report** UI on profiles (launch-blocking); report reason categories incl. child_safety/self_harm.
- Suspended/banned gating; the persistent **"Get help now"** crisis surface; **meet-up safety guidance** pre-surfaced.

**Security / invariants** — matches trigger-only; own-swipes-only; deck masked (no lat/lng); block both-ways everywhere; report→queue + audit; banned/suspended gated out; precise location never exposed.

**Verification gate** — re-run the Phase 1 assertion harness + new assertions: rate-limit enforced server-side; banned user gated out of deck/profiles/match; "Get help now" present on the social surfaces; child_safety report → severity `immediate` + audit row.

**HARD EXTERNAL GATES before this goes public to real users**
- **OSA risk assessment** (UK Online Safety Act, user-to-user service) commissioned + its required controls implemented.
- **Crisis & moderation policy signed off** by a qualified safeguarding/legal reviewer; **crisis helpline numbers re-verified**.
- **Age-assurance method confirmed** (Decision P2-1).
- **Moderation staffing / on-call** for immediate-risk reports decided.

**Open decisions**
1. **Freemium swipe limit N + enable-at-launch?** *Recommended:* no limit at launch (grow the network), seam built; when enabled, start generous (~25/day), Premium = unlimited + see-who-liked-you. Server-side/RLS only.
2. **"Who liked you"** — confirm it's a premium feature (gated later in monetisation) vs free.
3. **Moderation staffing** — who is on-call for immediate-risk escalations from the moment stranger contact is live (founder/in-house vs contracted)?
4. **OSA + crisis sign-off** — owner + timeline (start the reviewer engagement now, in parallel, so it isn't the launch bottleneck).

---

## Phase 4 — Activity Finder  *(SEO growth engine)*

**Goal:** public, indexable activity + area pages — the organic-growth surface that also gives matched dads something to do.

**Backend / migrations**
- `activities` (DB-stored unique **slug**, `area_id` → first-class areas from P1, category, cost_tier, description, optional geo); `activity_photos` (Storage + resize); **FTS** (`tsvector` + GIN) for activity/area search; report-on-activities (Phase 1 `reports.target_type='activity'` already supports it).
- **PostGIS decision** (below): if enabled, add a `geography` column + spatial index now so a distance-based deck/search later is a function swap, not a profiles migration. Precise location stays owner-only regardless.

**Web (SSR/ISR) → Mobile**
- `/activities/{area}/{slug}` (activity) + `/activities/{area}` (area) pages, **ISR**; **`Event` + `Organization` JSON-LD**; templated per-page Metadata; auto-`sitemap` entries; Next `<Image>`; Core Web Vitals.
- **Cloudflare/CDN + WAF** in front at first public deploy (also the network half of rate limiting + image delivery).
- **Meet-up safety guidance on listings** (the Activity Finder may be the first place a meet-up is effectively arranged — so the safety prompt lives here too, not only in chat).
- Mobile: activity browse/search reusing the shared core.

**Security / invariants** — activity content is moderatable (report→queue); anon read enabled for SEO (areas/activities `select` to `anon`) while everything user-specific stays authenticated; no precise user location surfaced.

**Verification gate** — pages render via SSR/ISR; JSON-LD validates; sitemap includes activities/areas; FTS returns expected results; report-on-activity lands in the queue; Lighthouse/CWV sane.

**Open decisions**
1. **PostGIS now or later?** *Recommended:* enable the extension + add the `geography` column in this phase (so distance matching is a later function swap), but ship area-based matching/search for v1. Confirm.
2. **Activity data sourcing** — manual seed, admin CRUD, or import feed? (affects scope + a possible admin tool).
3. **Anon SEO read** — confirm enabling `anon` `select` on `areas`/`activities` (needed for indexable pages).
4. **Sequencing** — Activity Finder before messaging delays the core retention loop (chat). *Recommended:* ship a **minimal** Activity Finder (area pages + SEO plumbing + a seed of activities) early for SEO, but treat messaging (P5) as a near-peer priority rather than blocking it behind a full content-ops build.

---

## Phase 5 — Messaging

**Goal:** realtime chat, strictly gated on a match, with moderation by report-snapshot only (never live-message surveillance), push, and a meet-up safety prompt.

**Backend / migrations**
- `messages` keyed on `match_id`, **participant-only RLS** (read/write only the two matched users; no match → no chat). On unmatch/block, chat access ends.
- **Realtime channel authorization** configured to mirror the message RLS (a correct table RLS can still leak via a misconfigured Realtime channel) + **load-test channel counts** before launch.
- **Report-on-messages**: `message_reports` capturing a **snapshot** of the reported message(s) + minimal context + a snapshot of the sender (survives sender deletion); moderators get **only the snapshot**, never live-message RLS.
- Message **rate limiting**; push: `device_tokens` table (RLS, owner-only) + Expo push (APNs/FCM via EAS) + per-user notification consent + **block/unmatch-aware suppression**.

**Web → Mobile UI** — chat (realtime), report-message, unmatch-from-chat, **in-person meet-up safety interstitial before the first arranged meet-up**, push notifications (suppressed for blocked/unmatched).

**Security / invariants** — two-party only; the match is the gate; **no moderator read on live messages** (snapshot-only); block/unmatch ends chat + suppresses push; report-snapshot is separable safety evidence.

**Verification gate** — non-participant cannot read/insert messages (DB + Realtime channel); unmatched/blocked cannot message; report captures the snapshot and is moderator-readable while the live thread is not; push suppressed for blocked users.

**Mobile store submission target** — after P5 the social core (block/report/unmatch + non-dating framing + chat) is complete, which is the bar for App Store / Play Store review. Stand up the **EAS** build/submit pipeline + store listings + privacy/data-safety labels (must match actual data collection). Budget Apple review lead time.

**Open decisions**
1. **Moderator ↔ message access** — *Recommended:* snapshot-only (strongest privacy/DPIA story). Confirm vs a tightly-audited, time-boxed scoped access.
2. **Push provider credentials** — timing for APNs/FCM setup via EAS.
3. **Store submission timing** — *Recommended:* after P5 (full safety + chat). Confirm.
4. **Realtime load-test** — agree a target (channel counts / concurrent presence) to test before chat launch.

---

## Decisions summary (please mark these up in the morning)

| # | Decision | Phase needed | Recommendation |
|---|---|---|---|
| 1 | Age-assurance method | P2 (before launch) | Self-declared DOB **+ verification seam**; reviewer signs off v1 |
| 2 | Auth providers | P2 (Apple/Google before P5 store) | Email+password v1; add Apple/Google before store submission |
| 3 | Consent-banner scope / event split | P2 | Umami cookieless; PostHog fully gated; reviewer approves split |
| 4 | DSAR UX + purge retention window | P2 | Hybrid self-service; confirm retention window |
| 5 | Freemium swipe limit N + enable-at-launch | P3 / P6 | No limit at launch; seam built; ~25/day + see-who-liked-you when enabled |
| 6 | Moderation staffing / immediate-risk on-call | P3 | Decide who is on-call from first stranger contact |
| 7 | "What is marketplace" | P6/P7 | Affiliate redirect + click-tracking + disclosure (not a P2P storefront) — confirm |
| 8 | PostGIS now vs later | P4 | Enable + add geography column now; area matching for v1 |
| 9 | Activity data sourcing | P4 | Choose seed/admin-CRUD/import |
| 10 | Moderator ↔ message access | P5 | Snapshot-only |
| 11 | Mobile store submission timing | P5 | After P5 |

## Hard external (non-engineering) gates — start these now, in parallel
- **OSA risk assessment** (user-to-user service) — before P3 public.
- **Crisis & moderation policy sign-off** + helpline re-verification — before P3 public (crisis-wording again before the later Wellness hub).
- **Privacy Policy, Terms of Service, DPIA** reviewed by a qualified person — Privacy/ToS before P2 public sign-up; DPIA before P3 public (location + meet-ups), updated before the Wellness hub (special-category data).
- **App Store / Play Store accounts** + privacy/data-safety labels — before P5 submission.

*After Phases 2–5, the remaining roadmap (per `TADPOLE_PLAN.md` §13) is: 6 monetisation → 7 marketplace (affiliate) → 8 Knowledge Hub → 9 Wellness hub → 10 moderator dashboard. Ship the social core to real dads before building monetisation.*
