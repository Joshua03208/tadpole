import { Linking, Pressable, Text, View } from "react-native";
import { CRISIS_RESOURCES, type CrisisResource } from "@tadpole/core";

// Pretty-print the call numbers the way they're spoken/dialled. Mirrors the
// formatting used by the GetHelpButton modal so the two surfaces stay in sync.
function actionFor(a: CrisisResource["action"]): { href: string; label: string } {
  if (a.kind === "call") {
    const pretty =
      a.number === "116123"
        ? "116 123"
        : a.number === "0800585858"
          ? "0800 58 58 58"
          : a.number;
    return { href: `tel:${a.number}`, label: `Call ${pretty}` };
  }
  return {
    href: `sms:${a.to}?body=${encodeURIComponent(a.body)}`,
    label: `Text ${a.body} to ${a.to}`,
  };
}

// Prominent, persistent crisis surface for the wellness hub. Unlike the
// GetHelpButton (a header modal), this is an always-visible on-page card with
// tappable tel:/sms: actions for every UK line, emergency emphasised. Required
// on BOTH the guides index and every guide detail (SAFETY_POLICY.md §7).
export function CrisisCallout() {
  return (
    <View className="rounded-2xl border border-accent/20 bg-accent/5 p-4">
      <Text className="text-sm font-semibold text-ink">if you need to talk to someone now</Text>
      <Text className="mt-1 text-sm text-ink/70">
        <Text className="lowercase text-ink">
          tadpole<Text className="text-accent">.</Text>
        </Text>{" "}
        isn&apos;t a crisis service. If you&apos;re struggling, these UK lines are free and here to
        help — any time.
      </Text>

      <View className="mt-3 gap-2">
        {CRISIS_RESOURCES.map((r) => {
          const a = actionFor(r.action);
          return (
            <Pressable
              key={r.name}
              onPress={() => void Linking.openURL(a.href)}
              accessibilityRole="button"
              accessibilityLabel={`${r.name}. ${a.label}. ${r.detail}`}
              className={`rounded-2xl border px-4 py-3 active:opacity-80 ${
                r.emphasis ? "border-error/30 bg-error/10" : "border-ink/10 bg-white/60"
              }`}
            >
              <View className="flex-row items-center justify-between">
                <Text className="font-semibold text-ink">{r.name}</Text>
                <Text
                  className={`text-sm font-semibold ${r.emphasis ? "text-error" : "text-accent"}`}
                >
                  {a.label}
                </Text>
              </View>
              <Text className="mt-0.5 text-xs text-ink/55">{r.detail}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
