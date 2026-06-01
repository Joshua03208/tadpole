"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  listMatches,
  listMessages,
  markRead,
  sendMessage,
  subscribeToMessages,
  unmatchUser,
  type MatchListItem,
  type MessageItem,
} from "@tadpole/core";
import { MESSAGE_MAX, messageSchema } from "@tadpole/validation";
import { getBrowserClient } from "@/lib/supabase/client";
import { MeetupSafetyNote } from "@/components/meetup-safety-note";
import { ReportMessageDialog } from "@/components/report-message-dialog";

type Header = NonNullable<MatchListItem["other"]>;

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// Day separator label: "Today", "Yesterday", or a short date.
function fmtDay(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "long", day: "numeric", month: "short" });
}

export default function ConversationPage() {
  const params = useParams<{ matchId: string }>();
  const matchId = params.matchId;
  const router = useRouter();
  const client = useMemo(() => getBrowserClient(), []);

  const [meId, setMeId] = useState<string | null>(null);
  const [header, setHeader] = useState<Header | null>(null);
  const [ended, setEnded] = useState(false); // match not in listMatches -> conversation ended
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | undefined>();

  const [unmatching, setUnmatching] = useState(false);
  const [reportingId, setReportingId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const focusedRef = useRef(true);
  const meIdRef = useRef<string | null>(null); // stable read for the realtime closure
  const atBottomRef = useRef(true); // only autoscroll when already at the bottom
  const didInitialScrollRef = useRef(false);

  // Track window focus so we only auto-mark-read when the screen is visible.
  useEffect(() => {
    const onFocus = () => (focusedRef.current = true);
    const onBlur = () => (focusedRef.current = false);
    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  // Mount: who am I, resolve header, load history, mark read, subscribe.
  useEffect(() => {
    let active = true;

    async function init() {
      try {
        const [{ data: auth }, matches, history] = await Promise.all([
          client.auth.getUser(),
          listMatches(client),
          listMessages(client, matchId),
        ]);
        if (!active) return;

        setMeId(auth.user?.id ?? null);
        meIdRef.current = auth.user?.id ?? null;

        const entry = matches.find((m) => m.matchId === matchId);
        if (!entry || !entry.other) {
          setEnded(true);
          setLoading(false);
          return;
        }
        setHeader(entry.other);
        // Merge, don't overwrite: a realtime INSERT may land before history resolves.
        setMessages((prev) => {
          const seen = new Set(history.map((h) => h.id));
          const extras = prev.filter((m) => !seen.has(m.id));
          return [...history, ...extras];
        });
        setLoading(false);
        void markRead(client, matchId);
      } catch {
        if (active) {
          setLoadError(true);
          setLoading(false);
        }
      }
    }

    void init();

    const unsubscribe = subscribeToMessages(client, matchId, (m) => {
      setMessages((prev) => {
        if (prev.some((x) => x.id === m.id)) return prev; // dedupe echo / optimistic
        return [...prev, m];
      });
      // A new message FROM THEM arrived while we're here — clear its unread.
      if (focusedRef.current && m.senderId !== meIdRef.current) void markRead(client, matchId);
    });

    return () => {
      active = false;
      unsubscribe();
    };
    // History + realtime are both gated server-side by the messages SELECT RLS,
    // so a non-participant simply gets no rows / no stream.
  }, [client, matchId]);

  // Autoscroll to newest as the list grows — instant on first paint, smooth
  // after, and never yank a user who has scrolled up to read history.
  useEffect(() => {
    if (messages.length === 0) return;
    if (didInitialScrollRef.current && !atBottomRef.current) return;
    scrollToBottom(didInitialScrollRef.current ? "smooth" : "auto");
    didInitialScrollRef.current = true;
  }, [messages.length, scrollToBottom]);

  const send = useCallback(async () => {
    if (sending) return;
    const parsed = messageSchema.safeParse(draft);
    if (!parsed.success) {
      setSendError(parsed.error.issues[0]?.message ?? "Type a message.");
      return;
    }
    const body = parsed.data;
    setSending(true);
    setSendError(undefined);
    try {
      const sent = await sendMessage(client, matchId, body);
      setDraft("");
      setMessages((prev) => (prev.some((x) => x.id === sent.id) ? prev : [...prev, sent]));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (/rate|too quickly|limit/i.test(msg)) {
        setSendError("You're sending messages too quickly — give it a moment.");
      } else if (/2000|length|check|body/i.test(msg)) {
        setSendError(`Keep messages under ${MESSAGE_MAX} characters.`);
      } else {
        setSendError("Couldn't send that. Please try again.");
      }
    } finally {
      setSending(false);
    }
  }, [client, matchId, draft, sending]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        void send();
      }
    },
    [send],
  );

  async function doUnmatch() {
    if (unmatching || !header) return;
    setUnmatching(true);
    try {
      await unmatchUser(client, header.id);
      router.replace("/matches"); // match is gone — don't leave a dead thread in history
    } catch {
      setUnmatching(false);
      setSendError("Couldn't unmatch right now. Please try again.");
    }
  }

  const initial = header?.displayName?.[0]?.toUpperCase() ?? "?";

  // ---- ended state (unmatched / blocked / reported) ------------------------
  if (ended) {
    return (
      <main className="mx-auto flex min-h-[70dvh] max-w-md flex-col items-center justify-center px-6 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ink/5 text-ink/40">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="mt-4 text-xl font-semibold text-ink">this conversation has ended</h1>
        <p className="mt-2 text-sm text-ink/60">
          You&apos;re no longer matched with this dad, so the chat is closed.
        </p>
        <Link
          href="/matches"
          className="mt-6 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-bg transition active:scale-[0.98] hover:bg-accent/90"
        >
          back to matches
        </Link>
      </main>
    );
  }

  // ---- load error ----------------------------------------------------------
  if (loadError) {
    return (
      <main className="mx-auto max-w-md px-6 py-16 text-center">
        <p className="text-ink/70">Couldn&apos;t open this conversation.</p>
        <Link
          href="/matches"
          className="mt-4 inline-block rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold text-ink transition active:scale-[0.98] hover:bg-ink/5"
        >
          back to matches
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex h-[calc(100dvh-57px)] max-w-md flex-col">
      {/* header */}
      <div className="flex items-center gap-3 border-b border-ink/10 bg-bg/90 px-4 py-2.5 backdrop-blur">
        <Link
          href="/matches"
          aria-label="Back to matches"
          className="-ml-1 rounded-full p-1.5 text-ink/60 transition active:scale-95 hover:bg-ink/5 hover:text-ink"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        {loading ? (
          <>
            <div className="h-9 w-9 animate-pulse rounded-full bg-ink/5" />
            <div className="h-4 w-28 animate-pulse rounded bg-ink/5" />
          </>
        ) : (
          <>
            {header?.avatarUrl ? (
              <img src={header.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/15 text-sm font-semibold text-accent">
                {initial}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{header?.displayName}</p>
              {header?.areaLabel ? (
                <p className="truncate text-xs text-ink/50">{header.areaLabel}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={doUnmatch}
              disabled={unmatching}
              className="rounded-full border border-ink/15 px-3 py-1.5 text-xs font-semibold text-ink/70 transition active:scale-[0.98] hover:text-ink disabled:opacity-50"
            >
              {unmatching ? "unmatching…" : "unmatch"}
            </button>
          </>
        )}
      </div>

      {/* thread */}
      <div
        ref={scrollRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="flex-1 overflow-y-auto px-4 py-4"
      >
        <div className="mb-4">
          <MeetupSafetyNote />
        </div>

        {loading ? (
          <div className="space-y-3">
            <div className="h-10 w-2/3 animate-pulse rounded-2xl bg-ink/5" />
            <div className="ml-auto h-10 w-1/2 animate-pulse rounded-2xl bg-ink/5" />
            <div className="h-10 w-3/5 animate-pulse rounded-2xl bg-ink/5" />
          </div>
        ) : messages.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm font-semibold text-ink">say hi</p>
            <p className="mt-1 text-xs text-ink/55">
              You both wanted to connect — break the ice with {header?.displayName}.
            </p>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {messages.map((m, i) => {
              const mine = m.senderId === meId;
              const prev = messages[i - 1];
              const showDay = !prev || fmtDay(prev.createdAt) !== fmtDay(m.createdAt);
              return (
                <li key={m.id}>
                  {showDay ? (
                    <div className="my-3 flex items-center justify-center">
                      <span className="rounded-full bg-ink/5 px-2.5 py-0.5 text-[11px] font-medium text-ink/50">
                        {fmtDay(m.createdAt)}
                      </span>
                    </div>
                  ) : null}
                  <div className={`group flex items-end gap-1.5 ${mine ? "justify-end" : "justify-start"}`}>
                    {/* report affordance for THEIR messages only */}
                    {!mine ? (
                      <button
                        type="button"
                        onClick={() => setReportingId(m.id)}
                        aria-label="Report this message"
                        className="mb-1 shrink-0 rounded-full p-1 text-ink/30 transition hover:text-error/70 group-hover:text-ink/40 focus:text-error/80 focus:outline-none"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M4 21V4h11l-1 4h6l-1 4H6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    ) : null}
                    <div
                      className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                        mine
                          ? "rounded-br-md bg-accent/15 text-ink"
                          : "rounded-bl-md border border-ink/10 bg-white/70 text-ink"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      <time
                        dateTime={m.createdAt}
                        className={`mt-0.5 block text-[10px] ${mine ? "text-ink/40" : "text-ink/35"}`}
                      >
                        {fmtTime(m.createdAt)}
                      </time>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* composer */}
      <div className="border-t border-ink/10 bg-bg/90 px-3 py-3 backdrop-blur">
        {sendError ? (
          <p role="alert" className="mb-2 px-1 text-xs text-error">
            {sendError}
          </p>
        ) : null}
        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <label htmlFor="message-composer" className="sr-only">
            Write a message
          </label>
          <textarea
            id="message-composer"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            disabled={loading}
            maxLength={MESSAGE_MAX}
            placeholder="Write a message…"
            aria-label="Write a message"
            className="max-h-32 min-h-[40px] w-full resize-none rounded-2xl border border-ink/15 bg-white/60 px-3.5 py-2 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || sending || draft.trim().length === 0}
            aria-label="Send message"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-bg transition active:scale-95 hover:bg-accent/90 disabled:opacity-40"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </form>
        <p className="mt-1.5 px-1 text-center text-[11px] text-ink/40">
          platonic, never dating · be kind, keep it public
        </p>
      </div>

      {reportingId ? (
        <ReportMessageDialog
          messageId={reportingId}
          onClose={() => setReportingId(null)}
          onDone={() => {
            setReportingId(null);
            router.replace("/matches"); // report deleted the match — conversation has ended
          }}
        />
      ) : null}
    </main>
  );
}
