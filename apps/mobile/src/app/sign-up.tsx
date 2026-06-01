import { useState } from "react";
import { Link, router } from "expo-router";
import { Text } from "react-native";
import { signUpDad } from "@tadpole/core";
import { signUpSchema } from "@tadpole/validation";
import { supabase } from "@/lib/supabase";
import { ErrorText, Field, PrimaryButton, Screen, TextField } from "@/components/ui";

type Values = { displayName: string; dateOfBirth: string; email: string; password: string };

export default function SignUp() {
  const [values, setValues] = useState<Values>({
    displayName: "",
    dateOfBirth: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  const set = (k: keyof Values) => (t: string) => setValues((v) => ({ ...v, [k]: t }));

  async function onSubmit() {
    setFormError(undefined);
    setErrors({});
    const parsed = signUpSchema.safeParse(values);
    if (!parsed.success) {
      const next: Partial<Record<keyof Values, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !next[key as keyof Values]) {
          next[key as keyof Values] = issue.message;
        }
      }
      setErrors(next);
      return;
    }
    setPending(true);
    try {
      const { data, error } = await signUpDad(supabase, parsed.data);
      if (error) {
        setFormError(
          /already registered/i.test(error.message)
            ? "That email is already registered. Try signing in."
            : "We couldn't create your account. Please check your details.",
        );
        return;
      }
      if (data.session) {
        router.replace("/onboarding");
        return;
      }
      setCheckEmail(true);
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (checkEmail) {
    return (
      <Screen>
        <Text className="text-2xl font-semibold lowercase text-ink">check your email</Text>
        <Text className="text-ink/70">
          We sent a confirmation link to {values.email}. Open it to finish setting up your account.
        </Text>
        <Link href="/sign-in" asChild>
          <Text className="text-sm font-medium text-accent">back to sign in</Text>
        </Link>
      </Screen>
    );
  }

  return (
    <Screen>
      <Text className="text-3xl font-semibold lowercase text-ink">
        join tadpole<Text className="text-accent">.</Text>
      </Text>
      <Text className="text-sm text-ink/60">
        for dads — friendship, peer support, and local meet-ups. platonic, never dating. 18+ only.
      </Text>

      <Field label="Your name" error={errors.displayName}>
        <TextField value={values.displayName} onChangeText={set("displayName")} autoCapitalize="words" />
      </Field>
      <Field label="Date of birth" hint="Format YYYY-MM-DD. You must be 18 or older." error={errors.dateOfBirth}>
        <TextField
          value={values.dateOfBirth}
          onChangeText={set("dateOfBirth")}
          placeholder="1990-01-31"
          autoCapitalize="none"
        />
      </Field>
      <Field label="Email" error={errors.email}>
        <TextField
          value={values.email}
          onChangeText={set("email")}
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </Field>
      <Field label="Password" hint="At least 8 characters." error={errors.password}>
        <TextField value={values.password} onChangeText={set("password")} secureTextEntry />
      </Field>

      <ErrorText>{formError}</ErrorText>
      <PrimaryButton label={pending ? "Creating account…" : "Create account"} onPress={onSubmit} disabled={pending} />

      <Link href="/sign-in" asChild>
        <Text className="text-sm font-medium text-accent">Already have an account? Sign in</Text>
      </Link>
    </Screen>
  );
}
