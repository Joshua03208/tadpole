import type { ReactNode } from "react";
import Link from "next/link";

/**
 * Public chrome for the Activity Finder — what logged-out users and search
 * crawlers see. Server Component with NO cookies()/getUser(), so these routes
 * stay statically renderable / ISR-cacheable.
 */
export default function ActivitiesLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col bg-bg">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-ink/10 bg-bg/90 px-4 py-3 backdrop-blur">
        <Link
          href="/"
          className="text-lg font-semibold lowercase tracking-tight text-ink transition active:scale-[0.98]"
        >
          tadpole<span className="text-accent">.</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/activities"
            className="rounded-full px-3 py-1.5 text-ink/70 transition hover:bg-ink/5 hover:text-ink"
          >
            explore
          </Link>
          <Link
            href="/login"
            className="rounded-full px-3 py-1.5 text-ink/60 transition hover:bg-ink/5 hover:text-ink"
          >
            sign in
          </Link>
        </nav>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-ink/10 px-4 py-8 text-center text-xs text-ink/45">
        <p>
          tadpole<span className="text-accent">.</span> — for dads. friendship, peer support and
          local meet-ups. platonic, never dating.
        </p>
      </footer>
    </div>
  );
}
