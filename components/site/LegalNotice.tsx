import Link from "next/link";

export function LegalNotice({ title, updated = "12 July 2026", children }: { title: string; updated?: string; children: React.ReactNode }) {
  return (
    <div className="legal-copy mx-auto max-w-[820px] px-5 py-16 sm:px-8 sm:py-20">
      <Link href="/legal" className="font-mono text-[10px] uppercase tracking-[.12em] text-[var(--blue-ink)]">← Legal &amp; service information</Link>
      <h1 className="page-title mt-6">{title}</h1>
      <p className="font-mono !mt-4 !text-[10px] uppercase tracking-[.1em] text-[var(--ink-faint)]">Working notice · updated {updated}</p>
      <div className="!mt-8 rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm leading-6 text-amber-950"><strong>Legal review pending.</strong> This page records the service’s current operating position in plain language. It has not yet been approved by a qualified solicitor and should not be represented as a completed legal or regulatory review.</div>
      <div className="mt-10">{children}</div>
    </div>
  );
}
