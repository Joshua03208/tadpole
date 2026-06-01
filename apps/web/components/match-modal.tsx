"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function MatchModal({
  name,
  avatarUrl,
  onClose,
}: {
  name: string;
  avatarUrl: string | null;
  onClose: () => void;
}) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 10);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="It's a match"
      className={`fixed inset-0 z-50 flex items-center justify-center bg-ink/50 p-6 transition-opacity duration-200 ${
        shown ? "opacity-100" : "opacity-0"
      }`}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-sm rounded-3xl bg-bg p-8 text-center shadow-[0_24px_60px_-20px_rgba(0,0,0,0.35)] transition-all duration-200 ease-out ${
          shown ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">a new connection</p>
        <h2 className="mt-2 text-3xl font-semibold lowercase tracking-tight text-ink">
          it&apos;s a match<span className="text-accent">.</span>
        </h2>
        <p className="mt-1 text-ink/60">you and {name} both want to connect.</p>

        <div className="my-6 flex justify-center">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="h-24 w-24 rounded-full object-cover ring-4 ring-accent/30"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-accent/15 text-2xl font-semibold text-accent ring-4 ring-accent/20">
              {name[0]?.toUpperCase() ?? "?"}
            </div>
          )}
        </div>

        <button
          type="button"
          disabled
          title="Messaging arrives in the next phase"
          aria-label="Messaging coming soon"
          className="w-full cursor-not-allowed rounded-lg bg-ink/10 px-4 py-2.5 text-sm font-semibold text-ink/40"
        >
          message · coming soon
        </button>

        <div className="mt-3 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-ink/15 px-4 py-2 text-sm font-semibold text-ink transition active:scale-[0.98] hover:bg-ink/5"
          >
            keep swiping
          </button>
          <Link
            href="/matches"
            className="flex-1 rounded-lg bg-accent px-4 py-2 text-center text-sm font-semibold text-bg transition active:scale-[0.98] hover:bg-accent/90"
          >
            view matches
          </Link>
        </div>
      </div>
    </div>
  );
}
