import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@tadpole/types";

type Client = SupabaseClient<Database>;
type MessageRow = Database["public"]["Tables"]["messages"]["Row"];

export type MessageItem = {
  id: string;
  matchId: string;
  senderId: string;
  body: string;
  createdAt: string;
};

function toItem(row: MessageRow): MessageItem {
  return {
    id: row.id,
    matchId: row.match_id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
  };
}

const COLS = "id, match_id, sender_id, body, created_at";

// ---- history ---------------------------------------------------------------
// Most recent `limit` messages, returned chronologically (oldest -> newest) for
// display. RLS restricts rows to the two match participants.
export async function listMessages(
  client: Client,
  matchId: string,
  opts?: { limit?: number },
): Promise<MessageItem[]> {
  const { data, error } = await client
    .from("messages")
    .select(COLS)
    .eq("match_id", matchId)
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? 200);
  if (error) throw error;
  return (data ?? []).map(toItem).reverse();
}

// ---- send ------------------------------------------------------------------
export async function sendMessage(
  client: Client,
  matchId: string,
  body: string,
): Promise<MessageItem> {
  const { data: auth } = await client.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("Not authenticated");

  const { data, error } = await client
    .from("messages")
    .insert({ match_id: matchId, sender_id: uid, body })
    .select(COLS)
    .single();
  if (error) throw error; // RLS (participant gate), body CHECK, and rate ceiling
  return toItem(data);
}

// ---- realtime --------------------------------------------------------------
// Live INSERTs for one conversation. Delivery is gated by the messages SELECT
// RLS (postgres_changes re-checks it per subscriber), so a non-participant
// never receives the stream. Returns an unsubscribe fn for effect cleanup.
export function subscribeToMessages(
  client: Client,
  matchId: string,
  onInsert: (message: MessageItem) => void,
): () => void {
  const channel = client
    .channel(`messages:${matchId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `match_id=eq.${matchId}` },
      (payload) => onInsert(toItem(payload.new as MessageRow)),
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}

// ---- moderation: report a message (atomic snapshot + block + delete) -------
export async function reportMessage(
  client: Client,
  messageId: string,
  reason: string,
  detail?: string,
): Promise<void> {
  const { error } = await client.rpc("report_message", {
    p_message_id: messageId,
    p_reason: reason,
    p_detail: detail,
  });
  if (error) throw error;
}

// ---- read state ------------------------------------------------------------
export async function markRead(client: Client, matchId: string): Promise<void> {
  const { data: auth } = await client.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return;
  const { error } = await client
    .from("message_reads")
    .upsert(
      { match_id: matchId, user_id: uid, last_read_at: new Date().toISOString() },
      { onConflict: "match_id,user_id" },
    );
  if (error) throw error;
}

// Unread count per conversation for the signed-in user (matchId -> count).
export async function unreadCounts(client: Client): Promise<Map<string, number>> {
  const { data, error } = await client.rpc("unread_counts");
  if (error) throw error;
  const map = new Map<string, number>();
  for (const row of data ?? []) map.set(row.match_id, Number(row.unread));
  return map;
}

// ---- recent conversations ---------------------------------------------------
export type RecentConversation = {
  matchId: string;
  otherId: string;
  displayName: string;
  avatarUrl: string | null;
  areaLabel: string | null;
  lastBody: string | null;
  lastAt: string | null;
  lastSenderId: string | null;
  unread: number;
};

// The caller's matches with the other dad's profile, latest message and unread
// count in ONE round trip (vs listMatches + unreadCounts + per-match queries).
// Backed by the security-invoker recent_conversations() RPC — RLS does all the
// gating. Ordered by most recent activity.
export async function listRecentConversations(
  client: Client,
  opts?: { limit?: number },
): Promise<RecentConversation[]> {
  const { data, error } = await client.rpc("recent_conversations", {
    p_limit: opts?.limit ?? 8,
  });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    matchId: row.match_id,
    otherId: row.other_id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    areaLabel: row.area_label,
    lastBody: row.last_body,
    lastAt: row.last_at,
    lastSenderId: row.last_sender_id,
    unread: Number(row.unread),
  }));
}
