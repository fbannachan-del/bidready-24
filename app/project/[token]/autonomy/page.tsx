import AutonomyControlCenter from "@/components/autonomy/AutonomyControlCenter";
import { getProjectByToken } from "@/lib/projects";
import { ArrowLeft, LockKeyhole, Radar } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function AutonomyPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const project = getProjectByToken(token);
  if (!project) notFound();

  return (
    <div className="min-h-full bg-slate-50">
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
          <Link href={`/project/${token}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-[#0A3D62]">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Project workspace
          </Link>
          <div className="mt-4 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#0A3D62]">
                <Radar className="h-4 w-4" aria-hidden="true" /> Autonomous operations
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Autonomy control centre</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Define what BidReady 24 may decide and do for {project.company_name || "this organisation"}. Every machine action remains source-traceable, policy-bound, and visible in the audit record.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 md:self-auto">
              <LockKeyhole className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" /> Secure project mandate
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-4 py-7 sm:px-6 lg:px-8">
        <AutonomyControlCenter token={token} companyName={project.company_name || ""} />
      </main>
    </div>
  );
}
