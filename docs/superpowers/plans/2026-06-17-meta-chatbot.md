# Meta Chatbots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Facebook Messenger + Instagram DM chatbot for GOGA that auto-replies via the existing LLM engine (grounded in GOGA data), captures leads, escalates to a human, and logs every thread to an admin inbox with bot-handoff.

**Architecture:** New `meta_*` tables. A Meta webhook (`/api/meta/webhook`) verifies the handshake (GET) and processes events (POST): signature-checked, parsed, threads upserted, inbound logged; if the bot is enabled and the thread isn't handed off, the bot (`callLLMWithTools` with `create_lead`/`request_human` tools, GOGA data injected into the prompt) replies via the Graph Send API. Admin inbox manages threads, manual replies, and per-thread handoff. Tokens live in `meta_settings` (DB).

**Tech Stack:** Next.js 15 App Router, TypeScript, Supabase (`gogaAdmin()`), `lib/llm-fallback` (Anthropic + fallback, tool-use), Meta Graph API v21, Node `crypto` HMAC, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-06-17-meta-chatbot-design.md`

---

## Codebase conventions (carry over)

- Supabase row types: `type` aliases, NOT `interface`.
- No server-used helper exported from a `"use client"` module.
- Migrations via Management API + `notify pgrst, 'reload schema';` (tables 404 until reload).
- Admin pages: `<AppShell breadcrumb={[...]} chatScope={{level:"tool",tool:"messages"}} chatScopeLabel="Messages">`.
- Typed insert/update: cast to Row type when TS widens a union.
- Unit tests in `tests/unit/`; `server-only` aliased in vitest.
- Commits `team@allonelabs.com`; build `NODE_OPTIONS=--max-old-space-size=2048 pnpm build`; deploy `vercel --prod --yes --token $(security find-generic-password -s vercel-api-token -w)`.

## Verified APIs

- `callLLMWithTools(req: { system, messages: ChatMessage[], tools: ToolDef[], maxTokens? }): Promise<ToolCallResult>` from `@/app/lib/llm-fallback`.
  - `ToolCallResult` = `{ kind: "text", text, provider }` | `{ kind: "tool_use", toolUseId, name, input: Record<string,unknown>, provider }`.
  - `ChatMessage` = `{ role: "user"|"assistant"|"system", content: string | blocks }`.
  - `ToolDef` = `{ name: string; description: string; input_schema: { type:"object"; properties: Record<string,unknown>; required?: string[] } }`.
- `leads` columns: `name, email, phone, message, source, stage, score, locale, shoot_date, package_id, notes, archived`.
- `logAdminEvent(kind, { entityType, entityId, payload, actor })` from `@/app/lib/goga/admin-events`.

## File Structure

**Create:**

- `supabase/migrations/goga_0007_meta.sql`
- `app/lib/db/meta-types.ts`
- `app/lib/meta.ts` — Graph API client + verify/signature
- `app/lib/goga/meta-logic.ts` — parseWebhookEvents, shouldAutoReply (pure)
- `app/lib/goga/meta-bot.ts` — buildSystemPrompt, BOT_TOOLS, runBot, mapLeadArgs
- `app/lib/goga/meta-threads.ts` — thread/message upsert + queries (server)
- `app/lib/goga/actions-meta.ts` — admin actions (settings, reply, handoff)
- `app/api/meta/webhook/route.ts` — GET verify + POST events
- `app/app/messages/page.tsx` — inbox list
- `app/app/messages/[id]/page.tsx` — thread view
- `app/app/messages/settings/page.tsx` — settings form
- `tests/unit/meta-logic.test.ts`, `tests/unit/meta-bot.test.ts`
- `tests/integration/meta.spec.ts`

**Modify:**

- `app/lib/db/goga-types.ts` — add `meta_settings`, `meta_threads`, `meta_messages`
- `app/data/tourism-nav.ts` + `app/components/app/AppSidebar.tsx` — nav item + icon

---

## Phase 1 — Data layer

### Task 1: Migration

**Files:** Create `supabase/migrations/goga_0007_meta.sql`

- [ ] **Step 1: Write**

```sql
-- goga_0007_meta.sql — Meta (Messenger + Instagram) chatbot: settings, threads, messages.

create table if not exists meta_settings (
  id int primary key default 1 check (id = 1),
  page_id text,
  page_access_token text,
  verify_token text,
  app_secret text,
  ig_user_id text,
  bot_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);
insert into meta_settings (id) values (1) on conflict (id) do nothing;

create table if not exists meta_threads (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('messenger','instagram')),
  external_id text not null,
  display_name text,
  last_message_at timestamptz,
  unread int not null default 0,
  handoff boolean not null default false,
  created_at timestamptz not null default now(),
  unique (channel, external_id)
);

create table if not exists meta_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references meta_threads(id) on delete cascade,
  direction text not null check (direction in ('in','out')),
  sender text not null check (sender in ('user','bot','agent')),
  text text not null default '',
  meta_message_id text,
  created_at timestamptz not null default now()
);
create index if not exists idx_meta_messages_thread on meta_messages(thread_id, created_at);

