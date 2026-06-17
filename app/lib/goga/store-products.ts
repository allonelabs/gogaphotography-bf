// app/lib/goga/store-products.ts
import "server-only";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import type {
  StoreProductRow,
  StoreProductType,
} from "@/app/lib/db/store-types";

export async function listPublishedProducts(
  type?: StoreProductType,
): Promise<StoreProductRow[]> {
  let q = gogaAdmin()
    .from("store_products")
    .select("*")
    .eq("published", true)
    .order("created_at", { ascending: false });
  if (type) q = q.eq("type", type);
  const { data, error } = await q;
  if (error) throw new Error(`listPublishedProducts: ${error.message}`);
  return (data ?? []) as StoreProductRow[];
}

export async function getPublishedProductBySlug(
  slug: string,
): Promise<StoreProductRow | null> {
  const { data } = await gogaAdmin()
    .from("store_products")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  return (data as StoreProductRow) ?? null;
}

export async function listAllProducts(): Promise<StoreProductRow[]> {
  const { data, error } = await gogaAdmin()
    .from("store_products")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`listAllProducts: ${error.message}`);
  return (data ?? []) as StoreProductRow[];
}

export async function getProductById(
  id: string,
): Promise<StoreProductRow | null> {
  const { data } = await gogaAdmin()
    .from("store_products")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as StoreProductRow) ?? null;
}

export async function getProductsByIds(
  ids: string[],
): Promise<StoreProductRow[]> {
  if (ids.length === 0) return [];
  const { data, error } = await gogaAdmin()
    .from("store_products")
    .select("*")
    .in("id", ids);
  if (error) throw new Error(`getProductsByIds: ${error.message}`);
  return (data ?? []) as StoreProductRow[];
}
