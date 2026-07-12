import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, Minus } from "lucide-react";

export const metadata: Metadata = { title: "Pricing", description: "Fixed-price tender preflight and complete response pack pricing for UK commercial cleaning contractors." };

const plans = [
  {
    name: "Tender Preflight",
    price: "£149",
    strapline: "Know exactly what the tender asks before your team starts writing.",
    type: "preflight",
    featured: false,
    items: ["Source-cited requirement register", "Scored questions, limits and weightings", "Deadlines, attachments and signature checks", "Prioritised evidence-gap action plan", "Buyer clarification question register", "Response plan and suggested internal timetable", "Web workspace, CSV and print-to-PDF output", "Receiver assurance and citation checks"],
  },
  {
    name: "Complete Pack",
    price: "£349",
    strapline: "Move from preflight into a source-bound response structure.",
    type: "complete",
    featured: true,
    items: ["Everything in Tender Preflight", "Structured response outlines for identified questions", "Evidence-bound draft sections where support exists", "Visible placeholders where evidence is missing", "Commitment and consistency checks", "Web workspace, CSV and print-to-PDF output", "Receiver assurance and citation checks"],
  },
] as const;

const comparison = [
  ["Requirement and question extraction", true, true],
  ["Exact source references", true, true],
  ["Evidence-gap and action plan", true, true],
  ["Clarification question register", true, true],
  ["Response structure and source-bound drafts", false, true],
  ["No subscription", true, true],
] as const;

export default function Pricing() {
  return (
    <div>
      <section className="border-b border-[var(--border)] px-5 py-20 text-center sm:px-8 sm:py-28">
        <div className="mx-auto max-w-3xl"><p className="eyebrow">Fixed-price tender analysis</p><h1 className="page-title mt-5">One tender. No subscription.</h1><p className="body-large mx-auto mt-6 max-w-2xl">Choose the depth you need. Both options preserve citations, expose uncertainty and keep the final decision with the receiver.</p></div>
      </section>

      <section className="px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto grid max-w-[1050px] gap-6 lg:grid-cols-2">
          {plans.map(plan => (
            <article key={plan.name} className={`relative flex flex-col overflow-hidden rounded-2xl border bg-white p-7 sm:p-9 ${plan.featured ? "border-[var(--signal-blue)] shadow-[0_24px_70px_rgba(63,91,201,.12)]" : "border-[var(--border)]"}`}>
              {plan.featured && <div className="absolute right-0 top-0 rounded-bl-xl bg-[var(--signal-blue)] px-4 py-2 font-mono text-[9px] font-semibold uppercase tracking-[.12em] text-white">Includes response outlines</div>}
              <p className="eyebrow">{plan.name}</p><p className="mt-8 font-serif text-6xl font-medium tracking-[-.055em]">{plan.price}</p><p className="mt-2 text-xs text-[var(--ink-faint)]">One-off payment · VAT added only where applicable</p>
              <p className="mt-7 max-w-md text-base leading-7 text-[var(--slate)]">{plan.strapline}</p>
              <ul className="mt-8 grid gap-3 border-t border-[var(--border)] pt-7">{plan.items.map(item => <li key={item} className="flex gap-3 text-sm leading-6 text-[var(--slate)]"><Check className="mt-1 h-4 w-4 shrink-0 text-[var(--verify-green)]" aria-hidden="true" />{item}</li>)}</ul>
              <Link href={`/checkout?type=${plan.type}`} className={`${plan.featured ? "button-primary" : "button-secondary"} mt-9 w-full`}>Choose {plan.name} <ArrowRight className="h-4 w-4" /></Link>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-[var(--border)] bg-white px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-[900px]"><p className="eyebrow">Compare</p><h2 className="mt-4 font-serif text-3xl font-medium tracking-[-.035em]">What is included</h2>
          <div className="mt-8 overflow-hidden rounded-xl border border-[var(--border)]">
            <div className="grid grid-cols-[1fr_90px_90px] gap-3 bg-[var(--paper)] px-4 py-3 font-mono text-[9px] uppercase tracking-[.1em] text-[var(--ink-faint)] sm:grid-cols-[1fr_150px_150px]"><span>Deliverable</span><span className="text-center">Preflight</span><span className="text-center">Complete</span></div>
            {comparison.map(([label, preflight, complete]) => <div key={String(label)} className="grid grid-cols-[1fr_90px_90px] items-center gap-3 border-t border-[var(--border)] px-4 py-4 text-sm sm:grid-cols-[1fr_150px_150px]"><span>{label}</span><span className="grid place-items-center">{preflight ? <Check className="h-4 w-4 text-[var(--verify-green)]" aria-label="Included" /> : <Minus className="h-4 w-4 text-[var(--ink-faint)]" aria-label="Not included" />}</span><span className="grid place-items-center">{complete ? <Check className="h-4 w-4 text-[var(--verify-green)]" aria-label="Included" /> : <Minus className="h-4 w-4 text-[var(--ink-faint)]" aria-label="Not included" />}</span></div>)}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8"><div className="mx-auto grid max-w-[1050px] gap-10 md:grid-cols-[.75fr_1.25fr]"><div><p className="eyebrow">Before you buy</p><h2 className="section-title mt-4">Clear boundaries</h2></div><div className="grid gap-5 sm:grid-cols-2">{[
        ["One tender pack", "Each purchase covers one procurement opportunity and the documents supplied for it."],
        ["No outcome promise", "The service does not certify compliance or guarantee a score, accepted submission or contract award."],
        ["Evidence stays explicit", "Unsupported company claims are marked missing or uncertain. A polished sentence does not convert them into fact."],
        ["External actions are conditional", "Buyer-facing actions require an explicit receiver mandate and a separately configured supported adapter."],
      ].map(([title, copy]) => <div key={title} className="panel p-6"><h3 className="font-serif text-xl font-medium">{title}</h3><p className="mt-3 text-sm leading-6 text-[var(--slate)]">{copy}</p></div>)}</div></div></section>

      <section className="border-t border-[var(--border)] bg-white px-5 py-12 sm:px-8"><div className="mx-auto flex max-w-[1050px] flex-col justify-between gap-5 text-sm text-[var(--slate)] md:flex-row"><p>Secure hosted payment is provided by Stripe. Project access is released after signed payment confirmation.</p><p>Purchases are subject to the <Link href="/legal/terms" className="underline decoration-[var(--border-strong)] underline-offset-4">terms</Link> and <Link href="/legal/refund" className="underline decoration-[var(--border-strong)] underline-offset-4">refund policy</Link>.</p></div></section>
    </div>
  );
}