alter table meta_settings enable row level security;
alter table meta_threads enable row level security;
alter table meta_messages enable row level security;
-- service-role only; no public policies.
```

- [ ] **Step 2: Apply + reload + verify**

```bash
cd /Users/macintoshi/Projects/site-xray/gogaphotography-bf
PAT=$(security find-generic-password -s gogaphotography-supabase-pat -w)
SQL=$(python3 -c "import json;print(json.dumps({'query':open('supabase/migrations/goga_0007_meta.sql').read()}))")
curl -s -X POST "https://api.supabase.com/v1/projects/bsmgqgcoilzghdnmafua/database/query" -H "Authorization: Bearer $PAT" -H "Content-Type: application/json" -d "$SQL" -w "\nmig %{http_code}\n" | tail -1
curl -s -X POST "https://api.supabase.com/v1/projects/bsmgqgcoilzghdnmafua/database/query" -H "Authorization: Bearer $PAT" -H "Content-Type: application/json" -d '{"query":"notify pgrst, '"'"'reload schema'"'"';"}' -w "reload %{http_code}\n" | tail -1
SVC=$(security find-generic-password -s gogaphotography-supabase-service -w)
until [ "$(curl -s -o /dev/null -w '%{http_code}' "https://bsmgqgcoilzghdnmafua.supabase.co/rest/v1/meta_threads?select=id&limit=1" -H "apikey: $SVC" -H "Authorization: Bearer $SVC")" = "200" ]; do sleep 3; done
for t in meta_settings meta_threads meta_messages; do echo -n "$t: "; curl -s -o /dev/null -w "%{http_code}\n" "https://bsmgqgcoilzghdnmafua.supabase.co/rest/v1/$t?select=*&limit=1" -H "apikey: $SVC" -H "Authorization: Bearer $SVC"; done
```

Expected: mig 201, reload 201, three 200s.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/goga_0007_meta.sql
git -c user.name="Allone Labs" -c user.email="team@allonelabs.com" commit -m "feat(meta): settings + threads + messages tables"
```

---

### Task 2: Types

**Files:** Create `app/lib/db/meta-types.ts`; Modify `app/lib/db/goga-types.ts`

- [ ] **Step 1: Write types**

```typescript
// app/lib/db/meta-types.ts
export type MetaChannel = "messenger" | "instagram";
export type MetaDirection = "in" | "out";
export type MetaSender = "user" | "bot" | "agent";

export type MetaSettingsRow = {
  id: number;
  page_id: string | null;
  page_access_token: string | null;
  verify_token: string | null;
  app_secret: string | null;
  ig_user_id: string | null;
  bot_enabled: boolean;
  updated_at: string;
};

export type MetaThreadRow = {
  id: string;
  channel: MetaChannel;
  external_id: string;
  display_name: string | null;
  last_message_at: string | null;
  unread: number;
  handoff: boolean;
  created_at: string;
};

export type MetaMessageRow = {
  id: string;
  thread_id: string;
  direction: MetaDirection;
  sender: MetaSender;
  text: string;
  meta_message_id: string | null;
  created_at: string;
};
```

- [ ] **Step 2: Wire into `goga-types.ts`**

Import at top:

```typescript
import type {
  MetaSettingsRow,
  MetaThreadRow,
  MetaMessageRow,
} from "./meta-types";
```

Inside `public.Tables` (before its closing `};`):

```typescript
meta_settings: {
  Row: MetaSettingsRow;
  Insert: Partial<MetaSettingsRow>;
  Update: Partial<MetaSettingsRow>;
  Relationships: [];
}
meta_threads: {
  Row: MetaThreadRow;
  Insert: Partial<MetaThreadRow> &
    Pick<MetaThreadRow, "channel" | "external_id">;
  Update: Partial<MetaThreadRow>;
  Relationships: [];
}
meta_messages: {
  Row: MetaMessageRow;
  Insert: Partial<MetaMessageRow> &
    Pick<MetaMessageRow, "thread_id" | "direction" | "sender">;
  Update: Partial<MetaMessageRow>;
  Relationships: [];
}
```

- [ ] **Step 3: Typecheck** → 0 errors (flood of `never` ⇒ used `interface`; switch to `type`).

- [ ] **Step 4: Commit**

```bash
git add app/lib/db/meta-types.ts app/lib/db/goga-types.ts
git -c user.name="Allone Labs" -c user.email="team@allonelabs.com" commit -m "feat(meta): typed tables on GogaDatabase"
```

---

## Phase 2 — Meta client + pure logic (TDD)

### Task 3: meta.ts client (verify, signature, send)

**Files:** Create `app/lib/meta.ts`

- [ ] **Step 1: Implement**

```typescript
// app/lib/meta.ts
import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

const GRAPH = "https://graph.facebook.com/v21.0";

export function verifyWebhook(
  mode: string | null,
  token: string | null,
  challenge: string | null,
  expected: string | null,
): string | null {
  if (mode === "subscribe" && token && expected && token === expected)
    return challenge ?? "";
  return null;
}

export function validateSignature(
  appSecret: string,
  rawBody: string,
  header: string | null,
): boolean {
  if (!header || !header.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret)
    .update(rawBody, "utf8")
    .digest("hex");
  const got = header.slice("sha256=".length);
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(got, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function sendMessage(
  pageToken: string,
  recipientId: string,
  text: string,
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const res = await fetch(
    `${GRAPH}/me/messages?access_token=${encodeURIComponent(pageToken)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text },
        messaging_type: "RESPONSE",
      }),
    },
  );
  const data = (await res.json().catch(() => ({}))) as {
    message_id?: string;
    error?: { message?: string };
  };
  if (!res.ok)
    return { ok: false, error: data.error?.message ?? `http ${res.status}` };
  return { ok: true, messageId: data.message_id };
}
```

- [ ] **Step 2: Typecheck** → 0 errors. Commit:

```bash
git add app/lib/meta.ts
git -c user.name="Allone Labs" -c user.email="team@allonelabs.com" commit -m "feat(meta): graph client — verify, signature, send"
```

---

### Task 4: meta-logic (parse + autoreply) — TDD

**Files:** Create `app/lib/goga/meta-logic.ts`; Test `tests/unit/meta-logic.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/unit/meta-logic.test.ts
import { describe, it, expect } from "vitest";
import { parseWebhookEvents, shouldAutoReply } from "@/app/lib/goga/meta-logic";
import { verifyWebhook, validateSignature } from "@/app/lib/meta";
import { createHmac } from "crypto";

