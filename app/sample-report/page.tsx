import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarClock, CircleAlert, FileCheck2, Target } from "lucide-react";
import { BrandWordmark } from "@/components/site/Logo";

export const metadata: Metadata = { title: "Sample tender preflight", description: "Explore a synthetic BIDREADY24 tender preflight with source-cited requirements, scored questions and evidence gaps." };

const requirements = [
  { title: "Public liability insurance · £10m minimum", source: "Specification §3.1 · p.7", status: "Uncertain", tone: "amber", action: "Supply a legible current certificate showing the insured limit." },
  { title: "CHAS or accepted SSIP equivalent", source: "Selection form · Q12 · p.4", status: "Missing", tone: "red", action: "Confirm accepted equivalents with the buyer before the clarification cut-off." },
  { title: "Enhanced DBS for education-site operatives", source: "Safeguarding schedule §5 · p.19", status: "Evidence found", tone: "green", action: "Verify the policy and sample evidence remain current at submission." },
] as const;

export default function SampleReport() {
  return (
    <div className="bg-[#f5f4f1] py-8 sm:py-14">
      <div className="mx-auto max-w-[1180px] px-4 sm:px-8">
        <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="eyebrow">Synthetic demonstration · no customer data</p><h1 className="mt-3 font-serif text-3xl font-medium tracking-[-.035em] sm:text-4xl">Borough Council Cleaning Services 2026–2029</h1><p className="mt-2 text-sm text-[var(--slate)]">Tender ref BC/CLEAN/2026/014 · example output only</p></div><Link href="/pricing" className="button-primary !min-h-10 !text-sm">Analyse your tender <ArrowRight className="h-4 w-4" /></Link></div>

        <div className="overflow-hidden rounded-2xl border border-[var(--border-strong)] bg-white shadow-[0_24px_70px_rgba(43,48,61,.10)]">
          <div className="grid border-b border-[var(--border)] bg-[#f8f7f4] md:grid-cols-[220px_1fr]">
            <div className="border-r border-[var(--border)] p-5"><BrandWordmark className="text-[15px]" /></div>
            <div className="flex flex-wrap gap-1 px-5 py-3 text-xs">{["Overview", "Requirements", "Scored questions", "Evidence gaps", "Action plan"].map((item, index) => <span key={item} className={`rounded-md px-3 py-2 ${index === 0 ? "bg-[var(--blue-soft)] font-medium text-[var(--blue-ink)]" : "text-[var(--slate)]"}`}>{item}</span>)}</div>
          </div>
          <div className="grid md:grid-cols-[220px_1fr]">
            <aside className="hidden border-r border-[var(--border)] bg-[#fbfaf8] p-5 md:block"><p className="font-mono text-[9px] uppercase tracking-[.12em] text-[var(--ink-faint)]">Report status</p><div className="mt-5 rounded-xl border border-[var(--border)] bg-white p-4"><p className="text-xs text-[var(--slate)]">Readiness</p><p className="mt-1 font-serif text-4xl font-medium">68<span className="text-base text-[var(--ink-faint)]">/100</span></p><div className="mt-3 flex gap-1">{["bg-[var(--gap-red)]", "bg-[var(--review-amber)]", "bg-[var(--review-amber)]", "bg-[var(--verify-green)]", "bg-[var(--verify-green)]"].map((c, i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${c}`} />)}</div></div><div className="mt-6 space-y-3 text-[11px] text-[var(--slate)]"><p><span className="block font-mono text-[9px] uppercase text-[var(--ink-faint)]">Submission</span>14 Aug 2026 · 12:00</p><p><span className="block font-mono text-[9px] uppercase text-[var(--ink-faint)]">Clarifications</span>31 Jul 2026 · 17:00</p><p><span className="block font-mono text-[9px] uppercase text-[var(--ink-faint)]">Buyer portal</span>Named in tender pack</p></div></aside>
            <main className="p-5 sm:p-8">
              <div className="flex flex-col justify-between gap-4 border-b border-[var(--border)] pb-6 lg:flex-row"><div><p className="font-mono text-[9px] uppercase tracking-[.12em] text-[var(--ink-faint)]">Executive summary</p><h2 className="mt-2 font-serif text-2xl font-medium">Proceed only after the critical accreditation gap is resolved.</h2><p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--slate)]">This three-year multi-site cleaning contract has one unresolved pass/fail accreditation condition and an uncertain insurance threshold. Quality accounts for 60% of the stated evaluation and includes a mandatory site visit.</p></div><span className="status-chip h-fit bg-amber-50 text-amber-700">Decision required</span></div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
                [FileCheck2, "28", "Requirements"], [Target, "7", "Scored questions"], [CircleAlert, "3", "Critical gaps"], [CalendarClock, "4", "Key dates"],
              ].map(([Icon, value, label]) => { const MetricIcon = Icon as typeof FileCheck2; return <div key={String(label)} className="rounded-xl border border-[var(--border)] p-4"><MetricIcon className="h-4 w-4 text-[var(--signal-blue)]" /><p className="mt-4 font-serif text-3xl font-medium">{String(value)}</p><p className="text-[11px] text-[var(--slate)]">{String(label)}</p></div>; })}</div>

              <section className="mt-8"><div className="flex items-center justify-between"><h3 className="font-serif text-xl font-medium">Priority requirements</h3><span className="font-mono text-[9px] uppercase tracking-[.1em] text-[var(--ink-faint)]">3 of 28 shown</span></div><div className="mt-4 overflow-hidden rounded-xl border border-[var(--border)]">{requirements.map((row, index) => <article key={row.title} className={`grid gap-4 p-4 sm:grid-cols-[1fr_auto] ${index ? "border-t border-[var(--border)]" : ""}`}><div><p className="text-sm font-medium">{row.title}</p><span className="citation-chip mt-2">{row.source}</span><p className="mt-3 text-xs leading-5 text-[var(--slate)]">Next action: {row.action}</p></div><span className={`status-chip h-fit ${row.tone === "red" ? "bg-red-50 text-red-700" : row.tone === "green" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{row.status}</span></article>)}</div></section>

              <div className="mt-8 grid gap-4 lg:grid-cols-2"><section className="rounded-xl border border-[var(--border)] p-5"><p className="font-mono text-[9px] uppercase tracking-[.1em] text-[var(--ink-faint)]">Highest weighted question</p><h3 className="mt-3 font-serif text-xl font-medium">Service delivery and quality assurance</h3><p className="mt-2 text-sm leading-6 text-[var(--slate)]">1,500 words · 12% weighting · address audit, supervision, rectification and continuous improvement.</p><span className="citation-chip mt-4">Quality schedule · Q2 · p.11</span></section><section className="rounded-xl border border-red-200 bg-red-50/60 p-5"><p className="font-mono text-[9px] uppercase tracking-[.1em] text-red-700">Critical evidence gap</p><h3 className="mt-3 font-serif text-xl font-medium text-red-950">SSIP evidence not supplied</h3><p className="mt-2 text-sm leading-6 text-red-900">The tender marks this condition pass/fail. The sample company record contains no current certificate or buyer-approved equivalent.</p></section></div>
            </main>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-5 text-xs leading-5 text-amber-950"><strong>About this sample:</strong> every organisation, document, requirement and evidence item shown here is synthetic. It demonstrates the report structure, not a buyer interpretation or compliance decision. Real outputs must be checked against the uploaded tender pack by the receiver.</div>
      </div>
    </div>
  );
}
