import { NextResponse, type NextRequest } from "next/server";
import { gogaAdmin } from "@/app/lib/supabase/goga";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Token-authenticated widget feed. Designed for the iPhone Scriptable
 * widget — hit `/api/widget?t=<WIDGET_TOKEN>` from the phone and get a
 * compact JSON snapshot of the studio's live state. Constant-time
 * comparison; rejects if WIDGET_TOKEN env is missing (fail-closed).
 */

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function GET(req: NextRequest) {
  const expected = process.env["WIDGET_TOKEN"];
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "widget_token_unset" },
      { status: 503 },
    );
  }
  const provided = new URL(req.url).searchParams.get("t") ?? "";
  if (!safeEqual(provided, expected)) {
    return NextResponse.json(
      { ok: false, error: "forbidden" },
      { status: 403 },
    );
  }

  const sb = gogaAdmin();
  const today = new Date();
  const ymd = (d: Date) =>
    `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  const horizon = new Date(today.getTime() + 30 * 86400000);

  const [
    { count: activeLeads },
    { count: openBookings },
    { count: awaitingSignature },
    { data: nextShoots },
    { data: recentEvents },
  ] = await Promise.all([
    sb
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("archived", false),
    sb
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .in("status", ["reserved", "confirmed"]),
    sb
      .from("contracts")
      .select("id", { count: "exact", head: true })
      .eq("status", "sent"),
    sb
      .from("bookings")
      .select("id, client_name, shoot_date, shoot_time, location, status")
      .gte("shoot_date", ymd(today))
      .lte("shoot_date", ymd(horizon))
      .order("shoot_date", { ascending: true })
      .order("shoot_time", { ascending: true, nullsFirst: false })
      .limit(3),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sb as any)
      .from("admin_events")
      .select("kind, created_at")
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  return NextResponse.json(
    {
      ok: true,
      generated_at: new Date().toISOString(),
      counts: {
        active_leads: activeLeads ?? 0,
        open_bookings: openBookings ?? 0,
        awaiting_signature: awaitingSignature ?? 0,
      },
      next_shoots: (nextShoots ?? []).map((b) => ({
        id: b.id,
        client: b.client_name,
        date: b.shoot_date,
        time: b.shoot_time,
        location: b.location,
        status: b.status,
      })),
      recent_events: (recentEvents ?? []).map(
        (e: { kind: string; created_at: string }) => ({
          kind: e.kind,
          at: e.created_at,
        }),
      ),
    },
    {
      headers: {
        // Short cache so the widget hits Vercel's edge instead of the
        // function on every refresh, but stays fresh enough.
        "cache-control": "public, s-maxage=30, stale-while-revalidate=120",
      },
    },
  );
}
