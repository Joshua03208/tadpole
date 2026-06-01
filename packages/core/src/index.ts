export { createAnonClient } from "./supabase";
export * from "./account";

export type { SupabaseClient } from "@supabase/supabase-js";
export type { Database, Json } from "@tadpole/types";

// NOTE: createServiceClient is deliberately NOT re-exported here. Import it from
// "@tadpole/core/server" in server-only code so the service_role path can never
// be bundled into a client/mobile build.
