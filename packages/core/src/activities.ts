import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@tadpole/types";

type Client = SupabaseClient<Database>;

const BUCKET = "activity-photos";

// Friendly cost labels, shared by web + mobile so they never diverge.
export const COST_TIER_LABELS: Record<string, string> = {
  free: "Free",
  low: "Low cost",
  mid: "Mid-range",
  high: "Premium",
};

export type CategoryItem = {
  slug: string;
  name: string;
  description: string | null;
  schemaType: string;
  sortOrder: number;
};

export type AreaSummary = {
  slug: string;
  name: string;
  region: string | null;
  activityCount: number; // published activities in this area
};

export type ActivityCard = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  costTier: string;
  coverUrl: string | null;
  areaSlug: string;
  areaName: string;
  categorySlug: string;
  categoryName: string;
};

export type ActivityDetail = ActivityCard & {
  description: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  websiteUrl: string | null;
  bookingUrl: string | null;
  schemaType: string; // schema.org @type, from the category
  region: string | null;
  publishedAt: string | null;
  updatedAt: string;
};

// Columns we read for cards/detail. RLS already restricts anon/authenticated to
// status='published'; the explicit filter keeps intent clear and correct for
// any signed-in reader too.
const ACTIVITY_COLS =
  "id, slug, title, summary, description, address, lat, lng, cost_tier, website_url, booking_url, cover_path, area_id, category_id, published_at, updated_at";

type ActivityRow = Pick<
  Database["public"]["Tables"]["activities"]["Row"],
  | "id"
  | "slug"
  | "title"
  | "summary"
  | "description"
  | "address"
  | "lat"
  | "lng"
  | "cost_tier"
  | "website_url"
  | "booking_url"
  | "cover_path"
  | "area_id"
  | "category_id"
  | "published_at"
  | "updated_at"
>;
type AreaRow = Pick<Database["public"]["Tables"]["areas"]["Row"], "id" | "slug" | "name" | "region">;
type CategoryRow = Pick<
  Database["public"]["Tables"]["categories"]["Row"],
  "id" | "slug" | "name" | "schema_type"
>;

function coverUrl(client: Client, path: string | null): string | null {
  if (!path) return null;
  return client.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

function toCard(client: Client, a: ActivityRow, area: AreaRow, cat: CategoryRow): ActivityCard {
  return {
    id: a.id,
    slug: a.slug,
    title: a.title,
    summary: a.summary,
    costTier: a.cost_tier,
    coverUrl: coverUrl(client, a.cover_path),
    areaSlug: area.slug,
    areaName: area.name,
    categorySlug: cat.slug,
    categoryName: cat.name,
  };
}

// ---- categories ------------------------------------------------------------
export async function listCategories(client: Client): Promise<CategoryItem[]> {
  const { data, error } = await client
    .from("categories")
    .select("slug, name, description, schema_type, sort_order")
    .order("sort_order");
  if (error) throw error;
  return (data ?? []).map((c) => ({
    slug: c.slug,
    name: c.name,
    description: c.description,
    schemaType: c.schema_type,
    sortOrder: c.sort_order,
  }));
}

// ---- areas (only those with published activities) --------------------------
// Named distinctly from account.listAreas (the onboarding picker over raw areas).
export async function listActivityAreas(client: Client): Promise<AreaSummary[]> {
  const { data: acts, error } = await client
    .from("activities")
    .select("area_id")
    .eq("status", "published");
  if (error) throw error;
  if (!acts || acts.length === 0) return [];

  const counts = new Map<string, number>();
  for (const a of acts) counts.set(a.area_id, (counts.get(a.area_id) ?? 0) + 1);

  const { data: areas } = await client
    .from("areas")
    .select("id, slug, name, region")
    .in("id", [...counts.keys()]);

  return (areas ?? [])
    .map((a) => ({
      slug: a.slug,
      name: a.name,
      region: a.region,
      activityCount: counts.get(a.id) ?? 0,
    }))
    .sort((x, y) => x.name.localeCompare(y.name));
}

// ---- activity lists --------------------------------------------------------
export async function listActivities(
  client: Client,
  opts?: { areaSlug?: string | null; limit?: number },
): Promise<ActivityCard[]> {
  let areaId: string | undefined;
  if (opts?.areaSlug) {
    const { data: area } = await client
      .from("areas")
      .select("id")
      .eq("slug", opts.areaSlug)
      .maybeSingle();
    if (!area) return [];
    areaId = area.id;
  }

  let q = client.from("activities").select(ACTIVITY_COLS).eq("status", "published");
  if (areaId) q = q.eq("area_id", areaId);
  if (opts?.limit) q = q.limit(opts.limit);

  const { data: acts, error } = await q.order("title");
  if (error) throw error;
  if (!acts || acts.length === 0) return [];

  const { areaById, catById } = await loadRefs(client, acts);
  return acts
    .map((a) => {
      const area = areaById.get(a.area_id);
      const cat = catById.get(a.category_id);
      return area && cat ? toCard(client, a, area, cat) : null;
    })
    .filter((c): c is ActivityCard => c !== null);
}

// ---- single activity by area + slug (per-area unique) ----------------------
export async function getActivity(
  client: Client,
  areaSlug: string,
  slug: string,
): Promise<ActivityDetail | null> {
  const { data: area } = await client
    .from("areas")
    .select("id, slug, name, region")
    .eq("slug", areaSlug)
    .maybeSingle();
  if (!area) return null;

  const { data: a, error } = await client
    .from("activities")
    .select(ACTIVITY_COLS)
    .eq("area_id", area.id)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  if (!a) return null;

  const { data: cat } = await client
    .from("categories")
    .select("id, slug, name, schema_type")
    .eq("id", a.category_id)
    .maybeSingle();
  if (!cat) return null;

  return {
    ...toCard(client, a, area, cat),
    description: a.description,
    address: a.address,
    lat: a.lat,
    lng: a.lng,
    websiteUrl: a.website_url,
    bookingUrl: a.booking_url,
    schemaType: cat.schema_type,
    region: area.region,
    publishedAt: a.published_at,
    updatedAt: a.updated_at,
  };
}

// ---- params for ISR generateStaticParams + sitemap -------------------------
export async function getAreaParams(client: Client): Promise<{ area: string }[]> {
  const areas = await listActivityAreas(client);
  return areas.map((a) => ({ area: a.slug }));
}

export async function getActivityParams(
  client: Client,
): Promise<{ area: string; slug: string }[]> {
  const acts = await listActivities(client);
  return acts.map((a) => ({ area: a.areaSlug, slug: a.slug }));
}

// ---- internal --------------------------------------------------------------
async function loadRefs(
  client: Client,
  acts: ActivityRow[],
): Promise<{ areaById: Map<string, AreaRow>; catById: Map<string, CategoryRow> }> {
  const areaIds = [...new Set(acts.map((a) => a.area_id))];
  const catIds = [...new Set(acts.map((a) => a.category_id))];
  const [{ data: areas }, { data: cats }] = await Promise.all([
    client.from("areas").select("id, slug, name, region").in("id", areaIds),
    client.from("categories").select("id, slug, name, schema_type").in("id", catIds),
  ]);
  return {
    areaById: new Map((areas ?? []).map((a) => [a.id, a])),
    catById: new Map((cats ?? []).map((c) => [c.id, c])),
  };
}
