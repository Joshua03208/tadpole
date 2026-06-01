import type { Metadata } from "next";
import { listGuideCategories, listGuides } from "@tadpole/core";
import { getAnonServerClient } from "@/lib/supabase/anon";
import { GuideCard } from "@/components/guide-card";
import { JsonLd } from "@/components/json-ld";
import { NotMedicalAdvice } from "@/components/not-medical-advice";
import { CrisisCallout } from "@/components/crisis-callout";

export const revalidate = 3600;

const BASE = "https://tadpole.app";

export const metadata: Metadata = {
  title: "Wellbeing & parenting guides",
  description:
    "General wellbeing and parenting guides for dads — calm, practical reads on fatherhood, looking after yourself and supporting your family. From the tadpole wellbeing team.",
  alternates: { canonical: "/guides" },
  openGraph: {
    title: "Wellbeing & parenting guides · tadpole",
    description:
      "General wellbeing and parenting guides for dads — calm, practical reads on fatherhood and looking after yourself.",
    url: `${BASE}/guides`,
    siteName: "tadpole",
    type: "website",
    locale: "en_GB",
  },
};

export default async function GuidesIndexPage() {
  const supabase = getAnonServerClient();
  const [categories, guides] = await Promise.all([
    listGuideCategories(supabase),
    listGuides(supabase),
  ]);

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Wellbeing & parenting guides for dads",
    itemListElement: guides.map((g, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: g.title,
      url: `${BASE}/guides/${g.slug}`,
    })),
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:py-14">
      <JsonLd data={itemListJsonLd} />

      {/* hero */}
      <section className="max-w-2xl">
        <p className="text-sm font-medium uppercase tracking-wide text-accent">wellbeing hub</p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
          wellbeing &amp; parenting guides
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-ink/70">
          Calm, practical reads for dads — on fatherhood, looking after yourself and supporting your
          family. Written and reviewed by the tadpole wellbeing team.
        </p>
      </section>

      {/* safety: prominent, first-class — not fine print */}
      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <NotMedicalAdvice />
        <CrisisCallout />
      </div>

      {/* category chips */}
      {categories.length > 0 ? (
        <ul className="mt-10 flex flex-wrap gap-2">
          {categories.map((c) => (
            <li key={c.slug}>
              <span className="inline-flex items-center rounded-full border border-ink/10 bg-white/50 px-3 py-1.5 text-sm text-ink/70">
                {c.name}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {/* guides grid */}
      <section className="mt-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/50">All guides</h2>
        {guides.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-ink/10 bg-white/40 p-6 text-sm text-ink/60">
            We&apos;re still writing these. Check back soon for new guides.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {guides.map((guide) => (
              <GuideCard key={guide.id} guide={guide} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
