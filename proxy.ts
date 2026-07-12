import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_SESSION_COOKIE, sanitizeAdminRedirect, verifyAdminSessionToken } from "@/lib/admin-auth";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");
  if (!isAdminPath || pathname === "/admin/locked") return NextResponse.next();

  const adminPassword = process.env.ADMIN_PASSWORD;
  const validSession = Boolean(adminPassword && verifyAdminSessionToken({
    token: request.cookies.get(ADMIN_SESSION_COOKIE)?.value,
    password: adminPassword,
    sessionSecret: process.env.ADMIN_SESSION_SECRET,
  }));
  if (validSession) return NextResponse.next();

  const lockedUrl = new URL("/admin/locked", request.url);
  const requestedPage = sanitizeAdminRedirect(pathname);
  if (requestedPage !== "/admin") lockedUrl.searchParams.set("next", requestedPage);
  const response = NextResponse.redirect(lockedUrl);
  response.headers.set("cache-control", "no-store");
  response.headers.set("referrer-policy", "no-referrer");
  return response;
}

export const config = { matcher: ["/admin/:path*"] };
