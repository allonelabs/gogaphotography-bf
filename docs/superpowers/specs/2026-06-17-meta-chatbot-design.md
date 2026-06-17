# Meta Chatbots — Design Spec

**Date:** 2026-06-17
**Project:** gogaphotography-bf
**Sub-project:** D of 4 (Store ✓ → Blog ✓ → Pinterest ✓ → **Meta chatbots**)
**Status:** Approved design, pre-implementation

## Summary

A public-facing chatbot on Facebook Messenger and Instagram DMs for GOGA
Photography. Incoming messages hit a Meta webhook; the existing LLM engine
(`lib/llm-fallback.ts`) auto-replies grounded in GOGA data (studio info,
services, packages/prices), can capture leads into the pipeline, and can
escalate to a human. Every thread is logged to an admin inbox where the studio
can take over (pause the bot) and reply manually.

Reuses: `gogaAdmin()` client, migration convention, the LLM fallback engine,
the `leads` table + `logAdminEvent`, `AppShell` admin shell, server-action style.

## External dependencies (gate live messaging only)

A **Meta developer app**, a **Facebook Page**, a linked **Instagram Business
account**, a **page access token**, a webhook `verify_token`, the app secret,
and **Meta app review** (Advanced Access for `pages_messaging` /
`instagram_manage_messages`) before the bot can message non-test users. All code
is built and unit/build verified without these; the live connection + first real
reply wait on the Meta app + review.

## Decisions (locked)

| Decision     | Choice                                                                   |
| ------------ | ------------------------------------------------------------------------ |
| Channels     | Facebook Messenger **and** Instagram DMs                                 |
| Reply mode   | **Auto-reply + admin inbox & handoff** (admin can take over a thread)    |
| Capabilities | FAQ/studio info, packages & prices, capture leads, escalate to human     |
| Grounding    | **Context injection** — GOGA data inlined in the system prompt each turn |
| Bot tools    | `create_lead`, `request_human` (action tools only)                       |

## Data model — new migration `goga_0007_meta.sql`

### `meta_settings` (singleton, `id = 1`)

- `id` (int pk default 1, check id = 1)
- `page_id` (text null), `page_access_token` (text null)
- `verify_token` (text null), `app_secret` (text null)
- `ig_user_id` (text null)
- `bot_enabled` (bool default false)
- `updated_at` (timestamptz default now())

### `meta_threads`

- `id` (uuid pk)
- `channel` (text check in (`'messenger'`,`'instagram'`))
- `external_id` (text — PSID for messenger / IGSID for instagram)
- `display_name` (text null)
- `last_message_at` (timestamptz null)
- `unread` (int default 0)
- `handoff` (bool default false — true = human took over, bot paused)
- `created_at` (timestamptz default now())
- Unique `(channel, external_id)`.

### `meta_messages`

- `id` (uuid pk)
- `thread_id` (uuid fk → meta_threads on delete cascade)
- `direction` (text check in (`'in'`,`'out'`))
- `sender` (text check in (`'user'`,`'bot'`,`'agent'`))
- `text` (text)
- `meta_message_id` (text null)
- `created_at` (timestamptz default now())
- Index on `(thread_id, created_at)`.

RLS: enabled, service-role only (admin + webhook).

## Meta client — `app/lib/meta.ts`

- `verifyWebhook(mode, token, challenge, expected)` → `challenge` when
  `mode === "subscribe" && token === expected`, else `null`.
- `validateSignature(appSecret, rawBody, header)` → boolean. HMAC-SHA256 of the
  raw body keyed by app secret, compared (timing-safe) to the
  `X-Hub-Signature-256: sha256=...` header.
- `sendMessage(pageToken, recipientId, text)` → POST
  `https://graph.facebook.com/v21.0/me/messages?access_token=<token>` with
  `{ recipient: { id }, message: { text }, messaging_type: "RESPONSE" }`.
  (Same endpoint serves Messenger and IG when the token is the Page token with
  IG messaging permissions.)

