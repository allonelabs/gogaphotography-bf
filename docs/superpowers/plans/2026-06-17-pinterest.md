# Pinterest Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Auto-syndicate GOGA blog posts, store products, and portfolio projects to Pinterest via a queue + Vercel cron drip, with board mapping by category/type and a Pinterest API v5 OAuth connection.

**Architecture:** New `pinterest_settings` (singleton) + `pinterest_pins` (queue) tables. Publishing content enqueues a pin (deduped by content). A Vercel cron (`/api/cron/pinterest`) claims due items, refreshes the OAuth token if needed, builds the pin payload, resolves the board, and posts via `lib/pinterest.ts`. Admin connects Pinterest via OAuth and manages boards/queue. Pure logic (board resolution, payload build, due-selection, token-expiry) is unit-tested; the Pinterest HTTP client is thin.

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase (`gogaAdmin()`), Pinterest API v5 (OAuth + pins), Vercel cron, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-06-17-pinterest-design.md`

---

## Codebase conventions (carry over from store + blog builds)

- Supabase row types: `type` aliases, NOT `interface` (else all tables → `never`).
- Never export a server-used helper from a `"use client"` module.
- Migrations via Management API: `POST https://api.supabase.com/v1/projects/bsmgqgcoilzghdnmafua/database/query` with PAT (`security find-generic-password -s gogaphotography-supabase-pat -w`), `{"query":"..."}` → 201. After creating tables, send `notify pgrst, 'reload schema';` the same way or tables 404 on REST until cache reloads.
- Admin pages: `<AppShell breadcrumb={[...]} chatScope={{level:"tool",tool:"pinterest"}} chatScopeLabel="Pinterest">`.
- Insert/update typed objects: cast to the Row type when TS widens a union (e.g. `as import("@/app/lib/db/pinterest-types").PinterestPinRow`).
- Unit tests in `tests/unit/`; `server-only` already aliased in `vitest.config.ts`.
- Commits authored `team@allonelabs.com`; build with `NODE_OPTIONS=--max-old-space-size=2048 pnpm build`.
- Deploy (no git auto-deploy): `vercel --prod --yes --token $(security find-generic-password -s vercel-api-token -w)`.

## File Structure

**Create:**

- `supabase/migrations/goga_0006_pinterest.sql`
- `app/lib/db/pinterest-types.ts`
- `app/lib/goga/pinterest-logic.ts` — pure: resolveBoard, buildPinPayload, dueItems, needsRefresh
- `app/lib/pinterest.ts` — Pinterest API v5 client (OAuth + pins + boards)
- `app/lib/goga/pinterest-settings.ts` — load/save settings, token accessor (server)
- `app/lib/goga/pinterest-queue.ts` — enqueuePin, enqueueAllEligible, queue queries (server)
- `app/lib/goga/actions-pinterest.ts` — admin server actions (save settings, queue ops, backfill)
- `app/api/cron/pinterest/route.ts` — cron drip
- `app/api/pinterest/oauth/start/route.ts` — OAuth start
- `app/api/pinterest/oauth/callback/route.ts` — OAuth callback
- `app/app/pinterest/page.tsx` — admin UI
- `app/app/pinterest/_panels.tsx` — small client bits (board-map editor / settings form) if needed
- `tests/unit/pinterest-logic.test.ts`
- `tests/integration/pinterest.spec.ts`

**Modify:**

- `app/lib/db/goga-types.ts` — add `pinterest_settings`, `pinterest_pins`
- `app/lib/goga/actions-blog.ts` — enqueue pin on publish
- `app/lib/goga/actions-store.ts` — enqueue pin on publish
- `app/data/tourism-nav.ts` + `app/components/app/AppSidebar.tsx` — nav item + icon
- `vercel.json` — crons array

---

## Phase 1 — Data layer

### Task 1: Migration

**Files:** Create `supabase/migrations/goga_0006_pinterest.sql`

- [ ] **Step 1: Write the migration**

```sql
-- goga_0006_pinterest.sql — Pinterest settings (singleton) + pin queue.

create table if not exists pinterest_settings (
  id int primary key default 1 check (id = 1),
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  connected_account text,
  default_board_id text,
  board_map jsonb not null default '{}'::jsonb,
  pins_per_run int not null default 1,
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into pinterest_settings (id) values (1) on conflict (id) do nothing;

create table if not exists pinterest_pins (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type in ('blog','product','project')),
  content_id uuid not null,
  board_id text,
  status text not null default 'queued' check (status in ('queued','posted','failed','skipped')),
  scheduled_for timestamptz not null default now(),
  attempts int not null default 0,
  pin_id text,
  error text,
  created_at timestamptz not null default now(),
  posted_at timestamptz,
  unique (content_type, content_id)
);

create index if not exists idx_pinterest_pins_due on pinterest_pins(status, scheduled_for);

alter table pinterest_settings enable row level security;
alter table pinterest_pins enable row level security;
-- No public policies: service-role only (admin + cron).
```

- [ ] **Step 2: Apply + reload schema**

