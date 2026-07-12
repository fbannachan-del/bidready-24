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
    const data: any = Object.fromEntries(form.entries());
    data.certifications = (data.certifications as string || "").split(",").map(s => s.trim()).filter(Boolean);
    data.existing_policies = (data.existing_policies as string || "").split(",").map(s => s.trim()).filter(Boolean);
    data.consent = form.get("consent") === "on";

    const res = await fetch(`/api/project/${token}/intake`, { method: "POST", body: JSON.stringify(data) });
    if (res.ok) setSubmitted(true);
    setLoading(false);
  }

  if (submitted) return <div className="max-w-md mx-auto p-8">Thank you. Intake saved. You can now upload your tender documents from the project page.</div>;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-semibold">Company Intake</h1>
      <p className="text-sm text-[#475569]">This information is used only to match evidence against the tender and to contact you about this project. All fields marked * are required.</p>

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
          <span>I consent to BidReady 24 processing the uploaded tender documents and this information solely to deliver the paid compliance preflight service for this project. I understand originals are deleted after 30 days by default. *</span>
        </label>

        <button disabled={loading} className="w-full bg-[#0A3D62] text-white py-2.5 rounded-full mt-2 disabled:opacity-60">{loading ? "Saving..." : "Save intake & continue to upload"}</button>
      </form>
      <p className="text-[10px] mt-4 text-[#64748B]">You can edit this later via support if needed. No data is shared outside your project.</p>
    </div>
  );
}
