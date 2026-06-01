import Image from "next/image";
import type { ReactNode } from "react";

/**
 * Activity cover image with a designed fallback. When `coverUrl` is null we
 * render a category-tinted accent block carrying a tasteful inline-SVG motif and
 * the activity's initial — never a broken <img> or a stock placeholder. Used by
 * both the card and the detail hero.
 */

// Single desaturated brand accent, tinted per category by varying alpha/treatment
// rather than introducing new hues (design-taste: single accent).
const MOTIFS: Record<string, ReactNode> = {
  "soft-play": (
    // stacked soft blocks
    <g strokeLinejoin="round">
      <rect x="20" y="40" width="22" height="22" rx="4" />
      <rect x="44" y="30" width="22" height="32" rx="4" />
      <rect x="68" y="22" width="22" height="40" rx="4" />
    </g>
  ),
  parks: (
    // a tree
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d="M55 62V40" />
      <path d="M55 40c-10 0-18-7-18-16 0-7 5-12 11-13 2-7 8-9 12-7 7-1 13 4 13 12 0 13-9 24-18 24z" />
    </g>
  ),
  cafes: (
    // a cup with steam
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d="M30 38h40v10a16 16 0 0 1-16 16H46a16 16 0 0 1-16-16z" />
      <path d="M70 42h6a7 7 0 0 1 0 14h-6" />
      <path d="M44 24c-2 3-2 5 0 8M54 22c-2 3-2 5 0 8" />
    </g>
  ),
  "swim-classes": (
    // waves
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 38c6 0 6 6 12 6s6-6 12-6 6 6 12 6 6-6 12-6 6 6 12 6" />
      <path d="M20 52c6 0 6 6 12 6s6-6 12-6 6 6 12 6 6-6 12-6 6 6 12 6" />
    </g>
  ),
  playgroups: (
    // a kite
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d="M55 18 78 41 55 64 32 41z" />
      <path d="M55 18v46M32 41h46" />
      <path d="M55 64c-3 6-3 12 0 18" />
    </g>
  ),
};

function Motif({ categorySlug }: { categorySlug: string }) {
  const motif = MOTIFS[categorySlug];
  if (!motif) return null;
  return (
    <svg
      viewBox="0 0 110 84"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      className="h-full w-full text-accent/30"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
    >
      {motif}
    </svg>
  );
}

export function ActivityCover({
  coverUrl,
  title,
  categorySlug,
  alt,
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  priority = false,
}: {
  coverUrl: string | null;
  title: string;
  categorySlug: string;
  /** Overrides default alt; defaults to the title. */
  alt?: string;
  sizes?: string;
  priority?: boolean;
}) {
  if (coverUrl) {
    return (
      <Image
        src={coverUrl}
        alt={alt ?? title}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
      />
    );
  }

  const initial = title.trim().charAt(0).toUpperCase() || "T";

  return (
    <div
      role="img"
      aria-label={alt ?? title}
      className="absolute inset-0 flex items-center justify-center overflow-hidden bg-accent/10"
    >
      {/* category motif, low-contrast so the initial reads clearly */}
      <div className="absolute inset-0 flex items-center justify-center p-6">
        <Motif categorySlug={categorySlug} />
      </div>
      {/* title initial */}
      <span
        aria-hidden="true"
        className="relative select-none font-semibold tracking-tight text-accent/80"
        style={{ fontSize: "clamp(2.5rem, 12vw, 5rem)", lineHeight: 1 }}
      >
        {initial}
      </span>
    </div>
  );
}
