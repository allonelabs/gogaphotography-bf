/**
 * POST /api/outbox/drain — internal drain trigger.
 *
 * Two callers in production:
 *   1. An external cron hitting this route with
 *      `Authorization: Bearer <OUTBOX_DRAIN_SECRET or CRON_SECRET>`.
 *   2. Inline kick from `enqueueOutbound` — that path calls drainOutbox()
 *      directly, doesn't hit this route.
 *
 * Auth is fail-closed: if neither OUTBOX_DRAIN_SECRET nor CRON_SECRET is
 * configured, every request is rejected rather than silently allowed
 * through. A prior version also honored a bare `x-vercel-cron-signature`
 * header as a bypass — that header isn't verified by us in any way, so
 * any caller could set it and skip the secret check entirely. Removed.
 */
import { NextResponse } from "next/server";
import { drainOutbox } from "@/app/lib/outbox/drain";

export const dynamic = "force-dynamic";

const MAX_LIMIT = 50;

function unauthorized() {
  return NextResponse.json(
    { ok: false, error: "unauthorized" },
    { status: 401 },
  );
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function isAuthorized(req: Request): boolean {
  const outboxSecret = process.env.OUTBOX_DRAIN_SECRET;
  const cronSecret = process.env.CRON_SECRET;
  if (!outboxSecret && !cronSecret) return false;

  const header = req.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!provided) return false;

  if (outboxSecret && safeEqual(provided, outboxSecret)) return true;
  if (cronSecret && safeEqual(provided, cronSecret)) return true;
  return false;
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) return unauthorized();

  const url = new URL(req.url);
  const requested = Number(url.searchParams.get("limit") ?? MAX_LIMIT);
  const limit =
    Number.isFinite(requested) && requested > 0
      ? Math.min(requested, MAX_LIMIT)
      : MAX_LIMIT;

  const result = await drainOutbox({ limit });
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(req: Request) {
  // Vercel cron uses GET by default. Delegate to POST.
  return POST(req);
}
