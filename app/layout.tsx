import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, IBM_Plex_Serif } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
});

const plexSerif = IBM_Plex_Serif({
  variable: "--font-plex-serif",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || "https://bidready24.com"),
  title: { default: "BIDREADY24 | Every requirement, traced to source", template: "%s | BIDREADY24" },
  description: "Turn a UK public-sector tender pack into a source-cited compliance preflight, evidence-gap plan and traceable response workspace. Nothing invented.",
  icons: { icon: [{ url: "/icon.svg?v=3", type: "image/svg+xml" }], shortcut: "/favicon.ico?v=3", apple: "/icon.svg?v=3" },
  openGraph: {
    title: "BIDREADY24 | Every requirement, traced to source",
    description: "Source-cited tender preflight for UK commercial cleaning SMEs.",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${plexSans.variable} ${plexSerif.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[var(--paper)] text-[var(--ink)]">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
