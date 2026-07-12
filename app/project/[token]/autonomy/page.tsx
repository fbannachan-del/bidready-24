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
    <div className="min-h-full bg-[#F4F1E8] font-['IBM_Plex_Sans',Arial,sans-serif] text-[#17202A]">
      <div className="border-b border-[#D9D5CB] bg-[#FBFAF6]">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 lg:px-8">
          <Link href={`/project/${token}`} className="inline-flex items-center gap-1.5 text-xs font-medium text-[#667085] hover:text-[#1457FF]">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Project workspace
          </Link>
          <div className="mt-4 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#1457FF]">
                <Radar className="h-4 w-4" aria-hidden="true" /> Autonomous operations
              </div>
              <h1 className="text-3xl font-semibold tracking-[-0.03em] text-[#17202A]">Autonomy control centre</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667085]">
                Define what BidReady 24 may decide and do for {project.company_name || "this organisation"}. Every machine action remains source-traceable, policy-bound, and visible in the audit record.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 self-start border border-[#D9D5CB] bg-[#F4F1E8] px-3 py-1.5 font-['IBM_Plex_Mono',monospace] text-[10px] text-[#667085] md:self-auto">
              <LockKeyhole className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" /> Secure project mandate
            </div>
          </div>
        </div>
      </div>

      <main className="mx-auto grid max-w-6xl gap-5 px-4 py-7 sm:px-6 lg:grid-cols-[236px_minmax(0,1fr)] lg:px-8">
        <aside className="self-start border border-[#D9D5CB] bg-[#FBFAF6] p-3 lg:sticky lg:top-5" aria-label="Autonomy settings navigation">
          <div className="px-2 py-2 font-['IBM_Plex_Mono',monospace] text-[10px] font-semibold uppercase tracking-[0.16em] text-[#667085]">Settings</div>
          <nav className="mt-1 space-y-1 text-sm">
            <a href="#operating-profile" className="block border-l-2 border-[#1457FF] bg-[#EEF3FF] px-3 py-2.5 font-medium text-[#1457FF]">Operating profile</a>
            <a href="#action-policy" className="block border-l-2 border-transparent px-3 py-2.5 text-[#667085] hover:bg-[#F4F1E8] hover:text-[#17202A]">Action policy</a>
            <a href="#receiver-mandate" className="block border-l-2 border-transparent px-3 py-2.5 text-[#667085] hover:bg-[#F4F1E8] hover:text-[#17202A]">Receiver mandate</a>
          </nav>
          <div className="mt-4 border-t border-[#D9D5CB] px-2 pt-4 text-xs leading-5 text-[#667085]">Changes are versioned and written to the project audit trail.</div>
        </aside>
        <AutonomyControlCenter token={token} companyName={project.company_name || ""} />
      </main>
    </div>
  );
}
