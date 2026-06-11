# Deploying the Tadpole web app (Ubuntu VPS · nginx · pm2)

How to put `apps/web` (Next.js 16, App Router) on the existing OVH box —
**Ubuntu 24.04, already running nginx + certbot + pm2 + other Next.js sites**,
behind Cloudflare. The database is **Supabase Cloud**, so nothing DB-related runs
on the VPS; the box only runs the stateless web app.

This app coexists with your other sites by listening on its **own loopback port
(`3456`)** while nginx terminates TLS and reverse-proxies the public domain to it.

Committed helpers referenced below:
- `deploy/ecosystem.config.cjs` — the pm2 process definition
- `deploy/nginx/tadpole.conf` — the nginx server block

---

## 0. Assumptions / conventions

| Thing | Value used in this doc (change to taste) |
| --- | --- |
| Checkout path | `/var/www/tadpole` |
| App port (loopback) | `3456` |
| Public domain | `tadpole.example.com` |
| Node | ≥ 20.9 (repo `engines`); 20 LTS or 22 LTS fine |
| Package manager | pnpm `10.33.0` (pinned in root `package.json`) |
| Process name | `tadpole-web` |

> **Single most important gotcha:** `NEXT_PUBLIC_*` env vars are **baked into the
> bundle at build time** (the Supabase URL also drives the CSP + image host in
> `next.config.ts`). So the `.env` file must be in place **before** you build —
> not just before you start. Rebuild whenever a `NEXT_PUBLIC_*` value changes.

---

## 1. One-time server prep

You already have nginx, certbot and pm2. You only need a Node that satisfies the
engine and pnpm via corepack:

```bash
# as your deploy user
node -v                      # want >= 20.9; if not, install via nvm/nodesource
corepack enable
corepack prepare pnpm@10.33.0 --activate
pnpm -v                      # 10.33.0
```

---

## 2. Get the code

```bash
sudo mkdir -p /var/www/tadpole
sudo chown "$USER":"$USER" /var/www/tadpole
git clone <YOUR_REPO_URL> /var/www/tadpole
cd /var/www/tadpole
```

---

## 3. Environment file

Create `apps/web/.env.local` (gitignored) on the server. Minimum for production:

```bash
cat > /var/www/tadpole/apps/web/.env.local <<'EOF'
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_ANON_KEY
# Server-only — bypasses RLS. Never exposed to the browser. Only needed if/when
# a server route uses it; safe to include now.
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
EOF
chmod 600 /var/www/tadpole/apps/web/.env.local
```

See `.env.example` for the full surface (PostHog / Umami / Sentry / Stripe come
in later phases). Next loads `.env.local` for **both** build and runtime, so you
don't also need to put these in pm2 — though you may move the service-role key
into the pm2 `env` block if you prefer it out of the file.

---

## 4. Install + build

Workspace packages (`@tadpole/core`, `types`, `validation`) are TypeScript source
transpiled by Next (`transpilePackages`), so there's **no separate package build**
— building the web app is enough.

```bash
cd /var/www/tadpole
pnpm install --frozen-lockfile
pnpm --filter @tadpole/web build      # reads apps/web/.env.local for NEXT_PUBLIC_*
```

Quick local smoke test before involving nginx (optional):

```bash
PORT=3456 HOSTNAME=127.0.0.1 pnpm --filter @tadpole/web start &
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3456/api/health   # 200
kill %1
```

---

## 5. Run under pm2

The committed `deploy/ecosystem.config.cjs` runs `next start` from `apps/web`,
bound to `127.0.0.1:3456`. Confirm `cwd` and `PORT` in it match your box, then:

```bash
cd /var/www/tadpole
pm2 start deploy/ecosystem.config.cjs
pm2 save                       # persist across reboots (you've likely run `pm2 startup` already)
pm2 status tadpole-web
pm2 logs tadpole-web --lines 50
```

Binding to `127.0.0.1` (via `HOSTNAME`) means the app is **not** reachable
except through nginx — good, since the box is shared.

---

## 6. nginx + TLS

```bash
sudo cp /var/www/tadpole/deploy/nginx/tadpole.conf /etc/nginx/sites-available/tadpole
sudo sed -i 's/tadpole.example.com/YOUR_REAL_DOMAIN/' /etc/nginx/sites-available/tadpole
sudo ln -s /etc/nginx/sites-available/tadpole /etc/nginx/sites-enabled/tadpole
sudo nginx -t && sudo systemctl reload nginx

# issue the cert (certbot rewrites the file to add 443 + an 80->443 redirect)
sudo certbot --nginx -d YOUR_REAL_DOMAIN
sudo nginx -t && sudo systemctl reload nginx
```

Notes:
- **Don't add security headers in nginx** — `next.config.ts` already emits CSP,
  X-Frame-Options, Referrer-Policy, etc. Duplicating them causes conflicts.
- The config long-caches `/_next/static/` (hashed, immutable) and proxies
  everything else to the app.

---

## 7. Cloudflare

- DNS record for the domain **proxied** (orange cloud).
- SSL/TLS mode **Full (strict)** — valid since certbot issued a real Let's Encrypt
  cert on the origin.
- The app trusts `X-Forwarded-Proto` from nginx, which sets it from the real
  scheme; CF → nginx is HTTPS, so redirects/cookies stay on `https`.

---

## 8. Redeploys (zero-downtime)

```bash
cd /var/www/tadpole
git pull
pnpm install --frozen-lockfile
pnpm --filter @tadpole/web build
pm2 reload tadpole-web         # graceful reload, no dropped connections
```

Make it a script (`deploy/redeploy.sh`) once you're happy with the flow.

**Rollback:** `git checkout <previous-sha>` → `pnpm install` → build → `pm2 reload`.
(Or keep timestamped release dirs + a `current` symlink if you want instant
rollback later.)

---

## 9. Database migrations (separate from the VPS)

Schema lives in `supabase/migrations/` and targets **Supabase Cloud**, not the
box. Apply migrations from your machine or CI — never from the web server:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

After a schema change, regenerate types into `packages/types` and redeploy
(per CLAUDE.md). App deploys and DB migrations are independent.

---

## 10. Troubleshooting

| Symptom | Likely cause / fix |
| --- | --- |
| `502 Bad Gateway` | App not up or wrong port. `pm2 status`, `pm2 logs tadpole-web`; confirm nginx upstream port == `PORT`. |
| CSP blocks images/calls | A `NEXT_PUBLIC_SUPABASE_URL` mismatch baked at build. Fix `.env.local`, **rebuild**, reload. |
| Avatars/covers 404 | Supabase Storage object missing or bucket not public — unrelated to the VPS. |
| Port already in use | Another site/pm2 app owns `3456`. Pick another free port in both config files. |
| Realtime chat dead | It's a **direct** browser→Supabase WebSocket, not via nginx; check the Supabase URL/anon key, not nginx. |
| Env change ignored | `NEXT_PUBLIC_*` needs a rebuild; only server-only vars take effect on a bare `pm2 reload`. |

---

## 11. Scaling later (when one process isn't enough)

The app is **stateless** (no local sessions/uploads — everything in Supabase), so
scaling out is config, not a rewrite:

- Run N pm2 instances on `3456`, `3457`, … and list them all in an nginx
  `upstream { }` block (round-robin). Simpler and more predictable than pm2
  cluster mode for Next.
- Or lift the same build into Docker and move to a bigger host / Fly.io / Railway
  with no code changes (see `docs/TADPOLE_PLAN.md` §4).
- Add Redis only when you actually need shared caching/queues.
