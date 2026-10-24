"use client";

import { useEffect, useState } from "react";
import { BellRing, CheckCircle2, Loader2, Send, ShieldAlert, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Select } from "@/components/ui/forms";
import { Badge } from "@/components/ui/primitives";
import type { Dictionary } from "@/i18n/dictionary";
import type { EventCategory, Severity, UserSettingsRecord } from "@/lib/types";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

export function NotificationPreferences({
  settings,
  categories,
  d,
  vapidPublicKey,
}: {
  settings: UserSettingsRecord;
  categories: EventCategory[];
  d: Dictionary;
  vapidPublicKey: string | null;
}) {
  const [selected, setSelected] = useState<EventCategory[]>(settings.alertCategories);
  const [minSeverity, setMinSeverity] = useState<Severity>(settings.minSeverity);
  const [inApp, setInApp] = useState(settings.inAppEnabled);
  const [push, setPush] = useState(settings.pushEnabled);
  const [quiet, setQuiet] = useState(settings.quietHours);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [pushState, setPushState] = useState<string | null>(null);
  const [testPending, setTestPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function detect() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        if (!cancelled) setPushState("unsupported");
        return;
      }
      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      const subscription = await registration?.pushManager.getSubscription();
      if (!cancelled) setPushState(subscription ? "subscribed" : "unsubscribed");
    }
    void detect();
    return () => {
      cancelled = true;
    };
  }, []);

  async function save() {
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/notifications/prefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alertCategories: selected,
          minSeverity,
          inAppEnabled: inApp,
          pushEnabled: push,
          quietHours: quiet,
        }),
      });
      if (!response.ok) throw new Error("save failed");
      setMessage({ tone: "ok", text: d.notifications.saved });
    } catch {
      setMessage({ tone: "error", text: d.settings.saveError });
    } finally {
      setPending(false);
    }
  }

  async function sendTest() {
    setTestPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/notifications/test", { method: "POST" });
      if (!response.ok) throw new Error("test failed");
      setMessage({ tone: "ok", text: d.notifications.testSent });
    } catch {
      setMessage({ tone: "error", text: d.errors.generic });
    } finally {
      setTestPending(false);
    }
  }

  async function enablePush() {
    setMessage(null);
    if (!vapidPublicKey) {
      setPushState("unconfigured");
      setMessage({ tone: "error", text: d.notifications.pushUnavailable });
      return;
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setPushState("unsupported");
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setPushState("denied");
        setMessage({ tone: "error", text: d.notifications.pushDenied });
        return;
      }
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as BufferSource,
      });
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });
      if (!response.ok) throw new Error("subscribe failed");
      setPush(true);
      setPushState("subscribed");
      setMessage({ tone: "ok", text: d.notifications.pushEnabled });
    } catch {
      setPushState("error");
      setMessage({ tone: "error", text: d.errors.generic });
    }
  }

  async function disablePush() {
    try {
      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setPush(false);
      setPushState("unsubscribed");
    } catch {
      setMessage({ tone: "error", text: d.errors.generic });
    }
  }

  const pushStatusText =
    pushState === "unsupported"
      ? d.notifications.pushUnsupported
      : pushState === "denied"
        ? d.notifications.pushDenied
        : pushState === "unconfigured" || !vapidPublicKey
          ? d.notifications.pushUnavailable
          : pushState === "subscribed"
            ? d.notifications.pushEnabled
            : null;

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-line bg-panel">
        <div className="border-b border-line px-4 py-3">
          <h2 className="text-[13px] font-semibold text-ink">{d.notifications.preferences}</h2>
          <p className="mt-0.5 text-[10.5px] leading-4 text-ink-faint">{d.notifications.preferencesHint}</p>
        </div>
        <div className="space-y-4 p-4">
          <div>
            <p className="mb-1 text-[11px] font-medium text-ink-muted">{d.notifications.categories}</p>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              {categories.map((category) => (
                <Checkbox
                  key={category}
                  label={d.category[category]}
                  checked={selected.includes(category)}
                  onChange={(event) =>
                    setSelected((current) =>
                      event.target.checked
                        ? [...current, category]
                        : current.filter((item) => item !== category),
                    )
                  }
                />
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="min-severity" className="mb-1 block text-[11px] font-medium text-ink-muted">
                {d.notifications.minSeverity}
              </label>
              <Select
                id="min-severity"
                value={String(minSeverity)}
                onChange={(event) => setMinSeverity(Number(event.target.value) as Severity)}
                className="text-[12px]"
              >
                {[1, 2, 3, 4, 5].map((value) => (
                  <option key={value} value={value}>
                    {value} · {d.severity[value as Severity]}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1 pt-5">
              <Checkbox
                label={d.notifications.inApp}
                checked={inApp}
                onChange={(event) => setInApp(event.target.checked)}
              />
              <Checkbox
                label={d.notifications.push}
                description={pushStatusText ?? undefined}
                checked={push}
                onChange={(event) => setPush(event.target.checked)}
              />
            </div>
          </div>

          <fieldset className="rounded-lg border border-line bg-canvas/40 px-3 py-2.5">
            <legend className="px-1 text-[11px] font-medium text-ink-muted">{d.notifications.quietHours}</legend>
            <Checkbox
              label={d.notifications.quietHours}
              description={d.notifications.quietHint}
              checked={quiet.enabled}
              onChange={(event) => setQuiet({ ...quiet, enabled: event.target.checked })}
            />
            {quiet.enabled ? (
              <div className="mt-1.5 flex items-center gap-2 text-[11px] text-ink-muted">
                <label htmlFor="quiet-start">{d.notifications.quietStart}</label>
                <input
                  id="quiet-start"
                  type="time"
                  value={quiet.start}
                  onChange={(event) => setQuiet({ ...quiet, start: event.target.value })}
                  className="rounded border border-line-strong bg-canvas px-2 py-1 text-[11px] text-ink"
                />
                <label htmlFor="quiet-end">{d.notifications.quietEnd}</label>
                <input
                  id="quiet-end"
                  type="time"
                  value={quiet.end}
                  onChange={(event) => setQuiet({ ...quiet, end: event.target.value })}
                  className="rounded border border-line-strong bg-canvas px-2 py-1 text-[11px] text-ink"
                />
              </div>
            ) : null}
          </fieldset>

          {message ? (
            <p
              role="status"
              className={`flex items-center gap-1.5 text-[11px] ${message.tone === "ok" ? "text-ok" : "text-danger"}`}
            >
              {message.tone === "ok" ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> : <ShieldAlert className="h-3.5 w-3.5" aria-hidden />}
              {message.text}
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" size="sm" onClick={save} disabled={pending}>
              {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
              {pending ? d.common.saving : d.common.save}
            </Button>
            <Button variant="secondary" size="sm" onClick={sendTest} disabled={testPending}>
              {testPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Send className="h-3.5 w-3.5" aria-hidden />}
              {d.notifications.sendTest}
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-line bg-panel p-4">
        <div className="flex items-start gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-panel-soft text-accent">
            <Smartphone className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[12.5px] font-semibold text-ink">{d.notifications.push}</h2>
            <p className="mt-0.5 text-[10.5px] leading-4 text-ink-faint">
              {pushStatusText ?? d.notifications.pushHint}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone={vapidPublicKey ? "accent" : "warn"}>
                <BellRing className="me-1 h-3 w-3" aria-hidden />
                {vapidPublicKey ? d.settings.connected : d.settings.missing}
              </Badge>
              {pushState === "subscribed" ? (
                <Button variant="secondary" size="sm" onClick={disablePush}>
                  {d.notifications.disablePush}
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={enablePush}
                  disabled={!vapidPublicKey || pushState === "unsupported"}
                >
                  {d.notifications.enablePush}
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
