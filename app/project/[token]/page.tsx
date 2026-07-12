import { notFound } from "next/navigation";
import { getProjectByToken } from "@/lib/projects";
import Link from "next/link";

interface Props { params: Promise<{ token: string }> }

export default async function ProjectHome({ params }: Props) {
  const { token } = await params;
  const project = getProjectByToken(token);
  if (!project) return notFound();

  const status = project.status;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex justify-between items-start">
        <div>
          <div className="text-xs uppercase tracking-widest text-[#0A3D62]">SECURE PROJECT</div>
          <h1 className="text-2xl font-semibold">{project.company_name || "New Project"} — {project.order_type.toUpperCase()}</h1>
          <div className="text-sm text-[#64748B]">Status: <span className="font-medium">{status}</span> • Token expires in ~7 days (or when revoked)</div>
        </div>
        <Link href={`/project/${token}/report`} className="text-sm underline">View report</Link>
      </div>

      <div className="mt-8 grid md:grid-cols-2 gap-6">
        <div className="bg-white border rounded p-5">
          <h3 className="font-semibold mb-2">1. Complete Intake</h3>
          {status === "created" || status === "paid" ? (
            <Link href={`/project/${token}/intake`} className="text-[#0A3D62] underline">Open company questionnaire →</Link>
          ) : <div className="text-sm text-emerald-600">Intake received.</div>}
          <p className="text-xs mt-2 text-[#64748B]">Required before upload. Includes consent.</p>
        </div>

        <div className="bg-white border rounded p-5">
          <h3 className="font-semibold mb-2">2. Upload Tender Pack</h3>
          {status === "awaiting_files" || status === "awaiting_intake" ? (
            <Link href={`/project/${token}/upload`} className="text-[#0A3D62] underline">Upload files (PDF, DOCX, XLSX…)</Link>
          ) : <div className="text-sm">Files received. <Link href={`/project/${token}/upload`} className="underline">Add more</Link></div>}
          <p className="text-xs mt-2 text-[#64748B]">Max 20 files, 200 MB total. We validate type &amp; size.</p>
        </div>
      </div>

      <div className="mt-6 bg-white border p-5 rounded text-sm">
        <div className="font-medium mb-1">Next steps (visible to you)</div>
        <ul className="list-disc pl-5 text-[#475569]">
          <li>After upload we begin staged extraction (visible progress).</li>
          <li>An administrator reviews every important extracted item.</li>
          <li>You receive an email/link when the report is ready (currently manual in concierge mode).</li>
          <li>You can request deletion of your files at any time.</li>
        </ul>
        <div className="mt-3 text-xs">Report link will appear here once delivered: <Link href={`/project/${token}/report`} className="underline">/project/{token}/report</Link></div>
      </div>

      <p className="mt-8 text-[10px] text-[#64748B]">Keep this link private. Anyone with the token can view the project while it is valid.</p>
    </div>
  );
}
