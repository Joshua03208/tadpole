/**
 * Route-level loading skeleton for the Activity Finder. Calm, low-motion pulse
 * matching the index/area layout (cards in a grid).
 */
export default function ActivitiesLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-14" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="max-w-2xl">
        <div className="h-3 w-28 animate-pulse rounded-full bg-ink/10" />
        <div className="mt-3 h-10 w-3/4 animate-pulse rounded-lg bg-ink/10" />
        <div className="mt-4 h-4 w-full animate-pulse rounded bg-ink/10" />
        <div className="mt-2 h-4 w-2/3 animate-pulse rounded bg-ink/10" />
      </div>
      <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-ink/10 bg-white/50">
            <div className="aspect-[4/3] w-full animate-pulse bg-ink/10" />
            <div className="space-y-2 p-4">
              <div className="h-3 w-16 animate-pulse rounded-full bg-ink/10" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-ink/10" />
              <div className="h-3 w-full animate-pulse rounded bg-ink/10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
