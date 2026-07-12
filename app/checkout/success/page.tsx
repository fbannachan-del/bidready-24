"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function CheckoutSuccessContent() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const [state, setState] = useState<"waiting" | "ready" | "failed">(sessionId ? "waiting" : "failed");
  const [token, setToken] = useState("");

  useEffect(() => {
    if (!sessionId) return;

    let cancelled = false;
    let attempts = 0;
    const check = async () => {
      attempts += 1;
      try {
        const response = await fetch(`/api/checkout/status?session_id=${encodeURIComponent(sessionId)}`, { cache: "no-store" });
        const data = await response.json() as { ready?: boolean; token?: string };
        if (response.ok && data.ready && data.token) {
          if (!cancelled) {
            setToken(data.token);
            setState("ready");
          }
          return;
        }
      } catch {
        // The verified webhook can arrive just after the browser redirect; retry below.
      }
      if (!cancelled && attempts < 15) window.setTimeout(check, 2000);
      else if (!cancelled) setState("failed");
    };
    void check();
    return () => { cancelled = true; };
  }, [sessionId]);

  return (
    <div className="mx-auto max-w-lg px-6 py-16 text-center">
      {state === "waiting" && <><h1 className="text-3xl font-semibold">Confirming your payment</h1><p className="mt-3 text-[#475569]">Stripe has returned you safely. We’re waiting for the signed payment confirmation.</p></>}
      {state === "ready" && <><h1 className="text-3xl font-semibold">Your project is ready</h1><p className="mt-3 text-[#475569]">Payment confirmed. Continue to your secure workspace to add your company evidence and tender pack.</p><a href={`/project/${token}`} className="mt-7 inline-flex rounded-full bg-[#0A3D62] px-7 py-3 font-medium text-white">Open secure project</a></>}
      {state === "failed" && <><h1 className="text-3xl font-semibold">We’re still confirming payment</h1><p className="mt-3 text-[#475569]">Your payment may still have succeeded. Please contact support with your Stripe receipt rather than paying again.</p><a href="/contact" className="mt-7 inline-flex rounded-full border border-[#0A3D62] px-7 py-3 font-medium text-[#0A3D62]">Contact support</a></>}
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return <Suspense fallback={<div className="p-12 text-center">Confirming payment…</div>}><CheckoutSuccessContent /></Suspense>;
}
