// ════════════════════════════════════════════════════════════════════════════
// shop-store — server-only persistence for products + orders.
//
// Layout under each spawn:
//   .bf/products.json    ← array of Product
//   .bf/orders.jsonl     ← append-only order log
//
// Products live alongside other .bf/ JSON files so the next spawn pass can
// roll them into emitted /shop routes via ecom-forge.
// ════════════════════════════════════════════════════════════════════════════
import 'server-only';

import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { resolveOutRoot } from './spawn-loader';
import { getSupabaseAdmin } from './supabase-server';

export const VALID_SPAWN_ID = /^[a-z0-9][a-z0-9.\-_]*$/i;

// On Vercel the lambda filesystem is read-only except `/tmp`. Writes to the
// deployment dir 500 silently. Use a per-instance `/tmp` shadow root for
// writes; reads check the shadow first then fall back to the deployment-out
// seed. Persistence is per-warm-lambda — survives within a session, gone on
// cold start — but it lets the operator UI exercise the save path honestly.
function isServerless(): boolean {
  return Boolean(process.env['VERCEL']) || process.env['NODE_ENV'] === 'production';
}

function writableRoot(): string {
  return isServerless() ? '/tmp/business-forge-out' : resolveOutRoot();
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  /** Price in minor units (cents) for currency-precision storage. */
  priceCents: number;
  currency: string;
  /** Filename under public/images/ — empty = no image. */
  imageName: string;
  inventory: number;
  status: 'draft' | 'active' | 'archived';
  /** Optional category slug — drives /category/<slug> landing page filtering. */
  categorySlug?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  at: string;
  status: 'pending' | 'paid' | 'fulfilled' | 'refunded';
  customerEmail: string;
  customerName: string;
  totalCents: number;
  currency: string;
  items: Array<{ productId: string; name: string; qty: number; priceCents: number }>;
}

export interface Suppression {
  email: string;
  /** Why the address was suppressed: hard bounce, complaint, manual block, unsubscribe. */
  reason: 'bounce' | 'complaint' | 'unsubscribe' | 'manual';
  /** Where it came from — usually the template slug, the campaign id, or 'manual'. */
  source: string;
  suppressedAt: string;
  /** Operator note. */
  note: string;
}

