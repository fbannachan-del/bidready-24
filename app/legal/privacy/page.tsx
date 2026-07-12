export default function PrivacyDraft() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 text-sm">
      <h1 className="text-2xl font-semibold mb-1">Privacy Notice (DRAFT)</h1>
      <div className="uppercase text-[10px] tracking-widest text-amber-600 mb-6">NOT APPROVED FOR PUBLICATION</div>

      <p>We collect the minimum data needed to deliver the service you paid for: tender documents, company facts you provide in the intake, and contact details for the project.</p>

      <p className="mt-3">Data is stored privately. Original files are deleted after the retention period (default 30 days after delivery) unless you request otherwise.</p>

      <p className="mt-3">We use subprocessors (Stripe for payment, hosting provider, future transactional email and object storage). Full list will be published after approval.</p>

      <p className="mt-3 text-xs">Do not treat this as a complete or compliant privacy notice until reviewed.</p>
    </div>
  );
}
