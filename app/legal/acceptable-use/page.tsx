import type { Metadata } from "next";
import { LegalNotice } from "@/components/site/LegalNotice";

export const metadata: Metadata = { title: "Acceptable use", robots: { index: false, follow: true } };

export default function AcceptableUse() {
  return <LegalNotice title="Acceptable use">
    <p>Use BIDREADY24 only for lawful procurement work and material your organisation is entitled to process.</p>
    <h2>Permitted use</h2><ul><li>Assessing whether to bid for a genuine tender opportunity.</li><li>Extracting and organising requirements, evidence, questions and deadlines.</li><li>Preparing source-bound response structures and internal action plans.</li><li>Running authorised actions within the configured receiver mandate and adapter boundary.</li></ul>
    <h2>Prohibited use</h2><ul><li>Uploading material you do not have permission or another lawful basis to process.</li><li>Generating false, misleading or fabricated evidence, credentials, case studies or performance claims.</li><li>Using the service to evade a buyer’s rules, compromise a portal, impersonate another person or submit without authority.</li><li>Uploading malware, secrets unrelated to the tender, unnecessary special-category personal data or credentials for systems not explicitly supported.</li><li>Attempting to discover another project, bypass access controls, overload processing or reverse-engineer protected service components.</li><li>Using output as a substitute for the original tender pack or a required professional review.</li></ul>
    <h2>Customer evidence</h2><p>Supply the minimum evidence needed for the opportunity. Redact unrelated personal information where possible. Do not use example or template evidence as if it were current company fact.</p>
    <h2>Enforcement</h2><p>BIDREADY24 may suspend processing or revoke access where use creates a security, legal or integrity risk. A final enforcement and appeal process remains part of the outstanding legal-review work.</p>
  </LegalNotice>;
}
