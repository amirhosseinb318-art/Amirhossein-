"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { Select } from "@/components/ui/forms";
import { Button } from "@/components/ui/button";
import type { Dictionary } from "@/i18n/dictionary";
import type { EventCategory, EventStatus, Severity } from "@/lib/types";

export interface FeedFilterOptions {
  categories: EventCategory[];
  statuses: EventStatus[];
  severities: Severity[];
  regions: string[];
}

export function FeedFilters({
  d,
  options,
  initial,
}: {
  d: Dictionary;
  options: FeedFilterOptions;
  initial: {
    q: string;
    status: string;
    category: string;
    severity: string;
    region: string;
    window: string;
    sort: string;
  };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState(initial.q);
  const [expanded, setExpanded] = useState(false);
  const firstRender = useRef(true);

  function apply(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (!value || value === "all") params.delete(key);
      else params.set(key, value);
    }
    params.delete("page");
    startTransition(() => {
      router.replace(`/feed?${params.toString()}`, { scroll: false });
    });
  }

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      if (query !== initial.q) apply({ q: query });
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const activeCount = [
    initial.q,
    initial.status !== "all" ? initial.status : "",
    initial.category !== "all" ? initial.category : "",
    initial.severity !== "all" ? initial.severity : "",
    initial.region !== "all" ? initial.region : "",
    initial.window !== "any" ? initial.window : "",
  ].filter(Boolean).length;

  return (
    <div className="rounded-xl border border-line bg-panel">
      <div className="flex flex-wrap items-center gap-2 p-3">
        <div className="relative min-w-0 flex-1 basis-64">
          <Search
            className="pointer-events-none absolute inset-y-0 start-3 my-auto h-3.5 w-3.5 text-ink-faint"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={d.common.searchPlaceholder}
            aria-label={d.feed.searchLabel}
            className="h-9 w-full rounded-lg border border-line bg-canvas/50 ps-8 pe-3 text-[12.5px] text-ink placeholder:text-ink-faint/80 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/15"
          />
          {pending ? (
            <Loader2 className="absolute inset-y-0 end-3 my-auto h-3.5 w-3.5 animate-spin text-accent" aria-hidden />
          ) : null}
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
          className="lg:hidden"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
          {d.common.filters}
          {activeCount > 0 ? (
            <span className="num rounded bg-accent-soft px-1 text-[10px] text-accent">{activeCount}</span>
          ) : null}
        </Button>

        <div className={`${expanded ? "flex" : "hidden"} w-full flex-wrap items-center gap-2 lg:flex lg:w-auto`}>
          <Select
            aria-label={d.common.status}
            value={initial.status}
            onChange={(event) => apply({ status: event.target.value })}
            className="h-8 w-auto min-w-28 text-[11.5px]"
          >
            <option value="all">{d.common.status}: {d.common.all}</option>
            {options.statuses.map((status) => (
              <option key={status} value={status}>
                {d.status[status]}
              </option>
            ))}
          </Select>

          <Select
            aria-label={d.common.category}
            value={initial.category}
            onChange={(event) => apply({ category: event.target.value })}
            className="h-8 w-auto min-w-24 text-[11.5px]"
          >
            <option value="all">{d.common.category}: {d.common.all}</option>
            {options.categories.map((category) => (
              <option key={category} value={category}>
                {d.category[category]}
              </option>
            ))}
          </Select>

          <Select
            aria-label={d.common.severity}
            value={initial.severity}
            onChange={(event) => apply({ severity: event.target.value })}
            className="h-8 w-auto min-w-28 text-[11.5px]"
          >
            <option value="all">{d.common.severity}: {d.common.all}</option>
            {options.severities.map((severity) => (
              <option key={severity} value={String(severity)}>
                {severity} · {d.severity[severity]}
              </option>
            ))}
          </Select>

          {options.regions.length > 0 ? (
            <Select
              aria-label={d.common.region}
              value={initial.region}
              onChange={(event) => apply({ region: event.target.value })}
              className="h-8 w-auto min-w-24 text-[11.5px]"
            >
              <option value="all">{d.common.region}: {d.common.all}</option>
              {options.regions.map((region) => (
                <option key={region} value={region}>
                  {region}
                </option>
              ))}
            </Select>
          ) : null}

          <Select
            aria-label={d.feed.timeWindow}
            value={initial.window}
            onChange={(event) => apply({ window: event.target.value })}
            className="h-8 w-auto min-w-24 text-[11.5px]"
          >
            <option value="any">{d.feed.anyTime}</option>
            <option value="24">{d.feed.last24h}</option>
            <option value="72">{d.feed.last72h}</option>
            <option value="168">{d.feed.last7d}</option>
          </Select>

          <Select
            aria-label={d.feed.sortBy}
            value={initial.sort}
            onChange={(event) => apply({ sort: event.target.value })}
            className="h-8 w-auto min-w-28 text-[11.5px]"
          >
            <option value="recent">{d.feed.sortRecent}</option>
            <option value="severity">{d.feed.sortSeverity}</option>
            <option value="confidence">{d.feed.sortConfidence}</option>
          </Select>

          {activeCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQuery("");
                startTransition(() => router.replace("/feed", { scroll: false }));
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              {d.common.clearFilters}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
