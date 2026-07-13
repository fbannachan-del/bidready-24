import fs from "node:fs/promises";
import path from "node:path";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import { PDFParse } from "pdf-parse";
import type { SourceFragment, UploadedFileRecord } from "./tender-types";

const MAX_FRAGMENT_CHARS = 3_500;

/**
 * Thrown when a whole tender pack yields no readable content. Carries the
 * per-file reasons so the API can return a 4xx with actionable detail instead
 * of an opaque 500. `code` lets route handlers branch without importing the class.
 */
export class ExtractionEmptyError extends Error {
  readonly code = "EXTRACTION_EMPTY";
  readonly failures: Array<{ id: string; name: string; error: string }>;
  constructor(failures: Array<{ id: string; name: string; error: string }>) {
    const detail = failures.map((f) => `${f.name}: ${f.error}`).join("; ");
    super(`No readable tender content was extracted${detail ? ` (${detail})` : ""}.`);
    this.name = "ExtractionEmptyError";
    this.failures = failures;
  }
}

/** Section/clause markers we attach to fragments for finer link-backs. */
const HEADING_RE = /(?:^|\n)[ \t>*_#.\-]*((?:Clause|Section|Part|Schedule|Annex|Appendix)\s+\d+[A-Za-z]?(?:\.\d+)*|§\s*\d+(?:\.\d+)*|Q\s?\d+)\b/gi;

function findHeadings(clean: string): Array<{ index: number; label: string }> {
  const out: Array<{ index: number; label: string }> = [];
  for (const match of clean.matchAll(HEADING_RE)) {
    const label = match[1].replace(/\s+/g, " ").replace(/§\s+/, "§").trim();
    const tokenIndex = (match.index ?? 0) + match[0].lastIndexOf(match[1]);
    out.push({ index: tokenIndex, label });
  }
  return out;
}

/** Nearest heading active for the fragment spanning [start, end). */
function headingFor(headings: Array<{ index: number; label: string }>, start: number, end: number): string | null {
  const inside = headings.find((h) => h.index >= start && h.index < end);
  if (inside) return inside.label;
  let label: string | null = null;
  for (const h of headings) {
    if (h.index < start) label = h.label;
    else break;
  }
  return label;
}

function splitText(file: UploadedFileRecord, text: string, locationPrefix: string): SourceFragment[] {
  const clean = text.replace(/\u0000/g, "").trim();
  if (!clean) return [];
  const headings = findHeadings(clean);
  const fragments: SourceFragment[] = [];
  let cursor = 0;
  let index = 1;
  while (cursor < clean.length) {
    let end = Math.min(cursor + MAX_FRAGMENT_CHARS, clean.length);
    if (end < clean.length) {
      const boundary = Math.max(clean.lastIndexOf("\n", end), clean.lastIndexOf(". ", end));
      if (boundary > cursor + 800) end = boundary + 1;
    }
    const heading = headingFor(headings, cursor, end);
    const suffix = heading ? ` · ${heading}` : index > 1 ? ` · part ${index}` : "";
    // Include the locationPrefix in the id. splitText is called once per PDF
    // page and once per XLSX sheet, each restarting `index` at 1 — so without
    // the prefix, page/sheet fragments collide (…:fragment:1) and violate the
    // fragments.id UNIQUE constraint during persistence.
    const prefixKey = locationPrefix.replace(/[^A-Za-z0-9.]+/g, "_");
    fragments.push({
      id: `${file.id}:${prefixKey}:fragment:${index}`,
      fileId: file.id,
      documentName: file.original_name,
      location: `${locationPrefix}${suffix}`,
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
    // Read the bytes ourselves and hand SheetJS a buffer. XLSX.readFile relies
    // on SheetJS's internal lazy require('fs'), which the server bundler can
    // rewrite/stub — making readFile throw "Cannot access file" in production.
    // XLSX.read(buffer) is bundler-independent.
    const bytes = await fs.readFile(file.stored_path);
    const workbook = XLSX.read(bytes, { type: "buffer", cellDates: true, cellFormula: true });
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
