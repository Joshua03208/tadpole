"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUpDad } from "@tadpole/core";
import { signUpSchema } from "@tadpole/validation";
import { getBrowserClient } from "@/lib/supabase/client";
import { Button, Field, FormError, Input } from "@/components/form";
import { SiteHeader } from "@/components/site-header";

type Values = { displayName: string; email: string; password: string; dateOfBirth: string };

export default function SignUpPage() {
  const router = useRouter();
  const [values, setValues] = useState<Values>({
    displayName: "",
    email: "",
    password: "",
    dateOfBirth: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>({});
  const [formError, setFormError] = useState<string | undefined>();
  const [pending, setPending] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  const set =
    (k: keyof Values) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setValues((v) => ({ ...v, [k]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
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
      const { data, error } = await signUpDad(
        getBrowserClient(),
        parsed.data,
        `${window.location.origin}/auth/confirm`,
      );
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
      // Both a brand-new signup AND a repeat signup on an existing email return
      // here (Supabase deliberately makes them indistinguishable to prevent
      // account enumeration — the existing-account case just gets no email). The
      // confirm screen is worded for both and offers a sign-in path, so an
      // existing user isn't stuck without us ever confirming the email is taken.
      setCheckEmail(true);
    } catch {
      setFormError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  if (checkEmail) {
    return (
      <>
        <SiteHeader brandHref="/" links={[]} />
        <main className="mx-auto flex min-h-[calc(100dvh-57px)] max-w-md flex-col justify-center gap-4 px-6">
        <h1 className="text-2xl font-semibold lowercase text-ink">check your email</h1>
        <p className="text-ink/70">
          If <strong>{values.email}</strong> is new to Tadpole, we&apos;ve sent it a confirmation link
          — open it to finish setting up your account.
        </p>
        <p className="text-sm text-ink/60">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-accent hover:underline">
            sign in
          </Link>
        </p>
        </main>
      </>
    );
  }

  return (
    <>
      <SiteHeader brandHref="/" links={[]} />
      <main className="mx-auto flex min-h-[calc(100dvh-57px)] max-w-md flex-col justify-center gap-6 px-6 py-10">
      <div>
        <h1 className="text-3xl font-semibold lowercase tracking-tight text-ink">
          join tadpole<span className="text-accent">.</span>
        </h1>
        <p className="mt-1 text-sm text-ink/60">
          for dads — friendship, peer support, and local meet-ups. platonic, never dating. 18+ only.
        </p>
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        <Field label="Your name" htmlFor="displayName" error={errors.displayName}>
          <Input
            id="displayName"
            value={values.displayName}
            onChange={set("displayName")}
            autoComplete="name"
            required
          />
        </Field>
        <Field
          label="Date of birth"
          htmlFor="dateOfBirth"
          hint="You must be 18 or older to use Tadpole."
          error={errors.dateOfBirth}
        >
          <Input id="dateOfBirth" type="date" value={values.dateOfBirth} onChange={set("dateOfBirth")} required />
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email}>
          <Input id="email" type="email" value={values.email} onChange={set("email")} autoComplete="email" required />
        </Field>
        <Field label="Password" htmlFor="password" hint="At least 8 characters." error={errors.password}>
          <Input
            id="password"
            type="password"
            value={values.password}
            onChange={set("password")}
            autoComplete="new-password"
            required
          />
        </Field>

        <FormError>{formError}</FormError>

        <Button type="submit" disabled={pending}>
          {pending ? "creating account…" : "create account"}
        </Button>
      </form>

      <p className="text-sm text-ink/60">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          sign in
        </Link>
      </p>
      </main>
    </>
  );
}
