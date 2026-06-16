# Digital Store — Design Spec

**Date:** 2026-06-16
**Project:** gogaphotography-bf
**Sub-project:** A of 4 (Store → Blog → Pinterest → Meta chatbots)
**Status:** Approved design, pre-implementation

## Summary

A public-facing digital storefront on the GOGA Photography site for selling
**digital albums** (downloadable photo packs / PDFs) and **Lightroom-style
presets**. Guest checkout via the existing **TBC Bank** payment rail (currency
GEL), multi-item cart, and secure **time-limited signed download links**
delivered on the success page and by email.

This reuses existing infrastructure heavily:

- TBC payment client (`app/lib/tbc.ts`) + callback/finalize pattern
  (`app/api/payments/*`, `app/lib/goga/finalize-tbc.ts`)
- Outbox + Resend email (`app/lib/outbox/*`, `app/lib/email/handler.ts`)
- Supabase storage buckets + signed-URL serving pattern
- Admin shell, TanStack tables, upload patterns under `app/app/*`

## Decisions (locked)

| Decision      | Choice                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------ |
| Album meaning | Digital download (zip/PDF), same delivery path as presets                                        |
| Checkout      | **Guest** — email only, no account required                                                      |
| Cart          | **Multi-item** cart (client-side, localStorage)                                                  |
| Delivery      | **Time-limited signed download links** (7-day expiry, 5-download cap) shown on success + emailed |
| Payment rail  | TBC Bank TPay, currency GEL                                                                      |
| Data model    | New clean `store_*` tables (NOT the legacy tourism `p_order` schema)                             |

## Data model — new migration `goga_0004_store.sql`

### `store_products`

- `id` (uuid pk)
- `type` — `'album' | 'preset'` (check constraint)
- `title`, `slug` (unique), `description`
- `price_cents` (int), `currency` (text default `'GEL'`)
- `cover_image_path` (text — public `projects` bucket)
- `preview_image_paths` (text[] — public previews)
- `file_path` (text — private `store-files` bucket, the deliverable)
- `file_size_bytes` (bigint)
- `license_terms` (text — primarily for presets)
- `metadata` (jsonb — preset: `{software: ['Lightroom','ACR'], count: 20}`; album: `{pages: 30, format: 'PDF'}`)
- `published` (bool default false)
- `created_at`, `updated_at`

### `store_orders`

- `id` (uuid pk)
- `buyer_email` (text)
- `status` — `'pending' | 'paid' | 'failed' | 'refunded'`
- `total_cents` (int), `currency` (text)
- `tbc_payment_id` (text — links to TBC session)
- `created_at`, `paid_at`

### `store_order_items`

- `id` (uuid pk)
- `order_id` (fk → store_orders)
- `product_id` (fk → store_products)
- `title_snapshot` (text), `price_cents_snapshot` (int) — preserve price at purchase time

### `store_downloads`

- `id` (uuid pk)
- `order_id` (fk), `product_id` (fk)
- `token` (text unique — random, used in download URL)
- `downloads_used` (int default 0), `max_downloads` (int default 5)
- `expires_at` (timestamptz — paid_at + 7 days)
- `last_downloaded_at` (timestamptz nullable)

RLS: products readable by anon when `published = true`; orders/downloads
service-role only (no client read). Admin access via existing org/role gates.

## Storefront (public routes)

- **`/store`** — catalog grid. Filter tabs: All | Albums | Presets. Card =
  cover image, title, price (GEL). Only `published` products.
- **`/store/[slug]`** — product detail: preview gallery, description, license
  (presets), metadata, **Add to cart** button.
- **Cart** — client-side state persisted in `localStorage` (guest, no account).
  Cart drawer component with line items + total + **Checkout**.
- **`/store/checkout`** — collects `buyer_email`, shows order summary →
  POST `/api/store/checkout` → creates `store_order` (pending) + items →
  creates TBC session → redirect to TBC hosted payment.
- **`/store/success?order=<id>`** — on return, shows order status and the
  per-product download links once `paid`.

## Checkout & payment flow

1. `POST /api/store/checkout` — validate cart items against DB prices
   (server recomputes total, ignores client total), create `store_order`
   (`pending`) + `store_order_items`, call `lib/tbc.ts` to create a payment
   session (amount = server total, return URL = `/store/success?order=<id>`,
   callback URL = existing payments callback), store `tbc_payment_id`.
2. TBC callback / return → reuse `finalize-tbc.ts` pattern extended to handle
   store orders: confirm `paid` status with TBC (bank as source of truth),
   set order `paid` + `paid_at`, generate `store_downloads` rows
   (one per item, token, expiry = paid_at + 7d, max 5), enqueue an
   `email.send` outbox event with the download links.
3. Idempotent: re-processing a callback for an already-`paid` order is a no-op.

## Delivery

- New **private** Supabase bucket `store-files` for deliverables; previews and
  covers use the existing public `projects` bucket.
- **`GET /api/store/download/[token]`** — look up `store_downloads` by token;
  reject if expired or `downloads_used >= max_downloads`; increment
  `downloads_used`, set `last_downloaded_at`; return a short-lived Supabase
  signed URL (redirect/stream) for `file_path`.
- Email (Resend via outbox) contains the same tokenized
  `/api/store/download/<token>` links.

## Admin (`/app/app/store`)

- **Products**: TanStack table list; create/edit form — type, title, slug,
  description, price, license, metadata; upload deliverable file (→ `store-files`)
  - cover/preview images (→ `projects`); publish toggle. Reuses existing upload
    helpers and form (React Hook Form + Zod) patterns.
- **Orders**: list with status, buyer email, items, total; actions — resend
  download email, mark refunded (flag only, no automated TBC refund in v1).
- New `store.read` / `store.write` RBAC permissions; nav entry in admin shell.
- i18n: add KA/EN strings to `app/lib/i18n/dict.ts`.

## Out of scope (v1 — YAGNI)

- Discount/coupon codes
- VAT invoices / formal receipts
- Watermarked preview samples
- Account-based purchase history / persistent re-download portal
- Inventory limits (digital goods are unlimited)
- Automated TBC refunds (manual flag only)

## Testing

- **Vitest**: server-side order total recomputation; download token validation
  (expiry, max-download enforcement, increment); finalize state machine
  (pending→paid idempotency, failed path).
- **Playwright** (`tests/integration/`): catalog renders published products →
  add to cart → checkout redirects to TBC (mock); admin can create a product
  and see it published on the storefront.

## Open assumptions

- Currency is GEL only (TBC). Multi-currency not needed.
- Deliverable files are reasonably sized for Supabase Storage signed-URL
  download (no chunked/resumable delivery in v1).
- Email delivery uses the existing Resend sender already configured for the org.
