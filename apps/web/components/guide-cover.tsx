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
// Keys MUST match guide_categories.slug in the DB (seeded in 0017):
// mental-wellbeing, becoming-a-dad, family-and-relationships,
// everyday-fatherhood, looking-after-yourself.
const MOTIFS: Record<string, ReactNode> = {
  "mental-wellbeing": (
    // a steady mind / lightbulb
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d="M44 64h22" />
      <path d="M47 70h16" />
      <path d="M55 18a20 20 0 0 1 13 35c-2 2-3 4-3 7H45c0-3-1-5-3-7a20 20 0 0 1 13-35z" />
    </g>
  ),
  "becoming-a-dad": (
    // adult + child
    <g strokeLinecap="round" strokeLinejoin="round">
      <circle cx="42" cy="28" r="7" />
      <path d="M42 35v18M42 42l-9 6M42 42l9 6M42 53l-6 11M42 53l6 11" />
      <circle cx="72" cy="40" r="5" />
      <path d="M72 45v12M72 50l-6 4M72 50l6 4M72 57l-4 8M72 57l4 8" />
    </g>
  ),
  "family-and-relationships": (
    // two linked rings
    <g strokeLinecap="round" strokeLinejoin="round">
      <circle cx="46" cy="42" r="16" />
      <circle cx="68" cy="42" r="16" />
    </g>
  ),
  "everyday-fatherhood": (
    // a plain sun — the ordinary day
    <g strokeLinecap="round" strokeLinejoin="round">
      <circle cx="55" cy="42" r="13" />
      <path d="M55 17v8M55 59v8M30 42h8M72 42h8M37 24l6 6M67 54l6 6M73 24l-6 6M43 54l-6 6" />
    </g>
  ),
  "looking-after-yourself": (
    // a single calm leaf
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d="M55 18c20 9 24 33 0 48-24-15-20-39 0-48z" />
      <path d="M55 28v30" />
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
      className="h-full w-full text-accent/45"
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

  // Deterministic per-card variance (tint + slight tilt) keyed on the title,
  // so a grid of fallbacks gets rhythm instead of identical tiles. The motif
  // is the hero — a big initial added noise without meaning.
  const h = hashString(title);
  const tint = TINTS[h % TINTS.length];
  const rotate = ROTATIONS[(h >> 2) % ROTATIONS.length];

  return (
    <div
      role="img"
      aria-label={alt ?? title}
      className={`absolute inset-0 flex items-center justify-center overflow-hidden ${tint}`}
    >
      <div
        className="absolute inset-0 flex items-center justify-center p-8"
        style={{ transform: `rotate(${rotate}deg)` }}
      >
        <Motif categorySlug={categorySlug} />
      </div>
    </div>
  );
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Static class strings so Tailwind can see them; same single accent, varied depth.
const TINTS = ["bg-accent/10", "bg-accent/[0.16]", "bg-accent/[0.22]"];
const ROTATIONS = [-4, 0, 4];
