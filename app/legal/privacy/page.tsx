import type { Metadata } from "next";
import Link from "next/link";
import { LegalNotice } from "@/components/site/LegalNotice";

export const metadata: Metadata = { title: "Privacy notice", robots: { index: false, follow: true } };

export default function PrivacyNotice() {
  return <LegalNotice title="Privacy notice">
    <p>BIDREADY24 processes information to create and operate a source-cited tender preflight. The service is intended for business users handling procurement material they are entitled to use.</p>
    <h2>Information processed</h2><ul><li>Contact and support details, including name, business email and message content.</li><li>Payment status and identifiers received from Stripe. Payment-card data is handled by Stripe’s hosted checkout, not by the BIDREADY24 application.</li><li>Tender documents, extracted text and file metadata.</li><li>Company facts, evidence documents and answers supplied through the project intake.</li><li>Analysis outputs, citations, confidence indicators, action history and technical audit records.</li><li>Hashed connection information used to limit repeated support-form abuse.</li></ul>
    <h2>How information is used</h2><ul><li>To take payment and release the purchased project.</li><li>To extract, analyse, validate and present the tender preflight.</li><li>To operate project access, troubleshoot failures and protect the service.</li><li>To answer support requests.</li><li>To carry out a buyer-facing action only when the project configuration, receiver mandate and supported adapter permit it.</li></ul>
    <h2>Service providers</h2><p>The current service may involve application hosting, Stripe for payment, OpenAI’s API when AI analysis is enabled, and configured support or external-action adapters. Tender excerpts and structured context may be sent to OpenAI for analysis; API requests are configured with storage disabled. No claim is made here that processing remains solely in the UK.</p>
    <h2>Model training</h2><p>BIDREADY24 does not intentionally use customer tender packs to train its own general-purpose models. When a configured model provider is used, its processing is governed by the applicable provider terms and the API controls described above.</p>
    <h2>Retention and deletion</h2><p>Project data and source files are retained to operate and evidence the service. A fully automated retention-and-deletion control is not yet claimed. You may request deletion through <Link href="/contact" className="underline underline-offset-4">contact and support</Link>; the request will be assessed against operational, payment, dispute and legal-record needs and handled manually.</p>
    <h2>Your choices</h2><p>You may ask what project information is held, request correction of supplied business information, request project-token revocation or ask for deletion. Identity and authority may need to be checked before a request is completed.</p>
    <h2>Important gap</h2><p>This working notice does not yet provide the complete controller identity, lawful-basis analysis, international-transfer terms, processor register, statutory-rights detail or regulator contact information expected in a final notice. Those items require owner input and qualified legal review.</p>
  </LegalNotice>;
}
