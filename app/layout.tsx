import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "BidReady 24 | UK Tender Compliance Preflight for Cleaning Contractors",
  description: "Upload a UK public-sector tender pack. Get an autonomous, source-cited compliance preflight, evidence gaps, response structure, and receiver assurance pack. Nothing invented.",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#F8F9FA] text-[#1A2332]">
        <header className="border-b border-[#E5E7EB] bg-white">
          <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold text-xl tracking-tight">
              <span className="inline-block w-6 h-6 rounded bg-[#0A3D62] text-white text-center leading-6 text-sm font-bold">BR</span>
              <span className="whitespace-nowrap">BidReady 24</span>
            </Link>
            <nav className="flex items-center gap-2 text-sm sm:gap-4" aria-label="Primary navigation">
              <Link href="/cleaning-tenders" className="hidden hover:text-[#0A3D62] lg:block">For Cleaning Contractors</Link>
              <Link href="/pricing" className="hidden hover:text-[#0A3D62] sm:block">Pricing</Link>
              <Link href="/sample-report" className="hidden hover:text-[#0A3D62] md:block">Sample Report</Link>
              <Link href="/security" className="hidden hover:text-[#0A3D62] lg:block">Security</Link>
              <Link href="/admin" className="hidden rounded border border-[#E5E7EB] px-3 py-1.5 text-xs hover:bg-[#F1F5F9] xl:block">Admin</Link>
              <Link href="/pricing" className="whitespace-nowrap rounded-full bg-[#0A3D62] px-4 py-2 text-xs font-medium text-white hover:bg-[#082C47] sm:text-sm">Get started</Link>
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-[#E5E7EB] bg-white py-8 text-sm text-[#475569]">
          <div className="mx-auto flex max-w-6xl flex-col justify-between gap-4 px-4 sm:px-6 md:flex-row">
            <div>
              © BidReady 24 Ltd. All rights reserved. <span className="text-[#94A3B8]">UK commercial cleaning focus.</span>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link href="/legal/privacy" className="hover:underline">Privacy (draft)</Link>
              <Link href="/legal/terms" className="hover:underline">Terms (draft)</Link>
              <Link href="/legal/refund" className="hover:underline">Refunds (draft)</Link>
              <Link href="/contact" className="hover:underline">Contact</Link>
            </div>
            <div className="text-[#94A3B8]">Source-cited. No invention. Your control.</div>
          </div>
          <div className="mx-auto max-w-6xl px-6 mt-4 text-[11px] text-[#94A3B8]">
            Machine-produced outputs require receiver verification. BidReady 24 does not provide legal, procurement, or financial advice and does not guarantee eligibility, compliance, scoring, submission acceptance, or an award.
          </div>
        </footer>
      </body>
    </html>
  );
}
