"use client";
import { useState } from "react";
import Link from "next/link";

export default function Contact() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      const data = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) throw new Error(data.error || "Your message could not be sent.");
      setLoading(false);
      setSent(true);
    } catch (submitError) {
      setLoading(false);
      setError(submitError instanceof Error ? submitError.message : "Your message could not be sent.");
    }
  }

  return (
    <div className="mx-auto grid max-w-[1050px] gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[.85fr_1.15fr]">
      <div>
        <p className="eyebrow">Contact &amp; support</p>
        <h1 className="page-title mt-5">Tell us what you need to resolve.</h1>
        <p className="body-large mt-6">Ask about a tender, payment or an existing project. Please do not paste confidential tender content, passwords or buyer-portal credentials into this form.</p>

        <div className="mt-8 rounded-xl border border-[var(--border)] bg-white p-5">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-faint)]">Email</p>
          <a
            href="mailto:hello@bidready24.com"
            className="mt-2 inline-block text-lg font-medium text-[var(--blue-ink)] underline decoration-[var(--border-strong)] underline-offset-4 hover:text-[var(--ink)]"
          >
            hello@bidready24.com
          </a>
          <p className="mt-2 text-sm leading-6 text-[var(--slate)]">
            Prefer email? Write to us directly. Include your project reference and Stripe receipt where relevant.
          </p>
        </div>

        <div className="mt-6 rounded-xl border border-[var(--border)] bg-white p-5 text-sm leading-6 text-[var(--slate)]">
          <p className="font-medium text-[var(--ink)]">Include</p>
          <p className="mt-1">Your project reference, the part of the workflow affected and what you expected to happen.</p>
          <p className="mt-4 font-medium text-[var(--ink)]">Keep out</p>
          <p className="mt-1">Full tender documents, payment-card details, access tokens and third-party passwords.</p>
        </div>
        <p className="mt-6 text-xs leading-5 text-[var(--ink-faint)]">
          For data or deletion requests, state that clearly and provide the project reference. Authority may need to be verified. See the{" "}
          <Link href="/legal/privacy" className="underline underline-offset-4">privacy notice</Link>.
        </p>
      </div>

      <div className="panel p-6 sm:p-8">

      {sent ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5"><p className="font-serif text-2xl font-medium text-emerald-950">Request received.</p><p className="mt-2 text-sm leading-6 text-emerald-900">Your message is in the support queue. Keep any Stripe receipt or project reference available in case verification is needed.</p></div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label htmlFor="contact-name" className="mb-2 block text-xs font-medium">Name</label><input id="contact-name" name="name" autoComplete="name" placeholder="Your name" required className="w-full rounded-lg border border-[var(--border-strong)] bg-white px-3.5 py-3 text-sm" /></div>
          <div><label htmlFor="contact-email" className="mb-2 block text-xs font-medium">Business email</label><input id="contact-email" name="email" type="email" autoComplete="email" placeholder="you@company.co.uk" required className="w-full rounded-lg border border-[var(--border-strong)] bg-white px-3.5 py-3 text-sm" /></div>
          <div><label htmlFor="contact-project" className="mb-2 block text-xs font-medium">Project reference <span className="font-normal text-[var(--ink-faint)]">optional</span></label><input id="contact-project" name="project" placeholder="Project ID or tender name" className="w-full rounded-lg border border-[var(--border-strong)] bg-white px-3.5 py-3 text-sm" /></div>
          <div><label htmlFor="contact-message" className="mb-2 block text-xs font-medium">How can we help?</label><textarea id="contact-message" name="message" placeholder="Describe the issue without including confidential documents or credentials." required rows={6} className="w-full rounded-lg border border-[var(--border-strong)] bg-white px-3.5 py-3 text-sm" /></div>
          <button disabled={loading} className="button-primary w-full disabled:cursor-wait disabled:opacity-60">{loading ? "Sending…" : "Send to support"}</button>
          {error && <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <p className="text-[10px] leading-4 text-[var(--ink-faint)]">
            Or email{" "}
            <a href="mailto:hello@bidready24.com" className="underline underline-offset-2">hello@bidready24.com</a>
            . Connection information is hashed for short-window abuse prevention. Repeated requests may be rate-limited.
          </p>
        </form>
      )}
      </div>
    </div>
  );
}
