import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  COST_TIER_LABELS,
  getActivity,
  getActivityParams,
  listActivities,
} from "@tadpole/core";
import { getAnonServerClient } from "@/lib/supabase/anon";
import { ActivityCard } from "@/components/activity-card";
import { ActivityCover } from "@/components/activity-cover";
import { JsonLd } from "@/components/json-ld";
import { MeetupSafetyNote } from "@/components/meetup-safety-note";

export const revalidate = 3600;
export const dynamicParams = true;

const BASE = "https://tadpole.app";

// Memoised per request so generateMetadata + the page share one query.
const loadActivity = cache((area: string, slug: string) =>
  getActivity(getAnonServerClient(), area, slug),
);

export async function generateStaticParams() {
  const supabase = getAnonServerClient();
  return getActivityParams(supabase);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ area: string; slug: string }>;
}): Promise<Metadata> {
  const { area, slug } = await params;
  const activity = await loadActivity(area, slug);
  if (!activity) return {};

  const url = `${BASE}/activities/${activity.areaSlug}/${activity.slug}`;
  return {
    title: activity.title,
    description: activity.summary,
    alternates: { canonical: `/activities/${activity.areaSlug}/${activity.slug}` },
    openGraph: {
      title: `${activity.title} · tadpole`,
      description: activity.summary,
      url,
      siteName: "tadpole",
      type: "website",
      locale: "en_GB",
      ...(activity.coverUrl ? { images: [{ url: activity.coverUrl, alt: activity.title }] } : {}),
    },
  };
}

export default async function ActivityDetailPage({
  params,
}: {
  params: Promise<{ area: string; slug: string }>;
}) {
  const { area, slug } = await params;
  const supabase = getAnonServerClient();

  const activity = await loadActivity(area, slug);
  if (!activity) notFound();

  const costLabel = COST_TIER_LABELS[activity.costTier] ?? activity.costTier;
  const url = `${BASE}/activities/${activity.areaSlug}/${activity.slug}`;

  // "more in [area]" strip — fetch one extra, drop the current, keep 4 so the
  // grid stays filled even when the current activity is in the first results.
  const more = (await listActivities(supabase, { areaSlug: activity.areaSlug, limit: 5 }))
    .filter((a) => a.id !== activity.id)
    .slice(0, 4);

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": activity.schemaType,
    name: activity.title,
    description: activity.summary,
    url,
  };
  if (activity.address) {
    jsonLd.address = {
      "@type": "PostalAddress",
      streetAddress: activity.address,
      addressLocality: activity.areaName,
      addressCountry: "GB",
    };
  }
  if (activity.lat !== null && activity.lng !== null) {
    jsonLd.geo = {
      "@type": "GeoCoordinates",
      latitude: activity.lat,
      longitude: activity.lng,
    };
  }

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
      <JsonLd data={jsonLd} />

      <nav aria-label="Breadcrumb" className="text-sm text-ink/50">
        <Link href="/activities" className="transition hover:text-ink">
          explore
        </Link>
        <span aria-hidden="true" className="px-1.5 text-ink/30">
          /
        </span>
        <Link href={`/activities/${activity.areaSlug}`} className="transition hover:text-ink">
          {activity.areaName}
        </Link>
        <span aria-hidden="true" className="px-1.5 text-ink/30">
          /
        </span>
        <span className="text-ink/70">{activity.title}</span>
      </nav>

      {/* hero cover */}
      <div className="relative mt-5 aspect-[16/9] w-full overflow-hidden rounded-3xl border border-ink/10 bg-accent/10">
        <ActivityCover
          coverUrl={activity.coverUrl}
          title={activity.title}
          categorySlug={activity.categorySlug}
          sizes="(min-width: 768px) 768px, 100vw"
          priority
        />
      </div>

      <header className="mt-6">
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-wide text-accent">
          <span>{activity.categoryName}</span>
          <span aria-hidden="true" className="text-ink/25">
            ·
          </span>
          <span className="text-ink/55">{activity.areaName}</span>
          <span aria-hidden="true" className="text-ink/25">
            ·
          </span>
          <span className="text-ink/55">{costLabel}</span>
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {activity.title}
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-ink/70">{activity.summary}</p>
      </header>

      {activity.description ? (
        <div className="mt-6 whitespace-pre-line text-base leading-relaxed text-ink/80">
          {activity.description}
        </div>
      ) : null}

      {/* details */}
      <dl className="mt-8 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        {activity.address ? (
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-ink/45">Where</dt>
            <dd className="mt-1 text-sm text-ink/75">{activity.address}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-ink/45">Cost</dt>
          <dd className="mt-1 text-sm text-ink/75">{costLabel}</dd>
        </div>
      </dl>

      {/* outbound links */}
      {activity.websiteUrl || activity.bookingUrl ? (
        <div className="mt-6 flex flex-wrap gap-3">
          {activity.websiteUrl ? (
            <a
              href={activity.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-ink/15 px-4 py-2 text-sm font-semibold text-ink transition active:scale-[0.98] hover:bg-ink/5"
            >
              Visit website
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M7 17 17 7M9 7h8v8" />
              </svg>
            </a>
          ) : null}
          {activity.bookingUrl ? (
            <a
              href={activity.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg transition active:scale-[0.98] hover:bg-accent/90"
            >
              Book a place
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M7 17 17 7M9 7h8v8" />
              </svg>
            </a>
          ) : null}
        </div>
      ) : null}

      {/* safety */}
      <div className="mt-8">
        <MeetupSafetyNote />
      </div>

      {/* more in area */}
      {more.length > 0 ? (
        <section className="mt-14 border-t border-ink/10 pt-10">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/50">
              More in {activity.areaName}
            </h2>
            <Link
              href={`/activities/${activity.areaSlug}`}
              className="text-sm font-medium text-accent transition hover:text-accent/80"
            >
              See all
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {more.map((a) => (
              <ActivityCard key={a.id} activity={a} />
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
