import { useCallback, useRef, useState } from "react";
import { Redirect, router, useFocusEffect } from "expo-router";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import {
  blockUser,
  listRecentConversations,
  unmatchUser,
  type RecentConversation,
} from "@tadpole/core";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { AppHeader } from "@/components/app-header";
import { ReportSheet } from "@/components/report-sheet";
import { Splash } from "@/components/splash";

// Compact relative time for the conversation list ("now", "5m", "3h", "2d", "1w").
function fmtAgo(iso: string): string {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d` : `${Math.floor(days / 7)}w`;
}

function Pill({
  label,
  onPress,
  disabled,
  tone = "ghost",
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  tone?: "ghost" | "danger";
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`rounded-full px-3 py-1.5 ${tone === "ghost" ? "border border-ink/15" : ""} active:opacity-70 ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <Text className={`text-xs font-semibold ${tone === "danger" ? "text-error" : "text-ink/70"}`}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function Matches() {
  const { loading, session } = useAuth();
  const [items, setItems] = useState<RecentConversation[] | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [reporting, setReporting] = useState<{ id: string; name: string } | null>(null);
  const hasLoaded = useRef(false);

  // One round trip (matches + last message + unread), refetched whenever the
  // screen regains focus so snippets, order and badges stay fresh — e.g. after
  // returning from a conversation that marked itself read. A failed background
  // refresh keeps the list we already have.
  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      let active = true;
      listRecentConversations(supabase, { limit: 50 })
        .then((d) => {
          if (!active) return;
          hasLoaded.current = true;
          setItems(d);
          setError(undefined);
        })
        .catch(() => {
          if (active && !hasLoaded.current) setError("Couldn't load your matches.");
        });
      return () => {
        active = false;
      };
    }, [session]),
  );

  if (loading) return <Splash />;
  if (!session) return <Redirect href="/sign-in" />;

  async function act(otherId: string, fn: () => Promise<void>) {
    setPendingId(otherId);
    setError(undefined);
    try {
      await fn();
      setItems((prev) => (prev ? prev.filter((c) => c.otherId !== otherId) : prev));
    } catch {
      setError("Couldn't complete that. Please try again.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <View className="flex-1 bg-bg">
      <AppHeader />
      <ScrollView>
        <View className="gap-3 px-6 py-6">
          <Text className="text-2xl font-semibold text-ink">matches</Text>
          {error ? <Text className="text-sm text-error">{error}</Text> : null}

          {items === null && !error ? (
            <Text className="text-sm text-ink/50">loading…</Text>
          ) : items && items.length === 0 ? (
            <View className="py-12">
              <Text className="text-center text-lg font-semibold text-ink">no matches yet</Text>
              <Text className="mt-2 text-center text-sm text-ink/60">
                When you and another dad both say hi, they&apos;ll show up here.
              </Text>
            </View>
          ) : (
            (items ?? []).map((c) => {
              const disabled = pendingId === c.otherId;
              const snippet = c.lastBody
                ? `${c.lastSenderId === c.otherId ? "" : "you: "}${c.lastBody}`
                : (c.areaLabel ?? "say hello 👋");
              return (
                <View key={c.matchId} className="rounded-2xl border border-ink/10 bg-white/50 p-4">
                  <Pressable
                    onPress={() =>
                      router.push({ pathname: "/messages/[matchId]", params: { matchId: c.matchId } })
                    }
                    accessibilityLabel={`Open conversation with ${c.displayName}`}
                    className="flex-row items-center gap-3 active:opacity-80"
                  >
                    {c.avatarUrl ? (
                      <Image source={{ uri: c.avatarUrl }} className="h-12 w-12 rounded-full" />
                    ) : (
                      <View className="h-12 w-12 items-center justify-center rounded-full bg-accent/15">
                        <Text className="font-semibold text-accent">
                          {c.displayName[0]?.toUpperCase() ?? "?"}
                        </Text>
                      </View>
                    )}
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text className="flex-1 font-semibold text-ink" numberOfLines={1}>
                          {c.displayName}
                        </Text>
                        {c.lastAt ? (
                          <Text className="text-[11px] text-ink/40">{fmtAgo(c.lastAt)}</Text>
                        ) : null}
                      </View>
                      <Text
                        className={`text-xs ${c.unread > 0 ? "font-semibold text-ink" : "text-ink/55"}`}
                        numberOfLines={1}
                      >
                        {snippet}
                      </Text>
                    </View>
                    {c.unread > 0 ? (
                      <View
                        accessibilityLabel={`${c.unread} unread message${c.unread === 1 ? "" : "s"}`}
                        className="min-w-6 items-center justify-center rounded-full bg-accent px-2 py-0.5"
                      >
                        <Text className="text-xs font-semibold text-bg">
                          {c.unread > 9 ? "9+" : c.unread}
                        </Text>
                      </View>
                    ) : null}
                  </Pressable>
                  <View className="mt-3 flex-row flex-wrap items-center gap-2">
                    <Pill
                      label="unmatch"
                      disabled={disabled}
                      onPress={() => act(c.otherId, () => unmatchUser(supabase, c.otherId))}
                    />
                    <Pill
                      label="block"
                      disabled={disabled}
                      onPress={() => act(c.otherId, () => blockUser(supabase, c.otherId))}
                    />
                    <Pill
                      label="report"
                      tone="danger"
                      disabled={disabled}
                      onPress={() => setReporting({ id: c.otherId, name: c.displayName })}
                    />
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {reporting ? (
        <ReportSheet
          reportedId={reporting.id}
          reportedName={reporting.name}
          onClose={() => setReporting(null)}
          onDone={() => {
            setItems((prev) => (prev ? prev.filter((c) => c.otherId !== reporting.id) : prev));
            setReporting(null);
          }}
        />
      ) : null}
    </View>
  );
}
