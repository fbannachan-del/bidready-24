"use client";

import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Bot,
  Check,
  FileCheck2,
  Gauge,
  LoaderCircle,
  LockKeyhole,
  Save,
  Send,
  ShieldCheck,
  Signature,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Profile = "assisted" | "autonomous" | "unattended";

type Mandate = {
  legal_entity: string;
  authorised_name: string;
  authorised_role: string;
  maximum_contract_value: string;
  expires_at: string;
  allow_signing: boolean;
  allow_submission: boolean;
  receiver_acknowledged: boolean;
};

type Policy = {
  analyse: boolean;
  decide_compliance: boolean;
  use_secondary_evidence: boolean;
  send_clarifications: boolean;
  create_commitments: boolean;
  price_tender: boolean;
  accept_contract_terms: boolean;
  apply_signature: boolean;
  complete_portal: boolean;
  submit_bid: boolean;
  automatic_no_bid: boolean;
  conservative_conflicts: boolean;
  correction_window_hours: string;
  minimum_margin_percent: string;
};

type ApiSettings = {
  profile?: Profile;
  mandate?: Partial<Mandate>;
  policy?: Partial<Policy>;
  receiver_acknowledged_at?: string | null;
};

const DEFAULT_MANDATE: Mandate = {
  legal_entity: "",
  authorised_name: "",
  authorised_role: "",
  maximum_contract_value: "",
  expires_at: "",
  allow_signing: true,
  allow_submission: true,
  receiver_acknowledged: false,
};

const DEFAULT_POLICY: Policy = {
  analyse: true,
  decide_compliance: true,
  use_secondary_evidence: true,
  send_clarifications: true,
  create_commitments: true,
  price_tender: true,
  accept_contract_terms: true,
  apply_signature: true,
  complete_portal: true,
  submit_bid: true,
  automatic_no_bid: true,
  conservative_conflicts: true,
  correction_window_hours: "2",
  minimum_margin_percent: "12",
};

const PROFILES: Array<{
  id: Profile;
  name: string;
  eyebrow: string;
  description: string;
  icon: typeof Bot;
}> = [
  {
    id: "assisted",
    name: "Assisted",
    eyebrow: "Draft and organise",
    description: "The system analyses and prepares the bid, then waits before buyer-facing actions.",
    icon: FileCheck2,
  },
  {
    id: "autonomous",
    name: "Autonomous",
    eyebrow: "Act within policy",
    description: "BidReady acts automatically inside the mandate and surfaces policy exceptions.",
    icon: Gauge,
  },
  {
    id: "unattended",
    name: "Unattended",
    eyebrow: "End-to-end operation",
    description: "The entire bid runs without waiting, unless a hard prohibition or technical failure occurs.",
    icon: Sparkles,
  },
];

const POLICY_GROUPS: Array<{
  title: string;
  description: string;
  icon: typeof Bot;
  items: Array<{ key: keyof Policy; label: string; help: string }>;
}> = [
  {
    title: "Analyse and decide",
    description: "Interpret the pack, reconcile conflicts, and reach explicit compliance decisions.",
    icon: Bot,
    items: [
      { key: "analyse", label: "Analyse the full tender pack", help: "Extract requirements, questions, dates, attachments, and source citations." },
      { key: "decide_compliance", label: "Make compliance decisions", help: "Classify every requirement using available evidence and visible confidence." },
      { key: "use_secondary_evidence", label: "Use secondary evidence", help: "Use credible public or historic sources when primary evidence is unavailable, with a warning." },
      { key: "conservative_conflicts", label: "Resolve conflicts conservatively", help: "Follow precedence rules, then choose the stricter interpretation and record alternatives." },
    ],
  },
  {
    title: "Prepare and communicate",
    description: "Build the response, make authorised commitments, and communicate with the buyer.",
    icon: Send,
    items: [
      { key: "send_clarifications", label: "Send buyer clarifications", help: "Send neutral, non-sensitive questions before the clarification deadline." },
      { key: "create_commitments", label: "Create operational commitments", help: "Only use commitments that fall inside your configured authority boundaries." },
      { key: "price_tender", label: "Complete pricing schedules", help: "Apply the pricing policy, reconcile totals, and preserve every assumption." },
      { key: "accept_contract_terms", label: "Accept terms within playbook", help: "Accept permitted clauses and apply configured actions to deviations." },
    ],
  },
  {
    title: "Sign and submit",
    description: "Complete the procurement portal and create an immutable submission record.",
    icon: Signature,
    items: [
      { key: "apply_signature", label: "Apply authorised signatures", help: "Sign only eligible documents while the delegated authority is valid." },
      { key: "complete_portal", label: "Complete the buyer portal", help: "Enter answers, upload files, resolve validation errors, and save a final snapshot." },
      { key: "submit_bid", label: "Submit the final bid", help: "Submit after the machine gate passes, then capture and verify the receipt." },
      { key: "automatic_no_bid", label: "Make automatic no-bid decisions", help: "Stop opportunities that breach hard eligibility, margin, mandate, or contract-risk rules." },
    ],
  },
];

function asBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

export default function AutonomyControlCenter({
  token,
  companyName,
}: {
  token: string;
  companyName: string;
}) {
  const [profile, setProfile] = useState<Profile>("unattended");
  const [mandate, setMandate] = useState<Mandate>({ ...DEFAULT_MANDATE, legal_entity: companyName });
  const [policy, setPolicy] = useState<Policy>(DEFAULT_POLICY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/project/${token}/autonomy`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Settings are not available yet");
        return (await response.json()) as ApiSettings;
      })
      .then((settings) => {
        if (cancelled) return;
        if (settings.profile && PROFILES.some((item) => item.id === settings.profile)) {
          setProfile(settings.profile);
        }
        if (settings.mandate) {
          setMandate((current) => ({
            ...current,
            ...settings.mandate,
            allow_signing: asBoolean(settings.mandate?.allow_signing, current.allow_signing),
            allow_submission: asBoolean(settings.mandate?.allow_submission, current.allow_submission),
            receiver_acknowledged: Boolean(settings.mandate?.receiver_acknowledged || settings.receiver_acknowledged_at),
          }));
        }
        if (settings.policy) setPolicy((current) => ({ ...current, ...settings.policy }));
      })
      .catch(() => {
        if (!cancelled) setMessage("No saved mandate yet. Complete this page to activate unattended operation.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const activeCount = useMemo(
    () => Object.entries(policy).filter(([, value]) => value === true).length,
    [policy],
  );

  const mandateComplete = Boolean(
    mandate.legal_entity.trim() &&
      mandate.authorised_name.trim() &&
      mandate.authorised_role.trim() &&
      mandate.receiver_acknowledged,
  );

  function selectProfile(next: Profile) {
    setProfile(next);
    if (next === "assisted") {
      setPolicy((current) => ({
        ...current,
        send_clarifications: false,
        apply_signature: false,
        complete_portal: false,
        submit_bid: false,
      }));
    }
    if (next === "autonomous") {
      setPolicy((current) => ({ ...current, analyse: true, decide_compliance: true }));
    }
    if (next === "unattended") setPolicy(DEFAULT_POLICY);
    setMessage("");
  }

  async function saveSettings() {
    if (profile === "unattended" && !mandateComplete) {
      setMessage("Complete the authority details and receiver acknowledgement before unattended mode can be activated.");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/project/${token}/autonomy`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ profile, mandate, policy }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Unable to save the mandate");
      setSavedAt(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
      setMessage("Autonomy policy and receiver mandate saved.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save the mandate");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center border border-[#D9D5CB] bg-[#FBFAF6] font-['IBM_Plex_Sans',Arial,sans-serif]">
        <LoaderCircle className="h-5 w-5 animate-spin text-[#1457FF]" aria-hidden="true" />
        <span className="ml-3 text-sm text-[#667085]">Loading autonomy policy…</span>
      </div>
    );
  }

  return (
    <div className="space-y-5 font-['IBM_Plex_Sans',Arial,sans-serif] text-[#17202A]">
      <section id="operating-profile" aria-labelledby="profile-heading" className="border border-[#D9D5CB] bg-[#FBFAF6] p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 border border-[#B9C9FF] bg-[#EEF3FF] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1457FF]">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Operating profile
            </div>
            <h2 id="profile-heading" className="text-xl font-semibold tracking-[-0.02em] text-[#17202A]">Choose how BidReady operates</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[#667085]">Set when BidReady may act. Evidence, uncertainty and decisions remain visible in every mode.</p>
          </div>
          <div className="font-['IBM_Plex_Mono',monospace] text-[11px] text-[#667085]">{activeCount} actions enabled</div>
        </div>

        <div className="mt-5 grid gap-3 lg:grid-cols-3" role="radiogroup" aria-label="Autonomy operating profile">
          {PROFILES.map((item) => {
            const Icon = item.icon;
            const selected = profile === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => selectProfile(item.id)}
                className={`group border p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1457FF] ${
                  selected ? "border-[#1457FF] bg-[#EEF3FF] ring-1 ring-[#1457FF]" : "border-[#D9D5CB] bg-[#F8F6F0] hover:border-[#A9A59C]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className={`p-2 ${selected ? "bg-[#1457FF] text-white" : "bg-[#E8E5DD] text-[#667085]"}`}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${selected ? "border-[#1457FF] bg-[#1457FF] text-white" : "border-[#B7B2A7]"}`}>
                    {selected && <Check className="h-3 w-3" aria-hidden="true" />}
                  </span>
                </div>
                <div className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1457FF]">{item.eyebrow}</div>
                <div className="mt-1 font-semibold text-[#17202A]">{item.name}</div>
                <p className="mt-1 text-xs leading-5 text-[#667085]">{item.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section id="action-policy" aria-labelledby="policy-heading" className="border border-[#D9D5CB] bg-[#FBFAF6] p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="bg-[#17202A] p-2.5 text-white"><Bot className="h-5 w-5" aria-hidden="true" /></div>
          <div>
            <h2 id="policy-heading" className="text-xl font-semibold tracking-[-0.02em] text-[#17202A]">Action policy</h2>
            <p className="text-sm text-[#667085]">Choose which actions may proceed without waiting.</p>
          </div>
        </div>

        <div className="mt-6 divide-y divide-[#D9D5CB]">
          {POLICY_GROUPS.map((group) => {
            const Icon = group.icon;
            return (
              <div key={group.title} className="grid gap-4 py-6 first:pt-0 lg:grid-cols-[240px_1fr]">
                <div>
                  <div className="flex items-center gap-2 font-semibold text-[#17202A]"><Icon className="h-4 w-4 text-[#1457FF]" aria-hidden="true" />{group.title}</div>
                  <p className="mt-1 text-xs leading-5 text-[#667085]">{group.description}</p>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {group.items.map((item) => (
                    <label key={item.key} className="flex cursor-pointer gap-3 border border-[#D9D5CB] bg-[#F8F6F0] p-3.5 hover:border-[#A9A59C]">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 accent-[#1457FF]"
                        checked={Boolean(policy[item.key])}
                        onChange={(event) => setPolicy((current) => ({ ...current, [item.key]: event.target.checked }))}
                      />
                      <span>
                        <span className="block text-sm font-medium text-[#17202A]">{item.label}</span>
                        <span className="mt-0.5 block text-xs leading-5 text-[#667085]">{item.help}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid gap-4 border border-[#D9D5CB] bg-[#F4F1E8] p-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-800">
            Minimum gross margin
            <span className="mt-1 flex items-center rounded-lg border border-slate-300 bg-white px-3 focus-within:ring-2 focus-within:ring-[#0A3D62]/20">
              <input
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={policy.minimum_margin_percent}
                onChange={(event) => setPolicy((current) => ({ ...current, minimum_margin_percent: event.target.value }))}
                className="min-w-0 flex-1 border-0 bg-transparent py-2 text-sm outline-none"
              />
              <span className="text-slate-500">%</span>
            </span>
          </label>
          <label className="text-sm font-medium text-slate-800">
            Receiver correction window
            <select
              value={policy.correction_window_hours}
              onChange={(event) => setPolicy((current) => ({ ...current, correction_window_hours: event.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0A3D62]/20"
            >
              <option value="0">No window — act immediately</option>
              <option value="2">2 hours</option>
              <option value="8">8 hours</option>
              <option value="24">24 hours</option>
            </select>
          </label>
        </div>
      </section>

      <section id="receiver-mandate" aria-labelledby="mandate-heading" className="overflow-hidden border border-[#D9D5CB] bg-[#FBFAF6]">
        <div className="border-b border-[#2C3440] bg-[#17202A] px-5 py-5 text-white sm:px-6">
          <div className="flex items-center gap-3">
            <LockKeyhole className="h-5 w-5 text-[#7EA0FF]" aria-hidden="true" />
            <div>
              <h2 id="mandate-heading" className="text-lg font-semibold">Receiver mandate</h2>
              <p className="mt-0.5 text-xs leading-5 text-slate-300">Required before BidReady can sign, submit, or make company commitments autonomously.</p>
            </div>
          </div>
        </div>
        <div className="p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-800">
              Legal entity
              <input
                value={mandate.legal_entity}
                onChange={(event) => setMandate((current) => ({ ...current, legal_entity: event.target.value }))}
                placeholder="Company legal name"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0A3D62]/20"
              />
            </label>
            <label className="text-sm font-medium text-slate-800">
              Maximum contract value
              <span className="mt-1 flex items-center rounded-lg border border-slate-300 px-3 focus-within:ring-2 focus-within:ring-[#0A3D62]/20">
                <span className="text-slate-500">£</span>
                <input
                  value={mandate.maximum_contract_value}
                  onChange={(event) => setMandate((current) => ({ ...current, maximum_contract_value: event.target.value }))}
                  inputMode="numeric"
                  placeholder="e.g. 500000"
                  className="min-w-0 flex-1 border-0 bg-transparent px-2 py-2 text-sm outline-none"
                />
              </span>
            </label>
            <label className="text-sm font-medium text-slate-800">
              Authorised by
              <input
                value={mandate.authorised_name}
                onChange={(event) => setMandate((current) => ({ ...current, authorised_name: event.target.value }))}
                placeholder="Full name"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0A3D62]/20"
              />
            </label>
            <label className="text-sm font-medium text-slate-800">
              Role / authority
              <input
                value={mandate.authorised_role}
                onChange={(event) => setMandate((current) => ({ ...current, authorised_role: event.target.value }))}
                placeholder="e.g. Managing director"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0A3D62]/20"
              />
            </label>
            <label className="text-sm font-medium text-slate-800 sm:col-span-2 sm:max-w-sm">
              Mandate expiry (optional)
              <input
                type="date"
                value={mandate.expires_at}
                onChange={(event) => setMandate((current) => ({ ...current, expires_at: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[#0A3D62]/20"
              />
            </label>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-medium text-slate-800">
              <input type="checkbox" checked={mandate.allow_signing} onChange={(event) => setMandate((current) => ({ ...current, allow_signing: event.target.checked }))} className="h-4 w-4 accent-[#0A3D62]" />
              Apply signatures within this mandate
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm font-medium text-slate-800">
              <input type="checkbox" checked={mandate.allow_submission} onChange={(event) => setMandate((current) => ({ ...current, allow_submission: event.target.checked }))} className="h-4 w-4 accent-[#0A3D62]" />
              Submit bids within this mandate
            </label>
          </div>

          <label className={`mt-5 flex cursor-pointer gap-3 rounded-xl border p-4 ${mandate.receiver_acknowledged ? "border-emerald-300 bg-emerald-50" : "border-amber-300 bg-amber-50"}`}>
            <input
              type="checkbox"
              checked={mandate.receiver_acknowledged}
              onChange={(event) => setMandate((current) => ({ ...current, receiver_acknowledged: event.target.checked }))}
              className="mt-0.5 h-4 w-4 accent-[#0A3D62]"
            />
            <span>
              <span className="block text-sm font-semibold text-slate-950">Receiver acknowledgement</span>
              <span className="mt-1 block text-xs leading-5 text-slate-600">I am authorised to configure this mandate. I understand BidReady 24 will make and execute machine-produced decisions within it, and the receiving organisation remains responsible for checking outputs, source material, commitments, declarations, pricing, and submissions for accuracy.</span>
            </span>
          </label>

          <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div aria-live="polite" className={`flex min-h-5 items-center gap-2 text-xs ${message.toLowerCase().includes("saved") ? "text-emerald-700" : "text-amber-700"}`}>
              {message && (message.toLowerCase().includes("saved") ? <BadgeCheck className="h-4 w-4" aria-hidden="true" /> : <AlertTriangle className="h-4 w-4" aria-hidden="true" />)}
              {message || (savedAt ? `Last saved at ${savedAt}` : "Your mandate is versioned and logged when saved.")}
            </div>
            <button
              type="button"
              onClick={saveSettings}
              disabled={saving || (profile === "unattended" && !mandateComplete)}
              className="inline-flex min-h-11 items-center justify-center gap-2 bg-[#1457FF] px-6 text-sm font-semibold text-white transition hover:bg-[#0C45D8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1457FF] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {saving ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}
              {saving ? "Saving mandate…" : "Save and activate"}
              {!saving && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
