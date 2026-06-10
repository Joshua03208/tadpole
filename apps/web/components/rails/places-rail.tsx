"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getMyProfile,
  listActivities,
  listGuides,
  type ActivityCard,
  type GuideCard,
} from "@tadpole/core";
import { getBrowserClient } from "@/lib/supabase/client";

/**
 * Right desktop rail: published activities in the signed-in dad's area
 * (falling back to the newest anywhere when his area has none yet) plus one
 * wellbeing guide. Fails soft: on error the rail renders nothing.
 */
export function PlacesRail() {
  const client = useMemo(() => getBrowserClient(), []);
  const [activities, setActivities] = useState<ActivityCard[] | null>(null);
  const [areaLabel, setAreaLabel] = useState<string | null>(null);
  const [guide, setGuide] = useState<GuideCard | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const profile = await getMyProfile(client);
        let acts = profile?.area_slug
          ? await listActivities(client, { areaSlug: profile.area_slug, limit: 3 })
          : [];
        const local = acts.length > 0;
        if (!local) acts = await listActivities(client, { limit: 3 });
        const guides = await listGuides(client, { limit: 1 });
        if (!active) return;
        setAreaLabel(local ? (profile?.area_label ?? null) : null);
        setActivities(acts);
        setGuide(guides[0] ?? null);
      } catch {
        if (active) setFailed(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [client]);

  if (failed) return null;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-ink/10 bg-white/50 p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold lowercase text-ink">places to go</h2>
          <Link href="/activities" className="text-xs text-ink/50 transition hover:text-ink">
            explore
          </Link>
        </div>
        {areaLabel ? <p className="mt-0.5 text-xs text-ink/45">near {areaLabel}</p> : null}

        {activities === null ? (
          <div className="mt-3 space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-11 animate-pulse rounded-xl bg-ink/5" />
            ))}
          </div>
        ) : activities.length === 0 ? (
          <p className="mt-3 text-xs leading-relaxed text-ink/55">
            We&apos;re still adding places near you.{" "}
            <Link href="/activities" className="font-semibold text-accent hover:underline">
              Browse all areas →
            </Link>
          </p>
        ) : (
          <ul className="mt-2 -mx-2">
            {activities.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/activities/${a.areaSlug}/${a.slug}`}
                  className="block rounded-xl px-2 py-2 transition hover:bg-ink/5"
                >
                  <p className="truncate text-sm font-semibold text-ink">{a.title}</p>
                  <p className="truncate text-xs text-ink/50">
                    {a.areaName} · {a.categoryName}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {guide ? (
        <section className="rounded-2xl border border-ink/10 bg-white/50 p-4">
          <h2 className="text-sm font-semibold lowercase text-ink">from the guides</h2>
          <Link
            href={`/guides/${guide.slug}`}
            className="-mx-2 mt-1 block rounded-xl px-2 py-2 transition hover:bg-ink/5"
          >
            <p className="text-xs font-semibold text-accent">{guide.categoryName}</p>
            <p className="mt-0.5 text-sm font-semibold leading-snug text-ink">{guide.title}</p>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink/55">{guide.summary}</p>
          </Link>
        </section>
      ) : null}
    </div>
  );
}
