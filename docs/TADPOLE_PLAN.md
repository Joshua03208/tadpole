# Tadpole — Architecture & Build Plan

*A cross-platform community app for dads: web + iOS + Android, built for SEO and scale.*

---

## 1. The core architectural decision

You have three requirements that pull in different directions:

- **SEO** wants server-rendered HTML (a real web framework).
- **App Store / Play Store presence** wants real native apps.
- **"Big app," one team** wants to avoid maintaining three separate codebases.

The clean way to satisfy all three is a **monorepo** with two thin "apps" sharing one fat "core":

```
                    ┌─────────────────────────┐
                    │   Shared core (packages) │
                    │  types · Supabase client │
                    │  validation · business   │
                    │  logic · API helpers     │
                    └────────────┬─────────────┘
                       ┌─────────┴──────────┐
              ┌────────▼────────┐   ┌────────▼─────────┐
              │   Next.js web   │   │   Expo mobile    │
              │ SSR/SSG for SEO │   │  iOS + Android   │
              │  runs on VPS    │   │  (app stores)    │
              └────────┬────────┘   └────────┬─────────┘
                       └─────────┬───────────┘
                          ┌──────▼───────┐
                          │   Supabase   │
                          │ auth · DB ·  │
                          │ storage ·    │
                          │ realtime     │
                          └──────────────┘
```

This is different from the earlier "Expo does web too" idea. React Native Web *can* render in a browser, but its HTML is app-shell-style and weak for SEO — fine for a logged-in dashboard, bad for public content you want Google to index. Since the deck's **Knowledge Hub** and **Activity Finder** are exactly the kind of public, indexable content that drives organic growth, you want a real SSR framework for the web. Hence: **Next.js for web, Expo for mobile, shared logic between them.**

**Recommended stack**

| Layer | Choice | Why |
|---|---|---|
| Monorepo | Turborepo + pnpm workspaces | Fast builds, shared packages, one install |
| Web | Next.js (App Router) | SSR/SSG/ISR → strong SEO; runs on your VPS |
| Mobile | Expo (React Native + Expo Router) | Real App/Play Store apps from one codebase |
| Backend | Supabase **Cloud** (UK/EU region) | Postgres + auth + storage + realtime, managed |
| Language | TypeScript everywhere | Share types across web, mobile, and DB |
| Styling | **Tailwind (web) + NativeWind (mobile)** | Same class names + design tokens on both; UI components stay per-platform |

You won't share *UI components* between web and mobile (Next.js and RN components differ, and the swipe card-stack is gesture-driven on touch vs. click/keyboard on web — forcing one component to do both costs more than it saves). Instead, **Tailwind on web + NativeWind on mobile** share the same class names and design tokens, so the brand looks identical on both while each platform's UI stays native. You **will** share everything below the UI: types, Supabase queries, validation schemas (Zod), pricing logic, formatting. That shared layer is where most of the value and the bugs live. *(Tamagui — one shared UI layer for both — was considered and parked; revisit only if UI duplication becomes painful.)*

---

## 2. Monorepo layout

```
tadpole/
├─ apps/
│  ├─ web/            # Next.js — marketing, knowledge hub, web app
│  └─ mobile/         # Expo — iOS + Android
├─ packages/
│  ├─ core/           # business logic, Supabase queries, API layer
│  ├─ types/          # shared TS types + generated Supabase types
│  ├─ validation/     # Zod schemas shared by forms on web + mobile
│  └─ config/         # shared eslint/tsconfig/tailwind presets
├─ supabase/
│  ├─ migrations/     # SQL migrations (version-controlled)
│  └─ seed.sql
├─ turbo.json
└─ package.json
```

Generate your TypeScript types straight from the database (`supabase gen types typescript`) into `packages/types` so the whole app is type-safe against the real schema. Regenerate on every migration.

---

## Brand & design tokens

