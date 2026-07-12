import { NextRequest, NextResponse } from "next/server";
import { fetchLiveCleaningTenders } from "@/lib/tender-feed";
import { processTenderWatches } from "@/lib/alerts";
import { constantTimeSecretEqual } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * Called by Render Cron (or manually) to scan live tenders and notify watches.
 * Protect with ALERTS_CRON_SECRET header: Authorization: Bearer <secret>
 * If no secret is configured, only non-production environments may run this.
 */
export async function POST(req: NextRequest) {
  const configured = process.env.ALERTS_CRON_SECRET || process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const headerSecret = req.headers.get("x-cron-secret") || "";

  if (configured) {
    const ok = (bearer && constantTimeSecretEqual(bearer, configured))
      || (headerSecret && constantTimeSecretEqual(headerSecret, configured));
    if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "ALERTS_CRON_SECRET is not configured" }, { status: 503 });
  }

  try {
    // Broad fetch; per-watch filters applied in processTenderWatches.
    const feed = await fetchLiveCleaningTenders({ keyword: "cleaning", limit: 50 });
    const result = await processTenderWatches(feed.opportunities);
    return NextResponse.json({
      ok: true,
      fetched: feed.opportunities.length,
      source: feed.source,
      ...result,
    });
  } catch (error) {
    console.error("Tender watch check failed", { name: error instanceof Error ? error.name : "UnknownError" });
    return NextResponse.json({ ok: false, error: "Tender watch check failed" }, { status: 502 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
