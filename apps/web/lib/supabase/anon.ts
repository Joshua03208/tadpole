import { createAnonClient } from "@tadpole/core";

/**
 * Sessionless anon Supabase client for PUBLIC, ISR-friendly reads (Activity
 * Finder). Unlike createSupabaseServerClient (which awaits cookies() and so
 * forces dynamic rendering), this client touches no request state, so pages
 * using it can be statically generated and revalidated on a timer.
 *
 * Use ONLY for public place/area/category data — never to read user data.
 */
export function getAnonServerClient() {
  return createAnonClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
