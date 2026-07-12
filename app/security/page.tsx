import Link from "next/link";

export default function Security() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12 prose prose-sm">
      <h1>Security &amp; Data Handling</h1>

      <p className="text-[#475569]">We take the confidentiality of your tender documents and company evidence seriously.</p>

      <h2>What we do</h2>
      <ul>
        <li>Private storage for uploaded files (encrypted at rest by the platform in production).</li>
        <li>Short-lived signed access where possible.</li>
        <li>Original files are never modified.</li>
        <li>Hashes stored for integrity and deduplication.</li>
        <li>Magic-link access only — revocable and time-limited.</li>
        <li>Strict separation between projects.</li>
        <li>Machine decisions, citations, confidence and external-action receipts remain visible to the receiver.</li>
      </ul>

      <h2>What we do not do</h2>
      <ul>
        <li>We never invent or embellish your company’s qualifications, insurance, policies, references, or performance data.</li>
        <li>We do not send or submit anything without a receiver-configured mandate; successful external actions require a verifiable adapter receipt.</li>
        <li>We do not use your documents to train models unless you explicitly opt in for future improvement (not yet offered).</li>
        <li>We do not claim “GDPR compliant” until legal review is complete.</li>
      </ul>

      <h2>Current limitations</h2>
      <ul>
        <li>Production storage is isolated to the application service and should be upgraded to dedicated object storage as volume grows.</li>
        <li>Upload screening validates type, file signature, size, count and path safety; a dedicated antivirus service remains recommended.</li>
        <li>External actions depend on separately configured and authorised communication or portal adapters.</li>
        <li>Rate limiting and advanced WAF rules are basic.</li>
      </ul>

      <p className="text-xs mt-8">See the <Link href="/legal">legal and service information</Link> for current terms and limitations.</p>
    </div>
  );
}
