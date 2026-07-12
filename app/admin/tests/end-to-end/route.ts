import { NextRequest, NextResponse } from "next/server";
import { isSameOriginRequest } from "@/lib/admin-auth";
import { EndToEndTestError, runSyntheticEndToEndTest } from "@/lib/admin-e2e";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const publicOrigin = request.headers.get("origin");
  const validOrigin = isSameOriginRequest(
    request.url,
    publicOrigin,
    process.env.APP_URL,
  );
  if (!validOrigin || !publicOrigin) return new NextResponse("Invalid request origin", { status: 403 });

  try {
    const result = await runSyntheticEndToEndTest();
    return NextResponse.redirect(new URL(`/admin/projects/${result.projectId}?e2e=passed`, publicOrigin), 303);
  } catch (error) {
    const projectId = error instanceof EndToEndTestError ? error.projectId : null;
    const destination = projectId ? `/admin/projects/${projectId}?e2e=failed` : "/admin?e2e=failed";
    console.error("Synthetic end-to-end test failed", { name: error instanceof Error ? error.name : "UnknownError", projectId });
    return NextResponse.redirect(new URL(destination, publicOrigin), 303);
  }
}
