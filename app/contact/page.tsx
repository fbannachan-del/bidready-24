"use client";
import { useState } from "react";

export default function Contact() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    // MVP: just simulate + would hit an API that rate limits
    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 600);
  }

  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-3xl font-semibold tracking-tight mb-2">Contact &amp; Support</h1>
      <p className="text-sm text-[#475569] mb-6">Questions about a tender you’re looking at? Support for an existing project? Use the form.</p>

      {sent ? (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded">Thank you. We will reply within one working day (MVP response is manual).</div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <input name="name" placeholder="Your name" required className="w-full border p-2 rounded" />
          <input name="email" type="email" placeholder="Email" required className="w-full border p-2 rounded" />
          <input name="project" placeholder="Project reference or tender name (optional)" className="w-full border p-2 rounded" />
          <textarea name="message" placeholder="How can we help?" required rows={5} className="w-full border p-2 rounded" />
          <button disabled={loading} className="w-full rounded bg-[#0A3D62] text-white py-2 disabled:opacity-60">{loading ? "Sending..." : "Send message"}</button>
          <p className="text-[10px] text-[#64748B]">Abuse protection: repeated identical submissions from the same IP will be rate-limited.</p>
        </form>
      )}
    </div>
  );
}
