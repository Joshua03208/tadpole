import type { ReactNode } from "react";
import Link from "next/link";
import { GetHelpButton } from "@/components/crisis";
import { SiteHeader } from "@/components/site-header";

/**
 * Shared public chrome — the header + footer logged-out users and search
 * crawlers see across the marketing landing and the Activity Finder. Pure
 * Server Components (no cookies()/getUser()), so any page using them stays
 * statically renderable / ISR-cacheable. GetHelpButton is the only client
 * island (rendered inside the footer).
 */

/** Public-facing top bar. Delegates to the shared SiteHeader so the bar is
 *  pixel-identical to the authenticated app header — only the links differ. */
export function PublicHeader() {
  return (
    <SiteHeader
      brandHref="/"
      links={[
        { href: "/activities", label: "explore" },
        { href: "/guides", label: "guides" },
        { href: "/login", label: "sign in" },
      ]}
    />
  );
}

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
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
