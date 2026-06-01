import { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { ScrollView, Text, View } from "react-native";
import { getGuide, type GuideDetail } from "@tadpole/core";
import { supabase } from "@/lib/supabase";
import { AppHeader } from "@/components/app-header";
import { GuideCover } from "@/components/guide-cover";
import { NotMedicalAdvice } from "@/components/not-medical-advice";
import { CrisisCallout } from "@/components/crisis-callout";

type LoadState =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "missing" }
  | { kind: "ready"; guide: GuideDetail };

// Guide bodies are stored as plain text (never HTML — we never render markup).
// Split into paragraphs on blank lines, falling back to single newlines so a
// body without blank-line spacing still reads as separate paragraphs.
function toParagraphs(body: string): string[] {
  const byBlank = body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (byBlank.length > 1) return byBlank;
  return body
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export default function GuideDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    if (!slug) {
      setState({ kind: "missing" });
      return;
    }
    let active = true;
    setState({ kind: "loading" });
    getGuide(supabase, slug)
      .then((g) => {
        if (!active) return;
        setState(g ? { kind: "ready", guide: g } : { kind: "missing" });
      })
      .catch(() => active && setState({ kind: "error" }));
    return () => {
      active = false;
    };
  }, [slug]);

  return (
    <View className="flex-1 bg-bg">
      <AppHeader />
      <ScrollView>
        <View className="gap-5 px-6 py-6">
          {/* Safety surfaces are first-class and present in EVERY state — not
              gated behind a successful load on this sensitive surface. */}
          <NotMedicalAdvice />
          <CrisisCallout />

          {state.kind === "loading" ? (
            <Text className="text-sm text-ink/50">loading…</Text>
          ) : state.kind === "error" ? (
            <View className="py-12">
              <Text className="text-center text-lg font-semibold text-ink">
                couldn&apos;t load this guide
              </Text>
              <Text className="mt-2 text-center text-sm text-ink/60">
                Something went wrong. Please check your connection and try again.
              </Text>
            </View>
          ) : state.kind === "missing" ? (
            <View className="py-12">
              <Text className="text-center text-lg font-semibold text-ink">guide not found</Text>
              <Text className="mt-2 text-center text-sm text-ink/60">
                This guide may have moved or been removed. Head back to guides to find more.
              </Text>
            </View>
          ) : (
            <Detail guide={state.guide} />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function Detail({ guide }: { guide: GuideDetail }) {
  const paragraphs = guide.body ? toParagraphs(guide.body) : [];

  return (
    <View className="gap-5">
      <GuideCover
        coverUrl={guide.coverUrl}
        title={guide.title}
        categorySlug={guide.categorySlug}
        rounded="rounded-3xl"
        heightClass="h-52"
      />

      <View className="gap-2">
        <View className="flex-row">
          <View className="rounded-full bg-accent/10 px-2.5 py-1">
            <Text className="text-xs font-semibold text-accent">{guide.categoryName}</Text>
          </View>
        </View>
        <Text className="text-2xl font-semibold text-ink">{guide.title}</Text>

        {/* Byline: denormalized author (never the private profiles table). The
            small "verified" indicator reflects the verified_expert attribution
            and coexists with the not-medical-advice disclaimer above. */}
        {guide.authorName ? (
          <View className="flex-row items-center gap-2">
            <Text className="text-sm font-medium text-ink/70">{guide.authorName}</Text>
            {guide.authorTagline ? (
              <View className="flex-row items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5">
                <VerifiedTick />
                <Text className="text-xs font-semibold text-accent">{guide.authorTagline}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      {guide.summary ? (
        <Text className="text-base leading-7 text-ink/80">{guide.summary}</Text>
      ) : null}

      {/* Long-form body: calm, readable paragraphs with generous line-height.
          Plain text only — never HTML. */}
      {paragraphs.length > 0 ? (
        <View className="gap-4">
          {paragraphs.map((p, i) => (
            <Text key={i} className="text-base leading-7 text-ink/80">
              {p}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

// Small inline tick built from Views (no SVG dep, no emoji) — a quiet verified
// indicator beside the contributor tagline.
function VerifiedTick() {
  return (
    <View className="h-3.5 w-3.5 items-center justify-center rounded-full bg-accent">
      <View className="h-1 w-1.5 -translate-y-px rotate-[-45deg] border-b-[1.5px] border-l-[1.5px] border-bg" />
    </View>
  );
}
