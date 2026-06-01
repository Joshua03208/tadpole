import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getGuide, getGuideParams, listGuides } from "@tadpole/core";
import { getAnonServerClient } from "@/lib/supabase/anon";
import { GuideCard } from "@/components/guide-card";
import { GuideCover } from "@/components/guide-cover";
import { JsonLd } from "@/components/json-ld";
import { NotMedicalAdvice } from "@/components/not-medical-advice";
import { CrisisCallout } from "@/components/crisis-callout";

export const revalidate = 3600;
export const dynamicParams = true;

const BASE = "https://tadpole.app";

// Memoised per request so generateMetadata + the page share one query.
const loadGuide = cache((slug: string) => getGuide(getAnonServerClient(), slug));

export async function generateStaticParams() {
  const supabase = getAnonServerClient();
  return getGuideParams(supabase);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = await loadGuide(slug);
  if (!guide) return {};

  const url = `${BASE}/guides/${guide.slug}`;
  return {
    title: guide.title,
    description: guide.summary,
    alternates: { canonical: `/guides/${guide.slug}` },
    openGraph: {
      title: `${guide.title} · tadpole`,
      description: guide.summary,
      url,
      siteName: "tadpole",
      type: "article",
      locale: "en_GB",
      ...(guide.coverUrl ? { images: [{ url: guide.coverUrl, alt: guide.title }] } : {}),
    },
  };
}

// Render the plain-text body as readable long-form prose: split on blank lines
// into paragraphs (never dangerouslySetInnerHTML — the body is untrusted text).
function paragraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export default async function GuideDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = getAnonServerClient();

  const guide = await loadGuide(slug);
  if (!guide) notFound();

  const url = `${BASE}/guides/${guide.slug}`;

  // "more guides" strip — fetch a few extra, drop the current, keep 3.
  const more = (await listGuides(supabase, { limit: 4 }))
    .filter((g) => g.id !== guide.id)
    .slice(0, 3);

  // Article-family JSON-LD (Article/HowTo both use headline). Author/publisher =
  // the tadpole Organization (never a fabricated Person), even though the byline
  // shows a verified contributor. FAQPage needs a different shape (mainEntity
  // Q&A), so we emit NO JSON-LD for it rather than malformed Article markup —
  // all current guides are Article, so this is defensive.
  const articleLd =
    guide.schemaType === "FAQPage"
      ? null
      : {
          "@context": "https://schema.org",
          "@type": guide.schemaType,
          headline: guide.title,
          description: guide.summary,
          dateModified: guide.updatedAt,
          author: { "@type": "Organization", name: "tadpole" },
          publisher: {
            "@type": "Organization",
            name: "tadpole",
            logo: { "@type": "ImageObject", url: `${BASE}/icon` },
          },
          mainEntityOfPage: url,
          ...(guide.publishedAt ? { datePublished: guide.publishedAt } : {}),
          ...(guide.coverUrl ? { image: guide.coverUrl } : {}),
        };

  const body = guide.body ? paragraphs(guide.body) : [];

  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-14">
      {articleLd ? <JsonLd data={articleLd} /> : null}

      <nav aria-label="Breadcrumb" className="text-sm text-ink/50">
        <Link href="/guides" className="transition hover:text-ink">
          guides
        </Link>
        <span aria-hidden="true" className="px-1.5 text-ink/30">
          /
        </span>
        <span className="text-ink/70">{guide.categoryName}</span>
      </nav>

      <header className="mt-5">
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-wide text-accent">
          <span>{guide.categoryName}</span>
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
          {guide.title}
        </h1>
        <p className="mt-3 text-lg leading-relaxed text-ink/70">{guide.summary}</p>

        {/* byline — denormalized, rendered directly (never a profiles join) */}
        {guide.authorName ? (
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="font-semibold text-ink">{guide.authorName}</span>
            {guide.authorTagline ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z" />
                  <path d="M9 11.5l2 2 4-4" />
                </svg>
                {guide.authorTagline}
              </span>
            ) : null}
          </div>
        ) : null}
      </header>

      {/* hero cover */}
      <div className="relative mt-6 aspect-[16/9] w-full overflow-hidden rounded-3xl border border-ink/10 bg-accent/10">
        <GuideCover
          coverUrl={guide.coverUrl}
          title={guide.title}
          categorySlug={guide.categorySlug}
          sizes="(min-width: 768px) 768px, 100vw"
          priority
        />
      </div>

      {/* safety: prominent, near the top, before the body */}
      <div className="mt-8 space-y-4">
        <NotMedicalAdvice />
        <CrisisCallout />
      </div>

      {/* body — readable long-form prose */}
      {body.length > 0 ? (
        <div className="mt-10 space-y-5 text-base leading-loose text-ink/80">
          {body.map((p, i) => (
            <p key={i} className="whitespace-pre-line">
              {p}
            </p>
          ))}
        </div>
      ) : (
        <p className="mt-10 text-base leading-relaxed text-ink/55">
          This guide is being written. Check back soon.
        </p>
      )}

      {/* more guides */}
      {more.length > 0 ? (
        <section className="mt-14 border-t border-ink/10 pt-10">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink/50">
              More guides
            </h2>
            <Link
              href="/guides"
              className="text-sm font-medium text-accent transition hover:text-accent/80"
            >
              See all
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {more.map((g) => (
              <GuideCard key={g.id} guide={g} />
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
