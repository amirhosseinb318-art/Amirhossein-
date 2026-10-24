"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, Loader2, LockKeyhole, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/forms";
import type { Dictionary } from "@/i18n/dictionary";

export function InviteForm({
  token,
  suggestedName,
  d,
}: {
  token: string;
  suggestedName: string;
  d: Dictionary;
}) {
  const router = useRouter();
  const [name, setName] = useState(suggestedName);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password.length < 12) {
      setError(d.auth.weakPassword);
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/auth/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name, password }),
      });
      const data = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !data.ok) {
        setError(data.message ?? d.auth.inviteInvalid);
        setPending(false);
        return;
      }
      router.replace("/overview");
      router.refresh();
    } catch {
      setError(d.errors.generic);
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label={d.auth.setName} htmlFor="name">
        <div className="relative">
          <UserRound className="pointer-events-none absolute inset-y-0 start-3 my-auto h-3.5 w-3.5 text-ink-faint" aria-hidden />
          <Input
            id="name"
            name="name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="ps-9"
          />
        </div>
      </Field>
      <Field label={d.auth.setPassword} htmlFor="password" hint={d.settings.securityHint}>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute inset-y-0 start-3 my-auto h-3.5 w-3.5 text-ink-faint" aria-hidden />
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={12}
            dir="ltr"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="ps-9"
          />
        </div>
      </Field>

      {error ? (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-danger/25 bg-danger-soft px-3 py-2 text-[11.5px] leading-5 text-danger">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          {error}
        </div>
      ) : null}

      <Button type="submit" variant="primary" size="lg" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
        {pending ? d.auth.accepting : d.auth.acceptInvite}
      </Button>
    </form>
  );
}
