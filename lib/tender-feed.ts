import type { TenderFeed, TenderOpportunity, TenderSearchInput } from "@/lib/contracts-finder";
import { fetchCleaningTenders } from "@/lib/contracts-finder";
import { fetchFindATenderCleaning } from "@/lib/find-a-tender";

function fingerprint(item: TenderOpportunity) {
  const clean = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return `${clean(item.title)}|${clean(item.buyer)}|${item.deadlineAt?.slice(0, 10) || ""}`;
}

export async function fetchLiveCleaningTenders(input: TenderSearchInput = {}): Promise<TenderFeed> {
  const [fts, contractsFinder] = await Promise.allSettled([
    fetchFindATenderCleaning(input),
    fetchCleaningTenders(input),
  ]);
  if (fts.status === "rejected" && contractsFinder.status === "rejected") throw new Error("All tender data sources are unavailable");

  const feeds = [fts, contractsFinder].flatMap(result => result.status === "fulfilled" ? [result.value] : []);
  const seen = new Set<string>();
  const opportunities = feeds.flatMap(feed => feed.opportunities).filter(item => {
    const key = fingerprint(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => (a.deadlineAt ? Date.parse(a.deadlineAt) : Number.MAX_SAFE_INTEGER) - (b.deadlineAt ? Date.parse(b.deadlineAt) : Number.MAX_SAFE_INTEGER));

  return {
    opportunities,
    total: opportunities.length,
    fetchedAt: feeds.map(feed => feed.fetchedAt).sort().at(-1) || new Date().toISOString(),
    source: feeds.length > 1 ? "Find a Tender + Contracts Finder" : feeds[0].source,
  };
}
