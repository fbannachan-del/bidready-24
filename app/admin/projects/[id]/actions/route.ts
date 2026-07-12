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
    // Create some stub requirements from nothing — all review required
    addRequirement(id, {
      type: "mandatory",
      title: "Public Liability Insurance minimum",
      normalized_requirement: "The supplier must hold public liability insurance of at least £10,000,000.",
      page_or_location: "ITT p.7 / Spec 3.1",
      customer_status: "uncertain",
      confidence: 0.6,
      review_required: true,
      source: "stub",
    });
    addRequirement(id, {
      type: "mandatory",
      title: "CHAS or SSIP accreditation",
      normalized_requirement: "Valid CHAS or equivalent SSIP scheme accreditation required at time of tender.",
      page_or_location: "Instructions to Tenderers, p.4",
      customer_status: "missing",
      confidence: 0.3,
      review_required: true,
      source: "stub",
    });
    addRequirement(id, {
      type: "scored",
      title: "Method statement — environmental / sustainability",
      normalized_requirement: "Provide method statement demonstrating use of environmentally friendly products and waste minimisation.",
      page_or_location: "Quality questions Q3",
      evaluation_weight: 8,
      customer_status: "uncertain",
      confidence: 0.5,
      review_required: true,
      source: "stub",
    });
    updateProjectStatus(id, "review_required");
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
