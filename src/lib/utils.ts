import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { EventStatus, Locale, Severity } from "@/lib/types";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

const LOCALE_TAG: Record<Locale, string> = { fa: "fa-IR", en: "en-GB" };

export function formatDateTime(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(LOCALE_TAG[locale], {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatDate(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(LOCALE_TAG[locale], { dateStyle: "medium" }).format(date);
}

export function relativeTime(iso: string | null | undefined, locale: Locale): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const diffMs = then - Date.now();
  const abs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (abs < 60_000) return rtf.format(0, "second");
  if (abs < 3_600_000) return rtf.format(Math.round(diffMs / 60_000), "minute");
  if (abs < 86_400_000) return rtf.format(Math.round(diffMs / 3_600_000), "hour");
  if (abs < 7 * 86_400_000) return rtf.format(Math.round(diffMs / 86_400_000), "day");
  return formatDate(iso, locale);
}

const RELATIVE_FALLBACK: Record<Locale, (value: number, unit: "minute" | "hour" | "day") => string> = {
  fa: (value, unit) => {
    const labels = { minute: "دقیقه", hour: "ساعت", day: "روز" };
    return `${new Intl.NumberFormat("fa-IR").format(Math.abs(value))} ${labels[unit]} پیش`;
  },
  en: (value, unit) => `${Math.abs(value)} ${unit}${Math.abs(value) === 1 ? "" : "s"} ago`,
};

/** Relative time that never renders an empty string in unusual environments. */
export function timeAgo(iso: string | null | undefined, locale: Locale): string {
  try {
    const value = relativeTime(iso, locale);
    return value || "—";
  } catch {
    const diff = Date.now() - new Date(iso ?? 0).getTime();
    if (!Number.isFinite(diff)) return "—";
    if (diff < 3_600_000) return RELATIVE_FALLBACK[locale](Math.round(diff / 60_000), "minute");
    if (diff < 86_400_000) return RELATIVE_FALLBACK[locale](Math.round(diff / 3_600_000), "hour");
    return RELATIVE_FALLBACK[locale](Math.round(diff / 86_400_000), "day");
  }
}

export function severityColor(severity: Severity): string {
  switch (severity) {
    case 1:
      return "var(--ink-faint)";
    case 2:
      return "var(--ok)";
    case 3:
      return "var(--warn)";
    case 4:
      return "var(--danger)";
    case 5:
      return "var(--critical)";
  }
}

export const STATUS_TONE: Record<EventStatus, string> = {
  unverified: "neutral",
  developing: "info",
  corroborated: "accent",
  verified: "ok",
  retracted: "danger",
};

export function safeExternalUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function percent(value: number): string {
  return `${Math.round(clamp(value, 0, 1) * 100)}%`;
}
