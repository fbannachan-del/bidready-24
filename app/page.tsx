import Link from "next/link";
import { ArrowRight, Check, FileSearch, ShieldCheck, Sparkles } from "lucide-react";
import { BrandWordmark } from "@/components/site/Logo";

const deliverables = [
  ["Mandatory requirements", "Pass/fail conditions, thresholds and caveats, each paired with the exact tender source."],
  ["Scored questions", "Weighting, word limits, evaluation language and dependencies brought into one register."],
  ["Dates and attachments", "Submission events, clarification cut-offs, forms, schedules, signatures and certificates."],
  ["Evidence gaps", "Missing, uncertain and conflicting evidence ranked by consequence—not hidden behind confident prose."],
  ["Clarification questions", "Specific buyer questions drafted where the tender is ambiguous or internally inconsistent."],
  ["Action plan", "Owners, priorities and suggested internal dates assembled into a practical path to submission."],
] as const;

const steps = [
  ["01", "Upload the tender pack", "Add the buyer’s PDFs, Word files, spreadsheets and supporting schedules to a private project workspace."],
  ["02", "Add your evidence", "Tell BIDREADY24 what your business can prove. Unsupported facts remain missing or uncertain."],
  ["03", "Run the preflight", "The system extracts requirements, checks citations, maps evidence and records its decisions."],
  ["04", "Review and act", "Work through the assurance view, close gaps, export the register and control any configured external action."],
] as const;

