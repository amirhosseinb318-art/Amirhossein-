import type { Locale } from "@/lib/types";
import fa from "./locales/fa";
import en from "./locales/en";

export type Dictionary = typeof fa;

export const dictionaries: Record<Locale, Dictionary> = { fa, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export function directionFor(locale: Locale): "rtl" | "ltr" {
  return locale === "fa" ? "rtl" : "ltr";
}
