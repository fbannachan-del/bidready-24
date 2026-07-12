import { z } from "zod";
import type { AutonomousAnalysis } from "./tender-types";

export const AutonomyProfileSchema = z.enum(["assisted", "autonomous", "unattended"]);

export const AutonomyPolicySchema = z.object({
  analyseAutomatically: z.boolean().default(true),
  createComplianceDecisions: z.boolean().default(true),
  useSecondaryEvidence: z.enum(["never", "warn", "allow"]).default("warn"),
  makeConservativeAssumptions: z.boolean().default(true),
  sendClarifications: z.boolean().default(true),
  draftResponses: z.boolean().default(true),
  priceTender: z.boolean().default(false),
  acceptTermsWithinPlaybook: z.boolean().default(false),
  applySignatureWithinMandate: z.boolean().default(false),
  completePortal: z.boolean().default(false),
  submitBid: z.boolean().default(false),
  automaticNoBid: z.boolean().default(true),
  minimumConfidence: z.number().min(0).max(1).default(0.72),
  minimumMarginPercent: z.number().min(-100).max(100).default(15),
  maximumContractValue: z.number().nonnegative().nullable().default(null),
  submissionSafetyHours: z.number().int().min(1).max(168).default(24),
});

export const AutonomyMandateSchema = z.object({
  legalEntity: z.string().max(200).default(""),
  authorisedBy: z.string().max(200).default(""),
  authorisedRole: z.string().max(200).default(""),
  authorisedEmail: z.string().email().or(z.literal("")).default(""),
  canSendClarifications: z.boolean().default(false),
  canCommitOperations: z.boolean().default(false),
  canAcceptContractTerms: z.boolean().default(false),
  canApplySignature: z.boolean().default(false),
  canSubmit: z.boolean().default(false),
  validUntil: z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Mandate expiry must be a valid date").nullable().default(null),
  acceptedReceiverResponsibility: z.boolean().default(false),
});

const POLICY_DEFAULTS = AutonomyPolicySchema.parse({});
const MANDATE_DEFAULTS = AutonomyMandateSchema.parse({});

export const AutonomySettingsInputSchema = z.object({
  profile: AutonomyProfileSchema.default("unattended"),
  policy: AutonomyPolicySchema.default(POLICY_DEFAULTS),
  mandate: AutonomyMandateSchema.default(MANDATE_DEFAULTS),
  acknowledgedBy: z.string().max(200).optional(),
});

export type AutonomyPolicy = z.infer<typeof AutonomyPolicySchema>;
export type AutonomyMandate = z.infer<typeof AutonomyMandateSchema>;

export const DEFAULT_POLICY: AutonomyPolicy = AutonomyPolicySchema.parse({
  analyseAutomatically: true,
  createComplianceDecisions: true,
  useSecondaryEvidence: "warn",
  makeConservativeAssumptions: true,
  sendClarifications: true,
  draftResponses: true,
  automaticNoBid: true,
});

export const DEFAULT_MANDATE: AutonomyMandate = MANDATE_DEFAULTS;

export type GoNoGoDecision = {
  decision: "proceed" | "proceed_with_risks" | "clarify_first" | "no_bid";
  score: number;
  hardStops: string[];
  risks: string[];
  explanation: string;
};

export function decideGoNoGo(analysis: AutonomousAnalysis, policy: AutonomyPolicy): GoNoGoDecision {
  const hardStops: string[] = [];
  const risks: string[] = [];
  const mandatory = analysis.requirements.filter((item) => item.mandatory);
  const notMet = mandatory.filter((item) => item.status === "not_met");
  const missing = mandatory.filter((item) => item.status === "missing");
  const unresolved = mandatory.filter((item) => ["unable_to_determine", "conflicting_evidence", "customer_verification_required"].includes(item.status));

  notMet.forEach((item) => hardStops.push(`Mandatory requirement assessed not met: ${item.title}`));
  missing.forEach((item) => risks.push(`Evidence missing: ${item.title}`));
  unresolved.forEach((item) => risks.push(`Verification required: ${item.title}`));
  analysis.qa.filter((check) => check.status === "fail" && check.blocking).forEach((check) => hardStops.push(check.details));

  const penalty = notMet.length * 35 + missing.length * 15 + unresolved.length * 7 + analysis.qa.filter((check) => check.status === "warn").length * 3;
  const score = Math.max(0, Math.min(100, 100 - penalty));
  let decision: GoNoGoDecision["decision"] = "proceed";
  if (hardStops.length && policy.automaticNoBid) decision = "no_bid";
  else if (analysis.clarifications.some((item) => item.risk === "high")) decision = "clarify_first";
  else if (risks.length || hardStops.length) decision = "proceed_with_risks";

  return {
    decision, score, hardStops, risks,
    explanation: decision === "no_bid"
      ? "The configured policy stops on failed mandatory requirements or blocking validation."
      : decision === "clarify_first"
        ? "A material ambiguity should be resolved before commitments are made."
        : decision === "proceed_with_risks"
          ? "No configured hard stop was triggered, but evidence or verification risks remain."
          : "No configured hard stop or material evidence risk was identified.",
  };
}

export function canPerformExternalAction(
  action: "clarify" | "commit" | "accept_terms" | "sign" | "submit",
  policy: AutonomyPolicy,
  mandate: AutonomyMandate,
) {
  if (!mandate.acceptedReceiverResponsibility) return { allowed: false, reason: "Receiver responsibility has not been acknowledged." };
  if (!mandate.legalEntity.trim() || !mandate.authorisedBy.trim() || !mandate.authorisedRole.trim()) return { allowed: false, reason: "The delegated mandate does not identify the legal entity, authorised person and role." };
  if (mandate.validUntil && new Date(mandate.validUntil).getTime() < Date.now()) return { allowed: false, reason: "The delegated mandate has expired." };
  const checks = {
    clarify: policy.sendClarifications && mandate.canSendClarifications,
    commit: mandate.canCommitOperations,
    accept_terms: policy.acceptTermsWithinPlaybook && mandate.canAcceptContractTerms,
    sign: policy.applySignatureWithinMandate && mandate.canApplySignature,
    submit: policy.submitBid && mandate.canSubmit,
  };
  return checks[action] ? { allowed: true, reason: "Permitted by active policy and delegated mandate." } : { allowed: false, reason: "The active policy or delegated mandate does not authorise this action." };
}
