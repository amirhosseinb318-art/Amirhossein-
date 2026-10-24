import Link from "next/link";
import { Bell, Cpu, Database, KeyRound, RadioTower, ShieldCheck, Smartphone, UserRound } from "lucide-react";
import { getI18n, getTheme } from "@/i18n/server";
import { getSession } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { getRepo, repositoryMode } from "@/lib/store";
import { providerStatus } from "@/lib/ai";
import { pushConfigured, serverEnv, supabaseConfigured } from "@/lib/config";
import { formatDateTime, timeAgo } from "@/lib/utils";
import type { IngestionRunRecord, SourceRecord, UserRecord } from "@/lib/types";
import { Badge, KeyValue, PageHeader, Panel, PanelHeader } from "@/components/ui/primitives";
import { ButtonLink } from "@/components/ui/button";
import { DisplayPreferences, PasswordForm } from "@/components/settings/settings-forms";

export const dynamic = "force-dynamic";

function ServiceRow({
  icon: Icon,
  label,
  hint,
  connected,
  statusLabel,
}: {
  icon: typeof Database;
  label: string;
  hint: string;
  connected: boolean;
  statusLabel: string;
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line bg-panel-soft text-ink-muted">
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[12px] font-medium text-ink">{label}</p>
          <Badge tone={connected ? "ok" : "warn"} dot>
            {statusLabel}
          </Badge>
        </div>
        <p className="mt-0.5 text-[10.5px] leading-4 text-ink-faint">{hint}</p>
      </div>
    </div>
  );
}

export default async function SettingsPage() {
  const { locale, d } = await getI18n();
  const theme = await getTheme();
  const session = await getSession();
  const settings = await getSettings(session!.id);
  const repo = await getRepo();
  const account = await repo.get<UserRecord>("users", session!.id);
  const sources = await repo.list<SourceRecord>("sources");
  const runs = await repo.list<IngestionRunRecord>("ingestionRuns");
  const lastRun = runs
    .filter((run) => run.finishedAt)
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))[0];
  const provider = providerStatus();

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={d.nav.settings}
        title={d.settings.title}
        description={d.settings.subtitle}
        meta={
          <>
            <Badge tone="outline">{d.role[session!.role]}</Badge>
            <span className="flex items-center gap-1.5 text-[11px] text-ink-faint">
              <ShieldCheck className="h-3 w-3 text-ok" aria-hidden />
              {d.common.securityNote}
            </span>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader
            title={d.settings.profile}
            subtitle={d.settings.profileHint}
            icon={<UserRound className="h-3.5 w-3.5" aria-hidden />}
          />
          <div className="border-t border-line px-4 py-3">
            <dl className="divide-y divide-line text-[12px]">
              <KeyValue label={d.common.name} value={session!.name} />
              <KeyValue label={d.common.email} value={<span dir="ltr">{session!.email}</span>} />
              <KeyValue label={d.common.role} value={d.role[session!.role]} />
              <KeyValue
                label={d.common.securityNote}
                value={account?.createdAt ? formatDateTime(account.createdAt, locale) : "—"}
              />
              <KeyValue
                label={d.settings.lastIngestion}
                value={account?.lastLoginAt ? timeAgo(account.lastLoginAt, locale) : "—"}
              />
            </dl>
            <p className="mt-2 text-[10px] leading-4 text-ink-faint">{d.settings.timezoneNote}</p>
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title={d.settings.preferences}
            subtitle={d.settings.servicesHint}
            icon={<Cpu className="h-3.5 w-3.5" aria-hidden />}
          />
          <div className="border-t border-line p-4">
            <DisplayPreferences locale={locale} theme={theme} d={d} />
          </div>
          <div className="border-t border-line px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[11.5px] text-ink-muted">
                <Bell className="h-3.5 w-3.5 text-ink-faint" aria-hidden />
                {d.notifications.preferences}
              </div>
              <ButtonLink href="/notifications" variant="ghost" size="sm">
                {d.common.open}
              </ButtonLink>
            </div>
            <p className="mt-1 text-[10px] leading-4 text-ink-faint">
              {settings.alertCategories.length} {d.notifications.categories} · {d.notifications.minSeverity}:{" "}
              {settings.minSeverity}
              {settings.pushEnabled ? ` · ${d.notifications.channelPush}` : ""}</p>
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title={d.settings.changePassword}
            subtitle={d.settings.securityHint}
            icon={<KeyRound className="h-3.5 w-3.5" aria-hidden />}
          />
          <div className="border-t border-line p-4">
            <PasswordForm d={d} />
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title={d.settings.services}
            subtitle={d.settings.servicesHint}
            icon={<RadioTower className="h-3.5 w-3.5" aria-hidden />}
          />
          <div className="divide-y divide-line border-t border-line">
            <ServiceRow
              icon={Database}
              label={d.settings.supabase}
              hint={repositoryMode() === "supabase" ? "PostgreSQL + RLS" : d.overview.localStore}
              connected={supabaseConfigured()}
              statusLabel={supabaseConfigured() ? d.settings.connected : d.settings.missing}
            />
            <ServiceRow
              icon={Cpu}
              label={d.settings.ai}
              hint={provider.configured ? `${provider.provider} · ${provider.model}` : d.analysis.configHint}
              connected={provider.configured}
              statusLabel={provider.configured ? d.settings.connected : d.settings.missing}
            />
            <ServiceRow
              icon={Smartphone}
              label={d.settings.push}
              hint={pushConfigured() ? d.notifications.pushHint : d.notifications.pushUnavailable}
              connected={pushConfigured()}
              statusLabel={pushConfigured() ? d.settings.connected : d.settings.missing}
            />
            <ServiceRow
              icon={RadioTower}
              label={d.settings.ingestion}
              hint={
                lastRun
                  ? `${formatDateTime(lastRun.startedAt, locale)} · ${lastRun.itemsNew} new · ${sources.filter((source) => source.enabled).length}/${sources.length} enabled`
                  : d.overview.ingestionNever
              }
              connected={Boolean(lastRun) && lastRun.status !== "failed"}
              statusLabel={lastRun ? d.settings.connected : d.settings.missing}
            />
          </div>
          <div className="border-t border-line px-4 py-3">
            <p className="text-[10px] leading-4 text-ink-faint">{d.settings.envDocs}</p>
            {!serverEnv.cronSecret ? (
              <p className="mt-1 text-[10px] leading-4 text-warn">{d.admin.workerWarning}</p>
            ) : null}
          </div>
        </Panel>
      </div>

      <Panel className="p-4">
        <p className="text-[10.5px] leading-5 text-ink-faint">
          <Link href="/notifications" className="font-medium text-accent hover:underline focus-ring">
            {d.notifications.preferences}
          </Link>{" "}
          · {d.footer.privacy} · {d.common.demoBannerTitle === "" ? "" : d.settings.envDocs}
        </p>
      </Panel>
    </div>
  );
}
