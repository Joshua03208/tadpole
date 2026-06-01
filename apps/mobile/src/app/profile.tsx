import { useEffect, useState } from "react";
import { Redirect, router } from "expo-router";
import { Alert, ScrollView, Text, View } from "react-native";
import { getMyProfile, requestAccountDeletion, signOut } from "@tadpole/core";
import type { Profile } from "@tadpole/types";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { AppHeader } from "@/components/app-header";
import { GhostButton } from "@/components/ui";

const STAGE_LABELS: Record<string, string> = {
  expecting: "Expecting",
  newborn: "Newborn (0–3m)",
  infant: "Infant (3–12m)",
  toddler: "Toddler (1–3y)",
  child: "Child (4y+)",
  multiple: "Multiple kids",
};

export default function ProfileScreen() {
  const { loading, session } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!session) return;
    let active = true;
    getMyProfile(supabase)
      .then((p) => active && setProfile(p))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [session]);

  if (!loading && !session) return <Redirect href="/sign-in" />;
  if (profile && !profile.onboarded_at) return <Redirect href="/onboarding" />;

  async function onSignOut() {
    await signOut(supabase);
    router.replace("/sign-in");
  }

  function onDelete() {
    Alert.alert(
      "Delete your account?",
      "This anonymises your profile and signs you out. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await requestAccountDeletion(supabase);
              await signOut(supabase);
              router.replace("/sign-in");
            } catch {
              Alert.alert("Couldn't delete your account. Please try again.");
            }
          },
        },
      ],
    );
  }

  return (
    <View className="flex-1 bg-bg">
      <AppHeader />
      <ScrollView>
        <View className="gap-5 px-6 py-6">
          <Text className="text-2xl font-semibold text-ink">{profile?.display_name ?? "…"}</Text>

          {profile?.area_label ? (
            <View>
              <Text className="text-xs text-ink/50">Area</Text>
              <Text className="text-ink">{profile.area_label}</Text>
            </View>
          ) : null}

          {profile?.parenting_stage ? (
            <View>
              <Text className="text-xs text-ink/50">Stage</Text>
              <Text className="text-ink">
                {STAGE_LABELS[profile.parenting_stage] ?? profile.parenting_stage}
              </Text>
            </View>
          ) : null}

          {profile?.bio ? (
            <View>
              <Text className="text-xs text-ink/50">About</Text>
              <Text className="text-ink">{profile.bio}</Text>
            </View>
          ) : null}

          <View className="mt-2 gap-3">
            <GhostButton label="Sign out" onPress={onSignOut} />
            <GhostButton label="Delete my account" onPress={onDelete} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
