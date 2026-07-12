import { NextRequest, NextResponse } from "next/server";
import {
  CUSTOMER_SESSION_COOKIE,
  accountFromRequest,
  listAccountProjects,
  projectIsPaidEligible,
} from "@/lib/customer-auth";
import { listActiveTenderWatches } from "@/lib/alerts";

export const runtime = "nodejs";

const IN_FLIGHT = new Set([
  "paid",
  "awaiting_intake",
  "awaiting_files",
  "processing",
  "review_required",
]);

const COMPLETE = new Set(["ready", "delivered"]);

export async function GET(req: NextRequest) {
  const account = accountFromRequest(req.cookies.get(CUSTOMER_SESSION_COOKIE)?.value);
  if (!account) {
    return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });
  }

  const projects = listAccountProjects(account.id).map((p) => ({
    id: p.id,
    company_name: p.company_name,
    tender_title: p.tender_title,
    status: p.status,
    order_type: p.order_type,
    deadline: p.deadline,
    created_at: p.created_at,
    updated_at: p.updated_at,
    linked_at: p.linked_at,
    payment_status: p.payment_status,
    secure_token: p.secure_token,
    workspace_path: `/project/${p.secure_token}`,
    alerts_path: `/project/${p.secure_token}/alerts`,
    is_in_flight: IN_FLIGHT.has(p.status),
    is_complete: COMPLETE.has(p.status),
    is_failed: p.status === "failed",
    paid: projectIsPaidEligible(p),
  }));

  const inFlight = projects.filter((p) => p.is_in_flight);
  const complete = projects.filter((p) => p.is_complete);
  const failed = projects.filter((p) => p.is_failed);

  // Tender watches for this account email
  let tenderWatches: Array<{ id: string; keyword: string; region: string; active: boolean; manage_token: string }> = [];
  try {
    tenderWatches = listActiveTenderWatches()
      .filter((w) => w.email === account.email)
      .map((w) => ({
        id: w.id,
        keyword: w.keyword,
        region: w.region,
        active: Boolean(w.active),
        manage_token: w.manage_token,
      }));
    // Also include inactive watches for this email
    const { getDb } = await import("@/lib/db");
    const all = getDb().prepare(`SELECT * FROM tender_watches WHERE email = ? ORDER BY created_at DESC`).all(account.email) as Array<{
      id: string; keyword: string; region: string; active: number; manage_token: string;
    }>;
    tenderWatches = all.map((w) => ({
      id: w.id,
      keyword: w.keyword,
      region: w.region,
      active: Boolean(w.active),
      manage_token: w.manage_token,
    }));
  } catch {
    // alerts tables may be mid-migrate
  }

  return NextResponse.json({
    ok: true,
    account: {
      id: account.id,
      email: account.email,
      name: account.name,
      created_at: account.created_at,
      last_login_at: account.last_login_at,
    },
    summary: {
      total: projects.length,
      in_flight: inFlight.length,
      complete: complete.length,
      failed: failed.length,
    },
    projects,
    tender_watches: tenderWatches,
  });
}
