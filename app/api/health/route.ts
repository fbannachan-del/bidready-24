import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { inspectSchemaReadiness } from "@/lib/schema-readiness";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const schema = inspectSchemaReadiness(getDb());
    return NextResponse.json({
      status: schema.ready ? "ok" : "not_ready",
      service: "bidready24",
      database: schema.ready ? "ready" : "migration_required",
      timestamp: new Date().toISOString(),
    }, { status: schema.ready ? 200 : 503 });
  } catch {
    return NextResponse.json({
      status: "not_ready",
      service: "bidready24",
      database: "unavailable",
      timestamp: new Date().toISOString(),
    }, { status: 503 });
  }
}
