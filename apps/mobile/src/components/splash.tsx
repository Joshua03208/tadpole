import { ActivityIndicator, Text, View } from "react-native";

// Shared cold-start / auth-resolving splash. Gated screens render this while
// useAuth().loading is true, so a not-yet-resolved (or guest) session never
// flashes the signed-in chrome before the redirect fires.
export function Splash() {
  return (
    <View className="flex-1 items-center justify-center bg-bg">
      <Text className="text-3xl font-semibold lowercase text-ink">
        tadpole<Text className="text-accent">.</Text>
      </Text>
      <ActivityIndicator className="mt-4" color="#3E7C5A" />
    </View>
  );
}
