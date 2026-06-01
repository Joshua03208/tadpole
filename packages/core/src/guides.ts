import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@tadpole/types";

type Client = SupabaseClient<Database>;

const BUCKET = "guide-images";

export type GuideCategoryItem = {
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
};

export type GuideCard = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  coverUrl: string | null;
  categorySlug: string;
  categoryName: string;
  authorName: string | null; // public-safe denormalized byline (no profiles join)
  authorTagline: string | null;
};

export type GuideDetail = GuideCard & {
  body: string | null;
  schemaType: string; // schema.org @type — Article / HowTo / FAQPage
  publishedAt: string | null;
  updatedAt: string;
};

// RLS already restricts anon/authenticated to status='published'; the helpers
// also filter explicitly for clarity. The byline (author_name/author_tagline)
// is denormalized onto the guide, so reading it never touches the private
// profiles table.
const GUIDE_COLS =
  "id, slug, title, summary, body, cover_path, schema_type, status, published_at, updated_at, category_id, author_name, author_tagline";

type GuideRow = Pick<
  Database["public"]["Tables"]["guides"]["Row"],
  | "id"
  | "slug"
  | "title"
  | "summary"
  | "body"
  | "cover_path"
  | "schema_type"
  | "status"
  | "published_at"
  | "updated_at"
  | "category_id"
  | "author_name"
  | "author_tagline"
>;
type GuideCategoryRow = Pick<
  Database["public"]["Tables"]["guide_categories"]["Row"],
  "id" | "slug" | "name" | "description" | "sort_order"
>;

function coverUrl(client: Client, path: string | null): string | null {
  if (!path) return null;
  return client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

function toCard(client: Client, g: GuideRow, cat: GuideCategoryRow): GuideCard {
  return {
    id: g.id,
    slug: g.slug,
    title: g.title,
    summary: g.summary,
    coverUrl: coverUrl(client, g.cover_path),
    categorySlug: cat.slug,
    categoryName: cat.name,
    authorName: g.author_name,
    authorTagline: g.author_tagline,
  };
}

// ---- categories ------------------------------------------------------------
export async function listGuideCategories(client: Client): Promise<GuideCategoryItem[]> {
  const { data, error } = await client
    .from("guide_categories")
    .select("slug, name, description, sort_order")
    .order("sort_order");
  if (error) throw error;
  return (data ?? []).map((c) => ({
    slug: c.slug,
    name: c.name,
    description: c.description,
    sortOrder: c.sort_order,
  }));
}

// ---- guide lists -----------------------------------------------------------
export async function listGuides(
  client: Client,
  opts?: { categorySlug?: string | null; limit?: number },
): Promise<GuideCard[]> {
  let categoryId: string | undefined;
  if (opts?.categorySlug) {
    const { data: cat } = await client
      .from("guide_categories")
      .select("id")
      .eq("slug", opts.categorySlug)
      .maybeSingle();
    if (!cat) return [];
    categoryId = cat.id;
  }

  let q = client.from("guides").select(GUIDE_COLS).eq("status", "published");
  if (categoryId) q = q.eq("category_id", categoryId);
  if (opts?.limit) q = q.limit(opts.limit);

  const { data: guides, error } = await q
    .order("published_at", { ascending: false })
    .order("title");
  if (error) throw error;
  if (!guides || guides.length === 0) return [];

  const catById = await loadCategories(client, guides);
  return guides
    .map((g) => {
      const cat = catById.get(g.category_id);
      return cat ? toCard(client, g, cat) : null;
    })
    .filter((c): c is GuideCard => c !== null);
}

// ---- single guide by (global) slug -----------------------------------------
export async function getGuide(client: Client, slug: string): Promise<GuideDetail | null> {
  const { data: g, error } = await client
    .from("guides")
    .select(GUIDE_COLS)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  if (!g) return null;

  const { data: cat } = await client
    .from("guide_categories")
    .select("id, slug, name, description, sort_order")
    .eq("id", g.category_id)
    .maybeSingle();
  if (!cat) return null;

  return {
    ...toCard(client, g, cat),
    body: g.body,
    schemaType: g.schema_type,
    publishedAt: g.published_at,
    updatedAt: g.updated_at,
  };
}

// ---- params for ISR generateStaticParams + sitemap -------------------------
export async function getGuideParams(client: Client): Promise<{ slug: string }[]> {
  const guides = await listGuides(client);
  return guides.map((g) => ({ slug: g.slug }));
}

// ---- internal --------------------------------------------------------------
async function loadCategories(
  client: Client,
  guides: GuideRow[],
): Promise<Map<string, GuideCategoryRow>> {
  const catIds = [...new Set(guides.map((g) => g.category_id))];
  const { data: cats } = await client
    .from("guide_categories")
    .select("id, slug, name, description, sort_order")
    .in("id", catIds);
  return new Map((cats ?? []).map((c) => [c.id, c]));
}
