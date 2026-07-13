import { NextRequest, NextResponse } from "next/server";
import { resolveAccessibleProjectFromRequest } from "@/lib/project-access";
import { getAutonomySettings, upsertAutonomySettings, appendAuditEvent } from "@/lib/autonomy";
import { AutonomyMandateSchema, AutonomyPolicySchema, DEFAULT_MANDATE, DEFAULT_POLICY } from "@/lib/autonomy-policy";
import { validateAutonomyProfileTransition, type AutonomyProfile } from "@/lib/validation/pipeline-control";
import { z } from "zod";

const UiPayload = z.object({
  profile: z.enum(["assisted", "autonomous", "unattended"]),
  policy: z.record(z.string(), z.union([z.boolean(), z.string(), z.number(), z.null()])).default({}),
  mandate: z.record(z.string(), z.union([z.boolean(), z.string(), z.number(), z.null()])).default({}),
}).strict();

type StoredSettings = ReturnType<typeof getAutonomySettings>;

function toUi(settings: StoredSettings, companyName = "") {
  const policy = AutonomyPolicySchema.parse({ ...DEFAULT_POLICY, ...(settings?.policy ?? {}) });
  const mandate = AutonomyMandateSchema.parse({ ...DEFAULT_MANDATE, ...(settings?.mandate ?? {}) });
  return {
    profile: settings?.profile ?? "unattended",
    receiver_acknowledged_at: settings?.receiver_acknowledged_at ?? null,
    policy: {
      analyse: policy.analyseAutomatically, decide_compliance: policy.createComplianceDecisions,
      use_secondary_evidence: policy.useSecondaryEvidence !== "never", send_clarifications: policy.sendClarifications,
      create_commitments: mandate.canCommitOperations, price_tender: policy.priceTender,
      accept_contract_terms: policy.acceptTermsWithinPlaybook, apply_signature: policy.applySignatureWithinMandate,
      complete_portal: policy.completePortal, submit_bid: policy.submitBid, automatic_no_bid: policy.automaticNoBid,
      conservative_conflicts: policy.makeConservativeAssumptions, correction_window_hours: "2",
      minimum_margin_percent: String(policy.minimumMarginPercent),
    },
    mandate: {
      legal_entity: mandate.legalEntity || companyName, authorised_name: mandate.authorisedBy,
      authorised_role: typeof settings?.mandate?.authorisedRole === "string" ? settings.mandate.authorisedRole : "",
      maximum_contract_value: policy.maximumContractValue == null ? "" : String(policy.maximumContractValue),
      expires_at: mandate.validUntil ?? "", allow_signing: mandate.canApplySignature,
      allow_submission: mandate.canSubmit, receiver_acknowledged: mandate.acceptedReceiverResponsibility,
    },
  };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const project = resolveAccessibleProjectFromRequest(req, token);
  if (!project) return NextResponse.json({ error: "Invalid or expired project link" }, { status: 404 });
  return NextResponse.json(toUi(getAutonomySettings(project.id), project.company_name ?? ""));
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const project = resolveAccessibleProjectFromRequest(req, token);
  if (!project) return NextResponse.json({ error: "Invalid or expired project link" }, { status: 404 });
  const parsed = UiPayload.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid autonomy settings", issues: parsed.error.issues }, { status: 400 });
  const current = getAutonomySettings(project.id);
  if (current && !validateAutonomyProfileTransition(current.profile as AutonomyProfile, parsed.data.profile)) {
    return NextResponse.json({ error: `Change from ${current.profile} to ${parsed.data.profile} through the adjacent profile first.` }, { status: 409 });
  }

  const uiPolicy = parsed.data.policy;
  const uiMandate = parsed.data.mandate;
  const acknowledged = uiMandate.receiver_acknowledged === true;
  const legalEntity = String(uiMandate.legal_entity ?? "").trim();
  const authorisedBy = String(uiMandate.authorised_name ?? "").trim();
  const authorisedRole = String(uiMandate.authorised_role ?? "").trim();
  if (parsed.data.profile === "unattended" && (!acknowledged || !legalEntity || !authorisedBy || !authorisedRole)) {
    return NextResponse.json({ error: "Unattended mode requires the legal entity, authorised person, role and receiver acknowledgement." }, { status: 400 });
  }
  const validUntil = String(uiMandate.expires_at ?? "").trim() || null;
  if (validUntil && Number.isNaN(Date.parse(validUntil))) return NextResponse.json({ error: "Mandate expiry date is invalid." }, { status: 400 });
  const maxValueText = String(uiMandate.maximum_contract_value ?? "").replace(/[£,\s]/g, "");
  const maxValue = maxValueText ? Number(maxValueText) : null;
  if (maxValue !== null && (!Number.isFinite(maxValue) || maxValue < 0)) return NextResponse.json({ error: "Maximum contract value must be a positive number." }, { status: 400 });

  const policy = AutonomyPolicySchema.parse({
    analyseAutomatically: uiPolicy.analyse !== false, createComplianceDecisions: uiPolicy.decide_compliance !== false,
    useSecondaryEvidence: uiPolicy.use_secondary_evidence === false ? "never" : "warn",
    makeConservativeAssumptions: uiPolicy.conservative_conflicts !== false,
    sendClarifications: uiPolicy.send_clarifications !== false, priceTender: uiPolicy.price_tender === true,
    acceptTermsWithinPlaybook: uiPolicy.accept_contract_terms === true,
    applySignatureWithinMandate: uiPolicy.apply_signature === true,
    completePortal: uiPolicy.complete_portal === true, submitBid: uiPolicy.submit_bid === true,
    automaticNoBid: uiPolicy.automatic_no_bid !== false,
    minimumMarginPercent: Number(uiPolicy.minimum_margin_percent ?? 15), maximumContractValue: maxValue,
  });
  const mandate = AutonomyMandateSchema.parse({
    legalEntity, authorisedBy, authorisedEmail: "", canSendClarifications: uiPolicy.send_clarifications === true,
    canCommitOperations: uiPolicy.create_commitments === true, canAcceptContractTerms: uiPolicy.accept_contract_terms === true,
    canApplySignature: uiMandate.allow_signing === true && uiPolicy.apply_signature === true,
    canSubmit: uiMandate.allow_submission === true && uiPolicy.submit_bid === true,
    validUntil, acceptedReceiverResponsibility: acknowledged, authorisedRole,
  });
  const saved = upsertAutonomySettings(project.id, {
    profile: parsed.data.profile, policy, mandate: { ...mandate, authorisedRole },
    receiverAcknowledgedAt: acknowledged ? new Date().toISOString() : null,
    receiverAcknowledgedBy: acknowledged ? authorisedBy : null,
  });
  appendAuditEvent({ projectId: project.id, actor: authorisedBy || "receiver", action: "autonomy_settings_updated", entity: "autonomy_settings", details: { profile: parsed.data.profile, policyVersion: saved?.policy_version, mandateVersion: saved?.mandate_version } });
  return NextResponse.json(toUi(saved, project.company_name ?? ""));
}
