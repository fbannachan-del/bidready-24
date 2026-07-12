import { NextRequest, NextResponse } from "next/server";
import { getProjectByToken, getRequirements } from "@/lib/projects";

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const project = getProjectByToken(token);
  if (!project) return new NextResponse("Not found", { status: 404 });

  const reqs = getRequirements(project.id) as any[];

  const header = "id,type,title,source,status,confidence\n";
  const rows = reqs.map(r => [
    r.id, r.type, `"${(r.normalized_requirement || "").replace(/"/g, '""')}"`,
    r.page_or_location || "", r.customer_status, r.confidence
  ].join(",")).join("\n");

  return new NextResponse(header + rows, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="bidready-compliance-${project.id}.csv"`
    }
  });
}
