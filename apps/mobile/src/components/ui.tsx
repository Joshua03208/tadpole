import type { ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from "react-native";

export function Screen({ children }: { children: ReactNode }) {
  return (
    <ScrollView className="flex-1 bg-bg" keyboardShouldPersistTaps="handled">
      <View className="gap-5 px-6 py-14">{children}</View>
    </ScrollView>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <View className="gap-1">
      <Text className="text-sm font-medium text-ink">{label}</Text>
      {children}
      {hint && !error ? <Text className="text-xs text-ink/50">{hint}</Text> : null}
      {error ? <Text className="text-xs text-error">{error}</Text> : null}
    </View>
  );
}

export function TextField(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor="#00000066"
      {...props}
      className={`rounded-lg border border-ink/15 bg-white/60 px-3 py-3 text-ink ${props.className ?? ""}`}
    />
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`rounded-lg bg-accent px-4 py-3 ${disabled ? "opacity-50" : ""}`}
    >
      <Text className="text-center text-sm font-semibold text-bg">{label}</Text>
    </Pressable>
  );
}

export function GhostButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={`rounded-lg border border-ink/15 px-4 py-3 ${disabled ? "opacity-50" : ""}`}
    >
      <Text className="text-center text-sm font-semibold text-ink">{label}</Text>
    </Pressable>
  );
}

export function ErrorText({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <Text className="text-sm text-error">{children}</Text>;
}
