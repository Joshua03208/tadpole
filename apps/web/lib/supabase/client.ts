"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@tadpole/types";

let client: ReturnType<typeof createBrowserClient<Database>> | undefined;

/**
 * Browser Supabase client (cookie-based, shared session with SSR). Singleton so
 * the whole client tree uses one instance. Reads NEXT_PUBLIC_* inlined at build.
 */
export function getBrowserClient() {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY — copy .env.example to .env.local.",
    );
  }
  client = createBrowserClient<Database>(url, anonKey);
  return client;
}
