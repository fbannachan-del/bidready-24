import Link from "next/link";
import { Logo } from "./Logo";

const navigation = [
  ["How it works", "/#how-it-works"],
  ["What you get", "/#deliverables"],
  ["For cleaning", "/cleaning-tenders"],
  ["Live tenders", "/cleaning-tenders/jobs"],
  ["Alerts", "/alerts"],
  ["Security", "/security"],
  ["Pricing", "/pricing"],
] as const;

export function SiteHeader() {
  return (
    <header className="site-header border-b border-[var(--border)] bg-[color:rgba(250,249,246,.92)] backdrop-blur-xl">
      <div className="mx-auto flex min-h-[72px] max-w-[1240px] items-center justify-between gap-5 px-5 sm:px-8">
        <Logo />
        <nav className="hidden items-center gap-7 text-[13px] font-medium text-[var(--slate)] lg:flex" aria-label="Primary navigation">
          {navigation.map(([label, href]) => (
            <Link key={href} href={href} className="transition-colors hover:text-[var(--ink)]">{label}</Link>
          ))}
        </nav>
        <div className="flex items-center gap-2.5">
          <Link href="/login" className="hidden text-[13px] font-medium text-[var(--slate)] transition-colors hover:text-[var(--ink)] sm:block">
            Open your project
          </Link>
          <Link href="/sample-report" className="hidden text-[13px] font-medium text-[var(--slate)] transition-colors hover:text-[var(--ink)] md:block">
            Sample report
          </Link>
          <Link href="/pricing" className="button-primary !hidden !min-h-10 !px-4 !text-[13px] sm:!inline-flex">
            Start a preflight
          </Link>
          <details className="relative lg:hidden">
            <summary className="grid h-10 w-10 cursor-pointer place-items-center rounded-lg border border-[var(--border-strong)] bg-white text-[var(--ink)]" aria-label="Open navigation">
              <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            </summary>
            <nav className="absolute right-0 top-12 z-50 w-56 rounded-xl border border-[var(--border)] bg-white p-2 shadow-[0_18px_55px_rgba(43,48,61,.16)]" aria-label="Mobile navigation">
              {navigation.map(([label, href]) => <Link key={href} href={href} className="block rounded-lg px-3 py-2.5 text-sm text-[var(--slate)] hover:bg-[var(--paper)] hover:text-[var(--ink)]">{label}</Link>)}
              <Link href="/login" className="block rounded-lg px-3 py-2.5 text-sm text-[var(--slate)] hover:bg-[var(--paper)] hover:text-[var(--ink)]">Open your project</Link>
              <Link href="/sample-report" className="block rounded-lg px-3 py-2.5 text-sm text-[var(--slate)] hover:bg-[var(--paper)] hover:text-[var(--ink)]">Sample report</Link>
              <Link href="/contact" className="block rounded-lg px-3 py-2.5 text-sm text-[var(--slate)] hover:bg-[var(--paper)] hover:text-[var(--ink)]">Contact</Link>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
