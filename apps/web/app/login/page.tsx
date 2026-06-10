"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signInWithPassword } from "@tadpole/core";
import { signInSchema } from "@tadpole/validation";
import { getBrowserClient } from "@/lib/supabase/client";
import { safeNextPath } from "@/lib/safe-next";
import { Button, Field, FormError, Input } from "@/components/form";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(undefined);
    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Check your details.");
      return;
    }
    setPending(true);
    try {
      const { error } = await signInWithPassword(getBrowserClient(), parsed.data);
      if (error) {
        setFormError(
          /confirm/i.test(error.message)
            ? "Please confirm your email first — check your inbox."
            : "Incorrect email or password.",
        );
        return;
      }
      router.replace(safeNextPath(search.get("next"), "/home"));
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <Field label="Email" htmlFor="email">
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
      </Field>
      <Field label="Password" htmlFor="password">
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </Field>

      <FormError>{formError}</FormError>

      <Button type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-10">
      <h1 className="text-3xl font-semibold lowercase tracking-tight text-ink">
        welcome back<span className="text-accent">.</span>
      </h1>
      <Suspense fallback={<p className="text-ink/50">loading…</p>}>
        <LoginForm />
      </Suspense>
      <p className="text-sm text-ink/60">
        New here?{" "}
        <Link href="/signup" className="font-medium text-accent hover:underline">
          create an account
        </Link>
      </p>
    </main>
  );
}
