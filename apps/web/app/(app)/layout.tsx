import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { GetHelpButton } from "@/components/crisis";

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
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-ink/10 bg-bg/90 px-4 py-3 backdrop-blur">
        <Link href="/home" className="text-lg font-semibold lowercase tracking-tight text-ink">
          tadpole<span className="text-accent">.</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/home" className="rounded-full px-3 py-1.5 text-ink/70 transition hover:bg-ink/5 hover:text-ink">
            deck
          </Link>
          <Link href="/activities" className="rounded-full px-3 py-1.5 text-ink/70 transition hover:bg-ink/5 hover:text-ink">
            explore
          </Link>
          <Link href="/matches" className="rounded-full px-3 py-1.5 text-ink/70 transition hover:bg-ink/5 hover:text-ink">
            matches
          </Link>
          <Link href="/profile" className="rounded-full px-3 py-1.5 text-ink/70 transition hover:bg-ink/5 hover:text-ink">
            profile
          </Link>
        </nav>
        <GetHelpButton />
      </header>
      {children}
    </div>
  );
}
