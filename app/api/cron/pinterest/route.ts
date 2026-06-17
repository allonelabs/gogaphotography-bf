// app/api/cron/pinterest/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import {
  getSettings,
  getValidAccessToken,
} from "@/app/lib/goga/pinterest-settings";
import {
  dueItems,
  resolveBoard,
  buildPinPayload,
  type PinPayloadInput,
} from "@/app/lib/goga/pinterest-logic";
import { createPin } from "@/app/lib/pinterest";
import type { PinterestPinRow } from "@/app/lib/db/pinterest-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function coverUrl(path: string | null): string {
  if (!path) return "";
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/projects/${path}`;
}
function origin(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://gogaphotography-bf.vercel.app"
  ).replace(/\/$/, "");
}

type ContentResolved = {
  categorySlug: string | null;
  payload: PinPayloadInput;
};

async function loadContent(
  sb: ReturnType<typeof gogaAdmin>,
  row: PinterestPinRow,
): Promise<ContentResolved | null> {
  if (row.content_type === "blog") {
    const { data } = await sb
      .from("blog_posts")
      .select(
        "slug,title_ka,title_en,excerpt_ka,excerpt_en,cover_image_path,category_id",
      )
      .eq("id", row.content_id)
      .maybeSingle();
    if (!data) return null;
    let categorySlug: string | null = null;
    if (data.category_id) {
      const { data: cat } = await sb
        .from("blog_categories")
        .select("slug")
        .eq("id", data.category_id)
        .maybeSingle();
      categorySlug = cat?.slug ?? null;
    }
    return {
      categorySlug,
      payload: {
        contentType: "blog",
        slug: data.slug,
        titleKa: data.title_ka,
        titleEn: data.title_en,
        excerptKa: data.excerpt_ka,
        excerptEn: data.excerpt_en,
        coverUrl: coverUrl(data.cover_image_path),
        origin: origin(),
      },
    };
  }
  if (row.content_type === "product") {
    const { data } = await sb
      .from("store_products")
      .select("slug,title,description,cover_image_path,type")
      .eq("id", row.content_id)
      .maybeSingle();
    if (!data) return null;
    return {
      categorySlug: data.type,
      payload: {
        contentType: "product",
        slug: data.slug,
        titleKa: data.title,
        titleEn: data.title,
        excerptKa: data.description ?? "",
        excerptEn: data.description ?? "",
        coverUrl: coverUrl(data.cover_image_path),
        origin: origin(),
      },
    };
  }
  // project — bilingual, cover via hero_image_path (fallback to first project_image)
  const { data } = await sb
    .from("projects")
    .select(
      "slug,title_ka,title_en,description_ka,description_en,hero_image_path",
    )
    .eq("id", row.content_id)
    .maybeSingle();
  if (!data) return null;
  let cover = data.hero_image_path as string | null;
  if (!cover) {
    const { data: img } = await sb
      .from("project_images")
      .select("image_path")
      .eq("project_id", row.content_id)
      .order("sort_order")
      .limit(1)
      .maybeSingle();
    cover = img?.image_path ?? null;
  }
  return {
    categorySlug: null,
    payload: {
      contentType: "project",
      slug: data.slug ?? "",
      titleKa: data.title_ka ?? "",
      titleEn: data.title_en ?? "",
      excerptKa: data.description_ka ?? "",
      excerptEn: data.description_en ?? "",
      coverUrl: coverUrl(cover),
      origin: origin(),
    },
  };
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const settings = await getSettings();
  if (!settings.enabled)
    return NextResponse.json({ ok: true, skipped: "disabled" });

  const token = await getValidAccessToken();
  if (!token) return NextResponse.json({ ok: true, skipped: "not_connected" });

  const sb = gogaAdmin();
  const { data: rows } = await sb
    .from("pinterest_pins")
    .select("*")
    .eq("status", "queued");
  const due = dueItems(
    (rows ?? []) as PinterestPinRow[],
    new Date(),
    settings.pins_per_run,
  );

  const results: { id: string; ok: boolean; error?: string }[] = [];
  for (const row of due) {
    try {
      const content = await loadContent(sb, row);
      if (!content) {
        await sb
          .from("pinterest_pins")
          .update({ status: "skipped", error: "content missing" })
          .eq("id", row.id);
        results.push({ id: row.id, ok: false, error: "content missing" });
        continue;
      }
      const board =
        row.board_id ??
        resolveBoard(
          row.content_type,
          content.categorySlug,
          settings.board_map,
          settings.default_board_id,
        );
      if (!board) {
        await sb
          .from("pinterest_pins")
          .update({
            status: "failed",
            error: "no board",
            attempts: row.attempts + 1,
          })
          .eq("id", row.id);
        results.push({ id: row.id, ok: false, error: "no board" });
        continue;
      }
      const payload = buildPinPayload(content.payload);
      if (!payload.image_url) {
        await sb
          .from("pinterest_pins")
          .update({ status: "skipped", error: "no image" })
          .eq("id", row.id);
        results.push({ id: row.id, ok: false, error: "no image" });
        continue;
      }
      const pin = await createPin(token, { board_id: board, ...payload });
      await sb
        .from("pinterest_pins")
        .update({
          status: "posted",
          pin_id: pin.id,
          posted_at: new Date().toISOString(),
        })
        .eq("id", row.id);
      results.push({ id: row.id, ok: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      await sb
        .from("pinterest_pins")
        .update({ status: "failed", error: msg, attempts: row.attempts + 1 })
        .eq("id", row.id);
      results.push({ id: row.id, ok: false, error: msg });
    }
  }
  return NextResponse.json({ ok: true, processed: results.length, results });
}
