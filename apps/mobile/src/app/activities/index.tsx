import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
  listActivities,
  listActivityAreas,
  listCategories,
  type ActivityCard as ActivityCardData,
  type AreaSummary,
  type CategoryItem,
} from "@tadpole/core";
import { supabase } from "@/lib/supabase";
import { AppHeader } from "@/components/app-header";
import { ActivityCard } from "@/components/activity-card";

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={`rounded-full px-3 py-1.5 active:opacity-70 ${
        active ? "bg-accent" : "border border-ink/15"
      }`}
    >
      <Text className={`text-xs font-semibold ${active ? "text-bg" : "text-ink/70"}`}>{label}</Text>
    </Pressable>
  );
}

export default function ActivitiesIndex() {
  const [areas, setAreas] = useState<AreaSummary[] | null>(null);
  const [categories, setCategories] = useState<CategoryItem[] | null>(null);
  const [items, setItems] = useState<ActivityCardData[] | null>(null);
  const [error, setError] = useState<string | undefined>();

  // null = all areas / all categories.
  const [areaSlug, setAreaSlug] = useState<string | null>(null);
  const [categorySlug, setCategorySlug] = useState<string | null>(null);

  // Filter chips load once (public, anon).
  useEffect(() => {
    let active = true;
    Promise.all([listActivityAreas(supabase), listCategories(supabase)])
      .then(([a, c]) => {
        if (!active) return;
        setAreas(a);
        setCategories(c);
      })
      .catch(() => active && setError("Couldn't load the explore filters."));
    return () => {
      active = false;
    };
  }, []);

  // Activities reload whenever the area filter changes. Category is filtered
  // client-side (the core query filters by area only).
  useEffect(() => {
    let active = true;
    setItems(null);
    setError(undefined);
    listActivities(supabase, { areaSlug })
      .then((d) => active && setItems(d))
      .catch(() => active && setError("Couldn't load activities."));
    return () => {
      active = false;
    };
  }, [areaSlug]);

  const visible =
    items && categorySlug ? items.filter((a) => a.categorySlug === categorySlug) : items;

  return (
    <View className="flex-1 bg-bg">
      <AppHeader />
      <ScrollView>
        <View className="gap-4 px-6 py-6">
          <View className="gap-1">
            <Text className="text-2xl font-semibold text-ink">explore</Text>
            <Text className="text-sm text-ink/60">
              Dad-friendly places to take the kids — soft play, parks, cafes, swim classes and
              playgroups near you.
            </Text>
          </View>

          {error ? <Text className="text-sm text-error">{error}</Text> : null}

          {/* Area filter */}
          <View className="gap-2">
            <Text className="text-xs font-medium uppercase tracking-wide text-ink/50">Area</Text>
            {areas === null && !error ? (
              <Text className="text-sm text-ink/50">loading…</Text>
            ) : (
              <View className="flex-row flex-wrap gap-2">
                <Chip label="All areas" active={areaSlug === null} onPress={() => setAreaSlug(null)} />
                {(areas ?? []).map((a) => (
                  <Chip
                    key={a.slug}
                    label={`${a.name} (${a.activityCount})`}
                    active={areaSlug === a.slug}
                    onPress={() => setAreaSlug(a.slug)}
                  />
                ))}
              </View>
            )}
          </View>

          {/* Category filter */}
          {categories && categories.length > 0 ? (
            <View className="gap-2">
              <Text className="text-xs font-medium uppercase tracking-wide text-ink/50">Type</Text>
              <View className="flex-row flex-wrap gap-2">
                <Chip
                  label="All types"
                  active={categorySlug === null}
                  onPress={() => setCategorySlug(null)}
                />
                {categories.map((c) => (
                  <Chip
                    key={c.slug}
                    label={c.name}
                    active={categorySlug === c.slug}
                    onPress={() => setCategorySlug(c.slug)}
                  />
                ))}
              </View>
            </View>
          ) : null}

          {/* Results */}
          {visible === null && !error ? (
            <Text className="text-sm text-ink/50">loading…</Text>
          ) : visible && visible.length === 0 ? (
            <View className="py-12">
              <Text className="text-center text-lg font-semibold text-ink">nothing here yet</Text>
              <Text className="mt-2 text-center text-sm text-ink/60">
                {categorySlug || areaSlug
                  ? "Try a different area or type — we're adding new places all the time."
                  : "We're adding dad-friendly places all the time. Check back soon."}
              </Text>
            </View>
          ) : (
            <View className="gap-4">
              {(visible ?? []).map((a) => (
                <ActivityCard key={a.id} activity={a} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
