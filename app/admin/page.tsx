import { listProjectsForAdmin } from "@/lib/projects";
import { listSupportRequests } from "@/lib/support";
import { AlertTriangle, ArrowRight, Bot, CircleAlert, Clock3, Gauge, ListChecks, Radar, ShieldCheck } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

type AdminProject = {
  id: string;
  order_type: string;
  amount_pence?: number;
  status: string;
  company_name?: string | null;
  tender_title?: string | null;
  deadline?: string | null;
  created_at?: string | null;
};

const STATUS_STYLE: Record<string, string> = {
  processing: "border-sky-200 bg-sky-50 text-sky-700",
  review_required: "border-amber-200 bg-amber-50 text-amber-700",
  ready: "border-emerald-200 bg-emerald-50 text-emerald-700",
  delivered: "border-emerald-200 bg-emerald-50 text-emerald-700",
  failed: "border-red-200 bg-red-50 text-red-700",
  awaiting_files: "border-slate-200 bg-slate-50 text-slate-700",
};

function displayDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium" }).format(date);
}

export default async function AdminHome() {
  const projects = listProjectsForAdmin() as AdminProject[];
  const supportRequests = listSupportRequests();
  const running = projects.filter((item) => item.status === "processing").length;
  const attention = projects.filter((item) => ["review_required", "failed"].includes(item.status)).length;
  const complete = projects.filter((item) => ["ready", "delivered"].includes(item.status)).length;

  return (
    <div className="min-h-full bg-[#F4F1E8] font-['IBM_Plex_Sans',Arial,sans-serif] text-[#17202A]">
      <div className="border-b border-[#2C3440] bg-[#17202A] text-white">
        <div className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="flex items-center gap-2 font-['IBM_Plex_Mono',monospace] text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7EA0FF]"><Radar className="h-4 w-4" aria-hidden="true" /> Operations console</div>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em]">Autonomous bid fleet</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#C5CBD3]">Runs, exceptions, mandates and submission outcomes across active projects.</p>
            </div>
            <div className="inline-flex self-start rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-slate-200 md:self-auto"><ShieldCheck className="mr-2 h-3.5 w-3.5 text-emerald-400" aria-hidden="true" /> Admin session</div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        <section aria-label="Portfolio health" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Projects", value: projects.length, caption: "Latest 100 workspaces", icon: ListChecks, colour: "text-[#1457FF]", bg: "bg-[#EEF3FF]" },
            { label: "Runs active", value: running, caption: "Autonomous processing", icon: Bot, colour: "text-sky-700", bg: "bg-sky-50" },
            { label: "Attention", value: attention, caption: "Exceptions or failures", icon: CircleAlert, colour: "text-amber-700", bg: "bg-amber-50" },
            { label: "Ready / delivered", value: complete, caption: "Machine gates completed", icon: Gauge, colour: "text-emerald-700", bg: "bg-emerald-50" },
          ].map((item) => {
            const Icon = item.icon;
            return <div key={item.label} className="border border-[#D9D5CB] bg-[#FBFAF6] p-5"><div className="flex items-center justify-between"><span className="font-['IBM_Plex_Mono',monospace] text-[10px] font-medium uppercase tracking-wide text-[#667085]">{item.label}</span><span className={`p-2 ${item.bg} ${item.colour}`}><Icon className="h-4 w-4" aria-hidden="true" /></span></div><div className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-[#17202A]">{item.value}</div><div className="mt-1 text-[11px] text-[#667085]">{item.caption}</div></div>;
          })}
        </section>

        <section className="mt-5 overflow-hidden border border-[#D9D5CB] bg-[#FBFAF6]">
          <div className="border-b border-slate-200 p-5"><h2 className="font-semibold text-slate-950">Support inbox</h2><p className="mt-1 text-xs text-slate-500">Validated website enquiries are retained here even if the optional notification adapter is unavailable.</p></div>
          {supportRequests.length === 0 ? <p className="p-5 text-sm text-slate-500">No support requests.</p> : <div className="divide-y divide-slate-200">{supportRequests.map((request) => <article key={request.id} className="p-5"><div className="flex flex-wrap items-center justify-between gap-2"><div className="font-medium text-slate-950">{request.name} · <a className="text-[#0A3D62] underline" href={`mailto:${request.email}`}>{request.email}</a></div><div className="text-[11px] text-slate-500">{displayDate(request.created_at)} · {request.status}</div></div>{request.project_ref && <div className="mt-1 text-xs text-slate-500">Project: {request.project_ref}</div>}<p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{request.message}</p></article>)}</div>}
        </section>

        <section className="mt-5 overflow-hidden border border-[#D9D5CB] bg-[#FBFAF6]">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center">
            <div><h2 className="font-semibold text-slate-950">Project operations</h2><p className="mt-1 text-xs text-slate-500">Open a project to inspect its latest run, decision coverage, and policy events.</p></div>
            <div className="inline-flex items-center gap-2 self-start rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-medium text-slate-600"><Clock3 className="h-3.5 w-3.5" aria-hidden="true" /> Live project state</div>
          </div>

          {projects.length === 0 ? (
            <div className="px-5 py-16 text-center"><Bot className="mx-auto h-7 w-7 text-slate-400" aria-hidden="true" /><h3 className="mt-3 text-sm font-semibold text-slate-900">No projects yet</h3><p className="mt-1 text-xs text-slate-500">A project will appear here as soon as checkout creates its secure workspace.</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="bg-slate-50 text-[10px] font-semibold uppercase tracking-widest text-slate-500"><tr><th className="px-5 py-3">Project</th><th className="px-4 py-3">Profile</th><th className="px-4 py-3">Run state</th><th className="px-4 py-3">Deadline</th><th className="px-4 py-3">Created</th><th className="px-5 py-3"><span className="sr-only">Open</span></th></tr></thead>
                <tbody className="divide-y divide-slate-200">
                  {projects.map((project) => (
                    <tr key={project.id} className="group hover:bg-slate-50/80">
                      <td className="px-5 py-4"><div className="font-semibold text-slate-950">{project.tender_title || project.company_name || "Untitled tender"}</div><div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500"><span>{project.company_name || "No company"}</span><span>·</span><span className="font-mono">{project.id}</span></div></td>
                      <td className="px-4 py-4"><span className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-violet-700"><Bot className="h-3 w-3" aria-hidden="true" /> {project.order_type === "complete" ? "Unattended" : "Preflight"}</span></td>
                      <td className="px-4 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${STATUS_STYLE[project.status] || "border-slate-200 bg-slate-50 text-slate-700"}`}>{project.status.replaceAll("_", " ")}</span></td>
                      <td className="px-4 py-4 text-xs font-medium text-slate-700">{displayDate(project.deadline)}</td>
                      <td className="px-4 py-4 text-xs text-slate-500">{displayDate(project.created_at)}</td>
                      <td className="px-5 py-4 text-right"><Link href={`/admin/projects/${project.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-[#1457FF]">Inspect <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" aria-hidden="true" /></Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="mt-5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><span>Operational note: admin access is still protected by the configured admin key. Replace this with full role-based authentication before real customer submission credentials or signing authority are stored.</span></div>
      </main>
    </div>
  );
}
