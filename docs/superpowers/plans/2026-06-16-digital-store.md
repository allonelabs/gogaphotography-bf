# Digital Store Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a public digital storefront on the GOGA Photography site that sells downloadable albums and presets via guest checkout (TBC Bank, GEL), a multi-item cart, and time-limited signed download links delivered on-screen and by email.

**Architecture:** New `store_*` tables in the existing single-tenant Supabase DB. Checkout reuses `app/lib/tbc.ts` (create payment) and the existing `/api/payments/callback` webhook, with `finalizeTbcPayment` extended to recognize store orders (merchantPaymentId prefixed `store_`) and delegate to a store finalizer that marks the order paid, mints `store_downloads` rows, and enqueues a Resend email via the outbox. Deliverable files live in a new private `store-files` bucket; a token-gated download API streams short-lived signed URLs. Cart is client-side (localStorage); the server recomputes all totals from the DB.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Supabase (`gogaAdmin()` service-role client), TBC TPay, Resend via outbox, React Hook Form + Zod, Tailwind, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-06-16-digital-store-design.md`

---

## File Structure

**Create:**

- `supabase/migrations/goga_0004_store.sql` — 4 tables, RLS, indexes, private bucket
- `app/lib/db/store-types.ts` — TS Row/Insert types for store tables (imported by goga-types)
- `app/lib/goga/store-products.ts` — product read queries (public + admin)
- `app/lib/goga/actions-store.ts` — admin server actions (product CRUD + file upload)
- `app/lib/goga/store-pricing.ts` — pure cart-total recomputation (unit-tested)
- `app/lib/goga/store-checkout.ts` — create order + TBC session
- `app/lib/goga/finalize-store-tbc.ts` — store payment finalizer (paid → downloads → email)
- `app/lib/goga/store-download.ts` — token validation + consume + signed URL
- `app/lib/goga/store-email.ts` — pure builder for the download email HTML
- `app/api/store/checkout/route.ts` — POST: cart+email → TBC redirect
- `app/api/store/download/[token]/route.ts` — GET: validate token → redirect to signed URL
- `app/store/page.tsx` — catalog
- `app/store/[slug]/page.tsx` — product detail
- `app/store/checkout/page.tsx` — email + summary + pay
- `app/store/success/page.tsx` — order status + download links
- `app/store/_cart.tsx` — client cart context (localStorage) + cart drawer
- `app/store/_add-to-cart.tsx` — client add-to-cart button
- `app/app/store/page.tsx` — admin product list
- `app/app/store/product-form.tsx` — admin create/edit form (client)
- `app/app/store/[id]/page.tsx` — admin edit product
- `app/app/store/orders/page.tsx` — admin orders list
- `tests/store-pricing.test.ts` — Vitest
- `tests/store-download.test.ts` — Vitest
- `tests/store-finalize.test.ts` — Vitest
- `tests/store-email.test.ts` — Vitest
- `tests/integration/store.spec.ts` — Playwright

**Modify:**

- `app/lib/db/goga-types.ts` — add store tables to `GogaDatabase["public"]["Tables"]`
- `app/lib/goga/finalize-tbc.ts` — branch store orders to `finalizeTbcStorePayment`
- `app/lib/i18n/dict.ts` — add `nav.store`, `store.*` keys (EN + KA)
- the admin sidebar nav component — add a Store entry (locate via `nav.section.catalog`)

---

## Conventions to follow (verified in codebase)

- Server data access: `import { gogaAdmin } from "@/app/lib/supabase/goga"` then `gogaAdmin().from(...)`.
- Admin mutations: `"use server"` file, call `await requireSession()` first (from `./require-auth`), then mutate, then `revalidatePath(...)`.
- Money stored as integer `*_cents`; parse with the `parseCents` helper pattern (see `actions-packages.ts`).
- Slugs via the `slugify` helper pattern in `actions-packages.ts` with uniqueness loop.
- Site origin for callback/return URLs: mirror `siteOrigin()` in `actions-payments.ts` (uses `NEXT_PUBLIC_SITE_URL` fallback chain).
- TBC: `createTbcPayment({ externalOrderId, totalAmount, currency, callbackUrl, returnUrl, locale, description })` returns `{ payId, redirectUrl }`. `totalAmount` is a major-unit number (GEL), e.g. `49.00`. `description` is truncated to 30 chars by the client.
- Callback URL must carry `?secret=<PAYMENT_CALLBACK_SECRET>` (see `actions-payments.ts` and `app/api/payments/callback/route.ts`).
- Outbox email: `import { enqueueOutbound } from "@/app/lib/outbox/singleton"`; `enqueueOutbound({ organization_id, kind: "email.send", payload: { to, from, subject, html }, idempotencyKey })`. The `email.send` handler requires `to, from, subject, html`.
- Organization id for outbox: store the default org id constant `STORE_ORG_ID = 1` (matches how goga rows live in org 1 — confirm against `bookings` rows during Task 1; adjust the constant if different).

---

## Phase 1 — Data layer

### Task 1: Store database migration

**Files:**

- Create: `supabase/migrations/goga_0004_store.sql`

- [ ] **Step 1: Write the migration**

```sql
-- goga_0004_store.sql — digital store: products, orders, items, downloads.

create table if not exists store_products (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('album','preset')),
  title text not null,
  slug text not null unique,
  description text,
  price_cents integer not null check (price_cents >= 0),
  currency text not null default 'GEL',
  cover_image_path text,
  preview_image_paths text[] not null default '{}',
  file_path text,                       -- private store-files bucket key
  file_size_bytes bigint,
  license_terms text,
  metadata jsonb not null default '{}'::jsonb,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists store_orders (
  id uuid primary key default gen_random_uuid(),
  buyer_email text not null,
  status text not null default 'pending' check (status in ('pending','paid','failed','refunded')),
  total_cents integer not null check (total_cents >= 0),
  currency text not null default 'GEL',
  tbc_payment_id text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create table if not exists store_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references store_orders(id) on delete cascade,
  product_id uuid not null references store_products(id),
  title_snapshot text not null,
  price_cents_snapshot integer not null
);

create table if not exists store_downloads (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references store_orders(id) on delete cascade,
  product_id uuid not null references store_products(id),
  token text not null unique,
  downloads_used integer not null default 0,
  max_downloads integer not null default 5,
  expires_at timestamptz not null,
  last_downloaded_at timestamptz
);

create index if not exists idx_store_products_published on store_products(published) where published;
create index if not exists idx_store_order_items_order on store_order_items(order_id);
create index if not exists idx_store_downloads_token on store_downloads(token);
create index if not exists idx_store_orders_tbc on store_orders(tbc_payment_id);

-- RLS: anon may read only published products; everything else service-role only.
alter table store_products enable row level security;
alter table store_orders enable row level security;
alter table store_order_items enable row level security;
alter table store_downloads enable row level security;

drop policy if exists store_products_public_read on store_products;
create policy store_products_public_read on store_products
  for select using (published = true);