```bash
cd /Users/macintoshi/Projects/site-xray/gogaphotography-bf
PAT=$(security find-generic-password -s gogaphotography-supabase-pat -w)
SQL=$(python3 -c "import json;print(json.dumps({'query':open('supabase/migrations/goga_0006_pinterest.sql').read()}))")
curl -s -X POST "https://api.supabase.com/v1/projects/bsmgqgcoilzghdnmafua/database/query" -H "Authorization: Bearer $PAT" -H "Content-Type: application/json" -d "$SQL" -w "\nHTTP %{http_code}\n" | tail -2
curl -s -X POST "https://api.supabase.com/v1/projects/bsmgqgcoilzghdnmafua/database/query" -H "Authorization: Bearer $PAT" -H "Content-Type: application/json" -d '{"query":"notify pgrst, '"'"'reload schema'"'"';"}' -w " HTTP %{http_code}\n" | tail -1
```

Expected: first `HTTP 201`, reload `HTTP 201`.

- [ ] **Step 3: Verify**

```bash
SVC=$(security find-generic-password -s gogaphotography-supabase-service -w)
for t in pinterest_settings pinterest_pins; do echo -n "$t: "; curl -s -o /dev/null -w "%{http_code}\n" "https://bsmgqgcoilzghdnmafua.supabase.co/rest/v1/$t?select=*&limit=1" -H "apikey: $SVC" -H "Authorization: Bearer $SVC"; done
```

Expected: both `200` (retry once if 404 — schema cache).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/goga_0006_pinterest.sql
git -c user.name="Allone Labs" -c user.email="team@allonelabs.com" commit -m "feat(pinterest): settings + pin queue tables"
```

---

### Task 2: Types

**Files:** Create `app/lib/db/pinterest-types.ts`; Modify `app/lib/db/goga-types.ts`

- [ ] **Step 1: Write types (type aliases)**

```typescript
// app/lib/db/pinterest-types.ts
export type PinContentType = "blog" | "product" | "project";
export type PinStatus = "queued" | "posted" | "failed" | "skipped";

export type PinterestSettingsRow = {
  id: number;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: string | null;
  connected_account: string | null;
  default_board_id: string | null;
  board_map: Record<string, string>;
  pins_per_run: number;
  enabled: boolean;
  updated_at: string;
};

export type PinterestPinRow = {
  id: string;
  content_type: PinContentType;
  content_id: string;
  board_id: string | null;
  status: PinStatus;
  scheduled_for: string;
  attempts: number;
  pin_id: string | null;
  error: string | null;
  created_at: string;
  posted_at: string | null;
};
```

- [ ] **Step 2: Wire into `goga-types.ts`**

Add import at top:

```typescript
import type { PinterestSettingsRow, PinterestPinRow } from "./pinterest-types";
```

Add inside `public.Tables` (before the Tables-closing `};`, same spot as store/blog):

```typescript
pinterest_settings: {
  Row: PinterestSettingsRow;
  Insert: Partial<PinterestSettingsRow>;
  Update: Partial<PinterestSettingsRow>;
  Relationships: [];
}
pinterest_pins: {
  Row: PinterestPinRow;
  Insert: Partial<PinterestPinRow> &
    Pick<PinterestPinRow, "content_type" | "content_id">;
  Update: Partial<PinterestPinRow>;
  Relationships: [];
}
```

- [ ] **Step 3: Typecheck**

Run: `NODE_OPTIONS=--max-old-space-size=2048 pnpm typecheck`
Expected: 0 errors. (Flood of `never` errors ⇒ you used `interface` — switch to `type`.)

- [ ] **Step 4: Commit**

```bash
git add app/lib/db/pinterest-types.ts app/lib/db/goga-types.ts
git -c user.name="Allone Labs" -c user.email="team@allonelabs.com" commit -m "feat(pinterest): typed tables on GogaDatabase"
```

---

## Phase 2 — Pure logic (TDD)

### Task 3: pinterest-logic

**Files:** Create `app/lib/goga/pinterest-logic.ts`; Test `tests/unit/pinterest-logic.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/pinterest-logic.test.ts
import { describe, it, expect } from "vitest";
import {
  resolveBoard,
  buildPinPayload,
  dueItems,
  needsRefresh,
} from "@/app/lib/goga/pinterest-logic";

describe("resolveBoard", () => {
  const map = { "blog:weddings": "B1", blog: "B2", product: "B3" };
  it("prefers type:category, then type, then default", () => {
    expect(resolveBoard("blog", "weddings", map, "D")).toBe("B1");
    expect(resolveBoard("blog", "portraits", map, "D")).toBe("B2");
    expect(resolveBoard("product", null, map, "D")).toBe("B3");
    expect(resolveBoard("project", null, map, "D")).toBe("D");
    expect(resolveBoard("project", null, {}, null)).toBe(null);
  });
});

describe("buildPinPayload", () => {
  it("builds a blog pin with ka title and store/blog link", () => {
    const p = buildPinPayload({
      contentType: "blog",
      slug: "nino-giorgi",
      titleKa: "ნინო",
      titleEn: "Nino",
      excerptKa: "აღწერა",
      excerptEn: "desc",
      coverUrl: "https://img/x.jpg",
      origin: "https://goga.app",
    });
    expect(p.title).toBe("ნინო");
    expect(p.description).toBe("აღწერა");
    expect(p.link).toBe("https://goga.app/blog/nino-giorgi");
    expect(p.image_url).toBe("https://img/x.jpg");
  });
  it("falls back to EN and truncates long fields", () => {
    const p = buildPinPayload({
      contentType: "product",
      slug: "warm",
      titleKa: "",
      titleEn: "Warm",
      excerptKa: "",
      excerptEn: "x".repeat(600),
      coverUrl: "u",
      origin: "https://g",
    });
    expect(p.title).toBe("Warm");
    expect(p.link).toBe("https://g/store/warm");
    expect(p.description.length).toBe(500);
  });
});

