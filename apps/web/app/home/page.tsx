import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DeleteAccount } from "@/components/delete-account";

const STAGE_LABELS: Record<string, string> = {
  expecting: "Expecting",
  newborn: "Newborn (0–3m)",
  infant: "Infant (3–12m)",
  toddler: "Toddler (1–3y)",
  child: "Child (4y+)",
  multiple: "Multiple kids",
};

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, bio, avatar_url, parenting_stage, created_at, area_label")
    .eq("id", user.id)
    .maybeSingle();

  const { count: locationCount } = await supabase
    .from("profile_locations")
    .select("id", { count: "exact", head: true })
    .eq("id", user.id);

  return (
    <main className="mx-auto max-w-md px-6 py-10">
      <div className="flex items-center gap-4">
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="h-20 w-20 rounded-full object-cover" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-ink/5 text-ink/40">
            {profile?.display_name?.[0]?.toUpperCase() ?? "?"}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-semibold text-ink">{profile?.display_name}</h1>
          {profile?.area_label ? (
            <p className="text-sm text-ink/60">{profile.area_label}</p>
          ) : null}
        </div>
      </div>

      <dl className="mt-8 space-y-4 text-sm">
        {profile?.parenting_stage ? (
          <div>
            <dt className="text-ink/50">Stage</dt>
            <dd className="text-ink">{STAGE_LABELS[profile.parenting_stage] ?? profile.parenting_stage}</dd>
          </div>
        ) : null}
        {profile?.bio ? (
          <div>
            <dt className="text-ink/50">About</dt>
            <dd className="text-ink">{profile.bio}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-ink/50">Precise location sharing</dt>
          <dd className="text-ink">{locationCount ? "On" : "Off"}</dd>
        </div>
      </dl>

      <p className="mt-8 rounded-lg border border-ink/10 bg-white/40 px-4 py-3 text-xs text-ink/60">
        Your profile is set up. The swipe deck and connecting with other dads arrives in the next phase.
      </p>

      <div className="mt-10 border-t border-ink/10 pt-6">
        <DeleteAccount />
      </div>
    </main>
  );
}
