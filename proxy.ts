import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, publicAppUrl, sanitizeAdminRedirect, verifyAdminSessionToken } from "@/lib/admin-auth";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",", 1)[0].trim();
  const publicHost = forwardedHost || request.headers.get("host")?.split(":", 1)[0];
  const browserRequest = request.method === "GET" || request.method === "HEAD" || isAdminPath || pathname === "/api/admin/session";
  if (publicHost === "bidready24.com" && browserRequest) {
    const canonical = request.nextUrl.clone();
    canonical.protocol = "https";
    canonical.hostname = "www.bidready24.com";
    canonical.port = "";
    canonical.searchParams.delete("key");
    return NextResponse.redirect(canonical, 308);
  }
  if (!isAdminPath || pathname === "/admin/locked") return NextResponse.next();

  const adminPassword = process.env.ADMIN_PASSWORD;
  const validSession = Boolean(adminPassword && verifyAdminSessionToken({
    token: request.cookies.get(ADMIN_SESSION_COOKIE)?.value,
    password: adminPassword,
    sessionSecret: process.env.ADMIN_SESSION_SECRET,
  }));
  if (validSession) return NextResponse.next();

  const lockedUrl = publicAppUrl("/admin/locked", request.url, process.env.APP_URL);
  const requestedPage = sanitizeAdminRedirect(pathname);
  if (requestedPage !== "/admin") lockedUrl.searchParams.set("next", requestedPage);
  const response = NextResponse.redirect(lockedUrl);
  response.headers.set("cache-control", "no-store");
  response.headers.set("referrer-policy", "no-referrer");
  return response;
}

export const config = { matcher: ["/:path*"] };
