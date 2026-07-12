import { notFound } from "next/navigation";
import { getProjectById, getRequirements, addRequirement, updateProjectStatus } from "@/lib/projects";
import Link from "next/link";

interface Props { params: Promise<{ id: string }> }

export default async function AdminProject({ params }: Props) {
  const { id } = await params;
  const project = getProjectById(id);
  if (!project) return notFound();

  const requirements = getRequirements(id) as any[];

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Link href="/admin" className="text-xs underline">← Queue</Link>
      <h1 className="text-xl font-semibold mt-2">Review: {project.id} — {project.company_name}</h1>
      <div className="text-xs">Status: {project.status} | Order: {project.order_type}</div>

      <form action={`/admin/projects/${id}/actions`} method="post" className="my-4">
        <button name="action" value="run_stub" className="px-3 py-1 text-xs border rounded bg-white">Run basic extraction stub (create sample requirements)</button>
        <button name="action" value="mark_ready" className="ml-2 px-3 py-1 text-xs border rounded bg-white">Mark ready for delivery</button>
        <button name="action" value="deliver" className="ml-2 px-3 py-1 text-xs border rounded bg-emerald-600 text-white">Deliver to customer</button>
      </form>

      <h2 className="font-semibold mt-6 mb-2">Requirements (edit in place — form posts update)</h2>
      <div className="space-y-3">
        {requirements.length === 0 && <div className="text-sm">No requirements yet. Run the stub or add manually.</div>}
        {requirements.map((r: any) => (
          <details key={r.id} className="bg-white border p-3 text-sm rounded">
            <summary className="cursor-pointer font-medium">{r.title} — <span className="text-xs font-normal">{r.customer_status}</span></summary>
            <form action={`/admin/projects/${id}/actions`} method="post" className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
              <input type="hidden" name="req_id" value={r.id} />
              <input name="title" defaultValue={r.title} className="border p-1 text-xs" />
              <input name="page_or_location" defaultValue={r.page_or_location || ""} className="border p-1 text-xs" placeholder="p.3 / Section 4" />
              <select name="customer_status" defaultValue={r.customer_status} className="border p-1 text-xs">
                <option value="met">met</option><option value="not_met">not_met</option><option value="uncertain">uncertain</option><option value="missing">missing</option>
              </select>
              <input name="confidence" type="number" step="0.1" defaultValue={r.confidence} className="border p-1 text-xs" />
              <textarea name="notes" defaultValue={r.notes || ""} className="border p-1 text-xs md:col-span-2" placeholder="Admin notes" />
              <button className="text-xs border px-2 py-1 col-span-1">Save changes</button>
            </form>
            <div className="text-[10px] mt-1 text-[#64748B] citation">{r.verbatim_excerpt}</div>
          </details>
        ))}
      </div>

      <div className="mt-6 text-xs text-[#64748B]">Every change is logged in audit_events. Deliver only after you are satisfied that nothing unsupported is presented as fact.</div>
    </div>
  );
}
