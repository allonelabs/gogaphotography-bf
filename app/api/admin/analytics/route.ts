import "server-only";

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  getTotals,
  getBreakdown,
  getDaily,
  errorMessage,
  MAX_RANGE_DAYS,
  type Dimension,
} from "@/app/lib/goga/analytics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Proxy so VERCEL_TOKEN stays on the server. That token can read other account
// resources, not just analytics, so it is treated like the service key: never
// shipped to the browser, never echoed back in a response.

const DIMENSIONS: Dimension[] = [
  "country",
  "deviceType",
  "requestPath",
  "referrerHostname",
  "browserName",
  "osName",
];

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const days = Math.min(
    Math.max(1, Number(url.searchParams.get("days") ?? 7) || 7),
    MAX_RANGE_DAYS,
  );
  const by = url.searchParams.get("by");

  // Allow-list the dimension: it is interpolated into the upstream query, and
  // an arbitrary value from the URL has no business going there.
  if (by !== null && !DIMENSIONS.includes(by as Dimension)) {
    return NextResponse.json({ error: "unknown dimension" }, { status: 400 });
  }

  const result = by
    ? await getBreakdown(by as Dimension, days)
    : url.searchParams.get("series") === "1"
      ? await getDaily(days)
      : await getTotals(days);

  if (!result.ok) {
    // 200 with an explanation: an unconfigured or not-yet-enabled integration
    // is a state the dashboard renders, not a request failure.
    return NextResponse.json({
      error: result.error.kind,
      message: errorMessage(result.error),
    });
  }

  return NextResponse.json({ data: result.data });
}
