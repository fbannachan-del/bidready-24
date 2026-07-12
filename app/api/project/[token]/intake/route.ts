import { NextRequest, NextResponse } from "next/server";
import { getProjectByToken, updateProjectIntake } from "@/lib/projects";
import { IntakeSchema } from "@/lib/schemas";
import { intakeFingerprint, parseIntakePayload, validateIntakeTransition } from "@/lib/validation/intake";
import { getDb } from "@/lib/db";
import { runAutonomousPipeline } from "@/lib/autonomous-pipeline";

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const project = getProjectByToken(token);
  if (!project) return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = parseIntakePayload(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: "Invalid intake", issues: parsed.issues }, { status: 400 });
  }
  let storedFingerprint: string | null = null;
  try { if (project.intake_json) storedFingerprint = intakeFingerprint(IntakeSchema.parse(JSON.parse(project.intake_json))); } catch { storedFingerprint = null; }
  const transition = validateIntakeTransition({ projectStatus: project.status, incomingFingerprint: parsed.fingerprint, storedFingerprint });
  if (!transition.allowed) return NextResponse.json({ error: transition.reason }, { status: 409 });
  if (transition.action === "noop") return NextResponse.json({ ok: true, action: "noop" });
  updateProjectIntake(project.id, JSON.stringify(parsed.data), parsed.data.company_name);
  const fileCount = (getDb().prepare(`SELECT COUNT(*) count FROM files WHERE project_id = ? AND deleted_at IS NULL`).get(project.id) as { count: number }).count;
  if (transition.action === "save_and_rerun" && fileCount > 0) {
    const analysis = await runAutonomousPipeline(project.id, "intake_update");
    return NextResponse.json({ ok: true, action: transition.action, analysis });
  }
  return NextResponse.json({ ok: true, action: transition.action });
}
