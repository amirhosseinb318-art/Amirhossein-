"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AlertCircle, CheckCircle2, Copy, Loader2, Plus, Send, ShieldOff } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/forms";
import type { Dictionary } from "@/i18n/dictionary";
import type { InvitationRecord, Locale, UserRecord } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { nowMs } from "@/lib/time";

export function InvitationManager({
  invitations,
  users,
  d,
  locale,
  currentUserId,
}: {
  invitations: InvitationRecord[];
  users: UserRecord[];
  d: Dictionary;
  locale: Locale;
  currentUserId: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  function stateOf(invitation: InvitationRecord): keyof typeof stateLabels {
    if (invitation.usedAt) return "used";
    if (invitation.revokedAt) return "revoked";
    if (Date.parse(invitation.expiresAt) < nowMs()) return "expired";
    return "pending";
  }

  const stateLabels = {
    pending: d.admin.pending,
    used: d.admin.used,
    expired: d.admin.expired,
    revoked: d.admin.revoked,
  };

  async function create(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    const formEl = formEvent.currentTarget;
    const form = new FormData(formEl);
    setPending("create");
    setMessage(null);
    setCreatedLink(null);
    try {
      const response = await fetch("/api/admin/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.get("email"),
          name: form.get("name"),
          role: form.get("role"),
          expiresInHours: Number(form.get("expiresInHours")),
        }),
      });
      const data = (await response.json()) as { ok?: boolean; url?: string; message?: string };
      if (!response.ok || !data.ok) {
        setMessage({ tone: "error", text: data.message ?? d.errors.generic });
        return;
      }
      setCreatedLink(data.url ?? null);
      setMessage({ tone: "ok", text: d.admin.inviteCreated });
      formEl.reset();
      router.refresh();
    } catch {
      setMessage({ tone: "error", text: d.errors.generic });
    } finally {
      setPending(null);
    }
  }

  async function revoke(id: string) {
    setPending(id);
    try {
      const response = await fetch("/api/admin/invitations/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !data.ok) {
        setMessage({ tone: "error", text: data.message ?? d.errors.generic });
        return;
      }
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  async function changeRole(userId: string, role: string) {
    setPending(userId);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      const data = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || !data.ok) {
        setMessage({ tone: "error", text: data.message ?? d.errors.generic });
        return;
      }
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-4">
          <div>
            <h2 className="text-[13px] font-semibold text-ink">{d.admin.invitationsTitle}</h2>
            <p className="mt-0.5 text-[10.5px] leading-4 text-ink-faint">{d.admin.invitationsHint}</p>
          </div>

          {message ? (
            <p role="status" className={`flex items-start gap-1.5 rounded-lg border px-3 py-2 text-[11px] ${message.tone === "ok" ? "border-ok/25 bg-ok-soft text-ok" : "border-danger/25 bg-danger-soft text-danger"}`}>
              {message.tone === "ok" ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden /> : <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />}
              {message.text}
            </p>
          ) : null}

          {createdLink ? (
            <div className="rounded-xl border border-accent/25 bg-accent-soft/60 p-3">
              <p className="text-[10.5px] font-medium text-ink">{d.admin.inviteLink}</p>
              <div className="mt-1.5 flex items-center gap-2">
                <code className="min-w-0 flex-1 break-anywhere rounded border border-line bg-panel px-2 py-1.5 font-mono text-[10px] text-ink-muted" dir="ltr">
                  {createdLink}
                </code>
                <Button variant="secondary" size="sm" onClick={() => navigator.clipboard.writeText(createdLink)}>
                  <Copy className="h-3.5 w-3.5" aria-hidden />
                  {d.common.copy}
                </Button>
              </div>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-xl border border-line bg-panel">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-[11.5px]">
                <thead>
                  <tr className="border-b border-line bg-panel-soft/60 text-[10px] uppercase tracking-wide text-ink-faint">
                    <th className="px-4 py-2 text-start font-semibold">{d.common.email}</th>
                    <th className="px-3 py-2 text-start font-semibold">{d.common.role}</th>
                    <th className="px-3 py-2 text-start font-semibold">{d.common.status}</th>
                    <th className="px-3 py-2 text-start font-semibold">{d.admin.when}</th>
                    <th className="px-3 py-2 text-end font-semibold">{d.common.action}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {invitations.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-6 text-center text-[11px] text-ink-faint">{d.admin.noInvitations}</td></tr>
                  ) : (
                    invitations.map((invitation) => {
                      const state = stateOf(invitation);
                      return (
                        <tr key={invitation.id} className="hover:bg-panel-soft/40">
                          <td className="px-4 py-2.5">
                            <p className="text-ink" dir="ltr">{invitation.email}</p>
                            <p className="text-[9.5px] text-ink-faint">{invitation.name}</p>
                          </td>
                          <td className="px-3 py-2.5 text-ink-muted">{d.role[invitation.role]}</td>
                          <td className="px-3 py-2.5">
                            <Badge tone={state === "pending" ? "accent" : state === "used" ? "ok" : "neutral"}>
                              {stateLabels[state]}
                            </Badge>
                          </td>
                          <td className="px-3 py-2.5 text-[10px] text-ink-faint">
                            <p>{formatDateTime(invitation.createdAt, locale)}</p>
                            <p>{formatDateTime(invitation.expiresAt, locale)}</p>
                          </td>
                          <td className="px-3 py-2.5 text-end">
                            {state === "pending" ? (
                              <Button variant="ghost" size="sm" onClick={() => revoke(invitation.id)} disabled={pending !== null}>
                                {pending === invitation.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <ShieldOff className="h-3.5 w-3.5" aria-hidden />}
                                {d.admin.revoke}
                              </Button>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <form onSubmit={create} className="h-fit space-y-3 rounded-xl border border-line bg-panel p-4">
          <h3 className="flex items-center gap-1.5 text-[12.5px] font-semibold text-ink">
            <Plus className="h-3.5 w-3.5" aria-hidden />
            {d.admin.createInvitation}
          </h3>
          <Field label={d.admin.inviteEmail} htmlFor="invite-email">
            <Input id="invite-email" name="email" type="email" required dir="ltr" />
          </Field>
          <Field label={d.admin.inviteName} htmlFor="invite-name">
            <Input id="invite-name" name="name" required minLength={1} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label={d.admin.inviteRole} htmlFor="invite-role">
              <Select id="invite-role" name="role" defaultValue="analyst">
                <option value="analyst">{d.role.analyst}</option>
                <option value="viewer">{d.role.viewer}</option>
                <option value="admin">{d.role.admin}</option>
              </Select>
            </Field>
            <Field label={d.admin.inviteExpiry} htmlFor="invite-expiry">
              <Input id="invite-expiry" name="expiresInHours" type="number" min={1} max={720} defaultValue={72} />
            </Field>
          </div>
          <Button type="submit" variant="primary" size="sm" className="w-full" disabled={pending === "create"}>
            {pending === "create" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Send className="h-3.5 w-3.5" aria-hidden />}
            {d.admin.createInvitation}
          </Button>
          <p className="text-[10px] leading-4 text-ink-faint">{d.auth.noPublicSignup}</p>
        </form>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-panel">
        <div className="border-b border-line px-4 py-2.5">
          <h3 className="text-[12px] font-semibold text-ink">{d.admin.inviteRole} / {d.admin.actor}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-[11.5px]">
            <thead>
              <tr className="border-b border-line bg-panel-soft/60 text-[10px] uppercase tracking-wide text-ink-faint">
                <th className="px-4 py-2 text-start font-semibold">{d.common.name}</th>
                <th className="px-3 py-2 text-start font-semibold">{d.common.email}</th>
                <th className="px-3 py-2 text-start font-semibold">{d.common.status}</th>
                <th className="px-3 py-2 text-start font-semibold">{d.common.role}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-panel-soft/40">
                  <td className="px-4 py-2.5 text-ink">{user.name}</td>
                  <td className="px-3 py-2.5 text-ink-muted" dir="ltr">{user.email}</td>
                  <td className="px-3 py-2.5">
                    <Badge tone={user.status === "active" ? "ok" : "danger"} dot>{user.status}</Badge>
                  </td>
                  <td className="px-3 py-2.5">
                    <Select
                      value={user.role}
                      onChange={(event) => changeRole(user.id, event.target.value)}
                      disabled={pending !== null || user.id === currentUserId}
                      className="h-7 w-auto min-w-24 text-[10.5px]"
                      aria-label={`${d.common.role} — ${user.email}`}
                    >
                      <option value="admin">{d.role.admin}</option>
                      <option value="analyst">{d.role.analyst}</option>
                      <option value="viewer">{d.role.viewer}</option>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