export interface Photo {
  id: string;
  productId: string;
  url: string;
  alt: string;
  sortOrder: number;
  /** Hero/cover for the product. Exactly one per productId becomes
   *  effective at render time; this flag is the operator's preference. */
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductPair {
  id: string;
  productAId: string;
  productBId: string;
  /** Display label, e.g. "Pairs well with" or "Goes with". */
  label: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  productId: string;
  productName: string;
  rating: number; // 1-5
  title: string;
  body: string;
  reviewerName: string;
  reviewerEmail: string;
  /** 'pending' = awaiting moderation; 'approved' shows publicly; 'rejected' is hidden but logged. */
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  /** Parent category id; null for top-level. */
  parentId: string | null;
  /** Sort order for display; lower first. */
  sortOrder: number;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface Discount {
  id: string;
  code: string;
  /** percentage = N% off (1-100); fixed = N cents off */
  type: 'percentage' | 'fixed';
  value: number;
  /** Order subtotal floor in cents — 0 = no minimum. */
  minOrderCents: number;
  /** Cap on total redemptions; null = unlimited. */
  maxUses: number | null;
  /** Live counter incremented on checkout success. */
  usesCount: number;
  /** ISO start timestamp. */
  startsAt: string;
  /** ISO end timestamp; null = no end. */
  endsAt: string | null;
  status: 'active' | 'paused' | 'expired';
  createdAt: string;
  updatedAt: string;
}

const PRODUCTS_DEFAULT: Product[] = [];
const DISCOUNTS_DEFAULT: Discount[] = [];
const CATEGORIES_DEFAULT: Category[] = [];
const REVIEWS_DEFAULT: Review[] = [];
const PRODUCT_PAIRS_DEFAULT: ProductPair[] = [];
const PHOTOS_DEFAULT: Photo[] = [];
const SUPPRESSIONS_DEFAULT: Suppression[] = [];

function productsFile(id: string): string | null {
  if (!VALID_SPAWN_ID.test(id)) return null;
  return path.join(writableRoot(), id, 'site', '.bf', 'products.json');
}

function productsSeedFile(id: string): string | null {
  if (!VALID_SPAWN_ID.test(id)) return null;
  return path.join(resolveOutRoot(), id, 'site', '.bf', 'products.json');
}

function ordersFile(id: string): string | null {
  if (!VALID_SPAWN_ID.test(id)) return null;
  return path.join(writableRoot(), id, 'site', '.bf', 'orders.jsonl');
}

function ordersSeedFile(id: string): string | null {
  if (!VALID_SPAWN_ID.test(id)) return null;
  return path.join(resolveOutRoot(), id, 'site', '.bf', 'orders.jsonl');
}

function discountsFile(id: string): string | null {
  if (!VALID_SPAWN_ID.test(id)) return null;
  return path.join(writableRoot(), id, 'site', '.bf', 'discounts.json');
}

function discountsSeedFile(id: string): string | null {
  if (!VALID_SPAWN_ID.test(id)) return null;
  return path.join(resolveOutRoot(), id, 'site', '.bf', 'discounts.json');
}

function categoriesFile(id: string): string | null {
  if (!VALID_SPAWN_ID.test(id)) return null;
  return path.join(writableRoot(), id, 'site', '.bf', 'categories.json');
}

function categoriesSeedFile(id: string): string | null {
  if (!VALID_SPAWN_ID.test(id)) return null;
  return path.join(resolveOutRoot(), id, 'site', '.bf', 'categories.json');
}

function reviewsFile(id: string): string | null {
  if (!VALID_SPAWN_ID.test(id)) return null;
  return path.join(writableRoot(), id, 'site', '.bf', 'reviews.json');
}

function reviewsSeedFile(id: string): string | null {
  if (!VALID_SPAWN_ID.test(id)) return null;
  return path.join(resolveOutRoot(), id, 'site', '.bf', 'reviews.json');
}

function productPairsFile(id: string): string | null {
  if (!VALID_SPAWN_ID.test(id)) return null;
  return path.join(writableRoot(), id, 'site', '.bf', 'product-pairs.json');
}

function productPairsSeedFile(id: string): string | null {
  if (!VALID_SPAWN_ID.test(id)) return null;
  return path.join(resolveOutRoot(), id, 'site', '.bf', 'product-pairs.json');
}

function photosFile(id: string): string | null {
  if (!VALID_SPAWN_ID.test(id)) return null;
  return path.join(writableRoot(), id, 'site', '.bf', 'photos.json');
}

function photosSeedFile(id: string): string | null {
  if (!VALID_SPAWN_ID.test(id)) return null;
  return path.join(resolveOutRoot(), id, 'site', '.bf', 'photos.json');
}

function suppressionsFile(id: string): string | null {
  if (!VALID_SPAWN_ID.test(id)) return null;
  return path.join(writableRoot(), id, 'site', '.bf', 'suppressions.json');
}

function suppressionsSeedFile(id: string): string | null {
  if (!VALID_SPAWN_ID.test(id)) return null;
  return path.join(resolveOutRoot(), id, 'site', '.bf', 'suppressions.json');
}

export function persistenceMode(): 'disk' | 'tmp' | 'storage' {
  // 'storage' is now the durable backing for products on Vercel (Supabase
  // Storage), with /tmp as a warm-lambda cache.  'tmp' label is preserved
  // for legacy callers but the actual durability is via Storage.
  return isServerless() ? 'storage' : 'disk';
}

async function readJsonOrEmpty(file: string | null): Promise<Product[] | null> {
  if (!file) return null;
  try {
    const raw = await readFile(file, 'utf8');
    const parsed = JSON.parse(raw) as Product[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// ── Supabase Storage as durable source of truth ────────────────────────
// Background: until 2026-05-14 products were written ONLY to /tmp on Vercel,
// which is per-warm-lambda ephemeral.  Operators added products via the UI
// or chat, the rebuild ran on the same warm lambda and uploaded HTML with
// products baked in to Supabase, then the next cold start wiped /tmp and
// the products vanished from the API even though the static HTML still
// showed them.  Reported by Luka 2026-05-14 ("The Comfort Loaf" bakery).
//
// Fix: write-through cache.  /tmp stays as a warm-lambda fast path;
// Supabase Storage at `<slug>/store-products.json` is the durable source.
function productsStorageKey(spawnId: string): string | null {
  if (!VALID_SPAWN_ID.test(spawnId)) return null;
  return `${spawnId}/store-products.json`;
}

async function downloadProductsFromStorage(spawnId: string): Promise<Product[] | null> {
  const key = productsStorageKey(spawnId);
  if (!key) return null;
  try {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb.storage.from('spawns').download(key);
    if (error || !data) return null;
    const text = await data.text();
    const parsed = JSON.parse(text) as Product[];
    return Array.isArray(parsed) ? parsed : null;
  } catch { return null; }
}

async function uploadProductsToStorage(spawnId: string, products: Product[]): Promise<void> {
  const key = productsStorageKey(spawnId);
  if (!key) return;
  const sb = getSupabaseAdmin();
  const { error } = await sb.storage.from('spawns').upload(
    key,
    JSON.stringify(products, null, 2),
    { upsert: true, contentType: 'application/json' },
  );
  if (error) throw new Error(`upload products: ${error.message}`);
}

export async function readProducts(spawnId: string): Promise<Product[]> {
  // 1) Warm-lambda /tmp shadow (fastest, has uncommitted recent writes).
  const fromShadow = await readJsonOrEmpty(productsFile(spawnId));
  if (fromShadow && fromShadow.length > 0) return fromShadow;
  // 2) Supabase Storage — durable source of truth across cold lambdas.
  const fromStorage = await downloadProductsFromStorage(spawnId);
  if (fromStorage && fromStorage.length > 0) {
    // Backfill the /tmp shadow so subsequent reads on this warm lambda skip
    // the network round-trip.
    const f = productsFile(spawnId);
    if (f) {
      try {
        await mkdir(path.dirname(f), { recursive: true });
        await writeFile(f, JSON.stringify(fromStorage, null, 2), 'utf8');
      } catch { /* best-effort cache; ignore failures */ }
    }
    return fromStorage;
  }
  // 3) Deployment-bundled seed (first load before any operator edits).
  const fromSeed = await readJsonOrEmpty(productsSeedFile(spawnId));
  return fromSeed ?? PRODUCTS_DEFAULT;
}

export async function writeProducts(spawnId: string, products: Product[]): Promise<void> {
  const f = productsFile(spawnId);
  if (!f) throw new Error('invalid spawn id');
  // Write through: /tmp shadow first (sub-millisecond, gives the immediate
  // rebuildSiteWithProducts() call on the same lambda fresh data), then
  // Supabase Storage so other lambdas and future cold starts see it too.
  await mkdir(path.dirname(f), { recursive: true });
  await writeFile(f, JSON.stringify(products, null, 2), 'utf8');
  await uploadProductsToStorage(spawnId, products);
}

async function readJsonOrEmptyDiscounts(file: string | null): Promise<Discount[] | null> {
  if (!file) return null;
  try {
    const raw = await readFile(file, 'utf8');
    const parsed = JSON.parse(raw) as Discount[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function readDiscounts(spawnId: string): Promise<Discount[]> {
  const fromShadow = await readJsonOrEmptyDiscounts(discountsFile(spawnId));
  if (fromShadow) return fromShadow;
  const fromSeed = await readJsonOrEmptyDiscounts(discountsSeedFile(spawnId));
  return fromSeed ?? DISCOUNTS_DEFAULT;
}

export async function writeDiscounts(spawnId: string, discounts: Discount[]): Promise<void> {
  const f = discountsFile(spawnId);
  if (!f) throw new Error('invalid spawn id');
  await mkdir(path.dirname(f), { recursive: true });
  await writeFile(f, JSON.stringify(discounts, null, 2), 'utf8');
}

async function readJsonOrEmptyCategories(file: string | null): Promise<Category[] | null> {
  if (!file) return null;
  try {
    const raw = await readFile(file, 'utf8');
    const parsed = JSON.parse(raw) as Category[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function readCategories(spawnId: string): Promise<Category[]> {
  const fromShadow = await readJsonOrEmptyCategories(categoriesFile(spawnId));
  if (fromShadow) return fromShadow;
  const fromSeed = await readJsonOrEmptyCategories(categoriesSeedFile(spawnId));
  return fromSeed ?? CATEGORIES_DEFAULT;
}

export async function writeCategories(spawnId: string, categories: Category[]): Promise<void> {
  const f = categoriesFile(spawnId);
  if (!f) throw new Error('invalid spawn id');
  await mkdir(path.dirname(f), { recursive: true });
  await writeFile(f, JSON.stringify(categories, null, 2), 'utf8');
}

async function readJsonOrEmptySuppressions(file: string | null): Promise<Suppression[] | null> {
  if (!file) return null;
  try {
    const raw = await readFile(file, 'utf8');
    const parsed = JSON.parse(raw) as Suppression[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function readSuppressions(spawnId: string): Promise<Suppression[]> {
  const fromShadow = await readJsonOrEmptySuppressions(suppressionsFile(spawnId));
  if (fromShadow) return fromShadow;
  return (await readJsonOrEmptySuppressions(suppressionsSeedFile(spawnId))) ?? SUPPRESSIONS_DEFAULT;
}

export async function writeSuppressions(spawnId: string, suppressions: Suppression[]): Promise<void> {
  const f = suppressionsFile(spawnId);
  if (!f) throw new Error('invalid spawn id');
  await mkdir(path.dirname(f), { recursive: true });
  await writeFile(f, JSON.stringify(suppressions, null, 2), 'utf8');
}

async function readJsonOrEmptyPhotos(file: string | null): Promise<Photo[] | null> {
  if (!file) return null;
  try {
    const raw = await readFile(file, 'utf8');
    const parsed = JSON.parse(raw) as Photo[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function readPhotos(spawnId: string): Promise<Photo[]> {
  const fromShadow = await readJsonOrEmptyPhotos(photosFile(spawnId));
  if (fromShadow) return fromShadow;
  const fromSeed = await readJsonOrEmptyPhotos(photosSeedFile(spawnId));
  return fromSeed ?? PHOTOS_DEFAULT;
}

export async function writePhotos(spawnId: string, photos: Photo[]): Promise<void> {
  const f = photosFile(spawnId);
  if (!f) throw new Error('invalid spawn id');
  await mkdir(path.dirname(f), { recursive: true });
  await writeFile(f, JSON.stringify(photos, null, 2), 'utf8');
}

export function emptyPhoto(productId: string): Photo {
  const now = new Date().toISOString();
  const id = `ph_${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    productId,
    url: '',
    alt: '',
    sortOrder: 0,
    isPrimary: false,
    createdAt: now,
    updatedAt: now,
  };
}

async function readJsonOrEmptyProductPairs(file: string | null): Promise<ProductPair[] | null> {
  if (!file) return null;
  try {
    const raw = await readFile(file, 'utf8');
    const parsed = JSON.parse(raw) as ProductPair[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function readProductPairs(spawnId: string): Promise<ProductPair[]> {
  const fromShadow = await readJsonOrEmptyProductPairs(productPairsFile(spawnId));
  if (fromShadow) return fromShadow;
  const fromSeed = await readJsonOrEmptyProductPairs(productPairsSeedFile(spawnId));
  return fromSeed ?? PRODUCT_PAIRS_DEFAULT;
}

export async function writeProductPairs(spawnId: string, pairs: ProductPair[]): Promise<void> {
  const f = productPairsFile(spawnId);
  if (!f) throw new Error('invalid spawn id');
  await mkdir(path.dirname(f), { recursive: true });
  await writeFile(f, JSON.stringify(pairs, null, 2), 'utf8');
}

export function emptyProductPair(): ProductPair {
  const now = new Date().toISOString();
  const id = `pp_${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    productAId: '',
    productBId: '',
    label: 'Pairs well with',
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
  };
}

async function readJsonOrEmptyReviews(file: string | null): Promise<Review[] | null> {
  if (!file) return null;
  try {
    const raw = await readFile(file, 'utf8');
    const parsed = JSON.parse(raw) as Review[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function readReviews(spawnId: string): Promise<Review[]> {
  const fromShadow = await readJsonOrEmptyReviews(reviewsFile(spawnId));
  if (fromShadow) return fromShadow;
  const fromSeed = await readJsonOrEmptyReviews(reviewsSeedFile(spawnId));
  return fromSeed ?? REVIEWS_DEFAULT;
}

export async function writeReviews(spawnId: string, reviews: Review[]): Promise<void> {
  const f = reviewsFile(spawnId);
  if (!f) throw new Error('invalid spawn id');
  await mkdir(path.dirname(f), { recursive: true });
  await writeFile(f, JSON.stringify(reviews, null, 2), 'utf8');
}

export function emptyCategory(): Category {
  const now = new Date().toISOString();
  const id = `c_${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    name: 'New category',
    slug: id,
    parentId: null,
    sortOrder: 0,
    description: '',
    createdAt: now,
    updatedAt: now,
  };
}

export function emptyDiscount(): Discount {
  const now = new Date().toISOString();
  const id = `d_${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    code: 'NEWCODE',
    type: 'percentage',
    value: 10,
    minOrderCents: 0,
    maxUses: null,
    usesCount: 0,
    startsAt: now,
    endsAt: null,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };
}

async function readOrdersFromFile(file: string | null, limit: number): Promise<Order[] | null> {
  if (!file) return null;
  try {
    const raw = await readFile(file, 'utf8');
    const lines = raw.split('\n').filter((l) => l.trim().length > 0);
    return lines.map((l) => JSON.parse(l) as Order).slice(-limit).reverse();
  } catch {
    return null;
  }
}

export async function readOrders(spawnId: string, limit = 200): Promise<Order[]> {
  const fromShadow = await readOrdersFromFile(ordersFile(spawnId), limit);
  if (fromShadow) return fromShadow;
  return (await readOrdersFromFile(ordersSeedFile(spawnId), limit)) ?? [];
}

export async function appendOrder(spawnId: string, order: Order): Promise<void> {
  const f = ordersFile(spawnId);
  if (!f) throw new Error('invalid spawn id');
  await mkdir(path.dirname(f), { recursive: true });
  await appendFile(f, JSON.stringify(order) + '\n', 'utf8');
}

// Read every order from the writable shadow (seeding from the deployment
// .jsonl on first touch), apply a mutation, and rewrite the shadow .jsonl
// in place. Used by the admin UI to update status / delete orders.
async function rewriteOrders(spawnId: string, mutate: (xs: Order[]) => Order[]): Promise<Order[]> {
  const f = ordersFile(spawnId);
  if (!f) throw new Error('invalid spawn id');
  // Read both shadow + seed; prefer shadow if present, else seed.
  const fromShadow = await readOrdersFromFile(f, 10_000);
  const fromSeed = fromShadow ? null : await readOrdersFromFile(ordersSeedFile(spawnId), 10_000);
  // readOrdersFromFile reverses (newest first); rewrite needs natural order.
  const current = (fromShadow ?? fromSeed ?? []).slice().reverse();
  const next = mutate(current);
  await mkdir(path.dirname(f), { recursive: true });
  await writeFile(f, next.map((o) => JSON.stringify(o)).join('\n') + (next.length ? '\n' : ''), 'utf8');
  return next.slice().reverse(); // return in newest-first order to match readOrders
}

export async function updateOrderStatus(spawnId: string, orderId: string, status: Order['status']): Promise<Order | null> {
  let touched: Order | null = null;
  await rewriteOrders(spawnId, (xs) => xs.map((o) => {
    if (o.id !== orderId) return o;
    const updated: Order = { ...o, status };
    touched = updated;
    return updated;
  }));
  return touched;
}

export async function deleteOrder(spawnId: string, orderId: string): Promise<boolean> {
  let removed = false;
  await rewriteOrders(spawnId, (xs) => xs.filter((o) => {
    if (o.id !== orderId) return true;
    removed = true;
    return false;
  }));
  return removed;
}

export function emptyProduct(): Product {
  const now = new Date().toISOString();
  const id = `p_${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    name: 'New product',
    slug: id,
    description: '',
    priceCents: 0,
    currency: 'USD',
    imageName: '',
    inventory: 0,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
  };
}

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64);
}