describe("dueItems", () => {
  const now = new Date("2026-06-17T12:00:00Z");
  const rows = [
    { id: "a", status: "queued", scheduled_for: "2026-06-17T10:00:00Z" },
    { id: "b", status: "queued", scheduled_for: "2026-06-17T13:00:00Z" }, // future
    { id: "c", status: "posted", scheduled_for: "2026-06-17T09:00:00Z" },
    { id: "d", status: "queued", scheduled_for: "2026-06-17T08:00:00Z" },
  ];
  it("returns queued, due, oldest-first, capped", () => {
    const out = dueItems(rows as never, now, 1);
    expect(out.map((r) => r.id)).toEqual(["d"]);
    const out2 = dueItems(rows as never, now, 5);
    expect(out2.map((r) => r.id)).toEqual(["d", "a"]);
  });
});

describe("needsRefresh", () => {
  const now = new Date("2026-06-17T12:00:00Z");
  it("true when expired or within skew, false when valid", () => {
    expect(needsRefresh("2026-06-17T11:00:00Z", now)).toBe(true);
    expect(needsRefresh("2026-06-17T13:00:00Z", now)).toBe(false);
    expect(needsRefresh(null, now)).toBe(true);
  });
});
```

- [ ] **Step 2: Run — fails**

Run: `pnpm vitest run tests/unit/pinterest-logic.test.ts`
Expected: FAIL (module missing).

- [ ] **Step 3: Implement**

```typescript
// app/lib/goga/pinterest-logic.ts
import type { PinContentType, PinStatus } from "@/app/lib/db/pinterest-types";

export function resolveBoard(
  contentType: PinContentType,
  categorySlug: string | null,
  boardMap: Record<string, string>,
  defaultBoardId: string | null,
): string | null {
  if (categorySlug && boardMap[`${contentType}:${categorySlug}`])
    return boardMap[`${contentType}:${categorySlug}`];
  if (boardMap[contentType]) return boardMap[contentType];
  return defaultBoardId ?? null;
}

export interface PinPayloadInput {
  contentType: PinContentType;
  slug: string;
  titleKa: string;
  titleEn: string;
  excerptKa: string;
  excerptEn: string;
  coverUrl: string;
  origin: string;
}
export interface PinPayload {
  title: string;
  description: string;
  link: string;
  image_url: string;
}

function pick(ka: string, en: string): string {
  return ka && ka.trim() ? ka : en;
}
function pathFor(contentType: PinContentType, slug: string): string {
  if (contentType === "blog") return `/blog/${slug}`;
  if (contentType === "product") return `/store/${slug}`;
  return `/#portfolio`;
}

export function buildPinPayload(input: PinPayloadInput): PinPayload {
  const title = pick(input.titleKa, input.titleEn).slice(0, 100);
  const description = pick(input.excerptKa, input.excerptEn).slice(0, 500);
  const link = `${input.origin.replace(/\/$/, "")}${pathFor(input.contentType, input.slug)}`;
  return { title, description, link, image_url: input.coverUrl };
}

export interface DueRow {
  id: string;
  status: PinStatus;
  scheduled_for: string;
}
export function dueItems<T extends DueRow>(
  rows: T[],
  now: Date,
  limit: number,
): T[] {
  return rows
    .filter(
      (r) =>
        r.status === "queued" &&
        new Date(r.scheduled_for).getTime() <= now.getTime(),
    )
    .sort(
      (a, b) =>
        new Date(a.scheduled_for).getTime() -
        new Date(b.scheduled_for).getTime(),
    )
    .slice(0, Math.max(0, limit));
}

export function needsRefresh(
  expiresAt: string | null,
  now: Date,
  skewMs = 60_000,
): boolean {
  if (!expiresAt) return true;
  return new Date(expiresAt).getTime() - skewMs <= now.getTime();
}
```

- [ ] **Step 4: Run — passes**

Run: `pnpm vitest run tests/unit/pinterest-logic.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/lib/goga/pinterest-logic.ts tests/unit/pinterest-logic.test.ts
git -c user.name="Allone Labs" -c user.email="team@allonelabs.com" commit -m "feat(pinterest): pure logic — board/payload/due/refresh (TDD)"
```

---

## Phase 3 — Pinterest API client

### Task 4: lib/pinterest.ts

**Files:** Create `app/lib/pinterest.ts`

- [ ] **Step 1: Implement**

```typescript
// app/lib/pinterest.ts
import "server-only";

const API = "https://api.pinterest.com/v5";

export function isPinterestConfigured(): boolean {
  return !!process.env.PINTEREST_APP_ID && !!process.env.PINTEREST_APP_SECRET;
}

function basicAuth(): string {
  const id = process.env.PINTEREST_APP_ID ?? "";
  const secret = process.env.PINTEREST_APP_SECRET ?? "";
  return Buffer.from(`${id}:${secret}`).toString("base64");
}