describe("parseWebhookEvents", () => {
  it("parses a messenger text message", () => {
    const body = {
      object: "page",
      entry: [
        {
          messaging: [
            { sender: { id: "PSID1" }, message: { mid: "m1", text: "hi" } },
          ],
        },
      ],
    };
    expect(parseWebhookEvents(body)).toEqual([
      { channel: "messenger", senderId: "PSID1", text: "hi", mid: "m1" },
    ]);
  });
  it("parses an instagram text message", () => {
    const body = {
      object: "instagram",
      entry: [
        {
          messaging: [
            { sender: { id: "IG1" }, message: { mid: "m2", text: "yo" } },
          ],
        },
      ],
    };
    expect(parseWebhookEvents(body)).toEqual([
      { channel: "instagram", senderId: "IG1", text: "yo", mid: "m2" },
    ]);
  });
  it("skips echoes, deliveries, reads, and empty", () => {
    const body = {
      object: "page",
      entry: [
        {
          messaging: [
            {
              sender: { id: "P" },
              message: { mid: "e", text: "x", is_echo: true },
            },
          ],
        },
        { messaging: [{ sender: { id: "P" }, delivery: {} }] },
        { messaging: [{ sender: { id: "P" }, read: {} }] },
        { messaging: [{ sender: { id: "P" }, message: { mid: "n" } }] },
      ],
    };
    expect(parseWebhookEvents(body)).toEqual([]);
  });
});

describe("shouldAutoReply", () => {
  it("only when enabled and not handed off", () => {
    expect(
      shouldAutoReply(
        { handoff: false } as never,
        { bot_enabled: true } as never,
      ),
    ).toBe(true);
    expect(
      shouldAutoReply(
        { handoff: true } as never,
        { bot_enabled: true } as never,
      ),
    ).toBe(false);
    expect(
      shouldAutoReply(
        { handoff: false } as never,
        { bot_enabled: false } as never,
      ),
    ).toBe(false);
  });
});

describe("verifyWebhook + validateSignature", () => {
  it("verifies handshake on match", () => {
    expect(verifyWebhook("subscribe", "tok", "CH", "tok")).toBe("CH");
    expect(verifyWebhook("subscribe", "bad", "CH", "tok")).toBe(null);
  });
  it("validates HMAC signature", () => {
    const body = '{"a":1}';
    const sig =
      "sha256=" +
      createHmac("sha256", "secret").update(body, "utf8").digest("hex");
    expect(validateSignature("secret", body, sig)).toBe(true);
    expect(validateSignature("secret", body, "sha256=deadbeef")).toBe(false);
    expect(validateSignature("secret", body, null)).toBe(false);
  });
});
```

- [ ] **Step 2: Run — fails.** `pnpm vitest run tests/unit/meta-logic.test.ts`

- [ ] **Step 3: Implement**

```typescript
// app/lib/goga/meta-logic.ts
import type {
  MetaChannel,
  MetaThreadRow,
  MetaSettingsRow,
} from "@/app/lib/db/meta-types";

export interface ParsedEvent {
  channel: MetaChannel;
  senderId: string;
  text: string;
  mid: string;
}

export function parseWebhookEvents(body: unknown): ParsedEvent[] {
  const b = body as {
    object?: string;
    entry?: Array<{ messaging?: unknown[] }>;
  };
  const channel: MetaChannel | null =
    b.object === "page"
      ? "messenger"
      : b.object === "instagram"
        ? "instagram"
        : null;
  if (!channel || !Array.isArray(b.entry)) return [];
  const out: ParsedEvent[] = [];
  for (const entry of b.entry) {
    const msgs = Array.isArray(entry.messaging) ? entry.messaging : [];
    for (const m of msgs) {
      const ev = m as {
        sender?: { id?: string };
        message?: { mid?: string; text?: string; is_echo?: boolean };
        delivery?: unknown;
        read?: unknown;
      };
      const senderId = ev.sender?.id;
      const text = ev.message?.text;
      if (!senderId || !ev.message || ev.message.is_echo || !text) continue;
      out.push({ channel, senderId, text, mid: ev.message.mid ?? "" });
    }
  }
  return out;
}

export function shouldAutoReply(
  thread: Pick<MetaThreadRow, "handoff">,
  settings: Pick<MetaSettingsRow, "bot_enabled">,
): boolean {
  return !!settings.bot_enabled && !thread.handoff;
}
```

- [ ] **Step 4: Run — passes.** Commit:

```bash
git add app/lib/goga/meta-logic.ts tests/unit/meta-logic.test.ts
git -c user.name="Allone Labs" -c user.email="team@allonelabs.com" commit -m "feat(meta): webhook parse + autoreply logic (TDD)"
```

---

## Phase 3 — Bot brain

### Task 5: meta-bot — prompt, tools, runBot — TDD (pure parts)

**Files:** Create `app/lib/goga/meta-bot.ts`; Test `tests/unit/meta-bot.test.ts`

- [ ] **Step 1: Write the failing test (pure pieces)**

```typescript
// tests/unit/meta-bot.test.ts
import { describe, it, expect } from "vitest";
import { buildSystemPrompt, mapLeadArgs } from "@/app/lib/goga/meta-bot";

describe("buildSystemPrompt", () => {
  it("includes studio contact, a service, and a package with price", () => {
    const s = buildSystemPrompt({
      studioInfo: {
        name: "GOGA",
        contact_email: "hi@goga.ge",
        phone: "+995",
        about_en: "studio",
        about_ka: "სტუდია",
      },
      services: [{ name_en: "Wedding", name_ka: "ქორწილი" }],
      packages: [
        {
          name_en: "Gold",
          name_ka: "ოქრო",
          base_price_cents: 50000,
          currency: "GEL",
        },
      ],
    });
    expect(s).toContain("GOGA");
    expect(s).toContain("Wedding");
    expect(s).toContain("Gold");
    expect(s).toContain("500"); // 50000 cents = 500
    expect(s).toMatch(/create_lead/);
    expect(s).toMatch(/request_human/);
  });
});

