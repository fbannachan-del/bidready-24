import { NextRequest, NextResponse } from "next/server";
import { createProject } from "@/lib/projects";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const order_type = body.order_type === "complete" ? "complete" : "preflight";
  const amount_pence = body.amount_pence || (order_type === "preflight" ? 14900 : 34900);

  // MVP: simulate verified payment immediately.
  // Real version: create Stripe Checkout session, return URL. On webhook success call createProject.
  const project = createProject({ order_type, amount_pence });

  // In real: record payment row, set status paid etc.

  return NextResponse.json({ ok: true, project_id: project.id, token: project.secure_token });
}
