"use client";

import { useState } from "react";
import { useParams } from "next/navigation";

export default function Intake() {
  const { token } = useParams<{ token: string }>();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    const data: Record<string, unknown> = Object.fromEntries(form.entries());
    data.certifications = String(data.certifications || "").split(",").map(s => s.trim()).filter(Boolean);
    data.existing_policies = String(data.existing_policies || "").split(",").map(s => s.trim()).filter(Boolean);
    data.consent = form.get("consent") === "on";

    const res = await fetch(`/api/project/${token}/intake`, { method: "POST", body: JSON.stringify(data) });
    if (res.ok) setSubmitted(true);
    setLoading(false);
  }

  if (submitted) return <div className="min-h-full bg-[#F4F1E8] p-8 font-['IBM_Plex_Sans',Arial,sans-serif]"><div className="mx-auto max-w-md border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900"><strong>Organisation evidence saved.</strong><br />You can now upload the tender pack and configure the autonomy mandate from the project workspace.</div></div>;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 font-['IBM_Plex_Sans',Arial,sans-serif] text-[#17202A]">
      <div className="font-['IBM_Plex_Mono',monospace] text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1457FF]">Organisation evidence</div>
      <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">Company intake</h1>
      <p className="mt-2 text-sm leading-6 text-[#667085]">This information identifies the bidding organisation and grounds the first evidence pass. Intake answers are not treated as verified evidence on their own. Fields marked * are required.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4 text-sm">
        <input name="company_name" placeholder="Company legal name *" required className="w-full border p-2 rounded" />
        <input name="company_website" placeholder="Website" className="w-full border p-2 rounded" />
        <input name="companies_house" placeholder="Companies House number (if applicable)" className="w-full border p-2 rounded" />

        <input name="bid_deadline" placeholder="Bid deadline (e.g. 2026-08-14)" required className="w-full border p-2 rounded" />
        <input name="portal" placeholder="Portal (e.g. ProContract, Find a Tender)" className="w-full border p-2 rounded" />
        <input name="service_area" placeholder="Service area / lots *" required className="w-full border p-2 rounded" />

        <div>
          <div className="text-xs mb-1">Certifications you currently hold (comma separated)</div>
          <input name="certifications" placeholder="CHAS, ISO 9001, SafeContractor..." className="w-full border p-2 rounded" />
        </div>

        <input name="insurance_levels" placeholder="Current insurance levels (e.g. PL £10m / EL £10m)" className="w-full border p-2 rounded" />
        <input name="turnover_band" placeholder="Approximate annual turnover band" className="w-full border p-2 rounded" />

        <div>
          <div className="text-xs mb-1">Key existing policies (comma separated)</div>
          <input name="existing_policies" placeholder="Health & Safety, Environmental, Equality..." className="w-full border p-2 rounded" />
        </div>

        <div className="pt-2 border-t">
          <input name="contact_name" placeholder="Contact name *" required className="w-full border p-2 rounded mb-2" />
          <input name="contact_email" type="email" placeholder="Contact email *" required className="w-full border p-2 rounded mb-2" />
          <input name="contact_phone" placeholder="Phone" className="w-full border p-2 rounded" />
        </div>

        <label className="flex gap-2 text-xs items-start">
          <input type="checkbox" name="consent" required className="mt-1" /> 
          <span>I authorise BIDREADY24 to process the uploaded tender documents and this information to deliver and operate the paid compliance preflight for this project. I have read the current privacy and data-handling notices, including the stated retention limitations. *</span>
        </label>

        <button disabled={loading} className="mt-2 w-full bg-[#1457FF] py-2.5 text-sm font-semibold text-white hover:bg-[#0C45D8] disabled:opacity-60">{loading ? "Saving…" : "Save intake and continue"}</button>
      </form>
      <p className="text-[10px] mt-4 text-[#64748B]">You can edit this later via support if needed. No data is shared outside your project.</p>
    </div>
  );
}
