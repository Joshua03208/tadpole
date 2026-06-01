"use client";

import { useState } from "react";
import { REPORT_REASONS, type ReportReason } from "@tadpole/validation";
import { reportMessage } from "@tadpole/core";
import { getBrowserClient } from "@/lib/supabase/client";
import { Button, FormError, Textarea } from "@/components/form";

/**
 * Report a single message. Mirrors ReportDialog, but calls the atomic
 * report_message RPC (snapshot -> block -> delete the match). Once it resolves
 * the conversation no longer exists, so onDone should navigate away.
 */
export function ReportMessageDialog({
  messageId,
  onClose,
  onDone,
}: {
  messageId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [detail, setDetail] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function submit() {
    if (!reason) {
      setError("Please pick a reason.");
      return;
    }
    setPending(true);
    setError(undefined);
    try {
      await reportMessage(getBrowserClient(), messageId, reason, detail.trim() || undefined);
      onDone();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setError(
        /limit reached/i.test(msg)
          ? "You've sent a lot of reports recently. Please try again later."
          : "Couldn't submit that report. Please try again.",
      );
      setPending(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Report this message"
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-center sm:p-6"
      onClick={pending ? undefined : onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90dvh] w-full max-w-md overflow-auto rounded-t-3xl bg-bg p-6 sm:rounded-3xl"
      >
        <h2 className="text-xl font-semibold text-ink">Report this message</h2>
        <p className="mt-1 text-sm text-ink/60">
          Reporting also blocks this dad and ends the conversation. This is sent to our safety team.
        </p>

        <fieldset className="mt-4 space-y-1.5">
          <legend className="sr-only">Reason</legend>
          {REPORT_REASONS.map((r) => (
            <label
              key={r.value}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                reason === r.value ? "border-accent bg-accent/10" : "border-ink/10 hover:border-ink/25"
              }`}
            >
              <input
                type="radio"
                name="report-message-reason"
                value={r.value}
                checked={reason === r.value}
                onChange={() => setReason(r.value)}
                className="accent-accent"
              />
              <span className="text-sm text-ink">{r.label}</span>
            </label>
          ))}
        </fieldset>

        <div className="mt-3">
          <label htmlFor="report-message-detail" className="mb-1 block text-sm font-medium text-ink">
            Anything to add? (optional)
          </label>
          <Textarea
            id="report-message-detail"
            rows={3}
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            maxLength={1000}
          />
        </div>

        <FormError>{error}</FormError>

        <div className="mt-4 flex gap-3">
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className="flex-1 rounded-lg bg-error px-4 py-2 text-sm font-semibold text-bg transition active:scale-[0.98] hover:bg-error/90 disabled:opacity-50"
          >
            {pending ? "Reporting…" : "Report & block"}
          </button>
        </div>
      </div>
    </div>
  );
}
