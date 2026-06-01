import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { View } from "react-native";
import { getMyProfile } from "@tadpole/core";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { AppHeader } from "@/components/app-header";
import { Deck } from "@/components/deck";

export default function Home() {
  const { loading, session } = useAuth();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    if (!session) return;
    let active = true;
    getMyProfile(supabase)
      .then((p) => active && setOnboarded(Boolean(p?.onboarded_at)))
      .catch(() => active && setOnboarded(true));
    return () => {
      active = false;
    };
  }, [session]);

  if (!loading && !session) return <Redirect href="/sign-in" />;
  if (onboarded === false) return <Redirect href="/onboarding" />;

  return (
    <View className="flex-1 bg-bg">
      <AppHeader />
      <Deck />
    </View>
  );
}
