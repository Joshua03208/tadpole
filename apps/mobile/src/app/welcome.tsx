import { Redirect, router } from "expo-router";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { GhostButton, PrimaryButton } from "@/components/ui";

function Wordmark({ size = "text-4xl" }: { size?: string }) {
  return (
    <Text className={`${size} font-semibold lowercase text-ink`}>
      tadpole<Text className="text-accent">.</Text>
    </Text>
  );
}

// Minimal cream splash while we resolve the session — mirrors the dispatcher's
// Splash so a logged-in user who deep-links here never sees the welcome flash.
function Splash() {
  return (
    <View className="flex-1 items-center justify-center bg-bg">
      <Wordmark size="text-3xl" />
      <ActivityIndicator className="mt-4" color="#3E7C5A" />
    </View>
  );
}

export default function Welcome() {
  const { loading, session } = useAuth();

  if (loading) return <Splash />;
  if (session) return <Redirect href="/home" />;

  return (
    <View className="flex-1 bg-bg px-6">
      {/* Hero sits a touch above centre, CTAs anchored low — off-centre on
          purpose so it reads calm rather than a dead-centre stack. */}
      <View className="flex-1 justify-center gap-3 pt-10">
        <Wordmark />
        <Text className="max-w-[20rem] text-lg leading-7 text-ink/70">
          friendship, peer support and local meet-ups for dads — platonic, never dating. 18+ only.
        </Text>
      </View>

      <View className="gap-3 pb-14">
        <PrimaryButton label="Get started" onPress={() => router.push("/sign-up")} />
        <GhostButton
          label="I already have an account"
          onPress={() => router.push("/sign-in")}
        />
        <Pressable
          onPress={() => router.push("/activities")}
          className="self-center px-3 py-2 active:opacity-70"
        >
          <Text className="text-sm font-medium text-ink/50">explore as a guest</Text>
        </Pressable>
      </View>
    </View>
  );
}
