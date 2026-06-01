import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function HomeLayout({ children }: { children: ReactNode }) {
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
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-ink/10 px-6 py-4">
        <span className="text-lg font-semibold lowercase tracking-tight text-ink">
          tadpole<span className="text-accent">.</span>
        </span>
        <form action="/auth/signout" method="post">
          <button type="submit" className="text-sm text-ink/60 hover:text-ink">
            sign out
          </button>
        </form>
      </header>
      {children}
    </div>
  );
}
