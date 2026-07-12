import { createHash } from "node:crypto";
import { z } from "zod";
import { IntakeSchema, type Intake } from "../schemas";

const MAX_TEXT = 500;
const MAX_LONG_TEXT = 2_000;
const MAX_LIST_ITEMS = 50;

const cleanedString = (max = MAX_TEXT) =>
  z.string().trim().min(1).max(max).refine((value) => !/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value), {
    message: "Control characters are not allowed",
  });

const optionalCleanedString = (max = MAX_TEXT) => z.union([cleanedString(max), z.literal("")]).optional();

function isValidDeadline(value: string): boolean {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    return date.getUTCFullYear() === Number(year)
      && date.getUTCMonth() === Number(month) - 1
      && date.getUTCDate() === Number(day);
  }
  return !Number.isNaN(Date.parse(value));
}

export const StrictIntakeSchema = IntakeSchema.extend({
  company_name: cleanedString(200).min(2),
  company_website: z.union([z.string().trim().url().max(500), z.literal("")]).optional(),
  companies_house: optionalCleanedString(50),
  sector: cleanedString(100).default("commercial_cleaning"),
  bid_deadline: cleanedString(100).refine(isValidDeadline, "Bid deadline must be a valid date"),
  portal: optionalCleanedString(200),
  service_area: cleanedString(MAX_LONG_TEXT),
  certifications: z.array(cleanedString(200)).max(MAX_LIST_ITEMS).default([]),
  turnover_band: optionalCleanedString(200),
  insurance_levels: optionalCleanedString(MAX_LONG_TEXT),
  mobilisation_days: optionalCleanedString(100),
  geographic_coverage: optionalCleanedString(MAX_LONG_TEXT),
  existing_policies: z.array(cleanedString(200)).max(MAX_LIST_ITEMS).default([]),
  contact_name: cleanedString(200),
  contact_email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
  contact_phone: optionalCleanedString(100),
}).strict();

export type StrictIntake = z.infer<typeof StrictIntakeSchema>;

export type IntakeParseResult =
  | { ok: true; data: StrictIntake; fingerprint: string }
  | { ok: false; issues: z.core.$ZodIssue[] };

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function normalizeList(value: unknown): unknown {
  const list = typeof value === "string" ? value.split(",") : value;
  if (!Array.isArray(list)) return list;
  return [...new Set(list.map((item) => (typeof item === "string" ? item.trim() : item)).filter(Boolean))];
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (isPlainRecord(value)) {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

export function intakeFingerprint(intake: Intake | StrictIntake): string {
  return createHash("sha256").update(JSON.stringify(canonicalize(intake))).digest("hex");
}

export function parseIntakePayload(payload: unknown): IntakeParseResult {
  const candidate = isPlainRecord(payload)
    ? {
        ...payload,
        certifications: normalizeList(payload.certifications ?? []),
        existing_policies: normalizeList(payload.existing_policies ?? []),
      }
    : payload;
  const parsed = StrictIntakeSchema.safeParse(candidate);
  if (!parsed.success) return { ok: false, issues: parsed.error.issues };
  return { ok: true, data: parsed.data, fingerprint: intakeFingerprint(parsed.data) };
}

export type IntakeTransition =
  | { allowed: true; action: "save" | "noop" | "save_and_rerun" }
  | { allowed: false; reason: string };

/**
 * Makes repeated questionnaire submissions idempotent and prevents a profile
 * from being silently changed after it has become a legal delivery record.
 */
export function validateIntakeTransition(params: {
  projectStatus: string;
  incomingFingerprint: string;
  storedFingerprint?: string | null;
}): IntakeTransition {
  const { projectStatus, incomingFingerprint, storedFingerprint } = params;
  if (["refunded", "deletion_requested"].includes(projectStatus)) {
    return { allowed: false, reason: `Intake cannot be changed while project is ${projectStatus}` };
  }
  if (storedFingerprint === incomingFingerprint) return { allowed: true, action: "noop" };
  if (["delivered", "submitted"].includes(projectStatus)) {
    return { allowed: false, reason: "Delivered or submitted projects require a new version" };
  }
  if (["processing", "review_required", "ready"].includes(projectStatus)) {
    return { allowed: true, action: "save_and_rerun" };
  }
  return { allowed: true, action: "save" };
}
