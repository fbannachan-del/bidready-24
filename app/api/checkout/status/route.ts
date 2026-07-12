import { NextRequest, NextResponse } from "next/server";
import { getCheckoutProject } from "@/lib/payments";

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("session_id")?.trim();
  if (!sessionId || !sessionId.startsWith("cs_")) {
    return NextResponse.json({ ok: false, error: "Invalid checkout session" }, { status: 400 });
  }

  const checkout = getCheckoutProject(sessionId);
  if (!checkout) return NextResponse.json({ ok: false, error: "Checkout not found" }, { status: 404 });
  if (checkout.payment_status !== "paid") {
    return NextResponse.json({ ok: true, ready: false }, { status: 202 });
  }

  return NextResponse.json({
    ok: true,
    ready: true,
    token: checkout.secure_token,
    project_id: checkout.project_id,
  });
}
