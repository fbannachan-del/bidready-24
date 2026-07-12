import RunTenderButton from "@/components/project/RunTenderButton";
import { getAutonomyDashboard } from "@/lib/autonomy";
import { getProjectByToken, getRequirements } from "@/lib/projects";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  CalendarClock,
  Check,
  ChevronRight,
  Circle,
  CircleAlert,
  FileCheck2,
  FileText,
  Gauge,
  LockKeyhole,
  Radar,
  ShieldCheck,
  UploadCloud,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

type RequirementRow = {
  id: string;
  type?: string;
  customer_status?: string;
  confidence?: number;
  review_required?: number | boolean;
};

const STATUS_ORDER = [
  "created",
  "paid",
  "awaiting_intake",
  "awaiting_files",
  "processing",
  "review_required",
  "ready",
  "delivered",
];

const STATUS_LABELS: Record<string, string> = {
  created: "Setup required",
  paid: "Setup required",
  awaiting_intake: "Intake required",
  awaiting_files: "Ready for documents",
  processing: "Autonomous run in progress",
  review_required: "Run complete · checks flagged",
  ready: "Ready",
  delivered: "Report ready",
  failed: "Run needs attention",
};

function safeIntake(value: unknown) {
  if (typeof value !== "string" || !value) return {} as Record<string, unknown>;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {} as Record<string, unknown>;
  }
}

function formatDate(value: unknown) {
  if (typeof value !== "string" || !value) return "Not confirmed";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: value.includes(":") ? "short" : undefined }).format(date);
}

