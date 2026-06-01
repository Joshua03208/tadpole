import { Text, View } from "react-native";
import { GetHelpButton } from "@/components/crisis";

// Calm, warm meet-up note shown on the activity detail view. Reassuring, not
// alarming. Pairs with the existing GetHelpButton (crisis signposting), never
// any medical claim.
export function MeetupSafetyNote() {
  return (
    <View className="rounded-2xl border border-accent/20 bg-accent/5 p-4">
      <Text className="text-sm font-semibold text-ink">meeting another dad?</Text>
      <Text className="mt-1 text-sm text-ink/70">
        Pick somewhere public, let someone know where you&apos;re going, and trust your instincts.
        There&apos;s no rush — go at a pace that feels right for you.
      </Text>
      <View className="mt-3 flex-row">
        <GetHelpButton />
      </View>
    </View>
  );
}
