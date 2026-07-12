import { z } from "zod";
import type { AutonomousAnalysis, SourceFragment } from "./tender-types";

const AiItem = z.object({
  kind: z.enum(["requirement", "question", "deadline", "attachment", "clarification"]),
  title: z.string(),
  normalized_text: z.string(),
  verbatim_excerpt: z.string(),
  document_id: z.string(),
  location: z.string(),
  mandatory: z.boolean(),
  weight: z.number().nullable(),
  response_limit: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});

const AiAnalysis = z.object({ summary: z.string(), items: z.array(AiItem), assumptions: z.array(z.string()) });

const jsonSchema = {
  type: "object", additionalProperties: false, required: ["summary", "items", "assumptions"],
  properties: {
    summary: { type: "string" },
    items: { type: "array", items: { type: "object", additionalProperties: false, required: ["kind", "title", "normalized_text", "verbatim_excerpt", "document_id", "location", "mandatory", "weight", "response_limit", "confidence"], properties: {
      kind: { type: "string", enum: ["requirement", "question", "deadline", "attachment", "clarification"] }, title: { type: "string" }, normalized_text: { type: "string" }, verbatim_excerpt: { type: "string" }, document_id: { type: "string" }, location: { type: "string" }, mandatory: { type: "boolean" }, weight: { type: ["number", "null"] }, response_limit: { type: ["string", "null"] }, confidence: { type: "number", minimum: 0, maximum: 1 },
    } } },
    assumptions: { type: "array", items: { type: "string" } },
  },
} as const;

type OpenAIResponse = { output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };

function outputText(response: OpenAIResponse): string | null {
  for (const item of response?.output ?? []) for (const content of item?.content ?? []) if (content?.type === "output_text" && typeof content.text === "string") return content.text;
  return null;
}

export async function analyseWithOpenAI(fragments: SourceFragment[], base: AutonomousAnalysis): Promise<AutonomousAnalysis> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || process.env.ENABLE_REAL_AI !== "true") return base;
  const model = process.env.OPENAI_MODEL || "gpt-5.6";
  const source = fragments.slice(0, 80).map((fragment) => `SOURCE document_id=${fragment.fileId} location=${fragment.location}\n${fragment.text}`).join("\n\n---\n\n");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model, store: false,
      reasoning: { effort: "medium" },
      instructions: "Extract UK public-sector tender requirements conservatively. Every item must reproduce an exact source excerpt and the supplied document_id and location. Do not create customer facts. If the text does not support an item, omit it. Return structured JSON only.",
      input: source,
      text: { format: { type: "json_schema", name: "tender_preflight", strict: true, schema: jsonSchema } },
    }),
  });
  if (!response.ok) throw new Error(`Provider analysis failed with status ${response.status}`);
  const raw = outputText(await response.json() as OpenAIResponse);
  if (!raw) throw new Error("OpenAI analysis returned no structured output");
  const parsed = AiAnalysis.parse(JSON.parse(raw));
  const sourceIndex = new Map(fragments.map((fragment) => [`${fragment.fileId}|${fragment.location}`, fragment]));
  const valid = parsed.items.filter((item) => {
    const fragment = sourceIndex.get(`${item.document_id}|${item.location}`);
    return fragment && fragment.text.toLowerCase().includes(item.verbatim_excerpt.trim().toLowerCase());
  });
  if (!valid.length) return { ...base, assumptions: [...base.assumptions, "AI extraction produced no independently verifiable citations; deterministic output was retained."] };

  // The deterministic pass remains the authority for evidence decisions. AI only contributes cited items that were missed.
  const known = new Set(base.requirements.map((item) => item.verbatimExcerpt.toLowerCase()));
  for (const item of valid.filter((candidate) => candidate.kind === "requirement")) {
    if (known.has(item.verbatim_excerpt.toLowerCase())) continue;
    base.requirements.push({
      externalId: `ai_${base.requirements.length + 1}`, type: item.mandatory ? "mandatory" : "instruction", title: item.title,
      normalizedRequirement: item.normalized_text, verbatimExcerpt: item.verbatim_excerpt, documentId: item.document_id, location: item.location,
      mandatory: item.mandatory, evaluationWeight: item.weight, responseLimit: item.response_limit, confidence: item.confidence,
      status: "unable_to_determine", rationale: "No verified customer evidence was matched to this AI-extracted requirement.", assumptions: [], evidenceRefs: [],
    });
  }
  for (const item of valid.filter((candidate) => candidate.kind === "question")) {
    if (base.questions.some((question) => question.text.toLowerCase() === item.normalized_text.toLowerCase())) continue;
    const identifier = item.title.match(/Q\d+(?:\.\d+)?/i)?.[0]?.toUpperCase() ?? `Q${base.questions.length + 1}`;
    base.questions.push({ externalId: `ai_question_${base.questions.length + 1}`, identifier, section: null, text: item.normalized_text, wordLimit: item.response_limit ? Number(item.response_limit.match(/\d[\d,]*/)?.[0].replace(/,/g, "")) || null : null, weight: item.weight, evaluationGuidance: null, documentId: item.document_id, location: item.location });
  }
  for (const item of valid.filter((candidate) => candidate.kind === "deadline")) {
    if (base.deadlines.some((deadline) => deadline.value.toLowerCase() === item.normalized_text.toLowerCase())) continue;
    base.deadlines.push({ externalId: `ai_deadline_${base.deadlines.length + 1}`, label: item.title, value: item.normalized_text, description: null, documentId: item.document_id, location: item.location, confidence: item.confidence });
  }
  for (const item of valid.filter((candidate) => candidate.kind === "attachment")) {
    if (base.attachments.some((attachment) => attachment.name.toLowerCase() === item.normalized_text.toLowerCase())) continue;
    base.attachments.push({ externalId: `ai_attachment_${base.attachments.length + 1}`, name: item.normalized_text, format: null, signer: /sign/i.test(item.normalized_text) ? "Authorised signatory" : null, documentId: item.document_id, location: item.location, status: "missing" });
  }
  for (const item of valid.filter((candidate) => candidate.kind === "clarification")) {
    base.clarifications.push({ externalId: `ai_clarification_${base.clarifications.length + 1}`, question: item.normalized_text, context: item.title, documentId: item.document_id, location: item.location, risk: item.confidence > 0.8 ? "high" : "medium", sendStatus: "proposed" });
  }
  return { ...base, summary: parsed.summary, assumptions: [...base.assumptions, ...parsed.assumptions], model, provider: "openai" };
}
