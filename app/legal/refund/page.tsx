import type { Metadata } from "next";
import Link from "next/link";
import { LegalNotice } from "@/components/site/LegalNotice";

export const metadata: Metadata = { title: "Refund policy", robots: { index: false, follow: true } };

export default function RefundPolicy() {
  return <LegalNotice title="Refund policy">
    <p>BidReady 24 is a one-off business service that begins consuming processing capacity after the tender pack is uploaded. This working policy explains how refund requests are assessed; statutory rights that apply cannot be excluded by it.</p>
    <h2>Before analysis starts</h2><p>If you purchased in error and no tender files have been uploaded or processing started, contact support promptly with the payment reference. A cancellation and full refund will normally be considered.</p>
    <h2>After processing starts</h2><p>Once files have been uploaded and substantive extraction or analysis has begun, work has been performed and a full refund is not normally available. BidReady 24 may offer reprocessing, correction, partial refund or credit where that is a fair remedy for a service failure.</p>
    <h2>Duplicate or incorrect charge</h2><p>Duplicate charges and confirmed payment errors will be corrected. Do not make a second purchase while a successful payment is still being confirmed; use the support path shown on the checkout result.</p>
    <h2>What is not a service failure</h2><p>A decision not to bid, an evidence gap, buyer rejection, low evaluation score or failure to win is not by itself evidence that the service was defective. BidReady 24 does not sell or guarantee an outcome.</p>
    <h2>How to request a review</h2><p>Use <Link href="/contact" className="underline underline-offset-4">contact and support</Link> with your Stripe payment reference and project reference. Do not attach the full tender pack to the support request. Refunds, when agreed, are returned through the original payment method.</p>
  </LegalNotice>;
}
