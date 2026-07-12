import type { TenderFeed, TenderOpportunity, TenderSearchInput, TenderSourceDiagnostics } from "@/lib/contracts-finder";
import { fetchCleaningTenders, normaliseTenderSearch } from "@/lib/contracts-finder";
import { fetchFindATenderCleaning } from "@/lib/find-a-tender";
import { opportunityMatchesRegion } from "@/lib/tender-regions";

function fingerprint(item: TenderOpportunity) {
  const clean = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return `${clean(item.title)}|${clean(item.buyer)}|${item.deadlineAt?.slice(0, 10) || ""}`;
}

function sourceDiag(result: PromiseSettledResult<TenderFeed>): TenderSourceDiagnostics {
  if (result.status === "fulfilled") {
    return { ok: true, count: result.value.opportunities.length };
  }
  const reason = result.reason;
  return {
    ok: false,
    count: 0,
    error: reason instanceof Error ? reason.message.slice(0, 200) : "UnknownError",
  };
}

export async function fetchLiveCleaningTenders(input: TenderSearchInput = {}): Promise<TenderFeed> {
  const query = normaliseTenderSearch(input);
  const [fts, contractsFinder] = await Promise.allSettled([
    fetchFindATenderCleaning(query),
    fetchCleaningTenders(query),
  ]);

  const diagnostics = {
    findATender: sourceDiag(fts),
    contractsFinder: sourceDiag(contractsFinder),
  };

  if (fts.status === "rejected" && contractsFinder.status === "rejected") {
    const err = new Error("All tender data sources are unavailable") as Error & { diagnostics?: typeof diagnostics };
    err.diagnostics = diagnostics;
    throw err;
  }

  const feeds = [fts, contractsFinder].flatMap(result => result.status === "fulfilled" ? [result.value] : []);
  const seen = new Set<string>();
  const opportunities = feeds
    .flatMap(feed => feed.opportunities)
    .filter(item => {
      if (query.region && !opportunityMatchesRegion(item, query.region)) return false;
      const key = fingerprint(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => (a.deadlineAt ? Date.parse(a.deadlineAt) : Number.MAX_SAFE_INTEGER) - (b.deadlineAt ? Date.parse(b.deadlineAt) : Number.MAX_SAFE_INTEGER))
    .slice(0, query.limit);

  return {
    opportunities,
    total: opportunities.length,
    fetchedAt: feeds.map(feed => feed.fetchedAt).sort().at(-1) || new Date().toISOString(),
    source: feeds.length > 1 ? "Find a Tender + Contracts Finder" : feeds[0].source,
    diagnostics,
  };
}
