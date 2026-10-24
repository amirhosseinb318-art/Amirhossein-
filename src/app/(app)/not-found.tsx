import { SearchX } from "lucide-react";
import { getI18n } from "@/i18n/server";
import { ButtonLink } from "@/components/ui/button";

export default async function NotFound() {
  const { d } = await getI18n();
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-24 text-center">
      <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-panel text-ink-faint">
        <SearchX className="h-5 w-5" aria-hidden />
      </span>
      <h1 className="text-lg font-semibold text-ink">{d.event.notFound}</h1>
      <p className="mt-2 text-[12.5px] leading-6 text-ink-muted">{d.event.notFoundBody}</p>
      <ButtonLink href="/feed" variant="secondary" size="sm" className="mt-4">
        {d.event.backToFeed}
      </ButtonLink>
    </div>
  );
}
