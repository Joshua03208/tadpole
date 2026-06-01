import { useState } from "react";
import { Linking, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { CRISIS_RESOURCES, type CrisisResource } from "@tadpole/core";

function actionFor(a: CrisisResource["action"]): { href: string; label: string } {
  if (a.kind === "call") {
    const pretty = a.number === "116123" ? "116 123" : a.number === "0800585858" ? "0800 58 58 58" : a.number;
    return { href: `tel:${a.number}`, label: `Call ${pretty}` };
  }
  return { href: `sms:${a.to}?body=${encodeURIComponent(a.body)}`, label: `Text ${a.body} to ${a.to}` };
}

export function GetHelpButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        className="rounded-full border border-ink/15 px-3 py-1.5 active:opacity-70"
      >
        <Text className="text-xs font-semibold text-ink/80">get help now</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable className="flex-1 justify-end bg-ink/40" onPress={() => setOpen(false)}>
          <Pressable onPress={() => {}} className="max-h-[80%] rounded-t-3xl bg-bg p-6">
            <View className="mb-4 flex-row items-start justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-xl font-semibold text-ink">get help now</Text>
                <Text className="mt-1 text-sm text-ink/60">
                  Tadpole isn&apos;t a crisis service. If you&apos;re struggling, these can help.
                </Text>
              </View>
              <Pressable onPress={() => setOpen(false)} hitSlop={10}>
                <Text className="text-2xl leading-none text-ink/50">×</Text>
              </Pressable>
            </View>

            <ScrollView>
              {CRISIS_RESOURCES.map((r) => {
                const a = actionFor(r.action);
                return (
                  <Pressable
                    key={r.name}
                    onPress={() => Linking.openURL(a.href)}
                    className={`mb-2 rounded-2xl border px-4 py-3 active:opacity-80 ${
                      r.emphasis ? "border-error/30 bg-error/10" : "border-ink/10 bg-white/50"
                    }`}
                  >
                    <View className="flex-row items-center justify-between">
                      <Text className="font-semibold text-ink">{r.name}</Text>
                      <Text className={`text-sm font-semibold ${r.emphasis ? "text-error" : "text-accent"}`}>
                        {a.label}
                      </Text>
                    </View>
                    <Text className="mt-0.5 text-xs text-ink/55">{r.detail}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
