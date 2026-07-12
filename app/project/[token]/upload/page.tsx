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
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold mb-1">Upload Tender Documents</h1>
      <p className="text-sm text-[#475569]">Supported: PDF, DOCX, XLSX, CSV, TXT. Max ~200 MB total. We will validate and hash each file.</p>

      <div className="mt-6">
        <input type="file" multiple onChange={e => setFiles(e.target.files)} className="block w-full text-sm" />
        <button onClick={upload} disabled={!files || done} className="mt-3 px-6 py-2 bg-[#0A3D62] text-white rounded-full text-sm disabled:opacity-50">Upload &amp; validate</button>
        <div className="text-xs mt-2 text-emerald-600">{status}</div>
      </div>

      {done && <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">Files passed the upload checks. Return to the <a href={`/project/${token}`} className="font-semibold underline underline-offset-4">project workspace</a> to start or monitor the autonomous run.</div>}
    </div>
  );
}
