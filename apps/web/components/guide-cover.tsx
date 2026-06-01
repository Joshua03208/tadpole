import Image from "next/image";
import type { ReactNode } from "react";

/**
 * Guide cover image with a designed fallback (mirrors activity-cover.tsx). When
 * `coverUrl` is null we render a category-tinted accent block with a calm
 * inline-SVG motif and the guide's initial — never a broken <img> or stock
 * photo. Seeded guide covers are null for now, so the fallback is the default.
 * Used by both the card and the detail hero.
 */

// A single brand accent, tinted per category by alpha rather than new hues
// (design-taste: single accent). Unknown categories fall back to a calm
// concentric "ripple" motif that reads on-brand for any topic.
const MOTIFS: Record<string, ReactNode> = {
  "mental-health": (
    // a steady mind / lightbulb
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d="M44 64h22" />
      <path d="M47 70h16" />
      <path d="M55 18a20 20 0 0 1 13 35c-2 2-3 4-3 7H45c0-3-1-5-3-7a20 20 0 0 1 13-35z" />
    </g>
  ),
  wellbeing: (
    // open hands / care
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d="M55 30c5-9 20-9 20 4 0 10-12 18-20 26-8-8-20-16-20-26 0-13 15-13 20-4z" />
    </g>
  ),
  parenting: (
    // adult + child
    <g strokeLinecap="round" strokeLinejoin="round">
      <circle cx="42" cy="28" r="7" />
      <path d="M42 35v18M42 42l-9 6M42 42l9 6M42 53l-6 11M42 53l6 11" />
      <circle cx="72" cy="40" r="5" />
      <path d="M72 45v12M72 50l-6 4M72 50l6 4M72 57l-4 8M72 57l4 8" />
    </g>
  ),
  relationships: (
    // two linked rings
    <g strokeLinecap="round" strokeLinejoin="round">
      <circle cx="46" cy="42" r="16" />
      <circle cx="68" cy="42" r="16" />
    </g>
  ),
  "sleep-routines": (
    // crescent moon
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d="M64 24a22 22 0 1 0 6 38 18 18 0 0 1-6-38z" />
    </g>
  ),
  "money-work": (
    // steady balance / coins
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d="M55 22v40" />
      <path d="M38 32l17-10 17 10" />
      <path d="M30 32l8 16h-16zM72 32l8 16h-16z" />
    </g>
  ),
};

function Motif({ categorySlug }: { categorySlug: string }) {
  const motif = MOTIFS[categorySlug];
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
      {motif ?? (
        // default: calm concentric ripples — like a tadpole's pond
        <g strokeLinecap="round">
          <circle cx="55" cy="42" r="9" />
          <circle cx="55" cy="42" r="20" />
          <circle cx="55" cy="42" r="31" />
        </g>
      )}
    </svg>
  );
}

export function GuideCover({
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
