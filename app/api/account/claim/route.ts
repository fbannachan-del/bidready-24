import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  CUSTOMER_SESSION_COOKIE,
  accountFromRequest,
  claimProjectForAccount,
} from "@/lib/customer-auth";

export const runtime = "nodejs";

const BodySchema = z.object({
  project_ref: z.string().trim().min(8).max(200),
}).strict();

export async function POST(req: NextRequest) {
  const account = accountFromRequest(req.cookies.get(CUSTOMER_SESSION_COOKIE)?.value);
  if (!account) {
    return NextResponse.json({ ok: false, error: "Sign in to claim a paid project." }, { status: 401 });
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Provide a project id or workspace token." }, { status: 400 });
  }

  const result = claimProjectForAccount(account, parsed.data.project_ref);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    project_id: result.project.id,
    status: result.project.status,
    workspace_path: `/project/${result.project.secure_token}`,
  });
}
