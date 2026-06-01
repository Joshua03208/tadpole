import type { Metadata } from "next";
import Link from "next/link";
import { listActivities, listActivityAreas } from "@tadpole/core";
import { getAnonServerClient } from "@/lib/supabase/anon";
import { ActivityCard } from "@/components/activity-card";
import { JsonLd } from "@/components/json-ld";
import { PublicShell } from "@/components/public-chrome";

// Static marketing landing. Featured strip reads PUBLIC activity data via the
// sessionless anon client, so the page stays SSG + revalidated on a timer — no
// cookies()/getUser(), no force-dynamic. Authenticated users never see this:
// proxy.ts redirects "/" → /home at the edge.
export const revalidate = 3600;

const BASE = "https://tadpole.app";
const DESCRIPTION =
  "Tadpole connects dads for friendship, peer support, and local meet-ups. Platonic — not a dating app.";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: {
    title: "tadpole",
    description:
      "For dads — friendship, peer support, and local meet-ups. Platonic, never dating.",
    url: BASE,
    siteName: "tadpole",
    type: "website",
    locale: "en_GB",
  },
};

// Small inline-SVG glyphs for the "how it works" steps — single-accent, no deps.
const HowIcon = {
  match: (
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20s-7-4.4-7-9.3A4 4 0 0 1 12 8a4 4 0 0 1 7 2.7C19 15.6 12 20 12 20z" />
    </g>
  ),
  hi: (
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.5 8.5 0 0 1-12.2 7.6L4 21l1.9-4.8A8.5 8.5 0 1 1 21 11.5z" />
      <path d="M9 11h.01M12 11h.01M15 11h.01" />
    </g>
  ),
  meet: (
    <g strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-6-5.7-6-10a6 6 0 0 1 12 0c0 4.3-6 10-6 10z" />
      <circle cx="12" cy="11" r="2.2" />
    </g>
  ),
};

const STEPS = [
  {
    n: "01",
    key: "match" as const,
    title: "match with local dads",
    body: "swipe through dads near you and match when you both say yes. just like-minded fathers — never a dating profile in sight.",
  },
  {
    n: "02",
    key: "hi" as const,
    title: "say hi",
    body: "break the ice in a calm one-to-one chat. no pressure, no performance — just two dads working out if you'd get on.",
  },
  {
    n: "03",
    key: "meet" as const,
    title: "meet up",
    body: "grab a coffee, take the kids to the park, or find something to do together from the activity finder.",
  },
];

const SAFETY = [
  {
    title: "block, unmatch & report",
    body: "you're in control. block or unmatch anyone, and report anything that doesn't feel right — it's built in from day one.",
  },
  {
    title: "platonic, not dating",
    body: "tadpole is for friendship and peer support between fathers. it's a strictly platonic space, and 18+ only.",
  },
  {
    title: "your location stays coarse",
    body: "other dads only ever see your rough area, never your precise location. you choose what to share.",
  },
];

