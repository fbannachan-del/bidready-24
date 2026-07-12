import type { Metadata } from "next";
import Link from "next/link";
import { LegalNotice } from "@/components/site/LegalNotice";

export const metadata: Metadata = { title: "Data handling and retention", robots: { index: false, follow: true } };

export default function DataHandling() {
  return <LegalNotice title="Data handling & retention">
    <p>This statement distinguishes the current operating position from the controls BidReady 24 intends to add. It deliberately avoids promising an automatic deletion schedule that the deployed application does not yet enforce end to end.</p>
    <h2>Current storage</h2><p>The live service uses application-attached persistent storage for project data and uploaded files. Files are hashed, project records are separated and customer routes use time-limited access tokens. This is not described as a dedicated enterprise object-storage architecture.</p>
    <h2>Current retention position</h2><p>Source files, extracted content, structured findings, audit records, payment reconciliation data and support requests may remain stored while the service is operated and records are needed. Database deletion flags exist, but BidReady 24 does not currently claim that all original files, extracted copies, backups and related records are automatically erased after a fixed number of days.</p>
    <h2>Deletion requests</h2><p>Request deletion through <Link href="/contact" className="underline underline-offset-4">contact and support</Link> and identify the project without sending sensitive source content in the message. Requests are handled operationally. Some records may need to be retained for payment reconciliation, security, dispute handling or legal obligations; the basis should be explained when relevant.</p>
    <h2>Planned control</h2><p>The intended lifecycle control is a scheduled deletion process with project deadlines, physical file removal, extracted-copy treatment, retries, failure alerts and an audit receipt. Until that complete process is implemented and tested, no fixed automatic-deletion promise is made.</p>
  </LegalNotice>;
}
