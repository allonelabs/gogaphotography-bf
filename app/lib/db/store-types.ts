// app/lib/db/store-types.ts — row shapes for the digital store tables.

export type StoreProductType = "album" | "preset";
export type StoreOrderStatus = "pending" | "paid" | "failed" | "refunded";

export type StoreProductRow = {
  id: string;
  type: StoreProductType;
  title: string;
  slug: string;
  description: string | null;
  price_cents: number;
  currency: string;
  cover_image_path: string | null;
  preview_image_paths: string[];
  file_path: string | null;
  file_size_bytes: number | null;
  license_terms: string | null;
  metadata: Record<string, unknown>;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export type StoreOrderRow = {
  id: string;
  buyer_email: string;
  status: StoreOrderStatus;
  total_cents: number;
  currency: string;
  tbc_payment_id: string | null;
  created_at: string;
  paid_at: string | null;
}

export type StoreOrderItemRow = {
  id: string;
  order_id: string;
  product_id: string;
  title_snapshot: string;
  price_cents_snapshot: number;
}

export type StoreDownloadRow = {
  id: string;
  order_id: string;
  product_id: string;
  token: string;
  downloads_used: number;
  max_downloads: number;
  expires_at: string;
  last_downloaded_at: string | null;
}
