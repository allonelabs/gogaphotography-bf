import "server-only";

import { gogaAdmin } from "@/app/lib/supabase/goga";
import { formatMoney } from "./money";
import type { GogaJson } from "@/app/lib/db/goga-types";

export type ResolvedBookingAddon = {
  id: string;
  name_en: string;
  name_ka: string | null;
  name_ru: string | null;
  price_cents: number;
};

/**
 * `bookings.addons` is a loosely-typed jsonb column written by the public
 * repo's `/api/book` — it may be an array of raw addon ids or of snapshot
 * objects (`{id, ...}`). Extract just the ids so we can look up current
 * names/prices from the `addons` table.
 */
export function extractAddonIds(json: GogaJson): string[] {
  if (!Array.isArray(json)) return [];
  const ids: string[] = [];
  for (const entry of json) {
    if (typeof entry === "string") ids.push(entry);
    else if (
      entry &&
      typeof entry === "object" &&
      typeof (entry as { id?: unknown }).id === "string"
    ) {
      ids.push((entry as { id: string }).id);
    }
  }
  return ids;
}

/** Resolve addon ids against the live `addons` table (current name/price). */
export async function resolveBookingAddons(
  json: GogaJson,
): Promise<ResolvedBookingAddon[]> {
  const ids = extractAddonIds(json);
  if (ids.length === 0) return [];
  const sb = gogaAdmin();
  const { data } = await sb
    .from("addons")
    .select("id, name_en, name_ka, name_ru, price_cents")
    .in("id", ids);
  const byId = new Map((data ?? []).map((a) => [a.id, a]));
  // Preserve the order ids were stored in, drop any addon that's since
  // been deleted from the catalog.
  return ids
    .map((id) => byId.get(id))
    .filter((a): a is ResolvedBookingAddon => !!a);
}

/** Human-readable, locale-aware summary for contract/automation placeholders. */
export function describeAddons(
  addons: ResolvedBookingAddon[],
  currency: string,
  locale: "en" | "ka" | "ru",
): string {
  if (addons.length === 0)
    return locale === "ka" ? "არცერთი" : locale === "ru" ? "нет" : "None";
  return addons
    .map((a) => {
      const name =
        (locale === "ka"
          ? a.name_ka
          : locale === "ru"
            ? a.name_ru
            : a.name_en) || a.name_en;
      return `${name} (${formatMoney(a.price_cents, currency)})`;
    })
    .join(", ");
}
