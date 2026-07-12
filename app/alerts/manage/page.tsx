"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function ManageForm() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [keyword, setKeyword] = useState("cleaning");
  const [region, setRegion] = useState("");
  const [smeOnly, setSmeOnly] = useState(false);
  const [active, setActive] = useState(true);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError("Missing manage token.");
      return;
    }
    void (async () => {
      try {
        const res = await fetch(`/api/alerts/tender-watch?token=${encodeURIComponent(token)}`);
        const data = await res.json() as {
          ok?: boolean;
          error?: string;
          watch?: { email: string; keyword: string; region: string; smeOnly: boolean; active: boolean };
        };
        if (!res.ok || !data.watch) {
          setError(data.error || "Watch not found.");
          return;
        }
        setEmail(data.watch.email);
        setKeyword(data.watch.keyword);
        setRegion(data.watch.region);
        setSmeOnly(data.watch.smeOnly);
        setActive(data.watch.active);
      } catch {
        setError("Could not load watch.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/alerts/tender-watch", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ manageToken: token, keyword, region, smeOnly, active }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error || "Could not save.");
        return;
      }
      setMessage(active ? "Watch updated." : "Alerts stopped for this watch.");
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-[var(--slate)]">Loading watch…</p>;

  return (
    <form onSubmit={onSubmit} className="mt-8 grid gap-4 rounded-2xl border border-[var(--border)] bg-white p-6">
      <p className="text-sm text-[var(--slate)]">Email: <strong className="text-[var(--ink)]">{email || "—"}</strong></p>
      <label className="text-sm font-medium">
        Keyword
        <input value={keyword} onChange={(e) => setKeyword(e.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--border-strong)] px-3 text-sm" />
      </label>
      <label className="text-sm font-medium">
        Region
        <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="All regions" className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--border-strong)] px-3 text-sm" />
      </label>
      <label className="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" checked={smeOnly} onChange={(e) => setSmeOnly(e.target.checked)} className="h-4 w-4" />
        SME-suitable only
      </label>
      <label className="inline-flex items-center gap-2 text-sm">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4" />
        Alerts active
      </label>
      <button type="submit" disabled={saving} className="button-primary w-full sm:w-auto disabled:opacity-60">
        {saving ? "Saving…" : "Save changes"}
      </button>
      {(error || message) && (
        <p className={`text-sm ${error ? "text-red-700" : "text-emerald-800"}`}>{error || message}</p>
      )}
    </form>
  );
}

export default function ManageTenderAlertsPage() {
  return (
    <div className="mx-auto max-w-[640px] px-5 py-16 sm:px-8">
      <p className="eyebrow">Tender alerts</p>
      <h1 className="page-title mt-5">Manage your watch</h1>
      <p className="body-large mt-4">Update filters or stop alerts. Anyone with this manage link can change the watch.</p>
      <Suspense fallback={<p className="mt-8 text-sm">Loading…</p>}>
        <ManageForm />
      </Suspense>
      <p className="mt-8 text-sm">
        <Link href="/alerts" className="text-[var(--blue-ink)] underline underline-offset-4">Create another watch</Link>
        {" · "}
        <Link href="/cleaning-tenders/jobs" className="text-[var(--blue-ink)] underline underline-offset-4">Live tenders</Link>
      </p>
    </div>
  );
}
