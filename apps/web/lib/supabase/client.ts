"use client";

import { createAnonClient } from "@tadpole/core";

/**
 * Browser-side anon Supabase client, wired from NEXT_PUBLIC_* env. Lazily
 * constructed (never at module load / build time) so the static build needs no
 * keys. The full SSR cookie-based client (via @supabase/ssr) lands in the
 * auth/onboarding phase.
 */
export function getBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY — copy .env.example to .env.local and fill in the Supabase project values.",
    );
  }
  return createAnonClient(url, anonKey);
}