describe("mapLeadArgs", () => {
  it("maps tool args to a leads insert row", () => {
    const row = mapLeadArgs({
      name: "Nino",
      contact: "nino@x.com",
      date: "2026-08-01",
      note: "wedding",
    });
    expect(row.name).toBe("Nino");
    expect(row.email).toBe("nino@x.com");
    expect(row.source).toBe("meta");
    expect(row.stage).toBe("lead");
    expect(row.shoot_date).toBe("2026-08-01");
  });
  it("routes a phone-like contact to phone", () => {
    const row = mapLeadArgs({ name: "Gio", contact: "+995555123456" });
    expect(row.phone).toBe("+995555123456");
    expect(row.email).toBeNull();
  });
});
```

- [ ] **Step 2: Run — fails.**

- [ ] **Step 3: Implement**

```typescript
// app/lib/goga/meta-bot.ts
import "server-only";
import {
  callLLMWithTools,
  type ChatMessage,
  type ToolDef,
} from "@/app/lib/llm-fallback";

export interface BotContext {
  studioInfo: {
    name?: string;
    contact_email?: string;
    phone?: string;
    about_en?: string;
    about_ka?: string;
  } | null;
  services: { name_en?: string; name_ka?: string }[];
  packages: {
    name_en?: string;
    name_ka?: string;
    base_price_cents?: number;
    currency?: string;
  }[];
}

export function buildSystemPrompt(ctx: BotContext): string {
  const si = ctx.studioInfo ?? {};
  const services = ctx.services
    .map((s) => s.name_en || s.name_ka)
    .filter(Boolean)
    .join(", ");
  const packages = ctx.packages
    .map(
      (p) =>
        `${p.name_en || p.name_ka} — ${((p.base_price_cents ?? 0) / 100).toFixed(0)} ${p.currency ?? "GEL"}`,
    )
    .join("; ");
  return [
    `You are the assistant for ${si.name ?? "GOGA Photography"}, a photography studio.`,
    `Reply in the user's language (Georgian or English). Be warm, concise, helpful.`,
    `ONLY use the facts below; if you don't know, say so and offer to connect a human.`,
    si.about_en ? `About: ${si.about_en}` : "",
    si.contact_email ? `Contact email: ${si.contact_email}` : "",
    si.phone ? `Phone: ${si.phone}` : "",
    services ? `Services: ${services}` : "",
    packages ? `Packages & prices: ${packages}` : "",
    `If the user wants to book, asks about availability, or shares their details, call the create_lead tool with whatever you have.`,
    `If the user asks to talk to a person, is upset, or the request is beyond these facts, call the request_human tool.`,
  ]
    .filter(Boolean)
    .join("\n");
}

export const BOT_TOOLS: ToolDef[] = [
  {
    name: "create_lead",
    description:
      "Capture a booking lead when the user wants to book or shares contact/date details.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Customer name if known" },
        contact: { type: "string", description: "Email or phone if shared" },
        date: {
          type: "string",
          description: "Desired shoot date (ISO) if mentioned",
        },
        note: { type: "string", description: "What they want" },
      },
      required: [],
    },
  },
  {
    name: "request_human",
    description:
      "Escalate to a human agent when asked or when beyond the provided facts.",
    input_schema: {
      type: "object",
      properties: { reason: { type: "string" } },
      required: [],
    },
  },
];

export interface LeadInsert {
  name: string | null;
  email: string | null;
  phone: string | null;
  shoot_date: string | null;
  notes: string | null;
  source: string;
  stage: string;
  message: string | null;
}
export function mapLeadArgs(args: Record<string, unknown>): LeadInsert {
  const contact = typeof args.contact === "string" ? args.contact : "";
  const isEmail = contact.includes("@");
  return {
    name: (args.name as string) ?? null,
    email: isEmail ? contact : null,
    phone: !isEmail && contact ? contact : null,
    shoot_date: (args.date as string) || null,
    notes: (args.note as string) ?? null,
    message: (args.note as string) ?? null,
    source: "meta",
    stage: "lead",
  };
}

export interface BotResult {
  reply: string;
  lead?: LeadInsert;
  escalate?: boolean;
}

/** Single-turn bot: one LLM call; map tool_use to an action + a friendly reply. */
export async function runBot(
  history: ChatMessage[],
  userText: string,
  ctx: BotContext,
): Promise<BotResult> {
  const messages: ChatMessage[] = [
    ...history,
    { role: "user", content: userText },
  ];
  try {
    const result = await callLLMWithTools({
      system: buildSystemPrompt(ctx),
      messages,
      tools: BOT_TOOLS,
      maxTokens: 600,
    });
    if (result.kind === "text") return { reply: result.text.trim() || "🙂" };
    if (result.name === "create_lead") {
      const note = (result.input.note as string) || "";
      return {
        reply:
          "მადლობა! დეტალები მივიღე და მალე დაგიკავშირდებით. / Thank you! I've noted your details and the studio will reach out shortly.",
        lead: mapLeadArgs(result.input),
      };
    }
    return {
      reply:
        "ერთ წუთში გადაგამისამართებთ ჩვენს გუნდთან. / Connecting you with our team — someone will reply here soon.",
      escalate: true,
    };
  } catch {
    return {
      reply:
        "ბოდიში, ახლა ვერ ვუპასუხე — გუნდი მალე გიპასუხებთ. / Sorry, I couldn't reply just now — the team will follow up.",
      escalate: true,
    };
  }
}
```

- [ ] **Step 4: Run — passes.** Commit:

```bash
git add app/lib/goga/meta-bot.ts tests/unit/meta-bot.test.ts
git -c user.name="Allone Labs" -c user.email="team@allonelabs.com" commit -m "feat(meta): bot brain — prompt, tools, runBot (TDD)"
```

---

## Phase 4 — Threads store + webhook

### Task 6: meta-threads store

**Files:** Create `app/lib/goga/meta-threads.ts`

- [ ] **Step 1: Implement**

```typescript
// app/lib/goga/meta-threads.ts
import "server-only";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import type {
  MetaChannel,
  MetaThreadRow,
  MetaMessageRow,
  MetaSender,
  MetaDirection,
} from "@/app/lib/db/meta-types";

