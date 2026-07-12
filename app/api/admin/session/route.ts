import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_SECONDS,
  constantTimeSecretEqual,
  createAdminSessionToken,
  isSameOriginRequest,
  publicRequestUrl,
  sanitizeAdminRedirect,
} from "@/lib/admin-auth";

const MAX_BODY_BYTES = 8 * 1024;

function lockedRedirect(request: NextRequest, error: "invalid" | "configuration", next = "/admin") {
  const url = publicRequestUrl("/admin/locked", request.url, request.headers.get("x-forwarded-host") || request.headers.get("host"), request.headers.get("x-forwarded-proto"));
  url.searchParams.set("error", error);
  if (next !== "/admin") url.searchParams.set("next", sanitizeAdminRedirect(next));
  const response = NextResponse.redirect(url, 303);
  response.headers.set("cache-control", "no-store");
  response.headers.set("referrer-policy", "no-referrer");
  return response;
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim().toLowerCase();
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (contentType !== "application/x-www-form-urlencoded" || !Number.isFinite(declaredLength) || declaredLength > MAX_BODY_BYTES) {
    return new NextResponse("Invalid request", { status: 400, headers: { "cache-control": "no-store", "referrer-policy": "no-referrer" } });
  }
  if (!isSameOriginRequest(
    request.url,
    request.headers.get("origin"),
    process.env.APP_URL,
    request.headers.get("x-forwarded-host") || request.headers.get("host"),
    request.headers.get("x-forwarded-proto"),
  )) {
    return new NextResponse("Invalid request origin", { status: 403, headers: { "cache-control": "no-store", "referrer-policy": "no-referrer" } });
  }

  const body = await request.text();
  if (Buffer.byteLength(body, "utf8") > MAX_BODY_BYTES) {
    return new NextResponse("Invalid request", { status: 400, headers: { "cache-control": "no-store", "referrer-policy": "no-referrer" } });
  }
  const form = new URLSearchParams(body);
  const suppliedPassword = form.get("password") ?? "";
  const next = sanitizeAdminRedirect(form.get("next"));
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return lockedRedirect(request, "configuration", next);
  if (!constantTimeSecretEqual(suppliedPassword, adminPassword)) return lockedRedirect(request, "invalid", next);

  const token = createAdminSessionToken({ password: adminPassword, sessionSecret: process.env.ADMIN_SESSION_SECRET });
  const destination = publicRequestUrl(next, request.url, request.headers.get("x-forwarded-host") || request.headers.get("host"), request.headers.get("x-forwarded-proto"));
  const response = NextResponse.redirect(destination, 303);
  response.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: destination.protocol === "https:",
    sameSite: "strict",
    maxAge: ADMIN_SESSION_SECONDS,
    path: "/admin",
  });
  response.headers.set("cache-control", "no-store");
  response.headers.set("referrer-policy", "no-referrer");
  return response;
}
