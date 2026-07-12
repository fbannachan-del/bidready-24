"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

function CheckoutContent() {
  const params = useSearchParams();
  const type = (params.get("type") || "preflight") as "preflight" | "complete";
  const price = type === "preflight" ? 14900 : 34900;
  const label = type === "preflight" ? "Tender Preflight" : "Complete Pack";

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function simulatePayment() {
    setLoading(true);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order_type: type, amount_pence: price }),
    });
    const data = await res.json();
    setResult(data);
    setLoading(false);
  }

  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-2xl font-semibold">Checkout</h1>
      <div className="mt-4 p-4 bg-white border rounded">
        <div className="font-medium">{label}</div>
        <div className="text-3xl mt-1 tabular-nums">£{(price / 100).toFixed(2)}</div>
        <p className="text-xs text-[#64748B] mt-1">Test mode — no real charge. Real Stripe integration prepared for after owner approval of live account.</p>

        {!result ? (
          <button onClick={simulatePayment} disabled={loading} className="mt-6 w-full bg-[#0A3D62] text-white py-3 rounded-full disabled:opacity-60">
            {loading ? "Creating project..." : "Pay with test card (simulate)"}
          </button>
        ) : (
          <div className="mt-4">
            <div className="text-emerald-600 font-medium">Payment recorded (test).</div>
            <div className="mt-2 text-sm">Project created. Magic link:</div>
            <a href={`/project/${result.token}`} className="block mt-1 text-[#0A3D62] underline break-all">/project/{result.token}</a>
            <p className="text-xs mt-3 text-[#64748B]">In real flow this link would be emailed. Copy it now for testing.</p>
          </div>
        )}
      </div>

      <p className="text-[10px] mt-6 text-[#64748B]">In production this would redirect to Stripe Checkout and only create the project after webhook confirmation of successful payment.</p>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading checkout…</div>}>
      <CheckoutContent />
    </Suspense>
  );
}

