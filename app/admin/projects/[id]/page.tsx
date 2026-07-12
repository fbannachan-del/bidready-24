import { getAutonomyDashboard } from "@/lib/autonomy";
import { getProjectById, getRequirements } from "@/lib/projects";
import { getDb } from "@/lib/db";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Bot,
  Check,
  Circle,
  CircleAlert,
  Clock3,
  Database,
  FileCheck2,
  FileSearch,
  Gauge,
  Play,
  Send,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

type RequirementRow = {
  id: string;
  title?: string | null;
  normalized_requirement?: string | null;
  type?: string | null;
  customer_status?: string | null;
  confidence?: number | null;
  page_or_location?: string | null;
  document_id?: string | null;
  verbatim_excerpt?: string | null;
  notes?: string | null;
  review_required?: number | boolean | null;
};

type SystemTestCheck = { label: string; passed: boolean; detail: string };

const STATUS_STEPS = ["awaiting_files", "processing", "review_required", "ready", "delivered"];

function displayDate(value?: string | null) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function statusStyle(status?: string | null) {
  if (["met", "verified_met", "probably_met"].includes(status || "")) return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (["missing", "not_met", "probably_not_met"].includes(status || "")) return "border-red-200 bg-red-50 text-red-700";
  if (["uncertain", "partially_met", "unable_to_determine"].includes(status || "")) return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

export default async function AdminProject({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ e2e?: string }> }) {
  const { id } = await params;
  const query = await searchParams;
  const project = getProjectById(id);
  if (!project) notFound();

  const requirements = getRequirements(id) as RequirementRow[];
  const dashboard = getAutonomyDashboard(id);
  const latestRun = (dashboard.latestRun || {}) as Record<string, unknown>;
  const runCounts = (dashboard.counts || {}) as Record<string, unknown>;
  const autonomySettings = dashboard.settings as null | (Record<string, unknown> & { mandate?: Record<string, unknown> });
  const status = String(project.status || "awaiting_files");
  const currentIndex = STATUS_STEPS.indexOf(status);
  const derivedGaps = requirements.filter((item) => ["missing", "not_met", "probably_not_met", "partially_met"].includes(item.customer_status || "")).length;
  const gaps = Number(runCounts.open_gaps ?? derivedGaps);
  const checks = requirements.filter((item) => item.review_required || ["uncertain", "unable_to_determine", "conflicting_evidence"].includes(item.customer_status || "")).length;
  const sourced = requirements.filter((item) => item.page_or_location || item.document_id).length;
  const averageConfidence = requirements.length ? Math.round((requirements.reduce((sum, item) => sum + (item.confidence || 0), 0) / requirements.length) * 100) : 0;
  const isSystemTest = project.company_name === "BIDREADY24 System Test";
  let systemTestChecks: SystemTestCheck[] = [];
  if (isSystemTest) {
    const event = getDb().prepare(`SELECT details_json FROM audit_events WHERE project_id = ? AND action IN ('admin_e2e_test_passed', 'admin_e2e_test_failed') ORDER BY created_at DESC, rowid DESC LIMIT 1`).get(id) as { details_json?: string } | undefined;
    try {
      const parsed = event?.details_json ? JSON.parse(event.details_json) as { checks?: SystemTestCheck[] } : {};
      systemTestChecks = Array.isArray(parsed.checks) ? parsed.checks : [];
    } catch { systemTestChecks = []; }
  }

  const profile = typeof autonomySettings?.profile === "string" ? autonomySettings.profile : "unattended";
  const runStage = typeof latestRun.stage === "string" ? latestRun.stage : null;
  const runProgress = Number(latestRun.progress || 0);

  const runSteps = [
    { key: "awaiting_files", label: "Ingestion", help: "Validate files, hashes, versions, OCR, and document hierarchy", icon: Database },
    { key: "processing", label: "Interpretation", help: "Extract and reconcile requirements, dates, questions, and attachments", icon: FileSearch },
    { key: "review_required", label: "Decision + drafting", help: "Match evidence, apply policy, price, draft, and record commitments", icon: Bot },
    { key: "ready", label: "Machine QA", help: "Run citation, consistency, authority, pricing, and portal checks", icon: ShieldCheck },
    { key: "delivered", label: "Delivery / submission", help: "Sign, submit, verify receipt, and issue the assurance pack", icon: Send },
  ];

  return (
    <div className="min-h-full bg-[#F4F1E8] font-['IBM_Plex_Sans',Arial,sans-serif] text-[#17202A]">
      <div className="border-b border-[#D9D5CB] bg-[#FBFAF6]">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <Link href="/admin" className="inline-flex items-center gap-1.5 text-xs font-medium text-[#667085] hover:text-[#1457FF]"><ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Operations console</Link>
          <div className="mt-4 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-sky-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-[#0A3D62]">{project.order_type}</span><span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-widest ${status === "failed" ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{status.replaceAll("_", " ")}</span></div>
              <h1 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#17202A]">{project.tender_title || project.company_name || "Autonomous project run"}</h1>
              <p className="mt-1 font-['IBM_Plex_Mono',monospace] text-[10px] text-[#667085]">{project.id}</p>
            </div>
            <form action={`/admin/projects/${id}/actions`} method="post" className="flex flex-col gap-2 sm:flex-row">
              <button name="action" value="run_autonomous" className="inline-flex min-h-10 items-center justify-center gap-2 bg-[#1457FF] px-4 text-xs font-semibold text-white hover:bg-[#0C45D8]"><Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" /> Start autonomous run</button>
              <button name="action" value="mark_ready" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50"><FileCheck2 className="h-3.5 w-3.5" aria-hidden="true" /> Re-run QA gate</button>
              <button name="action" value="deliver" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-700"><Send className="h-3.5 w-3.5" aria-hidden="true" /> Deliver report</button>
            </form>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        {query.e2e === "passed" && <div className="mb-5 flex flex-col justify-between gap-4 border border-emerald-300 bg-emerald-50 p-5 text-sm text-emerald-950 sm:flex-row sm:items-center"><div><strong>End-to-end test passed.</strong><p className="mt-1 text-xs leading-5">The synthetic project completed ingestion, extraction, decisions, citations, response structures, QA and report persistence without any external action.</p></div><Link href={`/project/${project.secure_token}/report`} className="inline-flex min-h-10 shrink-0 items-center justify-center bg-emerald-700 px-4 text-xs font-semibold text-white">Open test report</Link></div>}
        {query.e2e === "failed" && <div role="alert" className="mb-5 border border-red-300 bg-red-50 p-5 text-sm text-red-950"><strong>End-to-end test failed.</strong><p className="mt-1 text-xs leading-5">Inspect the run state, counts and audit trail below. No payment or external action was attempted.</p></div>}
        {isSystemTest && !query.e2e && <div className="mb-5 flex flex-col justify-between gap-3 border border-[#B9C7F5] bg-[#EEF1FB] p-4 text-xs text-[#33489F] sm:flex-row sm:items-center"><span><strong>Synthetic system test.</strong> This project contains no customer or buyer data.</span><Link href={`/project/${project.secure_token}/report`} className="font-semibold underline underline-offset-4">Open test report</Link></div>}

        {isSystemTest && systemTestChecks.length > 0 && <section aria-label="End-to-end test assertions" className="mb-5 overflow-hidden border border-[#D9D5CB] bg-[#FBFAF6]"><div className="border-b border-[#D9D5CB] p-4"><h2 className="font-semibold">End-to-end assertions</h2><p className="mt-1 text-xs text-[#667085]">Every item below is checked against persisted output from this synthetic run.</p></div><div className="grid sm:grid-cols-2 lg:grid-cols-3">{systemTestChecks.map((check) => <div key={check.label} className="flex items-center justify-between gap-4 border-b border-r border-[#E6E4DF] p-4 text-xs"><span className="font-medium">{check.label}</span><span className={check.passed ? "text-emerald-700" : "text-red-700"}>{check.passed ? "Passed" : "Failed"} · {check.detail}</span></div>)}</div></section>}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Requirements", value: requirements.length, caption: `${sourced} source locations`, icon: FileCheck2, style: "bg-sky-50 text-[#0A3D62]" },
            { label: "Material gaps", value: gaps, caption: "Missing, not met, or partial", icon: CircleAlert, style: "bg-red-50 text-red-700" },
            { label: "Receiver checks", value: checks, caption: "Visible, non-blocking flags", icon: AlertTriangle, style: "bg-amber-50 text-amber-700" },
            { label: "Avg confidence", value: `${averageConfidence}%`, caption: "Across extracted decisions", icon: Gauge, style: "bg-emerald-50 text-emerald-700" },
          ].map((item) => { const Icon = item.icon; return <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-xs font-medium text-slate-500">{item.label}</span><span className={`rounded-lg p-2 ${item.style}`}><Icon className="h-4 w-4" aria-hidden="true" /></span></div><div className="mt-3 text-2xl font-semibold text-slate-950">{item.value}</div><div className="mt-1 text-[11px] text-slate-500">{item.caption}</div></div>; })}
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_236px]">
          <div className="space-y-6">
            <section className="border border-[#D9D5CB] bg-[#FBFAF6] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4"><div><div className="font-['IBM_Plex_Mono',monospace] text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1457FF]">Run observability</div><h2 className="mt-1 text-lg font-semibold text-[#17202A]">End-to-end execution</h2>{runStage && <p className="mt-1 text-xs text-[#667085]">Latest stage: {runStage.replaceAll("_", " ")} · {runProgress}% · {String(latestRun.status || "unknown")}</p>}</div><Activity className="h-5 w-5 text-emerald-600" aria-hidden="true" /></div>
              <ol className="mt-6 space-y-1">
                {runSteps.map((step, index) => {
                  const Icon = step.icon;
                  const complete = currentIndex > index || status === "delivered";
                  const active = currentIndex === index || (status === "processing" && index === 1);
                  return (
                    <li key={step.key} className="relative flex gap-4 pb-6 last:pb-0">
                      {index < runSteps.length - 1 && <span className={`absolute left-[15px] top-8 h-[calc(100%-24px)] w-px ${complete ? "bg-emerald-300" : "bg-slate-200"}`} aria-hidden="true" />}
                      <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${complete ? "bg-emerald-600 text-white" : active ? "bg-[#1457FF] text-white ring-4 ring-[#DCE5FF]" : "border border-[#B7B2A7] bg-[#FBFAF6] text-[#8C929B]"}`}>{complete ? <Check className="h-4 w-4" aria-hidden="true" /> : active ? <Icon className="h-4 w-4" aria-hidden="true" /> : <Circle className="h-3 w-3" aria-hidden="true" />}</span>
                      <div className="min-w-0 flex-1 pt-1"><div className="flex flex-col justify-between gap-1 sm:flex-row"><h3 className={`text-sm font-semibold ${active ? "text-[#0A3D62]" : "text-slate-900"}`}>{step.label}</h3><span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{complete ? "Complete" : active ? "Active" : "Pending"}</span></div><p className="mt-1 text-xs leading-5 text-slate-500">{step.help}</p></div>
                    </li>
                  );
                })}
              </ol>
            </section>

            <section className="overflow-hidden border border-[#D9D5CB] bg-[#FBFAF6]">
              <div className="border-b border-slate-200 p-5"><h2 className="font-semibold text-slate-950">Decision register</h2><p className="mt-1 text-xs text-slate-500">Inspect or correct individual classifications. Changes remain in the audit trail.</p></div>
              <div className="divide-y divide-slate-200">
                {requirements.length === 0 && <div className="px-5 py-12 text-center text-sm text-slate-500"><FileSearch className="mx-auto mb-3 h-6 w-6 text-slate-400" aria-hidden="true" />No decision items yet. Start an autonomous run after the tender pack is uploaded.</div>}
                {requirements.map((item) => (
                  <details key={item.id} className="group open:bg-slate-50/60">
                    <summary className="grid cursor-pointer list-none gap-3 p-4 marker:hidden sm:grid-cols-[90px_1fr_120px_70px] sm:items-center sm:p-5">
                      <span className="self-start rounded-full bg-slate-100 px-2.5 py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-600">{item.type || "item"}</span>
                      <div><div className="text-sm font-semibold text-slate-950">{item.title || item.normalized_requirement || "Untitled decision"}</div><div className="mt-1 truncate font-mono text-[10px] text-slate-500">{item.page_or_location || item.document_id || "Source unresolved"}</div></div>
                      <span className={`self-start rounded-full border px-2.5 py-1 text-center text-[10px] font-semibold uppercase tracking-wide ${statusStyle(item.customer_status)}`}>{(item.customer_status || "uncertain").replaceAll("_", " ")}</span>
                      <span className="text-xs font-medium text-slate-500">{Math.round((item.confidence || 0) * 100)}%</span>
                    </summary>
                    <div className="border-t border-slate-200 bg-white p-5">
                      <div className="grid gap-4 lg:grid-cols-2">
                        <div><div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Source excerpt</div><blockquote className="mt-2 border-l-2 border-[#0A3D62] pl-3 text-xs leading-5 text-slate-600">{item.verbatim_excerpt || "No verbatim excerpt stored."}</blockquote></div>
                        <form action={`/admin/projects/${id}/actions`} method="post" className="grid gap-2 sm:grid-cols-2">
                          <input type="hidden" name="req_id" value={item.id} />
                          <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 sm:col-span-2">Title<input name="title" defaultValue={item.title || ""} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-normal normal-case tracking-normal outline-none focus:ring-2 focus:ring-[#0A3D62]/20" /></label>
                          <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Source<input name="page_or_location" defaultValue={item.page_or_location || ""} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-normal normal-case tracking-normal outline-none focus:ring-2 focus:ring-[#0A3D62]/20" /></label>
                          <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Decision<select name="customer_status" defaultValue={item.customer_status || "uncertain"} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-normal normal-case tracking-normal outline-none focus:ring-2 focus:ring-[#0A3D62]/20"><option value="met">met</option><option value="not_met">not met</option><option value="uncertain">uncertain</option><option value="missing">missing</option></select></label>
                          <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Confidence<input name="confidence" type="number" min="0" max="1" step="0.01" defaultValue={item.confidence || 0} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-normal normal-case tracking-normal outline-none focus:ring-2 focus:ring-[#0A3D62]/20" /></label>
                          <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 sm:col-span-2">Operational note<textarea name="notes" defaultValue={item.notes || ""} rows={2} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-normal normal-case tracking-normal outline-none focus:ring-2 focus:ring-[#0A3D62]/20" /></label>
                          <button className="inline-flex min-h-9 items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 sm:col-span-2 sm:justify-self-start"><BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" /> Save audited correction</button>
                        </form>
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-3 self-start xl:sticky xl:top-5">
            <section className="border border-[#D9D5CB] bg-[#FBFAF6] p-4">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-950"><Clock3 className="h-4 w-4 text-[#0A3D62]" aria-hidden="true" /> Project telemetry</h2>
              <dl className="mt-4 space-y-3 text-xs">
                {[["Company", project.company_name || "Not recorded"], ["Tender", project.tender_title || "Not recorded"], ["Deadline", displayDate(project.deadline)], ["Portal", project.portal || "Not recorded"], ["Created", displayDate(project.created_at)], ["Updated", displayDate(project.updated_at)]].map(([label, value]) => <div key={label} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0"><dt className="text-slate-500">{label}</dt><dd className="mt-1 font-medium text-slate-900">{value}</dd></div>)}
              </dl>
            </section>

            <section className="border border-[#1457FF] bg-[#1457FF] p-4 text-white">
              <div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Policy posture</h2><Bot className="h-5 w-5 text-sky-200" aria-hidden="true" /></div>
              <div className="mt-3 rounded-xl border border-white/15 bg-white/10 p-3"><div className="text-[10px] font-semibold uppercase tracking-widest text-sky-200">Operating profile</div><div className="mt-1 font-semibold capitalize">{profile}</div><div className="mt-1 text-xs leading-5 text-sky-100">External actions follow the saved mandate. Receiver assurance does not block the run.</div></div>
              <div className="mt-3 flex items-center justify-between text-xs"><span className="text-sky-100">Mandate</span><span className="font-semibold">{autonomySettings?.receiver_acknowledged_at ? "Acknowledged" : "Not acknowledged"}</span></div>
            </section>

            {checks > 0 && <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><div className="flex items-center gap-2 text-sm font-semibold text-amber-950"><AlertTriangle className="h-4 w-4" aria-hidden="true" /> {checks} receiver checks</div><p className="mt-2 text-xs leading-5 text-amber-900">These flags remain visible in the assurance pack but do not halt an unattended run unless a hard policy prohibition is triggered.</p></section>}
          </aside>
        </div>
      </main>
    </div>
  );
}
