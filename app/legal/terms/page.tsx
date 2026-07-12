import type { Metadata } from "next";
import { LegalNotice } from "@/components/site/LegalNotice";

export const metadata: Metadata = { title: "Service terms", robots: { index: false, follow: true } };

export default function Terms() {
  return <LegalNotice title="Service terms">
    <p>These working terms describe the intended basis on which a business customer purchases and uses BIDREADY24 for one tender opportunity. They are not yet a solicitor-approved contract.</p>
    <h2>1. The service</h2><p>BIDREADY24 extracts and structures information from tender documents and customer-supplied evidence. Depending on the purchased pack, output may include requirements, questions, deadlines, attachments, evidence gaps, clarification questions, action plans, response structures and machine-produced drafts.</p>
    <h2>2. Customer responsibility</h2><ul><li>You must have the right to upload and process the tender pack and company evidence.</li><li>You remain responsible for checking the original tender, every output used and the final submission.</li><li>You must keep project links private and tell BIDREADY24 promptly if one is exposed.</li><li>You must not treat machine output as legal, procurement, financial or other professional advice.</li><li>You must ensure anyone configuring a mandate or buyer-facing action is authorised to do so for the bidding organisation.</li></ul>
    <h2>3. Zero-invention rule</h2><p>BIDREADY24 is designed to keep unsupported customer facts missing, uncertain or not met. It must not be used to create false accreditations, insurance, experience, references, policies, performance results or other misleading bid evidence. Automated controls reduce this risk but do not remove the customer’s duty to verify output.</p>
    <h2>4. Autonomous operation</h2><p>Internal extraction, analysis, evidence matching, drafting and quality checks may run without approval at every step. A receiver remains responsible for the result. Buyer-facing actions depend on a recorded mandate, policy checks and a separately configured adapter; the existence of a workspace control does not mean a buyer portal is integrated.</p>
    <h2>5. Payment and scope</h2><p>Each purchase covers one tender opportunity at the price shown at checkout. Materially different or replacement procurement packs may require another purchase. Stripe provides hosted payment processing. VAT is applied only where applicable.</p>
    <h2>6. No guarantees</h2><p>BIDREADY24 does not certify eligibility or compliance and does not guarantee completeness, accuracy, a buyer score, successful portal submission, shortlisting, contract award or commercial result. Tender documents may be ambiguous, inconsistent, scanned poorly or changed by the buyer after analysis.</p>
    <h2>7. Availability and delivery</h2><p>Processing time depends on file volume, quality, service availability and configured model or adapter providers. No hard delivery deadline applies unless it is explicitly confirmed for the specific purchase. Customers should leave sufficient time for their own review and contingency before the buyer deadline.</p>
    <h2>8. Liability and legal details still required</h2><p>A final version needs the contracting entity’s complete legal identity, governing law, liability cap and exclusions, intellectual-property terms, confidentiality provisions, suspension and termination rights, business-continuity wording and formal notice process. Those terms have intentionally not been invented here.</p>
  </LegalNotice>;
}
