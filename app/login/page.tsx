"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [projectRef, setProjectRef] = useState("");
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function requestAccess(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/access", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "request", email, project_ref: projectRef }),
      });
      const data = await res.json() as { ok?: boolean; error?: string; message?: string; redirect?: string };
      if (!res.ok) {
        setError(data.error || "Request could not be completed.");
        return;
      }
      setMessage(data.message || "If a match is on file, continue with the link shown.");
      if (data.redirect) router.push(data.redirect);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function openToken(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/access", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "token", token }),
      });
      const data = await res.json() as { ok?: boolean; error?: string; redirect?: string };
      if (!res.ok || !data.redirect) {
        setError(data.error || "That project link is invalid or has expired.");
        return;
      }
      router.push(data.redirect);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-[720px] px-5 py-16 sm:px-8 sm:py-24">
      <p className="eyebrow">Project access</p>
      <h1 className="page-title mt-5">Open your tender workspace</h1>
      <p className="body-large mt-5 max-w-2xl">
        BIDREADY24 does not use customer passwords. After purchase you receive a private project link.
        Return here with that link, or with the email and project reference from your intake or payment confirmation.
      </p>

      <section className="mt-10 rounded-2xl border border-[var(--border)] bg-white p-6 sm:p-8">
        <h2 className="font-serif text-xl font-medium">I have a project link</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--slate)]">Paste the full URL or the token segment from your confirmation email.</p>
        <form onSubmit={openToken} className="mt-5 grid gap-3">
          <label className="text-sm font-medium">
            Project link or token
            <input
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--border-strong)] px-3 text-sm"
              placeholder="https://…/project/… or token"
              autoComplete="off"
              required
            />
          </label>
          <button type="submit" disabled={loading} className="button-primary w-full sm:w-auto disabled:opacity-60">
            {loading ? "Checking…" : "Open workspace"}
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-2xl border border-[var(--border)] bg-white p-6 sm:p-8">
        <h2 className="font-serif text-xl font-medium">Email + project reference</h2>
        <p className="mt-2 text-sm leading-6 text-[var(--slate)]">
          Use the contact email saved on intake and the project id (starts with <code className="font-mono text-xs">proj_</code>).
          Both must match a live project. We do not list projects by email alone.
        </p>
        <form onSubmit={requestAccess} className="mt-5 grid gap-3">
          <label className="text-sm font-medium">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--border-strong)] px-3 text-sm"
              autoComplete="email"
              required
            />
          </label>
          <label className="text-sm font-medium">
            Project reference
            <input
              value={projectRef}
              onChange={(e) => setProjectRef(e.target.value)}
              className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--border-strong)] px-3 text-sm"
              placeholder="proj_…"
              autoComplete="off"
              required
            />
          </label>
          <button type="submit" disabled={loading} className="button-secondary w-full sm:w-auto disabled:opacity-60">
            {loading ? "Checking…" : "Continue"}
          </button>
        </form>
      </section>

      {(error || message) && (
        <p role="status" className={`mt-6 text-sm leading-6 ${error ? "text-red-700" : "text-[var(--slate)]"}`}>
          {error || message}
        </p>
      )}

      <p className="mt-10 text-sm text-[var(--slate)]">
        New here?{" "}
        <Link href="/pricing" className="font-medium text-[var(--blue-ink)] underline underline-offset-4">Start a preflight</Link>
        {" · "}
        <Link href="/contact" className="font-medium text-[var(--blue-ink)] underline underline-offset-4">Contact support</Link>
      </p>
    </div>
  );
}
