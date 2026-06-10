"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { listRecentConversations, type RecentConversation } from "@tadpole/core";
import { getBrowserClient } from "@/lib/supabase/client";

/**
 * Left desktop rail: the dad's matches with their latest message + unread
 * badge, newest activity first. One RPC round trip (recent_conversations).
 * Refetches on window focus so badges stay honest. Fails soft: on error the
 * rail renders nothing — it can never break the page.
 */
export function FriendsRail() {
  const client = useMemo(() => getBrowserClient(), []);
  const [convos, setConvos] = useState<RecentConversation[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    listRecentConversations(client, { limit: 6 })
      .then(setConvos)
      .catch(() => setFailed(true));
  }, [client]);

  useEffect(() => {
    load();
    window.addEventListener("focus", load);
    return () => window.removeEventListener("focus", load);
  }, [load]);

  if (failed) return null;

  return (
    <section className="rounded-2xl border border-ink/10 bg-white/50 p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold lowercase text-ink">friends</h2>
        <Link href="/matches" className="text-xs text-ink/50 transition hover:text-ink">
          see all
        </Link>
      </div>

      {convos === null ? (
        <div className="mt-3 space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-11 animate-pulse rounded-xl bg-ink/5" />
          ))}
        </div>
      ) : convos.length === 0 ? (
        <p className="mt-3 text-xs leading-relaxed text-ink/55">
          When you and another dad both say hi, he&apos;ll show up here.{" "}
          <Link href="/home" className="font-semibold text-accent hover:underline">
            Say hi on the deck →
          </Link>
        </p>
      ) : (
        <ul className="mt-2 -mx-2">
          {convos.map((c) => (
            <li key={c.matchId}>
              <Link
                href={`/messages/${c.matchId}`}
                className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-ink/5"
              >
                {c.avatarUrl ? (
                  <img src={c.avatarUrl} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-semibold text-accent">
                    {c.displayName[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{c.displayName}</p>
                  <p className="truncate text-xs text-ink/50">
                    {c.lastBody
                      ? `${c.lastSenderId === c.otherId ? "" : "you: "}${c.lastBody}`
                      : "say hello 👋"}
                  </p>
                </div>
                {c.unread > 0 ? (
                  <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-bg">
                    {c.unread > 9 ? "9+" : c.unread}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
