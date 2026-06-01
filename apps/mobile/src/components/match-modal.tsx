import { router } from "expo-router";
import { Image, Modal, Pressable, Text, View } from "react-native";

export function MatchModal({
  name,
  avatarUrl,
  matchId,
  onClose,
}: {
  name: string;
  avatarUrl: string | null;
  matchId: string | null;
  onClose: () => void;
}) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-ink/50 p-6">
        <View className="w-full max-w-sm items-center rounded-3xl bg-bg p-8">
          <Text className="text-xs font-semibold uppercase tracking-widest text-accent">a new connection</Text>
          <Text className="mt-2 text-3xl font-semibold lowercase text-ink">
            it&apos;s a match<Text className="text-accent">.</Text>
          </Text>
          <Text className="mt-1 text-center text-ink/60">you and {name} both want to connect.</Text>

          <View className="my-6">
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} className="h-24 w-24 rounded-full" />
            ) : (
              <View className="h-24 w-24 items-center justify-center rounded-full bg-accent/15">
                <Text className="text-2xl font-semibold text-accent">{name[0]?.toUpperCase() ?? "?"}</Text>
              </View>
            )}
          </View>

          {matchId ? (
            <Pressable
              onPress={() => {
                onClose();
                router.push({ pathname: "/messages/[matchId]", params: { matchId } });
              }}
              accessibilityLabel={`Message ${name}`}
              className="w-full rounded-lg bg-accent px-4 py-3 active:opacity-80"
            >
              <Text className="text-center text-sm font-semibold text-bg">send a message</Text>
            </Pressable>
          ) : null}

          <View className="mt-3 w-full flex-row gap-3">
            <Pressable
              onPress={onClose}
              className="flex-1 rounded-lg border border-ink/15 px-4 py-3 active:opacity-80"
            >
              <Text className="text-center text-sm font-semibold text-ink">keep swiping</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                onClose();
                router.push("/matches");
              }}
              className={`flex-1 rounded-lg px-4 py-3 active:opacity-80 ${
                matchId ? "border border-ink/15" : "bg-accent"
              }`}
            >
              <Text className={`text-center text-sm font-semibold ${matchId ? "text-ink" : "text-bg"}`}>
                view matches
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
