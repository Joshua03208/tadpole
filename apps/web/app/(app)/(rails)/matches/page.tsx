"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { blockUser, listMatches, unmatchUser, unreadCounts, type MatchListItem } from "@tadpole/core";
import { getBrowserClient } from "@/lib/supabase/client";
import { ReportDialog } from "@/components/report-dialog";

const STAGE_LABELS: Record<string, string> = {
  expecting: "Expecting",
  newborn: "Newborn",
  infant: "Infant",
  toddler: "Toddler",
  child: "Child 4y+",
  multiple: "Multiple kids",
};

export default function MatchesPage() {
  const client = useMemo(() => getBrowserClient(), []);
  const [items, setItems] = useState<MatchListItem[] | null>(null);
  const [unread, setUnread] = useState<Map<string, number>>(new Map());
  const [error, setError] = useState<string | undefined>();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [reporting, setReporting] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    let active = true;
    listMatches(client)
      .then((d) => active && setItems(d))
      .catch(() => active && setError("Couldn't load your matches."));
    // Unread counts are best-effort: a failure here must not blank the list.
    unreadCounts(client)
      .then((u) => active && setUnread(u))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [client]);

  async function act(otherId: string, fn: () => Promise<void>) {
    setPendingId(otherId);
    setError(undefined);
    try {
      await fn();
      setItems((prev) => (prev ? prev.filter((m) => m.otherId !== otherId) : prev));
    } catch {
      setError("Couldn't complete that. Please try again.");
    } finally {
      setPendingId(null);
    }
  }

  if (items === null && !error) {
    return (
      <main className="mx-auto max-w-md px-6 py-8">
        <ul className="space-y-3">
          {[0, 1, 2].map((i) => (
            <li key={i} className="h-[88px] animate-pulse rounded-2xl bg-ink/5" />
          ))}
        </ul>
      </main>
    );
  }

  if (error && !items) {
    return <main className="mx-auto max-w-md px-6 py-16 text-center text-ink/70">{error}</main>;
  }

  if (items && items.length === 0) {
    return (
      <main className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="text-xl font-semibold text-ink">no matches yet</h1>
        <p className="mt-2 text-sm text-ink/60">
          When you and another dad both say hi, they&apos;ll show up here.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-6 py-8">
      <h1 className="mb-4 text-2xl font-semibold text-ink">matches</h1>
      {error ? <p className="mb-3 text-sm text-error">{error}</p> : null}
      <ul className="space-y-3">
        {(items ?? []).map((m) => {
          const name = m.other?.displayName ?? "member unavailable";
          const sub = m.other
            ? [m.other.areaLabel, m.other.parentingStage ? STAGE_LABELS[m.other.parentingStage] : null]
                .filter(Boolean)
                .join(" · ")
            : "this dad is no longer available";
          const disabled = pendingId === m.otherId;
          const unreadCount = unread.get(m.matchId) ?? 0;
          return (
            <li key={m.matchId} className="rounded-2xl border border-ink/10 bg-white/50 p-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  {m.other?.avatarUrl ? (
                    <img src={m.other.avatarUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/15 font-semibold text-accent">
                      {name[0]?.toUpperCase() ?? "?"}
                    </div>
                  )}
                  {unreadCount > 0 ? (
                    <span
                      aria-hidden="true"
                      className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-bg ring-2 ring-bg"
                    >
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  ) : null}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">{name}</p>
                  {sub ? <p className="truncate text-xs text-ink/55">{sub}</p> : null}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold">
                {m.other ? (
                  <Link
                    href={`/messages/${m.matchId}`}
                    className="rounded-full bg-accent px-3 py-1.5 text-bg transition active:scale-[0.98] hover:bg-accent/90"
                  >
                    {unreadCount > 0
                      ? `message · ${unreadCount > 9 ? "9+" : unreadCount} new`
                      : "message"}
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled
                    title="This dad is no longer available"
                    className="cursor-not-allowed rounded-full bg-ink/10 px-3 py-1.5 text-ink/40"
                  >
                    message
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => act(m.otherId, () => unmatchUser(client, m.otherId))}
                  disabled={disabled}
                  className="rounded-full border border-ink/15 px-3 py-1.5 text-ink/70 transition active:scale-[0.98] hover:text-ink disabled:opacity-50"
                >
                  unmatch
                </button>
                <button
                  type="button"
                  onClick={() => act(m.otherId, () => blockUser(client, m.otherId))}
                  disabled={disabled}
                  className="rounded-full border border-ink/15 px-3 py-1.5 text-ink/70 transition active:scale-[0.98] hover:text-ink disabled:opacity-50"
                >
                  block
                </button>
                {m.other ? (
                  <button
                    type="button"
                    onClick={() => setReporting({ id: m.otherId, name })}
                    disabled={disabled}
                    className="rounded-full px-3 py-1.5 text-error/80 transition hover:text-error disabled:opacity-50"
                  >
                    report
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      {reporting ? (
        <ReportDialog
          reportedId={reporting.id}
          reportedName={reporting.name}
          onClose={() => setReporting(null)}
          onDone={() => {
            setItems((prev) => (prev ? prev.filter((m) => m.otherId !== reporting.id) : prev));
            setReporting(null);
          }}
        />
      ) : null}
    </main>
  );
}
