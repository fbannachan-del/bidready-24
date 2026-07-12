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
        <li>Admin review happens inside the same controlled system.</li>
      </ul>

      <h2>What we do not do</h2>
      <ul>
        <li>We never invent or embellish your company’s qualifications, insurance, policies, references, or performance data.</li>
        <li>We do not auto-submit anything to portals.</li>
        <li>We do not use your documents to train models unless you explicitly opt in for future improvement (not yet offered).</li>
        <li>We do not claim “GDPR compliant” until legal review is complete.</li>
      </ul>

      <h2>MVP limitations (honest)</h2>
      <p>In the current concierge phase:</p>
      <ul>
        <li>Storage is local filesystem for preview (production will use proper object storage).</li>
        <li>Malware scanning is basic (type, signature, size). Full AV recommended for production.</li>
        <li>Emails are not yet sent via a verified transactional provider.</li>
        <li>Rate limiting and advanced WAF rules are basic.</li>
      </ul>

      <p className="text-xs mt-8">Full details will be in the published Privacy Notice and Data Processing Addendum after owner + legal approval. See <Link href="/legal">legal drafts</Link>.</p>
    </div>
  );
}
