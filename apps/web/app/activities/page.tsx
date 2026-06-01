import type { Metadata } from "next";
import Link from "next/link";
import { listActivities, listActivityAreas, listCategories } from "@tadpole/core";
import { getAnonServerClient } from "@/lib/supabase/anon";
import { ActivityCard } from "@/components/activity-card";
import { JsonLd } from "@/components/json-ld";

export const revalidate = 3600;

const BASE = "https://tadpole.app";

export const metadata: Metadata = {
  title: "Things to do with the kids",
  description:
    "Discover dad-friendly places to take the kids — soft play, parks, cafes, swim classes and playgroups near you. Browse by area on tadpole.",
  alternates: { canonical: "/activities" },
  openGraph: {
    title: "Things to do with the kids · tadpole",
    description:
      "Dad-friendly places to take the kids — soft play, parks, cafes, swim classes and playgroups, browsable by area.",
    url: `${BASE}/activities`,
    siteName: "tadpole",
    type: "website",
    locale: "en_GB",
  },
};

export default async function ActivitiesIndexPage() {
  const supabase = getAnonServerClient();
  const [areas, categories, featured] = await Promise.all([
    listActivityAreas(supabase),
    listCategories(supabase),
    listActivities(supabase, { limit: 6 }),
  ]);

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Dad-friendly places by area",
    itemListElement: areas.map((area, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: area.name,
      url: `${BASE}/activities/${area.slug}`,
    })),
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-14">
      <JsonLd data={itemListJsonLd} />

      {/* hero */}
      <section className="max-w-2xl">
        <p className="text-sm font-medium uppercase tracking-wide text-accent">activity finder</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          things to do with the kids
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-ink/70">
          A growing guide to dad-friendly places — soft play, parks, cafes, swim classes and
          playgroups. Browse by area and find somewhere to go this weekend.
        </p>
      </section>

      {/* category chips */}
      {categories.length > 0 ? (
        <ul className="mt-8 flex flex-wrap gap-2">
          {categories.map((c) => (
            <li key={c.slug}>
              <span className="inline-flex items-center rounded-full border border-ink/10 bg-white/50 px-3 py-1.5 text-sm text-ink/70">
                {c.name}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {/* areas */}
      <section className="mt-12">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/50">Browse by area</h2>
        {areas.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-ink/10 bg-white/40 p-6 text-sm text-ink/60">
            We&apos;re still adding places. Check back soon.
          </p>
        ) : (
          <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {areas.map((area) => (
              <li key={area.slug}>
                <Link
                  href={`/activities/${area.slug}`}
                  className="group flex items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-white/50 px-5 py-4 transition active:scale-[0.98] hover:border-accent/40 hover:shadow-[0_10px_28px_-16px_rgba(0,0,0,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                >
                  <span>
                    <span className="block text-base font-semibold text-ink">{area.name}</span>
                    {area.region ? (
                      <span className="block text-xs text-ink/50">{area.region}</span>
                    ) : null}
                  </span>
                  <span className="flex items-center gap-2 text-sm text-ink/55">
                    <span>
                      {area.activityCount} {area.activityCount === 1 ? "place" : "places"}
                    </span>
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-ink/30 transition group-hover:translate-x-0.5 group-hover:text-accent"
                      aria-hidden="true"
                    >
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* featured activities */}
      {featured.length > 0 ? (
        <section className="mt-14">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/50">
            A few to get you started
          </h2>
          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
