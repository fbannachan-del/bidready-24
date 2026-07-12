"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

const REGIONS = [
  "",
  "Scotland",
  "England",
  "Wales",
  "Northern Ireland",
  "London",
  "South East",
  "South West",
  "East of England",
  "East Midlands",
  "West Midlands",
  "North East",
  "North West",
  "Yorkshire and the Humber",
];

export default function TenderAlertsPage() {
  const [email, setEmail] = useState("");
  const [keyword, setKeyword] = useState("cleaning");
  const [region, setRegion] = useState("Scotland");
  const [smeOnly, setSmeOnly] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [manageUrl, setManageUrl] = useState("");
  const [message, setMessage] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    setManageUrl("");
    try {
      const res = await fetch("/api/alerts/tender-watch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, keyword, region, smeOnly }),
      });
      const data = await res.json() as { ok?: boolean; error?: string; manageUrl?: string; message?: string };
      if (!res.ok) {
        setError(data.error || "Could not create watch.");
        return;
      }
      setMessage(data.message || "Watch created.");
      if (data.manageUrl) setManageUrl(data.manageUrl);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-[720px] px-5 py-16 sm:px-8 sm:py-24">
      <p className="eyebrow">Tender alerts</p>
      <h1 className="page-title mt-5">Get notified when matching tenders go live</h1>
      <p className="body-large mt-5 max-w-2xl">
        Set a watch on open UK public-sector cleaning opportunities. When a new notice matches your filters,
        BIDREADY24 sends an alert you can open from your email or notification adapter.
      </p>

      <form onSubmit={onSubmit} className="mt-10 grid gap-4 rounded-2xl border border-[var(--border)] bg-white p-6 sm:p-8">
        <label className="text-sm font-medium">
          Email
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
        <label className="text-sm font-medium">
          Keyword
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            maxLength={100}
            className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--border-strong)] px-3 text-sm"
            placeholder="cleaning, window cleaning…"
          />
        </label>
        <label className="text-sm font-medium">
          Region
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--border-strong)] bg-white px-3 text-sm"
          >
            <option value="">All regions</option>
            {REGIONS.filter(Boolean).map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-[var(--slate)]">
          <input type="checkbox" checked={smeOnly} onChange={(e) => setSmeOnly(e.target.checked)} className="h-4 w-4 accent-[var(--signal-blue)]" />
          SME-suitable notices only
        </label>
        <button type="submit" disabled={loading} className="button-primary w-full sm:w-auto disabled:opacity-60">
          {loading ? "Creating watch…" : "Start tender alerts"}
        </button>
      </form>

      {(error || message) && (
        <div className={`mt-6 rounded-xl border p-4 text-sm ${error ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>
          {error || message}
          {manageUrl && (
            <p className="mt-3 break-all text-xs">
              Manage link (save this):{" "}
              <a href={manageUrl} className="font-medium underline underline-offset-4">{manageUrl}</a>
            </p>
          )}
        </div>
      )}

      <p className="mt-10 text-sm text-[var(--slate)]">
        Already analysing a pack?{" "}
        <Link href="/login" className="font-medium text-[var(--blue-ink)] underline underline-offset-4">Open your project</Link>
        {" "}to set stage alerts for that workspace.{" "}
        <Link href="/cleaning-tenders/jobs" className="font-medium text-[var(--blue-ink)] underline underline-offset-4">Browse live tenders</Link>
      </p>
    </div>
  );
}
