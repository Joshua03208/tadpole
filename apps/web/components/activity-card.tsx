import Link from "next/link";
import { COST_TIER_LABELS, type ActivityCard as ActivityCardData } from "@tadpole/core";
import { ActivityCover } from "@/components/activity-cover";

/**
 * A single activity tile linking to /activities/[area]/[slug]. Cover (or designed
 * fallback), title, area, cost label and category. Tactile hover/active feedback
 * via CSS transitions only.
 */
export function ActivityCard({ activity }: { activity: ActivityCardData }) {
  const costLabel = COST_TIER_LABELS[activity.costTier] ?? activity.costTier;

  return (
    <Link
      href={`/activities/${activity.areaSlug}/${activity.slug}`}
      className="group block overflow-hidden rounded-2xl border border-ink/10 bg-white/50 transition active:scale-[0.98] hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[0_12px_32px_-16px_rgba(0,0,0,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-accent/10">
        <ActivityCover
          coverUrl={activity.coverUrl}
          title={activity.title}
          categorySlug={activity.categorySlug}
        />
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-accent">
          <span>{activity.categoryName}</span>
        </div>
        <h3 className="mt-1.5 text-base font-semibold leading-snug text-ink">{activity.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-ink/60">{activity.summary}</p>
        <div className="mt-3 flex items-center gap-2 text-xs text-ink/55">
          <span>{activity.areaName}</span>
          <span aria-hidden="true" className="text-ink/25">
            ·
          </span>
          <span>{costLabel}</span>
        </div>
      </div>
    </Link>
  );
}
