import { useState } from "react";
import { router } from "expo-router";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { REPORT_REASONS, type ReportReason } from "@tadpole/validation";
import { reportMessage } from "@tadpole/core";
import { supabase } from "@/lib/supabase";
import { TextField } from "@/components/ui";

// Mirrors ReportSheet but reports a single message. reportMessage is ATOMIC:
// it snapshots the message, blocks the other dad, and deletes the match. After
// it resolves the conversation no longer exists, so we navigate to /matches.
export function ReportMessageSheet({
  messageId,
  onClose,
}: {
  messageId: string;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [detail, setDetail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function submit() {
    if (!reason) {
      setError("Please pick a reason.");
      return;
    }
    setPending(true);
    setError(undefined);
    try {
      await reportMessage(supabase, messageId, reason, detail.trim() || undefined);
      // Conversation has ended — leave it behind.
      router.replace("/matches");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setError(
        /limit reached/i.test(msg)
          ? "You've sent a lot of reports recently. Please try again later."
          : "Couldn't submit that report. Please try again.",
      );
      setPending(false);
    }
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={pending ? undefined : onClose}>
      <Pressable className="flex-1 justify-end bg-ink/40" onPress={pending ? undefined : onClose}>
        <Pressable onPress={() => {}} className="max-h-[88%] rounded-t-3xl bg-bg p-6">
          <Text className="text-xl font-semibold text-ink">Report this message</Text>
          <Text className="mt-1 text-sm text-ink/60">
            Reporting also blocks them and ends the conversation. This is sent to our safety team.
          </Text>

          <ScrollView className="mt-4" keyboardShouldPersistTaps="handled">
            {REPORT_REASONS.map((r) => (
              <Pressable
                key={r.value}
                onPress={() => setReason(r.value)}
                className={`mb-1.5 flex-row items-center gap-3 rounded-xl border px-3 py-3 active:opacity-80 ${
                  reason === r.value ? "border-accent bg-accent/10" : "border-ink/10"
                }`}
              >
                <View
                  className={`h-4 w-4 rounded-full border-2 ${
                    reason === r.value ? "border-accent bg-accent" : "border-ink/30"
                  }`}
                />
                <Text className="text-sm text-ink">{r.label}</Text>
              </Pressable>
            ))}

            <Text className="mb-1 mt-3 text-sm font-medium text-ink">Anything to add? (optional)</Text>
            <TextField
              value={detail}
              onChangeText={setDetail}
              multiline
              maxLength={1000}
              className="h-20"
              style={{ textAlignVertical: "top" }}
            />
            {error ? <Text className="mt-2 text-sm text-error">{error}</Text> : null}
          </ScrollView>

          <View className="mt-4 flex-row gap-3">
            <Pressable
              onPress={onClose}
              disabled={pending}
              className="flex-1 rounded-lg border border-ink/15 px-4 py-3 active:opacity-80"
            >
              <Text className="text-center text-sm font-semibold text-ink">Cancel</Text>
            </Pressable>
            <Pressable
              onPress={submit}
              disabled={pending}
              className={`flex-1 rounded-lg bg-error px-4 py-3 active:opacity-80 ${pending ? "opacity-50" : ""}`}
            >
              <Text className="text-center text-sm font-semibold text-bg">
                {pending ? "Reporting…" : "Report & block"}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
