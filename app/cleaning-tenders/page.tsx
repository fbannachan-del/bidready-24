import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

export const metadata: Metadata = { title: "Tender preflight for commercial cleaning contractors", description: "Source-cited public-sector tender analysis for UK commercial cleaning SMEs." };

const themes = [
  ["Eligibility and assurance", ["Insurance minima and required certificates", "SSIP, CHAS or stated equivalents", "Financial standing and exclusion grounds", "References and contract experience"]],
  ["People and mobilisation", ["TUPE information and assumptions", "Mobilisation period and transition milestones", "Safeguarding and DBS conditions", "Training, supervision and staffing models"]],
  ["Service delivery", ["Site lists, frequencies and task schedules", "COSHH, RAMS and chemical controls", "Quality checks, KPIs and rectification", "Equipment, consumables and specialist services"]],
  ["Evaluation and submission", ["Quality questions, weightings and word limits", "Social value and environmental responses", "Pricing schedules and calculation rules", "Attachments, declarations and signatures"]],
] as const;

export default function CleaningTenders() {
  return (
    <div>
      <section className="border-b border-[var(--border)] px-5 py-20 sm:px-8 sm:py-28"><div className="mx-auto grid max-w-[1120px] gap-12 lg:grid-cols-[1.05fr_.95fr] lg:items-center"><div><p className="eyebrow">For UK commercial cleaning SMEs</p><h1 className="page-title mt-5">See the whole tender before you commit the team.</h1><p className="body-large mt-7 max-w-2xl">Cleaning tenders scatter pass/fail conditions, service schedules, TUPE assumptions, quality questions and pricing rules across dozens of files. BIDREADY24 brings them into one source-cited preflight.</p><div className="mt-9 flex flex-col gap-3 sm:flex-row"><Link href="/pricing" className="button-primary">Start a cleaning preflight <ArrowRight className="h-4 w-4" /></Link><Link href="/sample-report" className="button-secondary">View a cleaning example</Link></div></div>
        <div className="rounded-2xl border border-[var(--border-strong)] bg-white p-6 shadow-[0_24px_70px_rgba(43,48,61,.1)]"><p className="font-mono text-[10px] uppercase tracking-[.12em] text-[var(--ink-faint)]">Bid / no-bid signal</p><p className="mt-5 font-serif text-3xl font-medium">Resolve before proceeding</p><div className="mt-6 grid gap-3">{[["SSIP condition", "Missing", "red"], ["Insurance threshold", "Uncertain", "amber"], ["Mandatory site visit", "Booked", "green"], ["Mobilisation capacity", "Evidence found", "green"]].map(([item, status, tone]) => <div key={item} className="flex items-center justify-between gap-4 border-b border-[var(--border)] pb-3 text-sm"><span>{item}</span><span className={`status-chip ${tone === "red" ? "bg-red-50 text-red-700" : tone === "amber" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>{status}</span></div>)}</div><span className="citation-chip mt-5">Decision basis · 4 source-linked checks</span></div>
      </div></section>

      <section className="px-5 py-20 sm:px-8 sm:py-24"><div className="mx-auto max-w-[1120px]"><div className="max-w-3xl"><p className="eyebrow">Cleaning-specific coverage</p><h2 className="section-title mt-4">The operating detail that decides whether a bid is viable</h2><p className="body-large mt-5">The system does not assume a generic questionnaire. It classifies the requirements that repeatedly matter in contracted cleaning.</p></div><div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--border)] md:grid-cols-2">{themes.map(([title, items], index) => <article key={title} className="bg-white p-7"><div className="flex justify-between"><h3 className="font-serif text-2xl font-medium">{title}</h3><span className="font-mono text-[10px] text-[var(--signal-blue)]">0{index + 1}</span></div><ul className="mt-6 grid gap-3">{items.map(item => <li key={item} className="flex gap-3 text-sm text-[var(--slate)]"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--verify-green)]" />{item}</li>)}</ul></article>)}</div></div></section>

      <section className="border-y border-[var(--border)] bg-white px-5 py-20 sm:px-8"><div className="mx-auto grid max-w-[1120px] gap-12 lg:grid-cols-[.85fr_1.15fr]"><div><p className="eyebrow">Why traceability matters</p><h2 className="section-title mt-4">A requirement without its source is another thing to re-check.</h2></div><div className="grid gap-5 sm:grid-cols-2">{[
        ["Fast bid/no-bid", "See pass/fail gaps and hard timetable conflicts before days of writing are committed."],
        ["Cleaner hand-offs", "Give operations, HR, finance and H&S an action with the exact tender reference attached."],
        ["Fewer silent omissions", "Keep forms, schedules, certificates, declarations and signatures in the same structured view."],
        ["Evidence-safe drafting", "Response structures use supplied facts and visible placeholders, not plausible invented claims."],
      ].map(([title, copy]) => <article key={title} className="panel p-6"><h3 className="font-serif text-xl font-medium">{title}</h3><p className="mt-3 text-sm leading-6 text-[var(--slate)]">{copy}</p></article>)}</div></div></section>

      <section className="px-5 py-20 sm:px-8"><div className="mx-auto flex max-w-[1120px] flex-col items-start justify-between gap-8 rounded-2xl bg-[var(--ink-panel)] p-8 text-white sm:p-12 md:flex-row md:items-center"><div><p className="font-mono text-[10px] uppercase tracking-[.14em] text-[#9caae5]">Ready when the tender is</p><h2 className="mt-3 font-serif text-3xl font-medium">Start with the pack already on your desk.</h2><p className="mt-3 max-w-xl text-sm leading-6 text-[#c9cdd6]">One fixed-price project. Upload the buyer files, add the facts you can support and run the source-cited preflight.</p></div><Link href="/pricing" className="button-primary shrink-0">Choose your pack <ArrowRight className="h-4 w-4" /></Link></div></section>
    </div>
  );
}
