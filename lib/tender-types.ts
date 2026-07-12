export type SourceFragment = {
  id: string;
  fileId: string;
  documentName: string;
  location: string;
  text: string;
  charStart?: number;
  charEnd?: number;
};

export type TenderRequirement = {
  externalId: string;
  type: "mandatory" | "scored" | "attachment" | "instruction" | "deadline";
  title: string;
  normalizedRequirement: string;
  verbatimExcerpt: string;
  documentId: string;
  location: string;
  mandatory: boolean;
  evaluationWeight: number | null;
  responseLimit: string | null;
  confidence: number;
  status: "verified_met" | "probably_met" | "partially_met" | "not_met" | "probably_not_met" | "missing" | "conflicting_evidence" | "unable_to_determine" | "not_applicable" | "customer_verification_required";
  rationale: string;
  assumptions: string[];
  evidenceRefs: string[];
};

export type TenderQuestion = {
  externalId: string;
  identifier: string;
  section: string | null;
  text: string;
  wordLimit: number | null;
  weight: number | null;
  evaluationGuidance: string | null;
  documentId: string;
  location: string;
};

export type TenderDeadline = {
  externalId: string;
  label: string;
  value: string;
  description: string | null;
  documentId: string;
  location: string;
  confidence: number;
};

export type TenderAttachment = {
  externalId: string;
  name: string;
  format: string | null;
  signer: string | null;
  documentId: string;
  location: string;
  status: "matched" | "missing" | "uncertain";
};

export type TenderClarification = {
  externalId: string;
  question: string;
  context: string;
  documentId: string;
  location: string;
  risk: "low" | "medium" | "high";
  sendStatus: "proposed" | "queued" | "sent" | "not_required";
};

export type ResponseDraft = {
  externalId: string;
  questionId: string;
  title: string;
  content: string;
  wordCount: number;
  factualSupport: number;
  requirementCoverage: number;
  unsupportedClaims: string[];
  status: "approved" | "verification_required" | "blocked";
};

export type QaCheck = {
  code: string;
  label: string;
  status: "pass" | "warn" | "fail";
  details: string;
  blocking: boolean;
};

export type AutonomousAnalysis = {
  summary: string;
  requirements: TenderRequirement[];
  questions: TenderQuestion[];
  deadlines: TenderDeadline[];
  attachments: TenderAttachment[];
  clarifications: TenderClarification[];
  responses: ResponseDraft[];
  qa: QaCheck[];
  assumptions: string[];
  model: string;
  provider: "openai" | "deterministic";
};

export type UploadedFileRecord = {
  id: string;
  project_id: string;
  original_name: string;
  stored_path: string;
  mime_type: string;
  sha256: string;
};
