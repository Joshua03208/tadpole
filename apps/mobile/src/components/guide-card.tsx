import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";
import type { GuideCard as GuideCardData } from "@tadpole/core";
import { GuideCover } from "@/components/guide-cover";

export function GuideCard({ guide }: { guide: GuideCardData }) {
  // Flat, globally-unique slug -> the flat route /guides/[slug]. With
  // typedRoutes on, the object form supplies the dynamic segment type-safely.
  const href = {
    pathname: "/guides/[slug]",
    params: { slug: guide.slug },
  } as const;

  return (
    <Link href={href} asChild>
      <Pressable className="rounded-2xl border border-ink/10 bg-white/50 p-3 active:opacity-80">
        <GuideCover
          coverUrl={guide.coverUrl}
          title={guide.title}
          categorySlug={guide.categorySlug}
        />
        <View className="mt-3 gap-1">
          <View className="flex-row">
            <View className="rounded-full bg-accent/10 px-2.5 py-1">
              <Text className="text-xs font-semibold text-accent">{guide.categoryName}</Text>
            </View>
          </View>
          <Text className="mt-1 text-base font-semibold text-ink" numberOfLines={2}>
            {guide.title}
          </Text>
          {guide.summary ? (
            <Text className="text-sm text-ink/70" numberOfLines={2}>
              {guide.summary}
            </Text>
          ) : null}
          {guide.authorName ? (
            <Text className="mt-0.5 text-xs text-ink/50" numberOfLines={1}>
              {guide.authorName}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Link>
  );
}