function ProductPreview() {
  return (
    <div className="relative mx-auto mt-14 max-w-[1080px] px-3 sm:px-8">
      <div className="absolute -inset-8 -z-10 rounded-[60px] bg-[radial-gradient(circle_at_50%_45%,rgba(63,91,201,.12),transparent_68%)]" />
      <div className="overflow-hidden rounded-[18px] border border-[var(--border-strong)] bg-white text-left shadow-[0_30px_90px_rgba(43,48,61,.13)]">
        <div className="flex h-11 items-center gap-1.5 border-b border-[var(--border)] bg-[#f4f3f0] px-4">
          <span className="h-2.5 w-2.5 rounded-full bg-[#d7d4cd]" /><span className="h-2.5 w-2.5 rounded-full bg-[#d7d4cd]" /><span className="h-2.5 w-2.5 rounded-full bg-[#d7d4cd]" />
          <div className="mx-auto rounded-md border border-[var(--border)] bg-white px-16 py-1 font-mono text-[8px] text-[var(--ink-faint)]">bidready24.com/project/••••••</div>
        </div>
        <div className="grid min-h-[430px] md:grid-cols-[210px_1fr]">
          <aside className="hidden border-r border-[var(--border)] bg-[#f7f6f3] p-5 md:block">
            <BrandWordmark className="text-[15px]" />
            <p className="mt-8 font-mono text-[8px] uppercase tracking-[.13em] text-[var(--ink-faint)]">Tender workspace</p>
            {[["Overview", true], ["Requirements"], ["Scored questions"], ["Evidence gaps"], ["Action plan"]].map(([item, active]) => <div key={String(item)} className={`mt-1 rounded-md px-3 py-2 text-[11px] ${active ? "bg-[var(--blue-soft)] font-medium text-[var(--blue-ink)]" : "text-[var(--slate)]"}`}>{item}</div>)}
          </aside>
          <div className="p-5 sm:p-8">
            <div className="flex flex-col justify-between gap-3 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-start">
              <div><p className="font-mono text-[9px] uppercase tracking-[.12em] text-[var(--ink-faint)]">Preflight overview</p><h2 className="mt-2 font-serif text-2xl font-medium tracking-tight">Civic Offices Cleaning Contract</h2><p className="mt-1 text-[11px] text-[var(--slate)]">ITT / 2026 / 041 · analysis in progress</p></div>
              <div className="rounded-xl border border-[var(--border)] px-4 py-3"><p className="font-mono text-[8px] uppercase tracking-[.12em] text-[var(--ink-faint)]">Readiness</p><p className="mt-1 font-serif text-3xl font-medium">68<span className="text-base text-[var(--ink-faint)]">/100</span></p></div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              {[["28", "Requirements"], ["7", "Scored questions"], ["3", "Critical gaps"], ["11", "Attachments"]].map(([value, label], i) => <div key={label} className="rounded-xl border border-[var(--border)] p-3"><p className={`font-serif text-2xl ${i === 2 ? "text-[var(--gap-red)]" : "text-[var(--ink)]"}`}>{value}</p><p className="mt-1 text-[9px] text-[var(--slate)]">{label}</p></div>)}
            </div>
            <div className="mt-5 overflow-hidden rounded-xl border border-[var(--border)]">
              <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-[var(--border)] bg-[#fbfaf8] px-4 py-2 font-mono text-[8px] uppercase tracking-[.1em] text-[var(--ink-faint)]"><span>Priority findings</span><span>Evidence state</span></div>
              {[
                ["Public liability insurance · £10m minimum", "ITT §4.2 · p.7", "Uncertain", "amber"],
                ["SSIP accreditation or accepted equivalent", "Selection form · Q12", "Missing", "red"],
                ["Mobilisation plan · 1,000 words · 8%", "Quality schedule · Q3", "In progress", "blue"],
              ].map(([requirement, citation, status, colour]) => <div key={requirement} className="grid gap-3 border-b border-[var(--border)] px-4 py-3 last:border-0 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="text-[11px] font-medium">{requirement}</p><span className="citation-chip mt-1.5">{citation}</span></div><span className={`status-chip ${colour === "red" ? "bg-red-50 text-red-700" : colour === "amber" ? "bg-amber-50 text-amber-700" : "bg-[var(--blue-soft)] text-[var(--blue-ink)]"}`}>{status}</span></div>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="overflow-hidden">
      <section className="relative border-b border-[var(--border)] px-5 pb-20 pt-20 text-center sm:px-8 sm:pt-28">
        <div className="mx-auto max-w-4xl">
          <div className="eyebrow inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white px-3.5 py-2"><FileSearch className="h-3.5 w-3.5" aria-hidden="true" /> UK public-sector tender preflight</div>
          <h1 className="display-title mt-7">Every requirement,<br /><span className="text-[var(--signal-blue)]">traced to source.</span></h1>
          <p className="body-large mx-auto mt-7 max-w-2xl">BIDREADY24 turns dense tender packs into a source-cited compliance preflight: what the buyer requires, what you can prove and what needs action before submission.</p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/pricing" className="button-primary w-full sm:w-auto">Start a preflight <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            <Link href="/sample-report" className="button-secondary w-full sm:w-auto">Explore a sample report</Link>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[12px] text-[var(--slate)]">
            <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[var(--verify-green)]" />Fixed-price, one tender</span>
            <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[var(--verify-green)]" />No invented evidence</span>
            <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[var(--verify-green)]" />Receiver-verifiable output</span>
          </div>
        </div>
        <ProductPreview />
      </section>

      <section className="bg-white py-9">
        <div className="mx-auto flex max-w-[1120px] flex-col items-center justify-between gap-4 px-5 text-center sm:px-8 md:flex-row md:text-left">
          <p className="font-serif text-xl font-medium">Built for teams working across common UK procurement portals</p>
          <p className="max-w-2xl text-sm leading-6 text-[var(--slate)]">Download the tender pack from the buyer’s portal, analyse it in BIDREADY24, then use the traceable output in your existing bid process. BIDREADY24 does not claim direct portal integration.</p>
        </div>
      </section>

      <section id="how-it-works" className="border-y border-[var(--border)] px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-[1120px]">
          <div className="max-w-3xl"><p className="eyebrow">A controlled workflow</p><h2 className="section-title mt-4">From a 200-page tender pack to a traceable plan</h2><p className="body-large mt-5">The analysis can run autonomously. The provenance does not disappear: uncertainty, citations and decision history stay visible to the receiver.</p></div>
          <ol className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--border)] md:grid-cols-4">
            {steps.map(([number, title, copy]) => <li key={number} className="bg-white p-6 lg:p-8"><p className="font-mono text-xs text-[var(--signal-blue)]">{number}</p><h3 className="mt-8 font-serif text-xl font-medium">{title}</h3><p className="mt-3 text-sm leading-6 text-[var(--slate)]">{copy}</p></li>)}
          </ol>
        </div>
      </section>

      <section id="deliverables" className="bg-white px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-[1120px]">
          <div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:gap-20">
            <div><p className="eyebrow">What you get</p><h2 className="section-title mt-4">A bid/no-bid view you can defend</h2><p className="body-large mt-5">Not another generic summary. BIDREADY24 creates structured registers that keep requirement, evidence and source together.</p><Link href="/sample-report" className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-[var(--blue-ink)]">See the output format <ArrowRight className="h-4 w-4" /></Link></div>
            <div className="grid gap-px overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2">
              {deliverables.map(([title, copy], index) => <article key={title} className="bg-[var(--paper)] p-6"><div className="flex items-center justify-between"><span className="font-mono text-[10px] text-[var(--ink-faint)]">0{index + 1}</span><span className="h-1.5 w-1.5 rounded-full bg-[var(--signal-blue)]" /></div><h3 className="mt-7 font-serif text-xl font-medium">{title}</h3><p className="mt-3 text-sm leading-6 text-[var(--slate)]">{copy}</p></article>)}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[var(--ink-panel)] px-5 py-24 text-white sm:px-8">
        <div className="mx-auto grid max-w-[1120px] gap-14 lg:grid-cols-2 lg:items-center">
          <div><p className="font-mono text-[11px] uppercase tracking-[.14em] text-[#9caae5]">The non-negotiable rule</p><h2 className="section-title mt-5 text-white">Nothing is invented.</h2><p className="mt-6 max-w-xl text-lg leading-8 text-[#c7cbd5]">A fluent answer is not the same as a supported answer. Customer facts begin as missing or uncertain and only move when supplied evidence supports them.</p><Link href="/security" className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-white">Read the trust model <ArrowRight className="h-4 w-4" /></Link></div>
          <div className="rounded-2xl border border-white/10 bg-white/[.04] p-6 sm:p-8">
            {[["Requirement", "£10m public liability insurance", "ITT §4.2 · p.7"], ["Evidence", "2026 insurance certificate", "Customer upload · cert.pdf"], ["Decision", "Uncertain — limit not legible", "Confidence 0.54 · review flag"]].map(([label, value, source], i) => <div key={label} className={`grid gap-2 py-5 sm:grid-cols-[95px_1fr] ${i < 2 ? "border-b border-white/10" : ""}`}><p className="font-mono text-[9px] uppercase tracking-[.12em] text-[#9096a5]">{label}</p><div><p className="text-sm text-white">{value}</p><p className="mt-2 font-mono text-[9px] text-[#d9ce86]">{source}</p></div></div>)}
          </div>
        </div>
      </section>

      <section className="px-5 py-24 sm:px-8">
        <div className="mx-auto grid max-w-[1120px] gap-6 md:grid-cols-3">
          {[
            [ShieldCheck, "Traceable by design", "Requirement records carry source locations and exact excerpts where the extraction can establish them."],
            [Sparkles, "Autonomous, with boundaries", "Internal analysis can proceed without step-by-step approval. External actions remain limited by the receiver’s configured mandate and available adapters."],
            [FileSearch, "Made for cleaning SMEs", "Insurance, COSHH, mobilisation, TUPE, social value, safeguarding, KPIs and schedules are treated as operating requirements—not keywords."],
          ].map(([Icon, title, copy]) => {
            const ItemIcon = Icon as typeof ShieldCheck;
            return <article key={String(title)} className="panel p-7"><ItemIcon className="h-5 w-5 text-[var(--signal-blue)]" aria-hidden="true" /><h3 className="mt-7 font-serif text-2xl font-medium">{String(title)}</h3><p className="mt-3 text-sm leading-6 text-[var(--slate)]">{String(copy)}</p></article>;
          })}
        </div>
      </section>

      <section className="border-t border-[var(--border)] bg-white px-5 py-20 sm:px-8">
        <div className="mx-auto flex max-w-[1120px] flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <div><p className="eyebrow">One tender. One fixed price.</p><h2 className="mt-3 font-serif text-3xl font-medium tracking-[-.035em] sm:text-4xl">Know the work before you start writing.</h2></div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row"><Link href="/pricing" className="button-primary">See pricing <ArrowRight className="h-4 w-4" /></Link><Link href="/contact" className="button-secondary">Ask a question</Link></div>
        </div>
      </section>
    </div>
  );
}
