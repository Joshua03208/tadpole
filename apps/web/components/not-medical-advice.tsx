/**
 * Prominent, calm "general information — not medical advice" disclaimer. This is
 * a first-class element near the top of every guide page (index AND detail), not
 * fine print: the Wellness Hub is mental-health-adjacent general information for
 * dads, so the boundary must be unmistakable (CLAUDE.md "no medical claims",
 * docs/SAFETY_POLICY.md §7). Never clinical or diagnostic in tone.
 */
export function NotMedicalAdvice() {
  return (
    <aside
      aria-label="Important: general information, not medical advice"
      className="flex gap-3 rounded-2xl border border-accent/25 bg-accent/10 p-4 sm:p-5"
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mt-0.5 shrink-0 text-accent"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5" />
        <path d="M12 8h.01" />
      </svg>
      <div className="text-sm leading-relaxed text-ink/75">
        <p className="font-semibold text-ink">General information — not medical advice.</p>
        <p className="mt-1">
          These guides share general support and ideas for dads. They aren&apos;t a substitute for
          professional care. If something&apos;s worrying you or your family, please speak to your
          GP or another qualified professional — and use the help options below if you need someone
          to talk to right now.
        </p>
      </div>
    </aside>
  );
}
