/**
 * Shared UK region normalisation and filter matching for tender feeds.
 * Ensures FTS NUTS codes and Contracts Finder labels resolve to the same set.
 */

export const CANONICAL_REGIONS = [
  "London",
  "South East",
  "South West",
  "East of England",
  "East Midlands",
  "West Midlands",
  "North East",
  "North West",
  "Yorkshire and the Humber",
  "Wales",
  "Scotland",
  "Northern Ireland",
] as const;

export type CanonicalRegion = (typeof CANONICAL_REGIONS)[number];

/** Dropdown options — exclude data placeholders like "Any region". */
export const cleaningTenderRegions = [...CANONICAL_REGIONS] as const;

const NUTS_TO_REGION: Record<string, CanonicalRegion | "United Kingdom"> = {
  UKC: "North East",
  UKD: "North West",
  UKE: "Yorkshire and the Humber",
  UKF: "East Midlands",
  UKG: "West Midlands",
  UKH: "East of England",
  UKI: "London",
  UKJ: "South East",
  UKK: "South West",
  UKL: "Wales",
  UKM: "Scotland",
  UKN: "Northern Ireland",
  UK: "United Kingdom",
};

const ALIASES: Record<string, CanonicalRegion> = {
  scotland: "Scotland",
  "northern ireland": "Northern Ireland",
  ni: "Northern Ireland",
  wales: "Wales",
  london: "London",
  "south east": "South East",
  "south-east": "South East",
  "south west": "South West",
  "south-west": "South West",
  "east of england": "East of England",
  "east midlands": "East Midlands",
  "west midlands": "West Midlands",
  "north east": "North East",
  "north-east": "North East",
  "north west": "North West",
  "north-west": "North West",
  yorkshire: "Yorkshire and the Humber",
  "yorkshire and the humber": "Yorkshire and the Humber",
  "yorkshire & the humber": "Yorkshire and the Humber",
};

/** Location keywords used when official region is missing or "Any region". */
const REGION_HINTS: Record<CanonicalRegion, RegExp> = {
  Scotland: /\b(scotland|scottish|edinburgh|glasgow|aberdeen|dundee|inverness|stirling|fife|lothian|highland|orkney|shetland|western isles|argyll|renfrew|lanark|ayrshire|borders|dumfries|galloway|moray|perth|angus|clackmannan|falkirk|west lothian|east lothian|midlothian|ukm\d*)\b/i,
  "Northern Ireland": /\b(northern ireland|\bni\b|belfast|derry|londonderry|antrim|armagh|down|fermanagh|tyrone|ukn\d*)\b/i,
  Wales: /\b(wales|welsh|cardiff|swansea|newport|wrexham|gwynedd|powys|cymru|ukl\d*)\b/i,
  London: /\b(london|greater london|city of london|westminster|uki\d*)\b/i,
  "South East": /\b(south east|hampshire|kent|surrey|sussex|oxfordshire|berkshire|buckinghamshire|isle of wight|ukj\d*)\b/i,
  "South West": /\b(south west|cornwall|devon|dorset|somerset|bristol|gloucestershire|wiltshire|ukk\d*)\b/i,
  "East of England": /\b(east of england|east anglia|norfolk|suffolk|essex|cambridgeshire|hertfordshire|bedfordshire|ukh\d*)\b/i,
  "East Midlands": /\b(east midlands|nottingham|leicester|derby|lincolnshire|northamptonshire|rutland|ukf\d*)\b/i,
  "West Midlands": /\b(west midlands|birmingham|coventry|staffordshire|warwickshire|worcestershire|shropshire|herefordshire|ukg\d*)\b/i,
  "North East": /\b(north east|newcastle|sunderland|durham|teeside|teesside|tyne and wear|northumberland|ukc\d*)\b/i,
  "North West": /\b(north west|manchester|liverpool|lancashire|cumbria|cheshire|merseyside|ukd\d*)\b/i,
  "Yorkshire and the Humber": /\b(yorkshire|humber|leeds|sheffield|bradford|hull|york|uke\d*)\b/i,
};

const UNSPECIFIED = /^(any region|location not stated|not stated|united kingdom|uk|national|all regions)?$/i;

export function normaliseRegionLabel(raw: string | null | undefined): string {
  const value = (raw || "").trim();
  if (!value || UNSPECIFIED.test(value)) return "Location not stated";

  const nuts = Object.keys(NUTS_TO_REGION).sort((a, b) => b.length - a.length).find((code) => value.toUpperCase().startsWith(code));
  if (nuts) {
    const mapped = NUTS_TO_REGION[nuts];
    return mapped === "United Kingdom" ? "Location not stated" : mapped;
  }

  const lower = value.toLowerCase().replace(/\s+/g, " ");
  if (ALIASES[lower]) return ALIASES[lower];

  for (const region of CANONICAL_REGIONS) {
    if (lower === region.toLowerCase() || lower.includes(region.toLowerCase())) return region;
  }

  // Locality strings such as "Edinburgh and the Lothians" → canonical nation/region.
  for (const region of CANONICAL_REGIONS) {
    if (REGION_HINTS[region].test(value)) return region;
  }

  return value;
}

export function opportunityLocationBlob(item: {
  region?: string | null;
  title?: string | null;
  description?: string | null;
  buyer?: string | null;
}): string {
  return [item.region, item.title, item.description, item.buyer].filter(Boolean).join(" ");
}

/**
 * True when the opportunity should appear under the selected region filter.
 * Unspecified regions only match a named region if location text strongly hints at it.
 */
export function opportunityMatchesRegion(
  item: { region?: string | null; title?: string | null; description?: string | null; buyer?: string | null },
  regionFilter: string,
): boolean {
  const wanted = regionFilter.trim();
  if (!wanted || /^any region|all regions$/i.test(wanted)) return true;

  const normalisedWanted = normaliseRegionLabel(wanted);
  const itemRegion = normaliseRegionLabel(item.region);
  if (itemRegion === normalisedWanted) return true;
  if (itemRegion.toLowerCase().includes(normalisedWanted.toLowerCase())) return true;

  // Do not treat "Location not stated" / generic UK as a match for Scotland etc. unless text hints.
  const blob = opportunityLocationBlob({ ...item, region: item.region });
  const hint = REGION_HINTS[normalisedWanted as CanonicalRegion];
  if (hint && hint.test(blob)) return true;

  return false;
}

/** Contracts Finder API region parameter values (their catalogue labels). */
export function contractsFinderRegionParam(regionFilter: string): string | undefined {
  const normalised = normaliseRegionLabel(regionFilter);
  if (!normalised || normalised === "Location not stated") return undefined;
  return normalised;
}
