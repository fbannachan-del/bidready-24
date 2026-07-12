import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createProject } from "@/lib/projects";
import { recordCheckoutSession } from "@/lib/payments";
import { CHECKOUT_ACCESS_COOKIE, CHECKOUT_ACCESS_SECONDS, createCheckoutAccessToken } from "@/lib/checkout-access";
import {
  CUSTOMER_SESSION_COOKIE,
  accountFromRequest,
  getOrCreateAccount,
  linkProjectToAccount,
} from "@/lib/customer-auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({})) as { order_type?: string; account_email?: string };
  const order_type = body.order_type === "complete" ? "complete" : "preflight";
  const amount_pence = order_type === "preflight" ? 14900 : 34900;
  const label = order_type === "preflight" ? "Tender Preflight" : "Complete Pack";

  const sessionAccount = accountFromRequest(req.cookies.get(CUSTOMER_SESSION_COOKIE)?.value);
  const accountEmail = typeof body.account_email === "string" ? body.account_email.trim() : "";

  if (process.env.NODE_ENV !== "production" && process.env.ALLOW_SIMULATED_CHECKOUT === "true") {
    const project = createProject({ order_type, amount_pence });
    // Simulated path treats the purchase as paid immediately for local demos.
    const { getDb } = await import("@/lib/db");
    getDb().prepare(`UPDATE projects SET status = 'paid', updated_at = datetime('now') WHERE id = ?`).run(project.id);
    if (sessionAccount) {
      linkProjectToAccount(project.id, sessionAccount.id, "checkout");
    } else if (accountEmail.includes("@")) {
      const account = getOrCreateAccount(accountEmail);
      linkProjectToAccount(project.id, account.id, "checkout_email");
    }
    return NextResponse.json({
      ok: true,
      simulated: true,
      project_id: project.id,
      token: project.secure_token,
      linked_to_account: Boolean(sessionAccount || accountEmail.includes("@")),
    });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json(
      { ok: false, error: "Checkout is temporarily unavailable. Please contact support." },
      { status: 503 },
    );
  }

  const project = createProject({ order_type, amount_pence });
  // Pre-link signed-in buyer so fulfilment can attach after payment.
  if (sessionAccount) {
    // Store intended owner; claim becomes active once paid.
    const { getDb } = await import("@/lib/db");
    getDb().prepare(`UPDATE projects SET owner_account_id = ? WHERE id = ?`).run(sessionAccount.id, project.id);
  }
  const stripe = new Stripe(secretKey);
  // Prefer APP_URL so Stripe never returns buyers to an internal Render localhost host.
  const { publicAppUrl } = await import("@/lib/admin-auth");
  const appOrigin = publicAppUrl("/", req.url, process.env.APP_URL).origin;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: project.id,
      metadata: {
        project_id: project.id,
        order_type,
        ...(sessionAccount ? { account_id: sessionAccount.id } : {}),
        ...(accountEmail.includes("@") ? { account_email: accountEmail.toLowerCase() } : {}),
      },
      customer_email: accountEmail.includes("@") ? accountEmail : sessionAccount?.email,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "gbp",
          unit_amount: amount_pence,
          product_data: { name: `BIDREADY24 — ${label}` },
        },
      }],
      success_url: `${appOrigin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appOrigin}/pricing?checkout=cancelled`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
    });

    if (!session.url) throw new Error("Stripe did not return a Checkout URL");
    recordCheckoutSession({ projectId: project.id, sessionId: session.id, amountPence: amount_pence, currency: "GBP" });
    const response = NextResponse.json({ ok: true, url: session.url });
    response.cookies.set(CHECKOUT_ACCESS_COOKIE, createCheckoutAccessToken(session.id), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: CHECKOUT_ACCESS_SECONDS,
      path: "/api/checkout",
    });
    return response;
  } catch (error) {
    console.error("Unable to create Stripe Checkout session", { name: error instanceof Error ? error.name : "UnknownError" });
    return NextResponse.json(
      { ok: false, error: "Checkout could not be started. Please try again." },
      { status: 502 },
    );
  }
}
