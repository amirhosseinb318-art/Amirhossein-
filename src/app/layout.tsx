import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getLocale, getTheme } from "@/i18n/server";

export const metadata: Metadata = {
  title: {
    default: "AI Crisis Radar",
    template: "%s · AI Crisis Radar",
  },
  description:
    "Private, invitation-only crisis intelligence: public sources, evidence-backed verification and reviewed alerts.",
  applicationName: "AI Crisis Radar",
  robots: { index: false, follow: false, nocache: true },
  icons: { icon: "/icon.svg" },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#080a0d" },
    { media: "(prefers-color-scheme: light)", color: "#f5f6f8" },
  ],
  colorScheme: "dark light",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const theme = await getTheme();

  return (
    <html
      lang={locale}
      dir={locale === "fa" ? "rtl" : "ltr"}
      className={theme === "dark" ? "dark" : undefined}
      suppressHydrationWarning
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300..700&family=Vazirmatn:wght@300..800&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
