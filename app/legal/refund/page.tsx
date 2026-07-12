export default function RefundDraft() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 text-sm">
      <h1 className="text-2xl font-semibold mb-1">Refund Policy (DRAFT)</h1>
      <div className="uppercase text-[10px] tracking-widest text-amber-600 mb-6">OWNER AND LEGAL REVIEW REQUIRED</div>

      <p>Because each project reserves processing capacity and begins automated work after upload, refunds are limited.</p>
      <ul className="list-disc pl-5 mt-2">
        <li>If we have not yet started processing and you request cancellation within 2 hours of payment: full refund.</li>
        <li>After files are uploaded and analysis has begun: no refund (work has been performed).</li>
        <li>If we fail to deliver a report within the stated SLA due to our error: we will offer a full refund or credit at our discretion.</li>
      </ul>
      <p className="mt-4 text-xs">This policy does not affect any statutory rights that apply to you.</p>
    </div>
  );
}
