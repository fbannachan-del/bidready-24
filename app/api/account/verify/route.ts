import { NextRequest, NextResponse } from "next/server";
import {
  CUSTOMER_SESSION_COOKIE,
  consumeMagicLink,
  createCustomerSessionToken,
  sessionCookieOptions,
} from "@/lib/customer-auth";
import { publicAppUrl } from "@/lib/admin-auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token")?.trim();
  const origin = publicAppUrl("/", req.url, process.env.APP_URL);

  if (!token) {
    return NextResponse.redirect(new URL("/account/login?error=missing", origin), 303);
  }

  const account = consumeMagicLink(token);
  if (!account) {
    return NextResponse.redirect(new URL("/account/login?error=invalid", origin), 303);
  }

  const session = createCustomerSessionToken({ accountId: account.id });
  const response = NextResponse.redirect(new URL("/account", origin), 303);
  response.cookies.set(
    CUSTOMER_SESSION_COOKIE,
    session,
    sessionCookieOptions(origin.protocol === "https:"),
  );
  response.headers.set("cache-control", "no-store");
  return response;
}
