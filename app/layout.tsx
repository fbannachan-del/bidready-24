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
  description: "Upload a UK public-sector tender pack. Get a source-cited compliance plan, evidence gaps, and response structure within 24 hours. Built for commercial cleaning SMEs. Nothing invented.",
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
          <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 font-semibold text-xl tracking-tight">
              <span className="inline-block w-6 h-6 rounded bg-[#0A3D62] text-white text-center leading-6 text-sm font-bold">BR</span>
              <span>BidReady 24</span>
            </Link>
            <nav className="flex items-center gap-6 text-sm">
              <Link href="/cleaning-tenders" className="hover:text-[#0A3D62]">For Cleaning Contractors</Link>
              <Link href="/pricing" className="hover:text-[#0A3D62]">Pricing</Link>
              <Link href="/sample-report" className="hover:text-[#0A3D62]">Sample Report</Link>
              <Link href="/security" className="hover:text-[#0A3D62]">Security</Link>
              <Link href="/admin" className="text-xs px-3 py-1.5 rounded border border-[#E5E7EB] hover:bg-[#F1F5F9]">Admin</Link>
              <Link href="#get-started" className="rounded-full bg-[#0A3D62] text-white px-4 py-1.5 text-sm font-medium hover:bg-[#082C47]">Get started</Link>
            </nav>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="border-t border-[#E5E7EB] bg-white py-8 text-sm text-[#475569]">
          <div className="mx-auto max-w-6xl px-6 flex flex-col md:flex-row justify-between gap-4">
            <div>
              © BidReady 24 Ltd. All rights reserved. <span className="text-[#94A3B8]">UK commercial cleaning focus.</span>
            </div>
            <div className="flex gap-4">
              <Link href="/legal/privacy" className="hover:underline">Privacy (draft)</Link>
              <Link href="/legal/terms" className="hover:underline">Terms (draft)</Link>
              <Link href="/legal/refund" className="hover:underline">Refund (draft)</Link>
              <Link href="/contact" className="hover:underline">Contact</Link>
            </div>
            <div className="text-[#94A3B8]">Source-cited. No invention. Your control.</div>
          </div>
          <div className="mx-auto max-w-6xl px-6 mt-4 text-[11px] text-[#94A3B8]">
            This is pre-launch software. All legal pages are drafts and require owner + qualified legal review before publication. Not legal, procurement, or financial advice.
          </div>
        </footer>
      </body>
    </html>
  );
}
