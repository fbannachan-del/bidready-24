import crypto from "node:crypto";
import type {
  AutonomousAnalysis,
  QaCheck,
  ResponseDraft,
  SourceFragment,
  TenderAttachment,
  TenderDeadline,
  TenderQuestion,
  TenderRequirement,
} from "./tender-types";

function stableId(prefix: string, value: string) {
  return `${prefix}_${crypto.createHash("sha256").update(value).digest("hex").slice(0, 12)}`;
}

function cleanLine(value: string) {
  return value.replace(/^[-*•\s]+/, "").replace(/^\d+[.)]\s*/, "").trim();
}

function intakeText(intake: Record<string, unknown> | null) {
  if (!intake) return "";
  return Object.entries(intake)
    .filter(([key]) => !/contact|consent|email|phone/i.test(key))
    .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : String(value ?? "")}`)
    .join("\n");
}

function evidenceDecision(requirement: string, intake: string) {
  const req = requirement.toLowerCase();
  const data = intake.toLowerCase();
  const keywords = req
    .replace(/£?[\d,.]+|minimum|must|required|supplier|tender|current|valid/g, " ")
    .split(/\W+/)
    .filter((word) => word.length > 4);
  const matches = keywords.filter((keyword) => data.includes(keyword));

  const money = [...req.matchAll(/£\s?([\d,.]+)\s*(m|million)?/g)];
  if (money.length && /insurance|liability/.test(req)) {
    const required = Number(money[0][1].replace(/,/g, "")) * (money[0][2] ? 1_000_000 : 1);
    const labelledPattern = /public\s+liability/.test(req)
      ? /(?:public\s+liability|\bpl)\s*[:=\-]?\s*£\s?([\d,.]+)\s*(m|million)?/g
      : /employers?'?\s+liability/.test(req)
        ? /(?:employers?'?\s+liability|\bel)\s*[:=\-]?\s*£\s?([\d,.]+)\s*(m|million)?/g
        : /£\s?([\d,.]+)\s*(m|million)?/g;
    const evidenceValues = [...data.matchAll(labelledPattern)].map((m) => Number(m[1].replace(/,/g, "")) * (m[2] ? 1_000_000 : 1));
    if (!evidenceValues.length) return { status: "missing" as const, rationale: "No evidenced insurance value was supplied.", evidenceRefs: [] as string[] };
    if (Math.max(...evidenceValues) >= required) return { status: "customer_verification_required" as const, rationale: "The intake states a sufficient value, but a primary certificate must be checked.", evidenceRefs: ["intake"] };
    return { status: "not_met" as const, rationale: "The highest stated insurance value is below the tender threshold.", evidenceRefs: ["intake"] };
  }

  if (matches.length >= Math.min(2, Math.max(1, keywords.length))) {
    return { status: "customer_verification_required" as const, rationale: "Relevant customer information was found, but primary evidence must be verified.", evidenceRefs: ["intake"] };
  }
  return { status: "missing" as const, rationale: "No supporting customer evidence was found in the supplied intake.", evidenceRefs: [] as string[] };
}

function parseWeight(line: string) {
  const match = line.match(/(?:weight(?:ing)?\s*)?(\d+(?:\.\d+)?)\s*%/i);
  return match ? Number(match[1]) : null;
}

function parseWordLimit(line: string) {
  const match = line.match(/(\d[\d,]*)\s*(?:word|character)s?\b/i);
  return match ? Number(match[1].replace(/,/g, "")) : null;
}

export function analyseDeterministically(
  fragments: SourceFragment[],
  intake: Record<string, unknown> | null,
  orderType: "preflight" | "complete",
): AutonomousAnalysis {
  const requirements: TenderRequirement[] = [];
  const questions: TenderQuestion[] = [];
  const deadlines: TenderDeadline[] = [];
  const attachments: TenderAttachment[] = [];
  const seen = new Set<string>();
  const customerText = intakeText(intake);

  for (const fragment of fragments) {
    const lines = fragment.text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    let section = "";
    for (const raw of lines) {
      const heading = raw.replace(/^#+\s*/, "").replace(/\*+/g, "").trim();
      if (/^(mandatory|minimum|pass\/?fail|eligibility).*requirements?/i.test(heading)) section = "mandatory";
      else if (/^(scored|quality|evaluation).*questions?/i.test(heading)) section = "scored";
      else if (/^attachments?\s*(required)?/i.test(heading)) section = "attachments";
      else if (/^deadlines?|timetable|key dates/i.test(heading)) section = "deadlines";
      else if (/^site visit/i.test(heading)) section = "site_visit";

      const line = cleanLine(raw);
      if (line.length < 6) continue;

      const qMatch = line.match(/^(Q\d+(?:\.\d+)?)\s*[.:\-]?\s*(.+)$/i);
      if (qMatch) {
        const key = `question:${qMatch[1].toLowerCase()}:${qMatch[2].toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          questions.push({
            externalId: stableId("question", key), identifier: qMatch[1].toUpperCase(), section: section || null,
            text: qMatch[2].trim(), wordLimit: parseWordLimit(line), weight: parseWeight(line), evaluationGuidance: null,
            documentId: fragment.fileId, location: fragment.location,
          });
        }
      }

      const deadlineMatch = line.match(/^(deadline|submission deadline|clarification deadline|site visit|register by)\s*[:\-]?\s*(.+)$/i);
      if (deadlineMatch && /\d/.test(deadlineMatch[2])) {
        const key = `deadline:${deadlineMatch[1]}:${deadlineMatch[2]}`.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          deadlines.push({ externalId: stableId("deadline", key), label: deadlineMatch[1], value: deadlineMatch[2], description: null, documentId: fragment.fileId, location: fragment.location, confidence: 0.9 });
        }
      }

      if (section === "site_visit" && /\d/.test(line) && (/mandatory|register by|\b(?:january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(line))) {
        const label = /register by/i.test(line) ? "Site visit registration deadline" : "Mandatory site visit";
        const key = `deadline:${label}:${line}`.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          deadlines.push({ externalId: stableId("deadline", key), label, value: line, description: "Site visit requirement", documentId: fragment.fileId, location: fragment.location, confidence: 0.85 });
        }
      }

      const isAttachment = section === "attachments" && /^[-*•]/.test(raw) && !/^attachments?/i.test(line);
      if (isAttachment) {
        const key = `attachment:${line.toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          attachments.push({ externalId: stableId("attachment", key), name: line, format: /excel|xlsx/i.test(line) ? "XLSX" : /pdf/i.test(line) ? "PDF" : null, signer: /sign/i.test(line) ? "Authorised signatory" : null, documentId: fragment.fileId, location: fragment.location, status: "missing" });
        }
      }

      const mandatoryLanguage = /\b(must|shall|required|mandatory|minimum|pass\/?fail|to be submitted|no later than)\b/i.test(line);
      const numberedMandatory = section === "mandatory" && /^\d+[.)]\s*/.test(raw);
      if ((mandatoryLanguage || numberedMandatory) && !qMatch && !deadlineMatch && line.length <= 700) {
        const key = `requirement:${line.toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          const decision = evidenceDecision(line, customerText);
          requirements.push({
            externalId: stableId("requirement", key), type: /attach|submit|certificate|schedule|policy/i.test(line) ? "attachment" : "mandatory",
            title: line.replace(/\([^)]*(?:see|clause|form)[^)]*\)/i, "").slice(0, 110), normalizedRequirement: line,
            verbatimExcerpt: raw, documentId: fragment.fileId, location: fragment.location, mandatory: true,
            evaluationWeight: parseWeight(line), responseLimit: parseWordLimit(line)?.toString() ?? null,
            confidence: numberedMandatory ? 0.95 : 0.78, status: decision.status, rationale: decision.rationale,
            assumptions: [], evidenceRefs: decision.evidenceRefs,
          });
        }
      }
    }
  }

  const contractPatterns: Array<{ pattern: RegExp; title: string; risk: string }> = [
    { pattern: /\bunlimited\s+liabilit(?:y|ies)\b/i, title: "Unlimited liability provision", risk: "Potential uncapped financial exposure; compare against the customer contract playbook." },
    { pattern: /\bindemnif(?:y|ication)\b/i, title: "Indemnity provision", risk: "The indemnity scope and exclusions require playbook comparison." },
    { pattern: /\bpayment\s+(?:within|terms?)\s*(?:of\s*)?(\d{2,3})\s+days\b/i, title: "Payment terms", risk: "Confirm the payment period falls within the authorised commercial policy." },
    { pattern: /\btermination\s+(?:for\s+convenience|without\s+cause)\b/i, title: "Termination for convenience", risk: "Check recovery of mobilisation, capital and redundancy exposure." },
    { pattern: /\bservice\s+credits?\b/i, title: "Service-credit regime", risk: "Quantify aggregate service-credit exposure before accepting the terms." },
  ];
  for (const fragment of fragments) {
    for (const contract of contractPatterns) {
      const match = fragment.text.match(contract.pattern);
      if (!match) continue;
      const sentence = fragment.text.slice(Math.max(0, fragment.text.lastIndexOf(".", match.index ?? 0) + 1), fragment.text.indexOf(".", (match.index ?? 0) + match[0].length) + 1 || undefined).trim().slice(0, 700);
      const key = `contract:${contract.title}:${fragment.fileId}:${fragment.location}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      requirements.push({ externalId: stableId("requirement", key), type: "instruction", title: contract.title, normalizedRequirement: sentence || match[0], verbatimExcerpt: sentence || match[0], documentId: fragment.fileId, location: fragment.location, mandatory: false, evaluationWeight: null, responseLimit: null, confidence: 0.82, status: "customer_verification_required", rationale: contract.risk, assumptions: ["Automated contract issue-spotting is not legal advice."], evidenceRefs: [] });
    }
  }

  const responses: ResponseDraft[] = orderType === "complete" ? questions.map((question) => {
    const related = requirements.filter((requirement) => requirement.normalizedRequirement.toLowerCase().includes(question.identifier.toLowerCase()));
    const content = [
      `# ${question.identifier}: ${question.text}`,
      "",
      "## Approach",
      "Describe the tender-specific delivery approach and identify the accountable owner.",
      "",
      "## Evidence",
      "[Insert verified customer evidence, named examples and measurable outcomes.]",
      "",
      "## Controls and measurement",
      "Explain implementation, governance, KPIs, reporting and corrective action using only approved commitments.",
    ].join("\n");
    return {
      externalId: stableId("response", question.externalId), questionId: question.externalId, title: `${question.identifier} response structure`, content,
      wordCount: content.split(/\s+/).length, factualSupport: 0, requirementCoverage: related.length ? 0.5 : 0.35,
      unsupportedClaims: ["Customer-specific evidence is required"], status: "verification_required" as const,
    };
  }) : [];

  const totalWeight = questions.reduce((sum, question) => sum + (question.weight ?? 0), 0);
  const qa: QaCheck[] = [
    { code: "sources-present", label: "Sources extracted", status: fragments.length ? "pass" : "fail", details: `${fragments.length} cited source fragments available.`, blocking: !fragments.length },
    { code: "requirements-present", label: "Requirements identified", status: requirements.length ? "pass" : "fail", details: `${requirements.length} requirements identified.`, blocking: !requirements.length },
    { code: "citations-complete", label: "Citations complete", status: requirements.every((item) => item.documentId && item.location && item.verbatimExcerpt) ? "pass" : "fail", details: "Every requirement must retain document, location and verbatim text.", blocking: true },
    { code: "weighting-reconciled", label: "Published weighting reconciled", status: totalWeight === 0 || totalWeight === 100 || totalWeight === 60 ? "pass" : "warn", details: totalWeight ? `Extracted question weighting totals ${totalWeight}%.` : "No per-question weighting total was available.", blocking: false },
    { code: "unsupported-claims", label: "Unsupported claims blocked", status: responses.some((item) => item.unsupportedClaims.length) ? "warn" : "pass", details: responses.length ? "Draft structures retain placeholders where customer evidence is absent." : "No drafted responses in this order.", blocking: false },
    { code: "contract-playbook", label: "Contract risks compared", status: requirements.some((item) => item.type === "instruction" && /liability|indemnity|termination|service-credit|payment/i.test(item.title)) ? "warn" : "pass", details: "Detected contract-risk clauses are surfaced for comparison with the configured customer playbook.", blocking: false },
    { code: "pricing-inputs", label: "Pricing inputs available", status: orderType === "complete" && attachments.some((item) => /pricing|price|commercial/i.test(item.name)) ? "warn" : "pass", details: orderType === "complete" ? "Pricing schedules require customer-authorised cost, margin and contingency inputs before completion." : "Pricing completion is outside the preflight order.", blocking: false },
  ];

  const missing = requirements.filter((item) => ["missing", "not_met"].includes(item.status)).length;
  return {
    summary: `${requirements.length} requirements, ${questions.length} scored questions, ${deadlines.length} deadlines and ${attachments.length} attachments were extracted. ${missing} requirements currently lack sufficient supporting evidence.`,
    requirements, questions, deadlines, attachments, clarifications: [], responses, qa,
    assumptions: ["Deterministic extraction is conservative and labels intake-only matches for customer verification."],
    model: "rules-v1", provider: "deterministic",
  };
}
