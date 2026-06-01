import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { COST_TIER_LABELS, getActivity, type ActivityDetail } from "@tadpole/core";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { AppHeader } from "@/components/app-header";
import { ActivityCover } from "@/components/activity-cover";
import { MeetupSafetyNote } from "@/components/meetup-safety-note";

type LoadState =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "missing" }
  | { kind: "ready"; activity: ActivityDetail };

function LinkButton({
  label,
  url,
  tone = "primary",
}: {
  label: string;
  url: string;
  tone?: "primary" | "ghost";
}) {
  return (
    <Pressable
      onPress={() => void Linking.openURL(url)}
      className={`flex-1 rounded-lg px-4 py-3 active:opacity-80 ${
        tone === "primary" ? "bg-accent" : "border border-ink/15"
      }`}
    >
      <Text
        className={`text-center text-sm font-semibold ${tone === "primary" ? "text-bg" : "text-ink"}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function ActivityDetailScreen() {
  const { area, slug } = useLocalSearchParams<{ area: string; slug: string }>();
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    if (!area || !slug) {
      setState({ kind: "missing" });
      return;
    }
    let active = true;
    setState({ kind: "loading" });
    getActivity(supabase, area, slug)
      .then((a) => {
        if (!active) return;
        setState(a ? { kind: "ready", activity: a } : { kind: "missing" });
      })
      .catch(() => active && setState({ kind: "error" }));
    return () => {
      active = false;
    };
  }, [area, slug]);

  return (
    <View className="flex-1 bg-bg">
      <AppHeader />
      <ScrollView>
        <View className="gap-5 px-6 py-6">
          {state.kind === "loading" ? (
            <Text className="text-sm text-ink/50">loading…</Text>
          ) : state.kind === "error" ? (
            <View className="py-12">
              <Text className="text-center text-lg font-semibold text-ink">
                couldn&apos;t load this place
              </Text>
              <Text className="mt-2 text-center text-sm text-ink/60">
                Something went wrong. Please check your connection and try again.
              </Text>
            </View>
          ) : state.kind === "missing" ? (
            <View className="py-12">
              <Text className="text-center text-lg font-semibold text-ink">place not found</Text>
              <Text className="mt-2 text-center text-sm text-ink/60">
                This place may have moved or been removed. Head back to explore to find more.
              </Text>
            </View>
          ) : (
            <Detail activity={state.activity} />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function Detail({ activity }: { activity: ActivityDetail }) {
  const { session } = useAuth();
  const costLabel = COST_TIER_LABELS[activity.costTier] ?? activity.costTier;

  return (
    <View className="gap-5">
      <ActivityCover
        coverUrl={activity.coverUrl}
        title={activity.title}
        categorySlug={activity.categorySlug}
        rounded="rounded-3xl"
        heightClass="h-52"
      />

      <View className="gap-2">
        <Text className="text-2xl font-semibold text-ink">{activity.title}</Text>
        <Text className="text-sm text-ink/55">
          {activity.areaName} · {activity.categoryName}
        </Text>
        <View className="flex-row">
          <View className="rounded-full bg-accent/10 px-2.5 py-1">
            <Text className="text-xs font-semibold text-accent">{costLabel}</Text>
          </View>
        </View>
      </View>

      {activity.summary ? (
        <Text className="text-base text-ink/80">{activity.summary}</Text>
      ) : null}

      {activity.description ? (
        <Text className="text-sm leading-6 text-ink/70">{activity.description}</Text>
      ) : null}

      {activity.address ? (
        <View>
          <Text className="text-xs font-medium uppercase tracking-wide text-ink/50">Where</Text>
          <Text className="mt-1 text-sm text-ink">{activity.address}</Text>
        </View>
      ) : null}

      {activity.websiteUrl || activity.bookingUrl ? (
        <View className="flex-row gap-3">
          {activity.bookingUrl ? (
            <LinkButton label="Book a place" url={activity.bookingUrl} tone="primary" />
          ) : null}
          {activity.websiteUrl ? (
            <LinkButton
              label="Visit website"
              url={activity.websiteUrl}
              tone={activity.bookingUrl ? "ghost" : "primary"}
            />
          ) : null}
        </View>
      ) : null}

      {/* Guests get an actionable nudge into sign-up; signed-in dads see the
          muted placeholder until saving ships. */}
      {session ? (
        <View className="rounded-lg bg-ink/10 px-4 py-3">
          <Text className="text-center text-sm font-semibold text-ink/40">save · coming soon</Text>
        </View>
      ) : (
        <Pressable
          onPress={() => router.push("/sign-up")}
          className="rounded-lg bg-accent px-4 py-3 active:opacity-80"
          accessibilityRole="button"
        >
          <Text className="text-center text-sm font-semibold text-bg">sign up to save this place</Text>
        </Pressable>
      )}

      <MeetupSafetyNote />
    </View>
  );
}
