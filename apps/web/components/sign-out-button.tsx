"use client";

import { useState } from "react";
import { signOut } from "@tadpole/core";
import { getBrowserClient } from "@/lib/supabase/client";

/**
 * Sign out on the browser client (clears the auth cookie locally and fires
 * onAuthStateChange), then hard-navigate home. The hard navigation guarantees a
 * fresh server render with no session — fixes the old form-POST flow where the
 * UI still looked logged in until a manual refresh (stale router cache). Mirrors
 * the sign-out in delete-account.tsx.
 */
export function SignOutButton() {
  const [pending, setPending] = useState(false);

  async function onSignOut() {
    setPending(true);
    try {
      await signOut(getBrowserClient());
    } finally {
      window.location.href = "/";
    }
  }

  return (
    <button
      type="button"
      onClick={onSignOut}
      disabled={pending}
      className="self-start text-sm text-ink/60 transition hover:text-ink disabled:opacity-50"
    >
      {pending ? "signing out…" : "sign out"}
    </button>
  );
}
