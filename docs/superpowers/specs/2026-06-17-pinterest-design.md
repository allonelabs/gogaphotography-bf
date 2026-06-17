# Pinterest Automation — Design Spec

**Date:** 2026-06-17
**Project:** gogaphotography-bf
**Sub-project:** C of 4 (Store ✓ → Blog ✓ → **Pinterest** → Meta chatbots)
**Status:** Approved design, pre-implementation

## Summary

Automated Pinterest syndication of GOGA content: blog posts, store products,
and portfolio projects. Publishing content enqueues a pin; a Vercel cron drips
pins onto Pinterest on a steady cadence, mapping content to boards by
category/type. Uses Pinterest API v5 with a proper OAuth connection
(access + refresh tokens).

Reuses: `gogaAdmin()` client, migration convention, the public site URL +
`projects` bucket image URLs, `AppShell` admin shell, server-action style,
`vercel.json` for cron.

## External dependency (blocks live posting only)

Real posting requires a **Pinterest developer app**: `PINTEREST_APP_ID` +
`PINTEREST_APP_SECRET` in env, a registered OAuth redirect URI
(`<site>/api/pinterest/oauth/callback`), and the studio authorizing it once via
the admin "Connect Pinterest" button. All code is built and unit/build verified
without it; the live OAuth + first real pin wait on this app.

## Decisions (locked)

| Decision           | Choice                                                             |
| ------------------ | ------------------------------------------------------------------ |
| Content syndicated | Blog posts + store products + portfolio projects                   |
| Trigger            | Scheduled **drip from a queue** + Vercel cron                      |
| Board mapping      | **By category/type** (with default fallback)                       |
| Auth               | Pinterest API v5 **OAuth** (access + refresh tokens, auto-refresh) |
| Cadence            | Cron every 2h, `pins_per_run` items per run (default 1)            |

## Data model — new migration `goga_0006_pinterest.sql`

### `pinterest_settings` (singleton, `id = 1`)

- `id` (int pk default 1, check id = 1)
- `access_token` (text null), `refresh_token` (text null), `token_expires_at` (timestamptz null)
- `connected_account` (text null — Pinterest username for display)
- `default_board_id` (text null)
- `board_map` (jsonb default `{}` — keys like `"blog:weddings"`, `"product"`, `"project"` → board id string)
- `pins_per_run` (int default 1), `enabled` (bool default false)
- `updated_at` (timestamptz default now())

### `pinterest_pins` (queue)

- `id` (uuid pk)
- `content_type` (text check in (`'blog'`,`'product'`,`'project'`))
- `content_id` (uuid)
- `board_id` (text null — resolved at post time if null)
- `status` (text default `'queued'` check in (`'queued'`,`'posted'`,`'failed'`,`'skipped'`))
- `scheduled_for` (timestamptz default now())
- `attempts` (int default 0)
- `pin_id` (text null), `error` (text null)
- `created_at` (timestamptz default now()), `posted_at` (timestamptz null)
- Unique `(content_type, content_id)` — never double-queue the same item.

RLS: enabled, no public policies (service-role only — admin + cron).

## Pinterest client — `app/lib/pinterest.ts`

- `isPinterestConfigured(): boolean` — `PINTEREST_APP_ID` + `PINTEREST_APP_SECRET` present.
- `exchangeCode(code, redirectUri)` → `{ access_token, refresh_token, expires_in }` (OAuth token exchange).
- `refreshAccessToken(refreshToken)` → new token set.
- `listBoards(accessToken)` → `{ id, name }[]` (for the mapping UI).
- `createPin(accessToken, { board_id, title, description, link, image_url })` → `{ id }` (POST `v5/pins`).
- Base URL `https://api.pinterest.com/v5`; token endpoint `https://api.pinterest.com/v5/oauth/token` (Basic auth with app id/secret).

## Pure logic (TDD) — `app/lib/goga/pinterest-logic.ts`

