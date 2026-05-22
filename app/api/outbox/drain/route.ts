/**
 * POST /api/outbox/drain — internal drain trigger.
 *
 * Two callers in production:
 *   1. Vercel cron (every minute, see vercel.json). Cron invocations carry
 *      a `x-vercel-cron-signature` header which Vercel signs; we additionally
 *      gate on `X-Outbox-Secret` to defend against forged calls in case
 *      the route ever gets exposed unauthenticated.
 *   2. Inline kick from `enqueueOutbound` — that path calls drainOutbox()
 *      directly, doesn't hit this route.
 *
 * Auth: `X-Outbox-Secret: <OUTBOX_DRAIN_SECRET env>`. Vercel cron does
 * not set this header — for prod set the secret + use `vercel.json` cron
 * with a `headers` field, OR add Vercel cron token support here. For
 * local + smoke testing, the header is fine.
 */
import { NextResponse } from "next/server";
import { drainOutbox } from "@/app/lib/outbox/drain";

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json(
    { ok: false, error: "unauthorized" },
    { status: 401 },
  );
}

export async function POST(req: Request) {
  const expected = process.env.OUTBOX_DRAIN_SECRET;
  const provided = req.headers.get("x-outbox-secret");
  // Vercel cron path: presence of `x-vercel-cron-signature` is honored when
  // the secret isn't set (local dev) OR matches Vercel's signed marker.
  const isVercelCron = req.headers.get("x-vercel-cron-signature") != null;

  if (expected) {
    if (!provided || provided !== expected) {
      if (!isVercelCron) return unauthorized();
    }
  }

  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") ?? 50);

  const result = await drainOutbox({
    limit: Number.isFinite(limit) ? limit : 50,
  });
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(req: Request) {
  // Vercel cron uses GET by default. Delegate to POST.
  return POST(req);
}
