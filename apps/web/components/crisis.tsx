"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CRISIS_RESOURCES, type CrisisResource } from "@tadpole/core";

function actionFor(a: CrisisResource["action"]): { href: string; label: string } {
  if (a.kind === "call") {
    const pretty = a.number === "116123" ? "116 123" : a.number === "0800585858" ? "0800 58 58 58" : a.number;
    return { href: `tel:${a.number}`, label: `Call ${pretty}` };
  }
  return { href: `sms:${a.to}?body=${encodeURIComponent(a.body)}`, label: `Text ${a.body} to ${a.to}` };
}

export function GetHelpButton() {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-ink/15 px-3 py-1.5 text-xs font-semibold text-ink/80 transition active:scale-[0.98] hover:border-ink/30 hover:text-ink"
      >
        get help now
      </button>

      {open &&
        createPortal(
          <div
            role="dialog"
          aria-modal="true"
          aria-label="Get help now — crisis resources"
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 sm:items-center sm:p-6"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-3xl bg-bg p-6 shadow-[0_-12px_40px_-12px_rgba(0,0,0,0.25)] sm:rounded-3xl sm:shadow-[0_20px_60px_-20px_rgba(0,0,0,0.3)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-ink">get help now</h2>
                <p className="mt-1 text-sm text-ink/60">
                  Tadpole isn&apos;t a crisis service. If you&apos;re struggling, these can help —
                  free and confidential.
                </p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-full p-2 text-ink/50 transition hover:bg-ink/5 hover:text-ink"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <ul className="mt-5 space-y-2">
              {CRISIS_RESOURCES.map((r) => {
                const a = actionFor(r.action);
                return (
                  <li key={r.name}>
                    <a
                      href={a.href}
                      className={`block rounded-2xl border px-4 py-3 transition active:scale-[0.99] ${
                        r.emphasis
                          ? "border-error/30 bg-error/10 hover:border-error/50"
                          : "border-ink/10 bg-white/50 hover:border-accent/40"
                      }`}
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-semibold text-ink">{r.name}</span>
                        <span className={`text-sm font-semibold ${r.emphasis ? "text-error" : "text-accent"}`}>
                          {a.label}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-ink/55">{r.detail}</p>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
