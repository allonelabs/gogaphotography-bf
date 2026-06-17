// app/lib/goga/pinterest-queue.ts
import "server-only";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import type {
  PinContentType,
  PinterestPinRow,
} from "@/app/lib/db/pinterest-types";

/** Insert a queued pin for a content item. No-op if a row already exists (any status). */
export async function enqueuePin(
  contentType: PinContentType,
  contentId: string,
  scheduledFor?: Date,
): Promise<void> {
  const sb = gogaAdmin();
  const { data: existing } = await sb
    .from("pinterest_pins")
    .select("id")
    .eq("content_type", contentType)
    .eq("content_id", contentId)
    .limit(1);
  if (existing && existing.length > 0) return;
  await sb.from("pinterest_pins").insert({
    content_type: contentType,
    content_id: contentId,
    scheduled_for: (scheduledFor ?? new Date()).toISOString(),
  });
}

export async function listQueue(): Promise<PinterestPinRow[]> {
  const { data } = await gogaAdmin()
    .from("pinterest_pins")
    .select("*")
    .order("scheduled_for", { ascending: true })
    .limit(200);
  return (data ?? []) as PinterestPinRow[];
}

/** Queue all published blog posts, products, and projects not yet queued. Staggers schedule. */
export async function enqueueAllEligible(): Promise<number> {
  const sb = gogaAdmin();
  const { data: queued } = await sb
    .from("pinterest_pins")
    .select("content_type, content_id");
  const seen = new Set(
    (queued ?? []).map((r) => `${r.content_type}:${r.content_id}`),
  );

  const [blog, products, projects] = await Promise.all([
    sb.from("blog_posts").select("id").eq("status", "published"),
    sb.from("store_products").select("id").eq("published", true),
    sb.from("projects").select("id").eq("published", true),
  ]);

  const items: { t: PinContentType; id: string }[] = [
    ...(blog.data ?? []).map((r) => ({ t: "blog" as const, id: r.id })),
    ...(products.data ?? []).map((r) => ({ t: "product" as const, id: r.id })),
    ...(projects.data ?? []).map((r) => ({ t: "project" as const, id: r.id })),
  ].filter((x) => !seen.has(`${x.t}:${x.id}`));

  let added = 0;
  const base = Date.now();
  for (const it of items) {
    await sb.from("pinterest_pins").insert({
      content_type: it.t,
      content_id: it.id,
      scheduled_for: new Date(base + added * 30 * 60 * 1000).toISOString(),
    });
    added += 1;
  }
  return added;
}
