import { useEffect, useState } from "react";
import { Redirect, router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { completeOnboarding, getMyProfile, isOnboarded, searchPlaces, type UkPlace } from "@tadpole/core";
import {
  PARENTING_STAGES,
  bioHasContactDetails,
  displayNameSchema,
  type ParentingStage,
} from "@tadpole/validation";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { ErrorText, Field, GhostButton, PrimaryButton, Screen, TextField } from "@/components/ui";

const STAGE_LABELS: Record<ParentingStage, string> = {
  expecting: "Expecting",
  newborn: "Newborn",
  infant: "Infant",
  toddler: "Toddler",
  child: "Child 4y+",
  multiple: "Multiple",
};

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full border px-4 py-2 ${active ? "border-accent bg-accent" : "border-ink/15"}`}
    >
      <Text className={`text-sm ${active ? "font-semibold text-bg" : "text-ink"}`}>{label}</Text>
    </Pressable>
  );
}

export default function Onboarding() {
  const { loading, session } = useAuth();
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [parentingStage, setParentingStage] = useState<ParentingStage | null>(null);
  const [areaQuery, setAreaQuery] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<UkPlace | null>(null);
  const [bio, setBio] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  const suggestions = areaQuery.trim() && !selectedPlace ? searchPlaces(areaQuery, 6) : [];

  useEffect(() => {
    if (!session) return;
    let active = true;
    getMyProfile(supabase)
      .then((profile) => {
        if (!active) return;
        if (isOnboarded(profile)) {
          router.replace("/home");
          return;
        }
        if (profile?.display_name && profile.display_name !== "dad") setDisplayName(profile.display_name);
      })
      .catch(() => active && setError("Couldn't load your profile."));
    return () => {
      active = false;
    };
  }, [session]);

  if (!loading && !session) return <Redirect href="/sign-in" />;

  function next() {
    setError(undefined);
    if (step === 0 && !displayNameSchema.safeParse(displayName).success) {
      setError("Please enter your name (1–50 characters).");
      return;
    }
    if (step === 2 && bio.trim() && bioHasContactDetails(bio)) {
      setError("Please don't put phone numbers, emails, or links in your bio.");
      return;
    }
    setStep((s) => Math.min(s + 1, 2));
  }

  async function finish() {
    setError(undefined);
    setPending(true);
    try {
      await completeOnboarding(supabase, {
        displayName: displayName.trim(),
        parentingStage,
        areaLabel: selectedPlace?.name ?? null,
        areaSlug: selectedPlace?.slug ?? null,
        bio: bio.trim() || undefined,
      });
      router.replace("/home");
    } catch {
      setError("Couldn't save your profile. Please try again.");
      setPending(false);
    }
  }

  return (
    <Screen>
      <Text className="text-xs uppercase tracking-wide text-ink/40">step {step + 1} of 3</Text>

      {step === 0 && (
        <Field label="What should other dads call you?">
          <TextField value={displayName} onChangeText={setDisplayName} autoCapitalize="words" />
        </Field>
      )}

      {step === 1 && (
        <View className="gap-5">
          <View className="gap-2">
            <Text className="text-sm font-medium text-ink">Where are you (roughly)?</Text>
            <Text className="text-xs text-ink/50">
              Start typing your town or city. Only your area is shown to others — never an exact location.
            </Text>
            <TextField
              value={areaQuery}
              onChangeText={(t) => {
                setAreaQuery(t);
                setSelectedPlace(null);
              }}
              placeholder="e.g. Cardiff"
              autoCapitalize="words"
              autoCorrect={false}
            />
            {suggestions.map((p) => (
              <Pressable
                key={p.slug}
                onPress={() => {
                  setSelectedPlace(p);
                  setAreaQuery(p.name);
                }}
                className="rounded-lg border border-ink/10 px-3 py-2"
              >
                <Text className="text-ink">
                  {p.name} <Text className="text-xs text-ink/40">· {p.region}</Text>
                </Text>
              </Pressable>
            ))}
            {selectedPlace ? (
              <Text className="text-xs text-accent">
                Selected: {selectedPlace.name} · {selectedPlace.region}
              </Text>
            ) : null}
          </View>

          <View className="gap-2">
            <Text className="text-sm font-medium text-ink">Your stage of fatherhood</Text>
            <View className="flex-row flex-wrap gap-2">
              <Chip label="Prefer not to say" active={parentingStage === null} onPress={() => setParentingStage(null)} />
              {PARENTING_STAGES.map((s) => (
                <Chip
                  key={s}
                  label={STAGE_LABELS[s]}
                  active={parentingStage === s}
                  onPress={() => setParentingStage(s)}
                />
              ))}
            </View>
          </View>
        </View>
      )}

      {step === 2 && (
        <View className="gap-2">
          <Field label="A little about you (optional)" hint="No phone numbers, emails, or links.">
            <TextField value={bio} onChangeText={setBio} multiline numberOfLines={4} maxLength={500} />
          </Field>
          <Text className="text-xs text-ink/50">
            You can add a photo and share precise location from the web app for now.
          </Text>
        </View>
      )}

      <ErrorText>{error}</ErrorText>

      <View className="flex-row gap-3">
        {step > 0 && <GhostButton label="Back" onPress={() => setStep((s) => Math.max(0, s - 1))} disabled={pending} />}
        {step < 2 ? (
          <View className="flex-1">
            <PrimaryButton label="Continue" onPress={next} />
          </View>
        ) : (
          <View className="flex-1">
            <PrimaryButton label={pending ? "Saving…" : "Finish"} onPress={finish} disabled={pending} />
          </View>
        )}
      </View>
    </Screen>
  );
}
