import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, DeckCard } from "@tadpole/types";

type Client = SupabaseClient<Database>;

// ---- the deck --------------------------------------------------------------
export async function getDeck(
  client: Client,
  opts?: { limit?: number; parentingStage?: string | null; areaSlug?: string | null },
): Promise<DeckCard[]> {
  const { data, error } = await client.rpc("get_swipe_deck", {
    p_limit: opts?.limit ?? 20,
    p_parenting_stage: opts?.parentingStage ?? undefined,
    p_area_slug: opts?.areaSlug ?? undefined,
  });
  if (error) throw error;
  return data ?? [];
}

// ---- record a swipe; report whether it created a mutual match --------------
export type SwipeResult = { matched: boolean; matchId: string | null };

export async function recordSwipe(
  client: Client,
  targetId: string,
  direction: "like" | "pass",
): Promise<SwipeResult> {
  const { data: auth } = await client.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("Not authenticated");

  const { error } = await client
    .from("swipes")
    .insert({ swiper_id: uid, target_id: targetId, direction });
  if (error) throw error; // includes the server-side abuse ceiling

  if (direction !== "like") return { matched: false, matchId: null };

  // handle_swipe (trigger) created the match if reciprocal; read it back.
  const [a, b] = uid < targetId ? [uid, targetId] : [targetId, uid];
  const { data: match } = await client
    .from("matches")
    .select("id")
    .eq("user_a", a)
    .eq("user_b", b)
    .maybeSingle();
  return { matched: Boolean(match), matchId: match?.id ?? null };
}

// ---- matches list ----------------------------------------------------------
export type MatchListItem = {
  matchId: string;
  createdAt: string;
  otherId: string;
  other: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    areaLabel: string | null;
    parentingStage: string | null;
  } | null;
};

export async function listMatches(client: Client): Promise<MatchListItem[]> {
  const { data: auth } = await client.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return [];

  const { data: matches, error } = await client
    .from("matches")
    .select("id, created_at, user_a, user_b")
    .order("created_at", { ascending: false });
  if (error) throw error;
  if (!matches || matches.length === 0) return [];

  const otherIds = matches.map((m) => (m.user_a === uid ? m.user_b : m.user_a));
  const { data: profiles } = await client
    .from("profiles")
    .select("id, display_name, avatar_url, area_label, parenting_stage")
    .in("id", otherIds);
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));

  return matches.map((m) => {
    const otherId = m.user_a === uid ? m.user_b : m.user_a;
    const p = byId.get(otherId);
    return {
      matchId: m.id,
      createdAt: m.created_at,
      otherId,
      other: p
        ? {
            id: p.id,
            displayName: p.display_name,
            avatarUrl: p.avatar_url,
            areaLabel: p.area_label,
            parentingStage: p.parenting_stage,
          }
        : null,
    };
  });
}

// ---- safety actions --------------------------------------------------------
export async function blockUser(client: Client, otherId: string): Promise<void> {
  const { error } = await client.rpc("block_user", { p_other: otherId });
  if (error) throw error;
}

export async function unmatchUser(client: Client, otherId: string): Promise<void> {
  const { error } = await client.rpc("unmatch", { p_other: otherId, p_block: false });
  if (error) throw error;
}

// Atomic: files the report AND blocks AND removes any match (one transaction).
export async function reportAndBlock(
  client: Client,
  reportedId: string,
  reason: string,
  detail?: string,
): Promise<void> {
  const { error } = await client.rpc("report_and_block", {
    p_reported: reportedId,
    p_reason: reason,
    p_detail: detail,
  });
  if (error) throw error;
}
