import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded_at, deleted_at")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.deleted_at) redirect("/");
  if (!profile?.onboarded_at) redirect("/onboarding");

  return (
    <div className="min-h-[100dvh]">
      <SiteHeader
        brandHref="/home"
        links={[
          { href: "/home", label: "deck" },
          { href: "/activities", label: "explore" },
          { href: "/matches", label: "matches" },
          { href: "/profile", label: "profile" },
        ]}
      />
      {children}
    </div>
  );
}
