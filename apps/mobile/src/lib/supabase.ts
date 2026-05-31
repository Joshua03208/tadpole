import { createAnonClient } from "@tadpole/core";

/**
 * On-device anon Supabase client, wired from EXPO_PUBLIC_* env (inlined by Expo
 * at build time). Lazily constructed so the shell boots without keys during
 * Phase 0. Session storage (SecureStore/AsyncStorage) is wired in the
 * auth/onboarding phase.
 */
export function getMobileClient() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY — set them in .env / EAS env for the mobile app.",
    );
  }
  return createAnonClient(url, anonKey);
}
