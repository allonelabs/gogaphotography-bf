"use server";

import { revalidatePath } from "next/cache";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { requireSession } from "./require-auth";
import { logAdminEvent } from "./admin-events";

type Surface =
  | "hero.hero_image"
  | "hero.portrait_image"
  | "package.hero_image"
  | "service.hero_image"
  | "page.og_image";

interface SurfaceConfig {
  table: "hero" | "packages" | "services" | "pages";
  column: "hero_image_path" | "portrait_image_path" | "og_image_path";
  pathPrefix: string;
}

const SURFACES: Record<Surface, SurfaceConfig> = {
  "hero.hero_image": {
    table: "hero",
    column: "hero_image_path",
    pathPrefix: "hero/hero",
  },
  "hero.portrait_image": {
    table: "hero",
    column: "portrait_image_path",
    pathPrefix: "hero/portrait",
  },
  "package.hero_image": {
    table: "packages",
    column: "hero_image_path",
    pathPrefix: "packages",
  },
  "service.hero_image": {
    table: "services",
    column: "hero_image_path",
    pathPrefix: "services",
  },
  "page.og_image": {
    table: "pages",
    column: "og_image_path",
    pathPrefix: "pages/og",
  },
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

/**
 * Upload an image to the public `projects` bucket and stamp the
 * configured (table, column) cell with the resulting path. Returns the
 * stored path. The matching row is selected by `rowId` for per-row
 * surfaces (packages/services/pages) and by `id=1` for the hero
 * singleton.
 */
export async function uploadSurfaceImage(formData: FormData): Promise<{
  path: string;
  url: string;
}> {
  await requireSession();
  const surfaceKey = String(formData.get("surface") ?? "");
  const rowId = String(formData.get("rowId") ?? "");
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("no_file");
  if (file.size === 0) throw new Error("empty_file");
  if (file.size > 8 * 1024 * 1024) throw new Error("file_too_large");
  if (!file.type.startsWith("image/")) throw new Error("not_an_image");

  const cfg = SURFACES[surfaceKey as Surface];
  if (!cfg) throw new Error("unknown_surface");

  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const safeExt = /^(jpe?g|png|webp|avif|gif)$/.test(ext) ? ext : "jpg";
  const base = slugify(file.name.replace(/\.[^.]+$/, "")) || "image";
  const stamp = Date.now();
  const objectPath =
    cfg.table === "hero"
      ? `${cfg.pathPrefix}-${stamp}-${base}.${safeExt}`
      : `${cfg.pathPrefix}/${rowId || "x"}/${stamp}-${base}.${safeExt}`;

  const sb = gogaAdmin();
  const buf = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await sb.storage
    .from("projects")
    .upload(objectPath, buf, {
      contentType: file.type,
      cacheControl: "31536000",
      upsert: false,
    });
  if (upErr) throw new Error(upErr.message);

  // Update the row that owns the column. `pages` is keyed by slug, not
  // id; `hero` is a singleton with id=1; the rest are uuid-keyed.
  if (cfg.table === "hero") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (sb as any).from("hero").upsert({ id: 1, [cfg.column]: objectPath });
  } else {
    if (!rowId) throw new Error("missing_rowId");
    const keyCol = cfg.table === "pages" ? "slug" : "id";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (sb as any)
      .from(cfg.table)
      .update({ [cfg.column]: objectPath })
      .eq(keyCol, rowId);
  }

  await logAdminEvent("hero.updated", {
    entityType: cfg.table,
    entityId: rowId || "singleton",
    payload: { surface: surfaceKey, path: objectPath },
  });

  // Revalidate likely admin paths
  switch (cfg.table) {
    case "hero":
      revalidatePath("/app/hero");
      break;
    case "packages":
      revalidatePath("/app/packages");
      revalidatePath(`/app/packages/${rowId}`);
      break;
    case "services":
      revalidatePath("/app/services");
      revalidatePath(`/app/services/${rowId}`);
      break;
    case "pages":
      revalidatePath("/app/pages");
      break;
  }

  const base_url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  return {
    path: objectPath,
    url: base_url
      ? `${base_url}/storage/v1/object/public/projects/${objectPath}`
      : objectPath,
  };
}

export async function clearSurfaceImage(
  surfaceKey: Surface | string,
  rowId: string,
): Promise<void> {
  await requireSession();
  const cfg = SURFACES[surfaceKey as Surface];
  if (!cfg) throw new Error("unknown_surface");

  const sb = gogaAdmin();
  if (cfg.table === "hero") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (sb as any).from("hero").upsert({ id: 1, [cfg.column]: null });
  } else {
    if (!rowId) throw new Error("missing_rowId");
    const keyCol = cfg.table === "pages" ? "slug" : "id";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (sb as any)
      .from(cfg.table)
      .update({ [cfg.column]: null })
      .eq(keyCol, rowId);
  }

  switch (cfg.table) {
    case "hero":
      revalidatePath("/app/hero");
      break;
    case "packages":
      revalidatePath("/app/packages");
      revalidatePath(`/app/packages/${rowId}`);
      break;
    case "services":
      revalidatePath("/app/services");
      revalidatePath(`/app/services/${rowId}`);
      break;
    case "pages":
      revalidatePath("/app/pages");
      break;
  }
}