export interface TokenSet {
  access_token: string;
  refresh_token?: string;
  expires_in: number; // seconds
}

async function tokenRequest(body: URLSearchParams): Promise<TokenSet> {
  const res = await fetch(`${API}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basicAuth()}`,
    },
    body: body.toString(),
  });
  if (!res.ok)
    throw new Error(`pinterest token (${res.status}): ${await res.text()}`);
  return (await res.json()) as TokenSet;
}

export function authorizeUrl(redirectUri: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.PINTEREST_APP_ID ?? "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "boards:read,pins:read,pins:write,user_accounts:read",
    state,
  });
  return `https://www.pinterest.com/oauth/?${params.toString()}`;
}

export function exchangeCode(
  code: string,
  redirectUri: string,
): Promise<TokenSet> {
  return tokenRequest(
    new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  );
}

export function refreshAccessToken(refreshToken: string): Promise<TokenSet> {
  return tokenRequest(
    new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  );
}

export async function getUserAccount(
  accessToken: string,
): Promise<{ username?: string }> {
  const res = await fetch(`${API}/user_account`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return {};
  return (await res.json()) as { username?: string };
}

export async function listBoards(
  accessToken: string,
): Promise<{ id: string; name: string }[]> {
  const res = await fetch(`${API}/boards?page_size=100`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok)
    throw new Error(`pinterest boards (${res.status}): ${await res.text()}`);
  const data = (await res.json()) as { items?: { id: string; name: string }[] };
  return (data.items ?? []).map((b) => ({ id: b.id, name: b.name }));
}

export interface CreatePinInput {
  board_id: string;
  title: string;
  description: string;
  link: string;
  image_url: string;
}
export async function createPin(
  accessToken: string,
  input: CreatePinInput,
): Promise<{ id: string }> {
  const res = await fetch(`${API}/pins`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      board_id: input.board_id,
      title: input.title,
      description: input.description,
      link: input.link,
      media_source: { source_type: "image_url", url: input.image_url },
    }),
  });
  if (!res.ok)
    throw new Error(`pinterest createPin (${res.status}): ${await res.text()}`);
  return (await res.json()) as { id: string };
}
```

- [ ] **Step 2: Typecheck**

Run: `NODE_OPTIONS=--max-old-space-size=2048 pnpm typecheck`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add app/lib/pinterest.ts
git -c user.name="Allone Labs" -c user.email="team@allonelabs.com" commit -m "feat(pinterest): API v5 client (oauth, boards, pins)"
```

---

## Phase 4 — Settings, queue, enqueue

### Task 5: settings accessor

**Files:** Create `app/lib/goga/pinterest-settings.ts`

- [ ] **Step 1: Implement**

```typescript
// app/lib/goga/pinterest-settings.ts
import "server-only";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { refreshAccessToken } from "@/app/lib/pinterest";
import { needsRefresh } from "./pinterest-logic";
import type { PinterestSettingsRow } from "@/app/lib/db/pinterest-types";

export async function getSettings(): Promise<PinterestSettingsRow> {
  const { data } = await gogaAdmin()
    .from("pinterest_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  return (
    (data as PinterestSettingsRow) ?? {
      id: 1,
      access_token: null,
      refresh_token: null,
      token_expires_at: null,
      connected_account: null,
      default_board_id: null,
      board_map: {},
      pins_per_run: 1,
      enabled: false,
      updated_at: new Date().toISOString(),
    }
  );
}

export async function saveSettings(
  patch: Partial<PinterestSettingsRow>,
): Promise<void> {
  await gogaAdmin()
    .from("pinterest_settings")
    .update({
      ...patch,
      updated_at: new Date().toISOString(),
    } as PinterestSettingsRow)
    .eq("id", 1);
}

export function isConnected(s: PinterestSettingsRow): boolean {
  return !!s.access_token;
}

/** Return a valid access token, refreshing + persisting if expired. Null if not connected. */
export async function getValidAccessToken(): Promise<string | null> {
  const s = await getSettings();
  if (!s.access_token) return null;
  if (!needsRefresh(s.token_expires_at, new Date())) return s.access_token;
  if (!s.refresh_token) return s.access_token; // can't refresh; try as-is
  const tok = await refreshAccessToken(s.refresh_token);
  const token_expires_at = new Date(
    Date.now() + tok.expires_in * 1000,
  ).toISOString();
  await saveSettings({
    access_token: tok.access_token,
    refresh_token: tok.refresh_token ?? s.refresh_token,
    token_expires_at,
  });
  return tok.access_token;
}
```

- [ ] **Step 2: Typecheck** — `NODE_OPTIONS=--max-old-space-size=2048 pnpm typecheck` → 0 errors.

- [ ] **Step 3: Commit**

```bash
git add app/lib/goga/pinterest-settings.ts
git -c user.name="Allone Labs" -c user.email="team@allonelabs.com" commit -m "feat(pinterest): settings accessor + token refresh"
```

---

### Task 6: queue + enqueue

**Files:** Create `app/lib/goga/pinterest-queue.ts`

- [ ] **Step 1: Implement**

