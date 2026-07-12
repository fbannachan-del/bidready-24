"use client";

import { useState } from "react";
import { useParams } from "next/navigation";

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
      setStatus("Error: " + (j.error || "upload failed"));
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 font-['IBM_Plex_Sans',Arial,sans-serif] text-[#17202A]">
      <div className="font-['IBM_Plex_Mono',monospace] text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1457FF]">Tender intake</div>
      <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Upload tender documents</h1>
      <p className="mt-2 text-sm leading-6 text-[#667085]">PDF, DOCX, XLSX, CSV and TXT are supported. Files are validated, hashed and retained with their original names.</p>

      <div className="mt-6">
        <input type="file" multiple onChange={e => setFiles(e.target.files)} className="block w-full text-sm" />
        <button onClick={upload} disabled={!files || done} className="mt-3 bg-[#1457FF] px-6 py-2 text-sm font-semibold text-white hover:bg-[#0C45D8] disabled:opacity-50">Upload and validate</button>
        <div className="text-xs mt-2 text-emerald-600">{status}</div>
      </div>

      {done && <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">Files passed the upload checks. Return to the <a href={`/project/${token}`} className="font-semibold underline underline-offset-4">project workspace</a> to start or monitor the autonomous run.</div>}
    </div>
  );
}
