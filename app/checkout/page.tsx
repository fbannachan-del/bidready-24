"use client";

import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import Link from "next/link";
import { Check, LockKeyhole } from "lucide-react";

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
    <div className="mx-auto grid max-w-[950px] gap-10 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1fr_420px]">
      <div><p className="eyebrow">Secure checkout</p><h1 className="page-title mt-5">Start with one tender.</h1><p className="body-large mt-6">You will complete payment on Stripe’s hosted checkout. After signed payment confirmation, this browser receives access to the new project workspace.</p><ul className="mt-8 grid gap-3 text-sm text-[var(--slate)]">{["One-off purchase—no recurring subscription", "Project released only after verified Stripe confirmation", "Receiver-visible citations, uncertainty and assurance", "No promise of compliance, score or award"].map(item => <li key={item} className="flex gap-3"><Check className="h-4 w-4 shrink-0 text-[var(--verify-green)]" />{item}</li>)}</ul><p className="mt-8 text-xs leading-5 text-[var(--ink-faint)]">By continuing, you confirm you are purchasing for business use and accept the working <Link href="/legal/terms" className="underline underline-offset-4">service terms</Link>, <Link href="/legal/privacy" className="underline underline-offset-4">privacy notice</Link> and <Link href="/legal/refund" className="underline underline-offset-4">refund policy</Link>.</p></div>
      <div className="panel h-fit p-6 sm:p-8">
        <div className="flex items-center justify-between gap-3"><div><p className="font-mono text-[9px] uppercase tracking-[.12em] text-[var(--ink-faint)]">Order summary</p><div className="mt-2 font-serif text-2xl font-medium">{label}</div></div><LockKeyhole className="h-5 w-5 text-[var(--signal-blue)]" aria-hidden="true" /></div>
        <div className="mt-6 border-y border-[var(--border)] py-5"><div className="font-serif text-5xl font-medium tracking-[-.04em]">£{(price / 100).toFixed(0)}</div><p className="mt-1 text-xs text-[var(--ink-faint)]">One-off payment · VAT added only where applicable</p></div>

        {!result ? (
          <button onClick={startCheckout} disabled={loading} className="button-primary mt-6 w-full disabled:cursor-wait disabled:opacity-60">
            {loading ? "Opening Stripe…" : `Continue to payment — £${(price / 100).toFixed(0)}`}
          </button>
        ) : (
          <div className="mt-4">
            <div className="font-medium text-emerald-700">Local test project created.</div>
            <div className="mt-2 text-sm">Project created. Magic link:</div>
            <a href={`/project/${result.token}`} className="mt-1 block break-all text-[var(--blue-ink)] underline">Open local project</a>
            <p className="text-xs mt-3 text-[#64748B]">This branch is only available when local checkout simulation is explicitly enabled.</p>
          </div>
        )}
        {error && <p role="alert" className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <p className="mt-6 text-center font-mono text-[9px] uppercase tracking-[.1em] text-[var(--ink-faint)]">Hosted payment by Stripe</p>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="p-16 text-center text-sm text-[var(--slate)]">Loading checkout…</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
