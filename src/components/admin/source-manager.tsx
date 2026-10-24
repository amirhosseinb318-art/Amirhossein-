"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Play,
  Plus,
  Power,
  RefreshCw,
} from "lucide-react";
import { Badge, ReliabilityBadge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/forms";
import type { Dictionary } from "@/i18n/dictionary";
import type { Locale, SourceRecord } from "@/lib/types";
import { formatDateTime, timeAgo } from "@/lib/utils";

export function SourceManager({
  sources,
  d,
  locale,
}: {
  sources: SourceRecord[];
  d: Dictionary;
  locale: Locale;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  async function act(id: string, fn: () => Promise<Response>, success: string) {
    setBusy(id);
    setMessage(null);
    try {
      const response = await fn();
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!response.ok || data.ok === false) {
        setMessage({ tone: "error", text: data.message ?? d.errors.generic });
      } else {
        setMessage({ tone: "ok", text: success });
        router.refresh();
      }
    } catch {
      setMessage({ tone: "error", text: d.errors.generic });
    } finally {
      setBusy(null);
    }
  }

  function toggle(source: SourceRecord) {
    if (source.enabled && !window.confirm(d.admin.confirmDisable)) return;
    void act(
      source.id,
      () =>
        fetch("/api/admin/sources", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceId: source.id, enabled: !source.enabled }),
        }),
      source.enabled ? d.admin.disabled : d.admin.enabled,
    );
  }

  function runNow(source?: SourceRecord) {
    void act(
      source?.id ?? "all",
      () =>
        fetch("/api/admin/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(source ? { sourceIds: [source.id] } : {}),
        }),
      d.admin.runComplete,
    );
  }

  async function addSource(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const form = new FormData(formEvent.currentTarget);
    setBusy("add");
    setMessage(null);
    try {
      const response = await fetch("/api/admin/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nameFa: form.get("nameFa"),
          nameEn: form.get("nameEn"),
          organization: form.get("organization"),
          homepageUrl: form.get("homepageUrl"),
          feedUrl: form.get("feedUrl"),
          kind: form.get("kind"),
          reliability: form.get("reliability"),
          language: form.get("language"),
          termsNote: form.get("termsNote"),
        }),
      });
      const data = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !data.ok) {
        setMessage({ tone: "error", text: data.message ?? d.errors.generic });
        return;
      }
      setAdding(false);
      setMessage({ tone: "ok", text: d.admin.create });
      router.refresh();
    } catch {
      setMessage({ tone: "error", text: d.errors.generic });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-[13px] font-semibold text-ink">{d.admin.sourcesTitle}</h2>
          <p className="mt-0.5 max-w-2xl text-[10.5px] leading-4 text-ink-faint">{d.admin.sourcesHint}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => runNow()} disabled={busy !== null}>
            {busy === "all" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <RefreshCw className="h-3.5 w-3.5" aria-hidden />}
            {d.admin.runNow}
          </Button>
          <Button variant="primary" size="sm" onClick={() => setAdding((value) => !value)}>
            <Plus className="h-3.5 w-3.5" aria-hidden />
            {d.admin.addSource}
          </Button>
        </div>
      </div>

      {message ? (
        <p
          role="status"
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] ${message.tone === "ok" ? "border-ok/25 bg-ok-soft text-ok" : "border-danger/25 bg-danger-soft text-danger"}`}
        >
          {message.tone === "ok" ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> : <AlertCircle className="h-3.5 w-3.5" aria-hidden />}
          {message.text}
        </p>
      ) : null}

      {adding ? (
        <form onSubmit={addSource} className="space-y-3 rounded-xl border border-line bg-panel p-4">
          <p className="text-[11.5px] font-medium text-ink">{d.admin.addSource}</p>
          <p className="text-[10px] text-ink-faint">{d.admin.addSourceHint}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={d.common.name + " (FA)"} htmlFor="nameFa"><Input id="nameFa" name="nameFa" required minLength={2} /></Field>
            <Field label={d.common.name + " (EN)"} htmlFor="nameEn"><Input id="nameEn" name="nameEn" required minLength={2} dir="ltr" /></Field>
            <Field label={d.admin.organization} htmlFor="organization"><Input id="organization" name="organization" required /></Field>
            <Field label={d.admin.feedUrl} htmlFor="feedUrl"><Input id="feedUrl" name="feedUrl" type="url" required pattern="https://.*" dir="ltr" /></Field>
            <Field label={d.admin.homepageUrl} htmlFor="homepageUrl"><Input id="homepageUrl" name="homepageUrl" type="url" required pattern="https://.*" dir="ltr" /></Field>
            <div className="grid grid-cols-3 gap-2">
              <Field label={d.admin.kind} htmlFor="kind">
                <Select id="kind" name="kind" defaultValue="news">
                  <option value="official">official</option>
                  <option value="government">government</option>
                  <option value="agency">agency</option>
                  <option value="news">news</option>
                  <option value="weather">weather</option>
                </Select>
              </Field>
              <Field label={d.admin.reliability} htmlFor="reliability">
                <Select id="reliability" name="reliability" defaultValue="high">
                  <option value="primary">primary</option>
                  <option value="high">high</option>
                  <option value="medium">medium</option>
                </Select>
              </Field>
              <Field label={d.common.language} htmlFor="language">
                <Select id="language" name="language" defaultValue="en">
                  <option value="en">en</option>
                  <option value="fa">fa</option>
                  <option value="ar">ar</option>
                </Select>
              </Field>
            </div>
          </div>
          <Field label={d.admin.terms} htmlFor="termsNote">
            <Textarea id="termsNote" name="termsNote" required minLength={10} rows={2} />
          </Field>
          <div className="flex items-center gap-2">
            <Button type="submit" variant="primary" size="sm" disabled={busy === "add"}>
              {busy === "add" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
              {d.admin.create}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>{d.common.cancel}</Button>
          </div>
        </form>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-line bg-panel">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-start text-[11.5px]">
            <thead>
              <tr className="border-b border-line bg-panel-soft/60 text-[10px] uppercase tracking-wide text-ink-faint">
                <th className="px-4 py-2 text-start font-semibold">{d.admin.source}</th>
                <th className="px-3 py-2 text-start font-semibold">{d.admin.reliability}</th>
                <th className="px-3 py-2 text-start font-semibold">{d.admin.lastSuccess}</th>
                <th className="px-3 py-2 text-start font-semibold">{d.admin.lastError}</th>
                <th className="px-3 py-2 text-end font-semibold">{d.common.action}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sources.map((source) => (
                <tr key={source.id} className="align-top hover:bg-panel-soft/40">
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium text-ink">{source.name[locale] || source.name.en}</span>
                      {source.enabled ? <Badge tone="ok" dot>{d.admin.enabled}</Badge> : <Badge tone="outline">{d.admin.disabled}</Badge>}
                    </div>
                    <p className="mt-0.5 text-[10px] text-ink-faint">{source.organization} · {source.kind} · {source.language}</p>
                    <p className="mt-0.5 max-w-xs truncate font-mono text-[9.5px] text-ink-faint" dir="ltr" title={source.feedUrl}>{source.feedUrl}</p>
                  </td>
                  <td className="px-3 py-3"><ReliabilityBadge reliability={source.reliability} lang={locale} /></td>
                  <td className="px-3 py-3 text-[10.5px] text-ink-muted">
                    {source.lastSuccessAt ? timeAgo(source.lastSuccessAt, locale) : d.admin.never}
                    {source.lastAttemptAt ? (
                      <p className="mt-0.5 text-[9.5px] text-ink-faint">{d.common.lastUpdated}: {formatDateTime(source.lastAttemptAt, locale)}</p>
                    ) : null}
                  </td>
                  <td className="max-w-[220px] px-3 py-3 text-[10px] text-ink-faint">
                    {source.lastError ? (
                      <span className="text-danger">{source.lastError}</span>
                    ) : (
                      <span className="flex items-center gap-1 text-ok"><CheckCircle2 className="h-3 w-3" aria-hidden />{d.admin.noErrors}</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => runNow(source)} disabled={busy !== null || !source.enabled} title={d.admin.runNow}>
                        {busy === source.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Play className="h-3.5 w-3.5" aria-hidden />}
                      </Button>
                      <Button variant={source.enabled ? "secondary" : "subtle"} size="sm" onClick={() => toggle(source)} disabled={busy !== null}>
                        <Power className="h-3.5 w-3.5" aria-hidden />
                        {source.enabled ? d.admin.disable : d.admin.enable}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-line bg-panel-soft/40 px-4 py-3">
        <p className="text-[10px] leading-5 text-ink-faint">{d.admin.invariantsBody}</p>
      </div>
    </div>
  );
}
