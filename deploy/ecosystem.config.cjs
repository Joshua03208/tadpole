/**
 * pm2 process definition for the Tadpole web app (Next.js 16, App Router).
 *
 * Runs `next start` from apps/web bound to 127.0.0.1:3456 — nginx is the only
 * public entry point (see deploy/nginx/tadpole.conf). Pick any free port; just
 * keep it in sync with the nginx upstream.
 *
 * Env note: NEXT_PUBLIC_* are inlined at BUILD time, so they must be present in
 * apps/web/.env.local (or .env.production) before `pnpm --filter @tadpole/web
 * build`. Next itself loads those .env files at runtime too, so the only thing
 * we set here is NODE_ENV / PORT / HOSTNAME. (If you'd rather inject the
 * service-role key via pm2 instead of the .env file, add it under `env` below.)
 *
 * Usage:
 *   pm2 start deploy/ecosystem.config.cjs
 *   pm2 save
 */
module.exports = {
  apps: [
    {
      name: "tadpole-web",
      cwd: "/var/www/tadpole/apps/web",
      // pnpm creates this .bin symlink on install; pm2 runs it with its own node,
      // so pnpm does not need to be on pm2's PATH.
      script: "./node_modules/.bin/next",
      args: "start",
      exec_mode: "fork",
      instances: 1,
      max_memory_restart: "512M",
      time: true,
      env: {
        NODE_ENV: "production",
        PORT: "3456",
        HOSTNAME: "127.0.0.1",
      },
    },
  ],
};
