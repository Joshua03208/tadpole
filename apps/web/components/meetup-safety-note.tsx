/**
 * Warm, calm meet-up safety note shown on the activity detail view. Reassuring,
 * not alarming — and never medical advice.
 */
export function MeetupSafetyNote() {
  return (
    <aside className="flex gap-3 rounded-2xl border border-accent/20 bg-accent/5 p-4">
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mt-0.5 shrink-0 text-accent"
        aria-hidden="true"
      >
        <path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z" />
        <path d="M9 11.5l2 2 4-4" />
      </svg>
      <p className="text-sm leading-relaxed text-ink/70">
        <span className="font-semibold text-ink">Meeting another dad?</span> Pick somewhere public,
        let someone know where you&apos;re going, and trust your instincts.
      </p>
    </aside>
  );
}
