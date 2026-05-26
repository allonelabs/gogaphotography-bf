import { NextResponse } from "next/server";
import { gogaAdmin } from "@/app/lib/supabase/goga";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ token: string }> };

const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 6;
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

/**
 * Record a signature for the contract with the given token. Validates that
 * the contract is not signed or void, decodes the data-URL PNG, uploads it
 * to the private `contracts` bucket, and stamps signer_ip + user_agent +
 * timestamp on the row. Also advances the linked lead to 'shoot' stage.
 */
export async function POST(req: Request, ctx: RouteCtx) {
  const { token } = await ctx.params;
  const ip = clientIp(req);
  if (rateLimited(`${ip}|${token}`)) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      { status: 429 },
    );
  }

  let body: { signerName?: string; signatureDataUrl?: string };
  try {
    body = (await req.json()) as {
      signerName?: string;
      signatureDataUrl?: string;
    };
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const signerName = (body.signerName ?? "").trim();
  const dataUrl = (body.signatureDataUrl ?? "").trim();
  if (!signerName) {
    return NextResponse.json(
      { ok: false, error: "missing_name" },
      { status: 400 },
    );
  }
  if (!dataUrl.startsWith("data:image/png;base64,")) {
    return NextResponse.json(
      { ok: false, error: "bad_signature" },
      { status: 400 },
    );
  }
  if (dataUrl.length > 250_000) {
    return NextResponse.json(
      { ok: false, error: "signature_too_large" },
      { status: 413 },
    );
  }

  const sb = gogaAdmin();
  const { data: contract } = await sb
    .from("contracts")
    .select("id, booking_id, status, signer_email")
    .eq("token", token)
    .maybeSingle();
  if (!contract) {
    return NextResponse.json(
      { ok: false, error: "not_found" },
      { status: 404 },
    );
  }
  if (contract.status === "signed") {
    return NextResponse.json(
      { ok: false, error: "already_signed" },
      { status: 409 },
    );
  }
  if (contract.status === "void") {
    return NextResponse.json({ ok: false, error: "void" }, { status: 410 });
  }

  // Decode PNG → bytes
  const b64 = dataUrl.slice("data:image/png;base64,".length);
  let bytes: Uint8Array;
  try {
    const bin = atob(b64);
    bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  } catch {
    return NextResponse.json(
      { ok: false, error: "bad_signature" },
      { status: 400 },
    );
  }

  const path = `${contract.id}/signature-${Date.now()}.png`;
  const { error: upErr } = await sb.storage
    .from("contracts")
    .upload(path, bytes, {
      contentType: "image/png",
      cacheControl: "31536000",
      upsert: false,
    });
  if (upErr) {
    console.error("[sign] upload error", upErr);
    return NextResponse.json(
      { ok: false, error: "upload_failed" },
      { status: 500 },
    );
  }

  await sb
    .from("contracts")
    .update({
      status: "signed",
      signer_name: signerName,
      signed_at: new Date().toISOString(),
      signed_ip: ip,
      signed_user_agent: req.headers.get("user-agent"),
      signature_path: path,
    })
    .eq("id", contract.id);

  // Stamp contract_status on the booking + advance lead
  await sb
    .from("bookings")
    .update({ contract_status: "signed" })
    .eq("id", contract.booking_id);

  const { data: booking } = await sb
    .from("bookings")
    .select("lead_id")
    .eq("id", contract.booking_id)
    .maybeSingle();
  if (booking?.lead_id) {
    await sb.from("leads").update({ stage: "shoot" }).eq("id", booking.lead_id);
    await sb.from("lead_events").insert({
      lead_id: booking.lead_id,
      kind: "contract.signed",
      payload: { contractId: contract.id, signerName },
      actor: "client",
    });
  }

  return NextResponse.json({ ok: true });
}
