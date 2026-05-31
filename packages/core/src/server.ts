import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";
import type { Database } from "@tadpole/types";

/**
 * SERVER-ONLY service-role client. It bypasses ALL row-level security.
 *
 * NON-NEGOTIABLE (CLAUDE.md): never import this from apps/mobile or any
 * client/browser bundle. Only Next.js route handlers, server actions, or
 * Supabase Edge Functions may use it. It is exposed under the "@tadpole/core/server"
 * subpath specifically so it can never be pulled into a client bundle by accident.
 */
export function createServiceClient(
  supabaseUrl: string,
  serviceRoleKey: string,
): SupabaseClient<Database> {
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
