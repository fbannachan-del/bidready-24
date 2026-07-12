import { NextRequest, NextResponse } from "next/server";
import { fetchLiveCleaningTenders } from "@/lib/tender-feed";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const keyword = request.nextUrl.searchParams.get("q") || undefined;
  const region = request.nextUrl.searchParams.get("region") || undefined;
  const suitableForSme = request.nextUrl.searchParams.get("sme") === "1";
  const requestedLimit = Number(request.nextUrl.searchParams.get("limit") || 24);
  const limit = Number.isFinite(requestedLimit) ? requestedLimit : 24;

  try {
    const feed = await fetchLiveCleaningTenders({ keyword, region, suitableForSme, limit });
    return NextResponse.json(feed, {
      headers: { "cache-control": "public, max-age=60, s-maxage=900, stale-while-revalidate=3600" },
    });
  } catch (error) {
    console.error("Tender feed refresh failed", { name: error instanceof Error ? error.name : "UnknownError" });
    return NextResponse.json({ error: "The live tender feed is temporarily unavailable." }, { status: 502 });
  }
}
