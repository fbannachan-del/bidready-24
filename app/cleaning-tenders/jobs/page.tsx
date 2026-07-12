import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, RefreshCw, Search } from "lucide-react";
import { TenderCard } from "@/components/tenders/TenderCard";
import { cleaningTenderRegions } from "@/lib/tender-regions";
import { fetchLiveCleaningTenders } from "@/lib/tender-feed";

export const metadata: Metadata = {
  title: "Live UK cleaning tenders",
  description: "Search open UK public-sector cleaning opportunities from official procurement data.",
};

type SearchParams = Promise<{ q?: string; region?: string; sme?: string }>;

export default async function CleaningTenderJobs({ searchParams }: { searchParams: SearchParams }) {
  const query = await searchParams;
  const keyword = (query.q || "cleaning").slice(0, 100);
  const region = (query.region || "").slice(0, 80);
  const suitableForSme = query.sme === "1";
  let feed: Awaited<ReturnType<typeof fetchLiveCleaningTenders>> | null = null;
  try {
    feed = await fetchLiveCleaningTenders({ keyword, region, suitableForSme, limit: 30 });
  } catch {
    // The page remains usable and honest when the upstream public service is unavailable.
  }

  return (
    <div>
      <section className="border-b border-[var(--border)] px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-[1120px]">
          <p className="eyebrow">Live opportunity feed</p>
          <div className="mt-4 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div><h1 className="page-title">Open cleaning tenders.</h1><p className="body-large mt-5 max-w-3xl">Find public-sector cleaning opportunities, then run the buyer’s tender pack through a source-cited BIDREADY24 preflight before committing the bid team.</p></div>
            <Link href="/pricing" className="button-primary">Start a preflight <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </section>

      <section className="px-5 py-8 sm:px-8">
        <div className="mx-auto max-w-[1120px]">
          <form method="get" className="grid gap-3 rounded-2xl border border-[var(--border)] bg-white p-4 md:grid-cols-[1fr_230px_auto_auto] md:items-center">
            <label className="relative"><span className="sr-only">Search tenders</span><Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[var(--ink-faint)]" /><input name="q" defaultValue={keyword} maxLength={100} className="min-h-10 w-full rounded-lg border border-[var(--border-strong)] bg-white pl-10 pr-3 text-sm" placeholder="Cleaning, window cleaning…" /></label>
            <label><span className="sr-only">Region</span><select name="region" defaultValue={region} className="min-h-10 w-full rounded-lg border border-[var(--border-strong)] bg-white px-3 text-sm"><option value="">All regions</option>{cleaningTenderRegions.map(item => <option key={item} value={item}>{item}</option>)}</select></label>
            <label className="inline-flex min-h-10 items-center gap-2 px-2 text-sm text-[var(--slate)]"><input type="checkbox" name="sme" value="1" defaultChecked={suitableForSme} className="h-4 w-4 accent-[var(--signal-blue)]" /> SME suitable</label>
            <button type="submit" className="button-primary !min-h-10 !px-4">Search</button>
          </form>

          <div className="mt-8 flex flex-col justify-between gap-3 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-end">
            <div><p className="font-serif text-2xl font-medium">{feed ? `${feed.opportunities.length} open opportunities` : "Live feed unavailable"}</p><p className="mt-1 text-xs text-[var(--slate)]">Official sources: Find a Tender and Contracts Finder · refreshed at most every 15 minutes · always verify the official notice</p></div>
            {feed && <p className="inline-flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[.1em] text-[var(--ink-faint)]"><RefreshCw className="h-3 w-3" /> Checked {new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/London" }).format(new Date(feed.fetchedAt))}</p>}
          </div>

          {!feed ? <div className="mt-8 rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">The official procurement feeds could not be reached. No substitute or invented opportunities are being shown. Please try again shortly.</div>
            : feed.opportunities.length === 0 ? <div className="mt-8 rounded-xl border border-[var(--border)] bg-white p-8 text-center"><h2 className="font-serif text-2xl">No matching open tenders</h2><p className="mt-3 text-sm text-[var(--slate)]">Broaden the keyword, remove the region or turn off the SME-only filter.</p></div>
              : <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">{feed.opportunities.map(item => <TenderCard key={item.id} opportunity={item} />)}</div>}
          <p className="mt-8 text-xs leading-5 text-[var(--ink-faint)]">Contains public sector information licensed under the <a href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/" target="_blank" rel="noreferrer" className="underline underline-offset-2">Open Government Licence v3.0</a>. BIDREADY24 is not the publisher of these notices.</p>
        </div>
      </section>
    </div>
  );
}
