"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";

function CheckoutContent() {
  const params = useSearchParams();
  const type = (params.get("type") || "preflight") as "preflight" | "complete";
  const price = type === "preflight" ? 14900 : 34900;
  const label = type === "preflight" ? "Tender Preflight" : "Complete Pack";

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ token: string; project_id?: string } | null>(null);
  const [error, setError] = useState("");

  async function startCheckout() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_type: type }),
      });
      const data = await res.json() as { ok: boolean; url?: string; token?: string; project_id?: string; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || "Checkout could not be started");
      if (data.url) {
        window.location.assign(data.url);
        return;
      }
      if (data.token) setResult({ token: data.token, project_id: data.project_id });
      else throw new Error("Checkout returned an incomplete response");
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Checkout could not be started");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-2xl font-semibold">Checkout</h1>
      <div className="mt-4 p-4 bg-white border rounded">
        <div className="font-medium">{label}</div>
        <div className="text-3xl mt-1 tabular-nums">£{(price / 100).toFixed(2)}</div>
        <p className="text-xs text-[#64748B] mt-1">One-off payment. Secure hosted checkout powered by Stripe.</p>

        {!result ? (
          <button onClick={startCheckout} disabled={loading} className="mt-6 w-full bg-[#0A3D62] text-white py-3 rounded-full disabled:opacity-60">
            {loading ? "Opening secure checkout..." : `Continue to payment — £${(price / 100).toFixed(0)}`}
          </button>
        ) : (
          <div className="mt-4">
            <div className="text-emerald-600 font-medium">Local test project created.</div>
            <div className="mt-2 text-sm">Project created. Magic link:</div>
            <a href={`/project/${result.token}`} className="block mt-1 text-[#0A3D62] underline break-all">/project/{result.token}</a>
            <p className="text-xs mt-3 text-[#64748B]">This branch is only available when local checkout simulation is explicitly enabled.</p>
          </div>
        )}
      </div>
      {error && <p role="alert" className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <p className="text-[10px] mt-6 text-[#64748B]">Your project access is released only after verified payment confirmation.</p>
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
