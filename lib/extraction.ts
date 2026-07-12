import fs from "node:fs/promises";
import path from "node:path";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import { PDFParse } from "pdf-parse";
import type { SourceFragment, UploadedFileRecord } from "./tender-types";

const MAX_FRAGMENT_CHARS = 3_500;

function splitText(file: UploadedFileRecord, text: string, locationPrefix: string): SourceFragment[] {
  const clean = text.replace(/\u0000/g, "").trim();
  if (!clean) return [];
  const fragments: SourceFragment[] = [];
  let cursor = 0;
  let index = 1;
  while (cursor < clean.length) {
    let end = Math.min(cursor + MAX_FRAGMENT_CHARS, clean.length);
    if (end < clean.length) {
      const boundary = Math.max(clean.lastIndexOf("\n", end), clean.lastIndexOf(". ", end));
      if (boundary > cursor + 800) end = boundary + 1;
    }
    fragments.push({
      id: `${file.id}:fragment:${index}`,
      fileId: file.id,
      documentName: file.original_name,
      location: `${locationPrefix}${index > 1 ? ` · part ${index}` : ""}`,
      text: clean.slice(cursor, end).trim(),
      charStart: cursor,
      charEnd: end,
    });
    cursor = end;
    index += 1;
  }
  return fragments;
}

export async function extractFile(file: UploadedFileRecord): Promise<SourceFragment[]> {
  const ext = path.extname(file.original_name).toLowerCase();
  if ([".txt", ".md", ".csv"].includes(ext)) {
    const text = await fs.readFile(file.stored_path, "utf8");
    return splitText(file, text, ext === ".csv" ? "CSV" : "Document");
  }

  if (ext === ".docx") {
    const result = await mammoth.extractRawText({ path: file.stored_path });
    return splitText(file, result.value, "Document");
  }

  if ([".xlsx", ".xls"].includes(ext)) {
    const workbook = XLSX.readFile(file.stored_path, { cellDates: true, cellFormula: true });
    return workbook.SheetNames.flatMap((sheetName) => {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) return [];
      const rows = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
      return splitText(file, rows, `Sheet: ${sheetName}`);
    });
  }

  if (ext === ".pdf") {
    const buffer = await fs.readFile(file.stored_path);
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.pages.flatMap((page) => splitText(file, page.text, `p.${page.num}`));
    } finally {
      await parser.destroy();
    }
  }

  throw new Error(`Extraction is not supported for ${ext || "this file type"}`);
}

export async function extractTenderPack(files: UploadedFileRecord[]) {
  const settled = await Promise.allSettled(files.map(extractFile));
  const fragments: SourceFragment[] = [];
  const failures: Array<{ file: UploadedFileRecord; error: string }> = [];
  settled.forEach((result, index) => {
    if (result.status === "fulfilled") fragments.push(...result.value);
    else failures.push({ file: files[index], error: result.reason instanceof Error ? result.reason.message : String(result.reason) });
  });
  return { fragments, failures };
}
