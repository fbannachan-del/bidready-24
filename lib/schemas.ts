import { z } from "zod";

// Versioned requirement schema (v1 as per spec)
export const RequirementSchema = z.object({
  id: z.string(),
  type: z.enum(["mandatory", "scored", "attachment", "instruction", "deadline"]),
  title: z.string(),
  verbatim_excerpt: z.string().nullable().optional(),
  normalized_requirement: z.string(),
  document_id: z.string().nullable().optional(),
  page_or_location: z.string().nullable().optional(),
  mandatory: z.boolean().default(true),
  evaluation_weight: z.number().nullable().optional(),
  response_limit: z.string().nullable().optional(),
  customer_status: z.enum(["met", "not_met", "uncertain", "missing"]).default("uncertain"),
  matched_evidence_ids: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).default(0),
  review_required: z.boolean().default(true),
  notes: z.array(z.string()).default([]),
  source: z.enum(["extracted", "admin", "stub"]).default("stub"),
});

export type Requirement = z.infer<typeof RequirementSchema>;

// Project status
export const ProjectStatusSchema = z.enum([
  "created", "paid", "awaiting_intake", "awaiting_files", "processing",
  "review_required", "ready", "delivered", "failed", "refunded", "deletion_requested"
]);

export const OrderTypeSchema = z.enum(["preflight", "complete"]);

// Minimal intake
export const IntakeSchema = z.object({
  company_name: z.string().min(2),
  company_website: z.string().url().optional().or(z.literal("")),
  companies_house: z.string().optional(),
  sector: z.string().default("commercial_cleaning"),
  bid_deadline: z.string(),
  portal: z.string().optional(),
  service_area: z.string(),
  certifications: z.array(z.string()).default([]),
  turnover_band: z.string().optional(),
  insurance_levels: z.string().optional(),
  mobilisation_days: z.string().optional(),
  geographic_coverage: z.string().optional(),
  existing_policies: z.array(z.string()).default([]),
  contact_name: z.string(),
  contact_email: z.string().email(),
  contact_phone: z.string().optional(),
  consent: z.boolean().refine(v => v === true, "Consent required"),
});

export type Intake = z.infer<typeof IntakeSchema>;

export const ProjectSchema = z.object({
  id: z.string(),
  order_type: OrderTypeSchema,
  amount_pence: z.number(),
  status: ProjectStatusSchema,
  secure_token: z.string(),
  company_name: z.string().nullable(),
  tender_title: z.string().nullable(),
  deadline: z.string().nullable(),
});

export type Project = z.infer<typeof ProjectSchema>;

// For exports
export const ComplianceMatrixRow = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  source: z.string().nullable(),
  status: z.string(),
  notes: z.string().optional(),
});
