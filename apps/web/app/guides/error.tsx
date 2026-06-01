"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Error boundary for the Wellbeing Guides. Calm, non-alarming recovery — retry
 * or head back to the index.
 */
export default function GuidesError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-20 text-center">
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-ink/40"
        aria-hidden="true"
      >
        <path d="M12 9v4M12 17h.01" />
        <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      </svg>
      <h1 className="mt-4 text-xl font-semibold text-ink">Something went wrong</h1>
      <p className="mt-2 text-sm text-ink/60">
        We couldn&apos;t load this right now. Please try again in a moment.
      </p>
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg transition active:scale-[0.98] hover:bg-accent/90"
        >
          Try again
        </button>
        <Link
          href="/guides"
          className="inline-flex items-center justify-center rounded-lg border border-ink/15 px-4 py-2 text-sm font-semibold text-ink transition active:scale-[0.98] hover:bg-ink/5"
        >
          Back to guides
        </Link>
      </div>
    </div>
  );
}
