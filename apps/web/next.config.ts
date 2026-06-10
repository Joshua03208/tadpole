import type { NextConfig } from "next";
import path from "node:path";

// Next loads .env files before evaluating this config, so the public Supabase
// URL is available here; the fallback keeps `next build` working in bare CI.
const SUPABASE_HOST = new URL(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://mzbbsrqoqqhjooyjyfaw.supabase.co",
).hostname;

// Launch-grade CSP. 'unsafe-inline' for scripts/styles is required by Next's
// inlined hydration payload and injected styles (a nonce-based CSP needs
// middleware work — tracked for later). randomuser.me hosts the demo seed
// avatars; drop it once they're self-hosted in the avatars bucket. wss: is the
// Supabase Realtime socket (live chat).
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' blob: data: https://${SUPABASE_HOST} https://randomuser.me`,
  `connect-src 'self' https://${SUPABASE_HOST} wss://${SUPABASE_HOST}`,
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Workspace packages ship TypeScript source; Next transpiles them.
  transpilePackages: ["@tadpole/core", "@tadpole/types", "@tadpole/validation"],
  // Ensure standalone file tracing includes workspace packages when the app is
  // later containerised for the OVH VPS (docs/TADPOLE_PLAN.md §4).
  outputFileTracingRoot: path.join(__dirname, "..", ".."),
  // Public activity cover images live in Supabase Storage (public bucket).
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: SUPABASE_HOST,
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // geolocation=(self): onboarding's opt-in precise-location step uses it
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
        ],
      },
    ];
  },
};

export default nextConfig;
