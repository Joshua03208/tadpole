import type { ReactNode } from "react";
import Link from "next/link";
import { GetHelpButton } from "@/components/crisis";
import { PublicHeaderAuthAware } from "@/components/public-header-auth";

/**
 * Shared public chrome — the header + footer logged-out users and search
 * crawlers see across the marketing landing and the Activity Finder. The footer
 * stays a pure Server Component; the header is a small client island
 * (PublicHeaderAuthAware) that shows the app nav once a signed-in visitor
 * hydrates, so these pages stay statically renderable / ISR-cacheable while no
 * longer looking "logged out" to a signed-in user.
 */

/** Footer with the platonic tagline, a GetHelpButton and small links. */
export function PublicFooter() {
  return (
    <footer className="border-t border-ink/10 px-4 py-10 text-xs text-ink/45">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-5 sm:flex-row sm:items-end sm:justify-between">
        <p className="max-w-md text-center leading-relaxed sm:text-left">
          tadpole<span className="text-accent">.</span> — for dads. friendship, peer support and
          local meet-ups. platonic, never dating.
        </p>
        <div className="flex flex-col items-center gap-3 sm:items-end">
          <GetHelpButton />
          <nav className="flex items-center gap-1 text-ink/55">
            <Link
              href="/activities"
              className="rounded-full px-2.5 py-1 transition hover:bg-ink/5 hover:text-ink"
            >
              explore
            </Link>
            <span aria-hidden="true" className="text-ink/25">
              ·
            </span>
            <Link
              href="/guides"
              className="rounded-full px-2.5 py-1 transition hover:bg-ink/5 hover:text-ink"
            >
              guides
            </Link>
            <span aria-hidden="true" className="text-ink/25">
              ·
            </span>
            <Link
              href="/login"
              className="rounded-full px-2.5 py-1 transition hover:bg-ink/5 hover:text-ink"
            >
              sign in
            </Link>
            <span aria-hidden="true" className="text-ink/25">
              ·
            </span>
            <Link
              href="/signup"
              className="rounded-full px-2.5 py-1 transition hover:bg-ink/5 hover:text-ink"
            >
              get started
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}

/** Convenience wrapper: header + main + footer in the standard public shell. */
export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-bg">
      <PublicHeaderAuthAware />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
