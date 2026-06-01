import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Profile, Area } from "@tadpole/types";
import type {
  SignUpInput,
  SignInInput,
  OnboardingProfileInput,
  LocationInput,
} from "@tadpole/validation";

type Client = SupabaseClient<Database>;

// ---- auth ------------------------------------------------------------------
// DOB + display_name go in the signUp `data` (raw_user_meta_data). The DB
// trigger enforces the atomic 18+ gate; an under-18/missing-DOB signup fails
// here with a database error and creates no user.
export function signUpDad(client: Client, input: SignUpInput, emailRedirectTo?: string) {
  return client.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo,
      data: { date_of_birth: input.dateOfBirth, display_name: input.displayName },
    },
  });
}

export function signInWithPassword(client: Client, input: SignInInput) {
  return client.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });
}

export function signOut(client: Client) {
  return client.auth.signOut();
}

async function requireUid(client: Client): Promise<string> {
  const { data } = await client.auth.getUser();
  const uid = data.user?.id;
  if (!uid) throw new Error("Not authenticated");
  return uid;
}

// ---- profile ---------------------------------------------------------------
export async function getMyProfile(client: Client): Promise<Profile | null> {
  const { data: auth } = await client.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return null;
  const { data, error } = await client
    .from("profiles")
    .select("*")
    .eq("id", uid)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export function isOnboarded(profile: Profile | null): boolean {
  return Boolean(profile?.onboarded_at);
}

export async function listAreas(client: Client): Promise<Area[]> {
  const { data, error } = await client.from("areas").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function completeOnboarding(
  client: Client,
  input: OnboardingProfileInput,
): Promise<Profile> {
  const uid = await requireUid(client);
  const trimmedBio = input.bio?.trim();
  const patch: Database["public"]["Tables"]["profiles"]["Update"] = {
    display_name: input.displayName,
    parenting_stage: input.parentingStage ?? null,
    area_label: input.areaLabel ?? null,
    area_slug: input.areaSlug ?? null,
    bio: trimmedBio ? trimmedBio : null,
    onboarded_at: new Date().toISOString(),
  };
  const { data, error } = await client
    .from("profiles")
    .update(patch)
    .eq("id", uid)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

// ---- precise location opt-in (only written when the user opts in) ----------
export async function getMyLocation(
  client: Client,
): Promise<{ lat: number; lng: number } | null> {
  const { data: auth } = await client.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return null;
  const { data, error } = await client
    .from("profile_locations")
    .select("lat, lng")
    .eq("id", uid)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function setMyLocation(client: Client, loc: LocationInput): Promise<void> {
  const uid = await requireUid(client);
  const { error } = await client
    .from("profile_locations")
    .upsert({ id: uid, lat: loc.lat, lng: loc.lng });
  if (error) throw error;
}

export async function clearMyLocation(client: Client): Promise<void> {
  const uid = await requireUid(client);
  const { error } = await client.from("profile_locations").delete().eq("id", uid);
  if (error) throw error;
}

// ---- avatar (optional). EXIF-GPS must be stripped by the caller before upload
// (web: canvas re-encode; mobile: expo-image-manipulator). Path is folder-scoped
// to the user id to satisfy the Storage RLS policy.
export async function uploadAvatar(
  client: Client,
  body: ArrayBuffer | Uint8Array,
  contentType: "image/jpeg" | "image/png" | "image/webp",
): Promise<string> {
  const uid = await requireUid(client);
  const ext =
    contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
  const path = `${uid}/avatar.${ext}`;
  const { error: uploadError } = await client.storage
    .from("avatars")
    .upload(path, body, { upsert: true, contentType });
  if (uploadError) throw uploadError;
  const { data } = client.storage.from("avatars").getPublicUrl(path);
  // Cache-bust so a replaced avatar refreshes.
  const url = `${data.publicUrl}?v=${Date.now()}`;
  const { error: updateError } = await client
    .from("profiles")
    .update({ avatar_url: url })
    .eq("id", uid);
  if (updateError) throw updateError;
  return url;
}

// ---- account deletion (soft-delete + anonymise, server-side) ---------------
export async function requestAccountDeletion(client: Client): Promise<void> {
  const { error } = await client.rpc("request_account_deletion");
  if (error) throw error;
}
