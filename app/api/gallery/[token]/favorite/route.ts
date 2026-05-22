import { NextResponse } from "next/server";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { hasDeliveryCookie, loadDelivery } from "@/app/lib/goga/delivery-gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ token: string }> };

export async function POST(req: Request, ctx: RouteCtx) {
  const { token } = await ctx.params;
  const delivery = await loadDelivery(token);
  if (!delivery || delivery.archived) {
    return NextResponse.json(
      { ok: false, error: "not_found" },
      { status: 404 },
    );
  }
  if (!(await hasDeliveryCookie(token))) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  let body: { imageId?: string; favorite?: boolean };
  try {
    body = (await req.json()) as { imageId?: string; favorite?: boolean };
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }
  const imageId = (body.imageId ?? "").trim();
  if (!imageId) {
    return NextResponse.json(
      { ok: false, error: "missing_image" },
      { status: 400 },
    );
  }

  const sb = gogaAdmin();
  const { data: img } = await sb
    .from("delivery_images")
    .select("id, favorited_at")
    .eq("id", imageId)
    .eq("delivery_id", delivery.id)
    .maybeSingle();
  if (!img) {
    return NextResponse.json(
      { ok: false, error: "image_not_found" },
      { status: 404 },
    );
  }
  const nextFav =
    body.favorite === undefined ? !img.favorited_at : !!body.favorite;
  await sb
    .from("delivery_images")
    .update({ favorited_at: nextFav ? new Date().toISOString() : null })
    .eq("id", imageId);

  return NextResponse.json({ ok: true, favorited: nextFav });
}
