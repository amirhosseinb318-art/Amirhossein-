import { getLocale, getTheme } from "@/i18n/server";

export const dynamic = "force-dynamic";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  await getLocale();
  await getTheme();
  return <div className="app-background flex min-h-dvh flex-col">{children}</div>;
}
