import Link from "next/link";

/**
 * Branded 404 within the Activity Finder chrome — shown when an area or activity
 * slug doesn't resolve (notFound()).
 */
export default function ActivitiesNotFound() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-20 text-center">
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-ink/40"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <h1 className="mt-4 text-xl font-semibold text-ink">We couldn&apos;t find that</h1>
      <p className="mt-2 text-sm text-ink/60">
        This place or area isn&apos;t listed. It may have moved or not been published yet.
      </p>
      <Link
        href="/activities"
        className="mt-6 inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg transition active:scale-[0.98] hover:bg-accent/90"
      >
        Back to explore
      </Link>
    </div>
  );
}