The logo is a lowercase geometric wordmark on a warm bone background, with the period rendered as a little tadpole + tail — friendly, modern, deliberately *not* clinical. The design system is built on these brand colours (sampled directly from the logo file):

| Token | Value | Use |
|---|---|---|
| `--bg` (cream) | `#F2EFE8` | App background, surfaces |
| `--ink` (black) | `#000000` | Wordmark, primary text, headings |
| `--accent` | TBD (a pond-green leans into "tadpole") | Buttons, links, match highlights — pick one |
| semantic | success / warning / error greens-ambers-reds | Standard UI states |

Define these once as Tailwind theme tokens in `packages/config` and consume them via Tailwind (web) and NativeWind (mobile) so the brand is pixel-identical across platforms. Lean into the warm cream rather than pure white — it's the thing that makes the app feel approachable, which is the whole point for a dad-support product. Lowercase, generous spacing, and the tadpole mark are the personality; keep them consistent.

---

## 3. SEO strategy

This is where Next.js earns its place. The plan:

**Render the right way per page type.**
- *Marketing pages* (home, about, pricing) → static (SSG), rebuilt on deploy. Fastest possible, perfect Core Web Vitals.
- *Knowledge Hub articles* → ISR (Incremental Static Regeneration). Statically served, revalidated periodically, so they're fast and indexable but editable without a full redeploy.
- *Activity Finder listings* → ISR per activity/area page. Each activity and each "things to do in {area}" page is a static, indexable URL — this is a big organic-search surface.
- *Logged-in app screens* (feed, messages, profile editing) → client-rendered or SSR with auth; these don't need indexing.

**The mechanics that actually move rankings:**
- **Unique metadata per page** via Next's Metadata API — title, description, Open Graph, Twitter cards. Templated for activity/article pages.
- **Structured data (schema.org JSON-LD)** — `Event` for activities, `Article` for the knowledge hub, `Organization` for the brand. This is what gets you rich results.
- **Sitemap + robots** generated dynamically (`app/sitemap.ts`) so every activity/article auto-enters the sitemap.
- **Clean, human URLs** — `/activities/cardiff/soft-play-bay`, `/guides/sleep-training-newborns`. Slugs stored in the DB.
- **Core Web Vitals** — Next's `<Image>` for automatic image optimization, font optimization, minimal client JS on public pages. Google ranks on these.
- **Local SEO** — area-based landing pages ("dad activities in Rhyl") are gold for a location-based community app. Plan the data model so areas are first-class.

**Programmatic SEO is your growth engine here:** every activity, every area, every guide is a page. Hundreds of indexable, genuinely useful pages built from your own database content. Design the schema with this in mind (slugs, areas, categories all queryable).

---

## 4. Hosting & infrastructure

Your OVH VPS — **Ubuntu Server 24.04, 8 GB RAM, 4 vCPU, 80 GB**, already running Next.js sites via pm2 + nginx — is a sensible home for Tadpole's web app for a good while, especially since Supabase Cloud takes the entire database load off the box. Two honest caveats: it's a **single point of failure**, and it's **shared with your other sites**, so watch RAM headroom as everything grows. Architect stateless so scaling out later is a move, not a rewrite.

**What I'd run where:**

| Component | Where | Notes |
|---|---|---|
| Next.js web app | **OVH VPS** (pm2 + nginx, as you do now) | Run in production mode behind nginx |
| Reverse proxy / TLS | **OVH VPS** (your existing nginx) | Already set up |
| Database + auth + storage | **Supabase Cloud** (UK/EU region) | Managed Postgres, backups, pooler, scaling |
| CDN | **Cloudflare** (free tier fine to start) | Caches static/ISR + images; keeps load off the shared box; DDoS + WAF |
| Web analytics | **Umami, self-hosted on VPS** | Lightweight, cookieless, no consent banner needed |
| Product analytics | **PostHog EU Cloud** (not self-hosted) | Funnels/retention/flags; self-hosting it would swamp this box |
| Redis (caching/sessions/jobs) | VPS or managed | Add when you need it, not day one |
| Background workers | VPS (separate process) or Supabase Edge Functions | For emails, affiliate sync, notifications |

