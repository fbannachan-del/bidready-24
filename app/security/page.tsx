import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Eye, FileLock2, ShieldAlert } from "lucide-react";

export const metadata: Metadata = { title: "Security and data handling", description: "A precise account of BIDREADY24 security controls, data processing, AI use and current limitations." };

const controls = [
  [FileLock2, "Project-scoped access", "Customer workspaces use revocable, time-limited access tokens. Project lookups are separated by the project identifier and sensitive routes are marked private and non-cacheable."],
  [Eye, "Traceable analysis", "The system retains source locations, excerpts, confidence and review flags with its findings so the receiver can inspect the basis of a decision."],
  [CheckCircle2, "Upload validation", "Uploads are bounded by count and size, checked against extension, declared type and file signature, normalised for safe storage, hashed and deduplicated."],
  [ShieldAlert, "Bounded autonomy", "Internal analysis can run automatically. Outbound clarifications or submissions only become available when a receiver mandate and separately configured adapter permit them."],
] as const;

export default function Security() {
  return (
    <div>
      <section className="border-b border-[var(--border)] px-5 py-20 sm:px-8 sm:py-28"><div className="mx-auto max-w-[1120px]"><p className="eyebrow">Trust centre</p><h1 className="page-title mt-5 max-w-4xl">Security claims should be as traceable as tender claims.</h1><p className="body-large mt-7 max-w-3xl">This page describes controls that exist today, and names the limitations that still matter. BIDREADY24 does not claim certifications, UK-only data residency or a completed legal-compliance audit.</p></div></section>

      <section className="px-5 py-20 sm:px-8"><div className="mx-auto max-w-[1120px]"><div className="grid gap-5 md:grid-cols-2">{controls.map(([Icon, title, copy]) => { const ControlIcon = Icon as typeof FileLock2; return <article key={String(title)} className="panel p-7"><ControlIcon className="h-5 w-5 text-[var(--signal-blue)]" aria-hidden="true" /><h2 className="mt-7 font-serif text-2xl font-medium">{String(title)}</h2><p className="mt-3 text-sm leading-6 text-[var(--slate)]">{String(copy)}</p></article>; })}</div></div></section>

      <section className="border-y border-[var(--border)] bg-white px-5 py-20 sm:px-8"><div className="mx-auto grid max-w-[1120px] gap-14 lg:grid-cols-[.8fr_1.2fr]"><div><p className="eyebrow">Data flow</p><h2 className="section-title mt-4">Where your information goes</h2><p className="body-large mt-5">Processing depends on the features enabled for your project and the service configuration.</p></div><div className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
        {[
          ["Application hosting", "Tender documents, extracted text, company evidence, analysis records and access data are processed and stored by the hosting environment used to operate BIDREADY24."],
          ["OpenAI API · when enabled", "Tender excerpts and structured analysis context may be sent to OpenAI to produce schema-constrained findings. API requests are configured with storage disabled. Model output remains subject to the same source and uncertainty checks."],
          ["Stripe", "Stripe hosts checkout and processes payment and billing information. BIDREADY24 receives payment identifiers and signed webhook confirmation used to release a project."],
          ["Configured support or action adapters", "Contact details or buyer-facing content are only sent to an external webhook or adapter when that integration is configured and the relevant action is requested or mandated."],
        ].map(([title, copy], index) => <div key={title} className="grid gap-3 py-6 sm:grid-cols-[30px_1fr]"><span className="font-mono text-[10px] text-[var(--signal-blue)]">0{index + 1}</span><div><h3 className="font-medium">{title}</h3><p className="mt-2 text-sm leading-6 text-[var(--slate)]">{copy}</p></div></div>)}
      </div></div></section>

      <section className="bg-[var(--ink-panel)] px-5 py-20 text-white sm:px-8"><div className="mx-auto grid max-w-[1120px] gap-12 lg:grid-cols-2"><div><p className="font-mono text-[10px] uppercase tracking-[.14em] text-[#9caae5]">Zero-invention policy</p><h2 className="section-title mt-4 text-white">What the system must not do</h2></div><ul className="grid gap-4 text-sm leading-6 text-[#d3d6de]">{[
        "Create qualifications, policies, accreditations, insurance levels, customer references or performance claims that the customer has not supported.",
        "Convert an ambiguous source into a confident mandatory requirement without leaving the source and uncertainty visible.",
        "Present machine output as legal advice, certification, buyer acceptance or an award prediction.",
        "Describe a buyer-facing action as complete when no configured adapter has returned a valid external confirmation.",
      ].map(item => <li key={item} className="flex gap-3 border-b border-white/10 pb-4"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#d7a23e]" />{item}</li>)}</ul></div></section>

      <section className="px-5 py-20 sm:px-8"><div className="mx-auto max-w-[1120px]"><div className="rounded-2xl border border-amber-300 bg-amber-50 p-7 sm:p-9"><p className="font-mono text-[10px] font-semibold uppercase tracking-[.14em] text-amber-800">Current limitations</p><div className="mt-7 grid gap-5 md:grid-cols-2">{[
        ["Storage", "The current deployment uses application-attached persistent storage, not a dedicated customer object-storage architecture."],
        ["Retention", "Automated end-to-end file deletion is not yet represented as a completed control. Contact support to request deletion; confirmation is handled operationally."],
        ["Malware scanning", "File type, signature, count, size and path checks are implemented. A separate antivirus scanning service is not yet claimed."],
        ["Identity and outbound actions", "Magic-link projects are not equivalent to enterprise identity verification. Do not store buyer credentials or enable signing authority without additional access controls."],
      ].map(([title, copy]) => <div key={title}><h3 className="font-medium text-amber-950">{title}</h3><p className="mt-2 text-sm leading-6 text-amber-900">{copy}</p></div>)}</div></div><p className="mt-8 text-sm text-[var(--slate)]">For privacy details and current service boundaries, read the <Link href="/legal/privacy" className="font-medium text-[var(--blue-ink)] underline underline-offset-4">privacy notice</Link> and <Link href="/legal/data" className="font-medium text-[var(--blue-ink)] underline underline-offset-4">data-handling statement</Link>.</p></div></section>
    </div>
  );
}
