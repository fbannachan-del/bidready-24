import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact and support",
  description: "Contact BidReady 24 about a tender preflight, payment or existing project.",
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
