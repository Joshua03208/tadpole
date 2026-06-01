import { Text, View } from "react-native";

// Prominent, first-class disclaimer for the wellness / knowledge hub — NOT fine
// print (CLAUDE.md "no medical claims", SAFETY_POLICY.md §7). Calm and warm:
// reassures rather than alarms, but is unmistakably present near the top of
// every guide page (index + detail). No clinical / diagnostic language.
export function NotMedicalAdvice() {
  return (
    <View
      accessibilityRole="summary"
      className="rounded-2xl border border-accent/25 bg-accent/10 p-4"
    >
      <Text className="text-sm font-semibold text-ink">general information — not medical advice</Text>
      <Text className="mt-1 text-sm text-ink/70">
        These guides share general information and support for dads. They aren&apos;t therapy,
        diagnosis or treatment, and they don&apos;t replace advice from your GP or a qualified
        professional. If something doesn&apos;t feel right, please reach out to one.
      </Text>
    </View>
  );
}
