import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getProjectById, addRequirement, updateProjectStatus, updateRequirement } from "@/lib/projects";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = getProjectById(id);
  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 });

  const form = await req.formData();
  const action = form.get("action") as string;
  const db = getDb();

  if (action === "run_stub") {
    // Use pipeline stub — looks for files and builds from keywords + known cleaning tender items
    const { buildStubAnalysis } = await import("@/lib/pipeline");
    const db = (await import("@/lib/db")).getDb();
    const files = db.prepare(`SELECT stored_path, original_name FROM files WHERE project_id = ?`).all(id) as any[];
    let text = "Sample tender content for cleaning services. CHAS required. Insurance £10m. Mobilisation plan. Method statements.";
    if (files.length > 0) {
      // simplistic: use first file name as context
      text += " " + files.map((f: any) => f.original_name).join(" ");
    }
    const count = buildStubAnalysis(id, text);
    // log
    db.prepare(`INSERT INTO audit_events (id, project_id, actor, action, entity, details_json) VALUES (?, ?, 'admin', 'run_stub', 'analysis', ?)`)
      .run("aud_" + Date.now(), id, JSON.stringify({ items: count }));
  }

  if (action === "mark_ready") {
    updateProjectStatus(id, "ready");
  }

  if (action === "deliver") {
    updateProjectStatus(id, "delivered");
    db.prepare(`UPDATE projects SET delivered_at = datetime('now') WHERE id = ?`).run(id);
  }

  // Handle requirement edit
  const reqId = form.get("req_id") as string | null;
  if (reqId) {
    const updates: any = {};
    if (form.get("title")) updates.title = form.get("title");
    if (form.get("page_or_location")) updates.page_or_location = form.get("page_or_location");
    if (form.get("customer_status")) updates.customer_status = form.get("customer_status");
    if (form.get("confidence")) updates.confidence = parseFloat(form.get("confidence") as string);
    if (form.get("notes")) updates.notes = form.get("notes");
    updateRequirement(reqId, updates);
  }

  return NextResponse.redirect(new URL(`/admin/projects/${id}`, req.url));
}
