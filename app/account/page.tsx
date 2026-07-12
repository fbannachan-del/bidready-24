"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type ProjectRow = {
  id: string;
  company_name: string | null;
  tender_title: string | null;
  status: string;
  order_type: string;
  deadline: string | null;
  workspace_path: string;
  alerts_path: string;
  is_in_flight: boolean;
  is_complete: boolean;
  is_failed: boolean;
  paid: boolean;
};

type MeResponse = {
  ok: boolean;
  error?: string;
  account?: { email: string; name: string | null };
  summary?: { total: number; in_flight: number; complete: number; failed: number };
  projects?: ProjectRow[];
  tender_watches?: Array<{ id: string; keyword: string; region: string; active: boolean; manage_token: string }>;
};

const STATUS_LABEL: Record<string, string> = {
  paid: "Payment confirmed",
  awaiting_intake: "Intake required",
  awaiting_files: "Awaiting documents",
  processing: "Analysis running",
  review_required: "Review flagged",
  ready: "Report ready",
  delivered: "Delivered",
  failed: "Needs attention",
  created: "Unpaid shell",
};

export default function AccountDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimRef, setClaimRef] = useState("");
  const [claimMsg, setClaimMsg] = useState("");
  const [claimErr, setClaimErr] = useState("");
  const [filter, setFilter] = useState<"all" | "in_flight" | "complete" | "failed">("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/account/me", { cache: "no-store" });
      if (res.status === 401) {
        router.replace("/account/login");
        return;
      }
      const json = await res.json() as MeResponse;
      setData(json);
    } catch {
      setData({ ok: false, error: "Could not load account." });
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function claim(e: FormEvent) {
    e.preventDefault();
    setClaimMsg("");
    setClaimErr("");
    try {
      const res = await fetch("/api/account/claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ project_ref: claimRef }),
      });
      const json = await res.json() as { ok?: boolean; error?: string; workspace_path?: string };
      if (!res.ok) {
        setClaimErr(json.error || "Could not claim project.");
        return;
      }
      setClaimMsg("Paid project linked to your account.");
      setClaimRef("");
      await load();
    } catch {
      setClaimErr("Network error.");
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-5xl px-5 py-20 text-sm text-[var(--slate)]">Loading your account…</div>;
  }

  if (!data?.ok || !data.account) {
    return (
      <div className="mx-auto max-w-xl px-5 py-20">
        <p className="text-sm text-red-700">{data?.error || "Not signed in."}</p>
        <Link href="/account/login" className="button-primary mt-6 inline-flex">Sign in</Link>
      </div>
    );
  }

  const projects = (data.projects || []).filter((p) => {
    if (filter === "in_flight") return p.is_in_flight;
    if (filter === "complete") return p.is_complete;
    if (filter === "failed") return p.is_failed;
    return true;
  });

  return (
    <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Your account</p>
          <h1 className="page-title mt-3">Project hub</h1>
          <p className="mt-3 text-sm text-[var(--slate)]">{data.account.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/pricing" className="button-primary">Buy another preflight</Link>
          <Link href="/alerts" className="button-secondary">Tender alerts</Link>
          <a href="/api/account/logout" className="button-secondary">Sign out</a>
        </div>
      </div>

      <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-950">
        <strong>Pay per project.</strong> Your account never unlocks free analysis. Each new tender starts at checkout; this hub only lists paid workspaces you own or claim.
      </p>

      <section className="mt-8 grid gap-3 sm:grid-cols-4">
        {[
          ["Total paid projects", data.summary?.total ?? 0],
          ["In flight", data.summary?.in_flight ?? 0],
          ["Complete", data.summary?.complete ?? 0],
          ["Needs attention", data.summary?.failed ?? 0],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-xl border border-[var(--border)] bg-white p-4">
            <p className="font-mono text-[10px] uppercase tracking-wide text-[var(--ink-faint)]">{label}</p>
            <p className="mt-2 font-serif text-3xl font-medium">{value}</p>
          </div>
        ))}
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-serif text-2xl font-medium">Projects</h2>
          <div className="flex flex-wrap gap-2 text-xs">
            {([
              ["all", "All"],
              ["in_flight", "In flight"],
              ["complete", "Complete"],
              ["failed", "Failed"],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={`rounded-full border px-3 py-1.5 font-medium ${filter === id ? "border-[var(--signal-blue)] bg-[var(--blue-soft)] text-[var(--blue-ink)]" : "border-[var(--border)] text-[var(--slate)]"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-[var(--border-strong)] bg-white p-8 text-center">
            <p className="font-medium">No paid projects in this view yet</p>
            <p className="mt-2 text-sm text-[var(--slate)]">Purchase a preflight, or claim a paid workspace you already own.</p>
            <Link href="/pricing" className="button-primary mt-5 inline-flex">Start a preflight</Link>
          </div>
        ) : (
          <div className="mt-5 divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-white">
            {projects.map((p) => (
              <article key={p.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-[var(--ink)]">{p.tender_title || p.company_name || "Untitled tender"}</p>
                  <p className="mt-1 text-xs text-[var(--slate)]">
                    {p.company_name || "Company pending"} · <span className="font-mono">{p.id}</span>
                  </p>
                  <p className="mt-2 inline-flex rounded-full border border-[var(--border)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--slate)]">
                    {STATUS_LABEL[p.status] || p.status.replaceAll("_", " ")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={p.workspace_path} className="button-primary !min-h-9 !px-3 !text-xs">Open workspace</Link>
                  <Link href={p.alerts_path} className="button-secondary !min-h-9 !px-3 !text-xs">Stage alerts</Link>
                  <Link href={`${p.workspace_path}/report`} className="button-secondary !min-h-9 !px-3 !text-xs">Report</Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--border)] bg-white p-6">
          <h2 className="font-serif text-xl font-medium">Claim a paid project</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--slate)]">
            Paste a workspace link, project token, or <code className="font-mono text-xs">proj_…</code> id after you have paid. Unpaid shells cannot be claimed.
          </p>
          <form onSubmit={claim} className="mt-4 grid gap-3">
            <input
              value={claimRef}
              onChange={(e) => setClaimRef(e.target.value)}
              placeholder="proj_… or /project/… token"
              className="min-h-11 rounded-lg border border-[var(--border-strong)] px-3 text-sm"
              required
            />
            <button type="submit" className="button-secondary w-full sm:w-auto">Link to my account</button>
          </form>
          {claimErr && <p className="mt-3 text-sm text-red-700">{claimErr}</p>}
          {claimMsg && <p className="mt-3 text-sm text-emerald-800">{claimMsg}</p>}
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-white p-6">
          <h2 className="font-serif text-xl font-medium">Tender watches</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--slate)]">Open-market alerts for your account email.</p>
          {(data.tender_watches || []).length === 0 ? (
            <p className="mt-4 text-sm text-[var(--slate)]">No watches yet.</p>
          ) : (
            <ul className="mt-4 space-y-2 text-sm">
              {data.tender_watches!.map((w) => (
                <li key={w.id} className="flex items-center justify-between gap-3 border-b border-[var(--border)] py-2">
                  <span>
                    <span className="font-medium">{w.keyword}</span>
                    <span className="text-[var(--slate)]"> · {w.region || "Any region"} · {w.active ? "active" : "paused"}</span>
                  </span>
                  <Link href={`/alerts/manage?token=${encodeURIComponent(w.manage_token)}`} className="text-xs font-medium text-[var(--blue-ink)] underline underline-offset-4">Manage</Link>
                </li>
              ))}
            </ul>
          )}
          <Link href="/alerts" className="mt-4 inline-flex text-sm font-medium text-[var(--blue-ink)] underline underline-offset-4">Create tender watch</Link>
        </div>
      </section>
    </div>
  );
}
