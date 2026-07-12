import Link from "next/link";
import { Logo } from "./Logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--border)] bg-white">
      <div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1.35fr_1fr_1fr_1fr]">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-4 text-sm leading-6 text-[var(--slate)]">Source-cited tender preflight for UK commercial cleaning SMEs. Every conclusion stays connected to the document that supports it.</p>
          <p className="mt-4 text-sm text-[var(--slate)]">
            <a href="mailto:hello@bidready24.com" className="font-medium text-[var(--blue-ink)] underline underline-offset-4 hover:text-[var(--ink)]">hello@bidready24.com</a>
          </p>
          <p className="mt-4 font-mono text-[10px] uppercase tracking-[.14em] text-[var(--ink-faint)]">Every requirement, traced to source.</p>
        </div>
        <div>
          <p className="footer-heading">Product</p>
          <div className="footer-links"><Link href="/#how-it-works">How it works</Link><Link href="/#deliverables">Deliverables</Link><Link href="/pricing">Pricing</Link><Link href="/alerts">Tender alerts</Link><Link href="/sample-report">Sample report</Link></div>
        </div>
        <div>
          <p className="footer-heading">Trust</p>
          <div className="footer-links"><Link href="/security">Security &amp; data</Link><Link href="/legal/privacy">Privacy notice</Link><Link href="/legal/data">Data handling</Link><Link href="/legal/acceptable-use">Acceptable use</Link></div>
        </div>
        <div>
          <p className="footer-heading">Company</p>
          <div className="footer-links"><Link href="/cleaning-tenders">For cleaning contractors</Link><Link href="/account/login">Account</Link><Link href="/login">Project link</Link><Link href="/contact">Contact &amp; support</Link><Link href="/legal/terms">Terms</Link><Link href="/legal/refund">Refunds</Link></div>
        </div>
      </div>
      <div className="border-t border-[var(--border)]">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-3 px-5 py-6 text-[11px] leading-5 text-[var(--ink-faint)] sm:px-8 md:flex-row md:items-start md:justify-between">
          <p>© {new Date().getFullYear()} BIDREADY24. All rights reserved.</p>
          <p className="max-w-3xl md:text-right">Outputs require receiver verification. BIDREADY24 does not provide legal, procurement or financial advice, and does not guarantee eligibility, compliance, submission acceptance, scoring or contract award.</p>
        </div>
      </div>
    </footer>
  );
}
