"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Loader2, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/forms";
import type { Dictionary } from "@/i18n/dictionary";

export function CorrectionForm({ eventId, d }: { eventId: string; d: Dictionary }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [state, setState] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  async function submit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setPending(true);
    setState(null);
    try {
      const response = await fetch("/api/events/correct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, note }),
      });
      const data = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !data.ok) {
        setState({ tone: "error", text: data.message ?? d.errors.generic });
        return;
      }
      setNote("");
      setState({ tone: "ok", text: d.event.correctionAdded });
      router.refresh();
    } catch {
      setState({ tone: "error", text: d.errors.generic });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <label htmlFor="correction-note" className="block text-[11px] font-medium text-ink-muted">
        {d.event.addCorrection}
      </label>
      <Textarea
        id="correction-note"
        rows={2}
        required
        minLength={10}
        maxLength={600}
        value={note}
        onChange={(changeEvent) => setNote(changeEvent.target.value)}
        placeholder={d.event.correctionNote}
        className="text-[11.5px]"
      />
      {state ? (
        <p role="status" className={`flex items-center gap-1.5 text-[10.5px] ${state.tone === "ok" ? "text-ok" : "text-danger"}`}>
          {state.tone === "ok" ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> : null}
          {state.text}
        </p>
      ) : null}
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <PencilLine className="h-3.5 w-3.5" aria-hidden />}
        {d.event.addCorrection}
      </Button>
    </form>
  );
}
