import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Secure checkout",
  description: "Purchase a fixed-price BidReady 24 tender preflight or complete pack through Stripe-hosted checkout.",
  robots: { index: false, follow: false },
};

export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