export async function upsertThread(
  channel: MetaChannel,
  externalId: string,
): Promise<MetaThreadRow> {
  const sb = gogaAdmin();
  const { data: existing } = await sb
    .from("meta_threads")
    .select("*")
    .eq("channel", channel)
    .eq("external_id", externalId)
    .maybeSingle();
  if (existing) return existing as MetaThreadRow;
  const { data, error } = await sb
    .from("meta_threads")
    .insert({ channel, external_id: externalId })
    .select("*")
    .single();
  if (error || !data) throw new Error(`upsertThread: ${error?.message}`);
  return data as MetaThreadRow;
}

export async function addMessage(
  threadId: string,
  direction: MetaDirection,
  sender: MetaSender,
  text: string,
  metaMessageId?: string,
): Promise<void> {
  const sb = gogaAdmin();
  await sb.from("meta_messages").insert({
    thread_id: threadId,
    direction,
    sender,
    text,
    meta_message_id: metaMessageId ?? null,
  });
  await sb
    .from("meta_threads")
    .update({
      last_message_at: new Date().toISOString(),
    } as MetaThreadRow)
    .eq("id", threadId);
}

export async function recentHistory(
  threadId: string,
  limit = 10,
): Promise<MetaMessageRow[]> {
  const { data } = await gogaAdmin()
    .from("meta_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as MetaMessageRow[]).reverse();
}

export async function setHandoff(
  threadId: string,
  handoff: boolean,
): Promise<void> {
  await gogaAdmin()
    .from("meta_threads")
    .update({ handoff } as MetaThreadRow)
    .eq("id", threadId);
}

export async function listThreads(): Promise<MetaThreadRow[]> {
  const { data } = await gogaAdmin()
    .from("meta_threads")
    .select("*")
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(200);
  return (data ?? []) as MetaThreadRow[];
}

export async function getThread(id: string): Promise<MetaThreadRow | null> {
  const { data } = await gogaAdmin()
    .from("meta_threads")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as MetaThreadRow) ?? null;
}

export async function threadMessages(
  threadId: string,
): Promise<MetaMessageRow[]> {
  const { data } = await gogaAdmin()
    .from("meta_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });
  return (data ?? []) as MetaMessageRow[];
}
```

- [ ] **Step 2: Typecheck** → 0 errors. Commit:

```bash
git add app/lib/goga/meta-threads.ts
git -c user.name="Allone Labs" -c user.email="team@allonelabs.com" commit -m "feat(meta): thread + message store"
```

---

### Task 7: webhook route

**Files:** Create `app/api/meta/webhook/route.ts`

- [ ] **Step 1: Implement**

```typescript
// app/api/meta/webhook/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { verifyWebhook, validateSignature, sendMessage } from "@/app/lib/meta";
import { parseWebhookEvents, shouldAutoReply } from "@/app/lib/goga/meta-logic";
import { runBot, type BotContext } from "@/app/lib/goga/meta-bot";
import {
  upsertThread,
  addMessage,
  recentHistory,
  setHandoff,
} from "@/app/lib/goga/meta-threads";
import { logAdminEvent } from "@/app/lib/goga/admin-events";
import type { ChatMessage } from "@/app/lib/llm-fallback";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const sb = gogaAdmin();
  const { data: settings } = await sb
    .from("meta_settings")
    .select("verify_token")
    .eq("id", 1)
    .maybeSingle();
  const challenge = verifyWebhook(
    sp.get("hub.mode"),
    sp.get("hub.verify_token"),
    sp.get("hub.challenge"),
    settings?.verify_token ?? null,
  );
  if (challenge === null) return new NextResponse("forbidden", { status: 403 });
  return new NextResponse(challenge, {
    status: 200,
    headers: { "content-type": "text/plain" },
  });
}