**Sizing note:** the web app + Umami sit comfortably on this box. **Do not self-host PostHog here** — it runs ClickHouse/Kafka and would eat an 8 GB box already serving other sites. Put Cloudflare in front so most traffic never reaches the origin.

**Why Supabase Cloud (decided):** you could self-host Supabase via Docker on the VPS to save money, but for a project meant to get big it's the wrong trade — you'd take on Postgres ops, backups, pooling, and upgrade pain, all distraction from building. Cloud's managed Postgres with the built-in **connection pooler (Supavisor/PgBouncer)** is exactly what saves you as traffic grows. The VPS runs *your* app code; Supabase runs the data tier.

**Process management:** Next.js under pm2 (as you already run your other sites) so it restarts on crash and boot, behind your existing nginx, with Cloudflare in front so static/cached content never hits the origin.

**Deployment:** containerize the web app with Docker so "works on my machine" equals "works on the VPS," and so migrating to a bigger box (or Kubernetes/Fly.io/Railway later) is a config change, not a rewrite.

---

## 5. Scalability plan

Design for scale, build for now. The things that bite you at scale, roughly in the order they'll bite:

1. **Database indexing.** Index every column you filter/sort on (area, parenting_stage, cost_tier, created_at). For location-radius queries on activities, enable **PostGIS** and use a geography column + spatial index rather than naive lat/lng math.
2. **Connection pooling.** Serverless/many-connection patterns exhaust Postgres connections fast. Use Supabase's pooler endpoint for app queries. (Free with Supabase.)
3. **Caching.** Cloudflare caches static + ISR pages. Add **Redis** for hot data (popular activity lists, session-ish data, rate-limit counters) when DB read load climbs.
4. **Images.** User avatars + activity photos will balloon storage and bandwidth. Store in Supabase Storage, serve through Cloudflare, and use Next `<Image>` / on-the-fly resizing. Never serve original-resolution uploads.
5. **Search.** Postgres full-text search is plenty to start (and free). If the Knowledge Hub + activity search gets serious, move to **Meilisearch or Typesense** (self-hostable on the VPS, or managed) for typo-tolerant, fast search.
6. **Realtime (messaging, phase 2).** Supabase Realtime handles presence + live messages. Watch channel counts as you grow; it's the kind of thing to load-test before launch of the chat feature.
7. **Background jobs.** Don't do slow work (sending emails, syncing affiliate feeds, generating notifications) in the request path. Queue it — Supabase Edge Functions + cron, or a worker process on the VPS with BullMQ + Redis.
8. **Rate limiting.** Protect auth endpoints and any write endpoints from abuse from day one (Cloudflare rules + app-level limits).

**The scaling escape hatch:** because the web app is a stateless Docker container talking to managed Supabase, "scale up" later = run more containers behind a load balancer, or move to a managed host. Keeping the app stateless (no local session files, no local uploads — everything in Supabase/Redis) is the single most important habit for that.

---

## 6. Backend, auth & data integrity

- **Row Level Security (RLS) on every table, no exceptions.** This is your real security boundary, not your app code. Default-deny, then write explicit policies. Test them.
- **Roles:** plan for `user`, `verified_expert` (the parenting/wellness experts in the deck), `moderator`, `admin`. Store role on the profile and enforce in RLS.
- **Migrations in version control** (`supabase/migrations/`), never click-ops in the dashboard for schema. Run them through CI.
- **Soft deletes** (`deleted_at`) for user content so moderation/abuse handling and GDPR erasure are clean.
- **Audit trail** on sensitive actions (role changes, content removal, payments).

---

## 7. The matching model — swipe / match ("Bumble BFF for dads")

