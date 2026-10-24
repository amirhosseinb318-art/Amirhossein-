import Link from "next/link";
import { redirect } from "next/navigation";
import { KeyRound, ShieldAlert } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { getInvitationByToken, invitationState } from "@/lib/auth/invitations";
import { getI18n } from "@/i18n/server";
import { formatDateTime } from "@/lib/utils";
import { Brand } from "@/components/shell/brand";
import { InviteForm } from "@/components/auth/invite-form";
import { Notice } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const user = await getSession();
  if (user) redirect("/overview");

  const { token } = await params;
  const { locale, d } = await getI18n();
  const invitation = await getInvitationByToken(decodeURIComponent(token));
  const state = invitationState(invitation);

  const reasonLabel = {
    used: d.auth.inviteUsed,
    expired: d.auth.inviteExpired,
    revoked: d.auth.inviteRevoked,
    not_found: d.auth.inviteNotFound,
  } as const;

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
      <div className="rounded-2xl border border-line bg-panel p-6 shadow-2xl sm:p-8">
        <Brand title={d.meta.title} tagline={d.meta.tagline} />

        {!state.valid || !invitation ? (
          <div className="mt-8 space-y-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-danger/25 bg-danger-soft text-danger">
              <ShieldAlert className="h-4.5 w-4.5" aria-hidden />
            </span>
            <div>
              <h1 className="text-lg font-semibold text-ink">{d.auth.inviteInvalid}</h1>
              <p className="mt-1.5 text-[12.5px] leading-6 text-ink-muted">
                {reasonLabel[state.reason ?? "not_found"]}
              </p>
            </div>
            <ButtonLink href="/sign-in" variant="secondary" className="w-full">
              {d.auth.backToSignIn}
            </ButtonLink>
          </div>
        ) : (
          <div className="mt-7 space-y-5">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-accent/25 bg-accent-soft text-accent">
                <KeyRound className="h-4 w-4" aria-hidden />
              </span>
              <div>
                <h1 className="text-lg font-semibold text-ink">{d.auth.inviteTitle}</h1>
                <p className="mt-1 text-[12px] leading-5 text-ink-muted">{d.auth.inviteSubtitle}</p>
              </div>
            </div>

            <dl className="divide-y divide-line rounded-xl border border-line bg-panel-soft/50 px-3.5 py-1 text-[12px]">
              <div className="flex items-center justify-between gap-3 py-2">
                <dt className="text-ink-faint">{d.common.email}</dt>
                <dd className="truncate text-ink" dir="ltr">{invitation.email}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2">
                <dt className="text-ink-faint">{d.common.role}</dt>
                <dd className="text-ink">{d.role[invitation.role]}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2">
                <dt className="text-ink-faint">{d.admin.inviteExpiry}</dt>
                <dd className="num text-ink">{formatDateTime(invitation.expiresAt, locale)}</dd>
              </div>
            </dl>

            <InviteForm token={token} suggestedName={invitation.name} d={d} />

            <Notice tone="info" title={d.common.securityNote}>
              {d.auth.noPublicSignup}
            </Notice>

            <p className="text-center text-[11px] text-ink-faint">
              <Link href="/sign-in" className="hover:text-ink hover:underline focus-ring">
                {d.auth.backToSignIn}
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