## Pure logic (TDD) — `app/lib/goga/meta-logic.ts`

- `parseWebhookEvents(body)` → `{ channel, senderId, text, mid }[]`. Reads
  `body.object` (`"page"` → messenger, `"instagram"` → instagram), iterates
  `entry[].messaging[]`, keeps entries with `message.text` and a sender id,
  skips echoes (`message.is_echo`), deliveries, reads, reactions.
- `shouldAutoReply(thread, settings)` → `settings.bot_enabled && !thread.handoff`.
- (`verifyWebhook`, `validateSignature` live in `meta.ts` but are unit-tested too.)

## Bot brain — `app/lib/goga/meta-bot.ts`

- `buildSystemPrompt({ studioInfo, services, packages })` → string. Inlines
  contact/hours/location, service names, and package names + prices. Instructs:
  answer only from provided info; reply in the user's language (KA/EN); if the
  user wants to book or share details, call `create_lead`; if they ask for a
  person or it's beyond scope, call `request_human`; keep replies short and warm.
- `runBot({ history, userText, context })` → `{ reply, lead?, escalate }`.
  Calls the LLM (via `lib/llm-fallback`) with the system prompt + the two tools.
  Tool calls are surfaced in the result; `reply` is the assistant text. If the
  LLM errors, returns a safe fallback reply and `escalate: true`.

## Webhook — `/api/meta/webhook`

- **GET** (verification): read `hub.mode`, `hub.verify_token`, `hub.challenge`;
  return `verifyWebhook(...)` challenge as `text/plain` (200) or 403.
- **POST** (events): read the **raw body**, `validateSignature` against
  `meta_settings.app_secret` (reject 401 on mismatch). `parseWebhookEvents`;
  for each event: upsert `meta_threads` (by channel+external_id), insert inbound
  `meta_messages`. If `shouldAutoReply`: load last N messages + GOGA context,
  `runBot`; if `lead` → insert into `leads` (+`logAdminEvent`); if `escalate` →
  set `handoff=true`; `sendMessage` the reply + insert outbound message. Return
  `200` quickly; all heavy work try/caught so a failure still 200s (Meta retries
  otherwise).

## Admin inbox — `/app/messages`

- **Thread list:** channel badge, display name, last message snippet, unread
  count, bot/handoff status. Newest first.
- **Thread view** (`/app/messages/[id]`): message history (user/bot/agent),
  a **"Take over / Resume bot"** toggle (sets `handoff`), and a manual reply box
  (sends via `sendMessage` as `agent`, logs the message, marks thread read).
- **Settings panel** (`/app/messages/settings` or inline): `meta_settings` form —
  page id, page access token, verify token, app secret, IG user id, `bot_enabled`.
- Bot-created leads appear in the existing `/app/leads` pipeline.

## Testing

- **Vitest:** `parseWebhookEvents` (messenger shape, instagram shape, skips
  echo/delivery/read), `validateSignature` (valid + invalid HMAC),
  `verifyWebhook` (match → challenge, mismatch → null), `shouldAutoReply`
  (enabled/handoff combinations), `buildSystemPrompt` (contains a package name +
  price and studio contact).
- **Playwright:** `/app/messages` auth-gated; `GET /api/meta/webhook` returns the
  challenge with the right token and 403 with a wrong token.

## Out of scope (v1 — YAGNI)

- Rich/template messages, quick-reply/button payloads, inbound attachments/images,
  typing indicators, story replies, comment auto-reply, multi-page/multi-account,
  proactive/outbound campaigns. Text conversations only.

## Open assumptions

- One Meta app, one Page, one linked IG Business account.
- `bot_enabled` defaults false; the studio enables it after connecting.
- Conversation history for the LLM is the last ~10 messages of the thread.
- Lead language/contact parsing is the LLM's job via the `create_lead` tool args;
  the `leads` insert maps `{name, contact→email/phone, date→shoot_date, note}`.
- App secret + tokens are stored in `meta_settings` (DB), entered via the admin
  settings form (not env), so the studio can rotate them without a deploy.
