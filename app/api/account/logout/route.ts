import { NextRequest, NextResponse } from "next/server";
import { CUSTOMER_SESSION_COOKIE } from "@/lib/customer-auth";
import { publicAppUrl } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const origin = publicAppUrl("/", req.url, process.env.APP_URL);
  const response = NextResponse.redirect(new URL("/account/login", origin), 303);
  response.cookies.set(CUSTOMER_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: origin.protocol === "https:",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}

export async function GET(req: NextRequest) {
  return POST(req);
}
