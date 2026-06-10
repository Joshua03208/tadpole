import Link from "next/link";
import { GetHelpButton } from "@/components/crisis";

export type NavLink = { href: string; label: string };

/**
 * The single site-wide top bar. Every page renders this same component, so the
 * bar's height, padding, border, sticky behaviour, wordmark and crisis button
 * are identical everywhere — only the link set differs (public vs authenticated).
 *
 * Pure Server Component: GetHelpButton is the lone client island, so public
 * pages that use this stay statically renderable / ISR-cacheable.
 */
export function SiteHeader({ brandHref, links }: { brandHref: string; links: NavLink[] }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-ink/10 bg-bg/90 px-4 py-3 backdrop-blur">
      <Link
        href={brandHref}
        className="text-lg font-semibold lowercase tracking-tight text-ink transition active:scale-[0.98]"
      >
        tadpole<span className="text-accent">.</span>
      </Link>
      <nav className="flex items-center gap-1 text-sm">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="rounded-full px-3 py-1.5 text-ink/70 transition hover:bg-ink/5 hover:text-ink"
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <GetHelpButton />
    </header>
  );
}
