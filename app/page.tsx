import Link from "next/link";

export default function Home() {
  return (
    <div className="bg-[#F8F9FA]">
      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 pt-16 pb-12 text-center">
        <div className="inline-block rounded-full bg-[#E0F0FE] text-[#0A3D62] text-xs font-medium tracking-widest px-4 py-1 mb-4">UK PUBLIC SECTOR TENDERS</div>
        <h1 className="text-5xl md:text-6xl font-semibold tracking-tighter leading-none text-[#0F172A]">
          Know exactly what your tender requires<br />before you start writing.
        </h1>
        <p className="mt-6 text-xl text-[#475569] max-w-2xl mx-auto">
          BidReady 24 turns a complex UK tender pack into an autonomous, source-cited compliance preflight, evidence-gap plan, and response structure.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/pricing" id="get-started" className="inline-flex h-12 items-center justify-center rounded-full bg-[#0A3D62] px-8 text-white font-medium hover:bg-[#082C47]">
            Get a Tender Preflight — £149
          </Link>
          <Link href="/sample-report" className="inline-flex h-12 items-center justify-center rounded-full border border-[#CBD5E1] px-8 hover:bg-white">
            View sample report
          </Link>
        </div>
        <p className="mt-4 text-sm text-[#64748B]">Your submission stays under your control. We never invent evidence, and external actions require your explicit mandate.</p>
      </section>

      {/* Trust / Outcome */}
      <section className="border-y border-[#E5E7EB] bg-white py-8">
        <div className="mx-auto max-w-5xl px-6 grid md:grid-cols-3 gap-8 text-sm">
          <div>
            <div className="font-medium text-[#0A3D62]">Source-cited compliance matrix</div>
            <div className="mt-1 text-[#475569]">Every mandatory requirement and question links directly back to the page, section, or cell in the original documents.</div>
          </div>
          <div>
            <div className="font-medium text-[#0A3D62]">Evidence gaps ranked by priority</div>
            <div className="mt-1 text-[#475569]">Clear action plan: what’s missing, why it matters, suggested owner, and internal deadline. No silent omissions.</div>
          </div>
          <div>
            <div className="font-medium text-[#0A3D62]">Receiver assurance built in</div>
            <div className="mt-1 text-[#475569]">Independent citation checks, confidence signals, and unresolved uncertainties make every machine decision reviewable.</div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-3xl font-semibold tracking-tight mb-8">How it works</h2>
        <ol className="grid md:grid-cols-5 gap-6 text-sm">
          {[
            ["1", "Choose & pay", "£149 Preflight or £349 Complete Pack via secure Stripe checkout."],
            ["2", "Secure project", "Instant magic-link access. Complete the structured intake form."],
            ["3", "Upload pack", "PDF, DOCX, XLSX, CSV. Up to 20 files / 200 MB. Consent shown first."],
            ["4", "Autonomous analysis", "The system extracts with provenance, matches evidence, checks citations, and identifies requirements, gaps, and deadlines."],
            ["5", "Control & act", "Review the assurance pack, export the work, and authorise selected buyer-facing actions from one secure workspace."],
          ].map(([num, title, desc]) => (
            <li key={num} className="border border-[#E5E7EB] rounded-xl p-5 bg-white">
              <div className="w-6 h-6 rounded-full bg-[#0A3D62] text-white text-xs flex items-center justify-center mb-3">{num}</div>
              <div className="font-medium mb-1">{title}</div>
              <div className="text-[#475569]">{desc}</div>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs text-[#64748B]">Processing starts automatically after upload. Completion time depends on pack size, document quality, and configured external services.</p>
      </section>

      {/* For commercial cleaning */}
      <section className="bg-white border-y border-[#E5E7EB] py-12">
        <div className="mx-auto max-w-5xl px-6">
          <div className="uppercase tracking-[2px] text-xs text-[#0A3D62] mb-2">BUILT FOR</div>
          <h3 className="text-2xl font-semibold">Commercial cleaning contractors bidding for UK public sector work</h3>
          <div className="mt-4 grid md:grid-cols-2 gap-x-12 gap-y-3 text-sm text-[#475569]">
            <div>• Insurance certificates, COSHH, risk assessments</div>
            <div>• Mobilisation plans, TUPE, quality assurance</div>
            <div>• Environmental & sustainability policies</div>
            <div>• References, KPIs, social value responses</div>
            <div>• Safeguarding, equality, health & safety</div>
            <div>• Pricing schedules and method statements</div>
          </div>
          <div className="mt-6">
            <Link href="/cleaning-tenders" className="text-[#0A3D62] underline underline-offset-4">Dedicated page for cleaning tenders →</Link>
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="text-3xl font-semibold tracking-tight mb-6">Simple pricing</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="border border-[#E5E7EB] bg-white rounded-2xl p-8">
            <div className="font-semibold">Tender Preflight — £149</div>
            <ul className="mt-4 text-sm space-y-1.5 text-[#475569]">
              <li>✓ Full requirement extraction with sources</li>
              <li>✓ Mandatory compliance matrix</li>
              <li>✓ Scored questions & attachment register</li>
              <li>✓ Evidence gap action plan</li>
              <li>✓ Clarification questions list</li>
              <li>✓ Response plan & internal timetable</li>
              <li>✓ CSV + web report</li>
            </ul>
            <Link href="/pricing" className="mt-6 block text-center rounded-full border border-[#0A3D62] py-2 text-sm hover:bg-[#F1F5F9]">Choose Preflight</Link>
          </div>
          <div className="border border-[#0A3D62] bg-white rounded-2xl p-8 relative">
            <div className="absolute -top-2 right-6 text-[10px] bg-[#0A3D62] text-white px-2 py-0.5 rounded">RECOMMENDED FOR FIRST BID</div>
            <div className="font-semibold">Complete Pack — £349</div>
            <ul className="mt-4 text-sm space-y-1.5 text-[#475569]">
              <li>✓ Everything in Preflight</li>
              <li>✓ Structured response outline (DOCX)</li>
              <li>✓ Source-bound first-draft sections</li>
              <li>✓ Receiver assurance pack & autonomous QA</li>
            </ul>
            <Link href="/pricing" className="mt-6 block text-center rounded-full bg-[#0A3D62] text-white py-2 text-sm hover:bg-[#082C47]">Choose Complete Pack</Link>
          </div>
        </div>
        <p className="text-xs mt-4 text-[#64748B]">Fixed-price processing with no recurring billing.</p>
      </section>

      {/* Security & limitations teaser */}
      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="rounded-2xl border border-[#E5E7EB] bg-white p-8 text-sm">
          <div className="font-medium mb-2">Security & truthfulness first</div>
          <ul className="grid md:grid-cols-2 gap-x-8 gap-y-1 text-[#475569]">
            <li>• Private encrypted storage + short-lived access</li>
            <li>• All customer claims start as uncertain or missing</li>
            <li>• No fabricated policies, accreditations, references or figures</li>
            <li>• Receiver-visible QA, confidence and citation checks</li>
            <li>• 30-day automatic deletion of originals (extendable)</li>
            <li>• Clear limitations stated on every report</li>
          </ul>
          <Link href="/security" className="mt-4 inline-block text-[#0A3D62]">Read the security summary →</Link>
        </div>
      </section>

      <div className="text-center pb-12 text-xs text-[#64748B]">
        Ready to see exactly what the tender is asking? <Link href="/pricing" className="underline">Start here</Link>.
      </div>
    </div>
  );
}
