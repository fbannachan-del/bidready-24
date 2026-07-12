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
            window.history.replaceState({}, "", "/checkout/success");
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
    <div className="mx-auto max-w-2xl px-5 py-20 text-center sm:px-8 sm:py-28">
      {state === "waiting" && <><p className="eyebrow">Payment confirmation</p><h1 className="page-title mt-5">Confirming your payment</h1><p className="body-large mx-auto mt-5 max-w-lg">Stripe has returned you safely. BIDREADY24 is waiting for the signed server-to-server payment confirmation.</p><div className="mx-auto mt-8 h-1.5 w-40 overflow-hidden rounded-full bg-[var(--border)]"><div className="h-full w-1/2 animate-pulse rounded-full bg-[var(--signal-blue)]" /></div></>}
      {state === "ready" && <><p className="eyebrow">Payment confirmed</p><h1 className="page-title mt-5">Your project is ready</h1><p className="body-large mx-auto mt-5 max-w-lg">Continue to the private workspace to add company evidence and upload the tender pack.</p><a href={`/project/${token}`} className="button-primary mt-8">Open project workspace</a><p className="mt-5 text-xs text-[var(--ink-faint)]">Treat the project link as confidential. It grants access to this tender workspace.</p></>}
      {state === "failed" && <><p className="eyebrow">Confirmation delayed</p><h1 className="page-title mt-5">Do not pay again yet</h1><p className="body-large mx-auto mt-5 max-w-lg">Your payment may still have succeeded. Contact support with the Stripe receipt so it can be reconciled safely.</p><a href="/contact" className="button-secondary mt-8">Contact support</a></>}
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return <Suspense fallback={<div className="p-12 text-center">Confirming payment…</div>}><CheckoutSuccessContent /></Suspense>;
}
