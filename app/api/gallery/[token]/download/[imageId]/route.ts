import { NextResponse } from "next/server";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { hasDeliveryCookie, loadDelivery } from "@/app/lib/goga/delivery-gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ token: string; imageId: string }> };

export async function GET(_req: Request, ctx: RouteCtx) {
  const { token, imageId } = await ctx.params;
  const delivery = await loadDelivery(token);
  if (!delivery || delivery.archived) {
    return NextResponse.json(
      { ok: false, error: "not_found" },
      { status: 404 },
    );
  }
  if (!delivery.downloads_enabled) {
    return NextResponse.json(
      { ok: false, error: "downloads_disabled" },
      { status: 403 },
    );
  }
  if (!(await hasDeliveryCookie(token))) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  const sb = gogaAdmin();
  const { data: img } = await sb
    .from("delivery_images")
    .select("id, image_path, download_count")
    .eq("id", imageId)
    .eq("delivery_id", delivery.id)
    .maybeSingle();
  if (!img) {
    return NextResponse.json(
      { ok: false, error: "image_not_found" },
      { status: 404 },
    );
  }

  const { data: signed, error } = await sb.storage
    .from("deliveries")
    .createSignedUrl(img.image_path, 120, { download: true });
  if (error || !signed?.signedUrl) {
    return NextResponse.json(
      { ok: false, error: "sign_failed" },
      { status: 500 },
    );
  }

  // Best-effort increment. PostgREST can't express atomic `count = count+1`,
  // so under concurrent downloads we may lose a few — that's acceptable for
  // an analytics counter. Await so failures hit logs instead of being lost.
  const { error: incErr } = await sb
    .from("delivery_images")
    .update({ download_count: img.download_count + 1 })
    .eq("id", img.id);
  if (incErr) console.error("[gallery/download] count++ failed:", incErr);

  return NextResponse.redirect(signed.signedUrl);
}
