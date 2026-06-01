"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getDeck, recordSwipe, type DeckCard } from "@tadpole/core";
import { getBrowserClient } from "@/lib/supabase/client";
import { MatchModal } from "@/components/match-modal";
import { ReportDialog } from "@/components/report-dialog";

const STAGE_LABELS: Record<string, string> = {
  expecting: "Expecting",
  newborn: "Newborn",
  infant: "Infant",
  toddler: "Toddler",
  child: "Child 4y+",
  multiple: "Multiple kids",
};

export function Deck() {
  const client = useMemo(() => getBrowserClient(), []);
  const [cards, setCards] = useState<DeckCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [exitDir, setExitDir] = useState<"left" | "right" | null>(null);
  const [match, setMatch] = useState<{ name: string; avatarUrl: string | null } | null>(null);
  const [reporting, setReporting] = useState<DeckCard | null>(null);

  const top = cards[0];

  const refill = useCallback(async () => {
    try {
      const fresh = await getDeck(client, { limit: 20 });
      setCards((prev) => {
        const seen = new Set(prev.map((c) => c.id));
        return [...prev, ...fresh.filter((c) => !seen.has(c.id))];
      });
    } catch {
      /* keep existing cards; non-fatal */
    }
  }, [client]);

  useEffect(() => {
    let active = true;
    getDeck(client, { limit: 20 })
      .then((d) => {
        if (active) setCards(d);
      })
      .catch(() => active && setError("Couldn't load the deck. Please refresh."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [client]);

  const swipe = useCallback(
    async (dir: "like" | "pass") => {
      if (!top || busy) return;
      const card = top;
      setBusy(true);
      setError(undefined);
      setExitDir(dir === "like" ? "right" : "left");
      try {
        const res = await recordSwipe(client, card.id, dir);
        await new Promise((r) => setTimeout(r, 180)); // let the exit animation play
        setCards((prev) => prev.filter((c) => c.id !== card.id));
        setExitDir(null);
        if (res.matched) setMatch({ name: card.display_name, avatarUrl: card.avatar_url });
        setCards((prev) => {
          if (prev.length <= 2) void refill();
          return prev;
        });
      } catch (e) {
        setExitDir(null);
        const msg = e instanceof Error ? e.message : "";
        setError(
          /limit reached/i.test(msg)
            ? "You've reached today's swipe limit — come back tomorrow."
            : "Couldn't record that swipe. Please try again.",
        );
      } finally {
        setBusy(false);
      }
    },
    [top, busy, client, refill],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (reporting || match) return;
      if (e.key === "ArrowRight") void swipe("like");
      else if (e.key === "ArrowLeft") void swipe("pass");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [swipe, reporting, match]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-sm px-6 py-10">
        <div className="aspect-[3/4] w-full animate-pulse rounded-3xl bg-ink/5" />
        <div className="mt-6 flex justify-center gap-6">
          <div className="h-14 w-14 animate-pulse rounded-full bg-ink/5" />
          <div className="h-14 w-14 animate-pulse rounded-full bg-ink/5" />
        </div>
      </div>
    );
  }

  if (error && cards.length === 0) {
    return (
      <div className="mx-auto max-w-sm px-6 py-16 text-center">
        <p className="text-ink/70">{error}</p>
        <button
          type="button"
          onClick={() => {
            setError(undefined);
            setLoading(true);
            void getDeck(client, { limit: 20 })
              .then(setCards)
              .catch(() => setError("Still can't load. Try later."))
              .finally(() => setLoading(false));
          }}
          className="mt-4 rounded-lg border border-ink/15 px-4 py-2 text-sm font-semibold text-ink transition active:scale-[0.98] hover:bg-ink/5"
        >
          try again
        </button>
      </div>
    );
  }

  if (!top) {
    return (
      <div className="mx-auto max-w-sm px-6 py-16 text-center">
        <h2 className="text-xl font-semibold text-ink">that&apos;s everyone for now</h2>
        <p className="mt-2 text-sm text-ink/60">
          New dads join all the time. Check back soon, or widen your area in your profile.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-sm px-6 py-8">
      <div className="relative">
        {/* peek of the next card for depth */}
        {cards[1] ? (
          <div className="absolute inset-x-3 top-3 -z-10 aspect-[3/4] rounded-3xl bg-white/40 ring-1 ring-ink/5" />
        ) : null}

        <article
          className={`overflow-hidden rounded-3xl bg-white/70 ring-1 ring-ink/10 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.25)] transition-all duration-200 ease-out ${
            exitDir === "right"
              ? "translate-x-[120%] rotate-6 opacity-0"
              : exitDir === "left"
                ? "-translate-x-[120%] -rotate-6 opacity-0"
                : "translate-x-0 rotate-0 opacity-100"
          }`}
        >
          <div className="relative aspect-[3/4] w-full bg-ink/5">
            {top.avatar_url ? (
              <img src={top.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-6xl font-semibold text-ink/20">
                {top.display_name[0]?.toUpperCase() ?? "?"}
              </div>
            )}
            <button
              type="button"
              onClick={() => setReporting(top)}
              aria-label={`Report or block ${top.display_name}`}
              className="absolute right-3 top-3 rounded-full bg-bg/80 p-2 text-ink/60 backdrop-blur transition hover:text-error"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M4 21V4h11l-1 4h6l-1 4H6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-4 pt-10">
              <h2 className="text-2xl font-semibold text-white">{top.display_name}</h2>
              <p className="text-sm text-white/85">
                {[top.area_label, top.parenting_stage ? STAGE_LABELS[top.parenting_stage] : null]
                  .filter(Boolean)
                  .join(" · ") || "tadpole dad"}
              </p>
            </div>
          </div>
          {top.bio ? <p className="px-5 py-4 text-sm leading-relaxed text-ink/80">{top.bio}</p> : null}
        </article>
      </div>

      {error ? <p className="mt-3 text-center text-sm text-error">{error}</p> : null}

      <div className="mt-6 flex items-center justify-center gap-6">
        <button
          type="button"
          onClick={() => swipe("pass")}
          disabled={busy}
          aria-label="Pass (left arrow)"
          className="flex h-16 w-16 items-center justify-center rounded-full border border-ink/15 bg-bg text-ink/60 transition active:scale-95 hover:border-ink/30 hover:text-ink disabled:opacity-50"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => swipe("like")}
          disabled={busy}
          aria-label="Like (right arrow)"
          className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-bg transition active:scale-95 hover:bg-accent/90 disabled:opacity-50"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 21s-7.5-4.6-10-9.3C.4 8.3 2 5 5.2 5c2 0 3.3 1.2 4 2.3C9.8 6.2 11.2 5 13.2 5 16.4 5 18 8.3 16.4 11.7 14 16.4 12 21 12 21z" />
          </svg>
        </button>
      </div>
      <p className="mt-3 text-center text-xs text-ink/40">use ← pass · like → · platonic, never dating</p>

      {match ? (
        <MatchModal name={match.name} avatarUrl={match.avatarUrl} onClose={() => setMatch(null)} />
      ) : null}
      {reporting ? (
        <ReportDialog
          reportedId={reporting.id}
          reportedName={reporting.display_name}
          onClose={() => setReporting(null)}
          onDone={() => {
            setCards((prev) => prev.filter((c) => c.id !== reporting.id));
            setReporting(null);
          }}
        />
      ) : null}
    </div>
  );
}
