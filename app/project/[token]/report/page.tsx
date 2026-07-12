import { notFound } from "next/navigation";
import { getProjectByToken, getRequirements } from "@/lib/projects";
import Link from "next/link";

interface Props { params: Promise<{ token: string }> }

export default async function Report({ params }: Props) {
  const { token } = await params;
  const project = getProjectByToken(token);
  if (!project) return notFound();

  const requirements = getRequirements(project.id) as any[];

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-xs text-emerald-600">DELIVERED REPORT — {project.order_type.toUpperCase()}</div>
          <h1 className="text-2xl font-semibold tracking-tight">{project.company_name || "Your Company"} — Compliance Preflight</h1>
        </div>
        <div className="text-xs">Source: {project.tender_title || "Tender pack"} • Generated with human review</div>
      </div>

      <div className="bg-white border p-5 rounded mb-6 text-sm">
        <strong>Executive Summary (stub)</strong><br />
        Tender analysed. {requirements.length} requirements extracted. All items below require your verification against the original documents. 
        No company claims were invented. Status shown is based on intake + evidence supplied at time of analysis.
      </div>

      <h2 className="font-semibold mb-2">Mandatory &amp; Key Requirements</h2>
      {requirements.length === 0 && <div className="text-sm text-amber-700 bg-amber-50 p-3 rounded">No requirements extracted yet. Administrator review pending or pipeline not run on this project.</div>}

      <table className="table w-full bg-white text-sm mb-8">
        <thead>
          <tr className="bg-[#F8F9FA]">
            <th>Requirement</th><th>Source</th><th>Status</th><th>Notes / Action</th>
          </tr>
        </thead>
        <tbody>
          {requirements.map((r: any) => (
            <tr key={r.id}>
              <td>{r.normalized_requirement}<br /><span className="citation">{r.verbatim_excerpt?.slice(0, 80)}</span></td>
              <td className="citation">{r.page_or_location || r.document_id}</td>
              <td><span className={`status-${r.customer_status} px-2 py-0.5 text-xs rounded border`}>{r.customer_status}</span></td>
              <td className="text-xs">{r.notes || (r.review_required ? "Review required" : "")}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="text-xs text-[#64748B] border-t pt-4">
        Methodology: Text extracted from your uploads. Requirements identified by pattern + human review. 
        All customer facts labelled uncertain/missing unless directly evidenced in your intake or uploaded files. 
        This report is a starting point only. You must cross-check every citation.
      </div>

      <div className="mt-4 flex gap-3">
        <a href={`/api/exports/${token}/csv`} className="text-xs underline">Download CSV matrix</a>
        <Link href={`/project/${token}`} className="text-xs underline">Back to project</Link>
      </div>
    </div>
  );
}
