import { NextRequest, NextResponse } from "next/server";
import { getProjectByToken } from "@/lib/projects";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { getDb } from "@/lib/db";
import { validateUploadBatch } from "@/lib/validation/uploads";
import { runAutonomousPipeline } from "@/lib/autonomous-pipeline";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./data/uploads";
const MAX_BATCH_MB = Number(process.env.MAX_UPLOAD_MB || 200);
const MAX_FILE_MB = Number(process.env.MAX_FILE_MB || 50);
const MAX_FILES = Number(process.env.MAX_FILES_PER_PROJECT || 20);

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const project = getProjectByToken(token);
  if (!project) return NextResponse.json({ error: "Invalid or expired project link" }, { status: 404 });

  const form = await req.formData();
  const incoming = form.getAll("files").filter((item): item is File => item instanceof File);
  const buffered = await Promise.all(incoming.map(async (file) => ({ name: file.name, type: file.type, size: file.size, bytes: new Uint8Array(await file.arrayBuffer()) })));
  const db = getDb();
  const existing = db.prepare(`SELECT sha256 FROM files WHERE project_id = ? AND deleted_at IS NULL`).all(project.id) as Array<{ sha256: string }>;
  const remaining = Math.max(0, MAX_FILES - existing.length);
  const validated = validateUploadBatch(buffered, {
    maxFiles: remaining,
    maxFileBytes: MAX_FILE_MB * 1024 * 1024,
    maxBatchBytes: MAX_BATCH_MB * 1024 * 1024,
    existingHashes: existing.map((item) => item.sha256),
  });
  if (!validated.ok) return NextResponse.json({ error: "Upload validation failed", issues: validated.errors }, { status: 400 });
  if (validated.noop) return NextResponse.json({ ok: true, count: 0, duplicates: validated.duplicates.length, message: "These immutable files were already uploaded; no duplicate analysis was created." });

  await mkdir(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, project.id), { recursive: true });
  const insert = db.prepare(`INSERT INTO files (id, project_id, original_name, stored_path, mime_type, size_bytes, sha256) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  const written: string[] = [];
  try {
    for (const file of validated.files) {
      const fileId = `file_${crypto.randomBytes(10).toString("hex")}`;
      const stored = path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, project.id, `${fileId}${file.extension}`);
      await writeFile(stored, file.bytes, { flag: "wx" });
      written.push(stored);
      insert.run(fileId, project.id, file.safeName, stored, file.type || "application/octet-stream", file.size, file.sha256);
    }
  } catch {
    return NextResponse.json({ error: "Files could not be stored safely.", code: "FILE_STORAGE_FAILED" }, { status: 500 });
  }
  db.prepare(`UPDATE projects SET status = 'processing', updated_at = datetime('now') WHERE id = ?`).run(project.id);
  try {
    const analysis = await runAutonomousPipeline(project.id, "upload");
    return NextResponse.json({ ok: true, count: validated.files.length, duplicates: validated.duplicates.length, analysis });
  } catch {
    return NextResponse.json({ error: "Files were stored, but tender analysis could not be completed.", code: "ANALYSIS_FAILED", stored: written.length }, { status: 500 });
  }
}
