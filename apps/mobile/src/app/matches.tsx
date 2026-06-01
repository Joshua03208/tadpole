import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { blockUser, listMatches, unmatchUser, type MatchListItem } from "@tadpole/core";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { AppHeader } from "@/components/app-header";
import { ReportSheet } from "@/components/report-sheet";

const STAGE_LABELS: Record<string, string> = {
  expecting: "Expecting",
  newborn: "Newborn",
  infant: "Infant",
  toddler: "Toddler",
  child: "Child 4y+",
  multiple: "Multiple kids",
};

function Pill({
  label,
  onPress,
  disabled,
  tone = "ghost",
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  tone?: "ghost" | "danger" | "muted";
}) {
  const base = "rounded-full px-3 py-1.5";
  const styles =
    tone === "muted"
      ? "bg-ink/10"
      : tone === "danger"
        ? ""
        : "border border-ink/15";
  const text =
    tone === "muted" ? "text-ink/40" : tone === "danger" ? "text-error" : "text-ink/70";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || tone === "muted"}
      className={`${base} ${styles} active:opacity-70 ${disabled ? "opacity-50" : ""}`}
    >
      <Text className={`text-xs font-semibold ${text}`}>{label}</Text>
    </Pressable>
  );
}

export default function Matches() {
  const { loading, session } = useAuth();
  const [items, setItems] = useState<MatchListItem[] | null>(null);
  const [error, setError] = useState<string | undefined>();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [reporting, setReporting] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (!session) return;
    let active = true;
    listMatches(supabase)
      .then((d) => active && setItems(d))
      .catch(() => active && setError("Couldn't load your matches."));
    return () => {
      active = false;
    };
  }, [session]);

  if (!loading && !session) return <Redirect href="/sign-in" />;

  async function act(otherId: string, fn: () => Promise<void>) {
    setPendingId(otherId);
    setError(undefined);
    try {
      await fn();
      setItems((prev) => (prev ? prev.filter((m) => m.otherId !== otherId) : prev));
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
            (items ?? []).map((m) => {
              const name = m.other?.displayName ?? "member unavailable";
              const sub = m.other
                ? [m.other.areaLabel, m.other.parentingStage ? STAGE_LABELS[m.other.parentingStage] : null]
                    .filter(Boolean)
                    .join(" · ")
                : "this dad is no longer available";
              const disabled = pendingId === m.otherId;
              return (
                <View key={m.matchId} className="rounded-2xl border border-ink/10 bg-white/50 p-4">
                  <View className="flex-row items-center gap-3">
                    {m.other?.avatarUrl ? (
                      <Image source={{ uri: m.other.avatarUrl }} className="h-12 w-12 rounded-full" />
                    ) : (
                      <View className="h-12 w-12 items-center justify-center rounded-full bg-accent/15">
                        <Text className="font-semibold text-accent">{name[0]?.toUpperCase() ?? "?"}</Text>
                      </View>
                    )}
                    <View className="flex-1">
                      <Text className="font-semibold text-ink" numberOfLines={1}>
                        {name}
                      </Text>
                      {sub ? (
                        <Text className="text-xs text-ink/55" numberOfLines={1}>
                          {sub}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <View className="mt-3 flex-row flex-wrap items-center gap-2">
                    <Pill label="message · soon" tone="muted" />
                    <Pill
                      label="unmatch"
                      disabled={disabled}
                      onPress={() => act(m.otherId, () => unmatchUser(supabase, m.otherId))}
                    />
                    <Pill
                      label="block"
                      disabled={disabled}
                      onPress={() => act(m.otherId, () => blockUser(supabase, m.otherId))}
                    />
                    {m.other ? (
                      <Pill
                        label="report"
                        tone="danger"
                        disabled={disabled}
                        onPress={() => setReporting({ id: m.otherId, name })}
                      />
                    ) : null}
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
            setItems((prev) => (prev ? prev.filter((m) => m.otherId !== reporting.id) : prev));
            setReporting(null);
          }}
        />
      ) : null}
    </View>
  );
}
