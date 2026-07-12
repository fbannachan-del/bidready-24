import { listProjectsForAdmin } from "@/lib/projects";
import Link from "next/link";

export default async function AdminHome() {
  // In real: protect with password check (cookie or basic auth header)
  const projects = listProjectsForAdmin() as any[];

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-semibold mb-1">Admin Queue</h1>
      <p className="text-sm mb-4 text-[#64748B]">Concierge mode. Review, edit, approve, deliver manually.</p>

      <div className="mb-4 text-xs bg-amber-50 p-2 border border-amber-200">Admin password protection is minimal in MVP. Set ADMIN_PASSWORD in env and implement real gate before any preview with real data.</div>

      <table className="table w-full bg-white text-sm">
        <thead><tr><th>ID</th><th>Type</th><th>Status</th><th>Company</th><th>Created</th><th></th></tr></thead>
        <tbody>
          {projects.length === 0 && <tr><td colSpan={6} className="p-3 text-xs">No projects yet. Use test checkout to create one.</td></tr>}
          {projects.map((p: any) => (
            <tr key={p.id}>
              <td className="font-mono text-xs">{p.id}</td>
              <td>{p.order_type}</td>
              <td>{p.status}</td>
              <td>{p.company_name || "-"}</td>
              <td className="text-xs">{p.created_at}</td>
              <td><Link href={`/admin/projects/${p.id}`} className="underline">Review</Link></td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 text-xs">To simulate full pipeline: after a project has files, go to the project review screen and use "Run basic extraction" then approve items.</div>
    </div>
  );
}
