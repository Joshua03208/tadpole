import type { MetadataRoute } from "next";
import { getActivityParams, getAreaParams } from "@tadpole/core";
import { getAnonServerClient } from "@/lib/supabase/anon";

const BASE = "https://tadpole.app";

// The public, SEO-indexable surface: homepage, the Activity Finder index, every
// area page and every published activity. Sessionless anon reads only — no user
// data (docs/TADPOLE_PLAN.md §3).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = getAnonServerClient();
  const [areas, activities] = await Promise.all([
    getAreaParams(supabase),
    getActivityParams(supabase),
  ]);

  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    {
      url: BASE,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE}/activities`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  for (const { area } of areas) {
    entries.push({
      url: `${BASE}/activities/${area}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  for (const { area, slug } of activities) {
    entries.push({
      url: `${BASE}/activities/${area}/${slug}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }

  return entries;
}