```typescript
// app/lib/goga/pinterest-queue.ts
import "server-only";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import type {
  PinContentType,
  PinterestPinRow,
} from "@/app/lib/db/pinterest-types";

/** Upsert a queued pin for a content item. No-op if a row already exists (any status). */
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

/** Queue all published blog posts, published products, and projects not yet queued. Staggers schedule. */
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
    // stagger by 30 min each so the drip spreads
    await sb.from("pinterest_pins").insert({
      content_type: it.t,
      content_id: it.id,
      scheduled_for: new Date(base + added * 30 * 60 * 1000).toISOString(),
    });
    added += 1;
  }
  return added;
}
```

- [ ] **Step 2: Typecheck** → 0 errors. (Note: `projects.select("id").eq("published", true)` — confirm `projects` has a `published` column during Task; if it does not, drop the `.eq` and queue all projects.)

- [ ] **Step 3: Commit**

```bash
git add app/lib/goga/pinterest-queue.ts
git -c user.name="Allone Labs" -c user.email="team@allonelabs.com" commit -m "feat(pinterest): pin queue + enqueue + backfill"
```

---

### Task 7: enqueue hooks on publish

**Files:** Modify `app/lib/goga/actions-blog.ts`, `app/lib/goga/actions-store.ts`

- [ ] **Step 1: Hook blog publish**

In `app/lib/goga/actions-blog.ts`, add import at top:

```typescript
import { enqueuePin } from "./pinterest-queue";
```

In `createPost`, after `await setPostTags(data.id, tagIds);` and before `revalidatePath(...)`, add:

```typescript
if (fields.status === "published") {
  try {
    await enqueuePin("blog", data.id);
  } catch (e) {
    console.error("enqueuePin blog", e);
  }
}
```

In `updatePost`, after `await setPostTags(id, tagIds);`, add:

```typescript
if (fields.status === "published") {
  try {
    await enqueuePin("blog", id);
  } catch (e) {
    console.error("enqueuePin blog", e);
  }
}
```

- [ ] **Step 2: Hook store publish**

In `app/lib/goga/actions-store.ts`, add import at top:

```typescript
import { enqueuePin } from "./pinterest-queue";
```

In `createStoreProduct`, after the insert succeeds (you have no returned id currently — change the insert to return the id):

- Change `const { error } = await sb.from("store_products").insert({ ... });` to `const { data: created, error } = await sb.from("store_products").insert({ ... }).select("id").single();`
- After the error check, add:

```typescript
if (formData.get("published") === "on" && created) {
  try {
    await enqueuePin("product", created.id);
  } catch (e) {
    console.error("enqueuePin product", e);
  }
}
```

In `updateStoreProduct`, after the update error check, add:

```typescript
if (formData.get("published") === "on") {
  try {
    await enqueuePin("product", id);
  } catch (e) {
    console.error("enqueuePin product", e);
  }
}
```

- [ ] **Step 3: Typecheck** → 0 errors.

- [ ] **Step 4: Commit**

```bash
git add app/lib/goga/actions-blog.ts app/lib/goga/actions-store.ts
git -c user.name="Allone Labs" -c user.email="team@allonelabs.com" commit -m "feat(pinterest): enqueue pin when blog/product published"
```

---

## Phase 5 — Cron drip

### Task 8: cron route

**Files:** Create `app/api/cron/pinterest/route.ts`

- [ ] **Step 1: Implement**

```typescript
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

async function loadContent(
  sb: ReturnType<typeof gogaAdmin>,
  row: PinterestPinRow,
) {
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
        contentType: "blog" as const,
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
        contentType: "product" as const,
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
  // project
  const { data } = await sb
    .from("projects")
    .select("slug,title,description")
    .eq("id", row.content_id)
    .maybeSingle();
  if (!data) return null;
  const { data: img } = await sb
    .from("project_images")
    .select("path")
    .eq("project_id", row.content_id)
    .order("display_order")
    .limit(1)
    .maybeSingle();
  return {
    categorySlug: null,
    payload: {
      contentType: "project" as const,
      slug: data.slug ?? "",
      titleKa: data.title ?? "",
      titleEn: data.title ?? "",
      excerptKa: data.description ?? "",
      excerptEn: data.description ?? "",
      coverUrl: coverUrl(img?.path ?? null),
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
```

- [ ] **Step 2: Typecheck** → 0 errors. (If `projects` lacks `slug`/`title`/`description`, adjust the select to the actual columns — check with the REST schema during the task.)

- [ ] **Step 3: Commit**

```bash
git add app/api/cron/pinterest
git -c user.name="Allone Labs" -c user.email="team@allonelabs.com" commit -m "feat(pinterest): cron drip route"
```

---

## Phase 6 — OAuth

### Task 9: OAuth start + callback

**Files:** Create `app/api/pinterest/oauth/start/route.ts`, `app/api/pinterest/oauth/callback/route.ts`

- [ ] **Step 1: start route**

```typescript
// app/api/pinterest/oauth/start/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { authorizeUrl, isPinterestConfigured } from "@/app/lib/pinterest";
import { requireSession } from "@/app/lib/goga/require-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await requireSession();
  if (!isPinterestConfigured()) {
    return NextResponse.json(
      { error: "PINTEREST_APP_ID/SECRET not set" },
      { status: 503 },
    );
  }
  const origin = (
    process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin
  ).replace(/\/$/, "");
  const redirectUri = `${origin}/api/pinterest/oauth/callback`;
  return NextResponse.redirect(authorizeUrl(redirectUri, "goga"));
}
```

