import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getProjectByToken } from "@/lib/projects";
import {
  getProjectAlertSettings,
  PROJECT_ALERT_STAGES,
  PROJECT_STAGE_LABELS,
  upsertProjectAlertSettings,
} from "@/lib/alerts";

export const runtime = "nodejs";

const BodySchema = z.object({
  email: z.string().trim().email().max(320),
  stages: z.array(z.string()).max(20),
  active: z.boolean().optional().default(true),
}).strict();

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const project = getProjectByToken(token);
  if (!project) return NextResponse.json({ error: "Invalid or expired project link" }, { status: 404 });

  const settings = getProjectAlertSettings(project.id);
  let stages: string[] = [];
  if (settings?.stages_json) {
    try {
      const parsed = JSON.parse(settings.stages_json) as unknown;
      if (Array.isArray(parsed)) stages = parsed.filter((s): s is string => typeof s === "string");
    } catch {
      stages = [];
    }
  }

  // Default: email from intake if present; stages cover main progression
  let defaultEmail = settings?.email || "";
  if (!defaultEmail && project.intake_json) {
    try {
      const intake = JSON.parse(project.intake_json) as { contact_email?: string };
      if (typeof intake.contact_email === "string") defaultEmail = intake.contact_email;
    } catch {
      // ignore
    }
  }
  if (!settings) {
    stages = ["processing", "review_required", "ready", "delivered", "failed"];
  }

  return NextResponse.json({
    ok: true,
    email: defaultEmail,
    stages,
    active: settings ? Boolean(settings.active) : true,
    availableStages: PROJECT_ALERT_STAGES.map((id) => ({ id, label: PROJECT_STAGE_LABELS[id] })),
  });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const project = getProjectByToken(token);
  if (!project) return NextResponse.json({ error: "Invalid or expired project link" }, { status: 404 });

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Please provide a valid email and stage selection." }, { status: 400 });
  }

  const saved = upsertProjectAlertSettings({
    projectId: project.id,
    email: parsed.data.email,
    stages: parsed.data.stages,
    active: parsed.data.active,
  });

  return NextResponse.json({
    ok: true,
    email: saved.email,
    stages: JSON.parse(saved.stages_json),
    active: Boolean(saved.active),
  });
}
