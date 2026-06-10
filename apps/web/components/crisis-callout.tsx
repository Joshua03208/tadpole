import { CRISIS_RESOURCES, type CrisisResource } from "@tadpole/core";

/**
 * Contextual, persistent crisis surface required on every guide page (the
 * Wellness Hub is the most sensitive surface in the app — docs/SAFETY_POLICY.md
 * §7). Lists the key UK lines from CRISIS_RESOURCES as tappable tel:/sms:
 * actions, emphasising the emergency line. The header/footer GetHelpButton is
 * ALSO present, but this prominent in-page card is mandatory here.
 *
 * Pure Server Component (no client JS), so guide pages stay statically
 * renderable / ISR-cacheable.
 */
function actionFor(a: CrisisResource["action"]): { href: string; label: string } {
  if (a.kind === "call") {
    const pretty =
      a.number === "116123" ? "116 123" : a.number === "0800585858" ? "0800 58 58 58" : a.number;
    return { href: `tel:${a.number}`, label: `Call ${pretty}` };
  }
  return {
    href: `sms:${a.to}?body=${encodeURIComponent(a.body)}`,
    label: `Text ${a.body} to ${a.to}`,
  };
}

export function CrisisCallout() {
  return (
    <section
      aria-label="Get help now — crisis support"
      className="rounded-2xl border border-ink/10 bg-white/50 p-5 sm:p-6"
    >
      <div className="flex items-start gap-3">
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
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" />
        </svg>
        <div>
          <h2 className="text-base font-semibold text-ink">Need to talk to someone?</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink/60">
            tadpole<span className="text-accent">.</span>
            {" isn't a crisis service. If you're struggling, these UK lines can help — free and confidential."}
          </p>
        </div>
      </div>

      <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {CRISIS_RESOURCES.map((r) => {
          const a = actionFor(r.action);
          return (
            <li key={r.name}>
              <a
                href={a.href}
                className={`block h-full rounded-2xl border px-4 py-3 transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
                  r.emphasis
                    ? "border-error/30 bg-error/10 hover:border-error/50"
                    : "border-ink/10 bg-white/60 hover:border-accent/40"
                }`}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold text-ink">{r.name}</span>
                  <span
                    className={`text-sm font-semibold ${r.emphasis ? "text-error" : "text-accent"}`}
                  >
                    {a.label}
                  </span>
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-ink/55">{r.detail}</p>
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