async function loadContext(
  sb: ReturnType<typeof gogaAdmin>,
): Promise<BotContext> {
  const [si, services, packages] = await Promise.all([
    sb.from("studio_info").select("*").eq("id", 1).maybeSingle(),
    sb.from("services").select("name_en,name_ka").eq("published", true),
    sb
      .from("packages")
      .select("name_en,name_ka,base_price_cents,currency")
      .eq("published", true),
  ]);
  return {
    studioInfo: (si.data as BotContext["studioInfo"]) ?? null,
    services: (services.data ?? []) as BotContext["services"],
    packages: (packages.data ?? []) as BotContext["packages"],
  };
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const sb = gogaAdmin();
  const { data: settings } = await sb
    .from("meta_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (!settings) return NextResponse.json({ ok: true });

  if (settings.app_secret) {
    const ok = validateSignature(
      settings.app_secret,
      raw,
      req.headers.get("x-hub-signature-256"),
    );
    if (!ok)
      return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  let body: unknown = null;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: true });
  }
  const events = parseWebhookEvents(body);

  // Process best-effort; always 200 so Meta doesn't retry-storm.
  for (const ev of events) {
    try {
      const thread = await upsertThread(ev.channel, ev.senderId);
      await addMessage(thread.id, "in", "user", ev.text, ev.mid);
      if (!shouldAutoReply(thread, settings)) continue;

      const ctx = await loadContext(sb);
      const history: ChatMessage[] = (await recentHistory(thread.id, 10)).map(
        (m) => ({
          role: m.sender === "user" ? "user" : "assistant",
          content: m.text,
        }),
      );
      const result = await runBot(history.slice(0, -1), ev.text, ctx);

      if (result.lead) {
        await sb.from("leads").insert(result.lead as never);
        await logAdminEvent("lead.created", {
          entityType: "lead",
          payload: { source: "meta", channel: ev.channel },
          actor: "meta-bot",
        });
      }
      if (result.escalate) await setHandoff(thread.id, true);

      if (settings.page_access_token) {
        const sent = await sendMessage(
          settings.page_access_token,
          ev.senderId,
          result.reply,
        );
        await addMessage(thread.id, "out", "bot", result.reply, sent.messageId);
      }
    } catch (e) {
      console.error("[meta/webhook] event failed", e);
    }
  }
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Typecheck** → 0 errors. (If `studio_info` columns differ from `{name,contact_email,phone,about_en,about_ka}`, adjust `loadContext` + `buildSystemPrompt` field names to the real columns — verify via REST during the task.)

- [ ] **Step 3: Commit**

```bash
git add app/api/meta/webhook
git -c user.name="Allone Labs" -c user.email="team@allonelabs.com" commit -m "feat(meta): webhook — verify + signed event processing + auto-reply"
```

---

## Phase 5 — Admin inbox

### Task 8: admin actions

**Files:** Create `app/lib/goga/actions-meta.ts`

- [ ] **Step 1: Implement**

```typescript
// app/lib/goga/actions-meta.ts
"use server";
import { revalidatePath } from "next/cache";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { requireSession } from "./require-auth";
import { sendMessage } from "@/app/lib/meta";
import { addMessage, setHandoff, getThread } from "./meta-threads";
import type { MetaSettingsRow } from "@/app/lib/db/meta-types";

export async function saveMetaSettings(formData: FormData): Promise<void> {
  await requireSession();
  const patch: Partial<MetaSettingsRow> = {
    page_id: String(formData.get("page_id") ?? "").trim() || null,
    page_access_token:
      String(formData.get("page_access_token") ?? "").trim() || null,
    verify_token: String(formData.get("verify_token") ?? "").trim() || null,
    app_secret: String(formData.get("app_secret") ?? "").trim() || null,
    ig_user_id: String(formData.get("ig_user_id") ?? "").trim() || null,
    bot_enabled: formData.get("bot_enabled") === "on",
    updated_at: new Date().toISOString(),
  };
  await gogaAdmin()
    .from("meta_settings")
    .update(patch as MetaSettingsRow)
    .eq("id", 1);
  revalidatePath("/app/messages/settings");
}

export async function toggleHandoff(
  threadId: string,
  handoff: boolean,
): Promise<void> {
  await requireSession();
  await setHandoff(threadId, handoff);
  revalidatePath(`/app/messages/${threadId}`);
}

export async function sendManualReply(
  threadId: string,
  formData: FormData,
): Promise<void> {
  await requireSession();
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return;
  const sb = gogaAdmin();
  const thread = await getThread(threadId);
  const { data: settings } = await sb
    .from("meta_settings")
    .select("page_access_token")
    .eq("id", 1)
    .maybeSingle();
  if (thread && settings?.page_access_token) {
    const sent = await sendMessage(
      settings.page_access_token,
      thread.external_id,
      text,
    );
    await addMessage(threadId, "out", "agent", text, sent.messageId);
  }
  revalidatePath(`/app/messages/${threadId}`);
}
```

- [ ] **Step 2: Typecheck** → 0 errors. Commit:

```bash
git add app/lib/goga/actions-meta.ts
git -c user.name="Allone Labs" -c user.email="team@allonelabs.com" commit -m "feat(meta): admin actions — settings, handoff, manual reply"
```

---

### Task 9: inbox pages

**Files:** Create `app/app/messages/page.tsx`, `app/app/messages/[id]/page.tsx`, `app/app/messages/settings/page.tsx`

- [ ] **Step 1: inbox list**

```tsx
// app/app/messages/page.tsx
import Link from "next/link";
import { AppShell } from "@/app/components/app/AppShell";
import { listThreads } from "@/app/lib/goga/meta-threads";

export const dynamic = "force-dynamic";
export const metadata = { title: "Messages" };

export default async function MessagesPage() {
  const threads = await listThreads();
  return (
    <AppShell
      breadcrumb={[{ label: "Inbox" }, { label: "Messages" }]}
      chatScope={{ level: "tool", tool: "messages" }}
      chatScopeLabel="Messages"
    >
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-[var(--ink-900)]">
            Messages
          </h1>
          <Link
            href="/app/messages/settings"
            className="text-[12px] uppercase tracking-[0.18em] text-[var(--ink-500)] underline"
          >
            Settings
          </Link>
        </div>
        <ul className="divide-y rounded-2xl bg-white ring-1 ring-black/5">
          {threads.map((t) => (
            <li key={t.id}>
              <Link
                href={`/app/messages/${t.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-black/5"
              >
                <span>
                  <span className="rounded bg-black/5 px-1.5 py-0.5 text-[10px] uppercase">
                    {t.channel}
                  </span>{" "}
                  <strong className="ml-2">
                    {t.display_name ?? t.external_id}
                  </strong>
                </span>
                <span className="text-xs text-neutral-400">
                  {t.handoff ? "human" : "bot"} ·{" "}
                  {t.last_message_at
                    ? new Date(t.last_message_at).toLocaleString()
                    : "—"}
                </span>
              </Link>
            </li>
          ))}
          {threads.length === 0 && (
            <li className="px-4 py-6 text-sm text-neutral-400">
              No conversations yet.
            </li>
          )}
        </ul>
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 2: thread view**

