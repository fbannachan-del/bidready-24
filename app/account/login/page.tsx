"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

function LoginForm() {
  const params = useSearchParams();
  const errorParam = params.get("error");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(
    errorParam === "invalid"
      ? "That sign-in link is invalid or has expired. Request a new one."
      : errorParam === "missing"
        ? "Sign-in link was incomplete. Request a new one."
        : "",
  );
  const [devLink, setDevLink] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    setDevLink("");
    try {
      const res = await fetch("/api/account/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json() as { ok?: boolean; error?: string; message?: string; devLink?: string };
      if (!res.ok) {
        setError(data.error || "Could not start sign-in.");
        return;
      }
      setMessage(data.message || "Check your email for a sign-in link.");
      if (data.devLink) setDevLink(data.devLink);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form onSubmit={onSubmit} className="mt-8 grid gap-4 rounded-2xl border border-[var(--border)] bg-white p-6 sm:p-8">
        <label className="text-sm font-medium">
          Work email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--border-strong)] px-3 text-sm"
            autoComplete="email"
            placeholder="you@company.co.uk"
          />
        </label>
        <button type="submit" disabled={loading} className="button-primary w-full sm:w-auto disabled:opacity-60">
          {loading ? "Sending link…" : "Email me a sign-in link"}
        </button>
        <p className="text-xs leading-5 text-[var(--ink-faint)]">
          Passwordless sign-in. Each tender project still requires its own payment — your account organises paid workspaces, alerts, and history.
        </p>
      </form>
      {(error || message) && (
        <div className={`mt-6 rounded-xl border p-4 text-sm ${error ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>
          {error || message}
          {devLink && (
            <p className="mt-3 break-all text-xs">
              Dev sign-in link:{" "}
              <a href={devLink} className="font-medium underline underline-offset-4">{devLink}</a>
            </p>
          )}
        </div>
      )}
    </>
  );
}

export default function AccountLoginPage() {
  return (
    <div className="mx-auto max-w-[640px] px-5 py-16 sm:px-8 sm:py-24">
      <p className="eyebrow">Customer account</p>
      <h1 className="page-title mt-5">Sign in</h1>
      <p className="body-large mt-5">
        Access your project history, in-flight workspaces, and alert settings. New tenders always start with checkout.
      </p>
      <Suspense fallback={<p className="mt-8 text-sm">Loading…</p>}>
        <LoginForm />
      </Suspense>
      <p className="mt-10 text-sm text-[var(--slate)]">
        Need a single project link instead?{" "}
        <Link href="/login" className="font-medium text-[var(--blue-ink)] underline underline-offset-4">Open a workspace token</Link>
        {" · "}
        <Link href="/pricing" className="font-medium text-[var(--blue-ink)] underline underline-offset-4">Buy a preflight</Link>
      </p>
    </div>
  );
}
