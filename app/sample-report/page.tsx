import Link from "next/link";

export default function SampleReport() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <div className="mb-6">
        <Link href="/" className="text-sm text-[#0A3D62]">← Back</Link>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <div className="uppercase tracking-[1.5px] text-xs text-emerald-600">SAMPLE — SYNTHETIC DATA ONLY</div>
          <h1 className="text-3xl font-semibold tracking-tight">Acme Cleaning Ltd — Borough Council Cleaning Services 2026-2029</h1>
          <div className="text-sm text-[#475569] mt-1">Tender Ref: BC/CLEAN/2026/014 • Deadline: 14 August 2026, 12:00 • Portal: ProContract</div>
        </div>
        <div className="text-right text-xs bg-white border p-3 rounded">Eligibility: <span className="font-medium text-emerald-600">Review needed</span><br/>Human reviewed • 11 Jul 2026</div>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Summary */}
        <div className="lg:col-span-3 bg-white border rounded-xl p-6">
          <h2 className="font-semibold mb-2">Executive Summary</h2>
          <p className="text-sm text-[#475569]">
            The tender is for a 3-year contract (with possible 1-year extension) for daily office and public building cleaning across 12 sites. 
            Mandatory requirements include public liability £10m, employers liability £10m, CHAS or equivalent, and specific DBS/safeguarding for school sites.
            Several scored quality questions carry 60% of marks. Pricing is 40%.
          </p>
          <div className="mt-3 text-xs text-amber-700 bg-amber-50 inline-block px-2 py-0.5 rounded">One critical gap: no current CHAS or SSIP accreditation shown in your intake. Confirm before bid decision.</div>
        </div>

        {/* Critical Dates */}
        <div className="bg-white border rounded-xl p-6">
          <h3 className="font-semibold mb-3">Critical Dates</h3>
          <ul className="text-sm space-y-2">
            <li><span className="font-mono text-xs">14 Aug 2026 12:00</span> — Tender submission (electronic)</li>
            <li><span className="font-mono text-xs">31 Jul 2026 17:00</span> — Clarification questions deadline</li>
            <li><span className="font-mono text-xs">22 Jul 2026 10:00</span> — Site visit (mandatory, register by 18 Jul)</li>
            <li><span className="font-mono text-xs">01 Oct 2026</span> — Contract start (mobilisation 4 weeks prior)</li>
          </ul>
          <div className="citation mt-3">Source: Instructions to Tenderers, p.2; ITT Appendix A</div>
        </div>

        {/* Mandatory Matrix */}
        <div className="bg-white border rounded-xl p-6 lg:col-span-2">
          <h3 className="font-semibold mb-3">Mandatory Compliance (excerpt)</h3>
          <table className="table w-full text-sm">
            <thead><tr className="bg-[#F8F9FA]"><th>Requirement</th><th>Source</th><th>Your status</th><th>Action</th></tr></thead>
            <tbody>
              <tr>
                <td>Public Liability Insurance £10m minimum</td>
                <td className="citation">Spec 3.1, p.7</td>
                <td><span className="status-uncertain px-2 py-0.5 text-xs rounded border">UNCERTAIN</span></td>
                <td className="text-xs">Upload current cert or confirm level in intake</td>
              </tr>
              <tr>
                <td>CHAS or equivalent SSIP accreditation</td>
                <td className="citation">ITT 4.2 &amp; Form B, p.4</td>
                <td><span className="status-missing px-2 py-0.5 text-xs rounded border">MISSING</span></td>
                <td className="text-xs text-amber-700">Critical — apply or partner</td>
              </tr>
              <tr>
                <td>DBS checks for all staff on education sites</td>
                <td className="citation">Safeguarding Schedule, p.19</td>
                <td><span className="status-met px-2 py-0.5 text-xs rounded border">MET (intake)</span></td>
                <td className="text-xs">Policy + sample certificate provided</td>
              </tr>
            </tbody>
          </table>
          <div className="text-[10px] mt-2 text-[#64748B]">Full matrix contains 28 items. All linked to source. No invented status.</div>
        </div>

        {/* Gaps */}
        <div className="bg-white border rounded-xl p-6">
          <h3 className="font-semibold mb-2 text-red-700">Evidence Gaps (Critical)</h3>
          <ul className="text-sm space-y-2">
            <li className="border-l-2 border-red-400 pl-2">CHAS / SSIP — no evidence supplied. Required for pass/fail.</li>
            <li className="border-l-2 border-amber-400 pl-2">Method statement for eco-friendly products (scored 8%).</li>
            <li className="border-l-2 border-amber-400 pl-2">TUPE information — confirm current staff transfer assumptions.</li>
          </ul>
          <div className="text-xs mt-2">See full action plan in delivered report.</div>
        </div>

        {/* Limitations */}
        <div className="lg:col-span-3 mt-4 p-4 bg-[#FEFCE8] border border-amber-200 text-xs rounded">
          <strong>Limitations of this sample:</strong> All company facts and evidence are synthetic. In a real report your actual supplied documents and intake answers are used. 
          No claim in this sample or any report is guaranteed to be accepted by the buyer. This is not advice. Review every citation yourself.
        </div>
      </div>

      <div className="mt-8 text-center text-xs">
        This is a realistic example of the output format. <Link href="/pricing" className="underline">Purchase a real analysis</Link> for your tender.
      </div>
    </div>
  );
}
