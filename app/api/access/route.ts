import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  accessRateLimitKey,
  matchProjectAccess,
  mayRevealAccessLink,
  projectWorkspacePath,
  recentAccessRequestCount,
  recordAccessRequest,
  resolveProjectRef,
} from "@/lib/project-access";
import { getProjectByToken } from "@/lib/projects";

export const runtime = "nodejs";

const GENERIC_OK = {
  ok: true as const,
  message: "If a matching project is on file for that email and reference, access details have been prepared. Check this page for a link when available, or use the project link from your payment confirmation.",
};

const BodySchema = z.object({
  mode: z.enum(["request", "token"]).default("request"),
  email: z.string().trim().email().max(320).optional(),
  project_ref: z.string().trim().min(3).max(200).optional(),
  token: z.string().trim().min(10).max(200).optional(),
}).strict();

function clientIp(req: NextRequest) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "unknown";
}

async function padTiming(started: number, minMs = 120) {
  const elapsed = Date.now() - started;
  if (elapsed < minMs) await new Promise((r) => setTimeout(r, minMs - elapsed));
}

export async function POST(req: NextRequest) {
  const started = Date.now();
  const parsed = BodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    await padTiming(started);
    return NextResponse.json({ ok: false, error: "Please check the form and try again." }, { status: 400 });
  }

  const ipHash = accessRateLimitKey(clientIp(req));
  if (recentAccessRequestCount(ipHash) >= 10) {
    await padTiming(started);
    return NextResponse.json({ ok: false, error: "Too many requests. Please try again later." }, { status: 429 });
  }

  // Direct token open — token is the capability; no email required.
  if (parsed.data.mode === "token" || parsed.data.token) {
    const raw = (parsed.data.token || "").trim();
    // Accept full URLs pasted from email
    const tokenMatch = raw.match(/\/project\/([A-Za-z0-9_-]{16,})/);
    const token = tokenMatch?.[1] || raw;
    const project = getProjectByToken(token);
    recordAccessRequest(ipHash, Boolean(project), project?.id ?? null);
    await padTiming(started);
    if (!project) {
      return NextResponse.json({ ok: false, error: "That project link is invalid or has expired." }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      redirect: projectWorkspacePath(project.secure_token),
      message: "Project link verified.",
    });
  }

  const email = parsed.data.email;
  const projectRef = parsed.data.project_ref;
  if (!email || !projectRef) {
    await padTiming(started);
    return NextResponse.json({ ok: false, error: "Email and project reference are required." }, { status: 400 });
  }

  const result = matchProjectAccess(email, projectRef);
  recordAccessRequest(ipHash, result.matched, result.matched ? result.project.id : null);

  if (result.matched) {
    const path = projectWorkspacePath(result.project.secure_token);
    const absolute = new URL(path, process.env.APP_URL || req.nextUrl.origin).href;
    // Console / future email adapter — never throw if delivery is stubbed.
    console.info("[project-access] link prepared", {
      projectId: result.project.id,
      emailDomain: email.split("@")[1],
    });
    const webhook = process.env.SUPPORT_WEBHOOK_URL;
    if (webhook) {
      try {
        await fetch(webhook, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            ...(process.env.SUPPORT_WEBHOOK_SECRET ? { authorization: `Bearer ${process.env.SUPPORT_WEBHOOK_SECRET}` } : {}),
          },
          body: JSON.stringify({
            type: "project_access_link",
            email,
            project_id: result.project.id,
            link: absolute,
          }),
          signal: AbortSignal.timeout(8_000),
        });
      } catch {
        // Link still returned to matched browser when allowed.
      }
    }
    await padTiming(started);
    // Matched clients may open the workspace directly (they proved email + project ref).
    // Unmatched clients only ever see GENERIC_OK without a redirect.
    return NextResponse.json({
      ...GENERIC_OK,
      redirect: path,
      ...(mayRevealAccessLink() ? { link: absolute } : {}),
    });
  }

  // Touch resolve so timing is similar when ref exists but email does not.
  resolveProjectRef(projectRef);
  await padTiming(started);
  return NextResponse.json(GENERIC_OK);
}
