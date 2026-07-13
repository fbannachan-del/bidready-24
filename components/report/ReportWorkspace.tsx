"use client";

import {
  AlertTriangle,
  ArrowDownToLine,
  BadgeCheck,
  Bot,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  FileSearch,
  FileText,
  Fingerprint,
  Flag,
  Info,
  ListChecks,
  Printer,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { useMemo, useState } from "react";

export type ReportRequirement = {
  id: string;
  type?: string | null;
  title?: string | null;
  normalized_requirement?: string | null;
  verbatim_excerpt?: string | null;
  document_id?: string | null;
  page_or_location?: string | null;
  mandatory?: number | boolean | null;
  evaluation_weight?: number | null;
  response_limit?: string | null;
  customer_status?: string | null;
  confidence?: number | null;
  review_required?: number | boolean | null;
  notes?: string | null;
  source?: string | null;
};

type Tab = "overview" | "requirements" | "assurance";

const STATUS_META: Record<string, { label: string; className: string }> = {
  met: { label: "Verified met", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  verified_met: { label: "Verified met", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  probably_met: { label: "Probably met", className: "border-sky-200 bg-sky-50 text-sky-700" },
  partially_met: { label: "Partially met", className: "border-amber-200 bg-amber-50 text-amber-700" },
  uncertain: { label: "Verify", className: "border-amber-200 bg-amber-50 text-amber-700" },
  missing: { label: "Missing", className: "border-red-200 bg-red-50 text-red-700" },
  not_met: { label: "Not met", className: "border-red-200 bg-red-50 text-red-700" },
  probably_not_met: { label: "Probably not met", className: "border-red-200 bg-red-50 text-red-700" },
  conflicting_evidence: { label: "Evidence conflict", className: "border-violet-200 bg-violet-50 text-violet-700" },
  unable_to_determine: { label: "Unable to determine", className: "border-slate-300 bg-slate-100 text-slate-700" },
  not_applicable: { label: "Not applicable", className: "border-slate-200 bg-slate-50 text-slate-600" },
};

function StatusBadge({ value }: { value?: string | null }) {
  const key = value || "uncertain";
  const meta = STATUS_META[key] || { label: key.replaceAll("_", " "), className: "border-slate-200 bg-slate-50 text-slate-700" };
  return <span className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${meta.className}`}>{meta.label}</span>;
}

function confidenceLabel(value?: number | null) {
  const score = typeof value === "number" ? value : 0;
  if (score >= 0.85) return "High";
  if (score >= 0.6) return "Medium";
  return "Low";
}

function notesText(value?: string | null) {
  if (!value) return "No additional action recorded.";
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.join(" · ");
  } catch {
    // Plain-text notes remain valid.
  }
  return value;
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-dashed border-[#B7B2A7] bg-[#F4F1E8] px-5 py-10 text-center text-sm text-[#667085]">
      <FileSearch className="mx-auto mb-3 h-6 w-6 text-slate-400" aria-hidden="true" />
      {children}
    </div>
  );
}

export default function ReportWorkspace({
  project,
  requirements,
  token,
  runSummary,
  extraction,
}: {
  project: {
    company_name: string;
    tender_title: string;
    order_type: string;
    status: string;
    deadline: string;
  };
  requirements: ReportRequirement[];
  token: string;
  runSummary: {
    profile: string;
    runStatus: string;
    runStage: string;
    failedQa: number;
    submissions: number;
    attachments: number;
    clarifications: number;
  };
  extraction?: {
    uploaded: number;
    processed: number;
    failures: Array<{ name: string; error?: string }>;
    aiDegraded?: boolean;
    aiError?: string;
  } | null;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [filter, setFilter] = useState("all");

  const metrics = useMemo(() => {
    const success = requirements.filter((item) => ["met", "verified_met", "probably_met"].includes(item.customer_status || "")).length;
    const gaps = requirements.filter((item) => ["missing", "not_met", "probably_not_met", "partially_met"].includes(item.customer_status || "")).length;
    const verify = requirements.filter((item) => ["uncertain", "conflicting_evidence", "unable_to_determine"].includes(item.customer_status || "") || item.review_required).length;
    const sourced = requirements.filter((item) => item.page_or_location || item.document_id).length;
    return { success, gaps, verify, sourced };
  }, [requirements]);

  const filtered = useMemo(() => {
    if (filter === "all") return requirements;
    if (filter === "gaps") return requirements.filter((item) => ["missing", "not_met", "probably_not_met", "partially_met"].includes(item.customer_status || ""));
    if (filter === "verify") return requirements.filter((item) => ["uncertain", "conflicting_evidence", "unable_to_determine"].includes(item.customer_status || "") || item.review_required);
    return requirements.filter((item) => item.type === filter);
  }, [filter, requirements]);

  const topRisks = requirements.filter((item) => ["missing", "not_met", "probably_not_met", "partially_met"].includes(item.customer_status || "")).slice(0, 5);
  const lowConfidence = requirements.filter((item) => (item.confidence || 0) < 0.6 || item.review_required).slice(0, 8);

  return (
    <div className="bg-[#F4F1E8] font-['IBM_Plex_Sans',Arial,sans-serif] text-[#17202A]">
      <div className="border-b border-[#D9D5CB] bg-[#FBFAF6] print:hidden">
        <div className="mx-auto flex max-w-[1240px] flex-col justify-between gap-4 px-4 py-4 sm:px-6 md:flex-row md:items-end lg:px-8">
          <nav className="flex gap-px overflow-x-auto border border-[#D9D5CB] bg-[#D9D5CB]" aria-label="Report sections" role="tablist">
            {[
              { id: "overview" as Tab, label: "Overview", icon: ClipboardCheck },
              { id: "requirements" as Tab, label: "Compliance matrix", icon: ListChecks },
              { id: "assurance" as Tab, label: "Receiver assurance", icon: ShieldCheck },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} aria-controls={`report-panel-${item.id}`} onClick={() => setTab(item.id)} className={`inline-flex min-h-9 shrink-0 items-center gap-2 px-3 text-xs font-semibold transition ${tab === item.id ? "bg-[#1457FF] text-white" : "bg-[#FBFAF6] text-[#667085] hover:text-[#17202A]"}`}>
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />{item.label}
                </button>
              );
            })}
          </nav>
          <div className="flex flex-wrap gap-2">
            <a href={`/api/exports/${token}/csv`} className="inline-flex min-h-9 items-center gap-2 border border-[#B7B2A7] bg-[#FBFAF6] px-4 text-xs font-semibold text-[#17202A] hover:border-[#1457FF]"><ArrowDownToLine className="h-3.5 w-3.5" aria-hidden="true" /> CSV</a>
            <button type="button" onClick={() => window.print()} className="inline-flex min-h-9 items-center gap-2 border border-[#B7B2A7] bg-[#FBFAF6] px-4 text-xs font-semibold text-[#17202A] hover:border-[#1457FF]"><Printer className="h-3.5 w-3.5" aria-hidden="true" /> Print / PDF</button>
          </div>
        </div>
      </div>

      <main id={`report-panel-${tab}`} role="tabpanel" className="mx-auto max-w-[1240px] px-4 py-7 sm:px-6 lg:px-8">
        <section className="mb-5 overflow-hidden border border-[#D9D5CB] bg-[#FBFAF6]">
          <div className="bg-[#17202A] px-5 py-6 text-white sm:px-7">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
              <div>
                <div className="flex items-center gap-2 font-['IBM_Plex_Mono',monospace] text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7EA0FF]"><Fingerprint className="h-4 w-4" aria-hidden="true" /> Source-cited autonomous report</div>
                <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em] sm:text-3xl">{project.tender_title}</h1>
                <p className="mt-1 text-sm text-slate-300">{project.company_name} · {project.order_type} · {project.status.replaceAll("_", " ")} · <span className="capitalize">{runSummary.profile}</span> profile</p>
              </div>
              <div className="self-start rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-xs">
                <div className="font-['IBM_Plex_Mono',monospace] text-[10px] font-semibold uppercase tracking-[0.12em] text-white">Machine-produced assessment</div>
                <div className="mt-1 text-slate-300">{runSummary.runStage.replaceAll("_", " ")} · {runSummary.runStatus.replaceAll("_", " ")}</div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 divide-x divide-y divide-[#D9D5CB] sm:grid-cols-4 sm:divide-y-0">
            {[
              { label: "Requirements", value: requirements.length, icon: FileText },
              { label: "Met", value: metrics.success, icon: BadgeCheck },
              { label: "Material gaps", value: metrics.gaps, icon: Flag },
              { label: "Verify", value: metrics.verify, icon: CircleHelp },
            ].map((item) => {
              const Icon = item.icon;
              return <div key={item.label} className="p-4 sm:p-5"><div className="flex items-center gap-2 font-['IBM_Plex_Mono',monospace] text-[10px] font-medium uppercase tracking-wide text-[#667085]"><Icon className="h-3.5 w-3.5 text-[#1457FF]" aria-hidden="true" />{item.label}</div><div className="mt-2 text-2xl font-semibold text-[#17202A]">{item.value}</div></div>;
            })}
          </div>
        </section>

        {extraction && extraction.failures.length > 0 && (
          <section className="border border-red-300 bg-red-50 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <TriangleAlert className="h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-red-900">{extraction.failures.length} of {extraction.uploaded} uploaded document{extraction.uploaded === 1 ? "" : "s"} could not be read and {extraction.failures.length === 1 ? "was" : "were"} excluded from this analysis</h2>
                <p className="mt-1 text-xs leading-5 text-red-800">Any requirement contained only in {extraction.failures.length === 1 ? "this file" : "these files"} is not represented in this report. Replace or re-export {extraction.failures.length === 1 ? "it" : "them"} and run the analysis again.</p>
                <ul className="mt-2 space-y-1">
                  {extraction.failures.map((f) => <li key={f.name} className="font-mono text-[11px] text-red-800">• {f.name}{f.error ? ` — ${f.error}` : ""}</li>)}
                </ul>
              </div>
            </div>
          </section>
        )}
        {extraction && extraction.aiDegraded && (
          <section className="border border-amber-300 bg-amber-50 p-3 sm:p-4">
            <p className="text-xs leading-5 text-amber-900"><span className="font-semibold">Deterministic extraction only.</span> The AI analysis pass did not run for this report{extraction.aiError ? ` (${extraction.aiError})` : ""}, so some nuanced or narratively-worded requirements may not be captured. Review the source documents directly for completeness.</p>
          </section>
        )}

        {tab === "overview" && (
          <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
            <div className="space-y-6">
              <section className="border border-[#D9D5CB] bg-[#FBFAF6] p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <span className="bg-[#EEF3FF] p-2.5 text-[#1457FF]"><Bot className="h-5 w-5" aria-hidden="true" /></span>
                  <div>
                    <div className="font-['IBM_Plex_Mono',monospace] text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1457FF]">Executive position</div>
                    <h2 className="mt-1 text-xl font-semibold tracking-[-0.02em] text-[#17202A]">Autonomous compliance preflight complete</h2>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  BIDREADY24 identified {requirements.length} tender requirements. {metrics.success} are currently supported, {metrics.gaps} have a material gap, and {metrics.verify} need receiver attention because the evidence is uncertain, conflicting, or low confidence. Every available assessment retains its tender source and decision context.
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  {(() => {
                    const partial = Boolean(extraction && extraction.failures.length > 0);
                    if (extraction && extraction.uploaded > 0) {
                      return (
                        <div className={`rounded-xl p-4 ${partial ? "bg-amber-50" : "bg-emerald-50"}`}>
                          <div className={`text-[11px] font-semibold uppercase tracking-wide ${partial ? "text-amber-700" : "text-emerald-700"}`}>Document coverage</div>
                          <div className={`mt-2 text-xl font-semibold ${partial ? "text-amber-950" : "text-emerald-950"}`}>{extraction.processed}/{extraction.uploaded}</div>
                          <div className={`mt-1 text-xs ${partial ? "text-amber-700" : "text-emerald-700"}`}>documents read{partial ? ` · ${extraction.failures.length} excluded` : ""}</div>
                        </div>
                      );
                    }
                    return (
                      <div className="rounded-xl bg-emerald-50 p-4"><div className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Source coverage</div><div className="mt-2 text-xl font-semibold text-emerald-950">{requirements.length ? Math.round((metrics.sourced / requirements.length) * 100) : 0}%</div><div className="mt-1 text-xs text-emerald-700">items with a recorded location</div></div>
                    );
                  })()}
                  <div className="rounded-xl bg-amber-50 p-4"><div className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Receiver checks</div><div className="mt-2 text-xl font-semibold text-amber-950">{metrics.verify}</div><div className="mt-1 text-xs text-amber-700">prioritised verification items</div></div>
                  <div className="rounded-xl bg-sky-50 p-4"><div className="text-[11px] font-semibold uppercase tracking-wide text-sky-700">Deadline</div><div className="mt-2 truncate text-sm font-semibold text-sky-950">{project.deadline || "Not confirmed"}</div><div className="mt-1 text-xs text-sky-700">original wording retained</div></div>
                </div>
              </section>

              <section className="border border-[#D9D5CB] bg-[#FBFAF6] p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3"><div><div className="text-xs font-semibold uppercase tracking-widest text-red-700">Priority action plan</div><h2 className="mt-1 text-lg font-semibold text-slate-950">Material gaps</h2></div><TriangleAlert className="h-5 w-5 text-red-600" aria-hidden="true" /></div>
                <div className="mt-4 space-y-3">
                  {topRisks.length === 0 && <EmptyState>No material gaps are currently recorded.</EmptyState>}
                  {topRisks.map((item, index) => (
                    <article key={item.id} className="rounded-xl border border-slate-200 p-4">
                      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start"><div className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-50 text-xs font-semibold text-red-700">{index + 1}</span><div><h3 className="text-sm font-semibold text-slate-950">{item.title || item.normalized_requirement || "Requirement"}</h3><p className="mt-1 text-xs leading-5 text-slate-500">{notesText(item.notes)}</p></div></div><StatusBadge value={item.customer_status} /></div>
                      <div className="mt-3 border-t border-slate-100 pt-3 font-mono text-[10px] text-slate-500">{item.page_or_location || item.document_id || "Source location not yet resolved"}</div>
                    </article>
                  ))}
                </div>
              </section>
            </div>

            <aside className="space-y-4">
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-950"><AlertTriangle className="h-4 w-4" aria-hidden="true" /> Receiver check</div>
                <p className="mt-2 text-xs leading-5 text-amber-900">This report can be produced and acted on without approval. The receiver should still check every material claim, source, assumption, commitment, declaration, price, and portal action before relying on it.</p>
                <button type="button" onClick={() => setTab("assurance")} className="mt-3 text-xs font-semibold text-amber-950 underline underline-offset-4">Open the assurance pack</button>
              </section>
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-slate-950">Decision health</h2>
                <dl className="mt-4 space-y-4">
                  {[
                    ["Citations recorded", `${metrics.sourced} / ${requirements.length}`],
                    ["Low-confidence items", String(lowConfidence.length)],
                    ["Machine decisions", String(requirements.length)],
                    ["Failed QA checks", String(runSummary.failedQa)],
                    ["Unsupported claims hidden", "0 permitted"],
                  ].map(([label, value]) => <div key={label} className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3 last:border-0 last:pb-0"><dt className="text-xs text-slate-500">{label}</dt><dd className="text-xs font-semibold text-slate-950">{value}</dd></div>)}
                </dl>
              </section>
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-950"><Info className="h-4 w-4 text-[#0A3D62]" aria-hidden="true" /> Decision language</h2>
                <p className="mt-2 text-xs leading-5 text-slate-500">“Unable to determine” is an autonomous outcome, not a hidden failure. It means the source and available evidence do not support a firmer classification.</p>
              </section>
            </aside>
          </div>
        )}

        {tab === "requirements" && (
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:p-5">
              <div><h2 className="font-semibold text-slate-950">Compliance matrix</h2><p className="mt-1 text-xs text-slate-500">{filtered.length} of {requirements.length} items shown</p></div>
              <label className="relative text-xs font-medium text-slate-600"><span className="sr-only">Filter requirements</span><select value={filter} onChange={(event) => setFilter(event.target.value)} className="min-h-9 appearance-none rounded-full border border-slate-300 bg-white py-2 pl-4 pr-9 outline-none focus:ring-2 focus:ring-[#0A3D62]/20"><option value="all">All requirements</option><option value="gaps">Material gaps</option><option value="verify">Receiver checks</option><option value="mandatory">Mandatory</option><option value="scored">Scored questions</option><option value="attachment">Attachments</option><option value="deadline">Deadlines</option></select><ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-4 w-4" aria-hidden="true" /></label>
            </div>
            <div className="divide-y divide-slate-200">
              {filtered.length === 0 && <div className="p-5"><EmptyState>No requirements match this filter.</EmptyState></div>}
              {filtered.map((item) => (
                <details key={item.id} className="group open:bg-slate-50/60">
                  <summary className="grid cursor-pointer list-none gap-3 p-4 marker:hidden sm:grid-cols-[110px_1fr_130px_90px] sm:items-center sm:p-5">
                    <div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-600">{item.type || "requirement"}</span></div>
                    <div><h3 className="text-sm font-semibold leading-5 text-slate-950">{item.title || item.normalized_requirement || "Untitled requirement"}</h3><p className="mt-1 truncate font-mono text-[10px] text-slate-500">{item.page_or_location || item.document_id || "Source pending"}</p></div>
                    <StatusBadge value={item.customer_status} />
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-500 sm:justify-end"><span>{confidenceLabel(item.confidence)}</span><ChevronDown className="h-4 w-4 transition group-open:rotate-180" aria-hidden="true" /></div>
                  </summary>
                  <div className="grid gap-4 border-t border-slate-200 bg-white px-4 py-5 sm:px-5 lg:grid-cols-2">
                    <div><div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">System interpretation</div><p className="mt-2 text-sm leading-6 text-slate-700">{item.normalized_requirement || item.title}</p><div className="mt-4 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Decision / action</div><p className="mt-2 text-xs leading-5 text-slate-600">{notesText(item.notes)}</p></div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-center justify-between"><span className="text-[10px] font-semibold uppercase tracking-widest text-[#0A3D62]">Original source</span><span className="font-mono text-[10px] text-slate-500">{item.page_or_location || item.document_id || "Unresolved"}</span></div><blockquote className="mt-3 border-l-2 border-[#0A3D62] pl-3 text-xs leading-5 text-slate-600">{item.verbatim_excerpt || "No verbatim excerpt is stored for this item. Check the original document location before relying on the interpretation."}</blockquote><div className="mt-3 flex flex-wrap gap-2 text-[10px] text-slate-500"><span>Confidence: {Math.round((item.confidence || 0) * 100)}%</span><span>·</span><span>Method: {item.source || "extracted"}</span>{Boolean(item.review_required) && <><span>·</span><span className="font-semibold text-amber-700">Receiver check prioritised</span></>}</div></div>
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}

        {tab === "assurance" && (
          <div id="assurance" className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start"><div><div className="text-xs font-semibold uppercase tracking-widest text-[#0A3D62]">Receiver Assurance Pack</div><h2 className="mt-1 text-xl font-semibold tracking-tight text-slate-950">What to verify before relying on this run</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">This pack turns receiver responsibility into a visible checklist. It prioritises the system’s weakest evidence and highest-consequence decisions without blocking autonomous production or submission.</p></div><ShieldCheck className="h-8 w-8 shrink-0 text-[#0A3D62]" aria-hidden="true" /></div>
              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: "Check citations", value: `${metrics.sourced}/${requirements.length}`, help: "Confirm quoted sources support the interpretation.", icon: FileSearch },
                  { label: "Check uncertainty", value: String(metrics.verify), help: "Inspect low-confidence or conflicting evidence.", icon: CircleHelp },
                  { label: "Check attachments", value: String(runSummary.attachments), help: "Confirm every required return is complete and current.", icon: CheckCircle2 },
                  { label: "Check submission", value: runSummary.submissions ? "Confirmed" : "Required", help: "Confirm entity, price, signatures, and receipt.", icon: Fingerprint },
                ].map((item) => { const Icon = item.icon; return <div key={item.label} className="rounded-xl border border-slate-200 p-4"><Icon className="h-4 w-4 text-[#0A3D62]" aria-hidden="true" /><div className="mt-3 text-xs font-medium text-slate-500">{item.label}</div><div className="mt-1 text-lg font-semibold text-slate-950">{item.value}</div><p className="mt-1 text-[11px] leading-5 text-slate-500">{item.help}</p></div>; })}
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 p-5"><h2 className="font-semibold text-slate-950">Prioritised accuracy checks</h2><p className="mt-1 text-xs text-slate-500">Sorted toward low confidence and receiver-verification flags.</p></div>
                <div className="divide-y divide-slate-200">
                  {lowConfidence.length === 0 && <div className="p-5"><EmptyState>No low-confidence items are currently recorded.</EmptyState></div>}
                  {lowConfidence.map((item, index) => (
                    <article key={item.id} className="p-5">
                      <div className="flex items-start gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-50 text-xs font-semibold text-amber-700">{index + 1}</span><div className="min-w-0 flex-1"><div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start"><h3 className="text-sm font-semibold text-slate-950">{item.title || item.normalized_requirement}</h3><StatusBadge value={item.customer_status} /></div><p className="mt-2 text-xs leading-5 text-slate-500">Check the interpretation against <span className="font-mono text-[10px] text-slate-700">{item.page_or_location || item.document_id || "the original pack"}</span>. Recorded confidence: {Math.round((item.confidence || 0) * 100)}%.</p></div></div>
                    </article>
                  ))}
                </div>
              </section>

              <aside className="space-y-4">
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="text-sm font-semibold text-slate-950">Verification checklist</h2>
                  <ul className="mt-4 space-y-3">
                    {["Tender and lot are correct", "Dates and portal instructions match", "Mandatory statuses are supportable", "Company facts are current", "Prices and totals reconcile", "Commitments are deliverable", "Contract terms are within authority", "Signatures and declarations are authorised", "Portal receipt confirms submission"].map((item) => <li key={item} className="flex items-start gap-2 text-xs leading-5 text-slate-600"><span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-300 bg-white"><CheckCircle2 className="h-3 w-3 text-slate-300" aria-hidden="true" /></span>{item}</li>)}
                  </ul>
                </section>
                <section className="rounded-2xl border border-red-200 bg-red-50 p-5">
                  <div className="flex items-center gap-2 text-sm font-semibold text-red-950"><TriangleAlert className="h-4 w-4" aria-hidden="true" /> No outcome guarantee</div><p className="mt-2 text-xs leading-5 text-red-900">This is a machine-produced tender assessment, not certification, legal advice, or a guarantee of compliance, evaluation score, or award.</p>
                </section>
              </aside>
            </div>
          </div>
        )}

        <div className="mt-7 border-t border-slate-200 pt-5 text-[11px] leading-5 text-slate-500">
          Method: tender content is extracted and normalised into traceable items, compared with available organisation evidence, processed through configured policy, and subjected to automated QA. Unsupported customer claims must not be presented as verified facts. The receiver should cross-check material content against the original tender and organisation records.
        </div>
      </main>
    </div>
  );
}
