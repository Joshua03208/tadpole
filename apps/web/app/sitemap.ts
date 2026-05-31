import type { MetadataRoute } from "next";

// Phase 0 stub: a single entry so the SEO surface exists from day one. The
// Activity Finder and Knowledge Hub phases push their slugs in here so every
// activity/area/article auto-enters the sitemap (docs/TADPOLE_PLAN.md §3).
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://tadpole.app",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
