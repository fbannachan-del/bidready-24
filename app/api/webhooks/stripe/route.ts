import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { fulfilCheckout, markCheckoutFailed } from "@/lib/payments";

export async function POST(req: NextRequest) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) {
    return NextResponse.json({ error: "Stripe webhook is not configured" }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  const rawBody = await req.text();
  const stripe = new Stripe(secretKey);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object;
      const projectId = session.metadata?.project_id || session.client_reference_id;
      if (!projectId) throw new Error("Stripe session is missing project metadata");
      if (session.payment_status !== "paid" && event.type === "checkout.session.completed") {
        return NextResponse.json({ received: true });
      }
      const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id || null;
      fulfilCheckout({ projectId, sessionId: session.id, paymentIntent, eventId: event.id, eventType: event.type });
    }

    if (event.type === "checkout.session.async_payment_failed" || event.type === "checkout.session.expired") {
      markCheckoutFailed(event.data.object.id, event.id, event.type);
    }
  } catch (error) {
    console.error("Stripe webhook fulfilment failed", { eventId: event.id, name: error instanceof Error ? error.name : "UnknownError" });
    return NextResponse.json({ error: "Webhook fulfilment failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
