import { NextRequest, NextResponse } from "next/server";
import { getProjectByToken } from "@/lib/projects";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./data/uploads";
const MAX_MB = parseInt(process.env.MAX_UPLOAD_MB || "200");

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const project = getProjectByToken(token);
  if (!project) return NextResponse.json({ error: "Invalid project" }, { status: 404 });

  const form = await req.formData();
  const files = form.getAll("files") as File[];
  if (!files.length) return NextResponse.json({ error: "No files" }, { status: 400 });

  let total = 0;
  await mkdir(path.join(UPLOAD_DIR, project.id), { recursive: true });

  const db = (await import("@/lib/db")).getDb();
  for (const file of files) {
    total += file.size;
    if (total > MAX_MB * 1024 * 1024) return NextResponse.json({ error: "Total size limit exceeded" }, { status: 413 });

    const buf = Buffer.from(await file.arrayBuffer());
    const hash = crypto.createHash("sha256").update(buf).digest("hex");

    // Basic validation
    const ext = path.extname(file.name).toLowerCase();
    const allowed = [".pdf", ".docx", ".xlsx", ".csv", ".txt", ".doc", ".xls"];
    if (!allowed.includes(ext)) return NextResponse.json({ error: `Unsupported file type: ${ext}` }, { status: 415 });

    const stored = path.join(UPLOAD_DIR, project.id, `${Date.now()}-${file.name}`);
    await writeFile(stored, buf);

    // record in DB (simple insert)
    const fileId = "file_" + crypto.randomBytes(8).toString("hex");
    db.prepare(`INSERT INTO files (id, project_id, original_name, stored_path, mime_type, size_bytes, sha256) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(fileId, project.id, file.name, stored, file.type || "application/octet-stream", file.size, hash);
  }

  // move project status
  db.prepare(`UPDATE projects SET status = 'processing' WHERE id = ?`).run(project.id);

  return NextResponse.json({ ok: true, count: files.length });
}