export default async function HomePage() {
  // Featured strip — best-effort. Sparse seed data is normal, so we guard the
  // empty state and render the section only when there's something to show.
  // Best-effort: a transient anon-read failure must never break the static
  // marketing page, so default to empty and let the section guards hide it.
  let featured: Awaited<ReturnType<typeof listActivities>> = [];
  let areas: Awaited<ReturnType<typeof listActivityAreas>> = [];
  try {
    const supabase = getAnonServerClient();
    [featured, areas] = await Promise.all([
      listActivities(supabase, { limit: 6 }),
      listActivityAreas(supabase),
    ]);
  } catch {
    /* sparse/transient — render the landing without the featured strip */
  }

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "tadpole",
    url: BASE,
    description: DESCRIPTION,
    logo: `${BASE}/icon`,
  };

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "tadpole",
    url: BASE,
    description: DESCRIPTION,
    inLanguage: "en-GB",
  };

  return (
    <PublicShell>
      <JsonLd data={[organizationJsonLd, websiteJsonLd]} />

      {/* ---- HERO (asymmetric: copy-left, brand visual right) ---------------- */}
      <section className="relative overflow-hidden">
        {/* soft off-centre accent wash, well clear of dead-centre */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-32 -top-40 h-[34rem] w-[34rem] rounded-full bg-accent/10 blur-3xl sm:-right-20"
        />
        <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-4 py-16 sm:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:gap-8">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/5 px-3 py-1 text-xs font-medium text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
              for dads · platonic, never dating
            </span>
            <h1 className="mt-5 text-5xl font-semibold lowercase tracking-tight text-ink sm:text-6xl">
              tadpole<span className="text-accent">.</span>
            </h1>
            <p className="mt-5 text-balance text-lg leading-relaxed text-ink/70 sm:text-xl">
              fatherhood is better with mates who get it. find local dads for friendship, peer
              support and proper meet-ups — the easy way to make real-life dad friends.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-bg transition active:scale-[0.98] hover:bg-accent/90 hover:shadow-[0_12px_30px_-12px_rgba(62,124,90,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              >
                get started
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl border border-ink/15 px-6 py-3 text-sm font-semibold text-ink transition active:scale-[0.98] hover:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                sign in
              </Link>
              <Link
                href="/activities"
                className="group inline-flex items-center gap-1.5 rounded-xl px-2 py-3 text-sm font-semibold text-accent transition hover:text-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                explore things to do
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition group-hover:translate-x-0.5"
                  aria-hidden="true"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </Link>
            </div>
            <p className="mt-6 text-xs text-ink/40">18+ only · UK</p>
          </div>

          {/* brand visual — a stylised, designed swipe-card stack (no photos) */}
          <HeroVisual />
        </div>
      </section>

      {/* ---- HOW IT WORKS (zig-zag, not a 3-equal-card row) ------------------ */}
      <section className="mx-auto w-full max-w-5xl px-4 py-16 sm:py-20">
        <div className="max-w-xl">
          <p className="text-sm font-medium uppercase tracking-wide text-accent">how it works</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            three steps to a new mate
          </h2>
        </div>

        <ol className="mt-12 space-y-6">
          {STEPS.map((step, i) => (
            <li
              key={step.n}
              className={`flex flex-col gap-5 rounded-3xl border border-ink/10 bg-white/50 p-6 transition hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-[0_16px_40px_-24px_rgba(0,0,0,0.3)] sm:p-8 ${
                // alternate the alignment so the column zig-zags, never centred
                i % 2 === 0
                  ? "sm:flex-row sm:items-center sm:pr-16 lg:ml-0 lg:mr-16"
                  : "sm:flex-row-reverse sm:items-center sm:pl-16 lg:ml-16 lg:mr-0"
              }`}
            >
              <span
                aria-hidden="true"
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-accent/10 text-accent"
              >
                <svg
                  width="30"
                  height="30"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  {HowIcon[step.key]}
                </svg>
              </span>
              <div>
                <span className="text-xs font-semibold tracking-widest text-ink/30">{step.n}</span>
                <h3 className="mt-1 text-xl font-semibold lowercase text-ink">{step.title}</h3>
                <p className="mt-2 max-w-md text-ink/65">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ---- SAFETY FIRST --------------------------------------------------- */}
      <section className="border-y border-ink/10 bg-accent/[0.04]">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
            <div className="max-w-sm">
              <span className="inline-flex items-center gap-2 text-accent">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z" />
                  <path d="M9 11.5l2 2 4-4" />
                </svg>
                <span className="text-sm font-medium uppercase tracking-wide">safety first</span>
              </span>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                built to feel safe
              </h2>
              <p className="mt-4 leading-relaxed text-ink/65">
                meeting strangers should feel calm, not risky. pick somewhere public, let someone
                know where you&apos;re going, and trust your instincts — we&apos;ve got the rest.
              </p>
            </div>

            <ul className="grid gap-4 sm:grid-cols-2">
              {SAFETY.map((item) => (
                <li
                  key={item.title}
                  className="rounded-2xl border border-ink/10 bg-bg p-5 transition hover:border-accent/30 hover:shadow-[0_12px_32px_-20px_rgba(0,0,0,0.3)]"
                >
                  <h3 className="text-base font-semibold lowercase text-ink">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink/60">{item.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ---- FEATURED ACTIVITIES (guarded — render nothing if empty) -------- */}
      {featured.length > 0 ? (
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-20">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-xl">
              <p className="text-sm font-medium uppercase tracking-wide text-accent">
                things to do
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
                somewhere to take the kids
              </h2>
              <p className="mt-3 text-ink/65">
                a growing guide to dad-friendly places — soft play, parks, cafes, swim classes and
                playgroups. browse freely, no sign-up needed.
              </p>
            </div>
            <Link
              href="/activities"
              className="group inline-flex items-center gap-1.5 rounded-xl border border-ink/15 px-4 py-2.5 text-sm font-semibold text-ink transition active:scale-[0.98] hover:border-accent/40 hover:bg-ink/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              browse all
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-ink/40 transition group-hover:translate-x-0.5 group-hover:text-accent"
                aria-hidden="true"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>

          {/* browse-by-area teaser */}
          {areas.length > 0 ? (
            <div className="mt-8 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-ink/45">browse by area:</span>
              {areas.slice(0, 6).map((area) => (
                <Link
                  key={area.slug}
                  href={`/activities/${area.slug}`}
                  className="inline-flex items-center rounded-full border border-ink/10 bg-white/50 px-3 py-1.5 text-ink/70 transition active:scale-[0.98] hover:border-accent/40 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                  {area.name}
                </Link>
              ))}
              {areas.length > 6 ? (
                <Link
                  href="/activities"
                  className="inline-flex items-center rounded-full px-3 py-1.5 font-semibold text-accent transition hover:text-accent/80"
                >
                  + more
                </Link>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {/* ---- CLOSING CTA ---------------------------------------------------- */}
      <section className="mx-auto w-full max-w-5xl px-4 pb-20">
        <div className="relative overflow-hidden rounded-3xl border border-accent/20 bg-accent/[0.06] px-6 py-12 sm:px-12 sm:py-16">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-16 -bottom-20 h-64 w-64 rounded-full bg-accent/10 blur-3xl"
          />
          <div className="relative max-w-xl">
            <h2 className="text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              find your people.
            </h2>
            <p className="mt-3 text-ink/65">
              it takes two minutes to set up. you could be sharing a coffee with a local dad by the
              weekend.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-bg transition active:scale-[0.98] hover:bg-accent/90 hover:shadow-[0_12px_30px_-12px_rgba(62,124,90,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              >
                get started
              </Link>
              <span className="text-xs text-ink/40">free to join · 18+ only · platonic</span>
            </div>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}

/**
 * On-brand hero visual: a stylised swipe-card stack that nods to the deck
 * mechanic without any photography. Pure CSS/SVG, single-accent, lightweight —
 * a tadpole-mark "card" with a yes/pass affordance underneath.
 */
function HeroVisual() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto hidden h-[24rem] w-full max-w-sm select-none sm:block"
    >
      {/* back card, rotated — depth without a stock image */}
      <div className="absolute left-6 top-10 h-72 w-60 -rotate-6 rounded-3xl border border-ink/10 bg-white/40" />
      <div className="absolute right-6 top-6 h-72 w-60 rotate-6 rounded-3xl border border-ink/10 bg-white/40" />

      {/* front card */}
      <div className="absolute left-1/2 top-2 h-80 w-64 -translate-x-1/2 rounded-3xl border border-ink/10 bg-bg shadow-[0_24px_60px_-30px_rgba(0,0,0,0.45)]">
        {/* a calm accent field carrying the tadpole mark */}
        <div className="relative m-3 flex h-44 items-center justify-center overflow-hidden rounded-2xl bg-accent/10">
          <svg
            viewBox="0 0 120 120"
            fill="none"
            className="h-28 w-28 text-accent/80"
            stroke="currentColor"
            strokeWidth="3"
          >
            {/* tadpole: round head + curling tail */}
            <circle cx="46" cy="52" r="22" fill="currentColor" stroke="none" />
            <circle cx="40" cy="46" r="4" className="fill-bg" stroke="none" />
            <path
              d="M66 58c14 2 26 12 30 26-12-6-20-4-26 2-5-7-3-18-4-28z"
              fill="currentColor"
              stroke="none"
            />
          </svg>
        </div>
        <div className="px-4">
          <div className="h-3 w-24 rounded-full bg-ink/15" />
          <div className="mt-2 h-2.5 w-36 rounded-full bg-ink/10" />
          <div className="mt-1.5 h-2.5 w-28 rounded-full bg-ink/10" />
        </div>
        {/* yes / pass affordances */}
        <div className="mt-5 flex items-center justify-center gap-4">
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-ink/15 bg-bg text-ink/40">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </span>
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-bg shadow-[0_10px_24px_-10px_rgba(62,124,90,0.7)]">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path
                d="M12 20s-7-4.4-7-9.3A4 4 0 0 1 12 8a4 4 0 0 1 7 2.7C19 15.6 12 20 12 20z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </div>
      </div>
    </div>
  );
}
