import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createProject } from "@/lib/projects";
import { recordCheckoutSession } from "@/lib/payments";
import { CHECKOUT_ACCESS_COOKIE, CHECKOUT_ACCESS_SECONDS, createCheckoutAccessToken } from "@/lib/checkout-access";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const order_type = body.order_type === "complete" ? "complete" : "preflight";
  const amount_pence = order_type === "preflight" ? 14900 : 34900;
  const label = order_type === "preflight" ? "Tender Preflight" : "Complete Pack";

  if (process.env.NODE_ENV !== "production" && process.env.ALLOW_SIMULATED_CHECKOUT === "true") {
    const project = createProject({ order_type, amount_pence });
    return NextResponse.json({ ok: true, simulated: true, project_id: project.id, token: project.secure_token });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json(
      { ok: false, error: "Checkout is temporarily unavailable. Please contact support." },
      { status: 503 },
    );
  }

  const project = createProject({ order_type, amount_pence });
  const stripe = new Stripe(secretKey);
  const appUrl = (process.env.APP_URL || req.nextUrl.origin).replace(/\/$/, "");

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: project.id,
      metadata: { project_id: project.id, order_type },
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "gbp",
          unit_amount: amount_pence,
          product_data: { name: `BIDREADY24 — ${label}` },
        },
      }],
      success_url: `${appUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing?checkout=cancelled`,
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
