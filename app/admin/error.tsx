"use client";

import Link from "next/link";
import { AlertTriangle, RotateCw } from "lucide-react";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto mt-12 max-w-lg border border-amber-300 bg-amber-50 p-8 text-center text-[#17202A]">
      <AlertTriangle className="mx-auto h-8 w-8 text-amber-700" aria-hidden="true" />
      <h1 className="mt-4 text-2xl font-semibold">Admin data is temporarily unavailable</h1>
      <p className="mt-3 text-sm leading-6 text-slate-700">The secure session is active, but the operational database did not complete its readiness check. Retry after the deployment finishes.</p>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <button type="button" onClick={reset} className="button-primary"><RotateCw className="h-4 w-4" /> Retry</button>
        <Link href="/" className="button-secondary">Return to site</Link>
      </div>
    </div>
  );
}
