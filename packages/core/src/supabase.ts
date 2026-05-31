import {
  createClient,
  type SupabaseClient,
  type SupabaseClientOptions,
} from "@supabase/supabase-js";
import type { Database } from "@tadpole/types";

/**
 * Anon Supabase client — safe to ship in the browser (web) and on-device
 * (mobile). The caller passes the URL + anon key, read from platform env in
 * the host app (NEXT_PUBLIC_* on web, EXPO_PUBLIC_* via expo-constants on
 * mobile), so packages/core stays platform-agnostic and never reads env itself.
 *
 * NEVER pass the service_role key here — use createServiceClient from
 * "@tadpole/core/server" in server-only code instead.
 */
export function createAnonClient(
  supabaseUrl: string,
  supabaseAnonKey: string,
  options?: SupabaseClientOptions<"public">,
): SupabaseClient<Database> {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    ...options,
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      ...options?.auth,
    },
  });
}
