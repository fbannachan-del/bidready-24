import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requestMagicLogin } from "@/lib/customer-auth";
import { accessRateLimitKey, recentAccessRequestCount, recordAccessRequest } from "@/lib/project-access";

export const runtime = "nodejs";

const BodySchema = z.object({
  email: z.string().trim().email().max(320),
}).strict();

export async function POST(req: NextRequest) {
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Enter a valid work email." }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const ipHash = accessRateLimitKey(`login:${ip}`);
  if (recentAccessRequestCount(ipHash) >= 8) {
    return NextResponse.json({ ok: false, error: "Too many sign-in attempts. Try again later." }, { status: 429 });
  }
  recordAccessRequest(ipHash, true, null);

  // Always same response shape (no email enumeration).
  const result = requestMagicLogin(parsed.data.email, req.url);

  return NextResponse.json({
    ok: true,
    message: "If that email can receive mail, a sign-in link is on its way. It expires in 30 minutes.",
    ...(result.devLink ? { devLink: result.devLink } : {}),
  });
}
