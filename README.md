# tadpole

A cross-platform community app connecting **fathers** for **friendship, peer support, and local meet-ups**. Platonic — not a dating app — built on a Bumble-BFF-style swipe/match mechanic.

> Authoritative spec lives in [`CLAUDE.md`](./CLAUDE.md) and [`docs/`](./docs). Read those first.

## Stack

- **Monorepo:** Turborepo + pnpm workspaces, TypeScript (strict) everywhere
- **Web:** Next.js (App Router) — SSR/SSG/ISR for SEO
- **Mobile:** Expo (React Native + Expo Router) — iOS + Android via EAS
- **Backend:** Supabase Cloud (UK/EU) — Postgres, auth, storage, realtime
- **Styling:** Tailwind v3 (web) + NativeWind (mobile) sharing one token preset — **no shared UI layer**

## Layout

```
apps/web              Next.js
apps/mobile           Expo
packages/core         business logic + Supabase clients (the ONLY place Supabase is touched)
packages/types        shared TS types + generated Supabase types
packages/validation   Zod schemas shared by web + mobile forms
packages/config       shared tailwind token preset + tsconfig + eslint
supabase/migrations   versioned SQL (RLS default-deny on every table)
docs/                 plan, schema, safety policy
```

## Prerequisites

- Node `>=20.9.0` (developed on 24.x)
- pnpm `10.33.0` (pinned via `packageManager`)
- A Supabase Cloud project (UK/EU). Phase 0 needs its URL + anon key in `.env.local`.

## Getting started

```powershell
# from the repo root
pnpm install
pnpm typecheck
pnpm --filter @tadpole/web build      # Next.js production build
pnpm --filter @tadpole/web dev        # web dev server
pnpm --filter @tadpole/mobile start   # Expo dev server
```

Create `.env.local` at the root from `.env.example` and fill in the Supabase URL + anon key. The `service_role` key is **server-only** — never put it in `apps/mobile` or any client bundle.

## Build order & phases

Backend-first, then feature-by-feature with **web UI before mobile UI** per feature. See `docs/TADPOLE_PLAN.md` §12 and the reconciled phase plan.

- **Phase 0 — Scaffold** (this commit): monorepo spine, both shells, shared tokens, CI, env surface.
- **Phase 1 — Backend & data integrity**: profiles + RLS + 18+ gate, audit log, soft-delete model, areas, generated types, RLS test harness. *Type generation (`supabase gen types typescript`) lands here.*
- Later: auth/onboarding → swipe+match+safety → Activity Finder → messaging → monetisation → marketplace → knowledge hub → wellness hub → moderator dashboard.

## Verify-on-disk discipline

This repo is built with a hard rule: **after every write and commit, confirm the file is actually on disk AND that `HEAD` moved** — never trust a tool success message.

```powershell
git status --short
git log --oneline -5
Get-ChildItem -Recurse -File -Force | Where-Object { $_.FullName -notmatch 'node_modules|\.next|\.expo|\.turbo|\.git' } | Select-Object FullName
```

## Conventions

- **RLS on every table, default-deny.** Matches are created only by the `handle_swipe` trigger. Own-swipes-only reads. Precise location is owner-only, never exposed.
- **No secrets in client bundles.** Stateless web. Keep `packages/core` thin and shared.
- Run `pnpm lint` + `pnpm typecheck` before declaring a task done.
