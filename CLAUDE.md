# CLAUDE.md — Tadpole

Persistent project rules. Read this at the start of every session. Detailed background lives in `/docs`.

## What we're building
Tadpole is a cross-platform community app that connects **fathers** for **friendship, peer support, and local meet-ups**. It is **platonic — not a dating app**, even though it uses a swipe/match mechanic (think Bumble BFF / Peanut, not Tinder). One backend, one shared logic core, two front-ends: a web app and a mobile app.

## Stack
- **Monorepo:** Turborepo + pnpm workspaces, TypeScript everywhere (strict mode).
- **Web:** Next.js (App Router) — SSR/SSG/ISR for SEO. Deployed on an OVH VPS via pm2 + nginx, behind Cloudflare.
- **Mobile:** Expo (React Native + Expo Router) — one codebase → iOS + Android via EAS.
- **Backend:** Supabase Cloud (UK/EU region) — Postgres, auth, storage, realtime.
- **Styling:** Tailwind (web) + NativeWind (mobile) sharing the same design tokens. No shared UI component layer.
- **Analytics:** Umami (self-host) for web, PostHog EU Cloud for product. No GA4.

## Repo layout
```
apps/web        Next.js
apps/mobile     Expo
packages/core   business logic + Supabase queries (shared)
packages/types  shared TS types + generated Supabase types
packages/validation  Zod schemas (shared by web + mobile forms)
packages/config      shared eslint/tsconfig/tailwind tokens
supabase/migrations  versioned SQL
docs/           plan, schema, safety policy
```

## Design tokens
- Background (cream): `#F2EFE8`
- Ink (black): `#000000`
- Accent: not chosen yet — leave a single token (`--accent`) for later.
Lowercase wordmark, warm cream over pure white, the tadpole mark = the brand personality.

## Build order
Backend first, then feature-by-feature with **web UI before mobile UI** for each feature (faster loop). Sequence: scaffold → backend/migrations → auth+onboarding → swipe+match → activity finder → messaging → monetisation/wellness. Mobile ships to stores via EAS once core features are solid. See `docs/TADPOLE_PLAN.md` §12.

## Non-negotiable rules
<important if="editing supabase migrations, RLS, or any DB function">
- **RLS on every table, default-deny.** No table ships without explicit policies.
- **Matches are created ONLY by the `handle_swipe` trigger** (security definer). There is NO client insert policy on `matches` — never add one. Same principle for any "mutual"/server-authoritative state.
- **A user can read only their OWN swipes** — never expose who passed on whom.
- Schema lives in `supabase/migrations/`, version-controlled. After any schema change, regenerate types into `packages/types`.
</important>
- **Never hardcode secrets.** Read Supabase/Stripe/PostHog keys from env. The `service_role` key is server-only — never in `apps/mobile`, never in client bundles, never committed. Provide `.env.example` only.
- **Stateless web app.** No local session files or local uploads — everything in Supabase/Redis — so the app can scale horizontally off one VPS.
- **Keep `packages/core` thin and shared.** Screens/pages stay UI-only; data + logic live in core so web and mobile share them.
- **18+ only.** Age gate at sign-up. This is a stranger-contact app with location + meet-ups.
- **Safety is launch-blocking:** block, unmatch, and report must work before any social feature ships. See `docs/SAFETY_POLICY.md`.
- **Privacy by default:** coarse `area` shown to others; precise lat/lng opt-in only and never exposed to other users. UK GDPR applies.
- **No medical claims.** Wellbeing content is general info with disclaimers + crisis signposting, never clinical advice.

## Reference docs
- `docs/TADPOLE_PLAN.md` — full architecture, SEO, hosting, scaling, roadmap.
- `docs/tadpole_swipe_schema.sql` — swipe/match schema + RLS + functions.
- `docs/SAFETY_POLICY.md` — moderation, safety, crisis handling.

## Working style
- Plan before large changes; show the plan and wait for approval before writing code.
- Prefer small, reviewable commits. Run lint + typecheck before declaring a task done.
- When unsure about a product/safety call, ask — don't guess on anything touching safety, privacy, or payments.
