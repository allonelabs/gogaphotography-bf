import { NextResponse } from "next/server";
import { verifyPassword } from "@/app/lib/goga/delivery-password";
import {
  loadDelivery,
  deliveryExpired,
  setDeliveryCookie,
} from "@/app/lib/goga/delivery-gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 8;
const ratelimit = new Map<string, number[]>();
function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (ratelimit.get(ip) ?? []).filter(
    (t) => now - t < RATE_WINDOW_MS,
  );
  if (recent.length >= RATE_MAX) return true;
  recent.push(now);
  ratelimit.set(ip, recent);
  return false;
}

type RouteCtx = { params: Promise<{ token: string }> };

export async function POST(req: Request, ctx: RouteCtx) {
  const { token } = await ctx.params;
  if (rateLimited(`${clientIp(req)}|${token}`)) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429 },
    );
  }

  let body: { password?: string };
  try {
    body = (await req.json()) as { password?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const delivery = await loadDelivery(token);
  if (!delivery || delivery.archived) {
    return NextResponse.json(
      { ok: false, error: "not_found" },
      { status: 404 },
    );
  }
  if (deliveryExpired(delivery)) {
    return NextResponse.json({ ok: false, error: "expired" }, { status: 410 });
  }
  if (!delivery.password_hash) {
    const cookie = await setDeliveryCookie(token);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(cookie.name, cookie.value, cookie.options);
    return res;
  }
  const pw = (body.password ?? "").trim();
  if (!pw) {
    return NextResponse.json(
      { ok: false, error: "password_required" },
      { status: 400 },
    );
  }
  const ok = await verifyPassword(pw, delivery.password_hash);
  if (!ok) {
    return NextResponse.json(
      { ok: false, error: "invalid_password" },
      { status: 401 },
    );
  }
  const cookie = await setDeliveryCookie(token);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  return res;
}
