import { NextRequest, NextResponse } from "next/server";
import { getProjectByToken } from "@/lib/projects";
import { runAutonomousPipeline } from "@/lib/autonomous-pipeline";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const project = getProjectByToken(token);
  if (!project) return NextResponse.json({ error: "Invalid or expired project link" }, { status: 404 });
  try {
    const result = await runAutonomousPipeline(project.id, "customer");
    const counts = result as typeof result & Record<string, unknown>;
    const reused = "reused" in result && result.reused;
    return NextResponse.json({ ...result, message: reused ? "The current analysis is already complete; verified output was reused." : "Autonomous tender analysis completed.", requirements: Number(counts.requirements ?? 0), questions: Number(counts.questions ?? 0), gaps: Number(counts.gaps ?? 0) });
  } catch {
    return NextResponse.json({ error: "Tender analysis could not be completed.", code: "ANALYSIS_FAILED" }, { status: 500 });
  }
}
