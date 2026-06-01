"use client";

import { useState } from "react";
import { requestAccountDeletion, signOut } from "@tadpole/core";
import { getBrowserClient } from "@/lib/supabase/client";
import { Button, FormError } from "@/components/form";

export function DeleteAccount() {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function onDelete() {
    setPending(true);
    setError(undefined);
    try {
      const client = getBrowserClient();
      await requestAccountDeletion(client);
      await signOut(client);
      window.location.href = "/";
    } catch {
      setError("Couldn't delete your account. Please try again.");
      setPending(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-sm text-error/80 hover:text-error hover:underline"
      >
        Delete my account
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-ink">
        This anonymises your profile and signs you out. This can't be undone.
      </p>
      <FormError>{error}</FormError>
      <div className="flex gap-3">
        <Button type="button" variant="ghost" onClick={() => setConfirming(false)} disabled={pending}>
          Cancel
        </Button>
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          className="inline-flex items-center justify-center rounded-lg bg-error px-4 py-2 text-sm font-semibold text-bg transition hover:bg-error/90 disabled:opacity-50"
        >
          {pending ? "Deleting…" : "Yes, delete"}
        </button>
      </div>
    </div>
  );
}
