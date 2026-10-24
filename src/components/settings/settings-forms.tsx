"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/forms";
import type { Dictionary } from "@/i18n/dictionary";
import type { Locale } from "@/lib/types";

export function DisplayPreferences({
  locale,
  theme,
  d,
}: {
  locale: Locale;
  theme: "dark" | "light" | "system";
  d: Dictionary;
}) {
  const router = useRouter();
  const [nextLocale, setNextLocale] = useState<Locale>(locale);
  const [nextTheme, setNextTheme] = useState(theme);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setPending(true);
    setSaved(false);
    try {
      const response = await fetch("/api/settings/display", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: nextLocale, theme: nextTheme }),
      });
      if (!response.ok) throw new Error("failed");
      if (nextTheme !== "system") {
        document.documentElement.classList.toggle("dark", nextTheme === "dark");
      }
      setSaved(true);
      router.refresh();
    } catch {
      setSaved(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={d.common.language} htmlFor="locale">
          <Select
            id="locale"
            value={nextLocale}
            onChange={(event) => setNextLocale(event.target.value as Locale)}
            className="text-[12px]"
          >
            <option value="fa">فارسی (RTL)</option>
            <option value="en">English (LTR)</option>
          </Select>
        </Field>
        <Field label={d.common.theme} htmlFor="theme">
          <Select
            id="theme"
            value={nextTheme}
            onChange={(event) => setNextTheme(event.target.value as "dark" | "light" | "system")}
            className="text-[12px]"
          >
            <option value="dark">{d.common.dark}</option>
            <option value="light">{d.common.light}</option>
            <option value="system">{d.common.system}</option>
          </Select>
        </Field>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="primary" size="sm" onClick={save} disabled={pending}>
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
          {pending ? d.common.saving : d.common.save}
        </Button>
        {saved ? (
          <span className="flex items-center gap-1 text-[10.5px] text-ok">
            <CheckCircle2 className="h-3 w-3" aria-hidden />
            {d.settings.savedPrefs}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function PasswordForm({ d }: { d: Dictionary }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await response.json()) as { ok?: boolean; code?: string };
      if (!response.ok || !data.ok) {
        setMessage({
          tone: "error",
          text: data.code === "invalid_current_password" ? d.settings.wrongPassword : d.auth.weakPassword,
        });
        return;
      }
      setMessage({ tone: "ok", text: d.settings.passwordChanged });
      setCurrentPassword("");
      setNewPassword("");
    } catch {
      setMessage({ tone: "error", text: d.errors.generic });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label={d.settings.currentPassword} htmlFor="current-password">
        <Input
          id="current-password"
          type="password"
          autoComplete="current-password"
          required
          dir="ltr"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
        />
      </Field>
      <Field label={d.settings.newPassword} htmlFor="new-password">
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          minLength={12}
          required
          dir="ltr"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
        />
      </Field>
      {message ? (
        <p role="status" className={`flex items-center gap-1.5 text-[11px] ${message.tone === "ok" ? "text-ok" : "text-danger"}`}>
          {message.tone === "ok" ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> : <ShieldAlert className="h-3.5 w-3.5" aria-hidden />}
          {message.text}
        </p>
      ) : null}
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
        {d.settings.changePassword}
      </Button>
    </form>
  );
}
