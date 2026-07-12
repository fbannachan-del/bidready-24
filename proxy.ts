import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

async function adminSessionToken(password: string) {
  const bytes = new TextEncoder().encode(`bidready-admin-session-v1:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/admin") || pathname === "/admin/locked") return NextResponse.next();

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    if (process.env.NODE_ENV !== "production") return NextResponse.next();
    return NextResponse.rewrite(new URL("/admin/locked", request.url));
  }

  const suppliedKey = request.nextUrl.searchParams.get("key");
  const expectedSession = await adminSessionToken(adminPassword);
  const validQuery = suppliedKey === adminPassword;
  const validSession = request.cookies.get("admin_session")?.value === expectedSession;
  if (!validQuery && !validSession) return NextResponse.rewrite(new URL("/admin/locked", request.url));

  if (validQuery) {
    const cleanUrl = request.nextUrl.clone();
    cleanUrl.searchParams.delete("key");
    const response = NextResponse.redirect(cleanUrl);
    response.cookies.set("admin_session", expectedSession, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 8,
      path: "/",
    });
    return response;
  }

  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*"] };
