import type { NextConfig } from "next";
import path from "node:path";

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
        hostname: "mzbbsrqoqqhjooyjyfaw.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