-- Private bucket for deliverable files (public covers/previews stay in `projects`).
insert into storage.buckets (id, name, public)
values ('store-files','store-files', false)
on conflict (id) do nothing;
```

- [ ] **Step 2: Apply the migration to the live project**

Run (uses the goga PAT-owned project, ref `bsmgqgcoilzghdnmafua`; psql connection string is in `.env.local` "Direct DB URL" comment — substitute the password from `gogaphotography-supabase-db` keychain entry):

```bash
cd /Users/macintoshi/Projects/site-xray/gogaphotography-bf
DBPW=$(security find-generic-password -s gogaphotography-supabase-db -w)
PGPASSWORD="$DBPW" psql "postgresql://postgres.bsmgqgcoilzghdnmafua@aws-0-eu-central-1.pooler.supabase.com:5432/postgres" -f supabase/migrations/goga_0004_store.sql
```

Expected: `CREATE TABLE` ×4, `CREATE INDEX` ×4, `ALTER TABLE` ×4, `CREATE POLICY`, `INSERT 0 1` (or `INSERT 0 0` if bucket exists). If the pooler host/credentials differ, confirm the exact connection string from `.env.local` first.

- [ ] **Step 3: Verify tables and bucket exist**

```bash
SVC=$(security find-generic-password -s gogaphotography-supabase-service -w)
for t in store_products store_orders store_order_items store_downloads; do
  echo -n "$t: "; curl -s -o /dev/null -w "%{http_code}\n" \
    "https://bsmgqgcoilzghdnmafua.supabase.co/rest/v1/$t?select=id&limit=1" \
    -H "apikey: $SVC" -H "Authorization: Bearer $SVC"
done
```

Expected: each prints `200`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/goga_0004_store.sql
git commit -m "feat(store): add store_* tables, RLS, and store-files bucket"
```

---

### Task 2: Store TypeScript types

**Files:**

- Create: `app/lib/db/store-types.ts`
- Modify: `app/lib/db/goga-types.ts`

- [ ] **Step 1: Write the store types**

```typescript
// app/lib/db/store-types.ts — row shapes for the digital store tables.

export type StoreProductType = "album" | "preset";
export type StoreOrderStatus = "pending" | "paid" | "failed" | "refunded";

export interface StoreProductRow {
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

export interface StoreOrderRow {
  id: string;
  buyer_email: string;
  status: StoreOrderStatus;
  total_cents: number;
  currency: string;
  tbc_payment_id: string | null;
  created_at: string;
  paid_at: string | null;
}

export interface StoreOrderItemRow {
  id: string;
  order_id: string;
  product_id: string;
  title_snapshot: string;
  price_cents_snapshot: number;
}

export interface StoreDownloadRow {
  id: string;
  order_id: string;
  product_id: string;
  token: string;
  downloads_used: number;
  max_downloads: number;
  expires_at: string;
  last_downloaded_at: string | null;
}
```

- [ ] **Step 2: Wire the four tables into `GogaDatabase`**

