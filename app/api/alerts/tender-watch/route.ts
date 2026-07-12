import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createTenderWatch, getTenderWatchByManageToken, updateTenderWatch } from "@/lib/alerts";
import { publicAppUrl } from "@/lib/admin-auth";
import { deliverAlert } from "@/lib/notify";

export const runtime = "nodejs";

const CreateSchema = z.object({
  email: z.string().trim().email().max(320),
  keyword: z.string().trim().max(100).optional().default("cleaning"),
  region: z.string().trim().max(80).optional().default(""),
  smeOnly: z.boolean().optional().default(false),
}).strict();

const UpdateSchema = z.object({
  manageToken: z.string().trim().min(16).max(200),
  keyword: z.string().trim().max(100).optional(),
  region: z.string().trim().max(80).optional(),
  smeOnly: z.boolean().optional(),
  active: z.boolean().optional(),
}).strict();

export async function POST(req: NextRequest) {
  const parsed = CreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Please provide a valid email and optional filters." }, { status: 400 });
  }

  const watch = createTenderWatch({
    email: parsed.data.email,
    keyword: parsed.data.keyword,
    region: parsed.data.region,
    smeOnly: parsed.data.smeOnly,
  });

  const manageUrl = publicAppUrl(
    `/alerts/manage?token=${encodeURIComponent(watch.manage_token)}`,
    req.url,
    process.env.APP_URL,
  ).href;

  await deliverAlert({
    kind: "tender_live",
    recipient: watch.email,
    subject: "BIDREADY24: tender watch confirmed",
    bodyText: [
      "Your tender watch is active.",
      "",
      `Keyword: ${watch.keyword}`,
      `Region: ${watch.region || "Any"}`,
      `SME only: ${watch.sme_only ? "yes" : "no"}`,
      "",
      "We will alert you when newly seen open tenders match these filters.",
      `Manage or stop alerts: ${manageUrl}`,
    ].join("\n"),
    meta: { watchId: watch.id, event: "watch_created" },
  });

  return NextResponse.json({
    ok: true,
    watchId: watch.id,
    manageUrl,
    message: "Watch created. Keep the manage link to change or stop alerts.",
  }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const parsed = UpdateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid manage request." }, { status: 400 });
  }
  const updated = updateTenderWatch(parsed.data.manageToken, {
    keyword: parsed.data.keyword,
    region: parsed.data.region,
    smeOnly: parsed.data.smeOnly,
    active: parsed.data.active,
  });
  if (!updated) return NextResponse.json({ ok: false, error: "Watch not found." }, { status: 404 });
  return NextResponse.json({
    ok: true,
    watch: {
      email: updated.email,
      keyword: updated.keyword,
      region: updated.region,
      smeOnly: Boolean(updated.sme_only),
      active: Boolean(updated.active),
    },
  });
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim();
  if (!token) return NextResponse.json({ ok: false, error: "Missing manage token." }, { status: 400 });
  const watch = getTenderWatchByManageToken(token);
  if (!watch) return NextResponse.json({ ok: false, error: "Watch not found." }, { status: 404 });
  return NextResponse.json({
    ok: true,
    watch: {
      email: watch.email,
      keyword: watch.keyword,
      region: watch.region,
      smeOnly: Boolean(watch.sme_only),
      active: Boolean(watch.active),
      lastCheckedAt: watch.last_checked_at,
    },
  });
}
