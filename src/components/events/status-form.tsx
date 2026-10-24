"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/forms";
import type { Dictionary } from "@/i18n/dictionary";
import { ALLOWED_TRANSITIONS } from "@/lib/verification";
import type { EventRecord, EventStatus, ReportRecord, Role } from "@/lib/types";

export function StatusForm({
  event,
  reports,
  role,
  d,
}: {
  event: EventRecord;
  reports: ReportRecord[];
  role: Role;
  d: Dictionary;
}) {
  const router = useRouter();
  const allowed = ALLOWED_TRANSITIONS[event.status].filter((status) => {
    if (status === "retracted" && role !== "admin") return false;
    if (status === "verified" && event.severity >= 4 && role !== "admin") return false;
    return true;
  });
  const [to, setTo] = useState<EventStatus>(allowed[0] ?? "unverified");
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState<string[]>(event.reportIds);
  const [state, setState] = useState<{ kind: "idle" | "ok" | "error"; message?: string }>({
    kind: "idle",
  });
  const [pending, setPending] = useState(false);

  if (allowed.length === 0) {
    return (
      <p className="text-[11.5px] leading-5 text-ink-faint">
        {event.status === "retracted" ? d.statusHint.retracted : d.admin.invariantsBody}
      </p>
    );
  }

  async function onSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setPending(true);
    setState({ kind: "idle" });
    try {
      const response = await fetch("/api/events/transition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          to,
          reason,
          evidenceReportIds: evidence,
        }),
      });
      const data = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !data.ok) {
        setState({ kind: "error", message: data.message ?? d.errors.generic });
        setPending(false);
        return;
      }
      setState({ kind: "ok", message: d.event.statusUpdated });
      setReason("");
      setPending(false);
      router.refresh();
    } catch {
      setState({ kind: "error", message: d.errors.generic });
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Field label={d.event.newStatus} htmlFor="new-status">
        <Select
          id="new-status"
          value={to}
          onChange={(changeEvent) => setTo(changeEvent.target.value as EventStatus)}
          className="h-9 text-[12px]"
        >
          {allowed.map((status) => (
            <option key={status} value={status}>
              {d.status[status]} — {d.statusHint[status]}
            </option>
          ))}
        </Select>
      </Field>

      <fieldset className="rounded-lg border border-line bg-canvas/40 px-2.5 py-2">
        <legend className="px-1 text-[11px] font-medium text-ink-muted">{d.event.evidence}</legend>
        <div className="max-h-32 space-y-1 overflow-y-auto">
          {reports.map((report) => (
            <label key={report.id} className="flex cursor-pointer items-start gap-2 py-0.5 text-[10.5px] leading-4 text-ink-muted">
              <input
                type="checkbox"
                checked={evidence.includes(report.id)}
                onChange={(changeEvent) => {
                  setEvidence((current) =>
                    changeEvent.target.checked
                      ? [...current, report.id]
                      : current.filter((id) => id !== report.id),
                  );
                }}
                className="mt-0.5 h-3.5 w-3.5 rounded border-line-strong accent-[var(--accent)]"
              />
              <span className="min-w-0">
                <span className="block truncate text-ink">{report.title}</span>
                <span className="text-ink-faint">
                  {report.sourceName} · {report.isPrimary ? d.event.primarySources : d.common.source}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <Field label={d.common.reason} htmlFor="reason">
        <Textarea
          id="reason"
          required
          minLength={10}
          maxLength={600}
          rows={3}
          value={reason}
          onChange={(changeEvent) => setReason(changeEvent.target.value)}
          placeholder={d.event.reasonPlaceholder}
          className="text-[12px]"
        />
      </Field>

      {state.kind === "error" ? (
        <p role="alert" className="flex items-start gap-1.5 rounded-lg border border-danger/25 bg-danger-soft px-2.5 py-2 text-[11px] leading-4 text-danger">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {state.message}
        </p>
      ) : null}
      {state.kind === "ok" ? (
        <p role="status" className="flex items-center gap-1.5 text-[11px] text-ok">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
          {state.message}
        </p>
      ) : null}

      <Button type="submit" variant="primary" size="sm" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
        {pending ? d.event.applying : d.event.applyStatus}
      </Button>
      <p className="text-[10px] leading-4 text-ink-faint">{d.event.policyNote}</p>
    </form>
  );
}
