import type { MetadataRoute } from "next";

// Public, indexable: the landing page and the Activity Finder. Signed-in app
// surfaces (deck/matches/profile/onboarding) and API routes stay out of search.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/home", "/matches", "/profile", "/onboarding", "/auth", "/api"],
    },
    sitemap: "https://tadpole.app/sitemap.xml",
    host: "https://tadpole.app",
  };
}
