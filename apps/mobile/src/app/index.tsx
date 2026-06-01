import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { ActivityIndicator, Text, View } from "react-native";
import { getMyProfile, isOnboarded } from "@tadpole/core";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

function Splash() {
  return (
    <View className="flex-1 items-center justify-center bg-bg">
      <Text className="text-3xl font-semibold lowercase text-ink">
        tadpole<Text className="text-accent">.</Text>
      </Text>
      <ActivityIndicator className="mt-4" color="#3E7C5A" />
    </View>
  );
}

export default function Index() {
  const { loading, session } = useAuth();
  const [onboarded, setOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    if (!session) {
      setOnboarded(null);
      return;
    }
    let active = true;
    getMyProfile(supabase)
      .then((p) => {
        if (active) setOnboarded(isOnboarded(p));
      })
      .catch(() => {
        if (active) setOnboarded(false);
      });
    return () => {
      active = false;
    };
  }, [session]);

  if (loading) return <Splash />;
  if (!session) return <Redirect href="/welcome" />;
  if (onboarded === null) return <Splash />;
  return <Redirect href={onboarded ? "/home" : "/onboarding"} />;
}
