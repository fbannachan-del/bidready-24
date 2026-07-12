import { getDb } from "./db";
import { addRequirement } from "./projects";
import fs from "node:fs";
import path from "node:path";

// Very basic text extraction for MVP (expand with real libs in Phase 2)
export async function extractTextFromFile(storedPath: string, originalName: string): Promise<{ text: string; locationHint: string }> {
  const ext = path.extname(originalName).toLowerCase();
  let text = "";

  try {
    if (ext === ".txt" || ext === ".md") {
      text = fs.readFileSync(storedPath, "utf8");
    } else if (ext === ".pdf") {
      // pdf-parse is heavy; for concierge MVP use placeholder
      text = `[PDF content from ${originalName} — full extraction in Phase 2]`;
    } else {
      text = `[Binary or Office content from ${originalName}]`;
    }
  } catch (e) {
    text = `Failed to read ${originalName}`;
  }

  return { text, locationHint: `file:${originalName}` };
}

// Create review-required items from tender text (deterministic, no invention of company facts)
export function buildStubAnalysis(projectId: string, tenderText: string) {
  const db = getDb();

  // Simple keyword-based requirements from the tender (synthetic or real keywords)
  const lines = tenderText.split(/\n|\./).filter(l => l.trim().length > 20);

  let count = 0;
  // Always add core known ones from common UK cleaning tenders
  addRequirement(projectId, {
    type: "mandatory",
    title: "Public Liability Insurance (£10m+)",
    normalized_requirement: "Supplier must maintain public liability insurance of not less than £10,000,000.",
    page_or_location: "Extracted / ITT",
    customer_status: "uncertain",
    confidence: 0.7,
    review_required: true,
    source: "extracted",
  });
  count++;

  if (/CHAS|SSIP|accreditation/i.test(tenderText)) {
    addRequirement(projectId, {
      type: "mandatory",
      title: "SSIP / CHAS accreditation",
      normalized_requirement: "Valid CHAS or equivalent SSIP accreditation is mandatory.",
      page_or_location: "ITT / Form",
      customer_status: "missing",
      confidence: 0.8,
      review_required: true,
      source: "extracted",
    });
    count++;
  }

  // Add a few more from text heuristics
  lines.slice(0, 4).forEach((line, i) => {
    if (count > 6) return;
    addRequirement(projectId, {
      type: i % 2 === 0 ? "mandatory" : "scored",
      title: line.trim().slice(0, 70) + (line.length > 70 ? "..." : ""),
      normalized_requirement: line.trim().slice(0, 140),
      page_or_location: `p.${i + 1}`,
      customer_status: "uncertain",
      confidence: 0.4,
      review_required: true,
      source: "stub",
    });
    count++;
  });

  db.prepare(`UPDATE projects SET status = 'review_required' WHERE id = ?`).run(projectId);
  return count;
}
