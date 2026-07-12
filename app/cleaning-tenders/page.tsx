import Link from "next/link";

export default function CleaningTenders() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-4xl font-semibold tracking-tight">BidReady 24 for Commercial Cleaning Contractors</h1>
      <p className="mt-3 max-w-2xl text-lg text-[#475569]">
        Public sector cleaning tenders are document-heavy and deadline-driven. We extract every requirement, flag gaps, and give you a traceable plan so you can decide fast whether (and how) to bid.
      </p>

      <div className="mt-8 grid md:grid-cols-2 gap-8 text-sm">
        <div className="bg-white p-6 rounded-xl border">
          <h3 className="font-semibold mb-2">What we pull out for cleaning bids</h3>
          <ul className="space-y-1 text-[#475569]">
            <li>• Insurance minima and certificate requirements</li>
            <li>• COSHH, risk assessment, method statement mandates</li>
            <li>• TUPE, mobilisation period and staff transfer rules</li>
            <li>• Quality scoring criteria and social value questions</li>
            <li>• Site lists, frequency schedules, KPI regimes</li>
            <li>• Safeguarding / DBS for schools &amp; care settings</li>
          </ul>
        </div>
        <div className="bg-white p-6 rounded-xl border">
          <h3 className="font-semibold mb-2">Realistic outcomes</h3>
          <p className="text-[#475569]">You will see within hours whether you have the certificates, policies, and capacity on paper. If CHAS is missing or insurance is short, you know before you spend days writing a bid.</p>
          <p className="mt-3 text-xs">All findings are source-linked. You make the final eligibility call.</p>
        </div>
      </div>

      <div className="mt-8">
        <Link href="/pricing" className="rounded-full bg-[#0A3D62] text-white px-8 py-3 inline-block">Start a cleaning tender preflight</Link>
      </div>

      <div className="mt-10 text-xs text-[#64748B]">Examples and language are specific to commercial cleaning. The underlying system works for other service sectors after validation.</div>
    </div>
  );
}
