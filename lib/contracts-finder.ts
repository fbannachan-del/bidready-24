import { unstable_cache } from "next/cache";
import { z } from "zod";
import {
  cleaningTenderRegions,
  contractsFinderRegionParam,
  normaliseRegionLabel,
  opportunityMatchesRegion,
} from "@/lib/tender-regions";

const CONTRACTS_FINDER_SEARCH_URL = "https://www.contractsfinder.service.gov.uk/api/rest/2/search_notices/json";
const CLEANING_CPV_CODES = [
  "90900000", "90910000", "90911000", "90911100", "90911200",
  "90911300", "90919000", "90919200", "90919300", "98341130",
] as const;

const NoticeItemSchema = z.object({
  id: z.string().uuid(),
  noticeIdentifier: z.string().nullish(),
  title: z.string(),
  description: z.string().nullish(),
  cpvDescription: z.string().nullish(),
  cpvDescriptionExpanded: z.string().nullish(),
  publishedDate: z.string().nullish(),
  deadlineDate: z.string().nullish(),
  valueLow: z.number().nullish(),
  valueHigh: z.number().nullish(),
  noticeType: z.string().nullish(),
  noticeStatus: z.string().nullish(),
  isSuitableForSme: z.boolean().nullish(),
  organisationName: z.string().nullish(),
  cpvCodes: z.string().nullish(),
  region: z.string().nullish(),
  regionText: z.string().nullish(),
});

const SearchResponseSchema = z.object({
  hitCount: z.number().int().nonnegative(),
  noticeList: z.array(z.object({ item: NoticeItemSchema })),
});

export type TenderOpportunity = {
  id: string;
  reference: string | null;
  title: string;
  description: string;
  buyer: string;
  region: string;
  publishedAt: string | null;
  deadlineAt: string | null;
  valueLow: number | null;
  valueHigh: number | null;
  suitableForSme: boolean;
  cpvCodes: string[];
  category: string;
  status: string;
  source: "Contracts Finder" | "Find a Tender";
  sourceUrl: string;
};

export type TenderSearchInput = {
  keyword?: string;
  region?: string;
  suitableForSme?: boolean;
  limit?: number;
};

export type TenderSourceDiagnostics = {
  ok: boolean;
  count: number;
  error?: string;
};

export type TenderFeed = {
  opportunities: TenderOpportunity[];
  total: number;
  fetchedAt: string;
  source: "Contracts Finder" | "Find a Tender" | "Find a Tender + Contracts Finder";
  diagnostics?: {
    findATender: TenderSourceDiagnostics;
    contractsFinder: TenderSourceDiagnostics;
  };
};

function decodeHtml(value: string): string {
  const named: Record<string, string> = { amp: "&", apos: "'", quot: '"', lt: "<", gt: ">", nbsp: " " };
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const hex = entity[1]?.toLowerCase() === "x";
      const code = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isSafeInteger(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return named[entity.toLowerCase()] ?? match;
  }).replace(/\s+/g, " ").trim();
}

export function normaliseTenderSearch(input: TenderSearchInput = {}): Required<TenderSearchInput> {
  const keyword = (input.keyword ?? "cleaning").trim().slice(0, 100) || "cleaning";
  const region = (input.region ?? "").trim().slice(0, 80);
  const limit = Math.min(50, Math.max(1, Math.trunc(input.limit ?? 24)));
  return { keyword, region, suitableForSme: Boolean(input.suitableForSme), limit };
}

function validDate(value: string | null | undefined): string | null {
  return value && Number.isFinite(Date.parse(value)) ? value : null;
}

export function parseContractsFinderFeed(
  payload: unknown,
  now = Date.now(),
  input: TenderSearchInput = {},
): Omit<TenderFeed, "fetchedAt"> {
  const query = normaliseTenderSearch(input);
  const parsed = SearchResponseSchema.parse(payload);
  const seen = new Set<string>();
  const opportunities = parsed.noticeList
    .map(({ item }): TenderOpportunity => ({
      id: item.id,
      reference: item.noticeIdentifier || null,
      title: decodeHtml(item.title),
      description: decodeHtml(item.description || "No description supplied by the buyer."),
      buyer: decodeHtml(item.organisationName || "Buyer not stated"),
      region: normaliseRegionLabel(decodeHtml(item.regionText || item.region || "")),
      publishedAt: validDate(item.publishedDate),
      deadlineAt: validDate(item.deadlineDate),
      valueLow: item.valueLow && item.valueLow > 0 ? item.valueLow : null,
      valueHigh: item.valueHigh && item.valueHigh > 0 ? item.valueHigh : null,
      suitableForSme: item.isSuitableForSme === true,
      cpvCodes: (item.cpvCodes || "").split(/[\s,]+/).filter(Boolean),
      category: decodeHtml(item.cpvDescription || item.cpvDescriptionExpanded || "Cleaning services"),
      status: item.noticeStatus || "Open",
      source: "Contracts Finder",
      sourceUrl: `https://www.contractsfinder.service.gov.uk/Notice/${encodeURIComponent(item.id)}`,
    }))
    .filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      if (item.deadlineAt && Date.parse(item.deadlineAt) <= now) return false;
      if (query.region && !opportunityMatchesRegion(item, query.region)) return false;
      if (query.suitableForSme && !item.suitableForSme) return false;
      return true;
    })
    .sort((a, b) => (a.deadlineAt ? Date.parse(a.deadlineAt) : Number.MAX_SAFE_INTEGER) - (b.deadlineAt ? Date.parse(b.deadlineAt) : Number.MAX_SAFE_INTEGER))
    .slice(0, query.limit);
  return { opportunities, total: opportunities.length, source: "Contracts Finder" };
}

async function fetchUncached(serialisedInput: string): Promise<TenderFeed> {
  const input = normaliseTenderSearch(JSON.parse(serialisedInput) as TenderSearchInput);
  // Over-fetch when region filtering is applied client-side so CF's loose API
  // region param does not starve the post-filter.
  const requestSize = input.region ? Math.min(50, Math.max(input.limit * 3, 24)) : input.limit;
  const searchCriteria: Record<string, unknown> = {
    types: ["Contract"],
    statuses: ["Open"],
    keyword: input.keyword,
    cpvCodes: [...CLEANING_CPV_CODES],
  };
  const cfRegion = contractsFinderRegionParam(input.region);
  if (cfRegion) searchCriteria.regions = [cfRegion];
  if (input.suitableForSme) searchCriteria.suitableForSme = true;

  const response = await fetch(CONTRACTS_FINDER_SEARCH_URL, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({ searchCriteria, size: requestSize }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Contracts Finder returned HTTP ${response.status}`);

  return { ...parseContractsFinderFeed(await response.json(), Date.now(), input), fetchedAt: new Date().toISOString() };
}

const fetchCached = unstable_cache(fetchUncached, ["contracts-finder-cleaning-v2"], { revalidate: 15 * 60 });

export async function fetchCleaningTenders(input: TenderSearchInput = {}): Promise<TenderFeed> {
  return fetchCached(JSON.stringify(normaliseTenderSearch(input)));
}

export { cleaningTenderRegions };
