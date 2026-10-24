import { redirect } from "next/navigation";
import { CircleCheck, FileSearch, LockKeyhole, ShieldCheck, UserCheck } from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { getI18n } from "@/i18n/server";
import { serverEnv, DEMO_SEED_PASSWORD_FALLBACK } from "@/lib/config";
import { DEMO_IDS } from "@/lib/demo-data";
import { SignInForm } from "@/components/auth/sign-in-form";
import { Brand } from "@/components/shell/brand";

export const dynamic = "force-dynamic";

export default async function SignInPage() {
  const user = await getSession();
  if (user) redirect("/overview");

  const { d } = await getI18n();
  const demoMode = serverEnv.demoMode;
  const demoPassword = demoMode
    ? (serverEnv.demoPassword ?? DEMO_SEED_PASSWORD_FALLBACK)
    : null;

  const demoAccounts = demoMode
    ? [
        { email: "admin@demo.local", role: "admin" as const, id: DEMO_IDS.userAdmin },
        { email: "analyst@demo.local", role: "analyst" as const, id: DEMO_IDS.userAnalyst },
        { email: "viewer@demo.local", role: "viewer" as const, id: DEMO_IDS.userViewer },
      ]
    : [];

  const features = [
    {
      icon: CircleCheck,
      title: d.event.confirmedFacts,
      body: d.event.confirmedFactsHint,
    },
    {
      icon: FileSearch,
      title: d.common.citations,
      body: d.common.translationNote,
    },
    {
      icon: UserCheck,
      title: d.event.alertReview,
      body: d.event.policyNote,
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-10 md:px-8">
      <div className="grid overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden flex-col justify-between border-e border-line bg-panel-soft/40 p-8 lg:flex">
          <div>
            <Brand title={d.meta.title} tagline={d.meta.tagline} />
            <p className="label-caps mt-10">{d.common.securityNote}</p>
            <h1 className="mt-2 text-[27px] font-semibold leading-tight tracking-tight text-ink">
              {d.auth.signInTitle}
            </h1>
            <p className="mt-3 max-w-sm text-[13px] leading-6 text-ink-muted">{d.auth.signInSubtitle}</p>

            <ul className="mt-8 space-y-4">
              {features.map((feature) => (
                <li key={feature.title} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line bg-panel text-accent">
                    <feature.icon className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <span>
                    <span className="block text-[12.5px] font-medium text-ink">{feature.title}</span>
                    <span className="mt-0.5 block text-[11.5px] leading-5 text-ink-faint">
                      {feature.body}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-10 space-y-2 border-t border-line pt-4">
            <p className="flex items-center gap-1.5 text-[10.5px] text-ink-faint">
              <LockKeyhole className="h-3 w-3" aria-hidden />
              {d.auth.noPublicSignup}
            </p>
            <p className="flex items-center gap-1.5 text-[10.5px] text-ink-faint">
              <ShieldCheck className="h-3 w-3 text-ok" aria-hidden />
              {d.settings.securityHint}
            </p>
          </div>
        </section>

        <section className="p-6 sm:p-8">
          <div className="mb-7 flex items-center justify-between lg:hidden">
            <Brand title={d.meta.title} tagline={d.meta.tagline} />
          </div>
          <div className="mb-6">
            <p className="label-caps">{d.common.securityNote}</p>
            <h2 className="mt-1.5 text-lg font-semibold text-ink">{d.auth.signInTitle}</h2>
            <p className="mt-1.5 text-[12px] leading-5 text-ink-muted">{d.auth.signInSubtitle}</p>
          </div>

          <SignInForm d={d} demoAccounts={demoAccounts} demoPassword={demoPassword} />

          <p className="mt-6 border-t border-line pt-4 text-[10.5px] leading-5 text-ink-faint">
            {d.footer.privacy}
          </p>
        </section>
      </div>
    </div>
  );
}
