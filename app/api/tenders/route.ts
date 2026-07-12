import { NextRequest, NextResponse } from "next/server";
import { fetchLiveCleaningTenders } from "@/lib/tender-feed";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const keyword = request.nextUrl.searchParams.get("q") || undefined;
  const region = request.nextUrl.searchParams.get("region") || undefined;
  const suitableForSme = request.nextUrl.searchParams.get("sme") === "1";
  const requestedLimit = Number(request.nextUrl.searchParams.get("limit") || 24);
  const limit = Number.isFinite(requestedLimit) ? requestedLimit : 24;
  const includeDiagnostics = request.nextUrl.searchParams.get("debug") === "1"
    && process.env.NODE_ENV !== "production";

  try {
    const feed = await fetchLiveCleaningTenders({ keyword, region, suitableForSme, limit });
    // Opportunistic watch processing — full scans should use /api/alerts/check-tenders on a cron.
    void import("@/lib/alerts")
      .then(({ processTenderWatches }) => processTenderWatches(feed.opportunities))
      .catch((err) => console.error("Background tender watch pass failed", { name: err instanceof Error ? err.name : "UnknownError" }));
    const body = includeDiagnostics
      ? feed
      : { opportunities: feed.opportunities, total: feed.total, fetchedAt: feed.fetchedAt, source: feed.source };
    return NextResponse.json(body, {
      headers: { "cache-control": "public, max-age=60, s-maxage=900, stale-while-revalidate=3600" },
    });
  } catch (error) {
    const diagnostics = error && typeof error === "object" && "diagnostics" in error
      ? (error as { diagnostics?: unknown }).diagnostics
      : undefined;
    console.error("Tender feed refresh failed", {
      name: error instanceof Error ? error.name : "UnknownError",
      diagnostics,
    });
    return NextResponse.json(
      {
        error: "The live tender feed is temporarily unavailable.",
        ...(includeDiagnostics && diagnostics ? { diagnostics } : {}),
      },
      { status: 502 },
    );
  }
}