export default async function ProjectHome({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const project = getProjectByToken(token);
  if (!project) notFound();

  const requirements = getRequirements(project.id) as RequirementRow[];
  const dashboard = getAutonomyDashboard(project.id);
  const run = (dashboard.latestRun || {}) as Record<string, unknown>;
  const runCounts = (dashboard.counts || {}) as Record<string, unknown>;
  const autonomySettings = dashboard.settings as null | (Record<string, unknown> & { mandate?: Record<string, unknown> });
  const intake = safeIntake(project.intake_json);
  const status = String(project.status || "created");
  const statusIndex = STATUS_ORDER.indexOf(status);
  const intakeComplete = Boolean(project.intake_json);
  const hasAnalysis = requirements.length > 0;
  const met = requirements.filter((item) => item.customer_status === "met").length;
  const gaps = requirements.filter((item) => ["missing", "not_met"].includes(item.customer_status || "")).length;
  const uncertain = requirements.filter((item) => item.customer_status === "uncertain" || item.review_required).length;
  const completion = requirements.length ? Math.round((met / requirements.length) * 100) : 0;
  const canRun = intakeComplete && !["created", "paid", "awaiting_intake"].includes(status);
  const profile = typeof autonomySettings?.profile === "string" ? autonomySettings.profile : "unattended";
  const mandateActive = Boolean(autonomySettings?.receiver_acknowledged_at || autonomySettings?.mandate?.acceptedReceiverResponsibility);

  const stages = [
    { label: "Organisation", complete: intakeComplete, active: !intakeComplete },
    { label: "Tender pack", complete: statusIndex >= STATUS_ORDER.indexOf("processing") || hasAnalysis, active: intakeComplete && !hasAnalysis && status === "awaiting_files" },
    { label: "Autonomous run", complete: hasAnalysis || statusIndex >= STATUS_ORDER.indexOf("review_required"), active: status === "processing" },
    { label: "Assurance", complete: ["ready", "delivered"].includes(status), active: status === "review_required" },
    { label: "Submission", complete: status === "delivered", active: status === "ready" },
  ];

  return (
    <div className="min-h-full bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-[#0A3D62]">
                  <LockKeyhole className="h-3 w-3" aria-hidden="true" /> Secure workspace
                </span>
                <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${status === "failed" ? "bg-red-50 text-red-700" : status === "processing" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                  {STATUS_LABELS[status] || status.replaceAll("_", " ")}
                </span>
              </div>
              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{project.tender_title || `${project.company_name || "Your organisation"} tender`}</h1>
              <p className="mt-1 text-sm text-slate-600">{project.company_name || "Organisation not confirmed"} · {String(project.order_type || "preflight").replace("_", " ")} workspace</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Link href={`/project/${token}/autonomy`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50">
                <Radar className="h-4 w-4 text-[#0A3D62]" aria-hidden="true" /> Autonomy policy
              </Link>
              <Link href={`/project/${token}/report`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800">
                Open assurance report <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <ol className="mt-7 grid grid-cols-2 gap-2 sm:grid-cols-5" aria-label="Tender workflow progress">
            {stages.map((stage, index) => (
              <li key={stage.label} className={`relative rounded-lg border px-3 py-2.5 ${stage.active ? "border-[#0A3D62] bg-sky-50" : stage.complete ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
                <div className="flex items-center gap-2">
                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${stage.complete ? "bg-emerald-600 text-white" : stage.active ? "bg-[#0A3D62] text-white" : "border border-slate-300 bg-white text-slate-400"}`}>
                    {stage.complete ? <Check className="h-3 w-3" aria-hidden="true" /> : stage.active ? <span className="text-[10px] font-bold">{index + 1}</span> : <Circle className="h-2.5 w-2.5" aria-hidden="true" />}
                  </span>
                  <span className={`text-xs font-medium ${stage.active ? "text-[#0A3D62]" : stage.complete ? "text-emerald-800" : "text-slate-500"}`}>{stage.label}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col justify-between gap-5 bg-slate-950 p-5 text-white sm:flex-row sm:items-center sm:p-6">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-sky-300"><Bot className="h-4 w-4" aria-hidden="true" /> Autonomous tender operator</div>
                  <h2 className="mt-2 text-xl font-semibold">{hasAnalysis ? "Run again with the latest evidence" : "Start the end-to-end tender run"}</h2>
                  <p className="mt-1 max-w-xl text-sm leading-6 text-slate-300">BidReady analyses, decides, drafts, validates, and acts inside your saved mandate. It records every source, assumption, policy decision, and external action.</p>
                </div>
                <div className="shrink-0 rounded-xl border border-white/15 bg-white/10 p-3 text-center">
                  <div className="text-2xl font-semibold">{requirements.length}</div>
                  <div className="text-[10px] uppercase tracking-widest text-slate-300">requirements</div>
                </div>
              </div>
              <div className="p-5 sm:p-6">
                {!intakeComplete && (
                  <div className="mb-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                    <div><strong>Organisation details required.</strong> Complete the intake so decisions and commitments can be grounded in the correct legal entity.</div>
                  </div>
                )}
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <RunTenderButton token={token} disabled={!canRun} />
                  <p className="max-w-sm text-xs leading-5 text-slate-500">The receiver does not need to approve each result. Any item that cannot be determined is still reported explicitly with its evidence and consequence.</p>
                </div>
              </div>
            </section>

            <section aria-labelledby="readiness-heading">
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-widest text-[#0A3D62]">Current position</div>
                  <h2 id="readiness-heading" className="mt-1 text-xl font-semibold tracking-tight text-slate-950">Bid readiness</h2>
                </div>
                <Link href={`/project/${token}/report`} className="hidden items-center gap-1 text-xs font-semibold text-[#0A3D62] sm:flex">View full evidence <ChevronRight className="h-4 w-4" aria-hidden="true" /></Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: "Verified met", value: met, caption: `${completion}% of extracted items`, icon: BadgeCheck, colour: "text-emerald-700", bg: "bg-emerald-50" },
                  { label: "Material gaps", value: Number(runCounts.open_gaps ?? gaps), caption: "Open evidence or eligibility gaps", icon: CircleAlert, colour: "text-red-700", bg: "bg-red-50" },
                  { label: "Verify", value: uncertain, caption: "Uncertain or low confidence", icon: ShieldCheck, colour: "text-amber-700", bg: "bg-amber-50" },
                  { label: "Tender questions", value: Number(runCounts.questions ?? requirements.filter((item) => item.type === "scored").length), caption: "Scored response items", icon: FileText, colour: "text-[#0A3D62]", bg: "bg-sky-50" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between"><span className="text-xs font-medium text-slate-500">{item.label}</span><span className={`rounded-lg p-2 ${item.bg} ${item.colour}`}><Icon className="h-4 w-4" aria-hidden="true" /></span></div>
                      <div className="mt-3 text-2xl font-semibold text-slate-950">{item.value}</div>
                      <div className="mt-1 text-[11px] text-slate-500">{item.caption}</div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-semibold text-slate-950">Workspace inputs</h2>
                  <p className="mt-1 text-xs text-slate-500">Keep tender and organisation evidence current. New evidence can automatically trigger a fresh decision pass.</p>
                </div>
                <UploadCloud className="h-5 w-5 text-[#0A3D62]" aria-hidden="true" />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Link href={`/project/${token}/intake`} className="group rounded-xl border border-slate-200 p-4 hover:border-[#0A3D62] hover:bg-sky-50/50">
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-lg bg-slate-100 p-2 text-slate-700"><FileCheck2 className="h-4 w-4" aria-hidden="true" /></span>
                    <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${intakeComplete ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{intakeComplete ? "COMPLETE" : "ACTION"}</span>
                  </div>
                  <div className="mt-3 text-sm font-semibold text-slate-950">Organisation evidence</div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{intakeComplete ? "Update facts, authority, certifications, and operating constraints." : "Add the legal entity, bid contact, and initial company facts."}</p>
                </Link>
                <Link href={`/project/${token}/upload`} className="group rounded-xl border border-slate-200 p-4 hover:border-[#0A3D62] hover:bg-sky-50/50">
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-lg bg-slate-100 p-2 text-slate-700"><UploadCloud className="h-4 w-4" aria-hidden="true" /></span>
                    <span className="rounded-full bg-sky-50 px-2 py-1 text-[10px] font-semibold text-[#0A3D62]">ADD ANY TIME</span>
                  </div>
                  <div className="mt-3 text-sm font-semibold text-slate-950">Tender pack and evidence</div>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Upload buyer documents, amendments, certificates, policies, schedules, and supporting records.</p>
                </Link>
              </div>
            </section>
          </div>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-950"><CalendarClock className="h-4 w-4 text-[#0A3D62]" aria-hidden="true" /> Tender facts</div>
              <dl className="mt-4 space-y-3 text-xs">
                <div className="border-b border-slate-100 pb-3"><dt className="text-slate-500">Submission deadline</dt><dd className="mt-1 font-semibold text-slate-900">{formatDate(project.deadline || intake.bid_deadline)}</dd></div>
                <div className="border-b border-slate-100 pb-3"><dt className="text-slate-500">Portal</dt><dd className="mt-1 font-semibold text-slate-900">{String(project.portal || intake.portal || "Not confirmed")}</dd></div>
                <div className="border-b border-slate-100 pb-3"><dt className="text-slate-500">Service area / lots</dt><dd className="mt-1 font-semibold text-slate-900">{String(intake.service_area || "Not confirmed")}</dd></div>
                <div><dt className="text-slate-500">Project reference</dt><dd className="mt-1 break-all font-mono text-[11px] text-slate-700">{project.id}</dd></div>
              </dl>
            </section>

            <section className="rounded-2xl border border-[#0A3D62] bg-[#0A3D62] p-5 text-white shadow-sm">
              <div className="flex items-center justify-between"><div className="text-sm font-semibold capitalize">{profile} mandate</div><Gauge className="h-5 w-5 text-sky-200" aria-hidden="true" /></div>
              <p className="mt-2 text-xs leading-5 text-sky-100">{mandateActive ? "Receiver authority is recorded. Actions are governed by the current policy and mandate versions." : "Complete the receiver mandate before signing, submission, and company commitments can activate."}</p>
              {typeof run.stage === "string" && <div className="mt-3 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-[11px] text-sky-100">Latest run: <span className="font-semibold text-white">{run.stage.replaceAll("_", " ")}</span> · {Number(run.progress || 0)}%</div>}
              <Link href={`/project/${token}/autonomy`} className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold underline decoration-sky-300 underline-offset-4">Open control centre <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-950"><ShieldCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" /> Receiver assurance</div>
              <p className="mt-2 text-xs leading-5 text-slate-500">The completed report separates verified facts, secondary evidence, inference, assumptions, conflicts, commitments, and actions so the receiver can check accuracy efficiently.</p>
              <Link href={`/project/${token}/report#assurance`} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#0A3D62]">Review assurance pack <ChevronRight className="h-4 w-4" aria-hidden="true" /></Link>
            </section>
          </aside>
        </div>

        <p className="mt-7 flex items-center justify-center gap-1.5 text-[11px] text-slate-500"><LockKeyhole className="h-3 w-3" aria-hidden="true" /> Keep this secure link private. All autonomous actions are recorded against this project.</p>
      </main>
    </div>
  );
}
