import Link from "next/link";

export default function Pricing() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-4xl font-semibold tracking-tight">Pricing</h1>
      <p className="mt-3 text-lg text-[#475569]">Transparent. Fixed price. Pay only when you have a tender to analyse.</p>

      <div className="mt-10 grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl border p-8 bg-white">
          <div className="uppercase text-xs tracking-widest text-[#0A3D62]">MOST POPULAR FOR FIRST TENDER</div>
          <div className="mt-2 text-3xl font-semibold">Tender Preflight</div>
          <div className="text-5xl font-semibold tabular-nums mt-1">£149</div>
          <div className="text-sm text-[#64748B] mt-1">+ VAT where applicable</div>

          <ul className="mt-6 space-y-2 text-sm">
            {[
              "Source-cited mandatory compliance matrix",
              "Scored questions with limits & weights",
              "Attachment & signature checklist",
              "Evidence-gap action plan (critical → low)",
              "Clarification questions for the buyer",
              "Response plan + suggested timetable",
              "Web report + CSV export",
              "Admin review before delivery",
            ].map(t => <li key={t}>✓ {t}</li>)}
          </ul>

          <Link href="/checkout?type=preflight" className="mt-8 block w-full text-center rounded-full bg-[#0A3D62] py-3 text-white font-medium">Buy Preflight — £149</Link>
          <p className="text-center text-[10px] mt-2 text-[#64748B]">Secure checkout via Stripe. Test mode in preview.</p>
        </div>

        <div className="rounded-2xl border border-[#0A3D62] p-8 bg-white">
          <div className="uppercase text-xs tracking-widest text-[#0A3D62]">INCLUDES DRAFTS</div>
          <div className="mt-2 text-3xl font-semibold">Complete Pack</div>
          <div className="text-5xl font-semibold tabular-nums mt-1">£349</div>
          <div className="text-sm text-[#64748B] mt-1">+ VAT where applicable</div>

          <ul className="mt-6 space-y-2 text-sm">
            {[
              "Everything in Tender Preflight",
              "Structured DOCX response outline",
              "Source-bound first-draft sections (where evidence supplied)",
              "Priority human review & delivery",
              "All exports (PDF + CSV + XLSX + DOCX)",
            ].map(t => <li key={t}>✓ {t}</li>)}
          </ul>

          <Link href="/checkout?type=complete" className="mt-8 block w-full text-center rounded-full bg-[#0A3D62] py-3 text-white font-medium">Buy Complete Pack — £349</Link>
          <p className="text-center text-[10px] mt-2 text-[#64748B]">Drafts distinguish supplied facts from structure and placeholders.</p>
        </div>
      </div>

      <div className="mt-10 text-sm border-t pt-8 text-[#475569]">
        <p className="font-medium">Future recurring (not yet available)</p>
        <p>£249/month for one standard tender + reusable evidence library. Only after owner approval or three customers request it.</p>

        <div className="mt-6 text-xs">
          All sales are subject to the published refund policy (draft). No win guarantees. We never submit bids. See <Link href="/legal" className="underline">legal drafts</Link>.
        </div>
      </div>
    </div>
  );
}
