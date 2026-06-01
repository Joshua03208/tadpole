import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { COST_TIER_LABELS, type ActivityCard as ActivityCardData } from "@tadpole/core";
import { ActivityCover } from "@/components/activity-cover";

export function ActivityCard({ activity }: { activity: ActivityCardData }) {
  const costLabel = COST_TIER_LABELS[activity.costTier] ?? activity.costTier;
  // Per-area unique slug -> the nested route /activities/[area]/[slug]. With
  // typedRoutes on, the object form supplies the dynamic segments type-safely
  // (equivalent to "/activities/" + areaSlug + "/" + slug).
  const href = {
    pathname: "/activities/[area]/[slug]",
    params: { area: activity.areaSlug, slug: activity.slug },
  } as const;

  return (
    <Link href={href} asChild>
      <Pressable className="rounded-2xl border border-ink/10 bg-white/50 p-3 active:opacity-80">
        <ActivityCover
          coverUrl={activity.coverUrl}
          title={activity.title}
          categorySlug={activity.categorySlug}
        />
        <View className="mt-3 gap-1">
          <Text className="text-base font-semibold text-ink" numberOfLines={2}>
            {activity.title}
          </Text>
          <Text className="text-xs text-ink/55" numberOfLines={1}>
            {activity.areaName} · {activity.categoryName}
          </Text>
          {activity.summary ? (
            <Text className="mt-0.5 text-sm text-ink/70" numberOfLines={2}>
              {activity.summary}
            </Text>
          ) : null}
          <View className="mt-1 flex-row">
            <View className="rounded-full bg-accent/10 px-2.5 py-1">
              <Text className="text-xs font-semibold text-accent">{costLabel}</Text>
            </View>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}
