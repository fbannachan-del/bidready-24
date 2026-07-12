import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = { title: "Legal and service information", robots: { index: false, follow: true } };

const documents = [
  ["Service terms", "What BIDREADY24 supplies, customer responsibilities and important limitations.", "/legal/terms"],
  ["Privacy notice", "The data used to provide the service, processors involved and choices available.", "/legal/privacy"],
  ["Data handling", "Current retention position, deletion requests and the controls that remain in progress.", "/legal/data"],
  ["Refund policy", "When cancellation or refund requests can be considered for one-off processing work.", "/legal/refund"],
  ["Acceptable use", "The tender packs, evidence and actions that may—and may not—be put through the service.", "/legal/acceptable-use"],
] as const;

export default function LegalIndex() {
  return <div className="mx-auto max-w-[980px] px-5 py-16 sm:px-8 sm:py-20"><p className="eyebrow">Service governance</p><h1 className="page-title mt-5">Legal &amp; service information</h1><p className="body-large mt-6 max-w-3xl">Plain-language working notices for the live product. They state current boundaries honestly; qualified legal review is still required before they should be treated as final legal instruments.</p><div className="mt-8 rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm leading-6 text-amber-950"><strong>Current status:</strong> these notices have not yet been approved by a solicitor. BIDREADY24 does not use this status to imply GDPR compliance, certification or regulatory approval.</div><div className="mt-10 grid gap-4 sm:grid-cols-2">{documents.map(([title, copy, href]) => <Link key={href} href={href} className="panel group p-6 transition hover:-translate-y-0.5 hover:border-[var(--border-strong)]"><div className="flex items-start justify-between gap-4"><h2 className="font-serif text-2xl font-medium">{title}</h2><ArrowRight className="mt-1 h-4 w-4 text-[var(--signal-blue)] transition group-hover:translate-x-1" /></div><p className="mt-3 text-sm leading-6 text-[var(--slate)]">{copy}</p></Link>)}</div><p className="mt-10 text-sm text-[var(--slate)]">Questions about these pages can be sent through <Link href="/contact" className="font-medium text-[var(--blue-ink)] underline underline-offset-4">contact and support</Link>.</p></div>;
}