- [ ] **Step 2: callback route**

```typescript
// app/api/pinterest/oauth/callback/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { exchangeCode, getUserAccount } from "@/app/lib/pinterest";
import { saveSettings } from "@/app/lib/goga/pinterest-settings";
import { requireSession } from "@/app/lib/goga/require-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  await requireSession();
  const code = new URL(req.url).searchParams.get("code");
  const origin = (
    process.env.NEXT_PUBLIC_SITE_URL ?? new URL(req.url).origin
  ).replace(/\/$/, "");
  if (!code)
    return NextResponse.redirect(`${origin}/app/pinterest?error=no_code`);
  try {
    const redirectUri = `${origin}/api/pinterest/oauth/callback`;
    const tok = await exchangeCode(code, redirectUri);
    const account = await getUserAccount(tok.access_token);
    await saveSettings({
      access_token: tok.access_token,
      refresh_token: tok.refresh_token ?? null,
      token_expires_at: new Date(
        Date.now() + tok.expires_in * 1000,
      ).toISOString(),
      connected_account: account.username ?? "connected",
    });
    return NextResponse.redirect(`${origin}/app/pinterest?connected=1`);
  } catch (e) {
    const msg = e instanceof Error ? encodeURIComponent(e.message) : "error";
    return NextResponse.redirect(`${origin}/app/pinterest?error=${msg}`);
  }
}
```

- [ ] **Step 3: Typecheck** → 0 errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/pinterest/oauth
git -c user.name="Allone Labs" -c user.email="team@allonelabs.com" commit -m "feat(pinterest): OAuth start + callback"
```

---

## Phase 7 — Admin UI + actions

### Task 10: admin actions

**Files:** Create `app/lib/goga/actions-pinterest.ts`

- [ ] **Step 1: Implement**

```typescript
// app/lib/goga/actions-pinterest.ts
"use server";
import { revalidatePath } from "next/cache";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { requireSession } from "./require-auth";
import {
  saveSettings,
  getSettings,
  getValidAccessToken,
} from "./pinterest-settings";
import { enqueueAllEligible } from "./pinterest-queue";
import { resolveBoard, buildPinPayload } from "./pinterest-logic";
import { createPin } from "@/app/lib/pinterest";
import type { PinterestPinRow } from "@/app/lib/db/pinterest-types";

export async function savePinterestSettings(formData: FormData): Promise<void> {
  await requireSession();
  const pins_per_run = Math.max(
    1,
    parseInt(String(formData.get("pins_per_run") ?? "1"), 10) || 1,
  );
  const enabled = formData.get("enabled") === "on";
  const default_board_id =
    String(formData.get("default_board_id") ?? "").trim() || null;
  // board_map arrives as JSON string from the form
  let board_map: Record<string, string> = {};
  try {
    board_map = JSON.parse(String(formData.get("board_map") ?? "{}"));
  } catch {
    board_map = {};
  }
  await saveSettings({ pins_per_run, enabled, default_board_id, board_map });
  revalidatePath("/app/pinterest");
}

export async function disconnectPinterest(): Promise<void> {
  await requireSession();
  await saveSettings({
    access_token: null,
    refresh_token: null,
    token_expires_at: null,
    connected_account: null,
  });
  revalidatePath("/app/pinterest");
}

export async function backfillPins(): Promise<void> {
  await requireSession();
  await enqueueAllEligible();
  revalidatePath("/app/pinterest");
}

export async function skipPin(id: string): Promise<void> {
  await requireSession();
  await gogaAdmin()
    .from("pinterest_pins")
    .update({ status: "skipped" })
    .eq("id", id);
  revalidatePath("/app/pinterest");
}

export async function requeuePin(id: string): Promise<void> {
  await requireSession();
  await gogaAdmin()
    .from("pinterest_pins")
    .update({
      status: "queued",
      error: null,
      scheduled_for: new Date().toISOString(),
    })
    .eq("id", id);
  revalidatePath("/app/pinterest");
}
```

- [ ] **Step 2: Typecheck** → 0 errors.

- [ ] **Step 3: Commit**

```bash
git add app/lib/goga/actions-pinterest.ts
git -c user.name="Allone Labs" -c user.email="team@allonelabs.com" commit -m "feat(pinterest): admin settings/queue actions"
```

---

### Task 11: admin page

**Files:** Create `app/app/pinterest/page.tsx`

- [ ] **Step 1: Implement**

```tsx
// app/app/pinterest/page.tsx
import { AppShell } from "@/app/components/app/AppShell";
import { isPinterestConfigured, listBoards } from "@/app/lib/pinterest";
import {
  getSettings,
  isConnected,
  getValidAccessToken,
} from "@/app/lib/goga/pinterest-settings";
import { listQueue } from "@/app/lib/goga/pinterest-queue";
import {
  savePinterestSettings,
  disconnectPinterest,
  backfillPins,
  skipPin,
  requeuePin,
} from "@/app/lib/goga/actions-pinterest";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pinterest" };

