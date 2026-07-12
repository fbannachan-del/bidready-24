import { NextRequest, NextResponse } from "next/server";
import { isSameOriginRequest, publicRequestUrl } from "@/lib/admin-auth";
import { EndToEndTestError, runSyntheticEndToEndTest } from "@/lib/admin-e2e";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const validOrigin = isSameOriginRequest(
    request.url,
    request.headers.get("origin"),
    process.env.APP_URL,
    request.headers.get("x-forwarded-host") || request.headers.get("host"),
    request.headers.get("x-forwarded-proto"),
  );
  if (!validOrigin) return new NextResponse("Invalid request origin", { status: 403 });

  try {
    const result = await runSyntheticEndToEndTest();
    return NextResponse.redirect(publicRequestUrl(`/admin/projects/${result.projectId}?e2e=passed`, request.url, request.headers.get("x-forwarded-host") || request.headers.get("host"), request.headers.get("x-forwarded-proto")), 303);
  } catch (error) {
    const projectId = error instanceof EndToEndTestError ? error.projectId : null;
    const destination = projectId ? `/admin/projects/${projectId}?e2e=failed` : "/admin?e2e=failed";
    console.error("Synthetic end-to-end test failed", { name: error instanceof Error ? error.name : "UnknownError", projectId });
    return NextResponse.redirect(publicRequestUrl(destination, request.url, request.headers.get("x-forwarded-host") || request.headers.get("host"), request.headers.get("x-forwarded-proto")), 303);
  }
}
