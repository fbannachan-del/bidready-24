"use client";

import { useState } from "react";
import { useParams } from "next/navigation";

const ALLOWED_TYPES = [
  { ext: "PDF", detail: ".pdf — Adobe PDF documents" },
  { ext: "Word", detail: ".docx — Word documents" },
  { ext: "Excel", detail: ".xls / .xlsx — spreadsheets" },
  { ext: "CSV", detail: ".csv — comma-separated tables" },
  { ext: "Text", detail: ".txt — plain text extracts" },
] as const;

const ACCEPT = ".pdf,.docx,.xls,.xlsx,.csv,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain";

export default function Upload() {
  const { token } = useParams<{ token: string }>();
  const [files, setFiles] = useState<FileList | null>(null);
  const [status, setStatus] = useState("");
  const [done, setDone] = useState(false);

  async function upload() {
    if (!files || files.length === 0) return;
    setStatus("Uploading...");
    const form = new FormData();
    Array.from(files).forEach(f => form.append("files", f));

    const res = await fetch(`/api/project/${token}/upload`, { method: "POST", body: form });
    const j = await res.json();
    if (res.ok) {
      setStatus("Uploaded successfully. The pack is ready for autonomous processing.");
      setDone(true);
    } else {
      const issues = Array.isArray(j.issues) ? `: ${j.issues.join("; ")}` : "";
      setStatus("Error: " + (j.error || "upload failed") + issues);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 font-['IBM_Plex_Sans',Arial,sans-serif] text-[#17202A]">
      <div className="font-['IBM_Plex_Mono',monospace] text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1457FF]">Tender intake</div>
      <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Upload tender documents</h1>
      <p className="mt-2 text-sm leading-6 text-[#667085]">
        Only the file types below are accepted. Each file is signature-checked, hashed and stored under its original name.
        Unsupported types (including images, ZIP and markdown) are rejected before analysis starts.
      </p>

      <div className="mt-5 rounded-xl border border-[#D9D5CB] bg-[#FBFAF6] p-4">
        <p className="font-['IBM_Plex_Mono',monospace] text-[10px] font-semibold uppercase tracking-[0.12em] text-[#667085]">Allowed types</p>
        <ul className="mt-3 grid gap-2 text-sm text-[#17202A] sm:grid-cols-2">
          {ALLOWED_TYPES.map((item) => (
            <li key={item.ext} className="flex gap-2">
              <span className="font-semibold text-[#1457FF]">{item.ext}</span>
              <span className="text-[#667085]">{item.detail}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 grid gap-1 border-t border-[#D9D5CB] pt-3 text-xs text-[#667085] sm:grid-cols-2">
          <div><dt className="inline font-medium text-[#17202A]">Max per file: </dt><dd className="inline">50 MB</dd></div>
          <div><dt className="inline font-medium text-[#17202A]">Max per project: </dt><dd className="inline">20 files · 200 MB batch</dd></div>
        </dl>
      </div>

      <div className="mt-6">
        <label className="block text-sm font-medium text-[#17202A]">
          Select files
          <input
            type="file"
            multiple
            accept={ACCEPT}
            onChange={e => setFiles(e.target.files)}
            className="mt-2 block w-full text-sm"
          />
        </label>
        <button onClick={upload} disabled={!files || done} className="mt-3 bg-[#1457FF] px-6 py-2 text-sm font-semibold text-white hover:bg-[#0C45D8] disabled:opacity-50">Upload and validate</button>
        <div className="text-xs mt-2 text-emerald-700 whitespace-pre-wrap">{status}</div>
      </div>

      {done && <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">Files passed the upload checks. Return to the <a href={`/project/${token}`} className="font-semibold underline underline-offset-4">project workspace</a> to start or monitor the autonomous run.</div>}
    </div>
  );
}
