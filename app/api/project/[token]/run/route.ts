import { NextRequest, NextResponse } from "next/server";
import { resolveAccessibleProjectFromRequest } from "@/lib/project-access";
import { runAutonomousPipeline } from "@/lib/autonomous-pipeline";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const project = resolveAccessibleProjectFromRequest(req, token);
  if (!project) return NextResponse.json({ error: "Invalid or expired project link" }, { status: 404 });
  try {
    const result = await runAutonomousPipeline(project.id, "customer");
    const counts = result as typeof result & Record<string, unknown>;
    const reused = "reused" in result && result.reused;
    return NextResponse.json({ ...result, message: reused ? "The current analysis is already complete; verified output was reused." : "Autonomous tender analysis completed.", requirements: Number(counts.requirements ?? 0), questions: Number(counts.questions ?? 0), gaps: Number(counts.gaps ?? 0) });
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String((error as { code?: string }).code) : "ANALYSIS_FAILED";
    if (code === "EXTRACTION_EMPTY") {
      const failures = (error as { failures?: Array<{ name: string; error: string }> }).failures ?? [];
      return NextResponse.json({
        error: "None of the uploaded documents could be read, so no analysis was produced. Replace or re-export the files below and try again.",
        code,
        files: failures.map((f) => ({ name: f.name, reason: f.error })),
      }, { status: 422 });
    }
    return NextResponse.json({ error: "Tender analysis could not be completed.", code: "ANALYSIS_FAILED" }, { status: 500 });
  }
}
