"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";

type StageOption = { id: string; label: string };

export default function ProjectAlertsPage() {
  const { token } = useParams<{ token: string }>();
  const [email, setEmail] = useState("");
  const [stages, setStages] = useState<string[]>([]);
  const [available, setAvailable] = useState<StageOption[]>([]);
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/alerts/project/${token}`);
        const data = await res.json() as {
          ok?: boolean;
          error?: string;
          email?: string;
          stages?: string[];
          active?: boolean;
          availableStages?: StageOption[];
        };
        if (!res.ok) {
          setError(data.error || "Could not load alert settings.");
          return;
        }
        setEmail(data.email || "");
        setStages(data.stages || []);
        setActive(data.active !== false);
        setAvailable(data.availableStages || []);
      } catch {
        setError("Network error loading settings.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  function toggleStage(id: string) {
    setStages((current) => (current.includes(id) ? current.filter((s) => s !== id) : [...current, id]));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/alerts/project/${token}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, stages, active }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error || "Could not save alerts.");
        return;
      }
      setMessage("Project stage alerts saved.");
    } catch {
      setError("Network error while saving.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 font-['IBM_Plex_Sans',Arial,sans-serif] text-[#17202A]">
      <Link href={`/project/${token}`} className="text-xs font-medium text-[#667085] hover:text-[#1457FF]">← Back to project workspace</Link>
      <div className="mt-4 font-['IBM_Plex_Mono',monospace] text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1457FF]">Notifications</div>
      <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Project stage alerts</h1>
      <p className="mt-2 text-sm leading-6 text-[#667085]">
        Choose which workspace stages should email you. You control the email and the stages; nothing is sent for stages you leave off.
      </p>

      {loading ? (
        <p className="mt-8 text-sm text-[#667085]">Loading settings…</p>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 space-y-5">
          <label className="block text-sm font-medium">
            Alert email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-[#B7B2A7] px-3 py-2 text-sm"
            />
          </label>

          <fieldset>
            <legend className="text-sm font-medium">Notify me when the project reaches</legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {available.map((stage) => (
                <label key={stage.id} className="flex items-start gap-2 rounded-lg border border-[#D9D5CB] bg-[#FBFAF6] px-3 py-2.5 text-sm">
                  <input
                    type="checkbox"
                    checked={stages.includes(stage.id)}
                    onChange={() => toggleStage(stage.id)}
                    className="mt-0.5 h-4 w-4 accent-[#1457FF]"
                  />
                  <span>
                    <span className="font-medium">{stage.label}</span>
                    <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-wide text-[#667085]">{stage.id}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-[#1457FF]" />
            Alerts enabled for this project
          </label>

          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          {message && <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">{message}</p>}

          <button type="submit" disabled={saving} className="w-full bg-[#1457FF] py-2.5 text-sm font-semibold text-white hover:bg-[#0C45D8] disabled:opacity-60 sm:w-auto sm:px-6">
            {saving ? "Saving…" : "Save stage alerts"}
          </button>
        </form>
      )}

      <p className="mt-8 text-xs leading-5 text-[#667085]">
        Want open-market tender notifications as well?{" "}
        <Link href="/alerts" className="font-medium text-[#1457FF] underline underline-offset-4">Set a tender watch</Link>.
      </p>
    </div>
  );
}
