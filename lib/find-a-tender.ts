import { unstable_cache } from "next/cache";
import { z } from "zod";
import type { TenderFeed, TenderOpportunity, TenderSearchInput } from "@/lib/contracts-finder";
import { normaliseTenderSearch } from "@/lib/contracts-finder";

const FTS_RELEASES_URL = "https://www.find-tender.service.gov.uk/api/1.0/ocdsReleasePackages";
const CLEANING_CODES = /^(909|98341130)/;
const CLEANING_TERMS = /\b(cleaning services?|commercial cleaning|building cleaning|office cleaning|school cleaning|window cleaning|janitorial|caretaker|washroom|deep clean(?:ing)?)\b/i;

const ClassificationSchema = z.object({ id: z.string(), description: z.string().nullish() });
const ReleaseSchema = z.object({
  id: z.string(),
  ocid: z.string(),
  date: z.string().nullish(),
  description: z.string().nullish(),
  buyer: z.object({ name: z.string().nullish() }).nullish(),
  parties: z.array(z.object({
    name: z.string().nullish(),
    roles: z.array(z.string()).nullish(),
    address: z.object({ locality: z.string().nullish(), region: z.string().nullish() }).nullish(),
  })).nullish(),
  tender: z.object({
    title: z.string(),
    description: z.string().nullish(),
    status: z.string().nullish(),
    classification: ClassificationSchema.nullish(),
    items: z.array(z.object({
      additionalClassifications: z.array(ClassificationSchema).nullish(),
      deliveryAddresses: z.array(z.object({ region: z.string().nullish() })).nullish(),
      deliveryLocation: z.object({ description: z.string().nullish() }).nullish(),
    })).nullish(),
    value: z.object({ amount: z.number().nullish(), currency: z.string().nullish() }).nullish(),
    tenderPeriod: z.object({ endDate: z.string().nullish() }).nullish(),
  }),
});

const PageSchema = z.object({
  releases: z.array(ReleaseSchema),
  links: z.object({ next: z.string().url().nullish() }).nullish(),
});

type FtsRelease = z.infer<typeof ReleaseSchema>;

const regionNames: Record<string, string> = {
  UKC: "North East", UKD: "North West", UKE: "Yorkshire and the Humber", UKF: "East Midlands",
  UKG: "West Midlands", UKH: "East of England", UKI: "London", UKJ: "South East", UKK: "South West",
  UKL: "Wales", UKM: "Scotland", UKN: "Northern Ireland", UK: "United Kingdom",
};

function validDate(value?: string | null) {
  return value && Number.isFinite(Date.parse(value)) ? value : null;
}

function releaseRegion(release: FtsRelease) {
  const delivery = release.tender.items?.flatMap(item => item.deliveryAddresses || []).find(address => address.region)?.region;
  const location = release.tender.items?.find(item => item.deliveryLocation?.description)?.deliveryLocation?.description;
  const buyer = release.parties?.find(party => party.roles?.includes("buyer"));
  const raw = location || delivery || buyer?.address?.locality || buyer?.address?.region || "Location not stated";
  const prefix = Object.keys(regionNames).sort((a, b) => b.length - a.length).find(code => raw.startsWith(code));
  return prefix ? regionNames[prefix] : raw;
}

function classifications(release: FtsRelease) {
  return [release.tender.classification, ...(release.tender.items?.flatMap(item => item.additionalClassifications || []) || [])].filter((item): item is z.infer<typeof ClassificationSchema> => Boolean(item));
}

export function parseFindATenderReleases(releases: unknown[], input: TenderSearchInput = {}, now = Date.now()): TenderOpportunity[] {
  const query = normaliseTenderSearch(input);
  const keyword = query.keyword.toLowerCase();
  const seen = new Set<string>();
  return releases
    .map(value => ReleaseSchema.parse(value))
    .filter(release => {
      if (seen.has(release.id)) return false;
      seen.add(release.id);
      const codes = classifications(release).map(item => item.id);
      const text = `${release.tender.title} ${release.tender.description || ""}`;
      const isCleaning = codes.some(code => CLEANING_CODES.test(code)) || CLEANING_TERMS.test(text);
      const matchesKeyword = keyword === "cleaning" || text.toLowerCase().includes(keyword);
      const deadline = validDate(release.tender.tenderPeriod?.endDate);
      return isCleaning && matchesKeyword && release.tender.status === "active" && (!deadline || Date.parse(deadline) > now);
    })
    .map((release): TenderOpportunity => {
      const codes = classifications(release);
      const amount = release.tender.value?.currency === "GBP" && (release.tender.value.amount || 0) > 0 ? release.tender.value.amount! : null;
      return {
        id: release.ocid,
        reference: release.id,
        title: release.tender.title.trim(),
        description: (release.tender.description || release.description || "No description supplied by the buyer.").replace(/\s+/g, " ").trim(),
        buyer: release.buyer?.name || "Buyer not stated",
        region: releaseRegion(release),
        publishedAt: validDate(release.date),
        deadlineAt: validDate(release.tender.tenderPeriod?.endDate),
        valueLow: null,
        valueHigh: amount,
        suitableForSme: false,
        cpvCodes: [...new Set(codes.map(item => item.id))],
        category: codes[0]?.description || "Cleaning services",
        status: "Open",
        source: "Find a Tender",
        sourceUrl: `https://www.find-tender.service.gov.uk/Notice/${encodeURIComponent(release.id)}`,
      };
    })
    .filter(item => !query.region || item.region === query.region || item.region.toLowerCase().includes(query.region.toLowerCase()))
    .filter(item => !query.suitableForSme || item.suitableForSme)
    .sort((a, b) => (a.deadlineAt ? Date.parse(a.deadlineAt) : Number.MAX_SAFE_INTEGER) - (b.deadlineAt ? Date.parse(b.deadlineAt) : Number.MAX_SAFE_INTEGER))
    .slice(0, query.limit);
}

async function fetchUncached(serialisedInput: string): Promise<TenderFeed> {
  const input = normaliseTenderSearch(JSON.parse(serialisedInput) as TenderSearchInput);
  const updatedFrom = new Date(Date.now() - 45 * 86_400_000).toISOString().slice(0, 19);
  let nextUrl: string | null = `${FTS_RELEASES_URL}?stages=tender&updatedFrom=${encodeURIComponent(updatedFrom)}&limit=100`;
  const releases: unknown[] = [];
  for (let page = 0; nextUrl && page < 5; page += 1) {
    const response = await fetch(nextUrl, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(12_000) });
    if (!response.ok) throw new Error(`Find a Tender returned HTTP ${response.status}`);
    const parsed = PageSchema.parse(await response.json());
    releases.push(...parsed.releases);
    nextUrl = parsed.links?.next || null;
  }
  const opportunities = parseFindATenderReleases(releases, input);
  return { opportunities, total: opportunities.length, fetchedAt: new Date().toISOString(), source: "Find a Tender" };
}

const fetchCached = unstable_cache(fetchUncached, ["find-a-tender-cleaning-v1"], { revalidate: 15 * 60 });

export function fetchFindATenderCleaning(input: TenderSearchInput = {}) {
  return fetchCached(JSON.stringify(normaliseTenderSearch(input)));
}
