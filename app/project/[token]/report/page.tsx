import ReportWorkspace, { type ReportRequirement } from "@/components/report/ReportWorkspace";
import { getAutonomyDashboard } from "@/lib/autonomy";
import { getRequirements } from "@/lib/projects";
import { resolveAccessibleProjectForPage } from "@/lib/project-access";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function ReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const project = await resolveAccessibleProjectForPage(token);
  if (!project) notFound();

  const requirements = getRequirements(project.id) as ReportRequirement[];
  const dashboard = getAutonomyDashboard(project.id);
  const counts = (dashboard.counts || {}) as Record<string, unknown>;
  const latestRun = (dashboard.latestRun || {}) as Record<string, unknown>;
  const settings = (dashboard.settings || {}) as Record<string, unknown>;

  // Extraction summary from the latest succeeded run, so a partial run (some
  // documents unreadable) is shown honestly rather than as clean 100% coverage.
  let extraction: { uploaded: number; processed: number; failures: Array<{ name: string; error?: string }>; aiDegraded?: boolean; aiError?: string } | null = null;
  try {
    if (latestRun.status === "succeeded") {
      const metrics = typeof latestRun.metrics_json === "string" ? JSON.parse(latestRun.metrics_json) : (latestRun.metrics_json || {});
      const ex = metrics?.extraction;
      const ps = metrics?.providerStatus;
      if (ex && typeof ex.uploaded === "number") {
        extraction = {
          uploaded: ex.uploaded,
          processed: typeof ex.processed === "number" ? ex.processed : 0,
          failures: Array.isArray(ex.failures) ? ex.failures.map((f: { name?: unknown; error?: unknown }) => ({ name: String(f?.name ?? "document"), error: f?.error ? String(f.error) : undefined })) : [],
          aiDegraded: Boolean(ps && ps.attempted && !ps.ok),
          aiError: ps && ps.error ? String(ps.error) : undefined,
        };
      }
    }
  } catch {
    extraction = null;
  }

  return (
    <div className="min-h-full bg-[#F4F1E8] font-['IBM_Plex_Sans',Arial,sans-serif]">
      <div className="border-b border-[#D9D5CB] bg-[#FBFAF6] print:hidden">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link href={`/project/${token}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-[#667085] hover:text-[#1457FF]"><ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Project workspace</Link>
          <span className="inline-flex items-center gap-1.5 font-['IBM_Plex_Mono',monospace] text-[10px] uppercase tracking-wide text-[#667085]"><LockKeyhole className="h-3 w-3 text-emerald-600" aria-hidden="true" /> Private receiver report</span>
        </div>
      </div>
      <ReportWorkspace
        token={token}
        runSummary={{
          profile: typeof settings.profile === "string" ? settings.profile : "unattended",
          runStatus: typeof latestRun.status === "string" ? latestRun.status : "not started",
          runStage: typeof latestRun.stage === "string" ? latestRun.stage : "not started",
          failedQa: Number(counts.failed_qa || 0),
          submissions: Number(counts.submissions || 0),
          attachments: Number(counts.attachments || 0),
          clarifications: Number(counts.open_clarifications || 0),
        }}
        project={{
          company_name: project.company_name || "Your organisation",
          tender_title: project.tender_title || "Tender compliance preflight",
          order_type: String(project.order_type || "preflight").replaceAll("_", " "),
          status: String(project.status || "processing"),
          deadline: project.deadline || "Not confirmed",
        }}
        requirements={requirements}
        extraction={extraction}
      />
    </div>
  );
}
