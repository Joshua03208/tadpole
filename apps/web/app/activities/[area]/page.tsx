import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAreaParams, listActivities, listActivityAreas } from "@tadpole/core";
import { getAnonServerClient } from "@/lib/supabase/anon";
import { ActivityCard } from "@/components/activity-card";
import { JsonLd } from "@/components/json-ld";

export const revalidate = 3600;
export const dynamicParams = true;

const BASE = "https://tadpole.app";

// Memoised per request so generateMetadata + the page share one query.
const loadAreas = cache(() => listActivityAreas(getAnonServerClient()));

export async function generateStaticParams() {
  const supabase = getAnonServerClient();
  return getAreaParams(supabase);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ area: string }>;
}): Promise<Metadata> {
  const { area: areaSlug } = await params;
  const areas = await loadAreas();
  const area = areas.find((a) => a.slug === areaSlug);
  if (!area) return {};

  const title = `Things to do with the kids in ${area.name}`;
  const description = `Dad-friendly places to take the kids in ${area.name} — soft play, parks, cafes, swim classes and playgroups. ${area.activityCount} ${area.activityCount === 1 ? "place" : "places"} to explore on tadpole.`;
  return {
    title,
    description,
    alternates: { canonical: `/activities/${area.slug}` },
    openGraph: {
      title: `${title} · tadpole`,
      description,
      url: `${BASE}/activities/${area.slug}`,
      siteName: "tadpole",
      type: "website",
      locale: "en_GB",
    },
  };
}

export default async function AreaPage({ params }: { params: Promise<{ area: string }> }) {
  const { area: areaSlug } = await params;
  const supabase = getAnonServerClient();

  const areas = await loadAreas();
  const area = areas.find((a) => a.slug === areaSlug);
  // Only areas with published activities are real pages.
  if (!area) notFound();

  const activities = await listActivities(supabase, { areaSlug });

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Things to do with the kids in ${area.name}`,
    itemListElement: activities.map((a, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: a.title,
      url: `${BASE}/activities/${a.areaSlug}/${a.slug}`,
    })),
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-14">
      <JsonLd data={itemListJsonLd} />

      <nav aria-label="Breadcrumb" className="text-sm text-ink/50">
        <Link href="/activities" className="transition hover:text-ink">
          explore
        </Link>
        <span aria-hidden="true" className="px-1.5 text-ink/30">
          /
        </span>
        <span className="text-ink/70">{area.name}</span>
      </nav>

      <header className="mt-4 max-w-2xl">
        <h1 className="text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          things to do in {area.name.toLowerCase()}
        </h1>
        {area.region ? <p className="mt-2 text-sm text-ink/50">{area.region}</p> : null}
        <p className="mt-4 text-lg leading-relaxed text-ink/70">
          Dad-friendly places to take the kids in {area.name} — somewhere to go, whatever the
          weather.
        </p>
      </header>

      <section className="mt-10">
        {activities.length === 0 ? (
          <p className="rounded-2xl border border-ink/10 bg-white/40 p-6 text-sm text-ink/60">
            No places listed here just yet. Check back soon.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {activities.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
