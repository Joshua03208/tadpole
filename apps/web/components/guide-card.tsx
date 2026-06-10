import Link from "next/link";
import type { GuideCard as GuideCardData } from "@tadpole/core";
import { GuideCover } from "@/components/guide-cover";

/**
 * A single guide tile linking to /guides/[slug] (flat, globally-unique slug).
 * Cover (or designed fallback), category, title, summary and the denormalized
 * byline (authorName). Tactile hover/active feedback via CSS transitions only.
 * The byline is rendered straight from the guide — we never query profiles.
 */
export function GuideCard({ guide }: { guide: GuideCardData }) {
  return (
    <Link
      href={`/guides/${guide.slug}`}
      className="group block overflow-hidden rounded-2xl border border-ink/10 bg-white/50 transition active:scale-[0.98] hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[0_12px_32px_-16px_rgba(0,0,0,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-accent/10">
        <GuideCover
          coverUrl={guide.coverUrl}
          title={guide.title}
          categorySlug={guide.categorySlug}
        />
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-accent">
          <span>{guide.categoryName}</span>
        </div>
        <h3 className="mt-1.5 text-base font-semibold leading-snug text-ink">{guide.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-ink/60">{guide.summary}</p>
        {guide.authorName ? (
          <p className="mt-3 text-xs text-ink/55">{guide.authorName}</p>
        ) : null}
      </div>
    </Link>
  );
}