```tsx
// app/app/messages/[id]/page.tsx
import { notFound } from "next/navigation";
import { AppShell } from "@/app/components/app/AppShell";
import { getThread, threadMessages } from "@/app/lib/goga/meta-threads";
import { toggleHandoff, sendManualReply } from "@/app/lib/goga/actions-meta";

export const dynamic = "force-dynamic";
export const metadata = { title: "Conversation" };

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const thread = await getThread(id);
  if (!thread) notFound();
  const messages = await threadMessages(id);
  const reply = sendManualReply.bind(null, id);
  const setHandoffTrue = toggleHandoff.bind(null, id, true);
  const setHandoffFalse = toggleHandoff.bind(null, id, false);

  return (
    <AppShell
      breadcrumb={[
        { label: "Inbox" },
        { label: "Messages", href: "/app/messages" },
        { label: thread.display_name ?? thread.external_id },
      ]}
      chatScope={{ level: "tool", tool: "messages" }}
      chatScopeLabel="Messages"
    >
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold">
            {thread.display_name ?? thread.external_id}{" "}
            <span className="ml-2 text-xs text-neutral-400">
              {thread.channel}
            </span>
          </h1>
          {thread.handoff ? (
            <form action={setHandoffFalse}>
              <button className="rounded-full border px-3 py-1.5 text-xs">
                Resume bot
              </button>
            </form>
          ) : (
            <form action={setHandoffTrue}>
              <button className="rounded-full border px-3 py-1.5 text-xs">
                Take over
              </button>
            </form>
          )}
        </div>
        <div className="space-y-2">
          {messages.map((m) => (
            <div
              key={m.id}
              className={
                m.direction === "in" ? "flex justify-start" : "flex justify-end"
              }
            >
              <div
                className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${m.direction === "in" ? "bg-black/5" : m.sender === "agent" ? "bg-blue-600 text-white" : "bg-black text-white"}`}
              >
                {m.text}
                <div className="mt-0.5 text-[10px] opacity-60">
                  {m.sender} · {new Date(m.created_at).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
        </div>
        <form action={reply} className="mt-4 flex gap-2">
          <input
            name="text"
            placeholder="Reply as the studio…"
            className="flex-1 rounded-full border px-4 py-2 text-sm"
          />
          <button className="rounded-full bg-black px-4 py-2 text-sm text-white">
            Send
          </button>
        </form>
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 3: settings**

```tsx
// app/app/messages/settings/page.tsx
import { AppShell } from "@/app/components/app/AppShell";
import { gogaAdmin } from "@/app/lib/supabase/goga";
import { saveMetaSettings } from "@/app/lib/goga/actions-meta";

export const dynamic = "force-dynamic";
export const metadata = { title: "Messages settings" };

export default async function MetaSettingsPage() {
  const { data: s } = await gogaAdmin()
    .from("meta_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  const field =
    "mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm";
  return (
    <AppShell
      breadcrumb={[
        { label: "Inbox" },
        { label: "Messages", href: "/app/messages" },
        { label: "Settings" },
      ]}
      chatScope={{ level: "tool", tool: "messages" }}
      chatScopeLabel="Messages"
    >
      <div className="mx-auto max-w-xl px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="mb-4 text-lg font-semibold">Meta connection</h1>
        <p className="mb-4 text-sm text-neutral-500">
          Webhook URL: <code>/api/meta/webhook</code>. Set the same Verify token
          in the Meta app webhook config.
        </p>
        <form action={saveMetaSettings} className="space-y-3">
          <label className="block text-sm">
            Page ID
            <input
              name="page_id"
              defaultValue={s?.page_id ?? ""}
              className={field}
            />
          </label>
          <label className="block text-sm">
            Page access token
            <input
              name="page_access_token"
              defaultValue={s?.page_access_token ?? ""}
              className={field}
            />
          </label>
          <label className="block text-sm">
            Verify token
            <input
              name="verify_token"
              defaultValue={s?.verify_token ?? ""}
              className={field}
            />
          </label>
          <label className="block text-sm">
            App secret
            <input
              name="app_secret"
              defaultValue={s?.app_secret ?? ""}
              className={field}
            />
          </label>
          <label className="block text-sm">
            Instagram user ID
            <input
              name="ig_user_id"
              defaultValue={s?.ig_user_id ?? ""}
              className={field}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="bot_enabled"
              defaultChecked={s?.bot_enabled ?? false}
            />{" "}
            Bot enabled
          </label>
          <button className="rounded-full bg-[var(--ao-accent)] px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-white">
            Save
          </button>
        </form>
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 4: Typecheck** → 0 errors. Commit:

```bash
git add app/app/messages
git -c user.name="Allone Labs" -c user.email="team@allonelabs.com" commit -m "feat(meta): admin inbox — list, thread view, settings"
```

---

## Phase 6 — Nav + verification + deploy

### Task 10: nav

**Files:** Modify `app/data/tourism-nav.ts`, `app/components/app/AppSidebar.tsx`

- [ ] **Step 1:** In `tourism-nav.ts`, add to the "Inbox" section items (which has "Contact form", "Chatbot"):

```typescript
        { label: "Messages", labelKa: "მესიჯები", href: "/app/messages", icon: "message-circle" },
```

- [ ] **Step 2:** In `AppSidebar.tsx` add `MessageCircle` to the lucide import and `"message-circle": MessageCircle,` to `ICONS`.
- [ ] **Step 3:** Typecheck → 0. Commit:

```bash
git add app/data/tourism-nav.ts app/components/app/AppSidebar.tsx
git -c user.name="Allone Labs" -c user.email="team@allonelabs.com" commit -m "feat(meta): add Messages nav item"
```

---

### Task 11: Playwright + verification + deploy

**Files:** Create `tests/integration/meta.spec.ts`

- [ ] **Step 1: Test**

```typescript
// tests/integration/meta.spec.ts
import { test, expect } from "@playwright/test";

test("messages admin is auth-gated", async ({ page }) => {
  await page.goto("/app/messages");
  expect(page.url()).not.toContain("/app/messages");
});

test("webhook verify returns 403 with wrong token", async ({ request }) => {
  const res = await request.get(
    "/api/meta/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=CH",
  );
  expect(res.status()).toBe(403);
});
```

- [ ] **Step 2: Unit** — `pnpm vitest run tests/unit/meta-logic.test.ts tests/unit/meta-bot.test.ts` → PASS.

- [ ] **Step 3: Build** — `NODE_OPTIONS=--max-old-space-size=2048 pnpm build` → success; routes `/api/meta/webhook`, `/app/messages`, `/app/messages/[id]`, `/app/messages/settings` present.

- [ ] **Step 4: Live smoke (dev)** — `pnpm dev`:

```bash
curl -s -o /dev/null -w "/app/messages %{http_code}\n" http://localhost:3030/app/messages   # 307
curl -s -o /dev/null -w "verify-wrong %{http_code}\n" "http://localhost:3030/api/meta/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=CH"   # 403
# Set a verify token in DB then confirm challenge echoes:
SVC=$(security find-generic-password -s gogaphotography-supabase-service -w)
curl -s -X PATCH "https://bsmgqgcoilzghdnmafua.supabase.co/rest/v1/meta_settings?id=eq.1" -H "apikey: $SVC" -H "Authorization: Bearer $SVC" -H "Content-Type: application/json" -d '{"verify_token":"vtest"}' -o /dev/null
curl -s -w " verify-ok\n" "http://localhost:3030/api/meta/webhook?hub.mode=subscribe&hub.verify_token=vtest&hub.challenge=HELLO"   # prints HELLO
# reset
curl -s -X PATCH "https://bsmgqgcoilzghdnmafua.supabase.co/rest/v1/meta_settings?id=eq.1" -H "apikey: $SVC" -H "Authorization: Bearer $SVC" -H "Content-Type: application/json" -d '{"verify_token":null}' -o /dev/null
```

Expected: 307, 403, then `HELLO` echoed.

- [ ] **Step 5: Commit + deploy**

```bash
git add tests/integration/meta.spec.ts
git -c user.name="Allone Labs" -c user.email="team@allonelabs.com" commit -m "test(meta): playwright smoke"
git checkout master && git merge feat/meta-chatbot --no-edit && git push origin master
TOK=$(security find-generic-password -s vercel-api-token -w)
vercel --prod --yes --token "$TOK"
```

Verify on prod: `/app/messages` (307 unauth), `/api/meta/webhook?...wrong` → 403.

- [ ] **Step 6: Go-live note (needs Meta app + review)**

In `/app/messages/settings` enter Page ID, Page access token, Verify token, App secret, IG user id; toggle Bot enabled. In the Meta app: set Webhook callback `https://gogaphotography-bf.vercel.app/api/meta/webhook` + the same Verify token; subscribe the Page to `messages` (and IG `messages`). Submit for App Review (Advanced Access: `pages_messaging`, `instagram_manage_messages`). Test users work pre-review.

---

## Self-Review

**Spec coverage:**

- Tables (settings/threads/messages) → Tasks 1, 2 ✓
- Verify + signature + send (client) → Task 3 ✓
- parseWebhookEvents (both channels, skips echo/delivery/read) + shouldAutoReply → Task 4 ✓
- Bot grounding (buildSystemPrompt) + tools (create_lead/request_human) + runBot + lead mapping → Task 5 ✓
- Thread store + history → Task 6 ✓
- Webhook (GET verify, POST signed → parse → upsert → autoreply → lead/escalate/send) → Task 7 ✓
- Admin inbox (list, thread, handoff, manual reply) + settings → Tasks 8, 9 ✓
- Nav → Task 10 ✓
- Testing (vitest + playwright) → Tasks 4, 5, 11 ✓
- Out-of-scope excluded ✓

**Placeholder scan:** No TBD/TODO; complete code in every step. One explicit verify-during-task flag (studio_info column names in `loadContext`) with a specified fallback — not a placeholder.

**Type consistency:** `MetaChannel`/`MetaThreadRow`/`MetaMessageRow`/`MetaSettingsRow` consistent across Tasks 2,4,5,6,7,8,9. `parseWebhookEvents`→`ParsedEvent{channel,senderId,text,mid}` consistent (Task 4, used Task 7). `runBot(history, userText, ctx)`→`BotResult{reply,lead?,escalate?}` and `BotContext` consistent (Task 5, used Task 7). `mapLeadArgs`→`LeadInsert` matches the `leads` insert in Task 7. `buildSystemPrompt(BotContext)` consistent (Tasks 5, 7). meta-threads fns (`upsertThread`/`addMessage`/`recentHistory`/`setHandoff`/`listThreads`/`getThread`/`threadMessages`) consistent across Tasks 6,7,8,9. `sendMessage(pageToken, recipientId, text)` consistent (Tasks 3,7,8).

**Note:** Task 7 `loadContext` assumes `studio_info` has `name/contact_email/phone/about_en/about_ka` and `services`/`packages` have `published` + `name_en/name_ka` (+ `base_price_cents/currency` on packages, confirmed for packages during the store build). Verify `studio_info` columns via REST in Task 7; map to actual names if different (the bot still works with whatever subset is present since `buildSystemPrompt` guards each field).