> **Product note — this diverges from the deck.** The pitch deck describes an *open social network*: "smart matching" surfaces relevant dads, and you can browse profiles, message, and join groups fairly freely. The swipe / match model below is a deliberate change of direction: dads swipe through a deck of cards, and **two people can only talk once both have swiped "like" (a mutual match)**. It's more private and intentional, but slower to get dads connecting than open browsing. Both are valid products — this should be a conscious decision with your co-founder, not a drift. The schema below implements the swipe/match version.

**Core safety principle: matches are created by the database, never by the client.** When you record a "like", a Postgres trigger checks for a reciprocal "like" and creates the match itself. There is deliberately no insert policy on the `matches` table, so a client physically cannot forge a match — it can only arise from mutual swipes. Likewise, RLS lets you read only your *own* swipes, so you can never see who passed on you.

**Tables**

- `swipes` — one row per swipe (`swiper_id`, `target_id`, `direction` like/pass). Unique per pair, can't swipe yourself twice or at all.
- `matches` — created automatically on a mutual like. Stored canonically with `user_a < user_b` + a unique constraint, so (A,B) and (B,A) can never both exist.
- `blocks` — a block hides both dads from each other, in the deck and everywhere else.

**Key functions**

- `handle_swipe()` — the trigger that creates a match on reciprocal likes (`security definer`, so it can write to `matches` even though clients can't).
- `get_swipe_deck()` — returns the cards: excludes yourself, anyone already swiped, and anyone blocked either way; sorts same-area and same-parenting-stage dads to the top. This is where the deck's "nearby or in similar life stages" promise actually lives.
- `unmatch()` — removes a match and optionally blocks the other person.

**RLS summary**

| Table | Read | Write |
|---|---|---|
| `swipes` | own swipes only (can't see who passed on you) | insert own only |
| `matches` | only the two people in the match | none (trigger-only) |
| `blocks` | own blocks | manage own only |

**Designed-for extensions (not built yet):**
- *Freemium swipe limits* — count today's swipes for the user and reject past N unless they hold an active premium subscription (premium = unlimited). Ties directly into the membership tier in §8.
- *Distance-based deck* — once PostGIS is enabled, replace the area match with a radius filter on a geography column.
- *Messaging (Phase 2)* — a `messages` table keyed on `match_id`, RLS-gated so only the two matched dads can read/write. **The match is the gate: no match, no chat.**

The full runnable SQL lives in `tadpole_swipe_schema.sql` alongside this plan; drop it into `supabase/migrations/`.

**Safety/store note:** a swipe-match app between strangers *must* ship with solid block, report, and unmatch tooling and clear "this is for friendship/support, not dating" framing — both to protect users and to clear App Store / Play Store review. Treat this as launch-blocking, not nice-to-have.

---

## 8. Payments & commerce

The deck's revenue model = premium memberships + affiliate commerce + brand partnerships.

- **Stripe** for premium memberships (subscriptions). Use Stripe Customer Portal so you don't build billing UI. Handle webhooks in an Edge Function / API route to keep your DB's subscription state in sync — **never trust the client** for entitlement.
- **Affiliate commerce:** track outbound clicks (your own redirect endpoint → logs click → 302 to partner) so you have first-party data even when partner dashboards are flaky. Store partner, product, commission terms in the DB.
- **Entitlements:** gate premium features off subscription state checked server-side / in RLS, not in the UI.
- **Disclosure:** affiliate links legally require disclosure (ASA/CMA rules in the UK). Bake a disclosure component into the design system.

---

## 9. Sensitive content & moderation (mental health)

This is the part of the deck that carries the most real-world responsibility, and it has architecture implications worth deciding early:

- **Not a medical service.** Clear, prominent disclaimers; signpost to real crisis resources (e.g. NHS 111, Samaritans) rather than implying the app provides clinical care.
- **Expert content must be attributable and verifiable** — hence the `verified_expert` role and clear authorship on wellness/parenting guidance.
- **User-generated content needs moderation** from day one: reporting, a moderation queue, the ability to remove content and suspend users. Don't bolt this on after launch.
- **Crisis-signal handling.** Decide your policy for content suggesting someone is at risk. At minimum, surface help resources; document the policy.
- Keep wellbeing content and community content architecturally separable so you can apply stricter rules to the former.

---

## 10. Privacy & GDPR (you're UK-based — this is mandatory, not optional)

- **Lawful basis + consent** for processing, especially location and any health-adjacent data. A cookie/consent banner that actually gates non-essential tracking.
- **Data minimisation:** coarse `area` by default; precise lat/lng only on explicit opt-in.
- **Special-category data:** anything around mental health is sensitive under UK GDPR — extra care, extra justification, extra protection.
- **DSAR + erasure:** build "export my data" and "delete my account" as real features (soft-delete then purge). You're legally required to honour these.
- **Data residency:** Supabase Cloud + PostHog both set to **UK/EU region**; Umami is self-hosted on your VPS so its data never leaves your box. Check where Stripe stores data.
- **Analytics & consent:** because Umami is cookieless and PostHog can run consent-aware, you avoid GA4's heavy consent-banner burden — but still gate any non-essential product tracking behind consent.
- **Privacy policy + terms** drafted before launch (get these reviewed by someone qualified — I can help draft, but I'm not a lawyer).
- A **DPIA** (Data Protection Impact Assessment) is genuinely advisable given the location + wellbeing data combination.

---

## 11. DevOps, monitoring & backups

- **CI/CD:** GitHub Actions — lint, typecheck, test, run migrations against a preview DB, build, deploy to the VPS (and EAS build/submit for the mobile apps).
- **Environments:** at least `dev` and `prod`, ideally a `staging` Supabase project. Never test migrations against prod.
- **Secrets:** env vars on the server, never committed. Use Supabase's separate keys (anon vs service-role; service-role only ever server-side).
- **Monitoring:** error tracking (Sentry), uptime checks on the VPS, Supabase's own dashboards for DB health. You want to know it's down before users tell you.
- **Backups:** Supabase Cloud does automated backups — confirm the retention on your plan and test a restore once. Back up the VPS config too (or, better, make it reproducible via Docker + a provisioning script so a dead VPS is a 20-minute rebuild).
- **Mobile release pipeline:** EAS (Expo Application Services) for builds + store submission. Plan for app review lead times (Apple especially).

---

## 12. Suggested phased roadmap

**Phase 0 — Foundations (do this first)**
Monorepo + Turborepo, Supabase project, schema + RLS for auth/profiles, CI, the Next.js shell + Expo shell both authenticating against Supabase. Boring but it's the spine.

**Phase 1 — The matching core + first content vertical**
The swipe/match model (§7): profiles, the swipe deck, mutual matches, block/report/unmatch. Ship the **Activity Finder** alongside it as the public, SEO'd content surface (activity + area pages). The swipe loop is the product's heart; the activity content is the organic-growth engine and gives matched dads something to *do*.

**Phase 2 — Messaging**
Realtime chat gated on matches (no match, no chat). Moderation tooling ships *with* this, not after.

**Phase 3 — Knowledge Hub + Experts**
Expert verification, authored guides (big SEO surface), categories.

**Phase 4 — Monetisation**
Stripe memberships + entitlements, affiliate click-tracking + disclosure, premium gating (incl. unlimited swipes for premium).

**Phase 5 — Wellness hub + partner support**
The sensitive-content features, with the moderation/disclaimer/crisis infrastructure from Phase 2 already in place.

Ship Phase 1 to real dads before building Phase 4. Revenue features on top of an app nobody uses is the classic trap.

---

## 13. Decisions log

**Locked in:**
- ✅ **Product model:** swipe / match ("Bumble BFF for dads") — mutual like required before chat (§7).
- ✅ **Backend:** Supabase Cloud, UK/EU region.
- ✅ **Styling:** Tailwind (web) + NativeWind (mobile), shared tokens; no shared UI layer.
- ✅ **Hosting:** Next.js on the existing OVH VPS (8 GB / 4 vCPU, Ubuntu 24.04, pm2 + nginx) behind Cloudflare.
- ✅ **Analytics:** Umami self-hosted (web) + PostHog EU Cloud (product). No GA4.
- ✅ **Brand:** cream `#F2EFE8` + ink `#000000`, lowercase wordmark, tadpole mark.

**Locked in — 2026-05-31 rebuild session:**
- ✅ **Accent colour:** muted pond-green `#3E7C5A`, held as a single swappable `--accent` token (RGB-channel CSS var). Confirm exact hex vs the logo file + WCAG AA contrast on cream before final lock.
- ✅ **Environments:** one UK/EU cloud Supabase project as **dev/staging** (RLS + the `handle_swipe` trigger validated against real cloud from the start); a separate **prod** project stood up at the pre-launch checkpoint (free tier = 2 projects). No local Docker stack.
- ✅ **Moderation sequencing (two-tier):** the launch-blocking *capture* layer — report→queue, block/unmatch, suspend/ban state, audit log, soft-delete, roles, the persistent crisis "Get help now" surface — ships in the swipe+match+safety phase; the full moderator *dashboard UI* is the last phase.
- ✅ **Phase ordering (reconciled with §12):** 0 scaffold → 1 backend → 2 auth/onboarding → 3 swipe+match+safety → 4 Activity Finder → 5 messaging → 6 monetisation → 7 marketplace (= affiliate commerce, §8) → 8 Knowledge Hub → 9 Wellness hub → 10 moderator dashboard. Areas are modelled **first-class in Phase 1** (shared by the swipe deck + Activity Finder); Knowledge Hub and Wellness hub are kept architecturally separable.
- ✅ **Schema deviations from `tadpole_swipe_schema.sql`** (apply in the relevant migrations — these fix latent issues in the provided SQL):
  1. `get_swipe_deck()` returns a **column-masked projection** (no `lat`/`lng`/geography) — the provided `select p.*` would expose precise location, violating the privacy non-negotiable.
  2. The `role` column is **excluded from self-update** (changeable only via an admin-guarded `security definer` function that writes the audit log) — a plain owner-update policy would allow self-escalation to admin/moderator.
  3. Replace naive `on delete cascade` with a **soft-delete + anonymise** account-deletion model that preserves separable safety/abuse evidence (SAFETY_POLICY §8) instead of hard-deleting swipes/matches/blocks/messages.

**Still to settle:**
1. **Crisis & moderation policy** — finalise/sign off `SAFETY_POLICY.md` with a qualified safeguarding/legal reviewer before the swipe+match+safety phase goes public (and the crisis-protocol wording before the Wellness hub); re-verify the crisis helpline numbers at that point.
2. **Legal** — privacy policy, terms, and a DPIA reviewed by someone qualified before launch; plus a UK Online Safety Act risk assessment and the chosen age-assurance method (self-declared DOB + verification seam is the working assumption — confirm with the reviewer).
3. **Deferred product/payments decisions** — age-assurance method (Phase 2), precise-location/PostGIS model (Phase 1/3), freemium swipe limit N + Premium bundle (Phase 3/6), exact "marketplace" scope (affiliate redirect assumed; confirm before Phase 6/7), snapshot-only moderator access to messages (Phase 5), DSAR UX (Phase 2), mobile store-submission timing (Phase 5).

---

*Phase 0 (scaffold) complete — commit `736d316`: Turborepo + pnpm monorepo, Next.js 16 + Expo SDK 56 shells, shared Tailwind-v3 token preset, CI, env surface, git. Next concrete step: Phase 1 — backend & data integrity (profiles + RLS + 18+ gate, role guard, audit log, soft-delete model, first-class areas, generated types, RLS/pgTAP test harness) against the dev/staging cloud project.*