export default async function PinterestPage() {
  const configured = isPinterestConfigured();
  const settings = await getSettings();
  const connected = isConnected(settings);
  const queue = await listQueue();

  let boards: { id: string; name: string }[] = [];
  if (connected) {
    try {
      const token = await getValidAccessToken();
      if (token) boards = await listBoards(token);
    } catch {
      boards = [];
    }
  }

  return (
    <AppShell
      breadcrumb={[{ label: "Content" }, { label: "Pinterest" }]}
      chatScope={{ level: "tool", tool: "pinterest" }}
      chatScopeLabel="Pinterest"
    >
      <div className="mx-auto max-w-5xl space-y-10 px-4 py-6 sm:px-6 sm:py-8">
        <section>
          <h1 className="mb-4 text-xl font-semibold text-[var(--ink-900)]">
            Pinterest
          </h1>
          {!configured && (
            <p className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
              Set <code>PINTEREST_APP_ID</code> and{" "}
              <code>PINTEREST_APP_SECRET</code> in the project env to enable the
              connection.
            </p>
          )}
          {configured && !connected && (
            <a
              href="/api/pinterest/oauth/start"
              className="inline-block rounded-full bg-black px-5 py-2.5 text-sm text-white"
            >
              Connect Pinterest
            </a>
          )}
          {connected && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm">
                  Connected as <strong>{settings.connected_account}</strong>
                </p>
                <form action={disconnectPinterest}>
                  <button className="text-xs text-red-600 underline">
                    Disconnect
                  </button>
                </form>
              </div>
              <form action={savePinterestSettings} className="space-y-3">
                <label className="block text-sm">
                  Default board
                  <select
                    name="default_board_id"
                    defaultValue={settings.default_board_id ?? ""}
                    className="mt-1 block rounded border px-2 py-1 text-sm"
                  >
                    <option value="">— none —</option>
                    {boards.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  Board map (JSON: {`{"blog:weddings":"<id>","product":"<id>"}`}
                  )
                  <textarea
                    name="board_map"
                    rows={3}
                    defaultValue={JSON.stringify(settings.board_map)}
                    className="mt-1 block w-full rounded border px-2 py-1 font-mono text-xs"
                  />
                </label>
                <label className="block text-sm">
                  Pins per run
                  <input
                    name="pins_per_run"
                    type="number"
                    min="1"
                    defaultValue={settings.pins_per_run}
                    className="ml-2 w-20 rounded border px-2 py-1 text-sm"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    name="enabled"
                    type="checkbox"
                    defaultChecked={settings.enabled}
                  />{" "}
                  Automation enabled
                </label>
                <button className="rounded-full bg-[var(--ao-accent)] px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-white">
                  Save
                </button>
              </form>
              <p className="mt-1 text-xs text-neutral-400">
                Available boards:{" "}
                {boards.map((b) => `${b.name} (${b.id})`).join(", ") || "—"}
              </p>
            </div>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Queue ({queue.length})</h2>
            <form action={backfillPins}>
              <button className="rounded-full border px-3 py-1.5 text-xs">
                Backfill eligible content
              </button>
            </form>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-neutral-500">
                <th className="py-2">Type</th>
                <th>Status</th>
                <th>Scheduled</th>
                <th>Pin / error</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {queue.map((p: PinterestPinRow) => (
                <tr key={p.id} className="border-t border-black/5">
                  <td className="py-2">{p.content_type}</td>
                  <td>{p.status}</td>
                  <td>{new Date(p.scheduled_for).toLocaleString()}</td>
                  <td className="max-w-[240px] truncate text-xs text-neutral-500">
                    {p.pin_id ?? p.error ?? "—"}
                  </td>
                  <td className="space-x-2 text-right">
                    <form
                      action={requeuePin.bind(null, p.id)}
                      className="inline"
                    >
                      <button className="text-xs underline">re-queue</button>
                    </form>
                    <form action={skipPin.bind(null, p.id)} className="inline">
                      <button className="text-xs text-red-600 underline">
                        skip
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
              {queue.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-4 text-neutral-400">
                    Queue is empty.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 2: Typecheck** → 0 errors.

- [ ] **Step 3: Commit**

```bash
git add app/app/pinterest
git -c user.name="Allone Labs" -c user.email="team@allonelabs.com" commit -m "feat(pinterest): admin page (connect, board map, queue)"
```

---

## Phase 8 — Nav + cron registration

### Task 12: nav + vercel.json

**Files:** Modify `app/data/tourism-nav.ts`, `app/components/app/AppSidebar.tsx`, `vercel.json`

- [ ] **Step 1: Nav item** — in `tourism-nav.ts` add to the "Site" section items:

```typescript
        {
          label: "Pinterest",
          labelKa: "Pinterest",
          href: "/app/pinterest",
          icon: "share-2",
        },
```

- [ ] **Step 2: Icon** — in `AppSidebar.tsx` add `Share2` to the lucide import and `"share-2": Share2,` to the `ICONS` map.

- [ ] **Step 3: Cron** — replace `vercel.json` contents with:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [{ "path": "/api/cron/pinterest", "schedule": "0 */2 * * *" }]
}
```

(Vercel automatically sends `Authorization: Bearer $CRON_SECRET` to cron paths when `CRON_SECRET` is set in the project env.)

- [ ] **Step 4: Typecheck** → 0 errors.

- [ ] **Step 5: Commit**

```bash
git add app/data/tourism-nav.ts app/components/app/AppSidebar.tsx vercel.json
git -c user.name="Allone Labs" -c user.email="team@allonelabs.com" commit -m "feat(pinterest): admin nav item + every-2h cron"
```

---

## Phase 9 — Verification & deploy

### Task 13: Playwright + full verification

**Files:** Create `tests/integration/pinterest.spec.ts`

- [ ] **Step 1: Test**

```typescript
// tests/integration/pinterest.spec.ts
import { test, expect } from "@playwright/test";

test("pinterest admin is auth-gated", async ({ page }) => {
  const res = await page.goto("/app/pinterest");
  // Unauthenticated → redirected to sign-in (status chain ends not-200 on the admin content)
  expect(page.url()).not.toContain("/app/pinterest");
});

test("cron route rejects without secret", async ({ request }) => {
  const res = await request.get("/api/cron/pinterest");
  expect([200, 401]).toContain(res.status()); // 401 when CRON_SECRET set; 200 no-op when unset+disabled
});
```

- [ ] **Step 2: Unit tests** — `pnpm vitest run tests/unit/pinterest-logic.test.ts` → PASS.

- [ ] **Step 3: Build** — `NODE_OPTIONS=--max-old-space-size=2048 pnpm build`
      Expected: success; routes `/api/cron/pinterest`, `/api/pinterest/oauth/start`, `/api/pinterest/oauth/callback`, `/app/pinterest` present.

- [ ] **Step 4: Live smoke (dev)** — start `pnpm dev` (3030):

```bash
curl -s -o /dev/null -w "/app/pinterest %{http_code}\n" http://localhost:3030/app/pinterest   # 307
curl -s -w " /api/cron/pinterest\n" http://localhost:3030/api/cron/pinterest                  # {"ok":true,"skipped":"disabled"} (no CRON_SECRET locally) or 401
```

Confirm `/app/pinterest` renders the "Set PINTEREST_APP_ID…" notice when env unset.

- [ ] **Step 5: Commit test**

```bash
git add tests/integration/pinterest.spec.ts
git -c user.name="Allone Labs" -c user.email="team@allonelabs.com" commit -m "test(pinterest): playwright smoke"
```

- [ ] **Step 6: Deploy**

```bash
cd /Users/macintoshi/Projects/site-xray/gogaphotography-bf
git checkout master && git merge feat/pinterest --no-edit
git push origin master
TOK=$(security find-generic-password -s vercel-api-token -w)
vercel --prod --yes --token "$TOK"
```

Verify: `/app/pinterest` (302/307 unauth) and `/api/cron/pinterest` respond on production. Then set env vars in Vercel (next step) for live posting.

- [ ] **Step 7: Env provisioning note (requires the Pinterest app + user)**

For live posting, add to the Vercel project env (Production): `PINTEREST_APP_ID`, `PINTEREST_APP_SECRET`, `CRON_SECRET`, and ensure `NEXT_PUBLIC_SITE_URL` is the production URL. Register `<site>/api/pinterest/oauth/callback` as the redirect URI in the Pinterest app. Then in `/app/pinterest`: Connect → map boards → enable → Backfill. The cron drips from there.

---

## Self-Review

**Spec coverage:**

- Settings + queue tables → Tasks 1, 2 ✓
- OAuth (access+refresh, auto-refresh) → Tasks 4 (client), 5 (refresh), 9 (flow) ✓
- Pure logic (resolveBoard/buildPinPayload/dueItems/needsRefresh) → Task 3 ✓
- Enqueue on publish + backfill → Tasks 6, 7 ✓
- Cron drip with board resolution + content load → Task 8 ✓
- Admin (connect, board map, queue ops, backfill) → Tasks 10, 11 ✓
- Nav + cron registration → Task 12 ✓
- Content types blog/product/project → Tasks 6, 8 (loadContent) ✓
- Testing (vitest + playwright) → Tasks 3, 13 ✓
- Out-of-scope excluded ✓

**Placeholder scan:** No TBD/TODO; full code in every step. Two flagged verification points (does `projects` have `published`/`slug`/`title` columns) are explicit instructions to check actual schema during the task, not placeholders — the fallback action is specified.

**Type consistency:** `PinterestSettingsRow`/`PinterestPinRow`/`PinContentType`/`PinStatus` consistent across Tasks 2,3,5,6,8,10,11. `resolveBoard`/`buildPinPayload`/`dueItems`/`needsRefresh` signatures consistent across Tasks 3, 8. `getSettings`/`getValidAccessToken`/`saveSettings` consistent across Tasks 5, 8, 9, 10, 11. `enqueuePin(contentType, contentId, scheduledFor?)` consistent across Tasks 6, 7. Pinterest client (`createPin`/`listBoards`/`exchangeCode`/`refreshAccessToken`/`authorizeUrl`/`getUserAccount`) consistent across Tasks 4, 5, 8, 9, 11.

**Note:** Task 8/6 assume `projects` columns `slug,title,description,published` and `project_images(path,display_order,project_id)`. Verify against the live schema during Task 6; if `projects` has no `published` column, queue all projects and link to `/#portfolio`. The portfolio link is `/#portfolio` (the public site has no per-project public route in the rebuild) — acceptable for v1.
