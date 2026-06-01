import { useEffect, useState } from "react";
import { Redirect, router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { completeOnboarding, getMyProfile, isOnboarded, listAreas } from "@tadpole/core";
import {
  PARENTING_STAGES,
  bioHasContactDetails,
  displayNameSchema,
  type ParentingStage,
} from "@tadpole/validation";
import type { Area } from "@tadpole/types";
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
  const [areas, setAreas] = useState<Area[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [parentingStage, setParentingStage] = useState<ParentingStage | null>(null);
  const [areaId, setAreaId] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!session) return;
    let active = true;
    (async () => {
      const [profile, areaRows] = await Promise.all([getMyProfile(supabase), listAreas(supabase)]);
      if (!active) return;
      if (isOnboarded(profile)) {
        router.replace("/home");
        return;
      }
      if (profile?.display_name && profile.display_name !== "dad") setDisplayName(profile.display_name);
      setAreas(areaRows);
    })().catch(() => active && setError("Couldn't load your profile."));
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
        areaId,
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
            <Text className="text-xs text-ink/50">Only your area is shown to others — never an exact location.</Text>
            <View className="flex-row flex-wrap gap-2">
              <Chip label="Prefer not to say" active={areaId === null} onPress={() => setAreaId(null)} />
              {areas.map((a) => (
                <Chip key={a.id} label={a.name} active={areaId === a.id} onPress={() => setAreaId(a.id)} />
              ))}
            </View>
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
