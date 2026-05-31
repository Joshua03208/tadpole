import { z } from "zod";

// Shared Zod schemas used by BOTH web and mobile forms (and by packages/core
// at the data boundary). Phase 0 ships only the public-env schema; the profile
// + 18+ age-gate schemas land in Phase 2 (onboarding), kept aligned with the
// DB constraints in supabase/migrations.

export const publicEnvSchema = z.object({
  supabaseUrl: z.string().min(1, "Supabase URL is required"),
  supabaseAnonKey: z.string().min(1, "Supabase anon key is required"),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;