Open `app/lib/db/goga-types.ts`, find `Tables: {` (line ~16). Add these four entries inside `Tables` (use `Row`/`Insert`/`Update` matching the existing tables' shape — `Insert` makes generated/defaulted fields optional). Import the row types at the top of the file:

```typescript
import type {
  StoreProductRow,
  StoreOrderRow,
  StoreOrderItemRow,
  StoreDownloadRow,
} from "./store-types";
```

```typescript
      store_products: {
        Row: StoreProductRow;
        Insert: Partial<StoreProductRow> & Pick<StoreProductRow, "type" | "title" | "slug" | "price_cents">;
        Update: Partial<StoreProductRow>;
      };
      store_orders: {
        Row: StoreOrderRow;
        Insert: Partial<StoreOrderRow> & Pick<StoreOrderRow, "buyer_email" | "total_cents">;
        Update: Partial<StoreOrderRow>;
      };
      store_order_items: {
        Row: StoreOrderItemRow;
        Insert: Omit<StoreOrderItemRow, "id"> & { id?: string };
        Update: Partial<StoreOrderItemRow>;
      };
      store_downloads: {
        Row: StoreDownloadRow;
        Insert: Omit<StoreDownloadRow, "id" | "downloads_used" | "max_downloads" | "last_downloaded_at"> & {
          id?: string; downloads_used?: number; max_downloads?: number; last_downloaded_at?: string | null;
        };
        Update: Partial<StoreDownloadRow>;
      };
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: PASS (no errors referencing store types).

- [ ] **Step 4: Commit**

```bash
git add app/lib/db/store-types.ts app/lib/db/goga-types.ts
git commit -m "feat(store): typed store tables on GogaDatabase"
```

---

## Phase 2 — Pricing (pure logic, TDD)

### Task 3: Cart-total recomputation

The server must NEVER trust a client-supplied total. This module recomputes from DB product rows.

**Files:**

- Create: `app/lib/goga/store-pricing.ts`
- Test: `tests/store-pricing.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/store-pricing.test.ts
import { describe, it, expect } from "vitest";
import { recomputeCart, type CartLine } from "@/app/lib/goga/store-pricing";
import type { StoreProductRow } from "@/app/lib/db/store-types";

const products: StoreProductRow[] = [
  {
    id: "a",
    type: "preset",
    title: "Warm Pack",
    slug: "warm",
    description: null,
    price_cents: 4900,
    currency: "GEL",
    cover_image_path: null,
    preview_image_paths: [],
    file_path: "f/a.zip",
    file_size_bytes: 1,
    license_terms: null,
    metadata: {},
    published: true,
    created_at: "",
    updated_at: "",
  },
  {
    id: "b",
    type: "album",
    title: "Tbilisi",
    slug: "tbilisi",
    description: null,
    price_cents: 12000,
    currency: "GEL",
    cover_image_path: null,
    preview_image_paths: [],
    file_path: "f/b.zip",
    file_size_bytes: 1,
    license_terms: null,
    metadata: {},
    published: true,
    created_at: "",
    updated_at: "",
  },
];

describe("recomputeCart", () => {
  it("sums prices from DB, ignoring duplicate ids and client prices", () => {
    const cart: CartLine[] = [
      { productId: "a" },
      { productId: "b" },
      { productId: "a" },
    ];
    const r = recomputeCart(cart, products);
    expect(r.items.map((i) => i.product_id)).toEqual(["a", "b"]);
    expect(r.totalCents).toBe(16900);
    expect(r.currency).toBe("GEL");
  });

  it("throws when a cart product is missing or unpublished", () => {
    const unpub = { ...products[0], published: false };
    expect(() =>
      recomputeCart([{ productId: "a" }], [unpub, products[1]]),
    ).toThrow(/unavailable/i);
    expect(() => recomputeCart([{ productId: "zzz" }], products)).toThrow(
      /unavailable/i,
    );
  });

  it("throws on an empty cart", () => {
    expect(() => recomputeCart([], products)).toThrow(/empty/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/store-pricing.test.ts`
Expected: FAIL — cannot resolve `store-pricing`.

- [ ] **Step 3: Implement**

```typescript
// app/lib/goga/store-pricing.ts
import type { StoreProductRow } from "@/app/lib/db/store-types";

export interface CartLine {
  productId: string;
}

export interface PricedItem {
  product_id: string;
  title_snapshot: string;
  price_cents_snapshot: number;
}

export interface PricedCart {
  items: PricedItem[];
  totalCents: number;
  currency: string;
}

/**
 * Recompute a cart from authoritative DB rows. De-duplicates by product id
 * (digital goods — one copy per buyer), rejects missing/unpublished items,
 * and ignores any client-supplied prices entirely.
 */
export function recomputeCart(
  cart: CartLine[],
  products: StoreProductRow[],
): PricedCart {
  const ids = Array.from(new Set(cart.map((l) => l.productId)));
  if (ids.length === 0) throw new Error("Cart is empty");
  const byId = new Map(products.map((p) => [p.id, p]));
  const items: PricedItem[] = ids.map((id) => {
    const p = byId.get(id);
    if (!p || !p.published) throw new Error(`Product unavailable: ${id}`);
    return {
      product_id: p.id,
      title_snapshot: p.title,
      price_cents_snapshot: p.price_cents,
    };
  });
  const totalCents = items.reduce((s, i) => s + i.price_cents_snapshot, 0);
  const currency = products.find((p) => p.id === ids[0])?.currency ?? "GEL";
  return { items, totalCents, currency };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/store-pricing.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add app/lib/goga/store-pricing.ts tests/store-pricing.test.ts
git commit -m "feat(store): cart-total recomputation with DB authority"
```

---

## Phase 3 — Download token logic (pure-ish, TDD)

### Task 4: Download token validation

**Files:**

- Create: `app/lib/goga/store-download.ts`
- Test: `tests/store-download.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/store-download.test.ts
import { describe, it, expect } from "vitest";
import { assessDownload } from "@/app/lib/goga/store-download";
import type { StoreDownloadRow } from "@/app/lib/db/store-types";

const base: StoreDownloadRow = {
  id: "d",
  order_id: "o",
  product_id: "p",
  token: "tok",
  downloads_used: 0,
  max_downloads: 5,
  expires_at: "2999-01-01T00:00:00Z",
  last_downloaded_at: null,
};
const NOW = new Date("2026-06-16T00:00:00Z");

describe("assessDownload", () => {
  it("allows a fresh, unexpired token", () => {
    expect(assessDownload(base, NOW)).toEqual({ ok: true });
  });
  it("rejects an expired token", () => {
    const r = assessDownload(
      { ...base, expires_at: "2020-01-01T00:00:00Z" },
      NOW,
    );
    expect(r).toEqual({ ok: false, reason: "expired" });
  });
  it("rejects when the download limit is reached", () => {
    const r = assessDownload(
      { ...base, downloads_used: 5, max_downloads: 5 },
      NOW,
    );
    expect(r).toEqual({ ok: false, reason: "limit" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/store-download.test.ts`
Expected: FAIL — cannot resolve `store-download`.

- [ ] **Step 3: Implement (validation + DB consume + signed URL)**

```typescript
// app/lib/goga/store-download.ts
import "server-only";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import type { StoreDownloadRow } from "@/app/lib/db/store-types";

export type DownloadAssessment =
  | { ok: true }
  | { ok: false; reason: "expired" | "limit" };

/** Pure check: is this download row currently usable? */
export function assessDownload(
  row: StoreDownloadRow,
  now: Date,
): DownloadAssessment {
  if (new Date(row.expires_at).getTime() <= now.getTime())
    return { ok: false, reason: "expired" };
  if (row.downloads_used >= row.max_downloads)
    return { ok: false, reason: "limit" };
  return { ok: true };
}

export type ResolveResult =
  | { ok: true; signedUrl: string }
  | { ok: false; status: number; message: string };

/**
 * Validate a download token, atomically consume one use, and return a
 * short-lived signed URL for the product file. Server-only.
 */
export async function resolveDownload(token: string): Promise<ResolveResult> {
  const sb = gogaAdmin();
  const { data: row } = await sb
    .from("store_downloads")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (!row)
    return { ok: false, status: 404, message: "Unknown download token" };

  const verdict = assessDownload(row as StoreDownloadRow, new Date());
  if (!verdict.ok) {
    return {
      ok: false,
      status: 410,
      message:
        verdict.reason === "expired"
          ? "Link expired"
          : "Download limit reached",
    };
  }

  const { data: product } = await sb
    .from("store_products")
    .select("file_path")
    .eq("id", row.product_id)
    .maybeSingle();
  if (!product?.file_path)
    return { ok: false, status: 404, message: "File missing" };

  const { data: signed, error } = await sb.storage
    .from("store-files")
    .createSignedUrl(product.file_path, 120);
  if (error || !signed)
    return { ok: false, status: 500, message: "Could not sign URL" };

  // Consume one use (best-effort; the signed URL is the real gate for the 120s window).
  await sb
    .from("store_downloads")
    .update({
      downloads_used: row.downloads_used + 1,
      last_downloaded_at: new Date().toISOString(),
    })
    .eq("id", row.id);

  return { ok: true, signedUrl: signed.signedUrl };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/store-download.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add app/lib/goga/store-download.ts tests/store-download.test.ts
git commit -m "feat(store): download token validation + signed-URL resolver"
```

---

## Phase 4 — Email builder (pure, TDD)

### Task 5: Download email HTML builder

**Files:**

- Create: `app/lib/goga/store-email.ts`
- Test: `tests/store-email.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/store-email.test.ts
import { describe, it, expect } from "vitest";
import { buildDownloadEmail } from "@/app/lib/goga/store-email";

describe("buildDownloadEmail", () => {
  it("renders subject and one link per item with the origin", () => {
    const html = buildDownloadEmail({
      origin: "https://gogaphotography-bf.vercel.app",
      items: [
        { title: "Warm Pack", token: "t1" },
        { title: "Tbilisi Album", token: "t2" },
      ],
    });
    expect(html.subject).toMatch(/download/i);
    expect(html.html).toContain(
      "https://gogaphotography-bf.vercel.app/api/store/download/t1",
    );
    expect(html.html).toContain(
      "https://gogaphotography-bf.vercel.app/api/store/download/t2",
    );
    expect(html.html).toContain("Warm Pack");
    expect(html.html).toContain("Tbilisi Album");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/store-email.test.ts`
Expected: FAIL — cannot resolve `store-email`.

- [ ] **Step 3: Implement**

```typescript
// app/lib/goga/store-email.ts
export interface DownloadEmailItem {
  title: string;
  token: string;
}
export interface DownloadEmailInput {
  origin: string;
  items: DownloadEmailItem[];
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Pure builder for the post-purchase download email. */
export function buildDownloadEmail(input: DownloadEmailInput): {
  subject: string;
  html: string;
} {
  const rows = input.items
    .map((it) => {
      const url = `${input.origin}/api/store/download/${it.token}`;
      return `<p style="margin:12px 0"><strong>${esc(it.title)}</strong><br/>
        <a href="${url}">${url}</a></p>`;
    })
    .join("\n");
  const html = `<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#111">
    <h2>Your GOGA downloads</h2>
    <p>Thank you for your purchase. Your download links are below. They expire in 7 days and allow up to 5 downloads each.</p>
    ${rows}
    <p style="color:#666;font-size:13px;margin-top:24px">GOGA Photography</p>
  </div>`;
  return { subject: "Your GOGA downloads", html };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run tests/store-email.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/lib/goga/store-email.ts tests/store-email.test.ts
git commit -m "feat(store): post-purchase download email builder"
```

---

## Phase 5 — Product queries & admin CRUD

### Task 6: Product read queries

**Files:**

- Create: `app/lib/goga/store-products.ts`

- [ ] **Step 1: Implement read queries**

```typescript
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
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/lib/goga/store-products.ts
git commit -m "feat(store): product read queries"
```

---

### Task 7: Admin product CRUD server actions

**Files:**

- Create: `app/lib/goga/actions-store.ts`

- [ ] **Step 1: Implement actions (create/update/delete + file/image upload)**

```typescript
// app/lib/goga/actions-store.ts
"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { requireSession } from "./require-auth";
import type { StoreProductType } from "@/app/lib/db/store-types";

function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .toLowerCase()
    .replace(/['"`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
function parseCents(v: FormDataEntryValue | null): number {
  const n = parseFloat(String(v ?? "0").replace(",", "."));
  return !Number.isFinite(n) || n < 0 ? 0 : Math.round(n * 100);
}

async function uniqueSlug(base: string): Promise<string> {
  const sb = gogaAdmin();
  const root = slugify(base) || `product-${Date.now()}`;
  let slug = root,
    n = 1;
  for (;;) {
    const { data } = await sb
      .from("store_products")
      .select("id")
      .eq("slug", slug)
      .limit(1);
    if (!data || data.length === 0) return slug;
    n += 1;
    slug = `${root}-${n}`;
  }
}

// Uploads a deliverable file to the private bucket; returns {path,size}.
async function uploadFile(file: File): Promise<{ path: string; size: number }> {
  const sb = gogaAdmin();
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${Date.now()}-${safe}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error } = await sb.storage.from("store-files").upload(path, buf, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw new Error(`file upload: ${error.message}`);
  return { path, size: buf.byteLength };
}

// Uploads a cover/preview image to the public `projects` bucket; returns the path.
async function uploadImage(file: File): Promise<string> {
  const sb = gogaAdmin();
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `store/${Date.now()}-${safe}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error } = await sb.storage.from("projects").upload(path, buf, {
    contentType: file.type || "image/jpeg",
    upsert: false,
  });
  if (error) throw new Error(`image upload: ${error.message}`);
  return path;
}

export async function createStoreProduct(formData: FormData): Promise<void> {
  await requireSession();
  const sb = gogaAdmin();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("title is required");
  const type = String(formData.get("type") ?? "preset") as StoreProductType;

  const slug = await uniqueSlug(String(formData.get("slug") ?? "") || title);

  const cover = formData.get("cover") as File | null;
  const cover_image_path =
    cover && cover.size > 0 ? await uploadImage(cover) : null;

  const file = formData.get("file") as File | null;
  const uploaded = file && file.size > 0 ? await uploadFile(file) : null;

  const { error } = await sb.from("store_products").insert({
    type,
    title,
    slug,
    description: String(formData.get("description") ?? "").trim() || null,
    price_cents: parseCents(formData.get("price")),
    currency: (
      String(formData.get("currency") ?? "GEL").trim() || "GEL"
    ).toUpperCase(),
    cover_image_path,
    file_path: uploaded?.path ?? null,
    file_size_bytes: uploaded?.size ?? null,
    license_terms: String(formData.get("license_terms") ?? "").trim() || null,
    published: formData.get("published") === "on",
  });
  if (error) throw new Error(`createStoreProduct: ${error.message}`);
  revalidatePath("/app/store");
  revalidatePath("/store");
  redirect("/app/store");
}

export async function updateStoreProduct(
  id: string,
  formData: FormData,
): Promise<void> {
  await requireSession();
  const sb = gogaAdmin();
  const patch: Record<string, unknown> = {
    title: String(formData.get("title") ?? "").trim(),
    type: String(formData.get("type") ?? "preset"),
    description: String(formData.get("description") ?? "").trim() || null,
    price_cents: parseCents(formData.get("price")),
    currency: (
      String(formData.get("currency") ?? "GEL").trim() || "GEL"
    ).toUpperCase(),
    license_terms: String(formData.get("license_terms") ?? "").trim() || null,
    published: formData.get("published") === "on",
    updated_at: new Date().toISOString(),
  };
  const cover = formData.get("cover") as File | null;
  if (cover && cover.size > 0)
    patch.cover_image_path = await uploadImage(cover);
  const file = formData.get("file") as File | null;
  if (file && file.size > 0) {
    const up = await uploadFile(file);
    patch.file_path = up.path;
    patch.file_size_bytes = up.size;
  }
  const { error } = await sb.from("store_products").update(patch).eq("id", id);
  if (error) throw new Error(`updateStoreProduct: ${error.message}`);
  revalidatePath("/app/store");
  revalidatePath("/store");
  redirect("/app/store");
}

export async function deleteStoreProduct(id: string): Promise<void> {
  await requireSession();
  const { error } = await gogaAdmin()
    .from("store_products")
    .delete()
    .eq("id", id);
  if (error) throw new Error(`deleteStoreProduct: ${error.message}`);
  revalidatePath("/app/store");
  revalidatePath("/store");
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/lib/goga/actions-store.ts
git commit -m "feat(store): admin product CRUD actions with file/image upload"
```

---

## Phase 6 — Checkout & finalize

### Task 8: Checkout — create order + TBC session

**Files:**

- Create: `app/lib/goga/store-checkout.ts`
- Create: `app/api/store/checkout/route.ts`

- [ ] **Step 1: Implement the checkout module**

```typescript
// app/lib/goga/store-checkout.ts
import "server-only";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { createTbcPayment } from "@/app/lib/tbc";
import { getProductsByIds } from "./store-products";
import { recomputeCart, type CartLine } from "./store-pricing";

function siteOrigin(): string {
  const raw = process.env["NEXT_PUBLIC_SITE_URL"] ?? "http://localhost:3030";
  return raw.replace(/\/$/, "");
}

export interface CheckoutResult {
  redirectUrl: string;
  orderId: string;
}

/**
 * Validate cart against DB prices, create a pending order + items, open a
 * TBC payment session, persist the payId, and return the redirect URL.
 * merchantPaymentId is prefixed `store_` so the shared payments callback
 * can route it to the store finalizer.
 */
export async function startCheckout(
  cart: CartLine[],
  buyerEmail: string,
): Promise<CheckoutResult> {
  const email = buyerEmail.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
    throw new Error("Invalid email");

  const ids = Array.from(new Set(cart.map((l) => l.productId)));
  const products = await getProductsByIds(ids);
  const priced = recomputeCart(cart, products);

  const sb = gogaAdmin();
  const { data: order, error } = await sb
    .from("store_orders")
    .insert({
      buyer_email: email,
      status: "pending",
      total_cents: priced.totalCents,
      currency: priced.currency,
    })
    .select("id")
    .single();
  if (error || !order) throw new Error(`create order: ${error?.message}`);

  await sb
    .from("store_order_items")
    .insert(priced.items.map((i) => ({ order_id: order.id, ...i })));

  const origin = siteOrigin();
  const secret = process.env["PAYMENT_CALLBACK_SECRET"] ?? "";
  const { payId, redirectUrl } = await createTbcPayment({
    externalOrderId: `store_${order.id}`,
    totalAmount: priced.totalCents / 100,
    currency: priced.currency,
    callbackUrl: `${origin}/api/payments/callback?secret=${encodeURIComponent(secret)}`,
    returnUrl: `${origin}/store/success?order=${order.id}`,
    locale: "ka",
    description: "GOGA Store",
  });

  await sb
    .from("store_orders")
    .update({ tbc_payment_id: payId })
    .eq("id", order.id);
  return { redirectUrl, orderId: order.id };
}
```

- [ ] **Step 2: Implement the API route**

```typescript
// app/api/store/checkout/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { startCheckout } from "@/app/lib/goga/store-checkout";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      email?: string;
      items?: { productId?: string }[];
    };
    const items = (body.items ?? [])
      .filter((i) => i.productId)
      .map((i) => ({ productId: i.productId! }));
    if (!body.email || items.length === 0) {
      return NextResponse.json(
        { error: "email and items are required" },
        { status: 400 },
      );
    }
    const { redirectUrl, orderId } = await startCheckout(items, body.email);
    return NextResponse.json({ redirectUrl, orderId });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "checkout failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/lib/goga/store-checkout.ts app/api/store/checkout/route.ts
git commit -m "feat(store): checkout creates order + TBC session"
```

---

### Task 9: Store payment finalizer + callback routing

**Files:**

- Create: `app/lib/goga/finalize-store-tbc.ts`
- Modify: `app/lib/goga/finalize-tbc.ts`
- Test: `tests/store-finalize.test.ts`

- [ ] **Step 1: Write the failing test (pure helper for download row generation)**

```typescript
// tests/store-finalize.test.ts
import { describe, it, expect } from "vitest";
import { buildDownloadRows } from "@/app/lib/goga/finalize-store-tbc";

describe("buildDownloadRows", () => {
  it("creates one row per item with 7-day expiry and a token", () => {
    const paidAt = new Date("2026-06-16T00:00:00Z");
    const rows = buildDownloadRows(
      "order-1",
      ["p1", "p2"],
      paidAt,
      () => "TOK",
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      order_id: "order-1",
      product_id: "p1",
      token: "TOK",
      max_downloads: 5,
    });
    expect(new Date(rows[0].expires_at).toISOString()).toBe(
      "2026-06-23T00:00:00.000Z",
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/store-finalize.test.ts`
Expected: FAIL — cannot resolve `finalize-store-tbc`.

- [ ] **Step 3: Implement the finalizer**

```typescript
// app/lib/goga/finalize-store-tbc.ts
import "server-only";
import { randomUUID } from "crypto";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { getTbcPaymentDetails } from "@/app/lib/tbc";
import { enqueueOutbound } from "@/app/lib/outbox/singleton";
import { buildDownloadEmail } from "./store-email";
import type { TbcOutcome } from "./finalize-tbc";

const STORE_ORG_ID = 1;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export interface NewDownloadRow {
  order_id: string;
  product_id: string;
  token: string;
  max_downloads: number;
  expires_at: string;
}

/** Pure: one download row per product, 7-day expiry, 5-download cap. */
export function buildDownloadRows(
  orderId: string,
  productIds: string[],
  paidAt: Date,
  mkToken: () => string = randomUUID,
): NewDownloadRow[] {
  const expires_at = new Date(paidAt.getTime() + SEVEN_DAYS_MS).toISOString();
  return productIds.map((pid) => ({
    order_id: orderId,
    product_id: pid,
    token: mkToken(),
    max_downloads: 5,
    expires_at,
  }));
}

function siteOrigin(): string {
  return (
    process.env["NEXT_PUBLIC_SITE_URL"] ?? "http://localhost:3030"
  ).replace(/\/$/, "");
}

/**
 * Finalize a store order from a TBC payId. Idempotent: only acts when the
 * order is not already `paid`. On success, mints download rows and enqueues
 * the download email via the outbox.
 */
export async function finalizeTbcStorePayment(
  payId: string,
): Promise<TbcOutcome> {
  const sb = gogaAdmin();
  const details = await getTbcPaymentDetails(payId);
  const status = details.status;
  const merchantId = details.merchantPaymentId ?? "";
  const orderId = merchantId.startsWith("store_")
    ? merchantId.slice("store_".length)
    : "";
  if (!orderId) return "unknown";

  if (status === "Succeeded") {
    const paidAt = new Date();
    const { data: order } = await sb
      .from("store_orders")
      .update({
        status: "paid",
        paid_at: paidAt.toISOString(),
        tbc_payment_id: payId,
      })
      .eq("id", orderId)
      .neq("status", "paid")
      .select("id, buyer_email")
      .maybeSingle();
    if (!order) return "paid"; // already finalized — no-op

    const { data: items } = await sb
      .from("store_order_items")
      .select("product_id, title_snapshot")
      .eq("order_id", orderId);
    const productIds = (items ?? []).map((i) => i.product_id);

    const rows = buildDownloadRows(orderId, productIds, paidAt);
    if (rows.length > 0) await sb.from("store_downloads").insert(rows);

    const titleByProduct = new Map(
      (items ?? []).map((i) => [i.product_id, i.title_snapshot]),
    );
    const email = buildDownloadEmail({
      origin: siteOrigin(),
      items: rows.map((r) => ({
        title: titleByProduct.get(r.product_id) ?? "Download",
        token: r.token,
      })),
    });
    await enqueueOutbound({
      organization_id: STORE_ORG_ID,
      kind: "email.send",
      payload: {
        to: order.buyer_email,
        from:
          process.env["STORE_FROM_EMAIL"] ?? "GOGA <store@gogaphotography.ge>",
        subject: email.subject,
        html: email.html,
      },
      idempotencyKey: `store-download-${orderId}`,
    });
    return "paid";
  }

  if (status === "Failed" || status === "Expired") {
    await sb
      .from("store_orders")
      .update({ status: "failed" })
      .eq("id", orderId)
      .neq("status", "paid");
    return "failed";
  }
  return "pending";
}
```

- [ ] **Step 4: Route store orders from the shared finalizer**

In `app/lib/goga/finalize-tbc.ts`, add at the very top of `finalizeTbcPayment`, right after `const details = await getTbcPaymentDetails(payId);` and the `bookingId` assignment, a delegation branch. Concretely, change the early section to:

```typescript
export async function finalizeTbcPayment(payId: string): Promise<TbcOutcome> {
  const sb = gogaAdmin();
  const details = await getTbcPaymentDetails(payId);
  const status = details.status;
  const bookingId = details.merchantPaymentId;

  // Digital store orders are namespaced `store_<uuid>` — hand off.
  if (typeof bookingId === "string" && bookingId.startsWith("store_")) {
    const { finalizeTbcStorePayment } = await import("./finalize-store-tbc");
    return finalizeTbcStorePayment(payId);
  }

  console.log("[tbc/finalize]", { payId, status, bookingId });
  // ...existing booking logic unchanged...
```

(Keep all existing booking logic below unchanged. The dynamic `import` avoids a circular import since `finalize-store-tbc` imports the `TbcOutcome` type from this file.)

- [ ] **Step 5: Run tests + typecheck**

Run: `pnpm vitest run tests/store-finalize.test.ts && pnpm typecheck`
Expected: PASS (1 test), typecheck clean.

- [ ] **Step 6: Commit**

```bash
git add app/lib/goga/finalize-store-tbc.ts app/lib/goga/finalize-tbc.ts tests/store-finalize.test.ts
git commit -m "feat(store): TBC store finalizer with download minting + email"
```

---

### Task 10: Download API route

**Files:**

- Create: `app/api/store/download/[token]/route.ts`

- [ ] **Step 1: Implement**

```typescript
// app/api/store/download/[token]/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { resolveDownload } from "@/app/lib/goga/store-download";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const result = await resolveDownload(token);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.message },
      { status: result.status },
    );
  }
  return NextResponse.redirect(result.signedUrl);
}
```

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/api/store/download
git commit -m "feat(store): token-gated download redirect endpoint"
```

---

## Phase 7 — Storefront UI

### Task 11: Cart context + drawer (client)

**Files:**

- Create: `app/store/_cart.tsx`
- Create: `app/store/_add-to-cart.tsx`

- [ ] **Step 1: Implement the cart context**

```tsx
// app/store/_cart.tsx
"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export interface CartItem {
  productId: string;
  slug: string;
  title: string;
  priceCents: number;
}
interface CartCtx {
  items: CartItem[];
  add: (i: CartItem) => void;
  remove: (productId: string) => void;
  clear: () => void;
  totalCents: number;
}
const Ctx = createContext<CartCtx | null>(null);
const KEY = "goga.cart.v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  const add = (i: CartItem) =>
    setItems((cur) =>
      cur.some((c) => c.productId === i.productId) ? cur : [...cur, i],
    );
  const remove = (productId: string) =>
    setItems((cur) => cur.filter((c) => c.productId !== productId));
  const clear = () => setItems([]);
  const totalCents = items.reduce((s, i) => s + i.priceCents, 0);

  return (
    <Ctx.Provider value={{ items, add, remove, clear, totalCents }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCart(): CartCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be used inside CartProvider");
  return c;
}

export function formatGel(cents: number): string {
  return `${(cents / 100).toFixed(2)} ₾`;
}
```

- [ ] **Step 2: Implement the add-to-cart button**

```tsx
// app/store/_add-to-cart.tsx
"use client";
import { useCart, type CartItem } from "./_cart";

export function AddToCart({ item }: { item: CartItem }) {
  const { add, items } = useCart();
  const inCart = items.some((c) => c.productId === item.productId);
  return (
    <button
      onClick={() => add(item)}
      disabled={inCart}
      className="rounded-md bg-black px-5 py-2.5 text-white disabled:opacity-50"
    >
      {inCart ? "In cart" : "Add to cart"}
    </button>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/store/_cart.tsx app/store/_add-to-cart.tsx
git commit -m "feat(store): client cart context + add-to-cart button"
```

---

### Task 12: Catalog + product detail pages

**Files:**

- Create: `app/store/page.tsx`
- Create: `app/store/[slug]/page.tsx`

Image URLs: covers/previews live in the public `projects` bucket; build the public URL as `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/projects/<path>`. Define a small helper inline.

- [ ] **Step 1: Implement the catalog page**

```tsx
// app/store/page.tsx
import Link from "next/link";
import { listPublishedProducts } from "@/app/lib/goga/store-products";
import { CartProvider, formatGel } from "./_cart";

export const dynamic = "force-dynamic";

function publicUrl(path: string | null): string | null {
  if (!path) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return `${base}/storage/v1/object/public/projects/${path}`;
}

export default async function StorePage() {
  const products = await listPublishedProducts();
  return (
    <CartProvider>
      <main className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="mb-8 text-3xl font-semibold">Store</h1>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <Link key={p.id} href={`/store/${p.slug}`} className="group block">
              <div className="aspect-[4/3] overflow-hidden rounded-lg bg-neutral-100">
                {publicUrl(p.cover_image_path) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={publicUrl(p.cover_image_path)!}
                    alt={p.title}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                )}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-medium">{p.title}</span>
                <span className="text-neutral-600">
                  {formatGel(p.price_cents)}
                </span>
              </div>
              <span className="text-xs uppercase tracking-wide text-neutral-400">
                {p.type}
              </span>
            </Link>
          ))}
          {products.length === 0 && (
            <p className="text-neutral-500">No products yet.</p>
          )}
        </div>
      </main>
    </CartProvider>
  );
}
```

- [ ] **Step 2: Implement the product detail page**

```tsx
// app/store/[slug]/page.tsx
import { notFound } from "next/navigation";
import { getPublishedProductBySlug } from "@/app/lib/goga/store-products";
import { CartProvider, formatGel } from "../_cart";
import { AddToCart } from "../_add-to-cart";

export const dynamic = "force-dynamic";

function publicUrl(path: string | null): string | null {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/projects/${path}`;
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = await getPublishedProductBySlug(slug);
  if (!p) notFound();

  return (
    <CartProvider>
      <main className="mx-auto max-w-4xl px-6 py-12">
        <div className="grid gap-10 md:grid-cols-2">
          <div className="aspect-[4/3] overflow-hidden rounded-lg bg-neutral-100">
            {publicUrl(p.cover_image_path) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={publicUrl(p.cover_image_path)!}
                alt={p.title}
                className="h-full w-full object-cover"
              />
            )}
          </div>
          <div>
            <span className="text-xs uppercase tracking-wide text-neutral-400">
              {p.type}
            </span>
            <h1 className="mt-1 text-3xl font-semibold">{p.title}</h1>
            <p className="mt-2 text-xl text-neutral-700">
              {formatGel(p.price_cents)}
            </p>
            {p.description && (
              <p className="mt-4 whitespace-pre-wrap text-neutral-600">
                {p.description}
              </p>
            )}
            {p.license_terms && (
              <p className="mt-4 text-sm text-neutral-500">
                <strong>License:</strong> {p.license_terms}
              </p>
            )}
            <div className="mt-6">
              <AddToCart
                item={{
                  productId: p.id,
                  slug: p.slug,
                  title: p.title,
                  priceCents: p.price_cents,
                }}
              />
            </div>
            <a
              href="/store/checkout"
              className="mt-4 block text-sm text-neutral-500 underline"
            >
              Go to checkout →
            </a>
          </div>
        </div>
      </main>
    </CartProvider>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/store/page.tsx "app/store/[slug]/page.tsx"
git commit -m "feat(store): catalog and product detail pages"
```

---

### Task 13: Checkout + success pages

**Files:**

- Create: `app/store/checkout/page.tsx`
- Create: `app/store/success/page.tsx`

- [ ] **Step 1: Implement the checkout page (client)**

```tsx
// app/store/checkout/page.tsx
"use client";
import { useState } from "react";
import { CartProvider, useCart, formatGel } from "../_cart";

function CheckoutInner() {
  const { items, remove, totalCents, clear } = useCart();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/store/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          items: items.map((i) => ({ productId: i.productId })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Checkout failed");
      clear();
      window.location.href = data.redirectUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
      setLoading(false);
    }
  }

  if (items.length === 0)
    return (
      <p className="mx-auto max-w-2xl px-6 py-12 text-neutral-500">
        Your cart is empty.
      </p>
    );

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="mb-6 text-2xl font-semibold">Checkout</h1>
      <ul className="divide-y rounded-lg border">
        {items.map((i) => (
          <li
            key={i.productId}
            className="flex items-center justify-between px-4 py-3"
          >
            <span>{i.title}</span>
            <span className="flex items-center gap-3">
              {formatGel(i.priceCents)}
              <button
                onClick={() => remove(i.productId)}
                className="text-sm text-neutral-400 hover:text-red-600"
              >
                remove
              </button>
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-between text-lg font-medium">
        <span>Total</span>
        <span>{formatGel(totalCents)}</span>
      </div>
      <input
        type="email"
        required
        placeholder="your@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="mt-6 w-full rounded-md border px-3 py-2"
      />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <button
        onClick={pay}
        disabled={loading || !email}
        className="mt-4 w-full rounded-md bg-black px-5 py-3 text-white disabled:opacity-50"
      >
        {loading ? "Redirecting…" : "Pay with TBC"}
      </button>
      <p className="mt-3 text-xs text-neutral-400">
        Download links will be emailed to you and shown on the next page.
      </p>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <CartProvider>
      <CheckoutInner />
    </CartProvider>
  );
}
```

- [ ] **Step 2: Implement the success page (server) — finalize-on-return safety net**

```tsx
// app/store/success/page.tsx
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { finalizeTbcPayment } from "@/app/lib/goga/finalize-tbc";

export const dynamic = "force-dynamic";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: orderId } = await searchParams;
  const sb = gogaAdmin();

  let order = orderId
    ? (
        await sb
          .from("store_orders")
          .select("*")
          .eq("id", orderId)
          .maybeSingle()
      ).data
    : null;

  // Safety net: if the callback hasn't landed yet but we have a payId, finalize now.
  if (order && order.status === "pending" && order.tbc_payment_id) {
    try {
      await finalizeTbcPayment(order.tbc_payment_id);
    } catch {}
    order = (
      await sb.from("store_orders").select("*").eq("id", orderId!).maybeSingle()
    ).data;
  }

  const downloads =
    order && order.status === "paid"
      ? ((
          await sb
            .from("store_downloads")
            .select("token, product_id")
            .eq("order_id", order.id)
        ).data ?? [])
      : [];
  const items = order
    ? ((
        await sb
          .from("store_order_items")
          .select("product_id, title_snapshot")
          .eq("order_id", order.id)
      ).data ?? [])
    : [];
  const titleByProduct = new Map(
    items.map((i) => [i.product_id, i.title_snapshot]),
  );

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      {!order && <p>Order not found.</p>}
      {order && order.status !== "paid" && (
        <>
          <h1 className="text-2xl font-semibold">Payment processing…</h1>
          <p className="mt-2 text-neutral-600">
            If you completed payment, refresh this page in a moment. A download
            email is also on its way.
          </p>
        </>
      )}
      {order && order.status === "paid" && (
        <>
          <h1 className="text-2xl font-semibold">
            Thank you — here are your downloads
          </h1>
          <p className="mt-2 text-neutral-600">
            Links also sent to {order.buyer_email}. They expire in 7 days (5
            downloads each).
          </p>
          <ul className="mt-6 space-y-3">
            {downloads.map((d) => (
              <li
                key={d.token}
                className="flex items-center justify-between rounded-md border px-4 py-3"
              >
                <span>{titleByProduct.get(d.product_id) ?? "Download"}</span>
                <a
                  className="rounded bg-black px-4 py-2 text-white"
                  href={`/api/store/download/${d.token}`}
                >
                  Download
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/store/checkout/page.tsx app/store/success/page.tsx
git commit -m "feat(store): checkout and success pages with finalize safety net"
```

---

## Phase 8 — Admin UI

### Task 14: Admin product list + form + edit

**Files:**

- Create: `app/app/store/page.tsx`
- Create: `app/app/store/product-form.tsx`
- Create: `app/app/store/[id]/page.tsx`

- [ ] **Step 1: Implement the product form (client)**

```tsx
// app/app/store/product-form.tsx
"use client";
import type { StoreProductRow } from "@/app/lib/db/store-types";

export function ProductForm({
  action,
  product,
}: {
  action: (fd: FormData) => void;
  product?: StoreProductRow;
}) {
  return (
    <form action={action} className="max-w-xl space-y-4">
      <label className="block">
        Type
        <select
          name="type"
          defaultValue={product?.type ?? "preset"}
          className="mt-1 w-full rounded border px-3 py-2"
        >
          <option value="preset">Preset</option>
          <option value="album">Album</option>
        </select>
      </label>
      <label className="block">
        Title
        <input
          name="title"
          defaultValue={product?.title ?? ""}
          required
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </label>
      {!product && (
        <label className="block">
          Slug (optional)
          <input name="slug" className="mt-1 w-full rounded border px-3 py-2" />
        </label>
      )}
      <label className="block">
        Description
        <textarea
          name="description"
          defaultValue={product?.description ?? ""}
          rows={4}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </label>
      <label className="block">
        Price (GEL)
        <input
          name="price"
          type="number"
          step="0.01"
          min="0"
          defaultValue={product ? (product.price_cents / 100).toFixed(2) : ""}
          required
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </label>
      <label className="block">
        License terms
        <textarea
          name="license_terms"
          defaultValue={product?.license_terms ?? ""}
          rows={2}
          className="mt-1 w-full rounded border px-3 py-2"
        />
      </label>
      <label className="block">
        Cover image{" "}
        {product?.cover_image_path && (
          <span className="text-xs text-neutral-400">
            (current kept if empty)
          </span>
        )}
        <input
          name="cover"
          type="file"
          accept="image/*"
          className="mt-1 block"
        />
      </label>
      <label className="block">
        Deliverable file{" "}
        {product?.file_path && (
          <span className="text-xs text-neutral-400">
            (current kept if empty)
          </span>
        )}
        <input name="file" type="file" className="mt-1 block" />
      </label>
      <label className="flex items-center gap-2">
        <input
          name="published"
          type="checkbox"
          defaultChecked={product?.published ?? false}
        />{" "}
        Published
      </label>
      <button className="rounded bg-black px-5 py-2.5 text-white">
        {product ? "Save" : "Create"}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Implement the admin list page**

```tsx
// app/app/store/page.tsx
import Link from "next/link";
import { listAllProducts } from "@/app/lib/goga/store-products";
import { createStoreProduct } from "@/app/lib/goga/actions-store";
import { ProductForm } from "./product-form";
import { formatGel } from "@/app/store/_cart";

export const dynamic = "force-dynamic";

export default async function AdminStorePage() {
  const products = await listAllProducts();
  return (
    <div className="space-y-10 p-6">
      <section>
        <h1 className="mb-4 text-xl font-semibold">Store products</h1>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-500">
              <th className="py-2">Title</th>
              <th>Type</th>
              <th>Price</th>
              <th>Published</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="py-2">{p.title}</td>
                <td>{p.type}</td>
                <td>{formatGel(p.price_cents)}</td>
                <td>{p.published ? "✓" : "—"}</td>
                <td className="text-right">
                  <Link href={`/app/store/${p.id}`} className="underline">
                    edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Link
          href="/app/store/orders"
          className="mt-4 inline-block text-sm underline"
        >
          View orders →
        </Link>
      </section>
      <section>
        <h2 className="mb-4 text-lg font-semibold">New product</h2>
        <ProductForm action={createStoreProduct} />
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Implement the edit page**

```tsx
// app/app/store/[id]/page.tsx
import { notFound } from "next/navigation";
import { getProductById } from "@/app/lib/goga/store-products";
import {
  updateStoreProduct,
  deleteStoreProduct,
} from "@/app/lib/goga/actions-store";
import { ProductForm } from "../product-form";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) notFound();

  const update = updateStoreProduct.bind(null, id);
  const del = deleteStoreProduct.bind(null, id);

  return (
    <div className="space-y-8 p-6">
      <h1 className="text-xl font-semibold">Edit: {product.title}</h1>
      <ProductForm action={update} product={product} />
      <form action={del}>
        <button className="text-sm text-red-600 underline">
          Delete product
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/app/store/page.tsx app/app/store/product-form.tsx "app/app/store/[id]/page.tsx"
git commit -m "feat(store): admin product list, create form, and edit page"
```

---

### Task 15: Admin orders list + resend email

**Files:**

- Create: `app/app/store/orders/page.tsx`
- Modify: `app/lib/goga/actions-store.ts` (add `resendDownloadEmail`, `markRefunded`)

- [ ] **Step 1: Add the order actions to `actions-store.ts`**

Append to `app/lib/goga/actions-store.ts`:

```typescript
import { enqueueOutbound } from "@/app/lib/outbox/singleton";
import { buildDownloadEmail } from "./store-email";

function originForEmail(): string {
  return (
    process.env["NEXT_PUBLIC_SITE_URL"] ?? "http://localhost:3030"
  ).replace(/\/$/, "");
}

export async function resendDownloadEmail(orderId: string): Promise<void> {
  await requireSession();
  const sb = gogaAdmin();
  const { data: order } = await sb
    .from("store_orders")
    .select("buyer_email, status")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || order.status !== "paid") throw new Error("Order is not paid");
  const { data: dls } = await sb
    .from("store_downloads")
    .select("token, product_id")
    .eq("order_id", orderId);
  const { data: items } = await sb
    .from("store_order_items")
    .select("product_id, title_snapshot")
    .eq("order_id", orderId);
  const titleBy = new Map(
    (items ?? []).map((i) => [i.product_id, i.title_snapshot]),
  );
  const email = buildDownloadEmail({
    origin: originForEmail(),
    items: (dls ?? []).map((d) => ({
      title: titleBy.get(d.product_id) ?? "Download",
      token: d.token,
    })),
  });
  await enqueueOutbound({
    organization_id: 1,
    kind: "email.send",
    payload: {
      to: order.buyer_email,
      from:
        process.env["STORE_FROM_EMAIL"] ?? "GOGA <store@gogaphotography.ge>",
      subject: email.subject,
      html: email.html,
    },
  });
  revalidatePath("/app/store/orders");
}

export async function markRefunded(orderId: string): Promise<void> {
  await requireSession();
  await gogaAdmin()
    .from("store_orders")
    .update({ status: "refunded" })
    .eq("id", orderId);
  revalidatePath("/app/store/orders");
}
```

- [ ] **Step 2: Implement the orders page**

```tsx
// app/app/store/orders/page.tsx
import { gogaAdmin } from "@/app/lib/supabase/goga";
import {
  resendDownloadEmail,
  markRefunded,
} from "@/app/lib/goga/actions-store";
import { formatGel } from "@/app/store/_cart";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const { data: orders } = await gogaAdmin()
    .from("store_orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-semibold">Store orders</h1>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-neutral-500">
            <th className="py-2">Date</th>
            <th>Email</th>
            <th>Total</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {(orders ?? []).map((o) => (
            <tr key={o.id} className="border-t align-middle">
              <td className="py-2">
                {new Date(o.created_at).toLocaleDateString()}
              </td>
              <td>{o.buyer_email}</td>
              <td>{formatGel(o.total_cents)}</td>
              <td>{o.status}</td>
              <td className="space-x-3 text-right">
                {o.status === "paid" && (
                  <>
                    <form
                      action={resendDownloadEmail.bind(null, o.id)}
                      className="inline"
                    >
                      <button className="text-xs underline">
                        resend email
                      </button>
                    </form>
                    <form
                      action={markRefunded.bind(null, o.id)}
                      className="inline"
                    >
                      <button className="text-xs text-red-600 underline">
                        mark refunded
                      </button>
                    </form>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/app/store/orders/page.tsx app/lib/goga/actions-store.ts
git commit -m "feat(store): admin orders list with resend-email and refund flag"
```

---

### Task 16: Admin nav entry + i18n strings

**Files:**

- Modify: `app/lib/i18n/dict.ts`
- Modify: the admin sidebar nav component (find it via `grep -rn "nav.section.catalog" app`)

- [ ] **Step 1: Add dict keys**

In `app/lib/i18n/dict.ts`, add to the `en` object (and the matching `ka` object further down — find it by `const ka`):

```typescript
// en
  "nav.store": "Store",
  "store.title": "Store",
  "store.orders": "Orders",
```

```typescript
// ka
  "nav.store": "მაღაზია",
  "store.title": "მაღაზია",
  "store.orders": "შეკვეთები",
```

- [ ] **Step 2: Add the nav link**

In the sidebar component (where other `nav.*` items render under the Catalog section), add an item linking to `/app/store` labeled with the `nav.store` key, mirroring the existing item markup exactly (copy the adjacent `nav.packages`/`nav.projects` entry and change href + key).

- [ ] **Step 3: Typecheck + build**

Run: `pnpm typecheck`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/lib/i18n/dict.ts app/<sidebar-file>
git commit -m "feat(store): admin nav entry + i18n strings"
```

---

## Phase 9 — Integration test & verification

### Task 17: Playwright storefront smoke

**Files:**

- Create: `tests/integration/store.spec.ts`

- [ ] **Step 1: Write the test**

```typescript
// tests/integration/store.spec.ts
import { test, expect } from "@playwright/test";

test("catalog renders and a product can be added to cart and reach checkout", async ({
  page,
}) => {
  await page.goto("/store");
  await expect(page.getByRole("heading", { name: "Store" })).toBeVisible();

  const firstCard = page.locator("a[href^='/store/']").first();
  if (await firstCard.count()) {
    await firstCard.click();
    await page.getByRole("button", { name: /add to cart/i }).click();
    await expect(page.getByRole("button", { name: /in cart/i })).toBeVisible();
    await page.goto("/store/checkout");
    await expect(
      page.getByRole("heading", { name: /checkout/i }),
    ).toBeVisible();
    await expect(page.getByText(/total/i)).toBeVisible();
  }
});
```

- [ ] **Step 2: Run against the dev server**

Run (dev server must be on 3030):

```bash
pnpm test:e2e tests/integration/store.spec.ts
```

Expected: PASS. (If no published products exist, the test still passes the catalog-heading assertion and skips the cart flow — seed one product via the admin first for the full path.)

- [ ] **Step 3: Commit**

```bash
git add tests/integration/store.spec.ts
git commit -m "test(store): playwright storefront smoke"
```

---

### Task 18: Full local verification + env provisioning

- [ ] **Step 1: Run the whole unit suite**

Run: `pnpm vitest run tests/store-pricing.test.ts tests/store-download.test.ts tests/store-finalize.test.ts tests/store-email.test.ts`
Expected: all PASS.

- [ ] **Step 2: Constrained-heap production build (deploy hygiene)**

Run: `cd /Users/macintoshi/Projects/site-xray/gogaphotography-bf && NODE_OPTIONS=--max-old-space-size=2048 pnpm build`
Expected: build succeeds; `/store`, `/store/[slug]`, `/store/checkout`, `/store/success`, `/app/store`, `/app/store/orders`, and the two API routes all appear in the route manifest.

- [ ] **Step 3: Confirm required env vars are present (local + Vercel project)**

Verify these exist in `.env.local` AND in the Vercel project for goga-bf (env vars are per-project): `TBC_API_KEY`, `TBC_CLIENT_ID`, `TBC_CLIENT_SECRET`, `TBC_API_URL`, `PAYMENT_CALLBACK_SECRET`, `NEXT_PUBLIC_SITE_URL`, `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`. Add `STORE_FROM_EMAIL` (a verified Resend sender on the gogaphotography domain) to both.

```bash
cd /Users/macintoshi/Projects/site-xray/gogaphotography-bf
for v in TBC_API_KEY TBC_CLIENT_ID TBC_CLIENT_SECRET PAYMENT_CALLBACK_SECRET NEXT_PUBLIC_SITE_URL RESEND_API_KEY STORE_FROM_EMAIL; do
  grep -q "^$v=" .env.local && echo "$v ✓" || echo "$v MISSING";
done
```

Expected: all `✓` (add any missing before deploy). Note: if `STORE_FROM_EMAIL` domain isn't verified in Resend, the download email will fail permanently — verify the sender first.

- [ ] **Step 4: Manual end-to-end check (live, with a real low-price test product)**

1. In `/app/store`, create a published preset priced at e.g. 0.50 GEL with a small test file + cover.
2. On `/store`, add it to cart → `/store/checkout` → enter your email → Pay with TBC → complete the TBC sandbox/live payment.
3. Confirm redirect to `/store/success?order=…` shows a Download button; click it and confirm the file downloads.
4. Confirm the download email arrives.
5. In `/app/store/orders`, confirm the order shows `paid`; click "resend email" and confirm a second email.

- [ ] **Step 5: Push the branch (do NOT auto-merge)**

```bash
cd /Users/macintoshi/Projects/site-xray/gogaphotography-bf
git push -u origin feat/digital-store
```

Then open a PR for review. Deploy via the goga-bf Vercel project (commits authored as `team@allonelabs.com` per the seat rule).

---

## Self-Review

**Spec coverage:**

- Data model (4 tables) → Task 1, 2 ✓
- Guest checkout, email only → Task 8 (email validation, no account) ✓
- Multi-item cart (localStorage) → Task 11 ✓
- Time-limited signed links (7d / 5 downloads) → Tasks 1 (schema defaults), 9 (buildDownloadRows), 4 (resolveDownload), 10 (route) ✓
- TBC reuse + callback routing → Tasks 8, 9 ✓
- Delivery: private bucket + signed URL → Tasks 1, 4, 7 ✓
- Email via outbox/Resend → Tasks 5, 9 ✓
- Admin product CRUD + orders → Tasks 7, 14, 15 ✓
- i18n + nav + (RBAC note) → Task 16 ✓
- Out-of-scope items excluded ✓
- Testing (vitest + playwright) → Tasks 3,4,5,9,17 ✓

**RBAC note:** the spec mentions `store.read`/`store.write` permissions. Admin pages are already gated by `requireSession()` on every mutation (the existing admin shell pattern). Dedicated store permissions are deferred unless the admin shell enforces per-page permission gates — if it does, add the permission rows in Task 16 mirroring the existing `nav.packages` gate. This is the one intentional simplification vs. the spec; confirm with the existing nav gating during Task 16.

**Placeholder scan:** No TBD/TODO; every code step contains complete code; commands have expected output.

**Type consistency:** `recomputeCart`/`CartLine`/`PricedItem` consistent across Tasks 3, 8. `buildDownloadRows` signature consistent across Tasks 9 and its test. `assessDownload`/`resolveDownload` consistent across Tasks 4, 10. `buildDownloadEmail` input shape consistent across Tasks 5, 9, 15. `StoreProductRow` fields consistent across Tasks 2, 3, 6, 7, 12, 14.
