import { CheckCircle2, HelpCircle, Lightbulb, MessageSquareQuote } from "lucide-react";
import { Badge, Panel, PanelHeader } from "@/components/ui/primitives";
import type { Dictionary } from "@/i18n/dictionary";
import type { EventRecord, Locale, ReportRecord } from "@/lib/types";
import { CitationList } from "./citation";

function EmptyLine({ text }: { text: string }) {
  return <p className="px-4 py-5 text-[11.5px] leading-5 text-ink-faint">{text}</p>;
}

export function IntelligenceSections({
  event,
  reports,
  d,
  locale,
}: {
  event: EventRecord;
  reports: ReportRecord[];
  d: Dictionary;
  locale: Locale;
}) {
  const claimStatusTone = {
    supported: "ok",
    uncorroborated: "warn",
    contested: "danger",
  } as const;

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Panel>
        <PanelHeader
          title={d.event.confirmedFacts}
          subtitle={d.event.confirmedFactsHint}
          icon={<CheckCircle2 className="h-3.5 w-3.5 text-ok" aria-hidden />}
        />
        <div className="border-t border-line">
          {event.facts.length === 0 ? (
            <EmptyLine text={d.event.noFacts} />
          ) : (
            <ul className="divide-y divide-line">
              {event.facts.map((fact) => (
                <li key={fact.id} className="px-4 py-3">
                  <p className="text-[12px] leading-6 text-ink">{fact.text[locale] || fact.text.en}</p>
                  <div className="mt-1.5">
                    <CitationList reportIds={fact.reportIds} reports={reports} label={d.common.unknown} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Panel>

      <Panel>
        <PanelHeader
          title={d.event.attributedClaims}
          subtitle={d.event.attributedClaimsHint}
          icon={<MessageSquareQuote className="h-3.5 w-3.5 text-accent" aria-hidden />}
        />
        <div className="border-t border-line">
          {event.claims.length === 0 ? (
            <EmptyLine text={d.event.noClaims} />
          ) : (
            <ul className="divide-y divide-line">
              {event.claims.map((claim) => (
                <li key={claim.id} className="px-4 py-3">
                  <p className="text-[12px] leading-6 text-ink">{claim.text[locale] || claim.text.en}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-ink-faint">
                    <Badge
                      tone={claimStatusTone[claim.status]}
                      className="text-[9.5px]"
                    >
                      {claim.status === "supported"
                        ? d.status.corroborated
                        : claim.status === "contested"
                          ? d.event.claimContested
                          : d.event.claimUncorroborated}
                    </Badge>
                    <span>
                      {d.event.attributedClaims.split(" ")[0]}: {claim.attributedTo}
                    </span>
                  </div>
                  <div className="mt-1.5">
                    <CitationList reportIds={claim.reportIds} reports={reports} label={d.common.unknown} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Panel>

      <Panel>
        <PanelHeader
          title={d.event.unresolved}
          subtitle={d.event.unresolvedHint}
          icon={<HelpCircle className="h-3.5 w-3.5 text-warn" aria-hidden />}
        />
        <div className="border-t border-line">
          {event.unknowns.length === 0 ? (
            <EmptyLine text={d.event.noUnknowns} />
          ) : (
            <ul className="divide-y divide-line">
              {event.unknowns.map((question) => (
                <li key={question.id} className="flex items-start gap-2 px-4 py-3">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-warn" aria-hidden />
                  <p className="text-[12px] leading-6 text-ink-muted">
                    {question.text[locale] || question.text.en}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Panel>

      <Panel>
        <PanelHeader
          title={d.event.assessments}
          subtitle={d.event.assessmentsHint}
          icon={<Lightbulb className="h-3.5 w-3.5 text-accent" aria-hidden />}
        />
        <div className="border-t border-line">
          {event.assessments.length === 0 ? (
            <EmptyLine text={d.event.noAssessments} />
          ) : (
            <ul className="divide-y divide-line">
              {event.assessments.map((assessment) => (
                <li key={assessment.id} className="px-4 py-3">
                  <p className="text-[12px] leading-6 text-ink">
                    {assessment.text[locale] || assessment.text.en}
                  </p>
                  <div className="mt-1.5">
                    <CitationList
                      reportIds={assessment.basisReportIds}
                      reports={reports}
                      label={d.common.unknown}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Panel>
    </div>
  );
}
