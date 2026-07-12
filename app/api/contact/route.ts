import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupportRequest, recentSupportCount, supportIpHash } from "@/lib/support";

const ContactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
  project: z.string().trim().max(200).optional().default(""),
  message: z.string().trim().min(10).max(5_000),
}).strict();

export async function POST(req: NextRequest) {
  const parsed = ContactSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Please check the contact form and try again." }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  const ipHash = supportIpHash(ip);
  if (recentSupportCount(ipHash) >= 5) {
    return NextResponse.json({ ok: false, error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const id = createSupportRequest({
    name: parsed.data.name,
    email: parsed.data.email,
    projectRef: parsed.data.project,
    message: parsed.data.message,
    ipHash,
  });

  const webhookUrl = process.env.SUPPORT_WEBHOOK_URL;
  if (webhookUrl) {
    try {
      const endpoint = new URL(webhookUrl);
      if (process.env.NODE_ENV === "production" && endpoint.protocol !== "https:") throw new Error("SUPPORT_WEBHOOK_HTTPS_REQUIRED");
      if (process.env.NODE_ENV === "production" && !process.env.SUPPORT_WEBHOOK_SECRET) throw new Error("SUPPORT_WEBHOOK_AUTH_REQUIRED");
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(process.env.SUPPORT_WEBHOOK_SECRET ? { authorization: `Bearer ${process.env.SUPPORT_WEBHOOK_SECRET}` } : {}),
        },
        body: JSON.stringify({ id, ...parsed.data, created_at: new Date().toISOString() }),
        redirect: "error",
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) console.error("Support webhook rejected request", response.status);
    } catch (error) {
      console.error("Support webhook delivery failed; request remains in admin inbox", { name: error instanceof Error ? error.name : "UnknownError" });
    }
  }

  return NextResponse.json({ ok: true, reference: id }, { status: 202 });
}
