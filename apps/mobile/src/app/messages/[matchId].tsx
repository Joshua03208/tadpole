import { useCallback, useEffect, useRef, useState } from "react";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  listMatches,
  listMessages,
  markRead,
  sendMessage,
  subscribeToMessages,
  unmatchUser,
  type MatchListItem,
  type MessageItem,
} from "@tadpole/core";
import { messageSchema, MESSAGE_MAX } from "@tadpole/validation";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { MeetupSafetyNote } from "@/components/meetup-safety-note";
import { ReportMessageSheet } from "@/components/report-message-sheet";
import { GetHelpButton } from "@/components/crisis";

function timeLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function Conversation() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const { loading: authLoading, session } = useAuth();
  const myId = session?.user?.id ?? null;

  const [header, setHeader] = useState<MatchListItem | null | undefined>(undefined); // undefined = loading, null = ended
  const [messages, setMessages] = useState<MessageItem[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | undefined>();
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [unmatching, setUnmatching] = useState(false);

  const listRef = useRef<FlatList<MessageItem>>(null);
  const focusedRef = useRef(true);
  const atBottomRef = useRef(true); // only autoscroll when the user is already at the bottom

  // Append a realtime/optimistic message, deduped by id, keeping chronological order.
  const appendMessage = useCallback((m: MessageItem) => {
    setMessages((prev) => {
      const base = prev ?? [];
      if (base.some((x) => x.id === m.id)) return base;
      return [...base, m];
    });
  }, []);

  // Resolve the conversation header from the match list. Absent => conversation ended.
  useEffect(() => {
    if (!session || !matchId) return;
    let active = true;
    listMatches(supabase)
      .then((items) => {
        if (!active) return;
        setHeader(items.find((m) => m.matchId === matchId) ?? null);
      })
      .catch(() => active && setHeader(null));
    return () => {
      active = false;
    };
  }, [session, matchId]);

  // Load history, mark read, and subscribe to live inserts.
  useEffect(() => {
    if (!session || !matchId) return;
    let active = true;
    focusedRef.current = true;
    setMessages(null);
    setLoadError(false);

    listMessages(supabase, matchId)
      .then((items) => {
        if (!active) return;
        // Merge, don't overwrite: a realtime INSERT may land before history resolves.
        setMessages((prev) => {
          const seen = new Set(items.map((h) => h.id));
          const extras = (prev ?? []).filter((m) => !seen.has(m.id));
          return [...items, ...extras];
        });
        void markRead(supabase, matchId).catch(() => {});
      })
      .catch(() => active && setLoadError(true));

    const unsubscribe = subscribeToMessages(supabase, matchId, (m) => {
      appendMessage(m);
      // A fresh incoming message while the screen is focused counts as read.
      if (focusedRef.current && m.senderId !== myId) {
        void markRead(supabase, matchId).catch(() => {});
      }
    });

    return () => {
      active = false;
      focusedRef.current = false;
      unsubscribe();
    };
  }, [session, matchId, myId, appendMessage]);

  // Keep newest visible as messages arrive — but only if the user is already at
  // the bottom, so reading older history isn't yanked away.
  useEffect(() => {
    if (messages && messages.length > 0 && atBottomRef.current) {
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    }
  }, [messages?.length]);

  const send = useCallback(async () => {
    const parsed = messageSchema.safeParse(draft);
    if (!parsed.success) {
      setSendError(parsed.error.issues[0]?.message ?? "Type a message.");
      return;
    }
    if (!matchId) return;
    const body = parsed.data;
    setSending(true);
    setSendError(undefined);
    setDraft("");
    try {
      const sent = await sendMessage(supabase, matchId, body);
      appendMessage(sent); // realtime will echo; deduped by id
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setSendError(
        /limit reached|rate/i.test(msg)
          ? "You're sending messages very quickly — give it a moment."
          : /2000|length|check/i.test(msg)
            ? `Keep messages under ${MESSAGE_MAX} characters.`
            : "Couldn't send that. Please try again.",
      );
      setDraft(body); // restore so they can retry
    } finally {
      setSending(false);
    }
  }, [draft, matchId, appendMessage]);

  const onUnmatch = useCallback(async () => {
    if (!header?.otherId) return;
    setUnmatching(true);
    try {
      await unmatchUser(supabase, header.otherId);
      router.replace("/matches"); // match is gone — conversation has ended
    } catch {
      setUnmatching(false);
      setSendError("Couldn't unmatch. Please try again.");
    }
  }, [header]);

  if (!authLoading && !session) return <Redirect href="/sign-in" />;

  const otherName = header?.other?.displayName ?? "this dad";

  return (
    <View className="flex-1 bg-bg">
      {/* Header: back, other dad, unmatch */}
      <View className="flex-row items-center justify-between border-b border-ink/10 bg-bg px-5 pb-3 pt-14">
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.replace("/matches")}
            hitSlop={10}
            accessibilityLabel="Back to matches"
            className="active:opacity-70"
          >
            <Text className="text-base font-semibold text-ink/70">‹ back</Text>
          </Pressable>
          {header?.other?.avatarUrl ? (
            <Image source={{ uri: header.other.avatarUrl }} className="h-8 w-8 rounded-full" />
          ) : header?.other ? (
            <View className="h-8 w-8 items-center justify-center rounded-full bg-accent/15">
              <Text className="text-xs font-semibold text-accent">
                {otherName[0]?.toUpperCase() ?? "?"}
              </Text>
            </View>
          ) : null}
          <Text className="text-base font-semibold text-ink" numberOfLines={1}>
            {header === undefined ? "…" : otherName}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          {/* Crisis surface stays reachable from chat (persistent, doesn't scroll away). */}
          <GetHelpButton />
          {header ? (
            <Pressable
              onPress={onUnmatch}
              disabled={unmatching}
              accessibilityLabel={`Unmatch ${otherName}`}
              className={`rounded-full border border-ink/15 px-3 py-1.5 active:opacity-70 ${
                unmatching ? "opacity-50" : ""
              }`}
            >
              <Text className="text-xs font-semibold text-ink/70">unmatch</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Conversation ended (unmatched / blocked / reported) */}
      {header === null ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-center text-lg font-semibold text-ink">this conversation has ended</Text>
          <Text className="mt-2 text-center text-sm text-ink/60">
            You&apos;re no longer connected with this dad. Head back to your matches to keep going.
          </Text>
          <Pressable
            onPress={() => router.replace("/matches")}
            className="mt-5 rounded-lg bg-accent px-4 py-3 active:opacity-80"
          >
            <Text className="text-center text-sm font-semibold text-bg">back to matches</Text>
          </Pressable>
        </View>
      ) : (
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
        >
          {loadError ? (
            <View className="flex-1 items-center justify-center px-8">
              <Text className="text-center text-ink/70">Couldn&apos;t load this conversation.</Text>
              <Pressable
                onPress={() => {
                  setLoadError(false);
                  setMessages(null);
                  if (matchId) {
                    listMessages(supabase, matchId)
                      .then(setMessages)
                      .catch(() => setLoadError(true));
                  }
                }}
                className="mt-4 rounded-lg border border-ink/15 px-4 py-2 active:opacity-80"
              >
                <Text className="text-sm font-semibold text-ink">try again</Text>
              </Pressable>
            </View>
          ) : messages === null ? (
            <View className="flex-1 items-center justify-center px-8">
              <Text className="text-sm text-ink/50">loading…</Text>
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(m) => m.id}
              className="flex-1"
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16, gap: 8 }}
              keyboardShouldPersistTaps="handled"
              scrollEventThrottle={100}
              onScroll={(e) => {
                const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
                atBottomRef.current =
                  contentOffset.y + layoutMeasurement.height >= contentSize.height - 80;
              }}
              onContentSizeChange={() => {
                if (atBottomRef.current) listRef.current?.scrollToEnd({ animated: false });
              }}
              ListHeaderComponent={
                <View className="mb-2">
                  <MeetupSafetyNote />
                </View>
              }
              ListEmptyComponent={
                <View className="items-center py-12">
                  <Text className="text-center text-base font-semibold text-ink">say hello</Text>
                  <Text className="mt-2 text-center text-sm text-ink/60">
                    You both said hi. Break the ice — keep it friendly, platonic, and real.
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const mine = item.senderId === myId;
                return (
                  <Pressable
                    onLongPress={mine ? undefined : () => setReportingId(item.id)}
                    accessibilityRole="text"
                    accessibilityLabel={
                      mine
                        ? `You said: ${item.body}`
                        : `${otherName} said: ${item.body}. Long press to report.`
                    }
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 active:opacity-80 ${
                      mine
                        ? "self-end bg-accent/15 border border-accent/20"
                        : "self-start border border-ink/10 bg-white/70"
                    }`}
                  >
                    <Text className="text-[15px] leading-5 text-ink">{item.body}</Text>
                    <Text className={`mt-1 text-[10px] ${mine ? "text-accent/70" : "text-ink/40"}`}>
                      {timeLabel(item.createdAt)}
                    </Text>
                  </Pressable>
                );
              }}
            />
          )}

          {/* Composer */}
          <View className="border-t border-ink/10 bg-bg px-4 pb-8 pt-3">
            {sendError ? <Text className="mb-2 text-sm text-error">{sendError}</Text> : null}
            <View className="flex-row items-end gap-2">
              <TextInput
                value={draft}
                onChangeText={(t) => {
                  setDraft(t);
                  if (sendError) setSendError(undefined);
                }}
                placeholder="message"
                placeholderTextColor="#00000066"
                multiline
                maxLength={MESSAGE_MAX}
                accessibilityLabel={`Message ${otherName}`}
                className="max-h-28 flex-1 rounded-2xl border border-ink/15 bg-white/60 px-3.5 py-2.5 text-ink"
                style={{ textAlignVertical: "top" }}
                editable={!sending}
              />
              <Pressable
                onPress={send}
                disabled={sending || draft.trim().length === 0}
                accessibilityLabel="Send message"
                className={`h-11 items-center justify-center rounded-2xl bg-accent px-4 active:scale-[0.98] ${
                  sending || draft.trim().length === 0 ? "opacity-50" : ""
                }`}
              >
                <Text className="text-sm font-semibold text-bg">{sending ? "…" : "send"}</Text>
              </Pressable>
            </View>
            <Text className="mt-2 text-center text-[11px] text-ink/40">
              platonic, never dating · long-press a message to report
            </Text>
          </View>
        </KeyboardAvoidingView>
      )}

      {reportingId ? (
        <ReportMessageSheet messageId={reportingId} onClose={() => setReportingId(null)} />
      ) : null}
    </View>
  );
}
