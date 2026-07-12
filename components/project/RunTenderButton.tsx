"use client";

import { ArrowRight, CircleCheck, LoaderCircle, Play, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type RunSummary = {
  run_id?: string;
  status?: string;
  message?: string;
  requirements?: number;
  questions?: number;
  gaps?: number;
  error?: string;
};

export default function RunTenderButton({ token, disabled = false }: { token: string; disabled?: boolean }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunSummary | null>(null);

  async function startRun() {
    setRunning(true);
    setResult(null);
    try {
      const response = await fetch(`/api/project/${token}/run`, { method: "POST" });
      const summary = (await response.json().catch(() => ({}))) as RunSummary;
      if (!response.ok) throw new Error(summary.error || "The run could not be started");
      setResult(summary);
      router.refresh();
    } catch (error) {
      setResult({ error: error instanceof Error ? error.message : "The run could not be started" });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={startRun}
        disabled={disabled || running}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#0A3D62] px-5 text-sm font-semibold text-white transition hover:bg-[#082C47] disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"
      >
        {running ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Play className="h-4 w-4 fill-current" aria-hidden="true" />}
        {running ? "Starting autonomous run…" : "Run tender now"}
        {!running && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
      </button>
      {result && (
        <div aria-live="polite" className={`mt-3 flex items-start gap-2 text-xs ${result.error ? "text-red-700" : "text-emerald-700"}`}>
          {result.error ? <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
          <span>
            {result.error || result.message || "Autonomous analysis started."}
            {!result.error && typeof result.requirements === "number" && ` ${result.requirements} requirements, ${result.questions || 0} questions, and ${result.gaps || 0} gaps identified.`}
          </span>
        </div>
      )}
    </div>
  );
}
