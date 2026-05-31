import { Text, View } from "react-native";

export default function Index() {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-bg px-6">
      <Text className="text-5xl font-semibold lowercase text-ink">
        tadpole<Text className="text-accent">.</Text>
      </Text>
      <Text className="text-center text-base text-ink/70">
        for dads — friendship, peer support, and local meet-ups. platonic, never
        dating.
      </Text>
      <Text className="rounded-full border border-ink/15 px-4 py-1 text-xs text-ink/60">
        phase 0 · scaffold
      </Text>
    </View>
  );
}
