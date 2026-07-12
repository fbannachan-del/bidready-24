import { NextRequest, NextResponse } from "next/server";
import { getProjectByToken, updateProjectIntake } from "@/lib/projects";
import { IntakeSchema } from "@/lib/schemas";

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const project = getProjectByToken(token);
  if (!project) return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });

  const body = await req.json();
  const parsed = IntakeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid intake", issues: parsed.error.issues }, { status: 400 });
  }

  updateProjectIntake(project.id, JSON.stringify(parsed.data), parsed.data.company_name);

  return NextResponse.json({ ok: true });
}
