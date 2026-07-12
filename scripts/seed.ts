import { getDb } from "../lib/db";
import { createProject, addRequirement } from "../lib/projects";

const db = getDb();

console.log("Seeding demo project...");

const { id, secure_token } = createProject({ order_type: "preflight", amount_pence: 14900, company_name: "Demo Clean Co Ltd" });

db.prepare(`UPDATE projects SET status = 'review_required', tender_title = 'Borough Council Commercial Cleaning 2026', deadline = '2026-08-14' WHERE id = ?`).run(id);

// Add a couple of realistic requirements for the sample
addRequirement(id, {
  type: "mandatory",
  title: "£10m Public Liability",
  normalized_requirement: "Minimum £10 million public liability insurance required throughout the contract.",
  page_or_location: "ITT p.7",
  customer_status: "uncertain",
  confidence: 0.55,
  review_required: true,
  source: "stub",
});

addRequirement(id, {
  type: "mandatory",
  title: "CHAS Accreditation",
  normalized_requirement: "Valid CHAS or SSIP equivalent accreditation must be held or evidence of application.",
  page_or_location: "Form B & Instructions p.4",
  customer_status: "missing",
  confidence: 0.2,
  review_required: true,
  source: "stub",
});

console.log("Demo project created. Token:", secure_token);
console.log("Admin review at: /admin/projects/" + id);
console.log("Customer view: /project/" + secure_token);
