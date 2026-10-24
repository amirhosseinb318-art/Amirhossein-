"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, ArrowRight, Loader2, LockKeyhole, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/forms";
import type { Dictionary } from "@/i18n/dictionary";
import type { Role } from "@/lib/types";

export interface DemoAccount {
  email: string;
  role: Role;
}

export function SignInForm({
  d,
  demoAccounts,
  demoPassword,
}: {
  d: Dictionary;
  demoAccounts: DemoAccount[];
  demoPassword: string | null;
}) {
  const router = useRouter();
  const [email, setEmail] = useState(demoAccounts[0]?.email ?? "");
  const [password, setPassword] = useState(demoPassword ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json()) as { ok?: boolean; redirect?: string; code?: string };
      if (!response.ok || !data.ok) {
        setError(
          data.code === "rate_limited"
            ? d.auth.rateLimited
            : data.code === "suspended"
              ? d.auth.suspended
              : d.auth.invalid,
        );
        setPending(false);
        return;
      }
      router.replace(data.redirect ?? "/overview");
      router.refresh();
    } catch {
      setError(d.errors.generic);
      setPending(false);
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label={d.auth.emailLabel} htmlFor="email">
          <div className="relative">
            <Mail className="pointer-events-none absolute inset-y-0 start-3 my-auto h-3.5 w-3.5 text-ink-faint" aria-hidden />
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              dir="ltr"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="ps-9"
              placeholder="you@organisation.com"
            />
          </div>
        </Field>

        <Field label={d.auth.passwordLabel} htmlFor="password">
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute inset-y-0 start-3 my-auto h-3.5 w-3.5 text-ink-faint" aria-hidden />
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              dir="ltr"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="ps-9"
            />
          </div>
        </Field>

        {error ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-danger/25 bg-danger-soft px-3 py-2 text-[11.5px] leading-5 text-danger"
          >
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            {error}
          </div>
        ) : null}

        <Button type="submit" variant="primary" size="lg" className="w-full" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {pending ? d.auth.signingIn : d.auth.signIn}
          {!pending ? <ArrowRight className="h-4 w-4 rtl:rotate-180" aria-hidden /> : null}
        </Button>
      </form>

      {demoAccounts.length > 0 && demoPassword ? (
        <div className="rounded-xl border border-dashed border-warn/35 bg-warn-soft/40 p-3.5">
          <p className="text-[11.5px] font-semibold text-ink">{d.auth.demoTitle}</p>
          <p className="mt-1 text-[11px] leading-5 text-ink-faint">{d.auth.demoBody}</p>
          <ul className="mt-2.5 space-y-1">
            {demoAccounts.map((account) => (
              <li key={account.email} className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="rounded border border-line bg-panel px-1.5 py-0.5 text-[10px] font-medium text-ink-muted">
                    {d.role[account.role]}
                  </span>
                  <span className="truncate text-[11px] text-ink-muted" dir="ltr">
                    {account.email}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setEmail(account.email);
                    setPassword(demoPassword);
                    setError(null);
                  }}
                  className="shrink-0 rounded-md px-2 py-1 text-[10.5px] font-medium text-accent hover:bg-accent-soft focus-ring"
                >
                  {d.auth.signIn}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 border-t border-warn/20 pt-2 text-[10.5px] text-ink-faint" dir="ltr">
            password: <code className="rounded bg-panel px-1 py-0.5">{demoPassword}</code>
          </p>
        </div>
      ) : null}
    </div>
  );
}
