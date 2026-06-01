import { useEffect, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
  listGuideCategories,
  listGuides,
  type GuideCard as GuideCardData,
  type GuideCategoryItem,
} from "@tadpole/core";
import { supabase } from "@/lib/supabase";
import { AppHeader } from "@/components/app-header";
import { GuideCard } from "@/components/guide-card";
import { NotMedicalAdvice } from "@/components/not-medical-advice";
import { CrisisCallout } from "@/components/crisis-callout";

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

export default function GuidesIndex() {
  const [categories, setCategories] = useState<GuideCategoryItem[] | null>(null);
  const [items, setItems] = useState<GuideCardData[] | null>(null);
  const [error, setError] = useState<string | undefined>();

  // null = all categories.
  const [categorySlug, setCategorySlug] = useState<string | null>(null);

  // Filter chips load once (public, anon).
  useEffect(() => {
    let active = true;
    listGuideCategories(supabase)
      .then((c) => active && setCategories(c))
      .catch(() => {
        /* non-fatal: the topic chips just don't render. The guides list drives
           the error banner, so a categories hiccup can't clobber it. */
      });
    return () => {
      active = false;
    };
  }, []);

  // Guides reload whenever the category filter changes. The core query filters
  // by category server-side and returns newest first.
  useEffect(() => {
    let active = true;
    setItems(null);
    setError(undefined);
    listGuides(supabase, { categorySlug })
      .then((d) => active && setItems(d))
      .catch(() => active && setError("Couldn't load guides."));
    return () => {
      active = false;
    };
  }, [categorySlug]);

  return (
    <View className="flex-1 bg-bg">
      <AppHeader />
      <ScrollView>
        <View className="gap-4 px-6 py-6">
          <View className="gap-1">
            <Text className="text-2xl font-semibold text-ink">guides</Text>
            <Text className="text-sm text-ink/60">
              Honest, down-to-earth reads for dads — on the hard days, the small wins, and looking
              after yourself so you can look after them.
            </Text>
          </View>

          {/* Safety surfaces are first-class here, near the top of the page. */}
          <NotMedicalAdvice />
          <CrisisCallout />

          {error ? <Text className="text-sm text-error">{error}</Text> : null}

          {/* Topic (category) filter */}
          {categories && categories.length > 0 ? (
            <View className="gap-2">
              <Text className="text-xs font-medium uppercase tracking-wide text-ink/50">Topic</Text>
              <View className="flex-row flex-wrap gap-2">
                <Chip
                  label="All topics"
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
          {items === null && !error ? (
            <Text className="text-sm text-ink/50">loading…</Text>
          ) : items && items.length === 0 ? (
            <View className="py-12">
              <Text className="text-center text-lg font-semibold text-ink">nothing here yet</Text>
              <Text className="mt-2 text-center text-sm text-ink/60">
                {categorySlug
                  ? "Try a different topic — we're adding new guides all the time."
                  : "We're adding new guides all the time. Check back soon."}
              </Text>
            </View>
          ) : (
            <View className="gap-4">
              {(items ?? []).map((g) => (
                <GuideCard key={g.id} guide={g} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
