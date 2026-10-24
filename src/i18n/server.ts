import { cookies } from "next/headers";
import { getDictionary, type Dictionary } from "./dictionary";
import type { Locale } from "@/lib/types";

export const LOCALE_COOKIE = "radar_locale";
export const THEME_COOKIE = "radar_theme";

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  return store.get(LOCALE_COOKIE)?.value === "en" ? "en" : "fa";
}

export async function getTheme(): Promise<"dark" | "light"> {
  const store = await cookies();
  return store.get(THEME_COOKIE)?.value === "light" ? "light" : "dark";
}

export async function getI18n(): Promise<{ locale: Locale; d: Dictionary; dir: "rtl" | "ltr" }> {
  const locale = await getLocale();
  return { locale, d: getDictionary(locale), dir: locale === "fa" ? "rtl" : "ltr" };
}