- `resolveBoard(contentType, categorySlug, boardMap, defaultBoardId)` → board id or null. Lookup order: `"<type>:<category>"` → `"<type>"` → `defaultBoardId`.
- `buildPinPayload(input)` — from `{ contentType, titleKa, titleEn, excerptKa, excerptEn, slug, coverUrl }` + site origin produce `{ title, description, link, image_url }`. Link = `${origin}/<blog|store>/<slug>` (project → `${origin}/#portfolio` or project route). Title/description prefer KA, fall back EN; title truncated to 100 chars, description to 500 (Pinterest limits).
- `dueItems(queue, now, limit)` — items with `status='queued'` and `scheduled_for <= now`, oldest `scheduled_for` first, capped at `limit`.
- `needsRefresh(expiresAt, now, skewMs = 60000)` → boolean.

## Enqueue paths

- **On publish:** `actions-blog.ts` (createPost/updatePost) and `actions-store.ts`
  (createStoreProduct/updateStoreProduct) call `enqueuePin(contentType, id, scheduledFor)`
  when the item is `published`. Upsert on the unique `(content_type, content_id)`
  so re-publishing doesn't duplicate.
- **Backfill / manual:** admin action `enqueueAllEligible()` queues every published
  blog post, published product, and portfolio project not already in `pinterest_pins`.
  Per-item "Queue" / "Post now" / "Skip" actions.
- `enqueuePin` lives in `app/lib/goga/pinterest-queue.ts` (server); staggers
  `scheduled_for` by a small offset per pending item so the drip spreads out.

## Cron drip — `/api/cron/pinterest`

- Registered in `vercel.json` crons (every 2h: `0 */2 * * *`).
- Auth: requires `Authorization: Bearer ${CRON_SECRET}` (Vercel cron sends this); reject otherwise.
- Flow: if `!enabled` or not connected → no-op. Load settings; if token expired
  (`needsRefresh`) → `refreshAccessToken` + persist. Fetch `dueItems(..., pins_per_run)`.
  For each: load content row, `buildPinPayload`, `resolveBoard` (if board_id null),
  `createPin`, mark `posted` (+`pin_id`,`posted_at`) or `failed` (+`error`, `attempts++`).
- Idempotent per item: a `posted` row is never re-posted.

## Admin — `/app/pinterest`

- **Connection panel:** if not configured → explain env setup. If configured but
  not connected → "Connect Pinterest" (→ `/api/pinterest/oauth/start`). If
  connected → account name + "Disconnect"; board-mapping editor (fetches boards
  via `listBoards`); `pins_per_run` + `enabled` toggle (save action).
- **Queue table:** status, content type, scheduled time, pin id/error; actions
  "Post now", "Skip", "Re-queue"; a "Backfill eligible content" button.
- OAuth routes: `/api/pinterest/oauth/start` (redirect to Pinterest authorize with
  scopes `boards:read,pins:read,pins:write`), `/api/pinterest/oauth/callback`
  (exchange code, store tokens + connected_account, redirect to `/app/pinterest`).

## Testing

- **Vitest:** `resolveBoard` (category→type→default fallbacks), `buildPinPayload`
  (locale fallback, URL build, length truncation), `dueItems` (filter + order +
  cap), `needsRefresh` (expiry skew).
- **Playwright:** `/app/pinterest` gated (auth → 307); page renders connection
  panel when unauthenticated-to-Pinterest.

## Out of scope (v1 — YAGNI)

- Carousel/video pins, Pinterest analytics ingestion, LLM-generated captions
  (the chatbot infra exists — a later enhancement), per-pin manual scheduling UI
  beyond the drip cadence, multi-account.

## Open assumptions

- One Pinterest account/business for GOGA.
- Portfolio project pins link to the site portfolio section; projects expose a
  cover/first image via the existing `projects`/`project_images` tables.
- `CRON_SECRET`, `PINTEREST_APP_ID`, `PINTEREST_APP_SECRET`, `NEXT_PUBLIC_SITE_URL`
  provided in the Vercel project env before live runs.
- Cadence (every 2h, 1 pin/run) is a sensible default; tunable via `pins_per_run`.
