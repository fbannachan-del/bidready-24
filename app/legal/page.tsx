import Link from "next/link";

export default function LegalIndex() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-3xl font-semibold">Legal (DRAFTS — NOT PUBLISHED)</h1>
      <p className="mt-2 text-sm text-amber-700">These pages are working drafts. They have not been reviewed by a qualified solicitor. Do not publish or rely on them until owner + legal sign-off.</p>

      <ul className="mt-8 space-y-3">
        <li><Link href="/legal/terms" className="underline">Terms of Service (draft)</Link></li>
        <li><Link href="/legal/privacy" className="underline">Privacy Notice (draft)</Link></li>
        <li><Link href="/legal/refund" className="underline">Refund Policy (draft)</Link></li>
        <li><Link href="/legal/data" className="underline">Data Retention &amp; Processing (draft)</Link></li>
        <li><Link href="/legal/acceptable-use" className="underline">Acceptable Use (draft)</Link></li>
      </ul>
      <p className="mt-8 text-xs">Owner approval + qualified legal review is a hard gate before any of these go live.</p>
    </div>
  );
}
