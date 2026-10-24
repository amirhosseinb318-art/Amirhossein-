"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Loader2, ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/forms";
import { Badge } from "@/components/ui/primitives";
import type { Dictionary } from "@/i18n/dictionary";
import type { EventRecord, Role } from "@/lib/types";

export function AlertActions({
  event,
  role,
  d,
}: {
  event: EventRecord;
  role: Role;
  d: Dictionary;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pending, setPending] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stateLabel =
    event.alert.state === "approved"
      ? d.event.alertApproved
      : event.alert.state === "sent"
        ? d.event.alertSent
        : event.alert.state === "rejected"
          ? d.event.alertRejected
          : event.alert.state === "pending_review"
            ? d.event.alertPending
            : d.event.alertNone;

  async function decide(decision: "approve" | "reject") {
    setPending(decision);
    setError(null);
    try {
      const response = await fetch("/api/events/alert-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, decision, note }),
      });
      const data = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !data.ok) {
        setError(data.message ?? d.errors.generic);
        setPending(null);
        return;
      }
      setNote("");
      setPending(null);
      router.refresh();
    } catch {
      setError(d.errors.generic);
      setPending(null);
    }
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-start gap-2 rounded-lg border border-line bg-canvas/40 px-2.5 py-2">
        <ShieldAlert
          className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${event.alert.state === "pending_review" ? "text-warn" : "text-ink-faint"}`}
          aria-hidden
        />
        <p className="text-[10.5px] leading-4 text-ink-muted">{stateLabel}</p>
      </div>

      {role === "admin" && event.alert.state === "pending_review" ? (
        <>
          <label htmlFor="review-note" className="sr-only">
            {d.admin.reviewNote}
          </label>
          <Textarea
            id="review-note"
            rows={2}
            maxLength={400}
            value={note}
            onChange={(changeEvent) => setNote(changeEvent.target.value)}
            placeholder={d.event.reviewReason}
            className="text-[11.5px]"
          />
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="primary"
              size="sm"
              disabled={pending !== null}
              onClick={() => decide("approve")}
            >
              {pending === "approve" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Check className="h-3.5 w-3.5" aria-hidden />
              )}
              {d.admin.approve}
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={pending !== null}
              onClick={() => decide("reject")}
            >
              {pending === "reject" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <X className="h-3.5 w-3.5" aria-hidden />
              )}
              {d.admin.reject}
            </Button>
          </div>
        </>
      ) : null}

      {role !== "admin" ? (
        <p className="text-[10px] leading-4 text-ink-faint">{d.event.policyNote}</p>
      ) : null}

      {error ? (
        <p role="alert" className="text-[10.5px] text-danger">{error}</p>
      ) : null}

      {event.alert.reviewNote ? (
        <p className="text-[10px] leading-4 text-ink-faint">
          <Badge tone="outline" className="me-1">{d.admin.reviewNote}</Badge>
          {event.alert.reviewNote}
        </p>
      ) : null}
    </div>
  );
}
