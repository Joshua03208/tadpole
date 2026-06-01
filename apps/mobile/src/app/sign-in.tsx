import { useState } from "react";
import { Link, router } from "expo-router";
import { Text } from "react-native";
import { signInWithPassword } from "@tadpole/core";
import { signInSchema } from "@tadpole/validation";
import { supabase } from "@/lib/supabase";
import { ErrorText, Field, PrimaryButton, Screen, TextField } from "@/components/ui";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  async function onSubmit() {
    setFormError(undefined);
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Check your details.");
      return;
    }
    setPending(true);
    try {
      const { error } = await signInWithPassword(supabase, parsed.data);
      if (error) {
        setFormError(
          /confirm/i.test(error.message)
            ? "Please confirm your email first — check your inbox."
            : "Incorrect email or password.",
        );
        return;
      }
      router.replace("/");
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Screen>
      <Text className="text-3xl font-semibold lowercase text-ink">
        welcome back<Text className="text-accent">.</Text>
      </Text>
      <Field label="Email">
        <TextField value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      </Field>
      <Field label="Password">
        <TextField value={password} onChangeText={setPassword} secureTextEntry />
      </Field>
      <ErrorText>{formError}</ErrorText>
      <PrimaryButton label={pending ? "Signing in…" : "Sign in"} onPress={onSubmit} disabled={pending} />
      <Link href="/sign-up" asChild>
        <Text className="text-sm font-medium text-accent">New here? Create an account</Text>
      </Link>
    </Screen>
  );
}
